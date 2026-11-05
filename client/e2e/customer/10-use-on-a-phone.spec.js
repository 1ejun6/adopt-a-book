import { devices } from '@playwright/test'
import { isRsvpable, nextResponse, pickDrive, showDrive, toast, upcomingDrives } from '../support/guest.js'
import { test, expect, bookCards, customerNavLinks, nextCatalogue, saveButton } from '../support/customer.js'

//@ChitanyaBharathi > journey 2.10 > phone-sized screen with touch > same setup as guest journey 1.7
const { defaultBrowserType, ...pixel5 } = devices['Pixel 5']
test.use(pixel5)

//@ChitanyaBharathi > fails when the box spills past either side of the screen
async function expectFitsScreen(page, locator) {
  const box = await locator.boundingBox()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width)
}

test('customer uses the site on their phone', async ({ page, customer }) => {
  const menuButton = page.locator('button[aria-controls="mobile"]')
  const mobileMenu = page.locator('#mobile')
  const dialog = page.getByRole('dialog')

  // 1. logs in &&& taps ☰
  await page.goto('/customer')
  await menuButton.tap()
  await expect(mobileMenu.getByRole('link')).toHaveText(customerNavLinks)
  await expect(mobileMenu.getByRole('button', { name: 'Logout' })).toBeVisible()

  // 2. taps Browse Books
  const catalogue = nextCatalogue(page)
  await mobileMenu.getByRole('link', { name: 'Browse Books' }).tap()
  await expect(page).toHaveURL('/customer/books')
  await expect(mobileMenu).toBeHidden()
  const { books } = await (await catalogue).json()
  await expect(bookCards(page)).toHaveCount(books.length)
  const [first, second] = [await bookCards(page).nth(0).boundingBox(), await bookCards(page).nth(1).boundingBox()]
  expect(second.x).toBe(first.x)
  expect(second.y).toBeGreaterThan(first.y)

  // 3. taps a card's bookmark
  const firstSave = saveButton(bookCards(page).first())
  await expect(firstSave).toBeEnabled()
  await firstSave.tap()
  const saved = page.locator('[data-sonner-toast]').filter({ hasText: 'saved to watchlist' })
  await expect(saved).toBeVisible()
  await expectFitsScreen(page, saved)
  await saved.getByPlaceholder('optional comment').fill('on the bus')
  await saved.getByRole('button', { name: 'save' }).tap()
  await expect(toast(page, 'comment saved')).toBeVisible()

  // 4. taps a card
  await bookCards(page).nth(1).tap()
  await expect(dialog).toContainText(books[1].title)
  await expectFitsScreen(page, dialog)
  const request = dialog.getByRole('button', { name: 'Request this book' })
  await request.scrollIntoViewIfNeeded()
  await expect(request).toBeInViewport()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  // 5. opens ☰, taps Adoption Drives, then opens a drive
  const drivesResponse = nextResponse(page, '/customer/drives')
  await menuButton.tap()
  await mobileMenu.getByRole('link', { name: 'Adoption Drives' }).tap()
  const drive = pickDrive(upcomingDrives((await (await drivesResponse).json()).drives), 'upcoming open drive with free slots', isRsvpable)
  await page.getByRole('tab', { name: /^upcoming/ }).tap()
  await (await showDrive(page, drive)).tap()
  await expectFitsScreen(page, dialog)
  const rsvp = dialog.getByRole('button', { name: 'rsvp', exact: true })
  //@brod > wait for drive books to settle so dynamic content doesn't push rsvp out of viewport
  await dialog.locator('[aria-busy="true"]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
  await expect(async () => {
    await rsvp.scrollIntoViewIfNeeded()
    await expect(rsvp).toBeInViewport()
  }).toPass()
  await page.keyboard.press('Escape')

  // 6. opens ☰ &&& taps Logout
  await menuButton.tap()
  await mobileMenu.getByRole('button', { name: 'Logout' }).tap()
  await expect(page).toHaveURL('/login')
  await expect(mobileMenu).toBeHidden()
})
