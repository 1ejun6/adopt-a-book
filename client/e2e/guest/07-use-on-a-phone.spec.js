import { test, expect, devices } from '@playwright/test'
import {
  bookSpines, guestNavLinks, isRsvpable, nextResponse, openHomepage, pickDrive, showDrive, upcomingDrives,
} from '../support/guest.js'

//@ChitanyaBharathi > journey 1.7 > phone-sized screen with touch > navbar collapses behind ☰
//@ChitanyaBharathi > drop defaultBrowserType > playwright only allows switching browser in the config
const { defaultBrowserType, ...pixel5 } = devices['Pixel 5']
test.use(pixel5)

test('guest uses the site on their phone', async ({ page }) => {
  const menuButton = page.locator('button[aria-controls="mobile"]')
  const mobileMenu = page.locator('#mobile')
  const desktopNav = page.getByRole('banner').locator('[data-slot="navigation-menu"]')

  // 1. opens the homepage
  const books = await openHomepage(page)
  await expect(menuButton).toBeVisible()
  await expect(desktopNav).toBeHidden()
  await expect(mobileMenu).toBeHidden()
  const shelf = await bookSpines(page).first().boundingBox()
  expect(shelf.x).toBeGreaterThanOrEqual(0)

  // 2. taps a book spine
  await bookSpines(page).first().tap()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText(books[0].title)
  await expect(bookSpines(page).first().locator('.book-preview')).toBeHidden()
  const viewport = page.viewportSize()
  const box = await dialog.boundingBox()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)

  // 3. closes it &&& taps ☰
  await dialog.getByRole('button', { name: 'Close' }).tap()
  await expect(dialog).toBeHidden()
  await menuButton.tap()
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true')
  await expect(mobileMenu.getByRole('link')).toHaveText(guestNavLinks)

  // 4. taps Adoption Drives
  const drivesResponse = nextResponse(page, '/drives')
  await mobileMenu.getByRole('link', { name: 'Adoption Drives' }).tap()
  await expect(page).toHaveURL('/drives')
  await expect(mobileMenu).toBeHidden()

  // 5. opens a drive &&& scrolls to rsvp
  const { drives } = await (await drivesResponse).json()
  const drive = pickDrive(upcomingDrives(drives), 'upcoming open drive with free slots', isRsvpable)
  await (await showDrive(page, drive)).tap()
  const rsvp = dialog.getByRole('button', { name: 'rsvp' })
  await rsvp.scrollIntoViewIfNeeded()
  await expect(rsvp).toBeInViewport()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  // 6. opens ☰ &&& taps Create Account
  await menuButton.tap()
  await mobileMenu.getByRole('link', { name: 'Create Account' }).tap()
  await expect(page).toHaveURL('/register')
  await expect(mobileMenu).toBeHidden()

  // 7. opens ☰ &&& taps ✕ (or presses Esc)
  await menuButton.tap()
  await expect(mobileMenu).toBeVisible()
  await menuButton.tap()
  await expect(mobileMenu).toBeHidden()
  await menuButton.tap()
  await expect(mobileMenu).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(mobileMenu).toBeHidden()
  await expect(page).toHaveURL('/register')
})
