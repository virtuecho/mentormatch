import type { ActionFailure } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import type { DatabaseClient, QueryParams, QueryResult } from '@mentormatch/db';
import { serializeZonedDateTime } from '@mentormatch/shared';
import { actions } from './+page.server';

type CreateSlotActionEvent = Parameters<(typeof actions)['createSlot']>[0];

type SlotRecord = {
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
};

class MentorBookingsTestDatabase implements DatabaseClient {
	private nextSlotId = 1;
	slots: SlotRecord[] = [];

	async get<T>(sql: string, params: QueryParams = []): Promise<T | null> {
		if (
			sql.includes('FROM availability_slots') &&
			sql.includes('mentor_id = ? AND start_time = ? AND id != ?')
		) {
			const mentorId = Number(params[0]);
			const startTime = String(params[1]);
			const slotId = Number(params[2]);
			const slot = this.slots.find(
				(item) => item.mentorId === mentorId && item.startTime === startTime && item.id !== slotId
			);

			return slot ? ({ id: slot.id } as T) : null;
		}

		if (
			sql.includes('FROM availability_slots') &&
			sql.includes('mentor_id = ? AND start_time = ?')
		) {
			const mentorId = Number(params[0]);
			const startTime = String(params[1]);
			const slot = this.slots.find(
				(item) => item.mentorId === mentorId && item.startTime === startTime
			);

			return slot ? ({ id: slot.id } as T) : null;
		}

		if (sql.includes('FROM availability_slots') && sql.includes('WHERE id = ? AND mentor_id = ?')) {
			const slotId = Number(params[0]);
			const mentorId = Number(params[1]);
			const slot = this.slots.find((item) => item.id === slotId && item.mentorId === mentorId);

			return slot
				? ({
						id: slot.id,
						title: slot.title,
						booking_mode: slot.bookingMode,
						preset_topic: slot.presetTopic,
						preset_description: slot.presetDescription,
						start_time: slot.startTime,
						duration_mins: slot.durationMins,
						location_type: slot.locationType,
						city: slot.city,
						address: slot.address,
						max_participants: slot.maxParticipants,
						note: slot.note,
						is_booked: 0
					} as T)
				: null;
		}

		if (sql.includes('FROM bookings') && sql.includes("status IN ('pending', 'accepted')")) {
			return null;
		}

		throw new Error(`Unexpected get query: ${sql}`);
	}

	async all<T>(sql: string, params: QueryParams = []): Promise<T[]> {
		if (sql.includes('FROM availability_slots')) {
			const mentorId = Number(params[0]);
			return this.slots
				.filter((item) => item.mentorId === mentorId)
				.map((slot) => ({
					id: slot.id,
					title: slot.title,
					booking_mode: slot.bookingMode,
					preset_topic: slot.presetTopic,
					preset_description: slot.presetDescription,
					start_time: slot.startTime,
					duration_mins: slot.durationMins,
					location_type: slot.locationType,
					city: slot.city,
					address: slot.address,
					max_participants: slot.maxParticipants,
					note: slot.note,
					is_booked: 0
				})) as T[];
		}

		return [];
	}

	async run(sql: string, params: QueryParams = []): Promise<QueryResult> {
		if (sql.includes('INSERT INTO availability_slots')) {
			const [
				mentorId,
				title,
				bookingMode,
				presetTopic,
				presetDescription,
				startTime,
				durationMins,
				locationType,
				city,
				address,
				maxParticipants,
				note
			] = params;
			const id = this.nextSlotId++;

			this.slots.push({
				id,
				mentorId: Number(mentorId),
				title: String(title),
				bookingMode: String(bookingMode) === 'preset' ? 'preset' : 'open',
				presetTopic: presetTopic == null ? null : String(presetTopic),
				presetDescription: presetDescription == null ? null : String(presetDescription),
				startTime: String(startTime),
				durationMins: Number(durationMins),
				locationType: String(locationType),
				city: String(city),
				address: String(address),
				maxParticipants: Number(maxParticipants),
				note: note == null ? null : String(note)
			});

			return {
				changes: 1,
				lastRowId: id
			};
		}

		if (sql.includes('UPDATE availability_slots')) {
			const [
				title,
				bookingMode,
				presetTopic,
				presetDescription,
				startTime,
				durationMins,
				locationType,
				city,
				address,
				maxParticipants,
				note,
				,
				slotId,
				mentorId
			] = params;
			const slot = this.slots.find(
				(item) => item.id === Number(slotId) && item.mentorId === Number(mentorId)
			);

			if (!slot) {
				return { changes: 0, lastRowId: null };
			}

			slot.title = String(title);
			slot.bookingMode = String(bookingMode) === 'preset' ? 'preset' : 'open';
			slot.presetTopic = presetTopic == null ? null : String(presetTopic);
			slot.presetDescription = presetDescription == null ? null : String(presetDescription);
			slot.startTime = String(startTime);
			slot.durationMins = Number(durationMins);
			slot.locationType = String(locationType);
			slot.city = String(city);
			slot.address = String(address);
			slot.maxParticipants = Number(maxParticipants);
			slot.note = note == null ? null : String(note);

			return { changes: 1, lastRowId: null };
		}

		throw new Error(`Unexpected run query: ${sql}`);
	}

	async batch(statements: Array<{ sql: string; params?: QueryParams }>): Promise<QueryResult[]> {
		const snapshot = this.slots.map((slot) => ({ ...slot }));

		try {
			const results: QueryResult[] = [];
			for (const statement of statements) {
				results.push(await this.run(statement.sql, statement.params ?? []));
			}
			return results;
		} catch (error) {
			this.slots = snapshot;
			throw error;
		}
	}
}

