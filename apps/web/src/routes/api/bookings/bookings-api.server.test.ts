import { describe, expect, it } from 'vitest';
import type { DatabaseClient, QueryResult } from '@mentormatch/db';
import { GET as bookingsGet, POST as bookingsPost } from './+server';
import { GET as bookingHistoryGet } from './history/+server';
import { POST as cancelBookingPost } from './[id]/cancel/+server';

class BookingApiTestDatabase implements DatabaseClient {
	async get<T>(): Promise<T | null> {
		return null;
	}

	async all<T>(): Promise<T[]> {
		return [];
	}

	async run(): Promise<QueryResult> {
		return { changes: 0, lastRowId: null };
	}

	async batch(): Promise<QueryResult[]> {
		return [];
	}
}

function createLocals(role: 'admin' | 'mentee' | 'mentor'): App.Locals {
	return {
		db: new BookingApiTestDatabase(),
		authSecret: 'test-secret',
		requestId: 'test-request-id',
		user: {
			id: 1,
			email: `${role}@example.com`,
			role,
			isMentorApproved: role === 'mentor',
			fullName: `${role} user`,
			profileImageUrl: ''
		}
	};
}

describe('booking API authorization', () => {
	it('blocks admins from listing bookings', async () => {
		const response = await bookingsGet({
			url: new URL('http://localhost:5173/api/bookings?role=mentee'),
			locals: createLocals('admin')
		} as Parameters<typeof bookingsGet>[0]);

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toMatchObject({
			ok: false,
			code: 'forbidden'
		});
	});

	it('blocks admins from creating bookings', async () => {
		const response = await bookingsPost({
			request: new Request('http://localhost:5173/api/bookings', {
				method: 'POST',
				body: JSON.stringify({
					availabilitySlotId: 1,
					topic: 'Career guidance',
					numParticipants: 1
				}),
				headers: {
					'content-type': 'application/json'
				}
			}),
			locals: createLocals('admin')
		} as Parameters<typeof bookingsPost>[0]);

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toMatchObject({
			ok: false,
			code: 'forbidden'
		});
	});

	it('blocks admins from loading booking history', async () => {
		const response = await bookingHistoryGet({
			url: new URL('http://localhost:5173/api/bookings/history?role=mentor'),
			locals: createLocals('admin')
		} as Parameters<typeof bookingHistoryGet>[0]);

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toMatchObject({
			ok: false,
			code: 'forbidden'
		});
	});

	it('blocks admins from cancelling bookings', async () => {
		const response = await cancelBookingPost({
			params: { id: '7' },
			locals: createLocals('admin')
		} as Parameters<typeof cancelBookingPost>[0]);

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toMatchObject({
			ok: false,
			code: 'forbidden'
		});
	});

	it('still allows members to list their bookings', async () => {
		const response = await bookingsGet({
			url: new URL('http://localhost:5173/api/bookings?role=mentee'),
			locals: createLocals('mentee')
		} as Parameters<typeof bookingsGet>[0]);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			ok: true,
			bookings: []
		});
	});
});
