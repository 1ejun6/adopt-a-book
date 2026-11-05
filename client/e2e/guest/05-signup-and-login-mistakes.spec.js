import { test, expect } from '@playwright/test'
import { isApi, trackApiRequests } from '../support/guest.js'

//@ChitanyaBharathi > journey 1.5 > a guest makes the usual mistakes &&& gets clear feedback every time
test('guest makes mistakes signing up and logging in', async ({ page }) => {
  const api = trackApiRequests(page)
  const email = `e2e-taken-${Date.now()}@example.com`
  const errorToast = page.locator('[data-sonner-toast][data-type="error"]')

  // 1. clicks Create Account &&& presses Register with empty fields
  await page.goto('/')
  await page.getByRole('link', { name: 'Create Account' }).click()
  await page.getByRole('button', { name: 'Register' }).click()
  await expect(page).toHaveURL('/register')
  await expect(page.getByLabel('Name', { exact: true })).toBeFocused()
  expect(await page.getByLabel('Name', { exact: true }).evaluate(input => input.validity.valueMissing)).toBe(true)

  // 2. types an email without @
  await page.getByLabel('Name', { exact: true }).fill('E2E Mistakes')
  await page.getByLabel('Email', { exact: true }).fill('not-an-email')
  await page.getByLabel('Password', { exact: true }).fill('a-strong-password-123')
  await page.getByRole('button', { name: 'Register' }).click()
  expect(await page.getByLabel('Email', { exact: true }).evaluate(input => input.validity.typeMismatch)).toBe(true)
  expect(api.to('/register')).toHaveLength(0)

  // 3. forgets to pick a favourite genre
  const genreAlert = page.getByRole('alert').filter({ hasText: 'Choose at least one favourite genre' })
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByRole('button', { name: 'Register' }).click()
  await expect(genreAlert).toBeVisible()
  await expect(page.getByRole('checkbox').first()).toBeFocused()
  expect(api.to('/register')).toHaveLength(0)

  // 4. picks one &&& registers > then tries the same email again
  await page.getByRole('checkbox', { name: 'Adventure' }).check()
  await page.getByRole('button', { name: 'Register' }).click()
  await expect(page).toHaveURL('/login')
  await page.getByRole('link', { name: 'Create Account' }).click()
  await page.getByLabel('Name', { exact: true }).fill('E2E Mistakes')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('a-strong-password-123')
  await page.getByRole('checkbox', { name: 'Adventure' }).check()
  const secondTry = page.waitForResponse(response => isApi('/register')(new URL(response.url())))
  await page.getByRole('button', { name: 'Register' }).click()
  expect((await secondTry).ok()).toBe(false)
  await expect(errorToast).toBeVisible()
  await expect(page).toHaveURL('/register')
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('E2E Mistakes')
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(email)

  // 5. clicks Login in the navbar &&& enters the wrong password
  await page.getByRole('link', { name: 'Login', exact: true }).click()
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('the-wrong-password')
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(errorToast).toBeVisible()
  await expect(page).toHaveURL('/login')

  // 6. presses the eye to check what they typed
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: /^show password$/i }).click()
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text')
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('the-wrong-password')
})
