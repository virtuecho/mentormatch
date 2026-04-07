import type { BatchStatement, DatabaseClient } from "@mentormatch/db";
import {
  AppError,
  bookingCreateSchema,
  bookingRespondSchema,
  ensureAvatar,
} from "@mentormatch/shared";

type BookingSlotRow = {
  id: number;
  mentor_id: number;
  is_booked: number;
  max_participants: number;
  booking_mode: "open" | "preset";
  preset_topic: string | null;
  preset_description: string | null;
  start_time: string;
  duration_mins: number;
};

type PreparedBooking = {
  slot: BookingSlotRow;
  topic: string;
  description: string | null;
  numParticipants: number;
  note: string | null;
};

type BookingRow = {
  id: number;
  topic: string;
  description: string | null;
  note: string | null;
  num_participants: number;
  status: string;
  created_at: string;
  updated_at: string;
  slot_id: number;
  slot_title: string | null;
  start_time: string;
  duration_mins: number;
  location_type: string;
  city: string;
  address: string;
  max_participants: number;
  booking_mode: "open" | "preset";
  preset_topic: string | null;
  preset_description: string | null;
  counterpart_id: number;
  counterpart_name: string;
  counterpart_image: string | null;
  counterpart_email: string;
};

function getEndTimeMs(startTime: string, durationMins: number) {
  return new Date(startTime).getTime() + durationMins * 60_000;
}

function getEffectiveStatus(
  status: string,
  startTime: string,
  durationMins: number,
  now = Date.now(),
) {
  if (status === "accepted" && getEndTimeMs(startTime, durationMins) <= now) {
    return "completed" as const;
  }

  return status;
}

