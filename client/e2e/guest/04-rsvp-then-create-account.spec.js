import { test, expect } from '@playwright/test'
import { isRsvpable, openDrivesPage, pickDrive, showDrive, toast, upcomingDrives } from '../support/guest.js'

//@ChitanyaBharathi > journey 1.4 > a guest finds a drive they like, tries to rsvp &&& signs up to be able to
test('guest tries to rsvp, creates an account and is sent to login', async ({ page }) => {
  const email = `e2e-guest-${Date.now()}@example.com`

  // 1. opens an open drive &&& clicks rsvp
  const drive = pickDrive(upcomingDrives(await openDrivesPage(page)), 'upcoming open drive with free slots', isRsvpable)
  await (await showDrive(page, drive)).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'rsvp' }).click()
  const prompt = toast(page, 'log in to rsvp')
  await expect(prompt).toBeVisible()
  await expect(prompt.getByRole('button', { name: 'log in' })).toBeVisible()
  await expect(prompt.getByRole('button', { name: 'create account' })).toBeVisible()
  //@ChitanyaBharathi > other toasts vanish after 1s > this one waits for a choice
  await page.waitForTimeout(1500)
  await expect(prompt).toBeVisible()

  // 2. clicks create account
  await prompt.getByRole('button', { name: 'create account' }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL('/register')
  await expect(page.getByRole('heading', { name: 'Create Your Account' })).toBeVisible()

  // 3. fills in the form &&& ticks show password
  await page.getByLabel('Name', { exact: true }).fill('E2E Guest')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('a-strong-password-123')
  await page.getByRole('checkbox', { name: 'show password' }).click()
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text')

  // 4. clicks Register
  const register = page.getByRole('button', { name: /Register/ })
  await register.click()
  await expect(page.getByRole('button', { name: 'Registering…' })).toBeVisible()
  await expect(toast(page, 'registration successful')).toBeVisible()
  await expect(page).toHaveURL('/login')

  // 5. goes back to a drive, clicks rsvp, then log in
  await page.getByRole('link', { name: 'Adoption Drives' }).click()
  await (await showDrive(page, drive)).click()
  await dialog.getByRole('button', { name: 'rsvp' }).click()
  await toast(page, 'log in to rsvp').getByRole('button', { name: 'log in' }).click()
  await expect(page).toHaveURL('/login')
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible()
})
