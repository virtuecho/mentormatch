import bcrypt from 'bcryptjs';
import { jwtVerify, SignJWT } from 'jose';
import type { DatabaseClient, QueryParams } from '@mentormatch/db';
import { AppError, ensureAvatar, loginSchema, registerSchema, type SessionUser, type UserRole } from '@mentormatch/shared';

const SESSION_ISSUER = 'mentormatch';
const SESSION_AUDIENCE = 'mentormatch-web';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

type UserRow = {
	id: number;
	email: string;
	role: UserRole;
	is_mentor_approved: number;
	full_name: string;
	profile_image_url: string | null;
	password_hash: string;
};

function getSecret(secret: string): Uint8Array {
	return new TextEncoder().encode(secret);
}

function mapSessionUser(row: Omit<UserRow, 'password_hash'>): SessionUser {
	return {
		id: Number(row.id),
		email: row.email,
		role: row.role,
		isMentorApproved: Boolean(row.is_mentor_approved),
		fullName: row.full_name,
		profileImageUrl: ensureAvatar(row.profile_image_url)
	};
}

async function getUserByEmail(db: DatabaseClient, email: string): Promise<UserRow | null> {
	return db.get<UserRow>(
		`
			SELECT
				u.id,
				u.email,
				u.role,
				u.is_mentor_approved,
				u.password_hash,
				p.full_name,
				p.profile_image_url
			FROM users u
			JOIN profiles p ON p.user_id = u.id
			WHERE u.email = ?
			LIMIT 1
		`,
		[email]
	);
}

export async function createSessionToken(userId: number, role: UserRole, secret: string): Promise<string> {
	return new SignJWT({ role })
		.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
		.setSubject(String(userId))
		.setIssuer(SESSION_ISSUER)
		.setAudience(SESSION_AUDIENCE)
		.setIssuedAt()
		.setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
		.sign(getSecret(secret));
}

export async function verifySessionToken(token: string, secret: string): Promise<{ userId: number; role: UserRole }> {
	const verification = await jwtVerify(token, getSecret(secret), {
		issuer: SESSION_ISSUER,
		audience: SESSION_AUDIENCE
	});

	return {
		userId: Number(verification.payload.sub),
		role: verification.payload.role as UserRole
	};
}

export async function registerUser(
	db: DatabaseClient,
	input: unknown
): Promise<{ user: SessionUser }> {
	const payload = registerSchema.parse(input);
	const existing = await db.get<{ id: number }>('SELECT id FROM users WHERE email = ? LIMIT 1', [payload.email]);

	if (existing) {
		throw new AppError(409, 'email_taken', 'This email address has been linked to an existing account');
	}

	const now = new Date().toISOString();
	const passwordHash = await bcrypt.hash(payload.password, 10);
	const userInsert = await db.run(
		`
			INSERT INTO users (email, password_hash, role, is_mentor_approved, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?)
		`,
		[payload.email, passwordHash, payload.role, 1, now, now]
	);

	if (!userInsert.lastRowId) {
		throw new AppError(500, 'user_insert_failed', 'Failed to create user');
	}

	const profileParams: QueryParams = [userInsert.lastRowId, payload.fullName, now, now];
	await db.run(
		`
			INSERT INTO profiles (user_id, full_name, created_at, updated_at)
			VALUES (?, ?, ?, ?)
		`,
		profileParams
	);

	return {
		user: {
			id: userInsert.lastRowId,
			email: payload.email,
			role: payload.role,
			isMentorApproved: true,
			fullName: payload.fullName,
			profileImageUrl: ensureAvatar(null)
		}
	};
}

export async function loginUser(
	db: DatabaseClient,
	input: unknown,
	secret: string
): Promise<{ token: string; user: SessionUser }> {
	const payload = loginSchema.parse(input);
	const user = await getUserByEmail(db, payload.email);

	if (!user) {
		throw new AppError(401, 'invalid_credentials', 'Invalid credentials');
	}

	const validPassword = await bcrypt.compare(payload.password, user.password_hash);
	if (!validPassword) {
		throw new AppError(401, 'invalid_credentials', 'Invalid credentials');
	}

	const safeUser = mapSessionUser(user);
	const token = await createSessionToken(safeUser.id, safeUser.role, secret);

	return { token, user: safeUser };
}

export async function logoutUser(_db: DatabaseClient, _token: string | undefined): Promise<{ ok: true }> {
	return { ok: true };
}

export async function getSessionUser(
	db: DatabaseClient,
	token: string | undefined,
	secret: string
): Promise<SessionUser | null> {
	if (!token) {
		return null;
	}

	try {
		const session = await verifySessionToken(token, secret);
		const user = await db.get<Omit<UserRow, 'password_hash'>>(
			`
				SELECT
					u.id,
					u.email,
					u.role,
					u.is_mentor_approved,
					p.full_name,
					p.profile_image_url
				FROM users u
				JOIN profiles p ON p.user_id = u.id
				WHERE u.id = ?
				LIMIT 1
			`,
			[session.userId]
		);

		return user ? mapSessionUser(user as UserRow) : null;
	} catch {
		return null;
	}
}
