import type { DatabaseClient } from "@mentormatch/db";
import {
  AppError,
  availabilityCreateSchema,
  ensureAvatar,
  serializeLocalDateTime,
  serializeZonedDateTime,
} from "@mentormatch/shared";

export const AVAILABILITY_REPEAT_RULES = [
  "once",
  "daily",
  "weekdays",
  "weekly",
  "biweekly",
  "monthly",
] as const;

export type AvailabilityRepeatRule = (typeof AVAILABILITY_REPEAT_RULES)[number];

type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

type AvailabilitySeriesInput = {
  title?: string | null;
  bookingMode?: string | null;
  presetTopic?: string | null;
  presetDescription?: string | null;
  startTimeLocal?: string | null;
  timeZone?: string | null;
  timezoneOffsetMinutes?: number | string | null;
  repeatRule?: string | null;
  repeatCount?: number | string | null;
  durationMins?: number | string | null;
  locationType?: string | null;
  city?: string | null;
  address?: string | null;
  maxParticipants?: number | string | null;
  note?: string | null;
};

type AvailabilityUpdateInput = Omit<
  AvailabilitySeriesInput,
  "repeatRule" | "repeatCount"
>;

type AvailabilityRow = {
  id: number;
  title: string | null;
  booking_mode: "open" | "preset";
  preset_topic: string | null;
  preset_description: string | null;
  start_time: string;
  duration_mins: number;
  location_type: string;
  city: string;
  address: string;
  max_participants: number;
  note: string | null;
  is_booked: number | boolean;
  current_booking_id: number | null;
  current_booking_status: "accepted" | "completed" | null;
};

type AdminAvailabilityRow = {
  id: number;
  mentor_id: number;
  title: string | null;
  booking_mode: "open" | "preset";
  preset_topic: string | null;
  preset_description: string | null;
  start_time: string;
  duration_mins: number;
  location_type: string;
  city: string;
  address: string;
  max_participants: number;
  note: string | null;
  mentor_email: string;
  mentor_full_name: string;
  mentor_profile_image_url: string | null;
  pending_request_count: number;
  accepted_request_count: number;
};

type MentorAvailabilityRow = {
  id: number;
  title: string | null;
  booking_mode: "open" | "preset";
  preset_topic: string | null;
  preset_description: string | null;
  start_time: string;
  duration_mins: number;
  location_type: string;
  city: string;
  address: string;
  max_participants: number;
  note: string | null;
  is_booked: number | boolean;
};

export type HostedAvailabilitySlot = {
  id: number;
  title: string | null;
  bookingMode: "open" | "preset";
  presetTopic: string | null;
  presetDescription: string | null;
  startTime: string;
  durationMins: number;
  locationType: string;
  city: string;
  address: string;
  maxParticipants: number;
  note: string | null;
  isBooked: boolean;
  currentBookingId: number | null;
  bookingStatus: "accepted" | "completed" | null;
};

function parseRepeatRule(
  value: string | null | undefined,
): AvailabilityRepeatRule {
  const normalized = value?.trim() ?? "";
  return normalized === "daily" ||
    normalized === "weekdays" ||
    normalized === "weekly" ||
    normalized === "biweekly" ||
    normalized === "monthly"
    ? normalized
    : "once";
}

function parseLocalDateTime(value: string): LocalDateTimeParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  };
}

