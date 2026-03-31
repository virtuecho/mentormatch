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
		if (sql.includes('FROM availability_slots') && sql.includes('WHERE id = ? AND mentor_id = ?')) {
			const slotId = Number(params[0]);
			const mentorId = Number(params[1]);
			const slot = this.slots.find((item) => item.id === slotId && item.mentorId === mentorId);

			return slot
				? ({
						id: slot.id,
						title: slot.title,
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

		throw new Error(`Unexpected get query: ${sql}`);
	}

	async all<T>(): Promise<T[]> {
		return [];
	}

	async run(sql: string, params: QueryParams = []): Promise<QueryResult> {
		if (sql.includes('INSERT INTO availability_slots')) {
			const [
				mentorId,
				title,
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

		throw new Error(`Unexpected run query: ${sql}`);
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
	it('creates an availability slot from local date-time input and an explicit time zone', async () => {
		const db = new MentorBookingsTestDatabase();

		const result = await actions.createSlot({
			request: createRequest({}),
			locals: createLocals(db)
		} as unknown as CreateSlotActionEvent);

		expect(result).toMatchObject({
			success: true,
			message: 'Availability slot created'
		});
		expect(db.slots).toHaveLength(1);
		expect(db.slots[0]?.startTime).toBe(
			serializeZonedDateTime('2026-03-31T09:30', 'Asia/Shanghai')
		);
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
