import { describe, expect, it } from 'vitest';

import {
	getDefaultAuthenticatedPath,
	getNavigation,
	mainNavigation,
	uniqueNavigationLabels
} from './navigation';

describe('mainNavigation', () => {
	it('keeps labels unique', () => {
		expect(uniqueNavigationLabels()).toHaveLength(mainNavigation.length);
	});

	it('starts from the homepage', () => {
		expect(mainNavigation[0]).toEqual({ href: '/', label: 'Home' });
	});

	it('switches booking navigation by role', () => {
		expect(getNavigation('mentee').some((item) => item.href === '/my-bookings')).toBe(true);
		expect(getNavigation('mentor').some((item) => item.href === '/mentor-bookings')).toBe(true);
		expect(getNavigation('admin').some((item) => item.href === '/admin/review')).toBe(true);
		expect(getNavigation(null).some((item) => item.href === '/login')).toBe(true);
	});

	it('keeps pending mentors focused on their application', () => {
		expect(
			getNavigation({ role: 'mentor', isMentorApproved: false }).some(
				(item) => item.href === '/mentor-bookings'
			)
		).toBe(false);
		expect(getDefaultAuthenticatedPath({ role: 'mentor', isMentorApproved: false })).toBe(
			'/mentor-verification'
		);
	});
});
