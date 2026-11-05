import { test, expect } from '@playwright/test'

test('guest tries to rsvp and creates an account', async ({ page }) => {
  await page.goto('/drives')
  await expect(page.getByText(/adoption drives found/)).toBeVisible()

  await page.getByRole('button', { name: 'open', exact: true }).click()
  await page.getByRole('main').getByRole('heading', { level: 3 }).first().click()

  await page.getByRole('dialog').getByRole('button', { name: 'rsvp' }).click()
  await expect(page.getByText('log in to rsvp')).toBeVisible()

  await page.getByRole('button', { name: 'log in' }).click()
  await expect(page).toHaveURL(/login/)
  await page.getByRole('link', { name: 'Create Account' }).click()
  await expect(page).toHaveURL(/register/)
  await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible()

  await page.getByRole('textbox', { name: 'Name' }).fill('E2E Guest')
  await page.getByRole('textbox', { name: 'Email' }).fill(`e2e-guest-${Date.now()}@example.com`)
  await page.getByRole('textbox', { name: 'Password' }).fill('a-strong-password-123')
  await page.getByRole('checkbox', { name: 'Adventure' }).check()
  await page.getByRole('button', { name: 'Register' }).click()

  await expect(page.getByText('registration successful')).toBeVisible()
  await expect(page).toHaveURL(/login/)
})
