import { listBookings } from '@mentormatch/feature-bookings';
import { listMentors } from '@mentormatch/feature-mentors';
import { requireDatabase, requireRole } from '$lib/server/http';

export async function load({ locals, url }) {
	const user = requireRole(locals, 'mentee');
	const db = requireDatabase(locals);
	const search = url.searchParams.get('q') ?? '';
	const city = url.searchParams.get('city') ?? '';
	const tag = url.searchParams.get('tag') ?? '';
	const date = url.searchParams.get('date') ?? '';
	const time = url.searchParams.get('time') ?? '';

	const [mentors, bookings] = await Promise.all([
		listMentors(db, user.id, {
			q: search,
			city,
			tag,
			limit: 12
		}),
		listBookings(db, user.id, 'mentee')
	]);

	const stats = [
		{ label: 'Mentors', value: String(mentors.length), tone: 'teal' as const },
		{
			label: 'Pending',
			value: String(bookings.filter((booking) => booking.status === 'pending').length),
			tone: 'amber' as const
		},
		{
			label: 'Accepted',
			value: String(bookings.filter((booking) => booking.status === 'accepted').length),
			tone: 'blue' as const
		}
	];

	return {
		filters: {
			search,
			city,
			tag,
			date,
			time
		},
		mentors,
		stats
	};
}
