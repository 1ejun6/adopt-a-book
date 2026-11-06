import { test, expect } from '@playwright/test';
import { demoCustomer } from '../support/env.js';

test.describe('Customer adopts from their watchlist', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();
  });

  test('customer requests a book from their watchlist', async ({ page }) => {
    // save a book with a note first
    await page.getByRole('link', { name: 'Browse Books' }).click();
    await page.getByRole('tab', { name: /^Other genres/ }).click();
    await page.getByRole('button', { name: 'Save Born a Crime to saved books' }).click();
    await page.getByRole('textbox', { name: 'Private note (optional)' }).fill('ready to adopt this weekend');
    await page.getByRole('button', { name: 'Save note' }).click();
    await expect(page.getByText('Note saved')).toBeVisible();

    // request it from the Watchlist (wait for the list to finish loading first)
    const watchlistLoaded = page.waitForResponse(response => response.url().includes('/watchlist'));
    await page.getByRole('link', { name: 'Watchlist' }).click();
    await watchlistLoaded;
    await page.getByRole('button', { name: 'View details for Born a Crime' }).click();
    await expect(page.getByRole('dialog')).toContainText('ready to adopt this weekend');
    await page.getByRole('button', { name: 'request', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm adoption request' }).click();
    await expect(page.getByRole('heading', { name: 'Adoption request sent' })).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    // clean up: withdraw the request
    await page.getByRole('link', { name: 'My Adoptions' }).click();
    await page.getByRole('button', { name: 'View request for Born a Crime. Under review' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Withdraw', exact: true }).click();
    await page.getByRole('region', { name: 'Confirm withdrawal' }).getByRole('button', { name: 'Withdraw' }).click();
    await expect(page.getByRole('heading', { name: 'Request withdrawn' })).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    // and unsave the book
    const watchlistReloaded = page.waitForResponse(response => response.url().includes('/watchlist'));
    await page.getByRole('link', { name: 'Watchlist' }).click();
    await watchlistReloaded;
    await page.getByRole('button', { name: 'Remove Born a Crime from saved books' }).click();
    await page.getByRole('button', { name: 'Remove saved book' }).click();
    await expect(page.getByText('Removed from saved books')).toBeVisible();
  });
});
