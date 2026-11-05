import { test, expect } from '@playwright/test'
import { demoCustomer } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/customer/)
})

test('customer requests a book and sees it in my adoptions', async ({ page }) => {
  await page.getByRole('banner').getByRole('link', { name: 'Browse Books' }).click()
  await expect(page.getByText(/books found/)).toBeVisible()

  const title = (await page.getByRole('main').locator('article strong').first().textContent()).trim()
  await page.getByRole('button', { name: `View details for ${title}` }).first().click()

  await page.getByRole('button', { name: 'Request this book' }).click()
  await expect(page.getByRole('dialog', { name: 'Request this book' })).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText(demoCustomer.email)

  // go back, then close without sending
  await page.getByRole('button', { name: 'Back to details' }).click()
  await expect(page.getByRole('dialog', { name: 'Book details' })).toBeVisible()
  await page.keyboard.press('Escape')

  // now send it
  await page.getByRole('button', { name: `View details for ${title}` }).first().click()
  await page.getByRole('button', { name: 'Request this book' }).click()
  await page.getByRole('button', { name: 'Send adoption request' }).click()
  await expect(page.getByRole('heading', { name: 'Adoption request sent' })).toBeVisible()

  await page.getByRole('button', { name: 'Continue browsing' }).click()
  await page.getByRole('button', { name: `View details for ${title}` }).first().click()
  await expect(page.getByText('You already have a request for this book.')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('banner').getByRole('link', { name: 'My Adoptions' }).click()
  await page.getByRole('tab', { name: /^All/ }).click()
  await expect(page.locator('button.adoption-row').filter({ hasText: title }).first()).toContainText('Under review')

  // clean up so the book is free again
  await page.locator('button.adoption-row').filter({ hasText: title }).first().click()
  await page.getByRole('button', { name: 'Withdraw request' }).click()
  await page.getByRole('button', { name: 'Withdraw request' }).click()
  await expect(page.getByRole('heading', { name: 'Request withdrawn' })).toBeVisible()
})
