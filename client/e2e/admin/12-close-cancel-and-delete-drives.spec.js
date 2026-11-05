import { test, expect } from '@playwright/test'
import { demoAdmin } from '../support/env.js'

// a YYYY-MM-DD date for the drive form
const in10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/admin/)
})

test('admin closes registration for a drive and then deletes it', async ({ page, browser }) => {
  const title = `E2E Closing Drive ${Date.now()}`

  // create a drive to work on
  await page.getByRole('banner').getByRole('link', { name: 'Drives' }).click()
  await page.getByRole('button', { name: 'Create drive' }).click()
  await page.getByLabel('Drive title').fill(title)
  await page.getByLabel('Venue and address').fill('Community Hall, 1 Example Road')
  await page.getByLabel('Nearest MRT station').fill('Bugis MRT')
  await page.getByRole('textbox', { name: 'Event date' }).fill(in10Days)
  await page.getByRole('textbox', { name: /^Start time/ }).fill('10:00')
  await page.getByRole('textbox', { name: /^End time/ }).fill('13:00')
  await page.getByRole('dialog').getByRole('button', { name: 'Create drive' }).click()
  await expect(page.getByText('adoption drive created successfully')).toBeVisible()

  // close registration
  await page.getByRole('main').getByRole('searchbox').first().fill(title)
  await page.getByRole('main').locator('tbody tr').filter({ hasText: title }).getByRole('checkbox').check()
  await page.getByRole('main').getByRole('group').getByRole('button', { name: 'Close registration', exact: true }).click()
  await page.getByRole('region', { name: /Notifications/ }).getByRole('button', { name: 'Close registration' }).click()
  await expect(page.getByText('1 drive closed')).toBeVisible()

  // a guest in another browser can no longer rsvp
  const guest = await browser.newPage()
  await guest.goto('/drives')
  await guest.getByRole('searchbox', { name: 'search', exact: true }).fill(title)
  await guest.getByRole('heading', { name: title }).click()
  await expect(guest.getByRole('dialog').getByText('registration has closed')).toBeVisible()
  await guest.close()

  // delete it so the drives list stays clean
  await page.getByRole('main').locator('tbody tr').filter({ hasText: title }).getByRole('checkbox').check()
  await page.getByRole('main').getByRole('group').getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('region', { name: /Notifications/ }).getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('main').locator('tbody tr').filter({ hasText: title })).toHaveCount(0)
})

test('admin filters drives by a date with no drives', async ({ page }) => {
  await page.getByRole('banner').getByRole('link', { name: 'Drives' }).click()
  await page.getByRole('main').getByRole('searchbox').first().fill('zzzz-no-such-drive')
  await expect(page.getByText('No matching drives')).toBeVisible()
})
