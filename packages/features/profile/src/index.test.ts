import { describe, expect, it } from "vitest";
import type { DatabaseClient, QueryParams, QueryResult } from "@mentormatch/db";
import {
  reviewMentorRequest,
  submitMentorRequest,
  toggleRole,
  listMentorRequests,
} from "./index";

type UserRow = {
  id: number;
  email: string;
  role: "mentee" | "mentor" | "admin";
  is_mentor_approved: number;
};

type ProfileRow = {
  user_id: number;
  full_name: string;
  profile_image_url: string | null;
};

type MentorRequestRow = {
  id: number;
  user_id: number;
  document_url: string;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  reviewed_at: string | null;
};

class ProfileTestDatabase implements DatabaseClient {
  private nextRequestId = 1;
  private users: UserRow[] = [
    {
      id: 1,
      email: "mentor@example.com",
      role: "mentee",
      is_mentor_approved: 0,
    },
    { id: 2, email: "admin@example.com", role: "admin", is_mentor_approved: 1 },
  ];
  private profiles: ProfileRow[] = [
    { user_id: 1, full_name: "Ada Mentor", profile_image_url: null },
    { user_id: 2, full_name: "Admin User", profile_image_url: null },
  ];
  private mentorRequests: MentorRequestRow[] = [];

  async get<T>(sql: string, params: QueryParams = []): Promise<T | null> {
    if (sql.includes("SELECT r.id, r.user_id, r.status")) {
      const requestId = Number(params[0]);
      const request = this.mentorRequests.find((item) => item.id === requestId);
      if (!request) {
        return null;
      }

      return {
        id: request.id,
        user_id: request.user_id,
        status: request.status,
      } as T;
    }

    if (
      sql.includes("SELECT id, status") &&
      sql.includes("FROM mentor_requests")
    ) {
      const userId = Number(params[0]);
      const request = [...this.mentorRequests]
        .filter((item) => item.user_id === userId)
        .sort((left, right) =>
          right.submitted_at.localeCompare(left.submitted_at),
        )[0];

      return (
        request ? { id: request.id, status: request.status } : null
      ) as T | null;
    }

    if (sql.includes("SELECT role, is_mentor_approved FROM users")) {
      const userId = Number(params[0]);
      const user = this.users.find((item) => item.id === userId);
      return (
        user
          ? { role: user.role, is_mentor_approved: user.is_mentor_approved }
          : null
      ) as T | null;
    }

    throw new Error(`Unexpected get query: ${sql}`);
  }

  async all<T>(sql: string): Promise<T[]> {
    if (sql.includes("FROM mentor_requests r")) {
      return this.mentorRequests.map((request) => {
        const user = this.users.find((item) => item.id === request.user_id)!;
        const profile = this.profiles.find(
          (item) => item.user_id === request.user_id,
        )!;

        return {
          id: request.id,
          status: request.status,
          document_url: request.document_url,
          note: request.note,
          submitted_at: request.submitted_at,
          reviewed_at: request.reviewed_at,
          user_id: user.id,
          email: user.email,
          role: user.role,
          full_name: profile.full_name,
          profile_image_url: profile.profile_image_url,
        } as T;
      });
    }

    throw new Error(`Unexpected all query: ${sql}`);
  }

  async run(sql: string, params: QueryParams = []): Promise<QueryResult> {
    if (sql.includes("INSERT INTO mentor_requests")) {
      const [userId, documentUrl, note, submittedAt] = params;
      const id = this.nextRequestId++;
      this.mentorRequests.push({
        id,
        user_id: Number(userId),
        document_url: String(documentUrl),
        note: note == null ? null : String(note),
        status: "pending",
        submitted_at: String(submittedAt),
        reviewed_at: null,
      });

      return { changes: 1, lastRowId: id };
    }

    if (sql.includes("SET document_url = ?, note = ?, status = 'pending'")) {
      const [documentUrl, note, submittedAt, requestId] = params;
      const request = this.mentorRequests.find(
        (item) => item.id === Number(requestId),
      );
      if (!request) {
        return { changes: 0, lastRowId: null };
      }

      request.document_url = String(documentUrl);
      request.note = note == null ? null : String(note);
      request.status = "pending";
      request.submitted_at = String(submittedAt);
      request.reviewed_at = null;
      return { changes: 1, lastRowId: null };
    }

    if (sql.includes("UPDATE mentor_requests SET status = ?")) {
      const [status, reviewedAt, requestId] = params;
      const request = this.mentorRequests.find(
        (item) => item.id === Number(requestId),
      );
      if (!request) {
        return { changes: 0, lastRowId: null };
      }

      request.status = status as MentorRequestRow["status"];
      request.reviewed_at = String(reviewedAt);
      return { changes: 1, lastRowId: null };
    }

    if (sql.includes("UPDATE users SET role = ?, is_mentor_approved = ?, updated_at = ?")) {
      const [role, approved, _updatedAt, userId] = params;
      const user = this.users.find((item) => item.id === Number(userId));
      if (!user) {
        return { changes: 0, lastRowId: null };
      }

      user.role = role as UserRow["role"];
      user.is_mentor_approved = Number(approved);
      return { changes: 1, lastRowId: null };
    }

    if (sql.includes("UPDATE users SET role = ?")) {
      const [role, _updatedAt, userId] = params;
      const user = this.users.find((item) => item.id === Number(userId));
      if (!user) {
        return { changes: 0, lastRowId: null };
      }

      user.role = role as UserRow["role"];
      return { changes: 1, lastRowId: null };
    }

    throw new Error(`Unexpected run query: ${sql}`);
  }
}

