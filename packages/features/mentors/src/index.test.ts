import { describe, expect, it } from "vitest";
import type { DatabaseClient, QueryParams, QueryResult } from "@mentormatch/db";
import { listApprovedMentorsForAdmin } from "./index";

type MentorCardRow = {
  id: number;
  full_name: string;
  profile_image_url: string | null;
  location: string | null;
  latest_position: string | null;
  latest_company: string | null;
  latest_expertise_json: string | null;
  skill_names: string | null;
};

class MentorTestDatabase implements DatabaseClient {
  async get<T>(): Promise<T | null> {
    throw new Error("Unexpected get query");
  }

  async all<T>(sql: string, params: QueryParams = []): Promise<T[]> {
    if (
      sql.includes("FROM users u") &&
      sql.includes("u.role = 'mentor'") &&
      !sql.includes("(? = '' OR")
    ) {
      const limit = Number(params[0]);

      expect(limit).toBe(200);

      const rows: MentorCardRow[] = [
        {
          id: 7,
          full_name: "Ada Mentor",
          profile_image_url: null,
          location: "Shanghai",
          latest_position: "Staff Engineer",
          latest_company: "MentorMatch",
          latest_expertise_json: JSON.stringify(["Systems Design", "Leadership"]),
          skill_names: "Career Planning,Interview Prep",
        },
      ];

      return rows as T[];
    }

    throw new Error(`Unexpected all query: ${sql}`);
  }

  async run(): Promise<QueryResult> {
    throw new Error("Unexpected run query");
  }
}

describe("feature-mentors", () => {
  it("lists approved mentors for admin management without public search limits", async () => {
    const db = new MentorTestDatabase();

    await expect(listApprovedMentorsForAdmin(db, 200)).resolves.toEqual([
      {
        id: 7,
        fullName: "Ada Mentor",
        profileImageUrl: expect.any(String),
        location: "Shanghai",
        position: "Staff Engineer",
        company: "MentorMatch",
        mentorSkills: ["Career Planning", "Interview Prep"],
        expertise: ["Systems Design", "Leadership"],
      },
    ]);
  });
});
