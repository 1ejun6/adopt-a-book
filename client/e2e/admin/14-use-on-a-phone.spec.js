import { test, expect, devices } from '@playwright/test';
import { demoAdmin } from '../support/env.js';

// Playwright doesn't allow switching browser inside a test file, so drop that one setting
const { defaultBrowserType: _defaultBrowserType, ...pixel5 } = devices['Pixel 5'];
test.use(pixel5);

test.describe('Admin mobile experience', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();
    await expect(page).toHaveURL(/admin/);
  });

  test('admin uses the site on their phone', async ({ page }) => {
    await page.locator('button[aria-controls="mobile"]').tap();
    await expect(page.locator('#mobile').getByRole('button', { name: 'Logout' })).toBeVisible();

    await page.locator('#mobile').getByRole('link', { name: 'Book Inventory' }).tap();
    await expect(page).toHaveURL(/admin\/books/);
    await expect(page.locator('#mobile')).toBeHidden();

    // On a phone each book is a card with a View details button
    await page.getByRole('button', { name: /^View details for/ }).first().tap();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Book details' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    await page.locator('button[aria-controls="mobile"]').tap();
    await page.locator('#mobile').getByRole('link', { name: 'Appointments' }).tap();
    await expect(page.getByRole('heading', { name: 'Appointments', level: 1 })).toBeVisible();

    await page.locator('button[aria-controls="mobile"]').tap();
    await page.locator('#mobile').getByRole('button', { name: 'Logout' }).tap();
    await expect(page).toHaveURL(/login/);
  });
});
