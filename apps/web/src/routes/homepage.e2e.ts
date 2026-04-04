import { expect, test } from '@playwright/test';

test('homepage shows the guest calls to action', async ({ page }) => {
	await page.goto('/');
	const hero = page.locator('.landing-hero');
	await expect(
		page.getByRole('heading', {
			level: 1,
			name: /Find the perfect mentor to help you achieve your goals/i
		})
	).toBeVisible();
	await expect(hero.getByRole('link', { name: 'Log In' })).toBeVisible();
	await expect(hero.getByRole('link', { name: 'Sign Up' })).toBeVisible();
});
