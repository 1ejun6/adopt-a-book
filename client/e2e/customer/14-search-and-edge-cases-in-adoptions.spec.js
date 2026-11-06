import { test, expect } from '@playwright/test';
import { demoCustomer } from '../support/env.js';

test.describe('Customer searches their adoptions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();
  });

  test('customer searches their adoptions and clears the search', async ({ page }) => {
    await page.getByRole('link', { name: 'My Adoptions' }).click();
    await page.getByRole('tab', { name: /^History/ }).click();

    // grab the first title in History
    const row = page.getByRole('button', { name: /^View request for / }).first();
    await expect(row).toBeVisible();
    const title = (await row.getAttribute('aria-label')).replace(/^View request for (.+)\. [^.]+$/, '$1');

    // search for it
    await page.getByRole('searchbox', { name: 'Search all adoptions' }).fill(title);
    await expect(page).toHaveURL(/search=/);
    await expect(page.getByRole('heading', { name: 'Search results' })).toBeVisible();
    await expect(page.getByRole('button', { name: `View request for ${title}.` }).first()).toBeVisible();

    // a search with no matches
    await page.getByRole('searchbox', { name: 'Search all adoptions' }).fill('NonExistentTitleXYZ');
    await expect(page.getByRole('heading', { name: 'No matching results' })).toBeVisible();

    // clear the search
    await page.getByRole('button', { name: 'Clear search', exact: true }).click();
    await expect(page).not.toHaveURL(/search=/);
  });

  test('customer opens a link to an adoption that does not exist', async ({ page }) => {
    await page.goto('/customer/adoptions?request=non-existent-id-000');
    await expect(page.getByText('That adoption or pickup could not be found')).toBeVisible();
  });
});
