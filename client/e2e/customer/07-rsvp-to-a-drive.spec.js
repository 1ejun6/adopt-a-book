import { test, expect } from '@playwright/test'
import { demoCustomer } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/customer/)
})

test('customer rsvps to a drive and cancels it', async ({ page }) => {
  await page.getByRole('banner').getByRole('link', { name: 'Adoption Drives' }).click()
  await expect(page.getByRole('tab', { name: /^my drives/ })).toHaveAttribute('aria-selected', 'true')

  await page.getByRole('tab', { name: /^upcoming/ }).click()
  await page.getByRole('button', { name: 'open', exact: true }).click()

  const title = (await page.getByRole('main').getByRole('heading', { level: 3 }).first().textContent()).trim()
  await page.getByRole('main').getByRole('heading', { name: title }).click()

  await page.getByRole('dialog').getByRole('button', { name: 'rsvp', exact: true }).click()
  await expect(page.getByText('registered for adoption drive')).toBeVisible()
  await expect(page.getByRole('button', { name: 'cancel registration' })).toBeVisible()
  await page.keyboard.press('Escape')

  // it is now under my drives
  await page.getByRole('tab', { name: /^my drives/ }).click()
  await page.getByRole('main').getByRole('heading', { name: title }).click()

  // cancel it so the slot is free again
  await page.getByRole('button', { name: 'cancel registration' }).click()
  await expect(page.getByText('registration cancelled')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'rsvp', exact: true })).toBeVisible()
})
