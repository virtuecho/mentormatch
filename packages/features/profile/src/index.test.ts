import { describe, expect, it } from "vitest";
import type { DatabaseClient, QueryParams, QueryResult } from "@mentormatch/db";
import {
  adminUpdateUser,
  approveUserAsMentor,
  listMentorRequests,
  listUsersForAdmin,
  revokeMentorApproval,
  reviewMentorRequest,
  submitMentorRequest,
  toggleRole,
  withdrawMentorRequest,
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

class ProfileTestDatabase implements DatabaseClient {
  private nextRequestId = 1;
  private nextEducationId = 1;
  private nextExperienceId = 1;
  private users: UserRow[] = [
    {
      id: 1,
      email: "mentor@example.com",
      role: "mentee",
      is_mentor_approved: 0,
    },
    { id: 2, email: "admin@example.com", role: "admin", is_mentor_approved: 1 },
    {
      id: 3,
      email: "grace@example.com",
      role: "mentor",
      is_mentor_approved: 1,
    },
  ];
  private profiles: ProfileRow[] = [
    {
      user_id: 1,
      full_name: "Ada Mentor",
      bio: null,
      location: "Shanghai",
      profile_image_url: null,
      linkedin_url: null,
      instagram_url: null,
      facebook_url: null,
      website_url: null,
      phone: null,
    },
    {
      user_id: 2,
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
      user_id: 3,
      full_name: "Grace Hopper",
      bio: "Seasoned engineering leader",
      location: "New York",
      profile_image_url: null,
      linkedin_url: null,
      instagram_url: null,
      facebook_url: null,
      website_url: null,
      phone: null,
    },
  ];
  private mentorRequests: MentorRequestRow[] = [];
  private educations: EducationRow[] = [];
  private experiences: ExperienceRow[] = [
    {
      id: this.nextExperienceId++,
      user_id: 1,
      company: "MentorMatch",
      position: "Product Manager",
      industry: "Technology",
      expertise_json: JSON.stringify(["Career", "Product"]),
      start_year: 2022,
      end_year: null,
      status: "on_going",
      description: null,
    },
    {
      id: this.nextExperienceId++,
      user_id: 3,
      company: "Navy",
      position: "Staff Engineer",
      industry: "Technology",
      expertise_json: JSON.stringify(["Leadership"]),
      start_year: 2020,
      end_year: null,
      status: "on_going",
      description: null,
    },
  ];
  private mentorSkills: MentorSkillRow[] = [
    { mentor_id: 3, skill_name: "Leadership" },
    { mentor_id: 3, skill_name: "Architecture" },
  ];

  async get<T>(sql: string, params: QueryParams = []): Promise<T | null> {
    if (sql.includes("SELECT id FROM users WHERE id = ?")) {
      const userId = Number(params[0]);
      const user = this.users.find((item) => item.id === userId);
      return (user ? { id: user.id } : null) as T | null;
    }

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

  async all<T>(sql: string, params: QueryParams = []): Promise<T[]> {
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

    if (sql.includes("FROM users u") && sql.includes("latest_request_status")) {
      return this.users.map((user) => {
        const profile = this.profiles.find((item) => item.user_id === user.id)!;
        const latestExperience = [...this.experiences]
          .filter((item) => item.user_id === user.id)
          .sort((left, right) => right.start_year - left.start_year)[0];
        const latestRequest = [...this.mentorRequests]
          .filter((item) => item.user_id === user.id)
          .sort((left, right) =>
            right.submitted_at.localeCompare(left.submitted_at),
          )[0];

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          is_mentor_approved: user.is_mentor_approved,
          full_name: profile.full_name,
          profile_image_url: profile.profile_image_url,
          location: profile.location,
          latest_position: latestExperience?.position ?? null,
          latest_company: latestExperience?.company ?? null,
          latest_expertise_json: latestExperience?.expertise_json ?? null,
          skill_names: this.mentorSkills
            .filter((item) => item.mentor_id === user.id)
            .map((item) => item.skill_name)
            .join(","),
          latest_request_status: latestRequest?.status ?? null,
        } as T;
      });
    }

    if (sql.includes("FROM educations")) {
      const userId = Number(params[0]);
      return this.educations.filter((item) => item.user_id === userId) as T[];
    }

    if (sql.includes("FROM experiences")) {
      const userId = Number(params[0]);
      return this.experiences.filter((item) => item.user_id === userId) as T[];
    }

    if (sql.includes("SELECT skill_name FROM mentor_skills")) {
      const userId = Number(params[0]);
      return this.mentorSkills
        .filter((item) => item.mentor_id === userId)
        .map((item) => ({ skill_name: item.skill_name } as T));
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

    if (
      sql.includes(
        "UPDATE mentor_requests SET status = 'withdrawn', reviewed_at = ? WHERE id = ?",
      )
    ) {
      const [reviewedAt, requestId] = params;
      const request = this.mentorRequests.find(
        (item) => item.id === Number(requestId),
      );
      if (!request) {
        return { changes: 0, lastRowId: null };
      }

      request.status = "withdrawn";
      request.reviewed_at = String(reviewedAt);
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

    if (
      sql.includes(
        "UPDATE mentor_requests SET status = ?, reviewed_at = ? WHERE user_id = ? AND status = ?",
      )
    ) {
      const [status, reviewedAt, userId, currentStatus] = params;
      let changes = 0;
      for (const request of this.mentorRequests) {
        if (
          request.user_id === Number(userId) &&
          request.status === currentStatus
        ) {
          request.status = status as MentorRequestRow["status"];
          request.reviewed_at = String(reviewedAt);
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

    if (sql.includes("UPDATE profiles")) {
      const [
        fullName,
        bio,
        location,
        profileImageUrl,
        linkedinUrl,
        instagramUrl,
        facebookUrl,
        websiteUrl,
        phone,
        _updatedAt,
        userId,
      ] = params;
      const profile = this.profiles.find((item) => item.user_id === Number(userId));
      if (!profile) {
        return { changes: 0, lastRowId: null };
      }

      profile.full_name = String(fullName);
      profile.bio = bio == null ? null : String(bio);
      profile.location = location == null ? null : String(location);
      profile.profile_image_url =
        profileImageUrl == null ? null : String(profileImageUrl);
      profile.linkedin_url = linkedinUrl == null ? null : String(linkedinUrl);
      profile.instagram_url = instagramUrl == null ? null : String(instagramUrl);
      profile.facebook_url = facebookUrl == null ? null : String(facebookUrl);
      profile.website_url = websiteUrl == null ? null : String(websiteUrl);
      profile.phone = phone == null ? null : String(phone);
      return { changes: 1, lastRowId: null };
    }

    if (sql.includes("DELETE FROM educations WHERE user_id = ?")) {
      const userId = Number(params[0]);
      this.educations = this.educations.filter((item) => item.user_id !== userId);
      return { changes: 1, lastRowId: null };
    }

    if (sql.includes("DELETE FROM experiences WHERE user_id = ?")) {
      const userId = Number(params[0]);
      this.experiences = this.experiences.filter((item) => item.user_id !== userId);
      return { changes: 1, lastRowId: null };
    }

    if (sql.includes("DELETE FROM mentor_skills WHERE mentor_id = ?")) {
      const userId = Number(params[0]);
      this.mentorSkills = this.mentorSkills.filter((item) => item.mentor_id !== userId);
      return { changes: 1, lastRowId: null };
    }

    if (sql.includes("INSERT INTO educations")) {
      const [
        userId,
        university,
        degree,
        major,
        startYear,
        endYear,
        status,
        logoUrl,
        description,
      ] = params;
      this.educations.push({
        id: this.nextEducationId++,
        user_id: Number(userId),
        university: String(university),
        degree: String(degree),
        major: String(major),
        start_year: Number(startYear),
        end_year: endYear == null ? null : Number(endYear),
        status: status as EducationRow["status"],
        logo_url: logoUrl == null ? null : String(logoUrl),
        description: description == null ? null : String(description),
      });

      return { changes: 1, lastRowId: null };
    }

    if (sql.includes("INSERT INTO experiences")) {
      const [
        userId,
        company,
        position,
        industry,
        expertiseJson,
        startYear,
        endYear,
        status,
        description,
      ] = params;
      this.experiences.push({
        id: this.nextExperienceId++,
        user_id: Number(userId),
        company: String(company),
        position: String(position),
        industry: industry == null ? null : String(industry),
        expertise_json: String(expertiseJson),
        start_year: Number(startYear),
        end_year: endYear == null ? null : Number(endYear),
        status: status as ExperienceRow["status"],
        description: description == null ? null : String(description),
      });

      return { changes: 1, lastRowId: null };
    }

    if (sql.includes("INSERT INTO mentor_skills")) {
      const [mentorId, skillName] = params;
      this.mentorSkills.push({
        mentor_id: Number(mentorId),
        skill_name: String(skillName),
      });
      return { changes: 1, lastRowId: null };
    }

    if (sql.includes("DELETE FROM availability_slots WHERE mentor_id = ?")) {
      return { changes: 0, lastRowId: null };
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

  it("allows mentor applications without a supporting document link", async () => {
    const db = new ProfileTestDatabase();

    await submitMentorRequest(db, 1, {
      documentUrl: null,
      note: "Ready to help with interviews.",
    });

    await expect(listMentorRequests(db)).resolves.toMatchObject([
      {
        documentUrl: null,
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

    await expect(toggleRole(db, 1, { role: "mentor" })).resolves.toEqual({
      role: "mentor",
    });
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

  it("lets a user withdraw a pending mentor application", async () => {
    const db = new ProfileTestDatabase();

    await submitMentorRequest(db, 1, {
      documentUrl: "https://example.com/first.pdf",
      note: "First version",
    });

    await expect(withdrawMentorRequest(db, 1)).resolves.toEqual({ ok: true });

    await expect(listMentorRequests(db)).resolves.toMatchObject([
      {
        status: "withdrawn",
      },
    ]);
  });

  it("allows resubmission after a mentor application was withdrawn", async () => {
    const db = new ProfileTestDatabase();

    await submitMentorRequest(db, 1, {
      documentUrl: "https://example.com/first.pdf",
      note: "First version",
    });
    await withdrawMentorRequest(db, 1);
    await submitMentorRequest(db, 1, {
      documentUrl: "https://example.com/second.pdf",
      note: "Second version",
    });

    await expect(listMentorRequests(db)).resolves.toMatchObject([
      {
        status: "withdrawn",
      },
      {
        documentUrl: "https://example.com/second.pdf",
        status: "pending",
      },
    ]);
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

  it("lets admins revoke an approved mentor back to mentee mode", async () => {
    const db = new ProfileTestDatabase();

    await submitMentorRequest(db, 1, {
      documentUrl: "https://example.com/cv.pdf",
      note: "Ready to help with interviews.",
    });
    await reviewMentorRequest(db, 1, { status: "approved" });

    await expect(revokeMentorApproval(db, 1)).resolves.toEqual({ ok: true });

    await expect(toggleRole(db, 1, { role: "mentor" })).rejects.toMatchObject({
      status: 403,
      code: "mentor_approval_required",
    });
  });

  it("lists every user for admin management with their current role", async () => {
    const db = new ProfileTestDatabase();

    await expect(listUsersForAdmin(db)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 2,
          role: "admin",
          fullName: "Admin User",
        }),
        expect.objectContaining({
          id: 3,
          role: "mentor",
          isMentorApproved: true,
          mentorSkills: ["Leadership", "Architecture"],
        }),
        expect.objectContaining({
          id: 1,
          role: "mentee",
          isMentorApproved: false,
        }),
      ]),
    );
  });

  it("lets admins directly promote a mentee into mentor mode", async () => {
    const db = new ProfileTestDatabase();

    await expect(approveUserAsMentor(db, 1)).resolves.toEqual({ ok: true });

    await expect(toggleRole(db, 1, { role: "mentor" })).resolves.toEqual({
      role: "mentor",
    });
  });

  it("lets admins update another user's public profile fields", async () => {
    const db = new ProfileTestDatabase();

    await expect(
      adminUpdateUser(db, 1, {
        fullName: "Ada Updated",
        bio: "Updated by admin",
        location: "Beijing",
        phone: "12345",
        profileImageUrl: null,
        linkedinUrl: "linkedin.com/in/ada",
        instagramUrl: null,
        facebookUrl: null,
        websiteUrl: "ada.dev",
        mentorSkills: ["Strategy"],
        educations: [],
        experiences: [],
      }),
    ).resolves.toMatchObject({
      email: "mentor@example.com",
      profile: {
        fullName: "Ada Updated",
        bio: "Updated by admin",
        location: "Beijing",
        mentorSkills: ["Strategy"],
      },
    });
  });
});
