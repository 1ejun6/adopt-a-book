import { test, expect } from '@playwright/test'
import { demoAdmin } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/admin/)
})

test('decided applications cannot be ticked', async ({ page }) => {
  await page.getByRole('banner').getByRole('link', { name: 'Adoption Applications' }).click()

  await page.getByRole('tab', { name: /^Approved/ }).click()
  await expect(page.getByRole('tab', { name: /^Approved/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('main').getByRole('checkbox')).toHaveCount(0)

  await page.getByRole('tab', { name: /^Cancelled/ }).click()
  await expect(page.getByRole('tab', { name: /^Cancelled/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('main').getByRole('checkbox')).toHaveCount(0)
})
