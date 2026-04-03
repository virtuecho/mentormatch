import { describe, expect, it } from "vitest";
import type { DatabaseClient, QueryParams, QueryResult } from "@mentormatch/db";
import {
  approveMentorAsAdmin,
  deleteAvailabilitySlotAsAdmin,
  reviewMentorRequestAsAdmin,
  revokeMentorAsAdmin,
  updateUserProfileAsAdmin,
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
  bio: string | null;
  location: string | null;
  profile_image_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  website_url: string | null;
  phone: string | null;
};

type MentorRequestRow = {
  id: number;
  user_id: number;
  document_url: string;
  note: string | null;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  submitted_at: string;
  reviewed_at: string | null;
};

type EducationRow = {
  id: number;
  user_id: number;
  university: string;
  degree: string;
  major: string;
  start_year: number;
  end_year: number | null;
  status: "on_going" | "completed";
  logo_url: string | null;
  description: string | null;
};

type ExperienceRow = {
  id: number;
  user_id: number;
  company: string;
  position: string;
  industry: string | null;
  expertise_json: string;
  start_year: number;
  end_year: number | null;
  status: "on_going" | "completed";
  description: string | null;
};

type MentorSkillRow = {
  mentor_id: number;
  skill_name: string;
};

type AvailabilitySlotRow = {
  id: number;
  mentor_id: number;
  start_time: string;
};

type AuditLogRow = {
  actor_user_id: number;
  action: string;
  target_type: string;
  target_id: number;
  request_id: string | null;
  metadata_json: string;
  created_at: string;
};

class AdminTestDatabase implements DatabaseClient {
  private nextEducationId = 10;
  private nextExperienceId = 10;
  users: UserRow[] = [
    { id: 1, email: "admin@example.com", role: "admin", is_mentor_approved: 1 },
    {
      id: 2,
      email: "member@example.com",
      role: "mentee",
      is_mentor_approved: 0,
    },
    {
      id: 3,
      email: "mentor@example.com",
      role: "mentor",
      is_mentor_approved: 1,
    },
  ];
  profiles: ProfileRow[] = [
    {
      user_id: 1,
      full_name: "Admin User",
      bio: null,
      location: "Remote",
      profile_image_url: null,
      linkedin_url: null,
      instagram_url: null,
      facebook_url: null,
      website_url: null,
      phone: null,
    },
    {
      user_id: 2,
      full_name: "Member User",
      bio: "Member bio",
      location: "Beijing",
      profile_image_url: null,
      linkedin_url: null,
      instagram_url: null,
      facebook_url: null,
      website_url: null,
      phone: null,
    },
    {
      user_id: 3,
      full_name: "Mentor User",
      bio: "Mentor bio",
      location: "Shanghai",
      profile_image_url: null,
      linkedin_url: null,
      instagram_url: null,
      facebook_url: null,
      website_url: null,
      phone: null,
    },
  ];
  mentorRequests: MentorRequestRow[] = [
    {
      id: 7,
      user_id: 2,
      document_url: "",
      note: null,
      status: "pending",
      submitted_at: "2026-04-01T00:00:00.000Z",
      reviewed_at: null,
    },
  ];
  educations: EducationRow[] = [];
  experiences: ExperienceRow[] = [
    {
      id: 1,
      user_id: 2,
      company: "MentorMatch",
      position: "Designer",
      industry: "Technology",
      expertise_json: JSON.stringify(["UX"]),
      start_year: 2024,
      end_year: null,
      status: "on_going",
      description: null,
    },
  ];
  mentorSkills: MentorSkillRow[] = [{ mentor_id: 2, skill_name: "Design" }];
  slots: AvailabilitySlotRow[] = [
    {
      id: 22,
      mentor_id: 3,
      start_time: "2026-05-01T10:00:00.000Z",
    },
    {
      id: 23,
      mentor_id: 3,
      start_time: "2026-05-08T10:00:00.000Z",
    },
  ];
  auditLogs: AuditLogRow[] = [];

