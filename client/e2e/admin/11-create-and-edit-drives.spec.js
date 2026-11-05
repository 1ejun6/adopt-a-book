import { test, expect } from '@playwright/test'
import { demoAdmin } from '../support/env.js'

// YYYY-MM-DD dates for the drive form
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
const in10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/admin/)
})

test('admin creates a drive, edits it and deletes it', async ({ page }) => {
  const title = `E2E Drive ${Date.now()}`
  const renamed = `${title} renamed`

  await page.getByRole('banner').getByRole('link', { name: 'Drives' }).click()
  await expect(page.getByRole('tab', { name: /^Upcoming/ })).toHaveAttribute('aria-selected', 'true')

  await page.getByRole('button', { name: 'Create drive' }).click()
  await expect(page.getByRole('heading', { name: 'Create drive' })).toBeVisible()
  await expect(page.getByLabel('Maximum capacity')).toHaveValue('30')

  // presses Create drive with no title
  await page.getByRole('dialog').getByRole('button', { name: 'Create drive' }).click()
  await expect(page.getByLabel('Drive title')).toHaveAttribute('aria-invalid', 'true')

  // a date in the past and 0 capacity
  await page.getByLabel('Drive title').fill(title)
  await page.getByLabel('Venue and address').fill('Library Hall, 10 Example Road')
  await page.getByLabel('Nearest MRT station').fill('Bugis MRT')
  await page.getByRole('textbox', { name: 'Event date' }).fill(yesterday)
  await page.getByLabel('Maximum capacity').fill('0')
  await page.getByRole('dialog').getByRole('button', { name: 'Create drive' }).click()
  await expect(page.getByRole('textbox', { name: 'Event date' })).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Maximum capacity')).toHaveAttribute('aria-invalid', 'true')

  // fills it in properly
  await page.getByRole('textbox', { name: 'Event date' }).fill(in10Days)
  await page.getByRole('textbox', { name: /^Start time/ }).fill('10:00')
  await page.getByRole('textbox', { name: /^End time/ }).fill('13:00')
  await page.getByLabel('Maximum capacity').fill('30')
  await page.getByLabel('Description').fill('Bring a book, take a book.')
  await page.getByRole('dialog').getByRole('button', { name: 'Create drive' }).click()
  await expect(page.getByText('adoption drive created successfully')).toBeVisible()

  // opens it
  await page.getByRole('main').getByRole('searchbox').first().fill(title)
  await page.getByRole('main').locator('tbody tr').filter({ hasText: title }).click()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Drive details' })).toBeVisible()
  await expect(page.getByRole('dialog').getByText('Bring a book, take a book.')).toBeVisible()

  // edits it
  await page.getByRole('dialog').getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByRole('heading', { name: 'Edit drive' })).toBeVisible()
  await page.getByLabel('Drive title').fill(renamed)
  await page.getByLabel('Maximum capacity').fill('25')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('adoption drive updated successfully')).toBeVisible()

  await page.getByRole('main').getByRole('searchbox').first().fill(renamed)
  await expect(page.getByRole('main').locator('tbody tr').filter({ hasText: renamed })).toContainText('0 / 25')

  // delete it so the drives list stays clean
  await page.getByRole('main').locator('tbody tr').filter({ hasText: renamed }).getByRole('checkbox').check()
  await page.getByRole('main').getByRole('group').getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('region', { name: /Notifications/ }).getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('main').locator('tbody tr').filter({ hasText: renamed })).toHaveCount(0)
})
