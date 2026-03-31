import { fail } from '@sveltejs/kit';
import {
	createAvailabilitySlot,
	deleteAvailabilitySlot,
	getMyAvailability
} from '@mentormatch/feature-availability';
import { cancelBooking, listBookings, respondToBooking } from '@mentormatch/feature-bookings';
import { AppError, serializeLocalDateTime, serializeZonedDateTime } from '@mentormatch/shared';
import {
	getFormError,
	handleApiError,
	requireApprovedMentor,
	requireDatabase
} from '$lib/server/http';

type AvailabilitySlotRow = {
	id: number;
	title: string | null;
	booking_mode: 'open' | 'preset';
	preset_topic: string | null;
	preset_description: string | null;
	start_time: string;
	duration_mins: number;
	location_type: string;
	city: string;
	address: string;
	max_participants: number;
	note: string | null;
	is_booked: number | boolean;
};

function addWeeksToLocalDateTime(value: string, weeksToAdd: number) {
	const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());

	if (!match) {
		return null;
	}

	const [, year, month, day, hour, minute] = match;
	const localDate = new Date(
		Date.UTC(
			Number(year),
			Number(month) - 1,
			Number(day) + weeksToAdd * 7,
			Number(hour),
			Number(minute)
		)
	);

	return `${localDate.getUTCFullYear()}-${String(localDate.getUTCMonth() + 1).padStart(2, '0')}-${String(
		localDate.getUTCDate()
	).padStart(2, '0')}T${String(localDate.getUTCHours()).padStart(2, '0')}:${String(
		localDate.getUTCMinutes()
	).padStart(2, '0')}`;
}

export async function load({ locals }) {
	const user = requireApprovedMentor(locals);
	const db = requireDatabase(locals);
	const availability = (await getMyAvailability(db, user.id)) as AvailabilitySlotRow[];

	return {
		bookings: await listBookings(db, user.id, 'mentor'),
		slots: availability.map((slot) => ({
			id: slot.id,
			title: slot.title,
			bookingMode: slot.booking_mode,
			presetTopic: slot.preset_topic,
			presetDescription: slot.preset_description,
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
					section: 'respond',
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
					section: 'cancel',
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
		const db = requireDatabase(locals);
		const form = await request.formData();
		const submittedStartTime = String(form.get('startTime') ?? '').trim();
		const submittedLocalStartTime = String(form.get('startTimeLocal') ?? '').trim();
		const submittedTimeZone = String(form.get('timeZone') ?? '').trim();
		const bookingMode = String(form.get('bookingMode') ?? 'open').trim();
		const repeatWeekly = String(form.get('repeatWeekly') ?? '').trim() === 'weekly';
		const rawRepeatCount = Number(form.get('repeatCount') ?? 1);
		const repeatCount =
			repeatWeekly && Number.isFinite(rawRepeatCount)
				? Math.min(Math.max(Math.trunc(rawRepeatCount), 2), 26)
				: 1;
		const rawTimezoneOffset = String(form.get('timezoneOffsetMinutes') ?? '').trim();
		const timezoneOffsetMinutes = rawTimezoneOffset ? Number(rawTimezoneOffset) : Number.NaN;
		const localStartTimes = Array.from({ length: repeatCount }, (_, index) =>
			addWeeksToLocalDateTime(submittedLocalStartTime, index)
		);
		const startTimes = localStartTimes.map((localStartTime, index) => {
			if (!localStartTime) {
				return '';
			}

			return (
				serializeZonedDateTime(localStartTime, submittedTimeZone) ||
				(index === 0
					? submittedStartTime ||
						serializeLocalDateTime(localStartTime, timezoneOffsetMinutes) ||
						''
					: '')
			);
		});

		if (startTimes.some((startTime) => !startTime)) {
			return fail(400, {
				section: 'createSlot',
				message: 'Please choose a valid start time and time zone'
			});
		}

		try {
			const existingSlots = (await getMyAvailability(db, user.id)) as AvailabilitySlotRow[];
			const existingStartTimes = new Set(existingSlots.map((slot) => slot.start_time));

			for (const startTime of startTimes) {
				if (existingStartTimes.has(startTime)) {
					return fail(409, {
						section: 'createSlot',
						message: 'You already have a slot at one of the selected weekly times.'
					});
				}
			}

			for (const startTime of startTimes) {
				await createAvailabilitySlot(db, user.id, {
					title: String(form.get('title') ?? '').trim() || 'Mentorship Session',
					bookingMode: bookingMode === 'preset' ? 'preset' : 'open',
					presetTopic: String(form.get('presetTopic') ?? '').trim() || null,
					presetDescription: String(form.get('presetDescription') ?? '').trim() || null,
					startTime,
					durationMins: Number(form.get('durationMins')),
					locationType: String(form.get('locationType') ?? 'in_person'),
					city: String(form.get('city') ?? '').trim(),
					address: String(form.get('address') ?? '').trim(),
					maxParticipants: Number(form.get('maxParticipants') ?? 2),
					note: String(form.get('note') ?? '').trim() || null
				});
			}

			return {
				success: true,
				section: 'createSlot',
				message:
					startTimes.length > 1
						? `${startTimes.length} weekly availability slots created`
						: 'Availability slot created'
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					section: 'createSlot',
					message: error.message
				});
			}

			const formError = getFormError(error, 'Unable to create the availability slot right now');
			if (formError.status >= 500) {
				handleApiError(error);
			}
			return fail(formError.status, {
				section: 'createSlot',
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
				section: 'deleteSlot',
				slotId,
				message: 'Availability slot deleted'
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					section: 'deleteSlot',
					slotId,
					message: error.message
				});
			}

			handleApiError(error);
			return fail(500, {
				section: 'deleteSlot',
				slotId,
				message: 'Unable to delete the slot right now'
			});
		}
	}
};
