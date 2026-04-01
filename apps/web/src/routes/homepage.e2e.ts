import { expect, test } from '@playwright/test';

test('homepage shows the guest calls to action', async ({ page }) => {
	await page.goto('/');
	const hero = page.locator('.hero');
	await expect(page.getByRole('heading', { name: /Find the mentor who can help/i })).toBeVisible();
	await expect(hero.getByRole('link', { name: 'Log in' })).toBeVisible();
	await expect(hero.getByRole('link', { name: 'Get started' })).toBeVisible();
});
