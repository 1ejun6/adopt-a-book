import { test, expect } from '@playwright/test';
import { demoCustomer } from '../support/env.js';

test.describe('Customer saves books while browsing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();
  });

  test('customer saves a book from its card and removes it again', async ({ page }) => {
    await page.getByRole('link', { name: 'Browse Books' }).click();
    await page.getByRole('tab', { name: /^Other genres/ }).click();

    // save it with a note
    await page.getByRole('button', { name: 'Save Born a Crime to saved books' }).click();
    await expect(page.getByText('Book saved')).toBeVisible();
    await page.getByRole('textbox', { name: 'Private note (optional)' }).fill('ask about the cover');
    await page.getByRole('button', { name: 'Save note' }).click();
    await expect(page.getByText('Note saved')).toBeVisible();

    // it shows up in the Watchlist (wait for the list to finish loading before changing it)
    const watchlistLoaded = page.waitForResponse(response => response.url().includes('/watchlist'));
    await page.getByRole('link', { name: 'Watchlist' }).click();
    await watchlistLoaded;
    await expect(page.getByRole('button', { name: 'View details for Born a Crime' })).toBeVisible();

    // clean up so the next run starts the same
    await page.getByRole('button', { name: 'Remove Born a Crime from saved books' }).click();
    await page.getByRole('button', { name: 'Remove saved book' }).click();
    await expect(page.getByText('Removed from saved books')).toBeVisible();
  });

  test('customer saves a book from its details window and removes it again', async ({ page }) => {
    await page.getByRole('link', { name: 'Browse Books' }).click();
    await page.getByRole('tab', { name: /^Other genres/ }).click();

    await page.getByRole('button', { name: 'View details for Born a Crime' }).click();
    await expect(page.getByRole('dialog', { name: 'Book details' })).toBeVisible();

    await page.getByRole('button', { name: 'Save book' }).click();
    await expect(page.getByText('Book saved')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove from saved books' })).toBeVisible();

    // clean up so the next run starts the same
    await page.getByRole('button', { name: 'Remove from saved books' }).click();
    await expect(page.getByText('Removed from saved books')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save book' })).toBeVisible();
  });
});
