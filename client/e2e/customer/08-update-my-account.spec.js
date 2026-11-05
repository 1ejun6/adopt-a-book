import { test, expect } from '@playwright/test'
import { demoCustomer } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/customer/)
})

test('customer changes their name and changes it back', async ({ page }) => {
  await page.getByRole('banner').getByRole('link', { name: 'Account' }).click()
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible()

  const oldName = await page.getByLabel('Full name').inputValue()

  // a bad email shows an error
  await page.getByLabel('Email address').fill('invalid-email-format')
  await page.getByLabel('Email address').blur()
  await expect(page.getByText('Enter a valid email address.')).toBeVisible()
  await page.getByLabel('Email address').fill(demoCustomer.email)

  await page.getByLabel('Full name').fill(`${oldName} (edited)`)
  await page.locator('#profile-panel').getByRole('button', { name: 'Update' }).click()
  await expect(page.getByText('Profile saved').first()).toBeVisible()
  await expect(page.locator('aside.account-rail')).toContainText(`${oldName} (edited)`)

  // put the old name back
  await page.getByLabel('Full name').fill(oldName)
  await page.locator('#profile-panel').getByRole('button', { name: 'Update' }).click()
  await expect(page.locator('aside.account-rail')).toContainText(oldName)
})

test('customer types two different new passwords', async ({ page }) => {
  await page.getByRole('banner').getByRole('link', { name: 'Account' }).click()
  await page.locator('#password-tab').click()

  await page.getByLabel('New password', { exact: true }).fill('e2e-New-Password-456')
  await page.getByLabel('Confirm new password').fill('something-else-789')
  await page.getByLabel('Confirm new password').blur()
  await expect(page.getByText('Passwords don’t match.')).toBeVisible()
  await expect(page.locator('#password-panel').getByRole('button', { name: 'Update' })).toBeDisabled()

  // fixed, but not saved, so the .env password keeps working
  await page.getByLabel('Confirm new password').fill('e2e-New-Password-456')
  await expect(page.getByText('Passwords match.')).toBeVisible()
})
