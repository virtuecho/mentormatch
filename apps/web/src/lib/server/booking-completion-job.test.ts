import { describe, expect, it } from 'vitest';
import type { DatabaseClient, QueryParams, QueryResult } from '@mentormatch/db';
import { completeDueBookingsJob } from './booking-completion-job';

class CompletionJobTestDatabase implements DatabaseClient {
	lastRun:
		| {
				sql: string;
				params: QueryParams;
		  }
		| undefined;

	async get<T>(): Promise<T | null> {
		throw new Error('Unexpected get query');
	}

	async all<T>(): Promise<T[]> {
		throw new Error('Unexpected all query');
	}

	async run(sql: string, params: QueryParams = []): Promise<QueryResult> {
		this.lastRun = { sql, params };
		return { changes: 3, lastRowId: null };
	}

	async batch(): Promise<QueryResult[]> {
		throw new Error('Unexpected batch query');
	}
}

describe('booking completion job', () => {
	it('uses the scheduled timestamp when completing overdue bookings', async () => {
		const db = new CompletionJobTestDatabase();
		const scheduledTime = Date.UTC(2026, 3, 3, 5, 30, 0);

		const result = await completeDueBookingsJob(db, scheduledTime);

		expect(result).toEqual({ count: 3 });
		expect(db.lastRun?.sql).toContain('UPDATE bookings');
		expect(db.lastRun?.params).toEqual(['2026-04-03T05:30:00.000Z', '2026-04-03T05:30:00.000Z']);
	});
});
