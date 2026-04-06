import type { BatchStatement, DatabaseClient } from "@mentormatch/db";
import {
  AppError,
  ensureAvatar,
  mentorModeSchema,
  mentorRequestSchema,
  parseJsonArray,
  profilePatchSchema,
  profileUpdateSchema,
  type RequestStatus,
  type SessionUser,
  type UserRole,
} from "@mentormatch/shared";

type ProfileRow = {
  id: number;
  email: string;
  role: UserRole;
  is_mentor_approved: number;
  full_name: string;
  bio: string | null;
  location: string | null;
  profile_image_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  website_url: string | null;
  phone: string | null;
};

type MentorRequestListRow = {
  id: number;
  status: RequestStatus;
  document_url: string;
  note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  user_id: number;
  email: string;
  role: UserRole;
  full_name: string;
  profile_image_url: string | null;
};

type AdminUserListRow = {
  id: number;
  email: string;
  role: UserRole;
  is_mentor_approved: number;
  created_at: string;
  full_name: string;
  profile_image_url: string | null;
  location: string | null;
  latest_position: string | null;
  latest_company: string | null;
  latest_expertise_json: string | null;
  skill_names: string | null;
  latest_request_status: RequestStatus | null;
};

type ProfileUpdatePayload = ReturnType<typeof profileUpdateSchema.parse>;
type ProfilePatchPayload = ReturnType<typeof profilePatchSchema.parse>;

function mapSessionUser(row: ProfileRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    isMentorApproved: Boolean(row.is_mentor_approved),
    fullName: row.full_name,
    profileImageUrl: ensureAvatar(row.profile_image_url),
  };
}

export async function getProfile(db: DatabaseClient, userId: number) {
  const row = await db.get<ProfileRow>(
    `
			SELECT
				u.id,
				u.email,
				u.role,
				u.is_mentor_approved,
				p.full_name,
				p.bio,
				p.location,
				p.profile_image_url,
				p.linkedin_url,
				p.instagram_url,
				p.facebook_url,
				p.website_url,
				p.phone
			FROM users u
			JOIN profiles p ON p.user_id = u.id
			WHERE u.id = ?
			LIMIT 1
		`,
    [userId],
  );

  if (!row) {
    throw new AppError(404, "profile_not_found", "User profile not found");
  }

  const [educations, experiences, mentorSkills, mentorRequest] =
    await Promise.all([
      db.all<any>(
        `
				SELECT id, university, degree, major, start_year, end_year, status, logo_url, description
				FROM educations
				WHERE user_id = ?
				ORDER BY start_year DESC
			`,
        [userId],
      ),
      db.all<any>(
        `
				SELECT id, company, position, industry, expertise_json, start_year, end_year, status, description
				FROM experiences
				WHERE user_id = ?
				ORDER BY start_year DESC
			`,
        [userId],
      ),
      db.all<{ skill_name: string }>(
        "SELECT skill_name FROM mentor_skills WHERE mentor_id = ? ORDER BY skill_name ASC",
        [userId],
      ),
      db.get<{
        id: number;
        status: string;
        document_url: string;
        note: string | null;
        submitted_at: string;
      }>(
        `
				SELECT id, status, document_url, note, submitted_at
				FROM mentor_requests
				WHERE user_id = ?
				ORDER BY submitted_at DESC
				LIMIT 1
			`,
        [userId],
      ),
    ]);

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    isMentorApproved: Boolean(row.is_mentor_approved),
    user: mapSessionUser(row),
    profile: {
      fullName: row.full_name,
      bio: row.bio,
      location: row.location,
      profileImageUrl: ensureAvatar(row.profile_image_url),
      linkedinUrl: row.linkedin_url,
      instagramUrl: row.instagram_url,
      facebookUrl: row.facebook_url,
      websiteUrl: row.website_url,
      phone: row.phone,
      educations: educations.map((education) => ({
        id: education.id,
        university: education.university,
        degree: education.degree,
        major: education.major,
        startYear: education.start_year,
        endYear: education.end_year,
        status: education.status,
        logoUrl: education.logo_url,
        description: education.description,
      })),
      experiences: experiences.map((experience) => ({
        id: experience.id,
        company: experience.company,
        position: experience.position,
        industry: experience.industry,
        expertise: parseJsonArray(experience.expertise_json),
        startYear: experience.start_year,
        endYear: experience.end_year,
        status: experience.status,
        description: experience.description,
      })),
      mentorSkills: mentorSkills.map((skill) => skill.skill_name),
      mentorRequest,
    },
  };
}

