import { test, expect } from '@playwright/test';
import { demoCustomer } from '../support/env.js';

test.describe('Customer searches the catalogue', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();
  });

  test('customer searches, filters and sorts the books', async ({ page }) => {
    await page.getByRole('link', { name: 'Browse Books' }).click();
    await page.getByRole('tab', { name: /^Other genres/ }).click();

    // search for a book
    await page.getByRole('searchbox', { name: /Search by title/ }).fill('Born a Crime');
    await expect(page).toHaveURL(/search=/);
    await expect(page.getByRole('button', { name: 'View details for Born a Crime' })).toBeVisible();

    // clear the search
    await page.getByRole('button', { name: /^Clear Search by title/ }).click();
    await expect(page).not.toHaveURL(/search=/);

    // filter by genre
    await page.getByRole('combobox', { name: 'Genre' }).selectOption('Biography');
    await expect(page).toHaveURL(/subject=/);

    // sort by author > it stays after a reload
    await page.getByRole('combobox', { name: 'Sort by' }).selectOption('Author A–Z');
    await expect(page).toHaveURL(/sort=author/);
    await page.reload();
    await expect(page).toHaveURL(/sort=author/);
    await expect(page.getByRole('combobox', { name: 'Sort by' })).toHaveValue('author');

    // a search with no matches
    await page.getByRole('searchbox', { name: /Search by title/ }).fill('zzzz-no-such-book');
    await expect(page.getByText('No matching books')).toBeVisible();
  });

  test('customer goes to the next page of books', async ({ page }) => {
    await page.getByRole('link', { name: 'Browse Books' }).click();

    // "My genres" only has a few books > "Other genres" has enough for a second page
    await page.getByRole('tab', { name: /^Other genres/ }).click();
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/^Page 2 of \d+$/)).toBeVisible();
  });
});
