import { z } from "zod";

export const APP_NAME = "MentorMatch";
export const DEFAULT_AVATAR =
  "https://ui-avatars.com/api/?name=MentorMatch&background=0F172A&color=F8FAFC";

export const USER_ROLES = ["mentee", "mentor", "admin"] as const;
export const REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
] as const;
export const BOOKING_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "cancelled",
  "completed",
] as const;
export const SLOT_BOOKING_MODES = ["open", "preset"] as const;
export const LOCATION_TYPES = ["online", "in_person"] as const;
export const RECORD_STATUSES = ["completed", "on_going"] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type SlotBookingMode = (typeof SLOT_BOOKING_MODES)[number];
export type LocationType = (typeof LOCATION_TYPES)[number];
export type RecordStatus = (typeof RECORD_STATUSES)[number];

export interface SessionUser {
  id: number;
  email: string;
  role: UserRole;
  isMentorApproved: boolean;
  fullName: string;
  profileImageUrl: string;
}

export interface EducationRecord {
  id?: number;
  university: string;
  degree: string;
  major: string;
  startYear: number;
  endYear: number | null;
  status: RecordStatus;
  logoUrl: string | null;
  description: string | null;
}

export interface ExperienceRecord {
  id?: number;
  company: string;
  position: string;
  industry: string | null;
  expertise: string[];
  startYear: number;
  endYear: number | null;
  status: RecordStatus;
  description: string | null;
}

export interface MentorCard {
  id: number;
  fullName: string;
  profileImageUrl: string;
  headline: string;
  company: string;
  location: string | null;
  skills: string[];
}

export interface MentorProfile {
  id: number;
  fullName: string;
  profileImageUrl: string;
  bio: string | null;
  location: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  skills: string[];
  educations: EducationRecord[];
  experiences: ExperienceRecord[];
}

export interface AvailabilitySlotRecord {
  id: number;
  mentorId: number;
  title: string | null;
  startTime: string;
  durationMins: number;
  locationType: LocationType;
  city: string;
  address: string;
  maxParticipants: number;
  note: string | null;
  isBooked: boolean;
  isRequested?: boolean;
  bookingMode: SlotBookingMode;
  presetTopic: string | null;
  presetDescription: string | null;
}

export interface BookingRecord {
  id: number;
  topic: string;
  description: string | null;
  note: string | null;
  numParticipants: number;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  slot: AvailabilitySlotRecord | null;
  counterpart: {
    id: number;
    email: string;
    fullName: string;
    profileImageUrl: string;
  };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const optionalNullableString = z
  .string()
  .trim()
  .max(2000)
  .nullable()
  .optional();
const localDateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const httpUrlPattern = /^[a-z][a-z0-9+.-]*:\/\//i;

function getTimeZoneDateParts(timestamp: number, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });

  const values = Object.fromEntries(
    formatter
      .formatToParts(new Date(timestamp))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeHttpUrl(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return httpUrlPattern.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function formatLabel(value: string | null | undefined): string {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

  if (!normalized) {
    return "";
  }

  if (normalized.toLowerCase() === "on going") {
    return "Ongoing";
  }

  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function serializeLocalDateTime(
  value: string | null | undefined,
  timezoneOffsetMinutes: number | null | undefined,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (
    typeof timezoneOffsetMinutes !== "number" ||
    !Number.isFinite(timezoneOffsetMinutes) ||
    timezoneOffsetMinutes < -840 ||
    timezoneOffsetMinutes > 840
  ) {
    return null;
  }

  const parts = localDateTimePattern.exec(trimmed);
  if (!parts) {
    return null;
  }

  const [, year, month, day, hour, minute] = parts;
  const utcTime =
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    ) +
    timezoneOffsetMinutes * 60_000;

  return new Date(utcTime).toISOString();
}

export function isValidTimeZone(value: string | null | undefined): boolean {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value.trim() });
    return true;
  } catch {
    return false;
  }
}

