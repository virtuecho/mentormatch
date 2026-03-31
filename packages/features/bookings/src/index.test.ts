import { describe, expect, it } from 'vitest';
import type { DatabaseClient, QueryParams, QueryResult } from '@mentormatch/db';
import type { BookingStatus } from '@mentormatch/shared';
import { AppError } from '@mentormatch/shared';
import { cancelBooking, createBooking, listBookings, respondToBooking } from './index';

type User = {
	id: number;
	email: string;
	fullName: string;
	profileImageUrl: string | null;
};

type Slot = {
	id: number;
	mentorId: number;
	title: string;
	bookingMode: 'open' | 'preset';
	presetTopic: string | null;
	presetDescription: string | null;
	startTime: string;
	durationMins: number;
	locationType: string;
	city: string;
	address: string;
	maxParticipants: number;
	note: string | null;
	isBooked: number;
	updatedAt: string;
};

type Booking = {
	id: number;
	topic: string;
	description: string | null;
	availabilitySlotId: number;
	createdAt: string;
	updatedAt: string;
	numParticipants: number;
	note: string | null;
	menteeId: number;
	mentorId: number;
	status: BookingStatus;
};

class BookingTestDatabase implements DatabaseClient {
	private nextBookingId = 1;

	constructor(
		private readonly users: User[],
		private readonly slots: Slot[],
		private readonly bookings: Booking[] = []
	) {}

	async get<T>(sql: string, params: QueryParams = []): Promise<T | null> {
		if (sql.includes('FROM availability_slots') && sql.includes('WHERE id = ?')) {
			const slot = this.slots.find((item) => item.id === Number(params[0]));
			if (!slot) {
				return null;
			}

			return {
				id: slot.id,
				mentor_id: slot.mentorId,
				is_booked: slot.isBooked,
				max_participants: slot.maxParticipants,
				booking_mode: slot.bookingMode,
				preset_topic: slot.presetTopic,
				preset_description: slot.presetDescription,
				start_time: slot.startTime,
				duration_mins: slot.durationMins
			} as T;
		}

		if (sql.includes('FROM bookings') && sql.includes('availability_slot_id = ?') && sql.includes('mentee_id = ?')) {
			const booking = this.bookings.find(
				(item) =>
					item.availabilitySlotId === Number(params[0]) &&
					item.menteeId === Number(params[1]) &&
					(item.status === 'pending' || item.status === 'accepted')
			);

			return booking ? ({ id: booking.id } as T) : null;
		}

		if (sql.includes('FROM bookings') && sql.includes("status = 'accepted'")) {
			const slotId = Number(params[0]);
			const excludedId = params.length > 1 ? Number(params[1]) : null;
			const booking = this.bookings.find(
				(item) =>
					item.availabilitySlotId === slotId &&
					item.status === 'accepted' &&
					(excludedId == null || item.id !== excludedId)
			);

			return booking ? ({ id: booking.id } as T) : null;
		}

		if (sql.includes('SELECT id, mentee_id, mentor_id, availability_slot_id, status')) {
			const booking = this.bookings.find((item) => item.id === Number(params[0]));
			return booking
				? ({
						id: booking.id,
						mentee_id: booking.menteeId,
						mentor_id: booking.mentorId,
						availability_slot_id: booking.availabilitySlotId,
						status: booking.status
					} as T)
				: null;
		}

		if (sql.includes('SELECT id, mentor_id, availability_slot_id, status')) {
			const booking = this.bookings.find((item) => item.id === Number(params[0]));
			return booking
				? ({
						id: booking.id,
						mentor_id: booking.mentorId,
						availability_slot_id: booking.availabilitySlotId,
						status: booking.status
					} as T)
				: null;
		}

		throw new Error(`Unexpected get query: ${sql}`);
	}

	async all<T>(sql: string, params: QueryParams = []): Promise<T[]> {
		if (sql.includes('FROM bookings b') && sql.includes('JOIN profiles p')) {
			const userId = Number(params[0]);
			const filterByMentee = sql.includes('WHERE b.mentee_id = ?');

			return this.bookings
				.filter((booking) => (filterByMentee ? booking.menteeId === userId : booking.mentorId === userId))
				.map((booking) => {
					const slot = this.slots.find((item) => item.id === booking.availabilitySlotId)!;
					const counterpartId = filterByMentee ? booking.mentorId : booking.menteeId;
					const counterpart = this.users.find((item) => item.id === counterpartId)!;

					return {
						id: booking.id,
						topic: booking.topic,
						description: booking.description,
						note: booking.note,
						num_participants: booking.numParticipants,
						status: booking.status,
						created_at: booking.createdAt,
						updated_at: booking.updatedAt,
						slot_id: slot.id,
						slot_title: slot.title,
						start_time: slot.startTime,
						duration_mins: slot.durationMins,
						location_type: slot.locationType,
						city: slot.city,
						address: slot.address,
						max_participants: slot.maxParticipants,
						booking_mode: slot.bookingMode,
						preset_topic: slot.presetTopic,
						preset_description: slot.presetDescription,
						counterpart_id: counterpart.id,
						counterpart_name: counterpart.fullName,
						counterpart_image: counterpart.profileImageUrl,
						counterpart_email: counterpart.email
					};
				}) as T[];
		}

		if (sql.includes('FROM bookings b') && sql.includes("b.status IN ('pending', 'accepted')")) {
			const userId = Number(params[0]);
			return this.bookings
				.filter(
					(booking) =>
						booking.menteeId === userId &&
						(booking.status === 'pending' || booking.status === 'accepted')
				)
				.map((booking) => {
					const slot = this.slots.find((item) => item.id === booking.availabilitySlotId)!;
					return {
						availability_slot_id: booking.availabilitySlotId,
						start_time: slot.startTime,
						duration_mins: slot.durationMins
					};
				}) as T[];
		}

		throw new Error(`Unexpected all query: ${sql}`);
	}

