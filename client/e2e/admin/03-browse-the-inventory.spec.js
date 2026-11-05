import { test, expect } from '@playwright/test'
import { demoAdmin } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/admin/)
})

test('admin browses the inventory and opens a book', async ({ page }) => {
  await page.getByRole('banner').getByRole('link', { name: 'Book Inventory' }).click()
  await expect(page.getByText('Manage book records and track their availability.')).toBeVisible()

  await expect(page.getByRole('tab', { name: /^All books/ })).toBeVisible()
  await expect(page.getByRole('tab', { name: /^Available/ })).toBeVisible()
  await expect(page.getByRole('tab', { name: /^Reserved/ })).toBeVisible()
  await expect(page.getByRole('tab', { name: /^Adopted/ })).toBeVisible()

  // next page
  await page.getByRole('main').getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByRole('main').getByText(/^Page 2 of \d+$/)).toBeVisible()

  // searches for a common word
  await page.getByRole('main').getByRole('searchbox').first().fill('the')
  await expect(page.getByRole('main').locator('tbody tr').first()).toBeVisible()

  // searches for something that doesn't exist
  await page.getByRole('main').getByRole('searchbox').first().fill('zzzz-no-such-book')
  await expect(page.getByText('No books in this view')).toBeVisible()

  // opens a book
  await page.getByRole('main').getByRole('searchbox').first().fill('')
  await page.getByRole('main').locator('tbody tr').first().click()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Book details' })).toBeVisible()
  await expect(page.getByRole('dialog').getByText('Condition', { exact: true })).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()

  // the Reserved tab
  await page.getByRole('tab', { name: /^Reserved/ }).click()
  await expect(page.getByRole('tab', { name: /^Reserved/ })).toHaveAttribute('aria-selected', 'true')
})