function mapBookingRow(row: BookingRow, now = Date.now()) {
  return {
    id: row.id,
    topic: row.topic,
    description: row.description,
    note: row.note,
    numParticipants: row.num_participants,
    status: getEffectiveStatus(
      row.status,
      row.start_time,
      row.duration_mins,
      now,
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    slot: {
      id: row.slot_id,
      title: row.slot_title,
      startTime: row.start_time,
      durationMins: row.duration_mins,
      locationType: row.location_type,
      city: row.city,
      address: row.address,
      maxParticipants: row.max_participants,
      bookingMode: row.booking_mode,
      presetTopic: row.preset_topic,
      presetDescription: row.preset_description,
    },
    counterpart: {
      id: row.counterpart_id,
      fullName: row.counterpart_name,
      profileImageUrl: ensureAvatar(row.counterpart_image),
      email: row.counterpart_email,
    },
  };
}

function mapDatabaseError(error: unknown): never {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  if (message.includes("slot_already_booked")) {
    throw new AppError(
      409,
      "slot_already_booked",
      "This slot is no longer available.",
    );
  }

  if (message.includes("booking_time_conflict")) {
    throw new AppError(
      409,
      "booking_time_conflict",
      "You already have another active session request at that time.",
    );
  }

  if (
    message.includes(
      "unique constraint failed: bookings.availability_slot_id, bookings.mentee_id",
    )
  ) {
    throw new AppError(
      409,
      "duplicate_booking_request",
      "You already have an active request for this slot.",
    );
  }

  if (
    message.includes(
      "unique constraint failed: bookings.availability_slot_id",
    ) ||
    message.includes("idx_bookings_accepted_slot_unique")
  ) {
    throw new AppError(
      409,
      "slot_already_booked",
      "This slot is no longer available.",
    );
  }

  throw error;
}

async function getSlotForBooking(
  db: DatabaseClient,
  availabilitySlotId: number,
) {
  return db.get<BookingSlotRow>(
    `
      SELECT
        s.id,
        s.mentor_id,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM bookings b
            WHERE b.availability_slot_id = s.id
              AND b.status = 'accepted'
          ) THEN 1
          ELSE 0
        END AS is_booked,
        s.max_participants,
        s.booking_mode,
        s.preset_topic,
        s.preset_description,
        s.start_time,
        s.duration_mins
      FROM availability_slots s
      WHERE s.id = ?
      LIMIT 1
    `,
    [availabilitySlotId],
  );
}

function getBookingTopic(
  slot: BookingSlotRow,
  topic: string | null | undefined,
) {
  return slot.booking_mode === "preset"
    ? (slot.preset_topic?.trim() ?? "")
    : (topic?.trim() ?? "");
}

async function prepareBooking(
  db: DatabaseClient,
  menteeId: number,
  payload: {
    availabilitySlotId: number;
    topic?: string | null;
    description?: string | null;
    note?: string | null;
    numParticipants: number;
  },
) {
  const slot = await getSlotForBooking(db, payload.availabilitySlotId);

  if (!slot || slot.is_booked) {
    throw new AppError(
      400,
      "slot_unavailable",
      "Slot unavailable or already booked",
    );
  }

  if (slot.mentor_id === menteeId) {
    throw new AppError(
      400,
      "self_booking_not_allowed",
      "You cannot book your own availability slot.",
    );
  }

  if (payload.numParticipants > slot.max_participants) {
    throw new AppError(
      400,
      "participants_exceeded",
      `numParticipants cannot exceed maxParticipants (${slot.max_participants})`,
    );
  }

  const topic = getBookingTopic(slot, payload.topic);

  if (!topic) {
    throw new AppError(
      400,
      "booking_topic_required",
      "Please add a topic before sending the booking request.",
    );
  }

  return {
    slot,
    topic,
    description:
      slot.booking_mode === "preset"
        ? (slot.preset_description ?? null)
        : (payload.description ?? null),
    numParticipants: payload.numParticipants,
    note: payload.note ?? null,
  } satisfies PreparedBooking;
}

function getInsertBookingStatements(
  preparedBookings: PreparedBooking[],
  menteeId: number,
  createdAt: string,
): BatchStatement[] {
  return preparedBookings.map((preparedBooking) => ({
    sql: `
      INSERT INTO bookings (
        topic, description, availability_slot_id, created_at, updated_at,
        num_participants, note, mentee_id, mentor_id, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `,
    params: [
      preparedBooking.topic,
      preparedBooking.description,
      preparedBooking.slot.id,
      createdAt,
      createdAt,
      preparedBooking.numParticipants,
      preparedBooking.note,
      menteeId,
      preparedBooking.slot.mentor_id,
    ],
  }));
}

async function getBookingForActor(db: DatabaseClient, bookingId: number) {
  return db.get<{
    id: number;
    mentee_id: number;
    mentor_id: number;
    availability_slot_id: number;
    status: string;
  }>(
    `
      SELECT id, mentee_id, mentor_id, availability_slot_id, status
      FROM bookings
      WHERE id = ?
      LIMIT 1
    `,
    [bookingId],
  );
}

function assertBookingAccess(
  booking: Awaited<ReturnType<typeof getBookingForActor>>,
  actorId: number,
) {
  if (!booking) {
    throw new AppError(404, "booking_not_found", "Booking not found");
  }

  if (booking.mentee_id !== actorId && booking.mentor_id !== actorId) {
    throw new AppError(
      403,
      "booking_access_denied",
      "Booking does not belong to the current user",
    );
  }

  return booking;
}

function assertMentorOwnsBooking(
  booking: Awaited<ReturnType<typeof getBookingForActor>>,
  mentorId: number,
) {
  if (!booking) {
    throw new AppError(404, "booking_not_found", "Booking not found");
  }

  if (booking.mentor_id !== mentorId) {
    throw new AppError(
      403,
      "booking_access_denied",
      "Unauthorized: You are not the assigned mentor",
    );
  }

  return booking;
}

function getBookingListQuery(
  role: "mentee" | "mentor",
  mode: "all" | "history" = "all",
) {
  const column = role === "mentee" ? "b.mentee_id" : "b.mentor_id";
  const counterpartJoin = role === "mentee" ? "mentor" : "mentee";
  const historyFilter =
    mode === "history"
      ? `
        AND (
          b.status = 'completed'
          OR (
            b.status = 'accepted'
            AND strftime('%s', s.start_time) + (s.duration_mins * 60) <= strftime('%s', ?)
          )
        )
      `
      : "";

  return `
    SELECT
      b.id,
      b.topic,
      b.description,
      b.note,
      b.num_participants,
      b.status,
      b.created_at,
      b.updated_at,
      s.id AS slot_id,
      s.title AS slot_title,
      s.start_time,
      s.duration_mins,
      s.location_type,
      s.city,
      s.address,
      s.max_participants,
      s.booking_mode,
      s.preset_topic,
      s.preset_description,
      p.user_id AS counterpart_id,
      p.full_name AS counterpart_name,
      p.profile_image_url AS counterpart_image,
      u.email AS counterpart_email
    FROM bookings b
    JOIN availability_slots s ON s.id = b.availability_slot_id
    JOIN users u ON u.id = b.${counterpartJoin}_id
    JOIN profiles p ON p.user_id = u.id
    WHERE ${column} = ?${historyFilter}
    ORDER BY s.start_time DESC, b.created_at DESC
  `;
}

export async function createBooking(
  db: DatabaseClient,
  menteeId: number,
  input: unknown,
) {
  const payload = bookingCreateSchema.parse(input);
  const preparedBooking = await prepareBooking(db, menteeId, {
    availabilitySlotId: payload.availabilitySlotId,
    topic: payload.topic ?? null,
    description: payload.description ?? null,
    note: payload.note ?? null,
    numParticipants: payload.numParticipants,
  });
  const createdAt = new Date().toISOString();

  try {
    const [result] = await db.batch(
      getInsertBookingStatements([preparedBooking], menteeId, createdAt),
    );

    return { id: result?.lastRowId, status: "pending" as const };
  } catch (error) {
    mapDatabaseError(error);
  }
}

export async function createBookingSeries(
  db: DatabaseClient,
  menteeId: number,
  input: {
    availabilitySlotIds: number[];
    topic?: string | null;
    description?: string | null;
    note?: string | null;
    numParticipants?: number;
  },
) {
  const uniqueSlotIds = [
    ...new Set(
      input.availabilitySlotIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  ];

  if (uniqueSlotIds.length === 0) {
    throw new AppError(
      400,
      "slot_selection_required",
      "Select at least one upcoming session.",
    );
  }

  const numParticipants = Math.max(
    1,
    Math.trunc(Number(input.numParticipants ?? 1) || 1),
  );
  const preparedBookings = [];

  for (const availabilitySlotId of uniqueSlotIds) {
    preparedBookings.push(
      await prepareBooking(db, menteeId, {
        availabilitySlotId,
        topic: input.topic ?? null,
        description: input.description ?? null,
        note: input.note ?? null,
        numParticipants,
      }),
    );
  }

  const createdAt = new Date().toISOString();

  try {
    const results = await db.batch(
      getInsertBookingStatements(preparedBookings, menteeId, createdAt),
    );

    return {
      count: results.length,
      bookings: results.map((result) => ({
        id: result.lastRowId,
        status: "pending" as const,
      })),
    };
  } catch (error) {
    mapDatabaseError(error);
  }
}

export async function cancelBooking(
  db: DatabaseClient,
  actorId: number,
  bookingId: number,
) {
  const booking = assertBookingAccess(
    await getBookingForActor(db, bookingId),
    actorId,
  );

  if (!["pending", "accepted"].includes(booking.status)) {
    throw new AppError(
      400,
      "booking_not_cancellable",
      "Only pending or accepted bookings can be cancelled.",
    );
  }

  const now = new Date().toISOString();
  const [result] = await db.batch([
    {
      sql: `
        UPDATE bookings
        SET status = 'cancelled', updated_at = ?
        WHERE id = ? AND status IN ('pending', 'accepted')
      `,
      params: [now, bookingId],
    },
  ]);

  if (result?.changes !== 1) {
    throw new AppError(
      409,
      "booking_not_cancellable",
      "This booking can no longer be cancelled.",
    );
  }

  return { ok: true };
}

export async function completeBooking(
  db: DatabaseClient,
  mentorId: number,
  bookingId: number,
) {
  const booking = assertMentorOwnsBooking(
    await getBookingForActor(db, bookingId),
    mentorId,
  );

  if (booking.status !== "accepted") {
    throw new AppError(
      400,
      "booking_not_accepted",
      "Only accepted sessions can be marked complete.",
    );
  }

  const now = new Date().toISOString();
  const result = await db.run(
    `
      UPDATE bookings
      SET status = 'completed', updated_at = ?
      WHERE id = ? AND mentor_id = ? AND status = 'accepted'
    `,
    [now, bookingId, mentorId],
  );

  if (result.changes !== 1) {
    throw new AppError(
      409,
      "booking_not_accepted",
      "This session is no longer in an accepted state.",
    );
  }

  return { status: "completed" as const };
}

export async function completeDueAcceptedBookings(
  db: DatabaseClient,
  nowIso = new Date().toISOString(),
) {
  const result = await db.run(
    `
      UPDATE bookings
      SET status = 'completed', updated_at = ?
      WHERE status = 'accepted'
        AND EXISTS (
          SELECT 1
          FROM availability_slots s
          WHERE s.id = bookings.availability_slot_id
            AND strftime('%s', s.start_time) + (s.duration_mins * 60) <= strftime('%s', ?)
        )
    `,
    [nowIso, nowIso],
  );

  return { count: result.changes };
}

export async function respondToBooking(
  db: DatabaseClient,
  mentorId: number,
  bookingId: number,
  input: unknown,
) {
  const payload = bookingRespondSchema.parse(input);
  const booking = assertMentorOwnsBooking(
    await getBookingForActor(db, bookingId),
    mentorId,
  );

  if (booking.status !== "pending") {
    throw new AppError(
      400,
      "booking_not_pending",
      "Booking is no longer pending",
    );
  }

  const now = new Date().toISOString();

  try {
    if (payload.response === "accepted") {
      const [acceptResult] = await db.batch([
        {
          sql: `
            UPDATE bookings
            SET status = 'accepted', updated_at = ?
            WHERE id = ? AND mentor_id = ? AND status = 'pending'
          `,
          params: [now, bookingId, mentorId],
        },
        {
          sql: `
            UPDATE bookings
            SET status = 'cancelled', updated_at = ?
            WHERE availability_slot_id = ?
              AND status = 'pending'
              AND id != ?
          `,
          params: [now, booking.availability_slot_id, bookingId],
        },
      ]);

      if (acceptResult?.changes !== 1) {
        throw new AppError(
          409,
          "booking_not_pending",
          "Booking is no longer pending",
        );
      }

      return { status: "accepted" as const };
    }

    const result = await db.run(
      `
        UPDATE bookings
        SET status = 'rejected', updated_at = ?
        WHERE id = ? AND mentor_id = ? AND status = 'pending'
      `,
      [now, bookingId, mentorId],
    );

    if (result.changes !== 1) {
      throw new AppError(
        409,
        "booking_not_pending",
        "Booking is no longer pending",
      );
    }

    return { status: "rejected" as const };
  } catch (error) {
    mapDatabaseError(error);
  }
}

export async function listBookings(
  db: DatabaseClient,
  userId: number,
  role: "mentee" | "mentor",
) {
  const rows = await db.all<BookingRow>(getBookingListQuery(role, "all"), [
    userId,
  ]);
  const now = Date.now();
  return rows.map((row) => mapBookingRow(row, now));
}

export async function getBookingHistory(
  db: DatabaseClient,
  userId: number,
  role: "mentee" | "mentor",
) {
  const nowIso = new Date().toISOString();
  const rows = await db.all<BookingRow>(getBookingListQuery(role, "history"), [
    userId,
    nowIso,
  ]);
  const now = new Date(nowIso).getTime();
  return rows.map((row) => mapBookingRow(row, now));
}