	async run(sql: string, params: QueryParams = []): Promise<QueryResult> {
		if (sql.includes('INSERT INTO bookings')) {
			const [
				topic,
				description,
				availabilitySlotId,
				createdAt,
				updatedAt,
				numParticipants,
				note,
				menteeId,
				mentorId
			] = params;
			const id = this.nextBookingId++;

			this.bookings.push({
				id,
				topic: String(topic),
				description: description ? String(description) : null,
				availabilitySlotId: Number(availabilitySlotId),
				createdAt: String(createdAt),
				updatedAt: String(updatedAt),
				numParticipants: Number(numParticipants),
				note: note ? String(note) : null,
				menteeId: Number(menteeId),
				mentorId: Number(mentorId),
				status: 'pending'
			});

			return { changes: 1, lastRowId: id };
		}

		if (sql.includes("UPDATE bookings SET status = 'cancelled', updated_at = ? WHERE id = ?")) {
			const booking = this.bookings.find((item) => item.id === Number(params[1]));
			if (booking) {
				booking.status = 'cancelled';
				booking.updatedAt = String(params[0]);
			}

			return { changes: booking ? 1 : 0, lastRowId: null };
		}

		if (sql.includes("SET status = 'cancelled', updated_at = ?") && sql.includes('availability_slot_id = ?')) {
			const slotId = Number(params[1]);
			const excludedId = Number(params[2]);
			let changes = 0;

			for (const booking of this.bookings) {
				if (
					booking.availabilitySlotId === slotId &&
					booking.status === 'pending' &&
					booking.id !== excludedId
				) {
					booking.status = 'cancelled';
					booking.updatedAt = String(params[0]);
					changes += 1;
				}
			}

			return { changes, lastRowId: null };
		}

		if (sql.includes('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?')) {
			const booking = this.bookings.find((item) => item.id === Number(params[2]));
			if (booking) {
				booking.status = params[0] as BookingStatus;
				booking.updatedAt = String(params[1]);
			}

			return { changes: booking ? 1 : 0, lastRowId: null };
		}

		if (sql.includes('UPDATE availability_slots SET is_booked = ?')) {
			const slot = this.slots.find((item) => item.id === Number(params[2]));
			if (slot) {
				slot.isBooked = Number(params[0]);
				slot.updatedAt = String(params[1]);
			}

			return { changes: slot ? 1 : 0, lastRowId: null };
		}

		if (sql.includes('UPDATE availability_slots SET is_booked = 1')) {
			const slot = this.slots.find((item) => item.id === Number(params[1]));
			if (slot) {
				slot.isBooked = 1;
				slot.updatedAt = String(params[0]);
			}

			return { changes: slot ? 1 : 0, lastRowId: null };
		}

		throw new Error(`Unexpected run query: ${sql}`);
	}
}

function createBookingTestDatabase() {
	const users: User[] = [
		{
			id: 1,
			email: 'mentor@example.com',
			fullName: 'Mentor One',
			profileImageUrl: 'https://example.com/mentor.png'
		},
		{
			id: 2,
			email: 'mentee@example.com',
			fullName: 'Mentee One',
			profileImageUrl: 'https://example.com/mentee.png'
		},
		{
			id: 3,
			email: 'second@example.com',
			fullName: 'Mentee Two',
			profileImageUrl: 'https://example.com/mentee-two.png'
		}
	];

	const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
	const slots: Slot[] = [
		{
			id: 10,
			mentorId: 1,
			title: 'Career coaching session',
			bookingMode: 'open',
			presetTopic: null,
			presetDescription: null,
			startTime: new Date(tomorrow).toISOString(),
			durationMins: 60,
			locationType: 'online',
			city: 'Remote',
			address: 'Video call',
			maxParticipants: 2,
			note: 'Bring questions',
			isBooked: 0,
			updatedAt: new Date().toISOString()
		},
		{
			id: 11,
			mentorId: 1,
			title: 'Mock interview',
			bookingMode: 'preset',
			presetTopic: 'Mock interview debrief',
			presetDescription: 'We will review your interview answers and next steps.',
			startTime: new Date(tomorrow + 2 * 60 * 60 * 1000).toISOString(),
			durationMins: 60,
			locationType: 'online',
			city: 'Remote',
			address: 'Video call',
			maxParticipants: 1,
			note: null,
			isBooked: 0,
			updatedAt: new Date().toISOString()
		},
		{
			id: 12,
			mentorId: 1,
			title: 'Overlapping session',
			bookingMode: 'open',
			presetTopic: null,
			presetDescription: null,
			startTime: new Date(tomorrow + 30 * 60 * 1000).toISOString(),
			durationMins: 60,
			locationType: 'online',
			city: 'Remote',
			address: 'Video call',
			maxParticipants: 1,
			note: null,
			isBooked: 0,
			updatedAt: new Date().toISOString()
		}
	];

	return new BookingTestDatabase(users, slots);
}

