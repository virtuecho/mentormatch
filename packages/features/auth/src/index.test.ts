import { describe, expect, it } from "vitest";
import type { DatabaseClient, QueryParams, QueryResult } from "@mentormatch/db";
import type { UserRole } from "@mentormatch/shared";
import {
  changePassword,
  deleteAccount,
  getSessionUser,
  loginUser,
  registerUser,
} from "./index";

type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  role: UserRole;
  is_mentor_approved: number;
};

type ProfileRow = {
  user_id: number;
  full_name: string;
  profile_image_url: string | null;
};

class AuthTestDatabase implements DatabaseClient {
  private nextUserId = 1;
  private users: UserRow[] = [];
  private profiles: ProfileRow[] = [];

  async get<T>(sql: string, params: QueryParams = []): Promise<T | null> {
    if (sql.includes("SELECT id FROM users WHERE email = ?")) {
      const email = String(params[0]);
      const user = this.users.find((item) => item.email === email);
      return (user ? { id: user.id } : null) as T | null;
    }

    if (sql.includes("WHERE u.email = ?")) {
      const email = String(params[0]);
      const user = this.users.find((item) => item.email === email);
      if (!user) return null;

      const profile = this.profiles.find((item) => item.user_id === user.id);
      return {
        ...user,
        full_name: profile?.full_name ?? "Unknown",
        profile_image_url: profile?.profile_image_url ?? null,
      } as T;
    }

    if (sql.includes("WHERE u.id = ?")) {
      const id = Number(params[0]);
      const user = this.users.find((item) => item.id === id);
      if (!user) return null;

      const profile = this.profiles.find((item) => item.user_id === user.id);
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        is_mentor_approved: user.is_mentor_approved,
        full_name: profile?.full_name ?? "Unknown",
        profile_image_url: profile?.profile_image_url ?? null,
      } as T;
    }

    if (sql.includes("SELECT id, password_hash")) {
      const id = Number(params[0]);
      const user = this.users.find((item) => item.id === id);
      return (
        user
          ? { id: user.id, password_hash: user.password_hash, role: user.role }
          : null
      ) as T | null;
    }

    throw new Error(`Unexpected get query: ${sql}`);
  }

  async all<T>(): Promise<T[]> {
    return [];
  }

  async run(sql: string, params: QueryParams = []): Promise<QueryResult> {
    if (sql.includes("INSERT INTO users")) {
      const [email, passwordHash, role, isMentorApproved] = params;
      const id = this.nextUserId++;
      this.users.push({
        id,
        email: String(email),
        password_hash: String(passwordHash),
        role: role as UserRole,
        is_mentor_approved: Number(isMentorApproved),
      });

      return { changes: 1, lastRowId: id };
    }

    if (sql.includes("INSERT INTO profiles")) {
      const [userId, fullName] = params;
      this.profiles.push({
        user_id: Number(userId),
        full_name: String(fullName),
        profile_image_url: null,
      });

      return { changes: 1, lastRowId: null };
    }

    if (sql.includes("UPDATE users SET password_hash = ?")) {
      const [passwordHash, _updatedAt, userId] = params;
      const user = this.users.find((item) => item.id === Number(userId));
      if (!user) {
        return { changes: 0, lastRowId: null };
      }

      user.password_hash = String(passwordHash);
      return { changes: 1, lastRowId: null };
    }

    if (sql.includes("UPDATE users SET role = ?")) {
      const [role, _updatedAt, userId] = params;
      const user = this.users.find((item) => item.id === Number(userId));
      if (!user) {
        return { changes: 0, lastRowId: null };
      }

      user.role = role as UserRole;
      return { changes: 1, lastRowId: null };
    }

    if (sql.includes("DELETE FROM users WHERE id = ?")) {
      const userId = Number(params[0]);
      this.users = this.users.filter((item) => item.id !== userId);
      this.profiles = this.profiles.filter((item) => item.user_id !== userId);
      return { changes: 1, lastRowId: null };
    }

    throw new Error(`Unexpected run query: ${sql}`);
  }
}

