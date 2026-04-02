import { fail } from '@sveltejs/kit';
import {
	createAvailabilitySlot,
	deleteAvailabilitySlot,
	getMyAvailability,
	updateAvailabilitySlot
} from '@mentormatch/feature-availability';
import {
	cancelBooking,
	completeBooking,
	listBookings,
	respondToBooking
} from '@mentormatch/feature-bookings';
import {
	AppError,
	formatLabel,
	serializeLocalDateTime,
	serializeZonedDateTime
} from '@mentormatch/shared';
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
	current_booking_id: number | null;
	current_booking_status: 'accepted' | 'completed' | null;
};

type RepeatRule = 'once' | 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly';

type LocalDateTimeParts = {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
};

function parseRepeatRule(value: string): RepeatRule {
	const normalized = value.trim();
	return normalized === 'daily' ||
		normalized === 'weekdays' ||
		normalized === 'weekly' ||
		normalized === 'biweekly' ||
		normalized === 'monthly'
		? normalized
		: 'once';
}

function parseLocalDateTime(value: string): LocalDateTimeParts | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());

	if (!match) {
		return null;
	}

	const [, year, month, day, hour, minute] = match;
	return {
		year: Number(year),
		month: Number(month),
		day: Number(day),
		hour: Number(hour),
		minute: Number(minute)
	};
}

