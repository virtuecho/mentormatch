import { fail } from '@sveltejs/kit';
import { createBooking } from '@mentormatch/feature-bookings';
import { getMentorProfile } from '@mentormatch/feature-mentors';
import { AppError } from '@mentormatch/shared';
import { handleApiError, requireDatabase, requireUser } from '$lib/server/http';

function matchesAvailabilityFilter(
	slot: {
		startTime: string;
		city: string;
	},
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

export async function load({ params, locals, url }) {
	const user = requireUser(locals);
	const mentor = await getMentorProfile(requireDatabase(locals), Number(params.id));
	const filters = {
		date: url.searchParams.get('date') ?? '',
		time: url.searchParams.get('time') ?? '',
		city: url.searchParams.get('city') ?? ''
	};

	return {
		mentor: {
			...mentor,
			availability: mentor.availability.filter((slot) => matchesAvailabilityFilter(slot, filters))
		},
		filters,
		viewerRole: user.role
	};
}

export const actions = {
	book: async ({ request, locals }) => {
		const user = requireUser(locals);

		if (user.role !== 'mentee') {
			return fail(403, {
				message: 'Only mentees can create booking requests'
			});
		}

		const form = await request.formData();
		const availabilitySlotId = Number(form.get('availabilitySlotId'));
		const topic = String(form.get('topic') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();

		try {
			await createBooking(requireDatabase(locals), user.id, {
				availabilitySlotId,
				topic,
				description,
				note: '',
				numParticipants: 1
			});

			return {
				success: true,
				message: 'Booking request submitted'
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					message: error.message
				});
			}

			handleApiError(error);
			return fail(500, {
				message: 'Unable to create the booking request right now'
			});
		}
	}
};
