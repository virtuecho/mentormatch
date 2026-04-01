import { fail } from '@sveltejs/kit';
import { createBookingSeries } from '@mentormatch/feature-bookings';
import { getMentorProfile } from '@mentormatch/feature-mentors';
import { AppError } from '@mentormatch/shared';
import { handleApiError, requireDatabase, requireMember, requireUser } from '$lib/server/http';

type MentorAvailabilitySlot = {
	id: number;
	title: string | null;
	startTime: string;
	durationMins: number;
	locationType: string;
	city: string;
	address: string;
	maxParticipants: number;
	note: string | null;
	isBooked: boolean;
	bookingMode: 'open' | 'preset';
	presetTopic: string | null;
	presetDescription: string | null;
	isRequested?: boolean;
};

function matchesAvailabilityFilter(
	slot: Pick<MentorAvailabilitySlot, 'startTime' | 'city'>,
	filters: { date: string; time: string; city: string }
) {
	const startsAt = new Date(slot.startTime);

	if (filters.city && !slot.city.toLowerCase().includes(filters.city.toLowerCase())) {
		return false;
	}

	if (filters.date) {
		const slotDate = startsAt.toISOString().slice(0, 10);
		if (slotDate !== filters.date) {
			return false;
		}
	}

	if (filters.time) {
		const slotTime = `${String(startsAt.getHours()).padStart(2, '0')}:${String(startsAt.getMinutes()).padStart(2, '0')}`;
		if (slotTime !== filters.time) {
			return false;
		}
	}

	return true;
}

function getSeriesSignature(slot: MentorAvailabilitySlot) {
	return JSON.stringify({
		title: slot.title ?? 'Mentorship session',
		bookingMode: slot.bookingMode,
		presetTopic: slot.presetTopic ?? null,
		presetDescription: slot.presetDescription ?? null,
		locationType: slot.locationType,
		city: slot.city,
		address: slot.address,
		durationMins: slot.durationMins,
		maxParticipants: slot.maxParticipants,
		note: slot.note ?? null
	});
}

function getSeriesLabel(slots: MentorAvailabilitySlot[]) {
	if (slots.length <= 1) {
		return 'Single session';
	}

	const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;
	const hasWeeklyCadence = slots.slice(1).every((slot, index) => {
		const previousStart = new Date(slots[index].startTime).getTime();
		const currentStart = new Date(slot.startTime).getTime();
		const diff = Math.abs(currentStart - previousStart);
		return Math.abs(diff - WEEK_IN_MS) <= 90 * 60 * 1000;
	});

	return hasWeeklyCadence
		? `Weekly series · ${slots.length} upcoming sessions`
		: `${slots.length} upcoming sessions`;
}

function groupAvailabilitySeries(availability: MentorAvailabilitySlot[]) {
	const grouped = new Map<string, MentorAvailabilitySlot[]>();

	for (const slot of availability) {
		const signature = getSeriesSignature(slot);
		const existing = grouped.get(signature) ?? [];
		existing.push(slot);
		grouped.set(signature, existing);
	}

	return [...grouped.entries()]
		.map(([key, slots], index) => {
			const sortedSlots = [...slots].sort((left, right) =>
				left.startTime.localeCompare(right.startTime)
			);
			const requestedCount = sortedSlots.filter((slot) => slot.isRequested).length;

			return {
				key,
				domId: `availability-series-${index + 1}`,
				title: sortedSlots[0]?.title ?? 'Mentorship session',
				bookingMode: sortedSlots[0]?.bookingMode ?? 'open',
				presetTopic: sortedSlots[0]?.presetTopic ?? null,
				presetDescription: sortedSlots[0]?.presetDescription ?? null,
				city: sortedSlots[0]?.city ?? '',
				address: sortedSlots[0]?.address ?? '',
				durationMins: sortedSlots[0]?.durationMins ?? 0,
				maxParticipants: sortedSlots[0]?.maxParticipants ?? 1,
				note: sortedSlots[0]?.note ?? null,
				nextStartTime: sortedSlots[0]?.startTime ?? '',
				seriesLabel: getSeriesLabel(sortedSlots),
				requestedCount,
				availableCount: sortedSlots.length - requestedCount,
				allRequested: requestedCount === sortedSlots.length,
				slots: sortedSlots
			};
		})
		.sort((left, right) => left.nextStartTime.localeCompare(right.nextStartTime));
}

export async function load({ params, locals, url }) {
	const user = requireUser(locals);
	const isAdminView = user.role === 'admin';
	const mentor = await getMentorProfile(requireDatabase(locals), Number(params.id), user.id);
	const filters = {
		date: url.searchParams.get('date') ?? '',
		time: url.searchParams.get('time') ?? '',
		city: url.searchParams.get('city') ?? ''
	};
	const filteredAvailability = mentor.availability.filter((slot) =>
		matchesAvailabilityFilter(slot, filters)
	);

	return {
		mentor: {
			...mentor,
			availability: filteredAvailability
		},
		availabilityGroups: groupAvailabilitySeries(filteredAvailability),
		isAdminView,
		filters,
		viewerCanBook: user.role !== 'admin'
	};
}

export const actions = {
	book: async ({ request, locals }) => {
		const user = requireMember(locals);

		const form = await request.formData();
		const groupKey = String(form.get('groupKey') ?? '');
		const availabilitySlotIds = form
			.getAll('availabilitySlotId')
			.map((value) => Number(value))
			.filter((value) => Number.isInteger(value) && value > 0);
		const topic = String(form.get('topic') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();

		try {
			const result = await createBookingSeries(requireDatabase(locals), user.id, {
				availabilitySlotIds,
				topic,
				description,
				note: '',
				numParticipants: 1
			});

			return {
				section: 'book',
				groupKey,
				success: true,
				message:
					result.count > 1
						? `${result.count} booking requests submitted`
						: 'Booking request submitted'
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					section: 'book',
					groupKey,
					message: error.message
				});
			}

			handleApiError(error);
			return fail(500, {
				section: 'book',
				groupKey,
				message: 'Unable to create the booking request right now'
			});
		}
	}
};
