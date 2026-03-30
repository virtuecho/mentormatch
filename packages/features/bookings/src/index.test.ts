import { describe, expect, it } from 'vitest';
import type { DatabaseClient, QueryParams, QueryResult } from '@mentormatch/db';
import { AppError, type BookingStatus } from '@mentormatch/shared';
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
			if (!slot) return null;

			if (sql.includes('mentor_id = ?')) {
				const mentorId = Number(params[1]);
				if (slot.mentorId !== mentorId) return null;
				return {
					id: slot.id,
					title: slot.title,
					start_time: slot.startTime,
					duration_mins: slot.durationMins,
					location_type: slot.locationType,
					city: slot.city,
					address: slot.address,
					max_participants: slot.maxParticipants,
					note: slot.note,
					is_booked: slot.isBooked
				} as T;
			}

			return {
				id: slot.id,
				mentor_id: slot.mentorId,
				is_booked: slot.isBooked,
				max_participants: slot.maxParticipants
			} as T;
		}

		if (sql.includes('SELECT id, mentee_id, mentor_id FROM bookings')) {
			const booking = this.bookings.find((item) => item.id === Number(params[0]));
			return booking
				? ({ id: booking.id, mentee_id: booking.menteeId, mentor_id: booking.mentorId } as T)
				: null;
		}

		if (sql.includes('SELECT id, mentor_id, availability_slot_id, status FROM bookings')) {
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
		if (sql.includes('FROM bookings b')) {
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
						counterpart_id: counterpart.id,
						counterpart_name: counterpart.fullName,
						counterpart_image: counterpart.profileImageUrl,
						counterpart_email: counterpart.email
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

		if (sql.includes("UPDATE bookings SET status = 'cancelled'")) {
			const booking = this.bookings.find((item) => item.id === Number(params[1]));
			if (booking) {
				booking.status = 'cancelled';
				booking.updatedAt = String(params[0]);
			}
			return { changes: booking ? 1 : 0, lastRowId: null };
		}

		if (sql.includes('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?')) {
			const booking = this.bookings.find((item) => item.id === Number(params[2]));
			if (booking) {
				booking.status = params[0] as BookingStatus;
				booking.updatedAt = String(params[1]);
			}
			return { changes: booking ? 1 : 0, lastRowId: null };
		}

		if (sql.includes('UPDATE availability_slots SET is_booked = 1')) {
			const slot = this.slots.find((item) => item.id === Number(params[1]));
			if (slot) {
				slot.isBooked = 1;
				slot.updatedAt = String(params[0]);
			}
			return { changes: slot ? 1 : 0, lastRowId: null };
		}

		if (sql.includes('UPDATE availability_slots SET is_booked = 0')) {
			const booking = this.bookings.find((item) => item.id === Number(params[1]));
			const slot = booking ? this.slots.find((item) => item.id === booking.availabilitySlotId) : undefined;
			if (slot) {
				slot.isBooked = 0;
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
		}
	];

	const slots: Slot[] = [
		{
			id: 10,
			mentorId: 1,
			title: 'Career coaching session',
			startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
			durationMins: 60,
			locationType: 'online',
			city: 'Remote',
			address: 'Video call',
			maxParticipants: 2,
			note: 'Bring questions',
			isBooked: 0,
			updatedAt: new Date().toISOString()
		}
	];

	return new BookingTestDatabase(users, slots);
}

describe('feature-bookings', () => {
	it('creates a booking and lists it for the mentee', async () => {
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
			counterpart: {
				fullName: 'Mentor One'
			}
		});
	});

	it('accepts and cancels bookings while keeping slot state in sync', async () => {
		const db = createBookingTestDatabase();

		const booking = await createBooking(db, 2, {
			availabilitySlotId: 10,
			topic: 'Portfolio review',
			numParticipants: 1
		});

		const accepted = await respondToBooking(db, 1, booking.id!, { response: 'accepted' });
		expect(accepted.status).toBe('accepted');

		const acceptedSlot = await db.get<{ is_booked: number }>(
			'SELECT id, mentor_id, is_booked, max_participants FROM availability_slots WHERE id = ? LIMIT 1',
			[10]
		);
		expect(acceptedSlot?.is_booked).toBe(1);

		const cancelled = await cancelBooking(db, 2, booking.id!);
		expect(cancelled).toEqual({ ok: true });

		const reopenedSlot = await db.get<{ is_booked: number }>(
			'SELECT id, mentor_id, is_booked, max_participants FROM availability_slots WHERE id = ? LIMIT 1',
			[10]
		);
		expect(reopenedSlot?.is_booked).toBe(0);
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
