import { test, expect, devices } from '@playwright/test'
import { demoCustomer } from '../support/env.js'

// Playwright doesn't allow switching browser inside a test file, so drop that one setting
const { defaultBrowserType, ...pixel5 } = devices['Pixel 5']
test.use(pixel5)

test('customer uses the site on their phone', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password)
  await page.getByRole('button', { name: 'Login', exact: true }).tap()
  await expect(page).toHaveURL(/customer/)

  await page.locator('button[aria-controls="mobile"]').tap()
  await expect(page.locator('#mobile')).toBeVisible()

  await page.locator('#mobile').getByRole('link', { name: 'Browse Books' }).tap()
  await expect(page).toHaveURL(/customer\/books/)
  await expect(page.locator('#mobile')).toBeHidden()

  await page.getByRole('main').locator('article strong').first().tap()
  await expect(page.getByRole('dialog', { name: 'Book details' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()

  await page.locator('button[aria-controls="mobile"]').tap()
  await page.locator('#mobile').getByRole('link', { name: 'Adoption Drives' }).tap()
  await expect(page).toHaveURL(/customer\/drives/)

  await page.locator('button[aria-controls="mobile"]').tap()
  await page.locator('#mobile').getByRole('button', { name: 'Logout' }).tap()
  await expect(page).toHaveURL(/login/)
})
