import { test, expect } from '@playwright/test'
import { demoAdmin } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/admin/)
})

test('admin adds a book by hand and deletes it again', async ({ page }) => {
  const title = `E2E Manual Book ${Date.now()}`

  await page.getByRole('banner').getByRole('link', { name: 'Book Inventory' }).click()
  await page.getByRole('button', { name: 'Add Book' }).click()
  await page.getByRole('button', { name: 'Enter manually' }).click()

  // presses Add book with nothing filled in
  await page.getByRole('button', { name: 'Add book', exact: true }).click()
  await expect(page.getByText('Please check the highlighted fields. Title, collection area and subject are required.')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveAttribute('aria-invalid', 'true')

  await page.getByRole('textbox', { name: 'Title', exact: true }).fill(title)
  await page.getByLabel('Authors (comma separated)').fill('Hand Writer')
  await page.getByLabel('Subject').selectOption('Fiction')
  await page.getByLabel('Condition').selectOption('like new')
  await page.getByLabel('Collection area (MRT station)').fill('Bugis MRT')
  await page.getByLabel('Description').fill('Added by a Playwright test.')
  await page.getByRole('button', { name: 'Add book', exact: true }).click()
  await expect(page.getByText(`you have created book ${title} successfully!`)).toBeVisible()

  // finds it in the inventory
  await page.getByRole('main').getByRole('searchbox').first().fill(title)
  await expect(page.getByRole('main').locator('tbody tr').filter({ hasText: title })).toBeVisible()

  // delete it so the inventory stays clean
  await page.getByRole('main').locator('tbody tr').filter({ hasText: title }).getByRole('checkbox').check()
  await page.getByRole('main').getByRole('group').getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('region', { name: /Notifications/ }).getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('main').locator('tbody tr').filter({ hasText: title })).toHaveCount(0)
})
