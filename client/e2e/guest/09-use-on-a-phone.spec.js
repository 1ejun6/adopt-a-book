import { test, expect, devices } from '@playwright/test';

// Playwright doesn't allow switching browser inside a test file, so drop that one setting
const { defaultBrowserType, ...pixel5 } = devices['Pixel 5'];
test.use(pixel5);

test('guest uses the site on their phone', async ({ page }) => {
  await page.goto('/');

  // open a book and close it
  const books = page.locator('.book-spine');
  await expect(books).toHaveCount(5);
  await books.first().tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).tap();
  await expect(page.getByRole('dialog')).toBeHidden();

  // open the menu and go to Adoption Drives
  const menu = page.locator('#mobile');
  await page.getByRole('button', { name: 'Open navigation' }).tap();
  await expect(menu).toBeVisible();
  await menu.getByRole('link', { name: 'Adoption Drives' }).tap();
  await expect(page).toHaveURL(/drives/);
  await expect(menu).toBeHidden();

  // go to Create Account
  await page.getByRole('button', { name: 'Open navigation' }).tap();
  await menu.getByRole('link', { name: 'Create Account' }).tap();
  await expect(page).toHaveURL(/register/);

  // escape closes the menu
  await page.getByRole('button', { name: 'Open navigation' }).tap();
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
});
