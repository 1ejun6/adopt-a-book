import {
  driveCard, driveCards, fakeDrive, foundCount, isApi, isRsvpable, json, nextResponse, pickDrive, showDrive, toast,
  upcomingDrives,
} from '../support/guest.js'
import { test, expect, slowly } from '../support/customer.js'

const tab = (page, name) => page.getByRole('tab', { name: new RegExp(`^${name}`) })
const slotsText = count => `${count} ${count === 1 ? 'slot' : 'slots'}`

//@ChitanyaBharathi > 🔌 replaces the customer drives list &&& the book counts
async function serveCustomerDrives(page, drives) {
  await page.route(isApi('/customer/drives'), json({ drives }))
  await page.route(isApi('/books'), json({ books: [], total: 0 }))
}

//@ChitanyaBharathi > journey 2.7 > a customer signs up for a drive, then changes their mind
test('customer rsvps to a drive and cancels it', async ({ page, customer }) => {
  // 1. opens Adoption Drives
  const response = nextResponse(page, '/customer/drives')
  await page.goto('/customer/drives')
  const upcoming = upcomingDrives((await (await response).json()).drives)
  await expect(tab(page, 'my drives')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('no registered adoption drives')).toBeVisible()
  await tab(page, 'upcoming').click()
  await expect(foundCount(page, upcoming.length)).toBeVisible()
  await expect(tab(page, 'upcoming')).toContainText(String(upcoming.length))

  // 2. opens an open drive &&& clicks rsvp
  const drive = pickDrive(upcoming, 'upcoming open drive with free slots', isRsvpable)
  await (await showDrive(page, drive)).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: drive.title })).toBeVisible()
  const rsvpPath = `/drives/${drive.id}/rsvp`
  await page.route(isApi(rsvpPath), slowly())
  await dialog.getByRole('button', { name: 'rsvp', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'saving...' })).toBeVisible()
  await expect(toast(page, 'registered for adoption drive')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'cancel registration' })).toBeVisible()
  await page.unroute(isApi(rsvpPath))

  // 3. closes the window
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(driveCards(page)).toHaveCount(0)
  await expect(tab(page, 'upcoming')).toContainText(String(upcoming.length - 1))
  await expect(tab(page, 'my drives')).toContainText('1')

  // 4. opens it from my drives
  await tab(page, 'my drives').click()
  await driveCard(page, drive.title).click()
  await expect(dialog.getByText(slotsText(drive.spotsleft - 1), { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')

  // 5. reloads the page
  await page.reload()
  await expect(tab(page, 'my drives')).toHaveAttribute('aria-selected', 'true')
  await expect(driveCard(page, drive.title)).toBeVisible()

  // 6. clicks cancel registration
  await driveCard(page, drive.title).click()
  await dialog.getByRole('button', { name: 'cancel registration' }).click()
  await expect(toast(page, 'registration cancelled')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'rsvp', exact: true })).toBeVisible()
  await expect(dialog.getByText(slotsText(drive.spotsleft), { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByText('no registered adoption drives')).toBeVisible()
  await tab(page, 'upcoming').click()
  await expect(foundCount(page, upcoming.length)).toBeVisible()
})

test.describe('🔌 drives the seed does not have', () => {
  // 7. opens a drive with 0 slots left
  test('a full drive says so instead of offering rsvp', async ({ page, customer }) => {
    await serveCustomerDrives(page, [fakeDrive({ title: 'full swap', spotsleft: 0 })])
    await page.goto('/customer/drives')
    await tab(page, 'upcoming').click()
    await driveCard(page, 'full swap').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('this drive is full')
    await expect(dialog.getByRole('button', { name: 'rsvp', exact: true })).toHaveCount(0)
  })

  // 8. clicks rsvp but the drive closed in the meantime
  test('a drive that closed in the meantime cannot be joined', async ({ page, customer }) => {
    const drive = fakeDrive({ title: 'closing swap' })
    await serveCustomerDrives(page, [drive])
    await page.route(isApi(`/drives/${drive.id}/rsvp`), json({ error: 'drive is closed or cancelled' }, 409))
    await page.goto('/customer/drives')
    await tab(page, 'upcoming').click()
    await driveCard(page, 'closing swap').click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'rsvp', exact: true }).click()
    await expect(toast(page, 'drive is closed or cancelled')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'rsvp', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(tab(page, 'my drives')).toContainText('0')
  })
})
