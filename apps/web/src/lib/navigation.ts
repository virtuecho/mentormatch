import type { UserRole } from '@mentormatch/shared';

export type NavItem = {
	href: string;
	label: string;
};

const publicNavigation = [
	{ href: '/', label: 'Home' },
	{ href: '/login', label: 'Log In' },
	{ href: '/signup', label: 'Sign Up' }
] as const satisfies readonly NavItem[];

const menteeNavigation = [
	{ href: '/', label: 'Home' },
	{ href: '/dashboard', label: 'Dashboard' },
	{ href: '/my-bookings', label: 'My Bookings' },
	{ href: '/profile', label: 'Profile' },
	{ href: '/settings', label: 'Settings' },
	{ href: '/mentor-verification', label: 'Verification' }
] as const satisfies readonly NavItem[];

const mentorNavigation = [
	{ href: '/', label: 'Home' },
	{ href: '/mentor-bookings', label: 'Mentor Bookings' },
	{ href: '/profile', label: 'Profile' },
	{ href: '/settings', label: 'Settings' },
	{ href: '/mentor-verification', label: 'Verification' }
] as const satisfies readonly NavItem[];

export const mainNavigation = publicNavigation;

export function getNavigation(role: UserRole | null | undefined): readonly NavItem[] {
	if (role === 'mentor') {
		return mentorNavigation;
	}

	if (role === 'mentee' || role === 'admin') {
		return menteeNavigation;
	}

	return publicNavigation;
}

export function uniqueNavigationLabels(items: readonly NavItem[] = mainNavigation): string[] {
	return [...new Set(items.map((item) => item.label))];
}