  async get<T>(sql: string, params: QueryParams = []): Promise<T | null> {
    if (sql.includes("SELECT r.id, r.user_id, r.status")) {
      const request = this.mentorRequests.find(
        (item) => item.id === Number(params[0]),
      );
      return request
        ? ({
            id: request.id,
            user_id: request.user_id,
            status: request.status,
          } as T)
        : null;
    }

    if (sql.includes("SELECT role, is_mentor_approved FROM users")) {
      const user = this.users.find((item) => item.id === Number(params[0]));
      return user
        ? ({
            role: user.role,
            is_mentor_approved: user.is_mentor_approved,
          } as T)
        : null;
    }

    if (sql.includes("SELECT id FROM users WHERE id = ?")) {
      const user = this.users.find((item) => item.id === Number(params[0]));
      return (user ? { id: user.id } : null) as T | null;
    }

    if (sql.includes("SELECT COUNT(*) AS count FROM availability_slots")) {
      const mentorId = Number(params[0]);
      const cutoff = String(params[1]);
      const count = this.slots.filter(
        (slot) => slot.mentor_id === mentorId && slot.start_time >= cutoff,
      ).length;
      return { count } as T;
    }

    if (
      sql.includes("SELECT id, mentor_id, start_time FROM availability_slots")
    ) {
      const slot = this.slots.find((item) => item.id === Number(params[0]));
      return slot ? ({ ...slot } as T) : null;
    }

    if (
      sql.includes("FROM users u") &&
      sql.includes("JOIN profiles p ON p.user_id = u.id") &&
      sql.includes("WHERE u.id = ?")
    ) {
      const userId = Number(params[0]);
      const user = this.users.find((item) => item.id === userId);
      const profile = this.profiles.find((item) => item.user_id === userId);
      if (!user || !profile) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        is_mentor_approved: user.is_mentor_approved,
        full_name: profile.full_name,
        bio: profile.bio,
        location: profile.location,
        profile_image_url: profile.profile_image_url,
        linkedin_url: profile.linkedin_url,
        instagram_url: profile.instagram_url,
        facebook_url: profile.facebook_url,
        website_url: profile.website_url,
        phone: profile.phone,
      } as T;
    }

    if (
      sql.includes("FROM mentor_requests") &&
      sql.includes("WHERE user_id = ?") &&
      sql.includes("ORDER BY submitted_at DESC")
    ) {
      const userId = Number(params[0]);
      const request = [...this.mentorRequests]
        .filter((item) => item.user_id === userId)
        .sort((left, right) =>
          right.submitted_at.localeCompare(left.submitted_at),
        )[0];

      return request
        ? ({
            id: request.id,
            status: request.status,
            document_url: request.document_url,
            note: request.note,
            submitted_at: request.submitted_at,
          } as T)
        : null;
    }

