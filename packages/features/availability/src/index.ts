import type { DatabaseClient } from '@mentormatch/db';
import { AppError, availabilityCreateSchema } from '@mentormatch/shared';

export async function createAvailabilitySlot(db: DatabaseClient, mentorId: number, input: unknown) {
	const payload = availabilityCreateSchema.parse(input);
	const now = new Date().toISOString();
	const existingSlot = await db.get<{ id: number }>(
		`
			SELECT id
			FROM availability_slots
			WHERE mentor_id = ? AND start_time = ?
			LIMIT 1
		`,
		[mentorId, payload.startTime]
	);

	if (existingSlot) {
		throw new AppError(
			409,
			'duplicate_availability_slot',
			'You already have a slot at that exact time.'
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
			now
		]
	);

	return getAvailabilityById(db, slotInsert.lastRowId ?? 0, mentorId);
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
		[mentorId]
	);
}

export async function getMentorAvailability(db: DatabaseClient, mentorId: number, currentUserId: number | null) {
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
		[mentorId, new Date().toISOString()]
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
			isRequested: false
		}));
	}

	const requestedRows = await db.all<{ availability_slot_id: number }>(
		`
			SELECT availability_slot_id
			FROM bookings
			WHERE mentee_id = ? AND status IN ('pending', 'accepted')
		`,
		[currentUserId]
	);

	const requested = new Set(requestedRows.map((row) => Number(row.availability_slot_id)));

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
		isRequested: requested.has(slot.id)
	}));
}

export async function deleteAvailabilitySlot(db: DatabaseClient, mentorId: number, slotId: number) {
	const slot = await db.get<{ id: number }>(
		'SELECT id FROM availability_slots WHERE id = ? AND mentor_id = ? LIMIT 1',
		[slotId, mentorId]
	);

	if (!slot) {
		throw new AppError(404, 'availability_not_found', 'Availability slot not found');
	}

	const accepted = await db.get<{ id: number }>(
		`
			SELECT id
			FROM bookings
			WHERE availability_slot_id = ? AND status = 'accepted'
			LIMIT 1
		`,
		[slotId]
	);

	if (accepted) {
		throw new AppError(
			400,
			'accepted_booking_exists',
			'Cannot delete slot while there is an accepted booking. Cancel the booking first.'
		);
	}

	await db.run("DELETE FROM bookings WHERE availability_slot_id = ? AND status != 'accepted'", [slotId]);
	await db.run('DELETE FROM availability_slots WHERE id = ? AND mentor_id = ?', [slotId, mentorId]);

	return { ok: true };
}

async function getAvailabilityById(db: DatabaseClient, slotId: number, mentorId: number) {
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
		[slotId, mentorId]
	);

	if (!slot) {
		throw new AppError(404, 'availability_not_found', 'Availability slot not found');
	}

	return slot;
}
