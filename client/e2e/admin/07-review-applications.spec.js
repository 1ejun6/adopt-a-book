import { test, expect } from '@playwright/test'
import { demoAdmin } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/admin/)
})

test('admin looks through the adoption applications', async ({ page }) => {
  await page.getByRole('banner').getByRole('link', { name: 'Adoption Applications' }).click()
  await expect(page.getByRole('heading', { name: 'Adoption applications', level: 1 })).toBeVisible()

  await expect(page.getByRole('tab', { name: /^Pending/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tab', { name: /^All applications/ })).toBeVisible()

  // opens an application from the All tab
  await page.getByRole('tab', { name: /^All applications/ }).click()
  await page.getByRole('main').locator('tbody tr').first().click()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Application details' })).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()

  // searches for something that doesn't exist
  await page.getByRole('main').getByRole('searchbox').first().fill('zzzz-no-such-application')
  await expect(page.getByRole('main').locator('tbody tr')).toHaveCount(0)
})
