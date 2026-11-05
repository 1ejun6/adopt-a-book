import { test, expect } from '@playwright/test'
import { demoAdmin, serverUrl } from '../support/env.js'

// fake a broken server for one request
const serverDown = route => route.fulfill({ status: 503, json: { error: 'server unavailable > please try again' } })

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/admin/)
})

test('book inventory recovers after the server is down', async ({ page }) => {
  await page.route(`${serverUrl}/admin/books*`, serverDown)
  await page.goto('/admin/books')
  await expect(page.getByRole('main').getByRole('button', { name: 'Retry', exact: true })).toBeVisible()

  await page.unrouteAll()
  await page.getByRole('main').getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByRole('main').locator('tbody tr').first()).toBeVisible()
})

test('adoption applications recovers after the server is down', async ({ page }) => {
  await page.route(`${serverUrl}/admin/applications*`, serverDown)
  await page.goto('/admin/applications')
  await expect(page.getByRole('main').getByRole('button', { name: 'Retry', exact: true })).toBeVisible()

  await page.unrouteAll()
  await page.getByRole('main').getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByRole('main').getByRole('button', { name: 'Retry', exact: true })).toBeHidden()
})

test('appointments recovers after the server is down', async ({ page }) => {
  await page.route(`${serverUrl}/admin/appointments*`, serverDown)
  await page.goto('/admin/appointments')
  await expect(page.getByRole('main').getByRole('button', { name: 'Retry', exact: true })).toBeVisible()

  await page.unrouteAll()
  await page.getByRole('main').getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByRole('main').getByRole('button', { name: 'Retry', exact: true })).toBeHidden()
})

test('drives recovers after the server is down', async ({ page }) => {
  await page.route(`${serverUrl}/admin/drives*`, serverDown)
  await page.goto('/admin/drives')
  await expect(page.getByRole('main').getByRole('button', { name: 'Retry', exact: true })).toBeVisible()

  await page.unrouteAll()
  await page.getByRole('main').getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByRole('main').getByRole('button', { name: 'Retry', exact: true })).toBeHidden()
})

test('admin whose session expires is sent to login', async ({ page, context }) => {
  await page.getByRole('banner').getByRole('link', { name: 'Book Inventory' }).click()
  await expect(page.getByRole('heading', { name: 'Book Inventory', level: 1 })).toBeVisible()

  // throw away the login cookies
  await context.clearCookies()
  await page.goto('/admin/drives')
  await expect(page).toHaveURL(/login/)
})
