import { test, expect } from '@playwright/test'
import { demoAdmin } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/admin/)
})

test('admin finds books on Open Library and picks collection points', async ({ page }) => {
  await page.getByRole('banner').getByRole('link', { name: 'Book Inventory' }).click()
  await page.getByRole('button', { name: 'Add Book' }).click()

  await expect(page.getByRole('heading', { name: 'Find on Open Library' })).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Search', exact: true })).toBeDisabled()

  await page.getByLabel('Search by title, author or ISBN').fill('the hobbit')
  await page.getByRole('dialog').getByRole('button', { name: 'Search', exact: true }).click()

  // ticks the first result
  await page.getByRole('dialog').getByRole('checkbox', { name: 'Select The Hobbit', exact: true }).first().check()
  await expect(page.getByRole('dialog').getByText(/1 selected/)).toBeVisible()

  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('heading', { name: 'Choose collection locations' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add 1 book' })).toBeDisabled()

  // picks a station > now it can be added
  await page.getByRole('combobox', { name: /^MRT station for/ }).first().fill('Bugis MRT')
  await expect(page.getByRole('button', { name: 'Add 1 book' })).toBeEnabled()

  // goes back without adding anything
  await page.getByRole('button', { name: 'Back to results' }).click()
  await expect(page.getByRole('heading', { name: 'Find on Open Library' })).toBeVisible()
})
