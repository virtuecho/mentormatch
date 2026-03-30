import { listMentors } from '@mentormatch/feature-mentors';

export async function load({ locals }) {
	if (!locals.db) {
		return getFallbackHomepageData();
	}

	try {
		const [mentorCountRow, bookingCountRow, memberCountRow, featuredMentors] = await Promise.all([
			locals.db.get<{ count: number }>(
				'SELECT COUNT(*) AS count FROM users WHERE role = ? AND is_mentor_approved = 1',
				['mentor']
			),
			locals.db.get<{ count: number }>('SELECT COUNT(*) AS count FROM bookings', []),
			locals.db.get<{ count: number }>('SELECT COUNT(*) AS count FROM users', []),
			listMentors(locals.db, locals.user?.id ?? null, { q: '', city: '', tag: '', limit: 3 })
		]);

		return {
			stats: [
				{ label: 'Mentors', value: String(mentorCountRow?.count ?? 0), tone: 'teal' as const },
				{ label: 'Sessions', value: String(bookingCountRow?.count ?? 0), tone: 'blue' as const },
				{ label: 'Members', value: String(memberCountRow?.count ?? 0), tone: 'amber' as const }
			],
			featuredMentors
		};
	} catch (error) {
		if (!String(error).includes('no such table')) {
			console.warn('Homepage data unavailable, falling back to empty state.', error);
		}
		return getFallbackHomepageData();
	}
}

function getFallbackHomepageData() {
	return {
		stats: [
			{ label: 'Mentors', value: '0', tone: 'teal' as const },
			{ label: 'Sessions', value: '0', tone: 'blue' as const },
			{ label: 'Members', value: '0', tone: 'amber' as const }
		],
		featuredMentors: []
	};
}
