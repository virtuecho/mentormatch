import type { SessionUser, UserRole } from '@mentormatch/shared';

export type NavItem = {
	href: string;
	label: string;
};

const publicNavigation = [
	{ href: '/', label: 'Home' },
	{ href: '/login', label: 'Log In' },
	{ href: '/signup', label: 'Sign Up' }
] as const satisfies readonly NavItem[];

const memberNavigationBase = [
	{ href: '/', label: 'Home' },
	{ href: '/dashboard', label: 'Find a Mentor' },
	{ href: '/my-bookings', label: 'My Sessions' },
	{ href: '/profile', label: 'Profile' },
	{ href: '/settings', label: 'Settings' }
] as const satisfies readonly NavItem[];

const menteeNavigation = [
	...memberNavigationBase,
	{ href: '/mentor-verification', label: 'Mentor Status' }
] as const satisfies readonly NavItem[];

const mentorNavigation = [
	...memberNavigationBase,
	{ href: '/mentor-bookings', label: 'Mentor Sessions' },
	{ href: '/mentor-verification', label: 'Mentor Status' }
] as const satisfies readonly NavItem[];

const pendingMentorNavigation = [
	...memberNavigationBase,
	{ href: '/mentor-verification', label: 'Mentor Application' }
] as const satisfies readonly NavItem[];

const adminNavigation = [
	{ href: '/', label: 'Home' },
	{ href: '/admin/review', label: 'Review Applications' },
	{ href: '/admin/mentors', label: 'Manage Mentors' },
	{ href: '/admin/slots', label: 'Manage Slots' },
	{ href: '/profile', label: 'Profile' },
	{ href: '/settings', label: 'Settings' }
] as const satisfies readonly NavItem[];

export const mainNavigation = publicNavigation;

type NavigationContext =
	| Pick<SessionUser, 'role' | 'isMentorApproved'>
	| UserRole
	| null
	| undefined;

function getRole(context: NavigationContext): UserRole | null | undefined {
	return typeof context === 'string' || context == null ? context : context.role;
}

function isMentorApproved(context: NavigationContext): boolean {
	return typeof context === 'string' || context == null ? true : context.isMentorApproved;
}

export function getDefaultAuthenticatedPath(
	user: Pick<SessionUser, 'role' | 'isMentorApproved'> | null | undefined
): string {
	if (user?.role === 'admin') {
		return '/admin/review';
	}

	if (user?.role === 'mentor' && !user.isMentorApproved) {
		return '/mentor-verification';
	}

	return user?.role === 'mentor' && user.isMentorApproved ? '/mentor-bookings' : '/dashboard';
}

export function getNavigation(context: NavigationContext): readonly NavItem[] {
	const role = getRole(context);
	if (role === 'mentor' && !isMentorApproved(context)) {
		return pendingMentorNavigation;
	}

	if (role === 'mentor') {
		return mentorNavigation;
	}

	if (role === 'admin') {
		return adminNavigation;
	}

	if (role === 'mentee') {
		return menteeNavigation;
	}

	return publicNavigation;
}

export function uniqueNavigationLabels(items: readonly NavItem[] = mainNavigation): string[] {
	return [...new Set(items.map((item) => item.label))];
}
