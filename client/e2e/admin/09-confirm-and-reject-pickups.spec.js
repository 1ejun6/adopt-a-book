import { test, expect } from '@playwright/test'
import { demoAdmin } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/admin/)
})

test('admin opens a pickup that is waiting to be confirmed', async ({ page }) => {
  await page.getByRole('banner').getByRole('link', { name: 'Appointments' }).click()
  await expect(page.getByRole('tab', { name: /^Awaiting confirmation/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('main').getByRole('button', { name: 'Collection date', exact: true })).toBeVisible()

  await page.getByRole('main').locator('tbody tr').first().click()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Appointment details' })).toBeVisible()

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Reject', exact: true })).toBeEnabled()

  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
})
