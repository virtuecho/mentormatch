import type { DatabaseClient } from "@mentormatch/db";
import {
  AppError,
  availabilityCreateSchema,
  ensureAvatar,
} from "@mentormatch/shared";

export async function createAvailabilitySlot(
  db: DatabaseClient,
  mentorId: number,
  input: unknown,
) {
  const payload = availabilityCreateSchema.parse(input);
  const now = new Date().toISOString();
  const existingSlot = await db.get<{ id: number }>(
    `
			SELECT id
			FROM availability_slots
			WHERE mentor_id = ? AND start_time = ?
			LIMIT 1
		`,
    [mentorId, payload.startTime],
  );

  if (existingSlot) {
    throw new AppError(
      409,
      "duplicate_availability_slot",
      "You already have a slot at that exact time.",
    );
  }

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
}

export async function updateAvailabilitySlot(
  db: DatabaseClient,
  mentorId: number,
  slotId: number,
  input: unknown,
) {
  const payload = availabilityCreateSchema.parse(input);
  const now = new Date().toISOString();
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

  const activeBooking = await db.get<{ id: number }>(
    `
			SELECT id
			FROM bookings
			WHERE availability_slot_id = ? AND status IN ('pending', 'accepted')
			LIMIT 1
		`,
    [slotId],
  );

  if (activeBooking) {
    throw new AppError(
      409,
      "active_booking_exists",
      "Resolve pending or accepted requests before editing this session.",
    );
  }

  const existingSlot = await db.get<{ id: number }>(
    `
			SELECT id
			FROM availability_slots
			WHERE mentor_id = ? AND start_time = ? AND id != ?
			LIMIT 1
		`,
    [mentorId, payload.startTime, slotId],
  );

  if (existingSlot) {
    throw new AppError(
      409,
      "duplicate_availability_slot",
      "You already have a slot at that exact time.",
    );
  }

  await db.run(
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

  return getAvailabilityById(db, slotId, mentorId);
}

export async function getMyAvailability(db: DatabaseClient, mentorId: number) {
  return db.all(
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
				is_booked
			FROM availability_slots
			WHERE mentor_id = ?
			ORDER BY start_time ASC
		`,
    [mentorId],
  );
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

  const slots = await db.all<any>(
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
				s.is_booked,
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
    isBooked: Boolean(slot.is_booked),
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
  const slots = await db.all<any>(
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
				is_booked
			FROM availability_slots
			WHERE mentor_id = ? AND is_booked = 0 AND start_time >= ?
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

  const accepted = await db.get<{ id: number }>(
    `
			SELECT id
			FROM bookings
			WHERE availability_slot_id = ? AND status = 'accepted'
			LIMIT 1
		`,
    [slotId],
  );

  if (accepted) {
    throw new AppError(
      400,
      "accepted_booking_exists",
      "Cannot delete slot while there is an accepted booking. Cancel the booking first.",
    );
  }

  await db.run(
    "DELETE FROM bookings WHERE availability_slot_id = ? AND status != 'accepted'",
    [slotId],
  );
  await db.run(
    "DELETE FROM availability_slots WHERE id = ? AND mentor_id = ?",
    [slotId, mentorId],
  );

  return { ok: true };
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
				is_booked
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
