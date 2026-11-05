import { test, expect, devices } from '@playwright/test';
import { demoCustomer } from '../support/env.js';

// Playwright doesn't allow switching browser inside a test file, so drop that one setting
const { defaultBrowserType, ...pixel5 } = devices['Pixel 5'];

test.describe('Customer on a phone', () => {
  test.use(pixel5);

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();
  });

  test('customer uses the site on their phone', async ({ page }) => {
    // open the menu and go to Browse Books
    await page.getByRole('button', { name: 'Open navigation' }).tap();
    await page.getByRole('link', { name: 'Browse Books' }).tap();
    await expect(page).toHaveURL(/customer\/books/);
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();

    // open a book and close it
    await page.getByRole('button', { name: /^View details for / }).first().tap();
    await expect(page.getByRole('dialog', { name: 'Book details' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    // go to Adoption Drives
    await page.getByRole('button', { name: 'Open navigation' }).tap();
    await page.getByRole('link', { name: 'Adoption Drives' }).tap();
    await expect(page).toHaveURL(/customer\/drives/);

    // log out from the menu
    await page.getByRole('button', { name: 'Open navigation' }).tap();
    await page.getByRole('button', { name: 'Logout' }).tap();
    await expect(page).toHaveURL(/login/);
  });
});
