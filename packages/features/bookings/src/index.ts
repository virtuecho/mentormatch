import type { DatabaseClient } from "@mentormatch/db";
import {
  AppError,
  bookingCreateSchema,
  bookingRespondSchema,
  ensureAvatar,
} from "@mentormatch/shared";

function getEndTime(startTime: string, durationMins: number) {
  return new Date(new Date(startTime).getTime() + durationMins * 60_000).getTime();
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

export async function createBooking(
  db: DatabaseClient,
  menteeId: number,
  input: unknown,
) {
  const payload = bookingCreateSchema.parse(input);
  const slot = await db.get<{
    id: number;
    mentor_id: number;
    is_booked: number;
    max_participants: number;
    booking_mode: "open" | "preset";
    preset_topic: string | null;
    preset_description: string | null;
    start_time: string;
    duration_mins: number;
  }>(
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
    [payload.availabilitySlotId],
  );

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

  const existingSlotRequest = await db.get<{ id: number }>(
    `
      SELECT id
      FROM bookings
      WHERE availability_slot_id = ?
        AND mentee_id = ?
        AND status IN ('pending', 'accepted')
      LIMIT 1
    `,
    [payload.availabilitySlotId, menteeId],
  );

  if (existingSlotRequest) {
    throw new AppError(
      409,
      "duplicate_booking_request",
      "You already have an active request for this slot.",
    );
  }

  const activeBookings = await db.all<{
    availability_slot_id: number;
    start_time: string;
    duration_mins: number;
  }>(
    `
      SELECT b.availability_slot_id, s.start_time, s.duration_mins
      FROM bookings b
      JOIN availability_slots s ON s.id = b.availability_slot_id
      WHERE b.mentee_id = ? AND b.status IN ('pending', 'accepted')
    `,
    [menteeId],
  );

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

  const topic =
    slot.booking_mode === "preset"
      ? slot.preset_topic?.trim() ?? ""
      : payload.topic?.trim() ?? "";

  if (!topic) {
    throw new AppError(
      400,
      "booking_topic_required",
      "Please add a topic before sending the booking request.",
    );
  }

  const now = new Date().toISOString();
  const insert = await db.run(
    `
			INSERT INTO bookings (
				topic, description, availability_slot_id, created_at, updated_at,
				num_participants, note, mentee_id, mentor_id, status
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
		`,
    [
      topic,
      slot.booking_mode === "preset"
        ? slot.preset_description ?? null
        : payload.description ?? null,
      payload.availabilitySlotId,
      now,
      now,
      payload.numParticipants,
      payload.note ?? null,
      menteeId,
      slot.mentor_id,
    ],
  );

  return { id: insert.lastRowId, status: "pending" };
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
    [
    bookingId,
    ],
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
  const now = Date.now();

  return bookings.filter((booking) => {
    if (booking.status !== "accepted") {
      return false;
    }

    const end =
      new Date(booking.slot.startTime).getTime() +
      booking.slot.durationMins * 60 * 1000;
    return end < now;
  });
}