function createLocals(db = new MentorBookingsTestDatabase()): App.Locals {
	return {
		db,
		authSecret: 'test-secret',
		user: {
			id: 7,
			email: 'mentor@example.com',
			role: 'mentor',
			isMentorApproved: true,
			fullName: 'Mentor Match',
			profileImageUrl: ''
		}
	};
}

function createRequest(fields: Record<string, string>) {
	const form = new FormData();
	const baseFields = {
		title: 'Career planning session',
		bookingMode: 'open',
		repeatRule: 'once',
		startTimeLocal: '2026-03-31T09:30',
		timeZone: 'Asia/Shanghai',
		durationMins: '60',
		locationType: 'online',
		city: 'Shanghai',
		address: 'https://meet.google.com/demo',
		maxParticipants: '2',
		note: 'Bring your questions'
	};

	for (const [key, value] of Object.entries({ ...baseFields, ...fields })) {
		form.set(key, value);
	}

	return new Request('http://localhost:5173/mentor-bookings', {
		method: 'POST',
		body: form
	});
}

describe('mentor bookings page actions', () => {
	it('creates a single availability slot from local date-time input and an explicit time zone', async () => {
		const db = new MentorBookingsTestDatabase();

		const result = await actions.createSlot({
			request: createRequest({}),
			locals: createLocals(db)
		} as unknown as CreateSlotActionEvent);

		expect(result).toMatchObject({
			success: true,
			message: 'Session created'
		});
		expect(db.slots).toHaveLength(1);
		expect(db.slots[0]?.startTime).toBe(
			serializeZonedDateTime('2026-03-31T09:30', 'Asia/Shanghai')
		);
	});

	it('creates recurring weekly slots with preset agenda details', async () => {
		const db = new MentorBookingsTestDatabase();

		const result = await actions.createSlot({
			request: createRequest({
				bookingMode: 'preset',
				presetTopic: 'Weekly career clinic',
				presetDescription: 'We will review one real career blocker each week.',
				repeatRule: 'weekly',
				repeatCount: '3'
			}),
			locals: createLocals(db)
		} as unknown as CreateSlotActionEvent);

		expect(result).toMatchObject({
			success: true,
			message: '3 recurring sessions created'
		});
		expect(db.slots).toHaveLength(3);
		expect(db.slots.map((slot) => slot.startTime)).toEqual([
			serializeZonedDateTime('2026-03-31T09:30', 'Asia/Shanghai'),
			serializeZonedDateTime('2026-04-07T09:30', 'Asia/Shanghai'),
			serializeZonedDateTime('2026-04-14T09:30', 'Asia/Shanghai')
		]);
		expect(db.slots.every((slot) => slot.bookingMode === 'preset')).toBe(true);
		expect(db.slots.every((slot) => slot.presetTopic === 'Weekly career clinic')).toBe(true);
	});

	it('creates weekday recurring slots by skipping weekends', async () => {
		const db = new MentorBookingsTestDatabase();

		const result = await actions.createSlot({
			request: createRequest({
				startTimeLocal: '2026-04-03T09:30',
				repeatRule: 'weekdays',
				repeatCount: '3'
			}),
			locals: createLocals(db)
		} as unknown as CreateSlotActionEvent);

		expect(result).toMatchObject({
			success: true,
			message: '3 recurring sessions created'
		});
		expect(db.slots.map((slot) => slot.startTime)).toEqual([
			serializeZonedDateTime('2026-04-03T09:30', 'Asia/Shanghai'),
			serializeZonedDateTime('2026-04-06T09:30', 'Asia/Shanghai'),
			serializeZonedDateTime('2026-04-07T09:30', 'Asia/Shanghai')
		]);
	});

	it('updates a single published slot without touching the rest of the series', async () => {
		const db = new MentorBookingsTestDatabase();

		await actions.createSlot({
			request: createRequest({
				repeatRule: 'weekly',
				repeatCount: '2'
			}),
			locals: createLocals(db)
		} as unknown as CreateSlotActionEvent);

		const result = await actions.updateSlot({
			request: createRequest({
				slotId: '2',
				title: 'Adjusted follow-up session',
				startTimeLocal: '2026-04-08T11:00',
				timeZone: 'Asia/Shanghai',
				durationMins: '45',
				maxParticipants: '4',
				city: 'Beijing',
				address: 'Room 301'
			}),
			locals: createLocals(db)
		} as unknown as Parameters<(typeof actions)['updateSlot']>[0]);

		expect(result).toMatchObject({
			success: true,
			message: 'Session updated'
		});
		expect(db.slots).toHaveLength(2);
		expect(db.slots[0]?.startTime).toBe(
			serializeZonedDateTime('2026-03-31T09:30', 'Asia/Shanghai')
		);
		expect(db.slots[1]).toMatchObject({
			title: 'Adjusted follow-up session',
			startTime: serializeZonedDateTime('2026-04-08T11:00', 'Asia/Shanghai'),
			durationMins: 45,
			maxParticipants: 4,
			city: 'Beijing',
			address: 'Room 301'
		});
	});

	it('returns a 400 failure when the submitted time zone is invalid', async () => {
		const result = (await actions.createSlot({
			request: createRequest({
				timeZone: 'Mars/Olympus_Mons'
			}),
			locals: createLocals()
		} as unknown as CreateSlotActionEvent)) as ActionFailure<{ message: string }>;

		expect(result.status).toBe(400);
		expect(result.data.message).toMatch(/valid start time and time zone/i);
	});
});
