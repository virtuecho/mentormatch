import { describe, expect, it } from 'vitest';
import { load } from '../routes/+layout.server';

function createUrl(path: string) {
	return new URL(`http://localhost:5173${path}`);
}

function captureRedirect(run: () => ReturnType<typeof load>) {
	try {
		run();
		throw new Error('Expected redirect');
	} catch (error) {
		return error as { status: number; location: string };
	}
}

describe('root layout auth routing', () => {
	it('redirects anonymous visitors to login for protected pages', () => {
		expect(
			captureRedirect(() =>
				load({
					locals: { db: null, authSecret: null, user: null },
					url: createUrl('/settings')
				} as never)
			)
		).toMatchObject({
			status: 303,
			location: '/login?redirect=%2Fsettings'
		});
	});

	it('redirects pending mentors into the application flow', () => {
		expect(
			captureRedirect(() =>
				load({
					locals: {
						db: null,
						authSecret: null,
						user: {
							id: 1,
							email: 'mentor@example.com',
							role: 'mentor',
							isMentorApproved: false,
							fullName: 'Pending Mentor',
							profileImageUrl: ''
						}
					},
					url: createUrl('/mentor-bookings')
				} as never)
			)
		).toMatchObject({
			status: 303,
			location: '/mentor-verification'
		});
	});

	it('redirects admins away from member-only flows', () => {
		expect(
			captureRedirect(() =>
				load({
					locals: {
						db: null,
						authSecret: null,
						user: {
							id: 2,
							email: 'admin@example.com',
							role: 'admin',
							isMentorApproved: true,
							fullName: 'Admin User',
							profileImageUrl: ''
						}
					},
					url: createUrl('/mentor-verification')
				} as never)
			)
		).toMatchObject({
			status: 303,
			location: '/admin/review'
		});
	});
});
