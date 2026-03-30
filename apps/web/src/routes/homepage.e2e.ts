import { expect, test } from '@playwright/test';

test('homepage renders the new MentorMatch shell', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: /One deploy, one app/i })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Log In' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Explore mentors' })).toBeVisible();
});
