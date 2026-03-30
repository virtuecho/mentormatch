import { redirect } from '@sveltejs/kit';
import type { UserRole } from '@mentormatch/shared';
import { getNavigation } from '$lib/navigation';

const publicPaths = new Set(['/', '/login', '/signup']);

function getDefaultAuthenticatedPath(role: UserRole | null | undefined) {
	return role === 'mentor' ? '/mentor-bookings' : '/dashboard';
}

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
		throw redirect(303, getDefaultAuthenticatedPath(user.role));
	}

	if (user.role === 'mentor' && path === '/dashboard') {
		throw redirect(303, '/mentor-bookings');
	}

	if (user.role === 'mentor' && path === '/my-bookings') {
		throw redirect(303, '/mentor-bookings');
	}

	if (user.role === 'mentee' && path === '/mentor-bookings') {
		throw redirect(303, '/my-bookings');
	}

	return {
		user,
		navItems: getNavigation(user.role),
		currentPath: path
	};
}
