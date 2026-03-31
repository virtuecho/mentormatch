import { describe, expect, it } from "vitest";
import {
  isValidTimeZone,
  mentorRequestSchema,
  normalizeHttpUrl,
  profileUpdateSchema,
  serializeLocalDateTime,
  serializeZonedDateTime,
} from "./index";

describe("shared helpers", () => {
  it("normalizes bare domains into https URLs", () => {
    expect(normalizeHttpUrl("linkedin.com/in/ada")).toBe(
      "https://linkedin.com/in/ada",
    );
    expect(normalizeHttpUrl("https://example.com/profile")).toBe(
      "https://example.com/profile",
    );
    expect(normalizeHttpUrl("")).toBeNull();
  });

  it("normalizes optional profile links during schema parsing", () => {
    const payload = profileUpdateSchema.parse({
      fullName: "Ada Lovelace",
      bio: null,
      location: null,
      phone: null,
      profileImageUrl: "images.example.com/ada.png",
      linkedinUrl: "linkedin.com/in/ada",
      instagramUrl: "instagram.com/ada",
      facebookUrl: "facebook.com/ada",
      websiteUrl: "ada.example.com",
      educations: [],
      experiences: [],
      mentorSkills: [],
    });

    expect(payload).toMatchObject({
      profileImageUrl: "https://images.example.com/ada.png",
      linkedinUrl: "https://linkedin.com/in/ada",
      instagramUrl: "https://instagram.com/ada",
      facebookUrl: "https://facebook.com/ada",
      websiteUrl: "https://ada.example.com",
    });
  });

  it("normalizes mentor application document links", () => {
    const payload = mentorRequestSchema.parse({
      documentUrl: "docs.example.com/mentor-resume.pdf",
      note: "Ready to mentor",
    });

    expect(payload.documentUrl).toBe(
      "https://docs.example.com/mentor-resume.pdf",
    );
  });

  it("keeps rejecting malformed links after normalization", () => {
    expect(() =>
      profileUpdateSchema.parse({
        fullName: "Ada Lovelace",
        bio: null,
        location: null,
        phone: null,
        profileImageUrl: "not a valid link",
        linkedinUrl: null,
        instagramUrl: null,
        facebookUrl: null,
        websiteUrl: null,
        educations: [],
        experiences: [],
        mentorSkills: [],
      }),
    ).toThrowError(/valid url/i);
  });

  it("serializes local date-time input into UTC ISO strings", () => {
    expect(serializeLocalDateTime("2026-03-31T09:30", 480)).toBe(
      "2026-03-31T17:30:00.000Z",
    );
    expect(serializeLocalDateTime("2026-03-31T09:30", -660)).toBe(
      "2026-03-30T22:30:00.000Z",
    );
  });

  it("serializes date-time input using an explicit IANA time zone", () => {
    expect(serializeZonedDateTime("2026-01-15T09:30", "Asia/Shanghai")).toBe(
      "2026-01-15T01:30:00.000Z",
    );
    expect(
      serializeZonedDateTime("2026-01-15T09:30", "America/Los_Angeles"),
    ).toBe("2026-01-15T17:30:00.000Z");
  });

  it("validates time zone identifiers before converting them", () => {
    expect(isValidTimeZone("Asia/Shanghai")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
    expect(
      serializeZonedDateTime("2026-01-15T09:30", "Mars/Olympus_Mons"),
    ).toBeNull();
  });
});
