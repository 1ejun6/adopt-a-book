import { test, expect } from '@playwright/test'
import { demoCustomer } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/customer/)
})

test('customer requests a book from their saved books', async ({ page }) => {
  // save a book first
  await page.getByRole('banner').getByRole('link', { name: 'Browse Books' }).click()
  await expect(page.getByText(/books found/)).toBeVisible()
  const title = (await page.getByRole('main').locator('article strong').nth(2).textContent()).trim()
  await page.getByRole('button', { name: `Save ${title} to saved books` }).first().click()
  await page.getByRole('textbox', { name: 'Private note (optional)' }).fill('ready to adopt this weekend')
  await page.getByRole('button', { name: 'Save note' }).click()
  await expect(page.getByText('Note saved')).toBeVisible()

  // request it from Saved books
  await page.goto('/customer/watchlist')
  await page.getByRole('button', { name: `View details for ${title}` }).first().click()
  await expect(page.getByRole('dialog')).toContainText('ready to adopt this weekend')
  await expect(page.getByRole('dialog').getByText('Available to request')).toBeVisible()

  await page.getByRole('button', { name: 'Request this book' }).click()
  await page.getByRole('button', { name: 'Send adoption request' }).click()
  await expect(page.getByRole('heading', { name: 'Adoption request sent' })).toBeVisible()

  await page.getByRole('link', { name: 'View my request' }).click()
  await expect(page).toHaveURL(/customer\/adoption/)
  await expect(page.getByRole('heading', { name: 'Adoption details' })).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText(title)

  // clean up: withdraw the request and unsave the book
  await page.getByRole('button', { name: 'Withdraw request' }).click()
  await page.getByRole('button', { name: 'Withdraw request' }).click()
  await expect(page.getByRole('heading', { name: 'Request withdrawn' })).toBeVisible()

  await page.goto('/customer/watchlist')
  await page.getByRole('button', { name: `Remove ${title} from saved books` }).first().click()
  await page.getByRole('button', { name: 'Remove saved book' }).click()
  await expect(page.getByText('Removed from saved books')).toBeVisible()
})
