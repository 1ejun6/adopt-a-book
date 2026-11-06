import { test, expect } from '@playwright/test';
import { demoCustomer } from '../support/env.js';

test.describe('Customer manages their watchlist', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();
  });

  test('customer edits the note on a saved book and removes it', async ({ page }) => {
    // save a book with a note first
    await page.getByRole('link', { name: 'Browse Books' }).click();
    await page.getByRole('tab', { name: /^Other genres/ }).click();
    await page.getByRole('button', { name: 'Save Born a Crime to saved books' }).click();
    await page.getByRole('textbox', { name: 'Private note (optional)' }).fill('pick up before the drive');
    await page.getByRole('button', { name: 'Save note' }).click();
    await expect(page.getByText('Note saved')).toBeVisible();

    // open it from the Watchlist (wait for the list to finish loading before changing it)
    const watchlistLoaded = page.waitForResponse(response => response.url().includes('/watchlist'));
    await page.getByRole('link', { name: 'Watchlist' }).click();
    await watchlistLoaded;
    await page.getByRole('button', { name: 'View details for Born a Crime' }).click();
    await expect(page.getByRole('heading', { name: 'Your private note' })).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('pick up before the drive');

    // edit the note
    await page.getByRole('button', { name: 'Edit note' }).click();
    await page.getByRole('textbox', { name: 'Private note (optional)' }).fill('ask if the cover is torn');
    await page.getByRole('button', { name: 'Save note' }).click();
    await expect(page.getByText('Note saved')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('ask if the cover is torn');

    // the new note is still there after a reload
    const reloaded = page.waitForResponse(response => response.url().includes('/watchlist'));
    await page.reload();
    await reloaded;
    await page.getByRole('button', { name: 'View details for Born a Crime' }).click();
    await expect(page.getByRole('dialog')).toContainText('ask if the cover is torn');

    // remove it
    await page.getByRole('button', { name: 'Remove from saved books' }).click();
    await page.getByRole('button', { name: 'Remove saved book' }).click();
    await expect(page.getByText('Removed from saved books')).toBeVisible();
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});
