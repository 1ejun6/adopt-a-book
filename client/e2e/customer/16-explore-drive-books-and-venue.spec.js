import { test, expect } from '@playwright/test'
import { demoCustomer } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/customer/)
})

test('customer looks at the books and venue of a drive', async ({ page }) => {
  await page.getByRole('banner').getByRole('link', { name: 'Adoption Drives' }).click()
  await page.getByRole('tab', { name: /^upcoming/ }).click()

  await page.getByRole('main').getByRole('heading', { level: 3 }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'book list' })).toBeVisible()

  // the venue opens google maps in a new tab
  await expect(page.getByRole('dialog').locator('a[href*="google.com/maps"]').first()).toHaveAttribute('target', '_blank')

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
})