    throw new Error(`Unexpected get query: ${sql}`);
  }

  async all<T>(sql: string, params: QueryParams = []): Promise<T[]> {
    if (sql.includes("FROM educations")) {
      return this.educations
        .filter((item) => item.user_id === Number(params[0]))
        .map((item) => ({ ...item })) as T[];
    }

    if (sql.includes("FROM experiences")) {
      return this.experiences
        .filter((item) => item.user_id === Number(params[0]))
        .map((item) => ({ ...item })) as T[];
    }

    if (sql.includes("SELECT skill_name FROM mentor_skills")) {
      return this.mentorSkills
        .filter((item) => item.mentor_id === Number(params[0]))
        .map((item) => ({ skill_name: item.skill_name })) as T[];
    }

    throw new Error(`Unexpected all query: ${sql}`);
  }

  async run(sql: string, params: QueryParams = []): Promise<QueryResult> {
    if (
      sql.includes(
        "UPDATE mentor_requests SET status = ?, reviewed_at = ? WHERE id = ?",
      )
    ) {
      const request = this.mentorRequests.find(
        (item) => item.id === Number(params[2]) && item.status === "pending",
      );
      if (!request) {
        return { changes: 0, lastRowId: null };
      }
      request.status = String(params[0]) as MentorRequestRow["status"];
      request.reviewed_at = String(params[1]);
      return { changes: 1, lastRowId: null };
    }

    if (
      sql.includes(
        "UPDATE mentor_requests SET status = ?, reviewed_at = ? WHERE user_id = ? AND status = ?",
      )
    ) {
      let changes = 0;
      for (const request of this.mentorRequests) {
        if (
          request.user_id === Number(params[2]) &&
          request.status === String(params[3])
        ) {
          request.status = String(params[0]) as MentorRequestRow["status"];
          request.reviewed_at = String(params[1]);
          changes += 1;
        }
      }
      return { changes, lastRowId: null };
    }

    if (
      sql.includes(
        "UPDATE users SET role = ?, is_mentor_approved = ?, updated_at = ?",
      )
    ) {
      const user = this.users.find((item) => item.id === Number(params[3]));
      if (!user) {
        return { changes: 0, lastRowId: null };
      }
      user.role = params[0] as UserRow["role"];
      user.is_mentor_approved = Number(params[1]);
      return { changes: 1, lastRowId: null };
    }

    if (
      sql.includes(
        "DELETE FROM availability_slots WHERE mentor_id = ? AND start_time >= ?",
      )
    ) {
      const before = this.slots.length;
      this.slots = this.slots.filter(
        (item) =>
          !(
            item.mentor_id === Number(params[0]) &&
            item.start_time >= String(params[1])
          ),
      );
      return { changes: before - this.slots.length, lastRowId: null };
    }

    if (sql.includes("DELETE FROM availability_slots WHERE id = ?")) {
      const before = this.slots.length;
      this.slots = this.slots.filter((item) => item.id !== Number(params[0]));
      return { changes: before - this.slots.length, lastRowId: null };
    }

    if (sql.includes("UPDATE profiles")) {
      const profile = this.profiles.find(
        (item) => item.user_id === Number(params[10]),
      );
      if (!profile) {
        return { changes: 0, lastRowId: null };
      }
      profile.full_name = String(params[0]);
      profile.bio = params[1] == null ? null : String(params[1]);
      profile.location = params[2] == null ? null : String(params[2]);
      profile.profile_image_url = params[3] == null ? null : String(params[3]);
      profile.linkedin_url = params[4] == null ? null : String(params[4]);
      profile.instagram_url = params[5] == null ? null : String(params[5]);
      profile.facebook_url = params[6] == null ? null : String(params[6]);
      profile.website_url = params[7] == null ? null : String(params[7]);
      profile.phone = params[8] == null ? null : String(params[8]);
      return { changes: 1, lastRowId: null };
    }

    if (sql.includes("DELETE FROM educations WHERE user_id = ?")) {
      this.educations = this.educations.filter(
        (item) => item.user_id !== Number(params[0]),
      );
      return { changes: 1, lastRowId: null };
    }

    if (sql.includes("DELETE FROM experiences WHERE user_id = ?")) {
      this.experiences = this.experiences.filter(
        (item) => item.user_id !== Number(params[0]),
      );
      return { changes: 1, lastRowId: null };
    }

    if (sql.includes("DELETE FROM mentor_skills WHERE mentor_id = ?")) {
      this.mentorSkills = this.mentorSkills.filter(
        (item) => item.mentor_id !== Number(params[0]),
      );
      return { changes: 1, lastRowId: null };
    }

    if (sql.includes("INSERT INTO educations")) {
      this.educations.push({
        id: this.nextEducationId++,
        user_id: Number(params[0]),
        university: String(params[1]),
        degree: String(params[2]),
        major: String(params[3]),
        start_year: Number(params[4]),
        end_year: params[5] == null ? null : Number(params[5]),
        status: params[6] as EducationRow["status"],
        logo_url: params[7] == null ? null : String(params[7]),
        description: params[8] == null ? null : String(params[8]),
      });
      return { changes: 1, lastRowId: this.nextEducationId - 1 };
    }

    if (sql.includes("INSERT INTO experiences")) {
      this.experiences.push({
        id: this.nextExperienceId++,
        user_id: Number(params[0]),
        company: String(params[1]),
        position: String(params[2]),
        industry: params[3] == null ? null : String(params[3]),
        expertise_json: String(params[4]),
        start_year: Number(params[5]),
        end_year: params[6] == null ? null : Number(params[6]),
        status: params[7] as ExperienceRow["status"],
        description: params[8] == null ? null : String(params[8]),
      });
      return { changes: 1, lastRowId: this.nextExperienceId - 1 };
    }

    if (sql.includes("INSERT INTO mentor_skills")) {
      this.mentorSkills.push({
        mentor_id: Number(params[0]),
        skill_name: String(params[1]),
      });
      return { changes: 1, lastRowId: null };
    }

    if (sql.includes("INSERT INTO audit_logs")) {
      this.auditLogs.push({
        actor_user_id: Number(params[0]),
        action: String(params[1]),
        target_type: String(params[2]),
        target_id: Number(params[3]),
        request_id: params[4] == null ? null : String(params[4]),
        metadata_json: String(params[5]),
        created_at: String(params[6]),
      });
      return { changes: 1, lastRowId: this.auditLogs.length };
    }

    throw new Error(`Unexpected run query: ${sql}`);
  }

  async batch(
    statements: Array<{ sql: string; params?: QueryParams }>,
  ): Promise<QueryResult[]> {
    const snapshot = {
      users: this.users.map((item) => ({ ...item })),
      profiles: this.profiles.map((item) => ({ ...item })),
      mentorRequests: this.mentorRequests.map((item) => ({ ...item })),
      educations: this.educations.map((item) => ({ ...item })),
      experiences: this.experiences.map((item) => ({ ...item })),
      mentorSkills: this.mentorSkills.map((item) => ({ ...item })),
      slots: this.slots.map((item) => ({ ...item })),
      auditLogs: this.auditLogs.map((item) => ({ ...item })),
      nextEducationId: this.nextEducationId,
      nextExperienceId: this.nextExperienceId,
    };

    try {
      const results: QueryResult[] = [];
      for (const statement of statements) {
        results.push(await this.run(statement.sql, statement.params ?? []));
      }
      return results;
    } catch (error) {
      this.users = snapshot.users;
      this.profiles = snapshot.profiles;
      this.mentorRequests = snapshot.mentorRequests;
      this.educations = snapshot.educations;
      this.experiences = snapshot.experiences;
      this.mentorSkills = snapshot.mentorSkills;
      this.slots = snapshot.slots;
      this.auditLogs = snapshot.auditLogs;
      this.nextEducationId = snapshot.nextEducationId;
      this.nextExperienceId = snapshot.nextExperienceId;
      throw error;
    }
  }
}

