import { test, expect } from '@playwright/test'
import {
  driveCard, driveCards, driveSearch, driveTitles, expectDrivesShown, fakeDrive, matchesSearch, nextResponse,
  openDrivesPage, pastTab, pickDrive, serveFakeDrives, showDrive, singaporeDate, sortSelect, statusSelect, stubGoogleMaps,
  upcomingDrives,
} from '../support/guest.js'

const isBookList = url => url.searchParams.get('limit') === '5'

//@ChitanyaBharathi > journey 1.3 > a guest narrows the list down &&& looks closely at drives before deciding
test('guest compares drives and looks at one closely', async ({ page, context }) => {
  await stubGoogleMaps(context)
  const upcoming = upcomingDrives(await openDrivesPage(page))
  const first = pickDrive(upcoming, 'upcoming open drive at an MRT station', drive => drive.status === 'open' && drive.mrtstation?.name)
  const second = pickDrive(upcoming, 'second upcoming drive at a different MRT station', drive => drive.mrtstationid && drive.mrtstationid !== first.mrtstationid)

  // 1. searches for an MRT station's name
  const station = first.mrtstation.name
  await driveSearch(page).fill(station)
  await expectDrivesShown(page, upcoming.filter(drive => matchesSearch(drive, station)))

  // 2. clears the search &&& sorts latest first
  await driveSearch(page).fill('')
  await sortSelect(page).selectOption('desc')
  await expectDrivesShown(page, upcoming, 'desc')

  // 3. clicks the green "open" legend button, then clicks it again
  const openLegend = page.getByRole('button', { name: 'open', exact: true })
  await openLegend.click()
  await expect(openLegend).toHaveAttribute('aria-pressed', 'true')
  await expectDrivesShown(page, upcoming.filter(drive => drive.status === 'open'), 'desc')
  await openLegend.click()
  await expect(openLegend).toHaveAttribute('aria-pressed', 'false')
  await expectDrivesShown(page, upcoming, 'desc')

  // 4. picks "cancelled" in the status dropdown
  const cancelled = upcoming.filter(drive => drive.status === 'cancelled')
  await statusSelect(page).selectOption('cancelled')
  await expectDrivesShown(page, cancelled, 'desc')
  //@ChitanyaBharathi > the empty message only shows when nothing matches
  await expect(page.getByText('no matching drives > adjust your filters or check another tab')).toHaveCount(cancelled.length ? 0 : 1)

  // 5. resets the status &&& opens a drive
  await statusSelect(page).selectOption('all')
  await sortSelect(page).selectOption('asc')
  const card = await showDrive(page, first)
  const firstBooks = nextResponse(page, '/books', isBookList)
  await card.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: first.title })).toBeVisible()
  await expect(dialog.getByText('open', { exact: true })).toBeVisible()
  await expect(dialog.getByText(/available slots|capacity/)).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'book list' })).toBeVisible()
  const { books, total } = await (await firstBooks).json()
  for (const book of books) { await expect(dialog).toContainText(book.title) }
  await expect(dialog.getByText(`& ${total - books.length} more`)).toHaveCount(total > books.length ? 1 : 0)
  await expect(dialog.getByText('no available books at this station yet')).toHaveCount(books.length ? 0 : 1)

  // 6. clicks the venue
  const venue = dialog.getByRole('link', { name: first.location })
  await expect(venue).toHaveAttribute('target', '_blank')
  const [mapsTab] = await Promise.all([context.waitForEvent('page'), venue.click()])
  await expect(mapsTab).toHaveURL(/google\.com\/maps/)
  await mapsTab.close()

  // 7. closes the window &&& opens a different drive
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  const secondCard = await showDrive(page, second)
  const secondBooks = nextResponse(page, '/books', isBookList)
  await secondCard.click()
  await expect(dialog.getByRole('heading', { name: second.title })).toBeVisible()
  const other = await (await secondBooks).json()
  expect(new URL((await secondBooks).url()).searchParams.get('mrtstationids')).toBe(second.mrtstationid)
  for (const book of other.books) { await expect(dialog).toContainText(book.title) }
  for (const book of books.filter(book => !other.books.some(match => match.id === book.id))) {
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
    await expect(pastTab(page)).toContainText('2')

    await pastTab(page).click()
    await expect(driveTitles(page)).toHaveText(['last month swap', 'last week swap'])
    await expect(driveCards(page).first()).not.toContainText('slots left')
  })

  // 9. opens a closed, cancelled &&& ended drive > cancelled ones sit under Past / cancelled with the ended ones
  test('closed, cancelled and ended drives explain why there is no rsvp', async ({ page }) => {
    await serveFakeDrives(page, [
      fakeDrive({ title: 'closed swap', status: 'closed' }),
      fakeDrive({ title: 'cancelled swap', status: 'cancelled' }),
      fakeDrive({ title: 'ended swap', eventdate: singaporeDate(-3) }),
    ])
    await page.goto('/drives')
    const dialog = page.getByRole('dialog')

    await expect(driveCard(page, 'cancelled swap')).toHaveCount(0)
    await driveCard(page, 'closed swap').click()
    await expect(dialog).toContainText('registration has closed')
    await expect(dialog.getByRole('button', { name: 'rsvp' })).toHaveCount(0)
    await page.keyboard.press('Escape')

    await pastTab(page).click()
    for (const [title, message] of [
      ['cancelled swap', 'this drive has been cancelled'],
      ['ended swap', 'this drive has ended'],
    ]) {
      await driveCard(page, title).click()
      await expect(dialog).toContainText(message)
      await expect(dialog.getByRole('button', { name: 'rsvp' })).toHaveCount(0)
      await page.keyboard.press('Escape')
    }
  })

  // 10. has 12 drives to look through
  test('12 drives are split across 2 pages', async ({ page }) => {
    const drives = Array.from({ length: 12 }, (_, index) => fakeDrive({ title: `drive ${String(index + 1).padStart(2, '0')}`, eventdate: singaporeDate(index + 1) }))
    await serveFakeDrives(page, drives)
    await page.goto('/drives')

    await expect(driveCards(page)).toHaveCount(10)
    await expect(page.getByText('1–10 of 12 adoption drives')).toBeVisible()
    await page.getByRole('button', { name: 'Next page' }).click()
    await expect(driveTitles(page)).toHaveText(['drive 11', 'drive 12'])
    await expect(page.getByText('Page 2 of 2')).toBeVisible()

    await driveSearch(page).fill('drive')
    await expect(page.getByText('Page 1 of 2')).toBeVisible()
  })
})