describe("feature-auth", () => {
  it("registers a user as a member, logs in, and resolves the current session user", async () => {
    const db = new AuthTestDatabase();

    const registration = await registerUser(db, {
      fullName: "Ada Lovelace",
      email: "ADA@EXAMPLE.COM",
      password: "password123",
      role: "mentor",
    });
    expect(registration.user.email).toBe("ada@example.com");
    expect(registration.user.fullName).toBe("Ada Lovelace");
    expect(registration.user.role).toBe("mentee");
    expect(registration.user.isMentorApproved).toBe(false);

    const session = await loginUser(
      db,
      { email: "ada@example.com", password: "password123" },
      "test-secret",
    );
    expect(session.token).toMatch(/\./);
    expect(session.user.role).toBe("mentee");

    const currentUser = await getSessionUser(db, session.token, "test-secret");
    expect(currentUser).toMatchObject({
      email: "ada@example.com",
      fullName: "Ada Lovelace",
      role: "mentee",
    });
  });

  it("rejects invalid credentials", async () => {
    const db = new AuthTestDatabase();

    await registerUser(db, {
      fullName: "Grace Hopper",
      email: "grace@example.com",
      password: "password123",
      role: "mentee",
    });

    await expect(
      loginUser(
        db,
        { email: "grace@example.com", password: "wrong-password" },
        "test-secret",
      ),
    ).rejects.toMatchObject({
      status: 401,
      code: "invalid_credentials",
    });
  });

  it("rejects duplicate email registrations", async () => {
    const db = new AuthTestDatabase();

    await registerUser(db, {
      fullName: "Grace Hopper",
      email: "grace@example.com",
      password: "password123",
      role: "mentee",
    });

    await expect(
      registerUser(db, {
        fullName: "Grace Hopper",
        email: "grace@example.com",
        password: "password123",
        role: "mentor",
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "email_taken",
    });
  });

  it("changes the password when the current password matches", async () => {
    const db = new AuthTestDatabase();
    const registration = await registerUser(db, {
      fullName: "Lin",
      email: "lin@example.com",
      password: "password123",
      role: "mentee",
    });

    await changePassword(db, registration.user.id, {
      currentPassword: "password123",
      newPassword: "newpassword456",
    });

    await expect(
      loginUser(
        db,
        { email: "lin@example.com", password: "password123" },
        "test-secret",
      ),
    ).rejects.toMatchObject({
      status: 401,
      code: "invalid_credentials",
    });

    await expect(
      loginUser(
        db,
        { email: "lin@example.com", password: "newpassword456" },
        "test-secret",
      ),
    ).resolves.toMatchObject({
      user: {
        email: "lin@example.com",
      },
    });
  });

  it("deletes an account when the password matches", async () => {
    const db = new AuthTestDatabase();
    const registration = await registerUser(db, {
      fullName: "Lin",
      email: "lin@example.com",
      password: "password123",
      role: "mentee",
    });

    await deleteAccount(db, registration.user.id, {
      password: "password123",
    });

    await expect(
      loginUser(
        db,
        { email: "lin@example.com", password: "password123" },
        "test-secret",
      ),
    ).rejects.toMatchObject({
      status: 401,
      code: "invalid_credentials",
    });
  });

  it("blocks admin accounts from deleting themselves", async () => {
    const db = new AuthTestDatabase();
    const registration = await registerUser(db, {
      fullName: "Admin User",
      email: "admin@example.com",
      password: "password123",
      role: "mentee",
    });

    await db.run("UPDATE users SET role = ?, updated_at = ? WHERE id = ?", [
      "admin",
      new Date().toISOString(),
      registration.user.id,
    ]);

    await expect(
      deleteAccount(db, registration.user.id, {
        password: "password123",
      }),
    ).rejects.toMatchObject({
      status: 403,
      code: "admin_account_protected",
    });

    await expect(
      loginUser(
        db,
        { email: "admin@example.com", password: "password123" },
        "test-secret",
      ),
    ).resolves.toMatchObject({
      user: {
        email: "admin@example.com",
      },
    });
  });
});