describe("feature-admin", () => {
  it("reviews mentor requests and writes an audit log", async () => {
    const db = new AdminTestDatabase();

    const result = await reviewMentorRequestAsAdmin(
      db,
      { id: 1, requestId: "req-1" },
      7,
      { status: "approved" },
    );

    expect(result).toEqual({ status: "approved" });
    expect(db.users.find((user) => user.id === 2)?.role).toBe("mentor");
    expect(db.auditLogs.at(-1)).toMatchObject({
      actor_user_id: 1,
      action: "admin.mentor_request.reviewed",
      target_type: "mentor_request",
      target_id: 7,
      request_id: "req-1",
    });
  });

  it("approves a mentor directly and audits the action", async () => {
    const db = new AdminTestDatabase();
    db.mentorRequests = [];

    const result = await approveMentorAsAdmin(
      db,
      { id: 1, requestId: "req-2" },
      2,
    );

    expect(result).toEqual({ ok: true });
    expect(db.users.find((user) => user.id === 2)?.is_mentor_approved).toBe(1);
    expect(db.auditLogs.at(-1)?.action).toBe("admin.mentor.approved");
  });

  it("updates another user's profile inside one admin command and records the audit entry", async () => {
    const db = new AdminTestDatabase();

    const result = await updateUserProfileAsAdmin(
      db,
      { id: 1, requestId: "req-3" },
      2,
      {
        fullName: "Updated Member",
        location: "London",
        phone: "12345",
        bio: "Updated bio",
        profileImageUrl: "",
        linkedinUrl: "",
        instagramUrl: "",
        facebookUrl: "",
        websiteUrl: "",
        mentorSkills: ["Career", "Product"],
        educations: [],
        experiences: [],
      },
    );

    expect(result.profile.fullName).toBe("Updated Member");
    expect(result.profile.mentorSkills).toEqual(["Career", "Product"]);
    expect(db.auditLogs.at(-1)).toMatchObject({
      actor_user_id: 1,
      action: "admin.profile.updated",
      target_id: 2,
      request_id: "req-3",
    });
  });

  it("revokes mentor access, removes upcoming slots, and audits the action", async () => {
    const db = new AdminTestDatabase();

    const result = await revokeMentorAsAdmin(
      db,
      { id: 1, requestId: "req-4" },
      3,
    );

    expect(result).toEqual({ ok: true, removedUpcomingSlots: 2 });
    expect(db.users.find((user) => user.id === 3)?.role).toBe("mentee");
    expect(db.slots).toHaveLength(0);
    expect(
      JSON.parse(db.auditLogs.at(-1)?.metadata_json ?? "{}"),
    ).toMatchObject({
      removedUpcomingSlots: 2,
    });
  });

  it("deletes availability slots through the admin boundary and audits the delete", async () => {
    const db = new AdminTestDatabase();

    const result = await deleteAvailabilitySlotAsAdmin(
      db,
      { id: 1, requestId: "req-5" },
      22,
    );

    expect(result).toEqual({ ok: true });
    expect(db.slots.map((slot) => slot.id)).toEqual([23]);
    expect(db.auditLogs.at(-1)).toMatchObject({
      action: "admin.slot.deleted",
      target_id: 22,
    });
  });
});
