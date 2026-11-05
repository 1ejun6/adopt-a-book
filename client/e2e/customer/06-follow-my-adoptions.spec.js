import { test, expect } from '@playwright/test'
import { demoCustomer } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/customer/)
})

test('customer looks through their adoptions', async ({ page }) => {
  await page.getByRole('banner').getByRole('link', { name: 'My Adoptions' }).click()

  await expect(page.getByRole('tab', { name: /^Active/ })).toBeVisible()
  await expect(page.getByRole('tab', { name: /^History/ })).toBeVisible()

  await page.locator('button.adoption-row').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()

  await page.getByRole('tab', { name: /^History/ }).click()
  await expect(page.getByRole('tab', { name: /^History/ })).toHaveAttribute('data-state', 'active')
})
