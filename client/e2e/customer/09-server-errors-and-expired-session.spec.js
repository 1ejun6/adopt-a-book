import { test, expect } from '@playwright/test'
import { demoCustomer, serverUrl } from '../support/env.js'

// fake a broken server for one request
const serverDown = route => route.fulfill({ status: 503, json: { error: 'server unavailable > please try again' } })

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/customer/)
})

test('browse books recovers after the server is down', async ({ page }) => {
  await page.route(`${serverUrl}/customer/catalogue*`, serverDown)
  await page.goto('/customer/books')
  await expect(page.getByText('server unavailable').first()).toBeVisible()

  await page.unrouteAll()
  await page.getByRole('button', { name: 'retry', exact: true }).click()
  await expect(page.getByRole('main').locator('article strong').first()).toBeVisible()
})

test('saved books recovers after the server is down', async ({ page }) => {
  await page.route(`${serverUrl}/watchlist*`, serverDown)
  await page.goto('/customer/watchlist')
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()

  await page.unrouteAll()
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeHidden()
})

test('my adoptions recovers after the server is down', async ({ page }) => {
  await page.route(`${serverUrl}/applications*`, serverDown)
  await page.goto('/customer/adoptions')
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()

  await page.unrouteAll()
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeHidden()
})

test('account recovers after the server is down', async ({ page }) => {
  await page.route(`${serverUrl}/customer/profile*`, serverDown)
  await page.goto('/customer/account')
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()

  await page.unrouteAll()
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByLabel('Full name')).not.toHaveValue('')
})

test('adoption drives recovers after the server is down', async ({ page }) => {
  await page.route(`${serverUrl}/customer/drives*`, serverDown)
  await page.goto('/customer/drives')
  await expect(page.getByText('server unavailable').first()).toBeVisible()

  await page.unrouteAll()
  await page.getByRole('button', { name: 'retry', exact: true }).click()
  await expect(page.getByRole('tab', { name: /^upcoming/ })).toBeVisible()
})

test('customer whose session expires is sent to login', async ({ page, context }) => {
  await page.getByRole('banner').getByRole('link', { name: 'Saved books' }).click()
  await expect(page.getByRole('heading', { name: 'Saved books', level: 1 })).toBeVisible()

  // throw away the login cookies
  await context.clearCookies()
  await page.goto('/customer/adoptions')
  await expect(page).toHaveURL(/login/)
})
