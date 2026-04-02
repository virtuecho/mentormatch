import type { DatabaseClient } from "@mentormatch/db";
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

type ActiveBookingWindow = {
  availability_slot_id: number;
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

function getEndTime(startTime: string, durationMins: number) {
  return new Date(
    new Date(startTime).getTime() + durationMins * 60_000,
  ).getTime();
}

function overlaps(
  leftStart: string,
  leftDurationMins: number,
  rightStart: string,
  rightDurationMins: number,
) {
  const leftStartMs = new Date(leftStart).getTime();
  const rightStartMs = new Date(rightStart).getTime();

  return (
    leftStartMs < getEndTime(rightStart, rightDurationMins) &&
    rightStartMs < getEndTime(leftStart, leftDurationMins)
  );
}

async function syncSlotBookedState(
  db: DatabaseClient,
  slotId: number,
  updatedAt: string,
) {
  const accepted = await db.get<{ id: number }>(
    `
      SELECT id
      FROM bookings
      WHERE availability_slot_id = ? AND status = 'accepted'
      LIMIT 1
    `,
    [slotId],
  );

  await db.run(
    "UPDATE availability_slots SET is_booked = ?, updated_at = ? WHERE id = ?",
    [accepted ? 1 : 0, updatedAt, slotId],
  );
}

async function syncCompletedAcceptedBookings(
  db: DatabaseClient,
  input: { menteeId?: number; mentorId?: number } = {},
) {
  const params: Array<number | string> = [];
  const filters: string[] = [];

  if (typeof input.menteeId === "number") {
    filters.push("b.mentee_id = ?");
    params.push(input.menteeId);
  }

  if (typeof input.mentorId === "number") {
    filters.push("b.mentor_id = ?");
    params.push(input.mentorId);
  }

  const acceptedBookings = await db.all<{
    id: number;
    availability_slot_id: number;
    start_time: string;
    duration_mins: number;
  }>(
    `
      SELECT
        b.id,
        b.availability_slot_id,
        s.start_time,
        s.duration_mins
      FROM bookings b
      JOIN availability_slots s ON s.id = b.availability_slot_id
      WHERE b.status = 'accepted'${filters.length > 0 ? ` AND ${filters.join(" AND ")}` : ""}
    `,
    params,
  );

  const now = Date.now();
  const completedBookingIds = acceptedBookings
    .filter(
      (booking) => getEndTime(booking.start_time, booking.duration_mins) <= now,
    )
    .map((booking) => booking.id);

  if (completedBookingIds.length === 0) {
    return;
  }

  const updatedAt = new Date().toISOString();

  for (const bookingId of completedBookingIds) {
    await db.run(
      "UPDATE bookings SET status = 'completed', updated_at = ? WHERE id = ?",
      [updatedAt, bookingId],
    );
  }
}

async function getSlotForBooking(
  db: DatabaseClient,
  availabilitySlotId: number,
) {
  return db.get<BookingSlotRow>(
    `
			SELECT
        id,
        mentor_id,
        is_booked,
        max_participants,
        booking_mode,
        preset_topic,
        preset_description,
        start_time,
        duration_mins
			FROM availability_slots
			WHERE id = ?
			LIMIT 1
		`,
    [availabilitySlotId],
  );
}

async function getExistingSlotRequest(
  db: DatabaseClient,
  availabilitySlotId: number,
  menteeId: number,
) {
  return db.get<{ id: number }>(
    `
      SELECT id
      FROM bookings
      WHERE availability_slot_id = ?
        AND mentee_id = ?
        AND status IN ('pending', 'accepted')
      LIMIT 1
    `,
    [availabilitySlotId, menteeId],
  );
}

async function getActiveBookingWindows(db: DatabaseClient, menteeId: number) {
  return db.all<ActiveBookingWindow>(
    `
      SELECT b.availability_slot_id, s.start_time, s.duration_mins
      FROM bookings b
      JOIN availability_slots s ON s.id = b.availability_slot_id
      WHERE b.mentee_id = ? AND b.status IN ('pending', 'accepted')
    `,
    [menteeId],
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

function assertBookingWindowAvailable(
  slot: BookingSlotRow,
  activeBookings: ActiveBookingWindow[],
) {
  if (
    activeBookings.some(
      (booking) =>
        booking.availability_slot_id !== slot.id &&
        overlaps(
          slot.start_time,
          slot.duration_mins,
          booking.start_time,
          booking.duration_mins,
        ),
    )
  ) {
    throw new AppError(
      409,
      "booking_time_conflict",
      "You already have another active session request at that time.",
    );
  }
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
  activeBookings: ActiveBookingWindow[],
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

  const existingSlotRequest = await getExistingSlotRequest(
    db,
    payload.availabilitySlotId,
    menteeId,
  );

  if (existingSlotRequest) {
    throw new AppError(
      409,
      "duplicate_booking_request",
      "You already have an active request for this slot.",
    );
  }

  assertBookingWindowAvailable(slot, activeBookings);

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

async function insertPreparedBooking(
  db: DatabaseClient,
  menteeId: number,
  preparedBooking: PreparedBooking,
  createdAt: string,
) {
  const insert = await db.run(
    `
			INSERT INTO bookings (
				topic, description, availability_slot_id, created_at, updated_at,
				num_participants, note, mentee_id, mentor_id, status
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
		`,
    [
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
  );

  return { id: insert.lastRowId, status: "pending" as const };
}

export async function createBooking(
  db: DatabaseClient,
  menteeId: number,
  input: unknown,
) {
  const payload = bookingCreateSchema.parse(input);
  const activeBookings = await getActiveBookingWindows(db, menteeId);
  const preparedBooking = await prepareBooking(
    db,
    menteeId,
    {
      availabilitySlotId: payload.availabilitySlotId,
      topic: payload.topic ?? null,
      description: payload.description ?? null,
      note: payload.note ?? null,
      numParticipants: payload.numParticipants,
    },
    activeBookings,
  );

  return insertPreparedBooking(
    db,
    menteeId,
    preparedBooking,
    new Date().toISOString(),
  );
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
  const activeBookings = await getActiveBookingWindows(db, menteeId);
  const provisionalWindows = [...activeBookings];
  const preparedBookings: PreparedBooking[] = [];

  for (const availabilitySlotId of uniqueSlotIds) {
    const preparedBooking = await prepareBooking(
      db,
      menteeId,
      {
        availabilitySlotId,
        topic: input.topic ?? null,
        description: input.description ?? null,
        note: input.note ?? null,
        numParticipants,
      },
      provisionalWindows,
    );

    preparedBookings.push(preparedBooking);
    provisionalWindows.push({
      availability_slot_id: preparedBooking.slot.id,
      start_time: preparedBooking.slot.start_time,
      duration_mins: preparedBooking.slot.duration_mins,
    });
  }

  const createdAt = new Date().toISOString();
  const createdBookings = [];

  for (const preparedBooking of preparedBookings) {
    createdBookings.push(
      await insertPreparedBooking(db, menteeId, preparedBooking, createdAt),
    );
  }

  return {
    count: createdBookings.length,
    bookings: createdBookings,
  };
}

export async function cancelBooking(
  db: DatabaseClient,
  actorId: number,
  bookingId: number,
) {
  const booking = await db.get<{
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

  if (!["pending", "accepted"].includes(booking.status)) {
    throw new AppError(
      400,
      "booking_not_cancellable",
      "Only pending or accepted bookings can be cancelled.",
    );
  }

  const now = new Date().toISOString();
  await db.run(
    "UPDATE bookings SET status = 'cancelled', updated_at = ? WHERE id = ?",
    [now, bookingId],
  );
  await syncSlotBookedState(db, booking.availability_slot_id, now);

  return { ok: true };
}

export async function completeBooking(
  db: DatabaseClient,
  mentorId: number,
  bookingId: number,
) {
  const booking = await db.get<{
    id: number;
    mentor_id: number;
    availability_slot_id: number;
    status: string;
  }>(
    "SELECT id, mentor_id, availability_slot_id, status FROM bookings WHERE id = ? LIMIT 1",
    [bookingId],
  );

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

  if (booking.status !== "accepted") {
    throw new AppError(
      400,
      "booking_not_accepted",
      "Only accepted sessions can be marked complete.",
    );
  }

  const now = new Date().toISOString();
  await db.run(
    "UPDATE bookings SET status = 'completed', updated_at = ? WHERE id = ?",
    [now, bookingId],
  );

  return { status: "completed" as const };
}

export async function respondToBooking(
  db: DatabaseClient,
  mentorId: number,
  bookingId: number,
  input: unknown,
) {
  const payload = bookingRespondSchema.parse(input);
  const booking = await db.get<{
    id: number;
    mentor_id: number;
    availability_slot_id: number;
    status: string;
  }>(
    "SELECT id, mentor_id, availability_slot_id, status FROM bookings WHERE id = ? LIMIT 1",
    [bookingId],
  );

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

  if (booking.status !== "pending") {
    throw new AppError(
      400,
      "booking_not_pending",
      "Booking is no longer pending",
    );
  }

  const now = new Date().toISOString();

  if (payload.response === "accepted") {
    const acceptedBooking = await db.get<{ id: number }>(
      `
        SELECT id
        FROM bookings
        WHERE availability_slot_id = ?
          AND status = 'accepted'
          AND id != ?
        LIMIT 1
      `,
      [booking.availability_slot_id, bookingId],
    );

    if (acceptedBooking) {
      throw new AppError(
        409,
        "slot_already_booked",
        "This slot already has an accepted booking.",
      );
    }
  }

  await db.run("UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?", [
    payload.response,
    now,
    bookingId,
  ]);

  if (payload.response === "accepted") {
    await db.run(
      "UPDATE availability_slots SET is_booked = 1, updated_at = ? WHERE id = ?",
      [now, booking.availability_slot_id],
    );
    await db.run(
      `
        UPDATE bookings
        SET status = 'cancelled', updated_at = ?
        WHERE availability_slot_id = ?
          AND status = 'pending'
          AND id != ?
      `,
      [now, booking.availability_slot_id, bookingId],
    );
  }

  return { status: payload.response };
}

export async function listBookings(
  db: DatabaseClient,
  userId: number,
  role: "mentee" | "mentor",
) {
  await syncCompletedAcceptedBookings(
    db,
    role === "mentee" ? { menteeId: userId } : { mentorId: userId },
  );

  const column = role === "mentee" ? "b.mentee_id" : "b.mentor_id";
  const counterpartJoin = role === "mentee" ? "mentor" : "mentee";

  const rows = await db.all<any>(
    `
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
			WHERE ${column} = ?
			ORDER BY b.created_at DESC
		`,
    [userId],
  );

  return rows.map((row) => ({
    id: row.id,
    topic: row.topic,
    description: row.description,
    note: row.note,
    numParticipants: row.num_participants,
    status: row.status,
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
  }));
}

export async function getBookingHistory(
  db: DatabaseClient,
  userId: number,
  role: "mentee" | "mentor",
) {
  const bookings = await listBookings(db, userId, role);

  return bookings.filter((booking) => {
    return booking.status === "completed";
  });
}
