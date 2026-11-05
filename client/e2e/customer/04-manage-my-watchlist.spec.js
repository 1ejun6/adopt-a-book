import { test, expect } from '@playwright/test'
import { demoCustomer } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/customer/)
})

test('customer edits the note on a saved book and removes it', async ({ page }) => {
  // save a book with a note first
  await page.getByRole('banner').getByRole('link', { name: 'Browse Books' }).click()
  await expect(page.getByText(/books found/)).toBeVisible()

  const title = (await page.getByRole('main').locator('article strong').first().textContent()).trim()
  await page.getByRole('button', { name: `Save ${title} to saved books` }).first().click()
  await page.getByRole('textbox', { name: 'Private note (optional)' }).fill('pick up before the drive')
  await page.getByRole('button', { name: 'Save note' }).click()
  await expect(page.getByText('Note saved')).toBeVisible()

  // open it from Saved books
  await page.goto('/customer/watchlist')
  await page.getByRole('button', { name: `View details for ${title}` }).first().click()
  await expect(page.getByRole('heading', { name: 'Your private note' })).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText('pick up before the drive')

  // edit the note
  await page.getByRole('button', { name: 'Edit note' }).click()
  await page.getByRole('textbox', { name: 'Private note (optional)' }).fill('ask if the cover is torn')
  await page.getByRole('button', { name: 'Save note' }).click()
  await expect(page.getByText('Note saved')).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText('ask if the cover is torn')

  // the new note is still there after a reload
  await page.reload()
  await page.getByRole('button', { name: `View details for ${title}` }).first().click()
  await expect(page.getByRole('dialog')).toContainText('ask if the cover is torn')

  // remove it
  await page.getByRole('button', { name: 'Remove from saved books' }).click()
  await page.getByRole('button', { name: 'Remove saved book' }).click()
  await expect(page.getByText('Removed from saved books')).toBeVisible()
  await expect(page.getByRole('dialog')).toBeHidden()
})
