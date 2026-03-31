import type { DatabaseClient } from "@mentormatch/db";
import {
  AppError,
  bookingCreateSchema,
  bookingRespondSchema,
  ensureAvatar,
} from "@mentormatch/shared";

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
  }>(
    `
			SELECT id, mentor_id, is_booked, max_participants
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

  if (payload.numParticipants > slot.max_participants) {
    throw new AppError(
      400,
      "participants_exceeded",
      `numParticipants cannot exceed maxParticipants (${slot.max_participants})`,
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
      payload.topic,
      payload.description ?? null,
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
  }>("SELECT id, mentee_id, mentor_id FROM bookings WHERE id = ? LIMIT 1", [
    bookingId,
  ]);

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

  await db.run(
    "UPDATE bookings SET status = 'cancelled', updated_at = ? WHERE id = ?",
    [new Date().toISOString(), bookingId],
  );
  await db.run(
    "UPDATE availability_slots SET is_booked = 0, updated_at = ? WHERE id = (SELECT availability_slot_id FROM bookings WHERE id = ?)",
    [new Date().toISOString(), bookingId],
  );

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
