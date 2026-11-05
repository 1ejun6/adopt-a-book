import { test, expect, devices } from '@playwright/test'

// Playwright doesn't allow switching browser inside a test file, so drop that one setting
const { defaultBrowserType, ...pixel5 } = devices['Pixel 5']
test.use(pixel5)

test('guest uses the site on their phone', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.book-spine')).toHaveCount(5)

  await page.locator('.book-spine').first().tap()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).tap()
  await expect(page.getByRole('dialog')).toBeHidden()

  await page.locator('button[aria-controls="mobile"]').tap()
  await expect(page.locator('#mobile')).toBeVisible()

  await page.locator('#mobile').getByRole('link', { name: 'Adoption Drives' }).tap()
  await expect(page).toHaveURL(/drives/)
  await expect(page.locator('#mobile')).toBeHidden()

  await page.locator('button[aria-controls="mobile"]').tap()
  await page.locator('#mobile').getByRole('link', { name: 'Create Account' }).tap()
  await expect(page).toHaveURL(/register/)

  await page.locator('button[aria-controls="mobile"]').tap()
  await expect(page.locator('#mobile')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('#mobile')).toBeHidden()
})
