import { test, expect } from '@playwright/test';

test('guest is sent to login from members-only pages', async ({ page }) => {
  // every members-only page bounces a guest to login
  for (const path of ['/customer/watchlist', '/customer/books', '/customer/adoptions', '/customer/account', '/admin/books']) {
    await page.goto(path);
    await expect(page).toHaveURL(/login/);
  }

  await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create Account' })).toBeVisible();
});