describe('feature-bookings', () => {
	it('creates an open booking and lists it for the mentee', async () => {
		const db = createBookingTestDatabase();

		const booking = await createBooking(db, 2, {
			availabilitySlotId: 10,
			topic: 'Interview preparation',
			description: 'Need help preparing for final rounds',
			numParticipants: 1
		});

		expect(booking.status).toBe('pending');

		const bookings = await listBookings(db, 2, 'mentee');
		expect(bookings).toHaveLength(1);
		expect(bookings[0]).toMatchObject({
			topic: 'Interview preparation',
			status: 'pending',
			slot: {
				bookingMode: 'open'
			},
			counterpart: {
				fullName: 'Mentor One'
			}
		});
	});

	it('uses the mentor preset topic and description for preset slots', async () => {
		const db = createBookingTestDatabase();

		await createBooking(db, 2, {
			availabilitySlotId: 11,
			topic: '',
			description: '',
			numParticipants: 1
		});

		const bookings = await listBookings(db, 2, 'mentee');
		expect(bookings[0]).toMatchObject({
			topic: 'Mock interview debrief',
			description: 'We will review your interview answers and next steps.',
			slot: {
				bookingMode: 'preset'
			}
		});
	});

	it('rejects duplicate requests for the same slot', async () => {
		const db = createBookingTestDatabase();

		await createBooking(db, 2, {
			availabilitySlotId: 10,
			topic: 'First request',
			numParticipants: 1
		});

		await expect(
			createBooking(db, 2, {
				availabilitySlotId: 10,
				topic: 'Second request',
				numParticipants: 1
			})
		).rejects.toMatchObject({
			status: 409,
			code: 'duplicate_booking_request'
		});
	});

	it('rejects overlapping active requests for the same mentee', async () => {
		const db = createBookingTestDatabase();

		await createBooking(db, 2, {
			availabilitySlotId: 10,
			topic: 'First request',
			numParticipants: 1
		});

		await expect(
			createBooking(db, 2, {
				availabilitySlotId: 12,
				topic: 'Overlapping request',
				numParticipants: 1
			})
		).rejects.toMatchObject({
			status: 409,
			code: 'booking_time_conflict'
		});
	});

	it('accepts one booking, cancels competing requests, and reopens the slot when cancelled', async () => {
		const db = createBookingTestDatabase();

		const bookingOne = await createBooking(db, 2, {
			availabilitySlotId: 10,
			topic: 'Portfolio review',
			numParticipants: 1
		});
		const bookingTwo = await createBooking(db, 3, {
			availabilitySlotId: 10,
			topic: 'Career roadmap',
			numParticipants: 1
		});

		const accepted = await respondToBooking(db, 1, Number(bookingOne.id), { response: 'accepted' });
		expect(accepted.status).toBe('accepted');

		const mentorBookings = await listBookings(db, 1, 'mentor');
		expect(mentorBookings.find((booking) => booking.id === bookingOne.id)?.status).toBe('accepted');
		expect(mentorBookings.find((booking) => booking.id === bookingTwo.id)?.status).toBe('cancelled');

		await expect(
			respondToBooking(db, 1, Number(bookingTwo.id), { response: 'accepted' })
		).rejects.toBeInstanceOf(AppError);

		await cancelBooking(db, 2, Number(bookingOne.id));

		const slot = await db.get<{ is_booked: number }>(
			'SELECT id, mentor_id, is_booked, max_participants, booking_mode, preset_topic, preset_description, start_time, duration_mins FROM availability_slots WHERE id = ? LIMIT 1',
			[10]
		);
		expect(slot?.is_booked).toBe(0);
	});

	it('rejects over-capacity requests', async () => {
		const db = createBookingTestDatabase();

		await expect(
			createBooking(db, 2, {
				availabilitySlotId: 10,
				topic: 'Team session',
				numParticipants: 3
			})
		).rejects.toMatchObject({
			status: 400,
			code: 'participants_exceeded'
		});
	});
});
