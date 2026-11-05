import { test, expect } from '@playwright/test';

test('guest browses the bookshelf and opens a book', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Different shelves');

  // the shelf shows 5 books
  const books = page.locator('.book-spine');
  await expect(books).toHaveCount(5);

  // hovering a book shows its preview
  await books.first().hover();
  await expect(books.first().locator('.book-preview')).toBeVisible();

  // open a book and close it with escape
  await books.nth(1).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Book details' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  // open another and close it with the button
  await books.nth(2).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});
