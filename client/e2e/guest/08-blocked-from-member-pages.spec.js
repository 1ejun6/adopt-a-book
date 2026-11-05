import { test, expect } from '@playwright/test'

test('guest is sent to login from members-only pages', async ({ page }) => {
  await page.goto('/customer/watchlist')
  await expect(page).toHaveURL(/login/)

  await page.goto('/customer/books')
  await expect(page).toHaveURL(/login/)

  await page.goto('/customer/adoptions')
  await expect(page).toHaveURL(/login/)

  await page.goto('/customer/account')
  await expect(page).toHaveURL(/login/)

  await page.goto('/admin/books')
  await expect(page).toHaveURL(/login/)

  await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Create Account' })).toBeVisible()
})
