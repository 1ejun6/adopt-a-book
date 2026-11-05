import { test, expect } from '@playwright/test'
import { demoCustomer } from '../support/env.js'

test('guest forgets parts of the register form', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Create Account' }).click()

  await page.getByRole('button', { name: 'Register' }).click()
  await expect(page).toHaveURL(/register/)

  await page.getByRole('textbox', { name: 'Name' }).fill('E2E Mistakes')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password)
  await page.getByRole('button', { name: 'Register' }).click()

  await expect(page.getByText('Choose at least one favourite genre')).toBeVisible()
  await expect(page).toHaveURL(/register/)
})

test('guest registers with an email that is already used', async ({ page }) => {
  await page.goto('/register')
  await page.getByRole('textbox', { name: 'Name' }).fill('E2E Mistakes')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password)
  await page.getByRole('checkbox', { name: 'Adventure' }).check()
  await page.getByRole('button', { name: 'Register' }).click()

  await expect(page).toHaveURL(/register/)
  await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue(demoCustomer.email)
})

test('guest logs in with the wrong password', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Login', exact: true }).click()

  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email)
  await page.getByRole('textbox', { name: 'Password' }).fill('the-wrong-password')
  await page.getByRole('button', { name: 'Login', exact: true }).click()

  await expect(page).toHaveURL(/login/)

  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(page.getByRole('textbox', { name: 'Password' })).toHaveValue('the-wrong-password')
})