export function serializeZonedDateTime(
  value: string | null | undefined,
  timeZone: string | null | undefined,
): string | null {
  if (typeof value !== "string" || typeof timeZone !== "string") {
    return null;
  }

  const normalizedTimeZone = timeZone.trim();
  if (!isValidTimeZone(normalizedTimeZone)) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parts = localDateTimePattern.exec(trimmed);
  if (!parts) {
    return null;
  }

  const [, year, month, day, hour, minute] = parts;
  const targetParts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  };

  let guess = Date.UTC(
    targetParts.year,
    targetParts.month - 1,
    targetParts.day,
    targetParts.hour,
    targetParts.minute,
  );

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const zonedParts = getTimeZoneDateParts(guess, normalizedTimeZone);
    const targetUtc = Date.UTC(
      targetParts.year,
      targetParts.month - 1,
      targetParts.day,
      targetParts.hour,
      targetParts.minute,
    );
    const zonedUtc = Date.UTC(
      zonedParts.year,
      zonedParts.month - 1,
      zonedParts.day,
      zonedParts.hour,
      zonedParts.minute,
    );
    const diff = targetUtc - zonedUtc;

    guess += diff;

    if (diff === 0) {
      break;
    }
  }

  const resolved = getTimeZoneDateParts(guess, normalizedTimeZone);
  if (
    resolved.year !== targetParts.year ||
    resolved.month !== targetParts.month ||
    resolved.day !== targetParts.day ||
    resolved.hour !== targetParts.hour ||
    resolved.minute !== targetParts.minute
  ) {
    return null;
  }

  return new Date(guess).toISOString();
}

export function formatDateTimeLocalInTimeZone(
  value: string | null | undefined,
  timeZone: string | null | undefined,
): string | null {
  if (typeof value !== "string" || typeof timeZone !== "string") {
    return null;
  }

  const normalizedTimeZone = timeZone.trim();
  if (!normalizedTimeZone || !isValidTimeZone(normalizedTimeZone)) {
    return null;
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  const parts = getTimeZoneDateParts(timestamp, normalizedTimeZone);
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day,
  ).padStart(
    2,
    "0",
  )}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

const httpUrlSchema = z.url().refine((value) => isValidHttpUrl(value), {
  message: "Please enter a valid URL",
});
const optionalRecordString = z.string().trim().max(200).default("");

const optionalUrlSchema = z.preprocess(
  (value) => normalizeHttpUrl(typeof value === "string" ? value : null),
  httpUrlSchema.nullable().optional(),
);

export const educationSchema = z.object({
  id: z.number().int().positive().optional(),
  university: optionalRecordString,
  degree: optionalRecordString,
  major: optionalRecordString,
  startYear: z.number().int().min(1900).max(2100),
  endYear: z.number().int().min(1900).max(2100).nullable().optional(),
  status: z.enum(RECORD_STATUSES).default("on_going"),
  logoUrl: optionalUrlSchema,
  description: optionalNullableString,
});

export const experienceSchema = z.object({
  id: z.number().int().positive().optional(),
  company: optionalRecordString,
  position: optionalRecordString,
  industry: z.string().trim().max(200).nullable().optional(),
  expertise: z.array(z.string().trim().min(1).max(100)).default([]),
  startYear: z.number().int().min(1900).max(2100),
  endYear: z.number().int().min(1900).max(2100).nullable().optional(),
  status: z.enum(RECORD_STATUSES).default("on_going"),
  description: optionalNullableString,
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(1).max(255),
    email: z.email().transform((value) => value.trim().toLowerCase()),
    password: z.string().min(8).max(128),
  })
  .strict();

export const loginSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1).max(128),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(1).max(255),
  bio: optionalNullableString,
  location: z.string().trim().max(255).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  profileImageUrl: optionalUrlSchema,
  linkedinUrl: optionalUrlSchema,
  instagramUrl: optionalUrlSchema,
  facebookUrl: optionalUrlSchema,
  websiteUrl: optionalUrlSchema,
  educations: z.array(educationSchema).default([]),
  experiences: z.array(experienceSchema).default([]),
  mentorSkills: z.array(z.string().trim().min(1).max(100)).default([]),
});

