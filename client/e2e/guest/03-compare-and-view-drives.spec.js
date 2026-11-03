import { test, expect } from '@playwright/test'
import {
  driveCard, driveCards, driveSearch, driveTitles, fakeDrive, foundCount, isApi, openDrivesPage,
  seededDriveTitlesByDate, seededDrives, serveFakeDrives, singaporeDate, sortSelect, statusSelect, stubGoogleMaps,
} from '../support/guest.js'

//@ChitanyaBharathi > journey 1.3 > a guest narrows the list down &&& looks closely at drives before deciding
test('guest compares drives and looks at one closely', async ({ page, context }) => {
  await stubGoogleMaps(context)
  await openDrivesPage(page)
  await expect(driveCards(page)).toHaveCount(5)

  // 1. searches for an MRT station's name
  await driveSearch(page).fill('Bugis')
  await expect(driveTitles(page)).toHaveText([seededDrives.bugis.title])
  await expect(foundCount(page, 1)).toBeVisible()

  // 2. clears the search &&& sorts latest first
  await driveSearch(page).fill('')
  await sortSelect(page).selectOption('desc')
  await expect(driveTitles(page)).toHaveText([...seededDriveTitlesByDate].reverse())

  // 3. clicks the green "open" legend button, then clicks it again
  const openLegend = page.getByRole('button', { name: 'open', exact: true })
  await openLegend.click()
  await expect(openLegend).toHaveAttribute('aria-pressed', 'true')
  await expect(driveCards(page)).toHaveCount(5)
  await openLegend.click()
  await expect(openLegend).toHaveAttribute('aria-pressed', 'false')

  // 4. picks "cancelled" in the status dropdown
  await statusSelect(page).selectOption('cancelled')
  await expect(page.getByText('no matching drives > adjust your filters or check another tab')).toBeVisible()

  // 5. resets the status &&& opens a drive
  await statusSelect(page).selectOption('all')
  await sortSelect(page).selectOption('asc')
  const bugisBooks = page.waitForResponse(response => isApi('/books')(new URL(response.url())) && new URL(response.url()).searchParams.get('limit') === '5')
  await driveCard(page, seededDrives.bugis.title).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: seededDrives.bugis.title })).toBeVisible()
  await expect(dialog.getByText('open', { exact: true })).toBeVisible()
  await expect(dialog.getByText('available slots')).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'book list' })).toBeVisible()
  const { books, total } = await (await bugisBooks).json()
  for (const book of books) { await expect(dialog).toContainText(book.title) }
  if (total > books.length) { await expect(dialog).toContainText(`& ${total - books.length} more`) }
  if (!books.length) { await expect(dialog).toContainText('no available books at this station yet') }

  // 6. clicks the venue
  const venue = dialog.getByRole('link', { name: seededDrives.bugis.venue })
  await expect(venue).toHaveAttribute('target', '_blank')
  const [mapsTab] = await Promise.all([context.waitForEvent('page'), venue.click()])
  await expect(mapsTab).toHaveURL(/google\.com\/maps/)
  await mapsTab.close()

  // 7. closes the window &&& opens a different drive
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  const bishanBooks = page.waitForResponse(response => isApi('/books')(new URL(response.url())) && new URL(response.url()).searchParams.get('limit') === '5')
  await driveCard(page, seededDrives.bishan.title).click()
  await expect(dialog.getByRole('heading', { name: seededDrives.bishan.title })).toBeVisible()
  const bishan = await (await bishanBooks).json()
  for (const book of bishan.books) { await expect(dialog).toContainText(book.title) }
  for (const book of books.filter(book => !bishan.books.some(other => other.id === book.id))) {
    await expect(dialog).not.toContainText(book.title)
  }
})

test.describe('🔌 drives the seed does not have', () => {
  // 8. opens the past tab when there are past drives
  test('past tab shows only past drives', async ({ page }) => {
    await serveFakeDrives(page, [
      fakeDrive({ title: 'next week swap', eventdate: singaporeDate(7) }),
      fakeDrive({ title: 'last month swap', eventdate: singaporeDate(-30) }),
      fakeDrive({ title: 'last week swap', eventdate: singaporeDate(-7) }),
    ])
    await page.goto('/drives')
    await expect(page.getByRole('tab', { name: /upcoming/ })).toContainText('1')
    await expect(page.getByRole('tab', { name: /past/ })).toContainText('2')

    await page.getByRole('tab', { name: /past/ }).click()
    await expect(driveTitles(page)).toHaveText(['last month swap', 'last week swap'])
    await expect(driveCards(page).first()).not.toContainText('slots left')
  })

  // 9. opens a closed, cancelled &&& ended drive
  test('closed, cancelled and ended drives explain why there is no rsvp', async ({ page }) => {
    await serveFakeDrives(page, [
      fakeDrive({ title: 'closed swap', status: 'closed' }),
      fakeDrive({ title: 'cancelled swap', status: 'cancelled' }),
      fakeDrive({ title: 'ended swap', eventdate: singaporeDate(-3) }),
    ])
    await page.goto('/drives')
    const dialog = page.getByRole('dialog')

    for (const [title, message] of [
      ['closed swap', 'registration has closed'],
      ['cancelled swap', 'this drive has been cancelled'],
    ]) {
      await driveCard(page, title).click()
      await expect(dialog).toContainText(message)
      await expect(dialog.getByRole('button', { name: 'rsvp' })).toHaveCount(0)
      await page.keyboard.press('Escape')
    }

    await page.getByRole('tab', { name: /past/ }).click()
    await driveCard(page, 'ended swap').click()
    await expect(dialog).toContainText('this drive has ended')
    await expect(dialog.getByRole('button', { name: 'rsvp' })).toHaveCount(0)
  })

  // 10. has 12 drives to look through
  test('12 drives are split across 2 pages', async ({ page }) => {
    const drives = Array.from({ length: 12 }, (_, index) => fakeDrive({ title: `drive ${String(index + 1).padStart(2, '0')}`, eventdate: singaporeDate(index + 1) }))
    await serveFakeDrives(page, drives)
    await page.goto('/drives')

    await expect(driveCards(page)).toHaveCount(10)
    await expect(page.getByText('1–10 of 12 adoption drives')).toBeVisible()
    await page.getByRole('button', { name: 'Next Page' }).click()
    await expect(driveTitles(page)).toHaveText(['drive 11', 'drive 12'])
    await expect(page.getByText('Page 2 of 2')).toBeVisible()

    await driveSearch(page).fill('drive')
    await expect(page.getByText('Page 1 of 2')).toBeVisible()
  })
})