function formatLocalDateTime(parts: LocalDateTimeParts) {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(
    2,
    "0",
  )}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(
    2,
    "0",
  )}:${String(parts.minute).padStart(2, "0")}`;
}

function addDays(
  parts: LocalDateTimeParts,
  daysToAdd: number,
): LocalDateTimeParts {
  const next = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day + daysToAdd,
      parts.hour,
      parts.minute,
    ),
  );

  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
    hour: next.getUTCHours(),
    minute: next.getUTCMinutes(),
  };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addMonths(
  parts: LocalDateTimeParts,
  monthsToAdd: number,
): LocalDateTimeParts {
  const monthIndex = parts.month - 1 + monthsToAdd;
  const year = parts.year + Math.floor(monthIndex / 12);
  const month = (((monthIndex % 12) + 12) % 12) + 1;
  const day = Math.min(parts.day, daysInMonth(year, month));

  return {
    year,
    month,
    day,
    hour: parts.hour,
    minute: parts.minute,
  };
}

function isWeekend(parts: LocalDateTimeParts) {
  const dayOfWeek = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day),
  ).getUTCDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function buildRecurringLocalStartTimes(
  startTimeLocal: string,
  repeatRule: AvailabilityRepeatRule,
  repeatCount: number,
) {
  const first = parseLocalDateTime(startTimeLocal);

  if (!first) {
    return [];
  }

  const occurrences = [first];

  while (occurrences.length < repeatCount) {
    const previous = occurrences.at(-1);
    if (!previous) {
      break;
    }
    let next: LocalDateTimeParts;

    switch (repeatRule) {
      case "daily":
        next = addDays(previous, 1);
        break;
      case "weekdays":
        next = addDays(previous, 1);
        while (isWeekend(next)) {
          next = addDays(next, 1);
        }
        break;
      case "weekly":
        next = addDays(previous, 7);
        break;
      case "biweekly":
        next = addDays(previous, 14);
        break;
      case "monthly":
        next = addMonths(previous, 1);
        break;
      default:
        return [formatLocalDateTime(first)];
    }

    occurrences.push(next);
  }

  return occurrences.map(formatLocalDateTime);
}

function resolveStartTime(
  startTimeLocal: string | null | undefined,
  timeZone: string | null | undefined,
  timezoneOffsetMinutes: number | string | null | undefined,
) {
  if (!startTimeLocal?.trim()) {
    return "";
  }

  const numericOffset =
    typeof timezoneOffsetMinutes === "string" && timezoneOffsetMinutes.trim()
      ? Number(timezoneOffsetMinutes)
      : typeof timezoneOffsetMinutes === "number"
        ? timezoneOffsetMinutes
        : Number.NaN;

  return (
    serializeZonedDateTime(startTimeLocal, timeZone) ||
    serializeLocalDateTime(startTimeLocal, numericOffset) ||
    ""
  );
}

function buildAvailabilityPayload(
  input: AvailabilitySeriesInput,
  startTime: string,
) {
  return {
    title: input.title?.trim() || "Mentorship Session",
    bookingMode: input.bookingMode?.trim() === "preset" ? "preset" : "open",
    presetTopic: input.presetTopic?.trim() || null,
    presetDescription: input.presetDescription?.trim() || null,
    startTime,
    durationMins:
      typeof input.durationMins === "string"
        ? Number(input.durationMins)
        : input.durationMins,
    locationType: input.locationType?.trim() || "in_person",
    city: input.city?.trim() ?? "",
    address: input.address?.trim() ?? "",
    maxParticipants:
      typeof input.maxParticipants === "string"
        ? Number(input.maxParticipants)
        : (input.maxParticipants ?? 2),
    note: input.note?.trim() || null,
  };
}

function mapHostedAvailability(slot: AvailabilityRow): HostedAvailabilitySlot {
  return {
    id: slot.id,
    title: slot.title,
    bookingMode: slot.booking_mode,
    presetTopic: slot.preset_topic,
    presetDescription: slot.preset_description,
    startTime: slot.start_time,
    durationMins: slot.duration_mins,
    locationType: slot.location_type,
    city: slot.city,
    address: slot.address,
    maxParticipants: slot.max_participants,
    note: slot.note,
    isBooked: Boolean(slot.is_booked),
    currentBookingId: slot.current_booking_id
      ? Number(slot.current_booking_id)
      : null,
    bookingStatus: slot.current_booking_status,
  };
}

function getConstraintMessage(error: unknown) {
  return error instanceof Error ? error.message.toLowerCase() : "";
}

function normalizeAvailabilityWriteError(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }

  const message = getConstraintMessage(error);

  if (
    message.includes(
      "unique constraint failed: availability_slots.mentor_id, availability_slots.start_time",
    )
  ) {
    throw new AppError(
      409,
      "duplicate_availability_slot",
      "You already have a slot at one of the selected times.",
    );
  }

  throw error;
}

export async function createAvailabilitySlot(
  db: DatabaseClient,
  mentorId: number,
  input: unknown,
) {
  const payload = availabilityCreateSchema.parse(input);
  const now = new Date().toISOString();
  try {
    const slotInsert = await db.run(
      `
        INSERT INTO availability_slots (
          mentor_id, title, booking_mode, preset_topic, preset_description, start_time,
          duration_mins, location_type, city, address, max_participants, note,
          is_booked, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `,
      [
        mentorId,
        payload.title,
        payload.bookingMode,
        payload.presetTopic ?? null,
        payload.presetDescription ?? null,
        payload.startTime,
        payload.durationMins,
        payload.locationType,
        payload.city,
        payload.address,
        payload.maxParticipants,
        payload.note ?? null,
        now,
        now,
      ],
    );

    return getAvailabilityById(db, slotInsert.lastRowId ?? 0, mentorId);
  } catch (error) {
    normalizeAvailabilityWriteError(error);
  }
}

export async function updateAvailabilitySlot(
  db: DatabaseClient,
  mentorId: number,
  slotId: number,
  input: unknown,
) {
  const payload = availabilityCreateSchema.parse(input);
  const now = new Date().toISOString();
  try {
    const result = await db.run(
      `
        UPDATE availability_slots
        SET
          title = ?,
          booking_mode = ?,
          preset_topic = ?,
          preset_description = ?,
          start_time = ?,
          duration_mins = ?,
          location_type = ?,
          city = ?,
          address = ?,
          max_participants = ?,
          note = ?,
          updated_at = ?
        WHERE id = ? AND mentor_id = ?
          AND NOT EXISTS (
            SELECT 1
            FROM bookings b
            WHERE b.availability_slot_id = availability_slots.id
              AND b.status IN ('pending', 'accepted')
          )
      `,
      [
        payload.title,
        payload.bookingMode,
        payload.presetTopic ?? null,
        payload.presetDescription ?? null,
        payload.startTime,
        payload.durationMins,
        payload.locationType,
        payload.city,
        payload.address,
        payload.maxParticipants,
        payload.note ?? null,
        now,
        slotId,
        mentorId,
      ],
    );

    if (result.changes !== 1) {
      const slot = await db.get<{ id: number }>(
        "SELECT id FROM availability_slots WHERE id = ? AND mentor_id = ? LIMIT 1",
        [slotId, mentorId],
      );

      if (!slot) {
        throw new AppError(
          404,
          "availability_not_found",
          "Availability slot not found",
        );
      }

      throw new AppError(
        409,
        "active_booking_exists",
        "Resolve pending or accepted requests before editing this session.",
      );
    }

    return getAvailabilityById(db, slotId, mentorId);
  } catch (error) {
    normalizeAvailabilityWriteError(error);
  }
}

export async function getMyAvailability(db: DatabaseClient, mentorId: number) {
  return db.all<AvailabilityRow>(
    `
			SELECT
				id,
				title,
				booking_mode,
				preset_topic,
				preset_description,
				start_time,
				duration_mins,
				location_type,
				city,
				address,
				max_participants,
				note,
				EXISTS (
					SELECT 1
					FROM bookings b
					WHERE b.availability_slot_id = availability_slots.id
						AND b.status = 'accepted'
				) AS is_booked,
				(
					SELECT b.id
					FROM bookings b
					WHERE b.availability_slot_id = availability_slots.id
						AND b.status IN ('accepted', 'completed')
					ORDER BY
						CASE b.status
							WHEN 'accepted' THEN 0
							ELSE 1
						END,
						b.updated_at DESC
					LIMIT 1
				) AS current_booking_id,
				(
					SELECT b.status
					FROM bookings b
					WHERE b.availability_slot_id = availability_slots.id
						AND b.status IN ('accepted', 'completed')
					ORDER BY
						CASE b.status
							WHEN 'accepted' THEN 0
							ELSE 1
						END,
						b.updated_at DESC
					LIMIT 1
				) AS current_booking_status
			FROM availability_slots
			WHERE mentor_id = ? AND start_time >= ?
			ORDER BY start_time ASC
		`,
    [mentorId, new Date().toISOString()],
  );
}

export async function getHostedAvailability(
  db: DatabaseClient,
  mentorId: number,
): Promise<HostedAvailabilitySlot[]> {
  const rows = await getMyAvailability(db, mentorId);
  return rows.map(mapHostedAvailability);
}

export async function listAllAvailabilitySlots(
  db: DatabaseClient,
  input: { mentorId?: number | null } = {},
) {
  const filters = [new Date().toISOString()] as Array<string | number>;
  let mentorFilterSql = "";

  if (typeof input.mentorId === "number" && Number.isFinite(input.mentorId)) {
    mentorFilterSql = " AND s.mentor_id = ?";
    filters.push(input.mentorId);
  }

  const slots = await db.all<AdminAvailabilityRow>(
    `
			SELECT
				s.id,
				s.mentor_id,
				s.title,
				s.booking_mode,
				s.preset_topic,
				s.preset_description,
				s.start_time,
				s.duration_mins,
				s.location_type,
				s.city,
				s.address,
				s.max_participants,
					s.note,
					u.email AS mentor_email,
				p.full_name AS mentor_full_name,
				p.profile_image_url AS mentor_profile_image_url,
				(
					SELECT COUNT(*)
					FROM bookings b
					WHERE b.availability_slot_id = s.id AND b.status = 'pending'
				) AS pending_request_count,
				(
					SELECT COUNT(*)
					FROM bookings b
					WHERE b.availability_slot_id = s.id AND b.status = 'accepted'
				) AS accepted_request_count
			FROM availability_slots s
			JOIN users u ON u.id = s.mentor_id
			JOIN profiles p ON p.user_id = u.id
			WHERE s.start_time >= ?${mentorFilterSql}
			ORDER BY s.start_time ASC
		`,
    filters,
  );

  return slots.map((slot) => ({
    id: slot.id,
    title: slot.title,
    startTime: slot.start_time,
    durationMins: slot.duration_mins,
    locationType: slot.location_type,
    city: slot.city,
    address: slot.address,
    maxParticipants: slot.max_participants,
    note: slot.note,
    isBooked: Number(slot.accepted_request_count ?? 0) > 0,
    bookingMode: slot.booking_mode,
    presetTopic: slot.preset_topic,
    presetDescription: slot.preset_description,
    pendingRequestCount: Number(slot.pending_request_count ?? 0),
    acceptedRequestCount: Number(slot.accepted_request_count ?? 0),
    mentor: {
      id: Number(slot.mentor_id),
      email: slot.mentor_email,
      fullName: slot.mentor_full_name,
      profileImageUrl: ensureAvatar(slot.mentor_profile_image_url),
    },
  }));
}

export async function getMentorAvailability(
  db: DatabaseClient,
  mentorId: number,
  currentUserId: number | null,
) {
  const slots = await db.all<MentorAvailabilityRow>(
    `
			SELECT
				id,
				title,
				booking_mode,
				preset_topic,
				preset_description,
					start_time,
					duration_mins,
					location_type,
					city,
					address,
					max_participants,
					note,
					EXISTS (
						SELECT 1
						FROM bookings b
						WHERE b.availability_slot_id = availability_slots.id
							AND b.status = 'accepted'
					) AS is_booked
				FROM availability_slots
				WHERE mentor_id = ? AND start_time >= ?
					AND NOT EXISTS (
						SELECT 1
						FROM bookings b
						WHERE b.availability_slot_id = availability_slots.id
							AND b.status = 'accepted'
					)
			ORDER BY start_time ASC
		`,
    [mentorId, new Date().toISOString()],
  );

  if (!currentUserId) {
    return slots.map((slot) => ({
      id: slot.id,
      title: slot.title,
      startTime: slot.start_time,
      durationMins: slot.duration_mins,
      locationType: slot.location_type,
      city: slot.city,
      address: slot.address,
      maxParticipants: slot.max_participants,
      note: slot.note,
      isBooked: Boolean(slot.is_booked),
      bookingMode: slot.booking_mode,
      presetTopic: slot.preset_topic,
      presetDescription: slot.preset_description,
      isRequested: false,
    }));
  }

  const requestedRows = await db.all<{ availability_slot_id: number }>(
    `
			SELECT availability_slot_id
			FROM bookings
			WHERE mentee_id = ? AND status IN ('pending', 'accepted')
		`,
    [currentUserId],
  );

  const requested = new Set(
    requestedRows.map((row) => Number(row.availability_slot_id)),
  );

  return slots.map((slot) => ({
    id: slot.id,
    title: slot.title,
    startTime: slot.start_time,
    durationMins: slot.duration_mins,
    locationType: slot.location_type,
    city: slot.city,
    address: slot.address,
    maxParticipants: slot.max_participants,
    note: slot.note,
    isBooked: Boolean(slot.is_booked),
    bookingMode: slot.booking_mode,
    presetTopic: slot.preset_topic,
    presetDescription: slot.preset_description,
    isRequested: requested.has(slot.id),
  }));
}

export async function deleteAvailabilitySlot(
  db: DatabaseClient,
  mentorId: number,
  slotId: number,
) {
  const result = await db.run(
    `
      DELETE FROM availability_slots
      WHERE id = ? AND mentor_id = ?
        AND NOT EXISTS (
          SELECT 1
          FROM bookings b
          WHERE b.availability_slot_id = availability_slots.id
            AND b.status = 'accepted'
        )
    `,
    [slotId, mentorId],
  );

  if (result.changes !== 1) {
    const slot = await db.get<{ id: number }>(
      "SELECT id FROM availability_slots WHERE id = ? AND mentor_id = ? LIMIT 1",
      [slotId, mentorId],
    );

    if (!slot) {
      throw new AppError(
        404,
        "availability_not_found",
        "Availability slot not found",
      );
    }

    throw new AppError(
      400,
      "accepted_booking_exists",
      "Cannot delete slot while there is an accepted booking. Cancel the booking first.",
    );
  }

  return { ok: true };
}

export async function createAvailabilitySeries(
  db: DatabaseClient,
  mentorId: number,
  input: AvailabilitySeriesInput,
) {
  const repeatRule = parseRepeatRule(input.repeatRule);
  const rawRepeatCount =
    typeof input.repeatCount === "string"
      ? Number(input.repeatCount)
      : input.repeatCount;
  const repeatCount =
    repeatRule !== "once" && Number.isFinite(rawRepeatCount)
      ? Math.min(Math.max(Math.trunc(rawRepeatCount ?? 1), 2), 30)
      : 1;
  const localStartTimes = buildRecurringLocalStartTimes(
    input.startTimeLocal?.trim() ?? "",
    repeatRule,
    repeatCount,
  );
  const startTimes = localStartTimes.map((localStartTime) =>
    resolveStartTime(
      localStartTime,
      input.timeZone,
      input.timezoneOffsetMinutes,
    ),
  );

  if (
    startTimes.length !== repeatCount ||
    startTimes.some((startTime) => !startTime)
  ) {
    throw new AppError(
      400,
      "invalid_availability_start_time",
      "Please choose a valid start time and time zone",
    );
  }

  try {
    const now = new Date().toISOString();
    await db.batch(
      startTimes.map((startTime) => {
        const payload = buildAvailabilityPayload(input, startTime);

        return {
          sql: `
            INSERT INTO availability_slots (
              mentor_id, title, booking_mode, preset_topic, preset_description, start_time,
              duration_mins, location_type, city, address, max_participants, note,
              is_booked, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
          `,
          params: [
            mentorId,
            payload.title,
            payload.bookingMode,
            payload.presetTopic ?? null,
            payload.presetDescription ?? null,
            payload.startTime,
            payload.durationMins,
            payload.locationType,
            payload.city,
            payload.address,
            payload.maxParticipants,
            payload.note ?? null,
            now,
            now,
          ],
        };
      }),
    );

    return { count: startTimes.length };
  } catch (error) {
    normalizeAvailabilityWriteError(error);
  }
}

export async function updateAvailabilitySlotFromLocalInput(
  db: DatabaseClient,
  mentorId: number,
  slotId: number,
  input: AvailabilityUpdateInput,
) {
  const startTime = resolveStartTime(
    input.startTimeLocal,
    input.timeZone,
    input.timezoneOffsetMinutes,
  );

  if (!startTime) {
    throw new AppError(
      400,
      "invalid_availability_start_time",
      "Please choose a valid start time and time zone",
    );
  }

  return updateAvailabilitySlot(
    db,
    mentorId,
    slotId,
    buildAvailabilityPayload(input, startTime),
  );
}

export async function adminDeleteAvailabilitySlot(
  db: DatabaseClient,
  slotId: number,
) {
  const slot = await db.get<{ id: number }>(
    "SELECT id FROM availability_slots WHERE id = ? LIMIT 1",
    [slotId],
  );

  if (!slot) {
    throw new AppError(
      404,
      "availability_not_found",
      "Availability slot not found",
    );
  }

  await db.run("DELETE FROM availability_slots WHERE id = ?", [slotId]);

  return { ok: true };
}

async function getAvailabilityById(
  db: DatabaseClient,
  slotId: number,
  mentorId: number,
) {
  const slot = await db.get(
    `
			SELECT
				id,
				title,
				booking_mode,
				preset_topic,
				preset_description,
				start_time,
				duration_mins,
				location_type,
				city,
				address,
				max_participants,
				note,
				EXISTS (
					SELECT 1
					FROM bookings b
					WHERE b.availability_slot_id = availability_slots.id
						AND b.status = 'accepted'
				) AS is_booked
			FROM availability_slots
			WHERE id = ? AND mentor_id = ?
			LIMIT 1
		`,
    [slotId, mentorId],
  );

  if (!slot) {
    throw new AppError(
      404,
      "availability_not_found",
      "Availability slot not found",
    );
  }

  return slot;
}