export function parseProfileUpdateInput(input: unknown) {
  return profileUpdateSchema.parse(input);
}

export function parseProfilePatchInput(input: unknown) {
  return profilePatchSchema.parse(input);
}

export function buildProfileUpdateStatements(
  userId: number,
  payload: ProfileUpdatePayload,
  now: string,
) {
  const statements: BatchStatement[] = [
    {
      sql: `
        UPDATE profiles
        SET
          full_name = ?,
          bio = ?,
          location = ?,
          profile_image_url = ?,
          linkedin_url = ?,
          instagram_url = ?,
          facebook_url = ?,
          website_url = ?,
          phone = ?,
          updated_at = ?
        WHERE user_id = ?
      `,
      params: [
        payload.fullName,
        payload.bio ?? null,
        payload.location ?? null,
        payload.profileImageUrl ?? null,
        payload.linkedinUrl ?? null,
        payload.instagramUrl ?? null,
        payload.facebookUrl ?? null,
        payload.websiteUrl ?? null,
        payload.phone ?? null,
        now,
        userId,
      ],
    },
    {
      sql: "DELETE FROM educations WHERE user_id = ?",
      params: [userId],
    },
    {
      sql: "DELETE FROM experiences WHERE user_id = ?",
      params: [userId],
    },
    {
      sql: "DELETE FROM mentor_skills WHERE mentor_id = ?",
      params: [userId],
    },
  ];

  for (const education of payload.educations) {
    statements.push({
      sql: `
        INSERT INTO educations (
          user_id, university, degree, major, start_year, end_year, status, logo_url, description
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      params: [
        userId,
        education.university,
        education.degree,
        education.major,
        education.startYear,
        education.endYear ?? null,
        education.status,
        education.logoUrl ?? null,
        education.description ?? null,
      ],
    });
  }

  for (const experience of payload.experiences) {
    statements.push({
      sql: `
        INSERT INTO experiences (
          user_id, company, position, industry, expertise_json, start_year, end_year, status, description
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      params: [
        userId,
        experience.company,
        experience.position,
        experience.industry ?? null,
        JSON.stringify(experience.expertise ?? []),
        experience.startYear,
        experience.endYear ?? null,
        experience.status,
        experience.description ?? null,
      ],
    });
  }

  for (const skill of payload.mentorSkills) {
    statements.push({
      sql: "INSERT INTO mentor_skills (mentor_id, skill_name) VALUES (?, ?)",
      params: [userId, skill],
    });
  }

  return statements;
}

function buildProfilePatchStatements(
  userId: number,
  payload: ProfilePatchPayload,
  now: string,
) {
  const statements: BatchStatement[] = [];
  const updateAssignments = ["updated_at = ?"];
  const updateParams: Array<string | number | null | undefined> = [now];

  if (payload.fullName !== undefined) {
    updateAssignments.push("full_name = ?");
    updateParams.push(payload.fullName);
  }

  if (payload.bio !== undefined) {
    updateAssignments.push("bio = ?");
    updateParams.push(payload.bio ?? null);
  }

  if (payload.location !== undefined) {
    updateAssignments.push("location = ?");
    updateParams.push(payload.location ?? null);
  }

  if (payload.profileImageUrl !== undefined) {
    updateAssignments.push("profile_image_url = ?");
    updateParams.push(payload.profileImageUrl ?? null);
  }

  if (payload.linkedinUrl !== undefined) {
    updateAssignments.push("linkedin_url = ?");
    updateParams.push(payload.linkedinUrl ?? null);
  }

  if (payload.instagramUrl !== undefined) {
    updateAssignments.push("instagram_url = ?");
    updateParams.push(payload.instagramUrl ?? null);
  }

  if (payload.facebookUrl !== undefined) {
    updateAssignments.push("facebook_url = ?");
    updateParams.push(payload.facebookUrl ?? null);
  }

  if (payload.websiteUrl !== undefined) {
    updateAssignments.push("website_url = ?");
    updateParams.push(payload.websiteUrl ?? null);
  }

  if (payload.phone !== undefined) {
    updateAssignments.push("phone = ?");
    updateParams.push(payload.phone ?? null);
  }

  const replacesEducations = payload.educations !== undefined;
  const replacesExperiences = payload.experiences !== undefined;
  const replacesMentorSkills = payload.mentorSkills !== undefined;
  const hasChanges =
    updateAssignments.length > 1 ||
    replacesEducations ||
    replacesExperiences ||
    replacesMentorSkills;

  if (!hasChanges) {
    return statements;
  }

  statements.push({
    sql: `
      UPDATE profiles
      SET ${updateAssignments.join(", ")}
      WHERE user_id = ?
    `,
    params: [...updateParams, userId],
  });

  if (replacesEducations) {
    const educations = payload.educations ?? [];
    statements.push({
      sql: "DELETE FROM educations WHERE user_id = ?",
      params: [userId],
    });

    for (const education of educations) {
      statements.push({
        sql: `
          INSERT INTO educations (
            user_id, university, degree, major, start_year, end_year, status, logo_url, description
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        params: [
          userId,
          education.university,
          education.degree,
          education.major,
          education.startYear,
          education.endYear ?? null,
          education.status,
          education.logoUrl ?? null,
          education.description ?? null,
        ],
      });
    }
  }

  if (replacesExperiences) {
    const experiences = payload.experiences ?? [];
    statements.push({
      sql: "DELETE FROM experiences WHERE user_id = ?",
      params: [userId],
    });

    for (const experience of experiences) {
      statements.push({
        sql: `
          INSERT INTO experiences (
            user_id, company, position, industry, expertise_json, start_year, end_year, status, description
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        params: [
          userId,
          experience.company,
          experience.position,
          experience.industry ?? null,
          JSON.stringify(experience.expertise ?? []),
          experience.startYear,
          experience.endYear ?? null,
          experience.status,
          experience.description ?? null,
        ],
      });
    }
  }

  if (replacesMentorSkills) {
    const mentorSkills = payload.mentorSkills ?? [];
    statements.push({
      sql: "DELETE FROM mentor_skills WHERE mentor_id = ?",
      params: [userId],
    });

    for (const skill of mentorSkills) {
      statements.push({
        sql: "INSERT INTO mentor_skills (mentor_id, skill_name) VALUES (?, ?)",
        params: [userId, skill],
      });
    }
  }

  return statements;
}

export async function updateProfile(
  db: DatabaseClient,
  userId: number,
  input: unknown,
) {
  const payload = parseProfileUpdateInput(input);
  const now = new Date().toISOString();

  await db.batch(buildProfileUpdateStatements(userId, payload, now));

  return getProfile(db, userId);
}

export async function patchProfile(
  db: DatabaseClient,
  userId: number,
  input: unknown,
) {
  const payload = parseProfilePatchInput(input);
  const current = await db.get<{ id: number }>(
    "SELECT id FROM users WHERE id = ? LIMIT 1",
    [userId],
  );

  if (!current) {
    throw new AppError(404, "user_not_found", "User not found");
  }

  const statements = buildProfilePatchStatements(
    userId,
    payload,
    new Date().toISOString(),
  );

  if (statements.length > 0) {
    await db.batch(statements);
  }

  return getProfile(db, userId);
}

export async function submitMentorRequest(
  db: DatabaseClient,
  userId: number,
  input: unknown,
) {
  const payload = mentorRequestSchema.parse(input);
  const user = await db.get<{ role: UserRole; is_mentor_approved: number }>(
    "SELECT role, is_mentor_approved FROM users WHERE id = ? LIMIT 1",
    [userId],
  );

  if (!user) {
    throw new AppError(404, "user_not_found", "User not found");
  }

  if (user.role === "admin") {
    throw new AppError(
      403,
      "admin_review_only",
      "Admin accounts do not use mentor applications",
    );
  }

  if (user.is_mentor_approved) {
    throw new AppError(
      409,
      "mentor_already_approved",
      "Your mentor account is already approved",
    );
  }

  const currentRequest = await db.get<{ id: number; status: RequestStatus }>(
    `
			SELECT id, status
			FROM mentor_requests
			WHERE user_id = ?
			ORDER BY submitted_at DESC
			LIMIT 1
		`,
    [userId],
  );
  const now = new Date().toISOString();

  if (currentRequest?.status === "pending") {
    await db.run(
      `
				UPDATE mentor_requests
				SET document_url = ?, note = ?, status = 'pending', submitted_at = ?, reviewed_at = NULL
				WHERE id = ?
			`,
      [payload.documentUrl ?? "", payload.note ?? null, now, currentRequest.id],
    );
  } else {
    await db.run(
      `
				INSERT INTO mentor_requests (user_id, document_url, note, status, submitted_at)
				VALUES (?, ?, ?, 'pending', ?)
			`,
      [userId, payload.documentUrl ?? "", payload.note ?? null, now],
    );
  }

  if (user.role !== "mentee") {
    await db.run("UPDATE users SET role = ?, updated_at = ? WHERE id = ?", [
      "mentee",
      now,
      userId,
    ]);
  }

  return { ok: true };
}

export async function withdrawMentorRequest(
  db: DatabaseClient,
  userId: number,
) {
  const user = await db.get<{ role: UserRole; is_mentor_approved: number }>(
    "SELECT role, is_mentor_approved FROM users WHERE id = ? LIMIT 1",
    [userId],
  );

  if (!user) {
    throw new AppError(404, "user_not_found", "User not found");
  }

  if (user.role === "admin") {
    throw new AppError(
      403,
      "admin_review_only",
      "Admin accounts do not use mentor applications",
    );
  }

  if (user.is_mentor_approved) {
    throw new AppError(
      409,
      "mentor_already_approved",
      "Your mentor account is already approved",
    );
  }

  const currentRequest = await db.get<{ id: number; status: RequestStatus }>(
    `
			SELECT id, status
			FROM mentor_requests
			WHERE user_id = ?
			ORDER BY submitted_at DESC
			LIMIT 1
		`,
    [userId],
  );

  if (!currentRequest || currentRequest.status !== "pending") {
    throw new AppError(
      409,
      "mentor_request_not_pending",
      "You do not have a pending mentor application to withdraw",
    );
  }

  const now = new Date().toISOString();
  await db.run(
    "UPDATE mentor_requests SET status = 'withdrawn', reviewed_at = ? WHERE id = ?",
    [now, currentRequest.id],
  );

  if (user.role !== "mentee") {
    await db.run("UPDATE users SET role = ?, updated_at = ? WHERE id = ?", [
      "mentee",
      now,
      userId,
    ]);
  }

  return { ok: true };
}

export async function listMentorRequests(db: DatabaseClient) {
  const requests = await db.all<MentorRequestListRow>(
    `
			SELECT
				r.id,
				r.status,
				r.document_url,
				r.note,
				r.submitted_at,
				r.reviewed_at,
				u.id AS user_id,
				u.email,
				u.role,
				p.full_name,
				p.profile_image_url
			FROM mentor_requests r
			JOIN users u ON u.id = r.user_id
			JOIN profiles p ON p.user_id = u.id
			ORDER BY
				CASE r.status
					WHEN 'pending' THEN 0
					WHEN 'approved' THEN 1
					WHEN 'rejected' THEN 2
					WHEN 'withdrawn' THEN 3
					ELSE 4
				END,
				r.submitted_at DESC
		`,
  );

  return requests.map((request) => ({
    id: request.id,
    status: request.status,
    documentUrl: request.document_url || null,
    note: request.note,
    submittedAt: request.submitted_at,
    reviewedAt: request.reviewed_at,
    user: {
      id: request.user_id,
      email: request.email,
      role: request.role,
      fullName: request.full_name,
      profileImageUrl: ensureAvatar(request.profile_image_url),
    },
  }));
}

export async function listUsersForAdmin(db: DatabaseClient) {
  const users = await db.all<AdminUserListRow>(
    `
			SELECT
				u.id,
				u.email,
				u.role,
				u.is_mentor_approved,
				u.created_at,
				p.full_name,
				p.profile_image_url,
				p.location,
				(
					SELECT e.position
					FROM experiences e
					WHERE e.user_id = u.id
					ORDER BY e.start_year DESC
					LIMIT 1
				) AS latest_position,
				(
					SELECT e.company
					FROM experiences e
					WHERE e.user_id = u.id
					ORDER BY e.start_year DESC
					LIMIT 1
				) AS latest_company,
				(
					SELECT e.expertise_json
					FROM experiences e
					WHERE e.user_id = u.id
					ORDER BY e.start_year DESC
					LIMIT 1
				) AS latest_expertise_json,
				(
					SELECT GROUP_CONCAT(ms.skill_name, ',')
					FROM mentor_skills ms
					WHERE ms.mentor_id = u.id
				) AS skill_names,
				(
					SELECT mr.status
					FROM mentor_requests mr
					WHERE mr.user_id = u.id
					ORDER BY mr.submitted_at DESC
					LIMIT 1
				) AS latest_request_status
			FROM users u
			JOIN profiles p ON p.user_id = u.id
			ORDER BY
				CASE u.role
					WHEN 'admin' THEN 0
					WHEN 'mentor' THEN 1
					ELSE 2
				END,
				p.full_name ASC,
				u.id ASC
		`,
  );

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    isMentorApproved: Boolean(user.is_mentor_approved),
    createdAt: user.created_at,
    fullName: user.full_name,
    profileImageUrl: ensureAvatar(user.profile_image_url),
    location: user.location,
    position:
      user.latest_position?.trim() ||
      (user.role === "admin" ? "Admin" : "Member"),
    company: user.latest_company?.trim() || "MentorMatch",
    mentorSkills: user.skill_names
      ? user.skill_names.split(",").filter(Boolean)
      : [],
    expertise: parseJsonArray(user.latest_expertise_json),
    latestMentorRequestStatus: user.latest_request_status,
  }));
}

export async function toggleRole(
  db: DatabaseClient,
  userId: number,
  input: unknown = {},
) {
  const payload = mentorModeSchema.parse(input);
  const current = await db.get<{ role: UserRole; is_mentor_approved: number }>(
    "SELECT role, is_mentor_approved FROM users WHERE id = ? LIMIT 1",
    [userId],
  );

  if (!current) {
    throw new AppError(404, "user_not_found", "User not found");
  }

  if (current.role === "admin") {
    throw new AppError(
      403,
      "admin_role_locked",
      "Admin accounts cannot switch mentoring modes",
    );
  }

  const nextRole =
    payload.role ?? (current.role === "mentor" ? "mentee" : "mentor");
  if (nextRole === "mentor" && !current.is_mentor_approved) {
    throw new AppError(
      403,
      "mentor_approval_required",
      "Mentor approval required before switching role",
    );
  }

  await db.run("UPDATE users SET role = ?, updated_at = ? WHERE id = ?", [
    nextRole,
    new Date().toISOString(),
    userId,
  ]);

  return { role: nextRole };
}
