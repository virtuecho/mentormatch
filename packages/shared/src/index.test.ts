import { describe, expect, it } from "vitest";
import {
  availabilityCreateSchema,
  formatLabel,
  formatDateTimeLocalInTimeZone,
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

  it("formats enum-style labels for display", () => {
    expect(formatLabel("accepted")).toBe("Accepted");
    expect(formatLabel("mentor")).toBe("Mentor");
    expect(formatLabel("on_going")).toBe("Ongoing");
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

  it("allows mentor applications without a supporting document link", () => {
    const payload = mentorRequestSchema.parse({
      documentUrl: "",
      note: "Ready to mentor",
    });

    expect(payload.documentUrl).toBeNull();
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

  it("formats ISO timestamps back into datetime-local values for a given zone", () => {
    expect(
      formatDateTimeLocalInTimeZone(
        "2026-01-15T01:30:00.000Z",
        "Asia/Shanghai",
      ),
    ).toBe("2026-01-15T09:30");
  });

  it("validates time zone identifiers before converting them", () => {
    expect(isValidTimeZone("Asia/Shanghai")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
    expect(
      serializeZonedDateTime("2026-01-15T09:30", "Mars/Olympus_Mons"),
    ).toBeNull();
  });

  it("requires preset agenda slots to include a preset topic", () => {
    expect(() =>
      availabilityCreateSchema.parse({
        title: "Career clinic",
        startTime: "2026-04-01T01:30:00.000Z",
        durationMins: 60,
        locationType: "online",
        city: "Shanghai",
        address: "https://meet.google.com/demo",
        maxParticipants: 1,
        note: null,
        bookingMode: "preset",
        presetTopic: null,
        presetDescription: "We review one blocker together.",
      }),
    ).toThrowError(/preset sessions/i);
  });

  it("uses a clear validation message for max participants", () => {
    expect(() =>
      availabilityCreateSchema.parse({
        title: "Career clinic",
        startTime: "2026-04-01T01:30:00.000Z",
        durationMins: 60,
        locationType: "online",
        city: "Shanghai",
        address: "https://meet.google.com/demo",
        maxParticipants: 21,
        note: null,
        bookingMode: "open",
        presetTopic: null,
        presetDescription: null,
      }),
    ).toThrowError(/20 or fewer/i);
  });
});
