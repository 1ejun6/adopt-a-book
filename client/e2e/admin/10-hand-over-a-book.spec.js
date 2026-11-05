import { test, expect } from '@playwright/test'
import { demoAdmin } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/admin/)
})

test("admin checks today's pickups", async ({ page }) => {
  await page.getByRole('banner').getByRole('link', { name: 'Appointments' }).click()
  await page.getByRole('tab', { name: /^Today's pickup/ }).click()
  await expect(page.getByRole('tab', { name: /^Today's pickup/ })).toHaveAttribute('aria-selected', 'true')

  // today's tab has no date picker
  await expect(page.getByRole('main').getByRole('button', { name: 'Collection date', exact: true })).toHaveCount(0)

  // the dashboard links to the same list
  await page.getByRole('banner').getByRole('link', { name: 'Dashboard' }).click()
  await page.getByRole('link', { name: "View all today's pickups" }).click()
  await expect(page).toHaveURL(/admin\/appointments/)
  await expect(page.getByRole('tab', { name: /^Today's pickup/ })).toHaveAttribute('aria-selected', 'true')
})