export const profilePatchSchema = z.object({
  fullName: z.string().trim().min(1).max(255).optional(),
  bio: optionalNullableString,
  location: z.string().trim().max(255).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  profileImageUrl: optionalUrlSchema,
  linkedinUrl: optionalUrlSchema,
  instagramUrl: optionalUrlSchema,
  facebookUrl: optionalUrlSchema,
  websiteUrl: optionalUrlSchema,
  educations: z.array(educationSchema).optional(),
  experiences: z.array(experienceSchema).optional(),
  mentorSkills: z.array(z.string().trim().min(1).max(100)).optional(),
});

export const mentorRequestSchema = z.object({
  documentUrl: optionalUrlSchema,
  note: optionalNullableString,
});

export const mentorRequestReviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export const mentorSearchSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  tag: z.string().trim().max(120).optional().default(""),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
});

const adminListPageSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(12),
});

export const adminUserListSchema = adminListPageSchema.extend({
  q: z.string().trim().max(120).optional().default(""),
  role: z.enum(["all", "admin", "mentor", "mentee"]).optional().default("all"),
  sort: z
    .enum(["role_then_name", "name_asc", "name_desc", "newest"])
    .optional()
    .default("role_then_name"),
});

export const adminMentorRequestListSchema = adminListPageSchema.extend({
  q: z.string().trim().max(120).optional().default(""),
  status: z
    .enum(["all", "pending", "approved", "rejected", "withdrawn"])
    .optional()
    .default("all"),
  sort: z
    .enum(["status_then_submitted", "submitted_desc", "submitted_asc"])
    .optional()
    .default("status_then_submitted"),
});

export const adminSlotListSchema = adminListPageSchema.extend({
  q: z.string().trim().max(120).optional().default(""),
  mentorId: z.coerce.number().int().positive().optional(),
  status: z.enum(["all", "open", "booked"]).optional().default("all"),
  sort: z.enum(["start_asc", "start_desc"]).optional().default("start_asc"),
});

export const availabilityCreateSchema = z
  .object({
    title: z.string().trim().max(255).default("Mentorship Session"),
    startTime: z.iso.datetime(),
    durationMins: z.coerce.number().int().min(15).max(480),
    locationType: z.enum(LOCATION_TYPES).default("in_person"),
    city: z.string().trim().min(1).max(120),
    address: z.string().trim().min(1).max(255),
    maxParticipants: z.coerce
      .number()
      .int()
      .min(1, "Max participants must be at least 1")
      .max(20, "Max participants must be 20 or fewer")
      .default(2),
    note: optionalNullableString,
    bookingMode: z.enum(SLOT_BOOKING_MODES).default("open"),
    presetTopic: z.string().trim().max(255).nullable().optional(),
    presetDescription: optionalNullableString,
  })
  .superRefine((value, ctx) => {
    if (value.bookingMode === "preset" && !value.presetTopic) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["presetTopic"],
        message: "Please add a topic for preset sessions",
      });
    }
  });

export const bookingCreateSchema = z.object({
  availabilitySlotId: z.coerce.number().int().positive(),
  topic: z.string().trim().max(255).optional(),
  description: optionalNullableString,
  note: optionalNullableString,
  numParticipants: z.coerce.number().int().min(1).max(20).default(1),
});

export const bookingRespondSchema = z.object({
  response: z.enum(["accepted", "rejected"]),
});

export const bookingListSchema = z.object({
  role: z.enum(["mentee", "mentor"]),
});

export const bookingHistorySchema = z.object({
  role: z.enum(["mentee", "mentor"]),
});

export const mentorModeSchema = z.object({
  role: z.enum(["mentee", "mentor"]).optional(),
});

export class AppError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function ensureAvatar(url: string | null | undefined): string {
  return url?.trim() ? url : DEFAULT_AVATAR;
}

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}
