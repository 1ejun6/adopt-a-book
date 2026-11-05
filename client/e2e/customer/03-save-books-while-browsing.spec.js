import { test, expect } from '@playwright/test'
import { demoCustomer } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/customer/)
})

test('customer saves a book from its card and removes it again', async ({ page }) => {
  await page.getByRole('banner').getByRole('link', { name: 'Browse Books' }).click()
  await expect(page.getByText(/books found/)).toBeVisible()

  const title = (await page.getByRole('main').locator('article strong').first().textContent()).trim()

  await page.getByRole('button', { name: `Save ${title} to saved books` }).first().click()
  await expect(page.getByText('Book saved')).toBeVisible()

  await page.getByRole('textbox', { name: 'Private note (optional)' }).fill('ask about the cover')
  await page.getByRole('button', { name: 'Save note' }).click()
  await expect(page.getByText('Note saved')).toBeVisible()

  await page.goto('/customer/watchlist')
  await expect(page.getByRole('button', { name: `View details for ${title}` }).first()).toBeVisible()

  // clean up so the next run starts the same
  await page.getByRole('button', { name: `Remove ${title} from saved books` }).first().click()
  await page.getByRole('button', { name: 'Remove saved book' }).click()
  await expect(page.getByText('Removed from saved books')).toBeVisible()
})

test('customer saves a book from its details window and removes it again', async ({ page }) => {
  await page.getByRole('banner').getByRole('link', { name: 'Browse Books' }).click()
  await expect(page.getByText(/books found/)).toBeVisible()

  await page.getByRole('main').locator('article strong').nth(1).click()
  await expect(page.getByRole('dialog', { name: 'Book details' })).toBeVisible()

  await page.getByRole('button', { name: 'Save book' }).click()
  await expect(page.getByRole('button', { name: 'Remove from saved books' })).toBeVisible()

  // clean up so the next run starts the same
  await page.getByRole('button', { name: 'Remove from saved books' }).click()
  await expect(page.getByRole('button', { name: 'Save book' })).toBeVisible()
})