describe("feature-profile", () => {
  it("lists submitted mentor applications for admin review", async () => {
    const db = new ProfileTestDatabase();

    await submitMentorRequest(db, 1, {
      documentUrl: "https://example.com/cv.pdf",
      note: "Ready to help with interviews.",
    });

    await expect(listMentorRequests(db)).resolves.toMatchObject([
      {
        status: "pending",
        user: {
          fullName: "Ada Mentor",
        },
      },
    ]);
  });

  it("accepts bare document links by normalizing them to https", async () => {
    const db = new ProfileTestDatabase();

    await submitMentorRequest(db, 1, {
      documentUrl: "docs.example.com/mentor-resume.pdf",
      note: "Ready to help with interviews.",
    });

    await expect(listMentorRequests(db)).resolves.toMatchObject([
      {
        documentUrl: "https://docs.example.com/mentor-resume.pdf",
      },
    ]);
  });

  it("approves mentor applications into mentor mode immediately", async () => {
    const db = new ProfileTestDatabase();

    await submitMentorRequest(db, 1, {
      documentUrl: "https://example.com/cv.pdf",
      note: "Ready to help with interviews.",
    });
    await reviewMentorRequest(db, 1, { status: "approved" });

    await expect(toggleRole(db, 1, { role: "mentor" })).resolves.toEqual({ role: "mentor" });
  });

  it("updates an existing pending mentor application instead of duplicating it", async () => {
    const db = new ProfileTestDatabase();

    await submitMentorRequest(db, 1, {
      documentUrl: "https://example.com/first.pdf",
      note: "First version",
    });
    await submitMentorRequest(db, 1, {
      documentUrl: "https://example.com/updated.pdf",
      note: "Updated version",
    });

    await expect(listMentorRequests(db)).resolves.toMatchObject([
      {
        documentUrl: "https://example.com/updated.pdf",
        note: "Updated version",
        status: "pending",
      },
    ]);
    await expect(listMentorRequests(db)).resolves.toHaveLength(1);
  });

  it("blocks mentor mode until an application has been approved", async () => {
    const db = new ProfileTestDatabase();

    await expect(toggleRole(db, 1)).rejects.toMatchObject({
      status: 403,
      code: "mentor_approval_required",
    });
  });

  it("does not allow admin accounts into mentor application or role switching flows", async () => {
    const db = new ProfileTestDatabase();

    await expect(
      submitMentorRequest(db, 2, {
        documentUrl: "https://example.com/admin.pdf",
        note: "Admin account",
      }),
    ).rejects.toMatchObject({
      status: 403,
      code: "admin_review_only",
    });

    await expect(toggleRole(db, 2)).rejects.toMatchObject({
      status: 403,
      code: "admin_role_locked",
    });
  });

  it("blocks resubmission once a mentor application has been approved", async () => {
    const db = new ProfileTestDatabase();

    await submitMentorRequest(db, 1, {
      documentUrl: "https://example.com/cv.pdf",
      note: "Ready to help with interviews.",
    });
    await reviewMentorRequest(db, 1, { status: "approved" });

    await expect(
      submitMentorRequest(db, 1, {
        documentUrl: "https://example.com/new-cv.pdf",
        note: "Second submission",
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "mentor_already_approved",
    });
  });
});
