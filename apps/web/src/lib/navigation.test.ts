import { describe, expect, it } from 'vitest';

import { getNavigation, mainNavigation, uniqueNavigationLabels } from './navigation';

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
		expect(getNavigation(null).some((item) => item.href === '/login')).toBe(true);
	});
});
