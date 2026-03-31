import { redirect } from '@sveltejs/kit';
import { getDefaultAuthenticatedPath, getNavigation } from '$lib/navigation';

const publicPaths = new Set(['/', '/login', '/signup']);
const pendingMentorPaths = new Set(['/', '/profile', '/settings', '/mentor-verification']);

export function load({ locals, url }) {
	const path = url.pathname;
	const user = locals.user;
	const redirectTarget = `${path}${url.search}`;

	if (!user) {
		if (!publicPaths.has(path)) {
			throw redirect(303, `/login?redirect=${encodeURIComponent(redirectTarget)}`);
		}

		return {
			user: null,
			navItems: getNavigation(null)
		};
	}

	if (path === '/login' || path === '/signup') {
		throw redirect(303, getDefaultAuthenticatedPath(user));
	}

	if (user.role === 'mentor' && !user.isMentorApproved && !pendingMentorPaths.has(path)) {
		throw redirect(303, '/mentor-verification');
	}

	if (user.role === 'mentor' && path === '/dashboard') {
		throw redirect(303, '/mentor-bookings');
	}

	if (user.role === 'mentor' && path === '/my-bookings') {
		throw redirect(303, '/mentor-bookings');
	}

	if (
		user.role === 'admin' &&
		(path === '/dashboard' ||
			path === '/my-bookings' ||
			path === '/mentor-bookings' ||
			path === '/mentor-verification')
	) {
		throw redirect(303, '/admin/review');
	}

	if (user.role === 'mentee' && path === '/mentor-bookings') {
		throw redirect(303, '/my-bookings');
	}

	return {
		user,
		navItems: getNavigation(user),
		currentPath: path
	};
}
