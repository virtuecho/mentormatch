import type { DatabaseClient } from '@mentormatch/db';
import {
	createAvailabilitySeries,
	deleteAvailabilitySlot,
	getHostedAvailability,
	updateAvailabilitySlotFromLocalInput
} from '@mentormatch/feature-availability';
import {
	cancelBooking,
	completeBooking,
	listBookings,
	respondToBooking
} from '@mentormatch/feature-bookings';
import { formatLabel } from '@mentormatch/shared';
import { failWithFormError } from '$lib/server/http';
import {
	getFormNumber,
	getOptionalTrimmedFormString,
	getTrimmedFormString
} from '$lib/server/form';

type MentorUser = NonNullable<App.Locals['user']>;
type AppDatabase = DatabaseClient;

function getEditableSlotId(url: URL) {
	const editingSlotId = Number(url.searchParams.get('editSlotId') ?? 0);
	return Number.isInteger(editingSlotId) && editingSlotId > 0 ? editingSlotId : null;
}

export async function loadMentorBookingsPage(db: DatabaseClient, mentorId: number, url: URL) {
	const slots = await getHostedAvailability(db, mentorId);
	const editableSlotId = getEditableSlotId(url);

	return {
		bookings: await listBookings(db, mentorId, 'mentor'),
		slots,
		editingSlot:
			editableSlotId == null
				? null
				: (slots.find((slot) => slot.id === editableSlotId && !slot.isBooked) ?? null)
	};
}

export async function handleRespondBookingAction(
	db: AppDatabase,
	user: MentorUser,
	form: FormData
) {
	const bookingId = getFormNumber(form, 'bookingId');

	try {
		const result = await respondToBooking(db, user.id, bookingId, {
			response: getTrimmedFormString(form, 'response')
		});

		return {
			success: true,
			section: 'respond',
			bookingId,
			message: `Booking ${formatLabel(result.status)}`
		};
	} catch (error) {
		return failWithFormError(error, 'Unable to update the booking right now', {
			section: 'respond',
			bookingId
		});
	}
}

export async function handleCancelBookingAction(db: AppDatabase, user: MentorUser, form: FormData) {
	const bookingId = getFormNumber(form, 'bookingId');

	try {
		await cancelBooking(db, user.id, bookingId);
		return {
			success: true,
			section: 'cancel',
			bookingId,
			message: 'Session cancelled'
		};
	} catch (error) {
		return failWithFormError(error, 'Unable to cancel the booking right now', {
			section: 'cancel',
			bookingId
		});
	}
}

export async function handleCompleteBookingAction(
	db: AppDatabase,
	user: MentorUser,
	form: FormData
) {
	const bookingId = getFormNumber(form, 'bookingId');

	try {
		await completeBooking(db, user.id, bookingId);
		return {
			success: true,
			section: 'complete',
			bookingId,
			message: 'Session marked complete'
		};
	} catch (error) {
		return failWithFormError(error, 'Unable to complete the session right now', {
			section: 'complete',
			bookingId
		});
	}
}

export async function handleCreateSlotAction(db: AppDatabase, user: MentorUser, form: FormData) {
	try {
		const result = await createAvailabilitySeries(db, user.id, {
			title: getTrimmedFormString(form, 'title'),
			bookingMode: getTrimmedFormString(form, 'bookingMode'),
			presetTopic: getOptionalTrimmedFormString(form, 'presetTopic'),
			presetDescription: getOptionalTrimmedFormString(form, 'presetDescription'),
			startTimeLocal: getTrimmedFormString(form, 'startTimeLocal'),
			timeZone: getTrimmedFormString(form, 'timeZone'),
			timezoneOffsetMinutes: getFormNumber(form, 'timezoneOffsetMinutes'),
			repeatRule: getTrimmedFormString(form, 'repeatRule'),
			repeatCount: getFormNumber(form, 'repeatCount', 1),
			durationMins: getFormNumber(form, 'durationMins'),
			locationType: getTrimmedFormString(form, 'locationType'),
			city: getTrimmedFormString(form, 'city'),
			address: getTrimmedFormString(form, 'address'),
			maxParticipants: getFormNumber(form, 'maxParticipants', 2),
			note: getOptionalTrimmedFormString(form, 'note')
		});

		return {
			success: true,
			section: 'createSlot',
			message: result.count > 1 ? `${result.count} recurring sessions created` : 'Session created'
		};
	} catch (error) {
		return failWithFormError(error, 'Unable to create the availability slot right now', {
			section: 'createSlot'
		});
	}
}

export async function handleUpdateSlotAction(db: AppDatabase, user: MentorUser, form: FormData) {
	const slotId = getFormNumber(form, 'slotId', 0);

	try {
		await updateAvailabilitySlotFromLocalInput(db, user.id, slotId, {
			title: getTrimmedFormString(form, 'title'),
			bookingMode: getTrimmedFormString(form, 'bookingMode'),
			presetTopic: getOptionalTrimmedFormString(form, 'presetTopic'),
			presetDescription: getOptionalTrimmedFormString(form, 'presetDescription'),
			startTimeLocal: getTrimmedFormString(form, 'startTimeLocal'),
			timeZone: getTrimmedFormString(form, 'timeZone'),
			timezoneOffsetMinutes: getFormNumber(form, 'timezoneOffsetMinutes'),
			durationMins: getFormNumber(form, 'durationMins'),
			locationType: getTrimmedFormString(form, 'locationType'),
			city: getTrimmedFormString(form, 'city'),
			address: getTrimmedFormString(form, 'address'),
			maxParticipants: getFormNumber(form, 'maxParticipants', 2),
			note: getOptionalTrimmedFormString(form, 'note')
		});

		return {
			success: true,
			section: 'updateSlot',
			slotId,
			message: 'Session updated'
		};
	} catch (error) {
		return failWithFormError(error, 'Unable to update the session right now', {
			section: 'updateSlot',
			slotId
		});
	}
}

export async function handleDeleteSlotAction(db: AppDatabase, user: MentorUser, form: FormData) {
	const slotId = getFormNumber(form, 'slotId');

	try {
		await deleteAvailabilitySlot(db, user.id, slotId);
		return {
			success: true,
			section: 'deleteSlot',
			slotId,
			message: 'Availability removed'
		};
	} catch (error) {
		return failWithFormError(error, 'Unable to delete the slot right now', {
			section: 'deleteSlot',
			slotId
		});
	}
}
