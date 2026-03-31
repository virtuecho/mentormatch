import { fail } from '@sveltejs/kit';
import {
	createAvailabilitySlot,
	deleteAvailabilitySlot,
	getMyAvailability
} from '@mentormatch/feature-availability';
import { cancelBooking, listBookings, respondToBooking } from '@mentormatch/feature-bookings';
import { AppError, serializeLocalDateTime } from '@mentormatch/shared';
import {
	getFormError,
	handleApiError,
	requireApprovedMentor,
	requireDatabase
} from '$lib/server/http';

type AvailabilitySlotRow = {
	id: number;
	title: string | null;
	start_time: string;
	duration_mins: number;
	location_type: string;
	city: string;
	address: string;
	max_participants: number;
	note: string | null;
	is_booked: number | boolean;
};

export async function load({ locals }) {
	const user = requireApprovedMentor(locals);
	const db = requireDatabase(locals);
	const availability = (await getMyAvailability(db, user.id)) as AvailabilitySlotRow[];

	return {
		bookings: await listBookings(db, user.id, 'mentor'),
		slots: availability.map((slot) => ({
			id: slot.id,
			title: slot.title,
			startTime: slot.start_time,
			durationMins: slot.duration_mins,
			locationType: slot.location_type,
			city: slot.city,
			address: slot.address,
			maxParticipants: slot.max_participants,
			note: slot.note,
			isBooked: Boolean(slot.is_booked)
		}))
	};
}

export const actions = {
	respond: async ({ request, locals }) => {
		const user = requireApprovedMentor(locals);
		const form = await request.formData();
		const bookingId = Number(form.get('bookingId'));
		const response = String(form.get('response') ?? '');

		try {
			const result = await respondToBooking(requireDatabase(locals), user.id, bookingId, {
				response
			});

			return {
				success: true,
				message: `Booking ${result.status}`
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					message: error.message
				});
			}

			handleApiError(error);
			return fail(500, {
				message: 'Unable to update the booking right now'
			});
		}
	},
	cancel: async ({ request, locals }) => {
		const user = requireApprovedMentor(locals);
		const form = await request.formData();
		const bookingId = Number(form.get('bookingId'));

		try {
			await cancelBooking(requireDatabase(locals), user.id, bookingId);
			return {
				success: true,
				message: 'Accepted booking cancelled'
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					message: error.message
				});
			}

			handleApiError(error);
			return fail(500, {
				message: 'Unable to cancel the booking right now'
			});
		}
	},
	createSlot: async ({ request, locals }) => {
		const user = requireApprovedMentor(locals);
		const form = await request.formData();
		const submittedStartTime = String(form.get('startTime') ?? '').trim();
		const submittedLocalStartTime = String(form.get('startTimeLocal') ?? '').trim();
		const rawTimezoneOffset = String(form.get('timezoneOffsetMinutes') ?? '').trim();
		const timezoneOffsetMinutes = rawTimezoneOffset ? Number(rawTimezoneOffset) : Number.NaN;
		const startTime =
			submittedStartTime ||
			serializeLocalDateTime(submittedLocalStartTime, timezoneOffsetMinutes) ||
			'';

		if (!startTime) {
			return fail(400, {
				message: 'Please choose a valid start time and timezone'
			});
		}

		try {
			await createAvailabilitySlot(requireDatabase(locals), user.id, {
				title: String(form.get('title') ?? '').trim() || 'Mentorship Session',
				startTime,
				durationMins: Number(form.get('durationMins')),
				locationType: String(form.get('locationType') ?? 'in_person'),
				city: String(form.get('city') ?? '').trim(),
				address: String(form.get('address') ?? '').trim(),
				maxParticipants: Number(form.get('maxParticipants') ?? 2),
				note: String(form.get('note') ?? '').trim() || null
			});

			return {
				success: true,
				message: 'Availability slot created'
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					message: error.message
				});
			}

			const formError = getFormError(error, 'Unable to create the availability slot right now');
			if (formError.status >= 500) {
				handleApiError(error);
			}
			return fail(formError.status, {
				message: formError.message
			});
		}
	},
	deleteSlot: async ({ request, locals }) => {
		const user = requireApprovedMentor(locals);
		const form = await request.formData();
		const slotId = Number(form.get('slotId'));

		try {
			await deleteAvailabilitySlot(requireDatabase(locals), user.id, slotId);
			return {
				success: true,
				message: 'Availability slot deleted'
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					message: error.message
				});
			}

			handleApiError(error);
			return fail(500, {
				message: 'Unable to delete the slot right now'
			});
		}
	}
};