function formatLocalDateTime(parts: LocalDateTimeParts) {
	return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}T${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

function addDays(parts: LocalDateTimeParts, daysToAdd: number): LocalDateTimeParts {
	const next = new Date(
		Date.UTC(parts.year, parts.month - 1, parts.day + daysToAdd, parts.hour, parts.minute)
	);

	return {
		year: next.getUTCFullYear(),
		month: next.getUTCMonth() + 1,
		day: next.getUTCDate(),
		hour: next.getUTCHours(),
		minute: next.getUTCMinutes()
	};
}

function daysInMonth(year: number, month: number) {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addMonths(parts: LocalDateTimeParts, monthsToAdd: number): LocalDateTimeParts {
	const monthIndex = parts.month - 1 + monthsToAdd;
	const year = parts.year + Math.floor(monthIndex / 12);
	const month = (((monthIndex % 12) + 12) % 12) + 1;
	const day = Math.min(parts.day, daysInMonth(year, month));

	return {
		year,
		month,
		day,
		hour: parts.hour,
		minute: parts.minute
	};
}

function isWeekend(parts: LocalDateTimeParts) {
	const dayOfWeek = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
	return dayOfWeek === 0 || dayOfWeek === 6;
}

function buildRecurringLocalStartTimes(
	startTimeLocal: string,
	repeatRule: RepeatRule,
	repeatCount: number
) {
	const first = parseLocalDateTime(startTimeLocal);

	if (!first) {
		return [];
	}

	const occurrences = [first];

	while (occurrences.length < repeatCount) {
		const previous = occurrences[occurrences.length - 1];
		let next: LocalDateTimeParts;

		switch (repeatRule) {
			case 'daily':
				next = addDays(previous, 1);
				break;
			case 'weekdays':
				next = addDays(previous, 1);
				while (isWeekend(next)) {
					next = addDays(next, 1);
				}
				break;
			case 'weekly':
				next = addDays(previous, 7);
				break;
			case 'biweekly':
				next = addDays(previous, 14);
				break;
			case 'monthly':
				next = addMonths(previous, 1);
				break;
			default:
				return [formatLocalDateTime(first)];
		}

		occurrences.push(next);
	}

	return occurrences.map(formatLocalDateTime);
}

export async function load({ locals, url }) {
	const user = requireApprovedMentor(locals);
	const db = requireDatabase(locals);
	const availability = (await getMyAvailability(db, user.id)) as AvailabilitySlotRow[];
	const slots = availability.map((slot) => ({
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
		isBooked: Boolean(slot.is_booked),
		currentBookingId: slot.current_booking_id ? Number(slot.current_booking_id) : null,
		bookingStatus: slot.current_booking_status
	}));
	const editingSlotId = Number(url.searchParams.get('editSlotId') ?? 0);
	const editableSlots = slots.filter((slot) => !slot.isBooked);

	return {
		bookings: await listBookings(db, user.id, 'mentor'),
		slots,
		editingSlot:
			Number.isInteger(editingSlotId) && editingSlotId > 0
				? (editableSlots.find((slot) => slot.id === editingSlotId) ?? null)
				: null
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
				section: 'respond',
				bookingId,
				message: `Booking ${formatLabel(result.status)}`
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					section: 'respond',
					bookingId,
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
				section: 'cancel',
				bookingId,
				message: 'Session cancelled'
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					section: 'cancel',
					bookingId,
					message: error.message
				});
			}

			handleApiError(error);
			return fail(500, {
				section: 'cancel',
				bookingId,
				message: 'Unable to cancel the booking right now'
			});
		}
	},
	complete: async ({ request, locals }) => {
		const user = requireApprovedMentor(locals);
		const form = await request.formData();
		const bookingId = Number(form.get('bookingId'));

		try {
			await completeBooking(requireDatabase(locals), user.id, bookingId);
			return {
				success: true,
				section: 'complete',
				bookingId,
				message: 'Session marked complete'
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					section: 'complete',
					bookingId,
					message: error.message
				});
			}

			handleApiError(error);
			return fail(500, {
				section: 'complete',
				bookingId,
				message: 'Unable to complete the session right now'
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
		const repeatRule = parseRepeatRule(String(form.get('repeatRule') ?? 'once'));
		const rawRepeatCount = Number(form.get('repeatCount') ?? 1);
		const repeatCount =
			repeatRule !== 'once' && Number.isFinite(rawRepeatCount)
				? Math.min(Math.max(Math.trunc(rawRepeatCount), 2), 30)
				: 1;
		const rawTimezoneOffset = String(form.get('timezoneOffsetMinutes') ?? '').trim();
		const timezoneOffsetMinutes = rawTimezoneOffset ? Number(rawTimezoneOffset) : Number.NaN;
		const localStartTimes = buildRecurringLocalStartTimes(
			submittedLocalStartTime,
			repeatRule,
			repeatCount
		);
		const startTimes = localStartTimes.map((localStartTime, index) => {
			return (
				serializeZonedDateTime(localStartTime, submittedTimeZone) ||
				(index === 0
					? submittedStartTime ||
						serializeLocalDateTime(localStartTime, timezoneOffsetMinutes) ||
						''
					: '')
			);
		});

		if (startTimes.length !== repeatCount || startTimes.some((startTime) => !startTime)) {
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
						message: 'You already have a slot at one of the selected times.'
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
						? `${startTimes.length} recurring sessions created`
						: 'Session created'
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
	updateSlot: async ({ request, locals }) => {
		const user = requireApprovedMentor(locals);
		const db = requireDatabase(locals);
		const form = await request.formData();
		const slotId = Number(form.get('slotId') ?? 0);
		const submittedStartTime = String(form.get('startTime') ?? '').trim();
		const submittedLocalStartTime = String(form.get('startTimeLocal') ?? '').trim();
		const submittedTimeZone = String(form.get('timeZone') ?? '').trim();
		const rawTimezoneOffset = String(form.get('timezoneOffsetMinutes') ?? '').trim();
		const timezoneOffsetMinutes = rawTimezoneOffset ? Number(rawTimezoneOffset) : Number.NaN;
		const startTime =
			serializeZonedDateTime(submittedLocalStartTime, submittedTimeZone) ||
			submittedStartTime ||
			serializeLocalDateTime(submittedLocalStartTime, timezoneOffsetMinutes) ||
			'';

		if (!startTime) {
			return fail(400, {
				section: 'updateSlot',
				slotId,
				message: 'Please choose a valid start time and time zone'
			});
		}

		try {
			await updateAvailabilitySlot(db, user.id, slotId, {
				title: String(form.get('title') ?? '').trim() || 'Mentorship Session',
				bookingMode:
					String(form.get('bookingMode') ?? 'open').trim() === 'preset' ? 'preset' : 'open',
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

			return {
				success: true,
				section: 'updateSlot',
				slotId,
				message: 'Session updated'
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					section: 'updateSlot',
					slotId,
					message: error.message
				});
			}

			const formError = getFormError(error, 'Unable to update the session right now');
			if (formError.status >= 500) {
				handleApiError(error);
			}

			return fail(formError.status, {
				section: 'updateSlot',
				slotId,
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
				message: 'Availability removed'
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
