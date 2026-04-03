import { createD1Client, type DatabaseClient } from '@mentormatch/db';
import { completeDueAcceptedBookings } from '@mentormatch/feature-bookings';

type ScheduledBookingEnv = {
	DB: Parameters<typeof createD1Client>[0];
};

function resolveNowIso(scheduledTime?: number) {
	return typeof scheduledTime === 'number'
		? new Date(scheduledTime).toISOString()
		: new Date().toISOString();
}

export async function completeDueBookingsJob(db: DatabaseClient, scheduledTime?: number) {
	return completeDueAcceptedBookings(db, resolveNowIso(scheduledTime));
}

export async function runScheduledBookingCompletion(
	env: ScheduledBookingEnv,
	scheduledTime?: number
) {
	return completeDueBookingsJob(createD1Client(env.DB), scheduledTime);
}
