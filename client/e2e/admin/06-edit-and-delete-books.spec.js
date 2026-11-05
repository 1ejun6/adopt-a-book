import { test, expect } from '@playwright/test'
import { demoAdmin } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/admin/)
})

test('admin edits a book and deletes it', async ({ page }) => {
  const title = `E2E Edit Book ${Date.now()}`
  const renamed = `${title} renamed`

  // add a book to work on
  await page.getByRole('banner').getByRole('link', { name: 'Book Inventory' }).click()
  await page.getByRole('button', { name: 'Add Book' }).click()
  await page.getByRole('button', { name: 'Enter manually' }).click()
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill(title)
  await page.getByLabel('Subject').selectOption('Fiction')
  await page.getByLabel('Condition').selectOption('fair')
  await page.getByLabel('Collection area (MRT station)').fill('Bugis MRT')
  await page.getByRole('button', { name: 'Add book', exact: true }).click()
  await expect(page.getByText(`you have created book ${title} successfully!`)).toBeVisible()

  // tick it and edit it
  await page.getByRole('main').getByRole('searchbox').first().fill(title)
  await page.getByRole('main').locator('tbody tr').filter({ hasText: title }).getByRole('checkbox').check()
  await expect(page.getByRole('main').getByText('1 selected')).toBeVisible()
  await page.getByRole('main').getByRole('group').getByRole('button', { name: 'Edit', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Edit book' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(title)
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill(renamed)
  await page.getByLabel('Condition').selectOption('like new')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText(`you have updated book ${renamed} successfully!`)).toBeVisible()

  // open it and check the change
  await page.getByRole('main').getByRole('searchbox').first().fill(renamed)
  await page.getByRole('main').locator('tbody tr').filter({ hasText: renamed }).click()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Book details' })).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText(renamed)
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()

  // starts to delete it, cancels, then deletes it for real
  await page.getByRole('main').locator('tbody tr').filter({ hasText: renamed }).getByRole('checkbox').check()
  await page.getByRole('main').getByRole('group').getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('region', { name: /Notifications/ }).getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('main').locator('tbody tr').filter({ hasText: renamed })).toBeVisible()

  await page.getByRole('main').getByRole('group').getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('region', { name: /Notifications/ }).getByRole('button', { name: 'Delete', exact: true }).last().click()
  await expect(page.getByRole('main').locator('tbody tr').filter({ hasText: renamed })).toHaveCount(0)
})
