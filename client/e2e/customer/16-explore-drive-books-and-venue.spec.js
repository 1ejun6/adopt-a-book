import {
  fakeDrive, isApi, json, nextResponse, pickDrive, showDrive, stubGoogleMaps, upcomingDrives,
} from '../support/guest.js'
import { test, expect } from '../support/customer.js'

const tab = (page, name) => page.getByRole('tab', { name: new RegExp(`^${name}`) })
const isBookList = url => url.searchParams.get('limit') === '5'

//@brod > replaces /customer/drives and /books so a journey tests specific book list scenarios
async function serveCustomerDriveBooks(page, drives, bookTotal = 3) {
  await page.route(isApi('/customer/drives'), json({ drives }))
  await page.route(isApi('/books'), json({
    books: Array.from({ length: Math.min(bookTotal, 5) }, (_, index) => ({
      id: `fake-book-${index}`,
      title: `Station Read ${index + 1}`,
      authors: ['Author Smith'],
    })),
    total: bookTotal,
  }))
}

//@brod > journey 2.16 > a customer explores an upcoming drive, its station books, and its venue
test('customer explores books and venue at an upcoming adoption drive', async ({ page, context, customer }) => {
  await stubGoogleMaps(context)
  const drivesResponse = nextResponse(page, '/customer/drives')
  await page.goto('/customer/drives')

  // 1. switches to upcoming drives tab and picks an open drive with a station
  const upcoming = upcomingDrives((await (await drivesResponse).json()).drives)
  await tab(page, 'upcoming').click()
  const drive = pickDrive(upcoming, 'upcoming open drive at an MRT station', d => d.status === 'open' && d.mrtstation?.name)

  // 2. opens the drive details dialog
  const booksResponse = nextResponse(page, '/books', isBookList)
  await (await showDrive(page, drive)).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: drive.title })).toBeVisible()
  await expect(dialog.getByText('open', { exact: true })).toBeVisible()
  await expect(dialog.getByText(/available slots|capacity/)).toBeVisible()

  // 3. checks the book list section
  await expect(dialog.getByRole('heading', { name: 'book list' })).toBeVisible()
  const { books, total } = await (await booksResponse).json()
  for (const book of books) {
    await expect(dialog).toContainText(book.title)
  }
  if (total > books.length) {
    await expect(dialog.getByText(`& ${total - books.length} more`)).toBeVisible()
  } else if (!books.length) {
    await expect(dialog.getByText('no available books at this station yet')).toBeVisible()
  }

  // 4. clicks the venue link to open Google Maps in a new tab
  const venue = dialog.getByRole('link', { name: drive.location })
  await expect(venue).toHaveAttribute('target', '_blank')
  await expect(venue).toHaveAttribute('rel', 'noopener noreferrer')
  const [mapsTab] = await Promise.all([context.waitForEvent('page'), venue.click()])
  await expect(mapsTab).toHaveURL(/google\.com\/maps/)
  await mapsTab.close()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

//@brod > 🔌 station books edge cases and errors > uses mockCustomer fixture to avoid unnecessary DB account registrations
test.describe('🔌 station books edge cases and errors', () => {
  // 5. tests station with more than 5 available books (overflow count)
  test('station with more than 5 books displays overflow count', async ({ page, mockCustomer }) => {
    const drive = fakeDrive({ title: 'Big Station Swap' })
    await serveCustomerDriveBooks(page, [drive], 8)
    await page.goto('/customer/drives')
    await tab(page, 'upcoming').click()

    await (await showDrive(page, drive)).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Big Station Swap' })).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'book list' })).toBeVisible()

    // 5 books rendered and overflow indicator
    await expect(dialog.getByText('Station Read 1')).toBeVisible()
    await expect(dialog.getByText('Station Read 5')).toBeVisible()
    await expect(dialog.getByText('& 3 more')).toBeVisible()
  })

  // 6. tests station with 0 available books
  test('station with zero available books displays empty message', async ({ page, mockCustomer }) => {
    const drive = fakeDrive({ title: 'Empty Station Swap' })
    await serveCustomerDriveBooks(page, [drive], 0)
    await page.goto('/customer/drives')
    await tab(page, 'upcoming').click()

    await (await showDrive(page, drive)).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Empty Station Swap' })).toBeVisible()
    await expect(dialog.getByText('no available books at this station yet')).toBeVisible()
  })

  // 7. tests error state and retry book list button
  test('recovers when station book list fails with server error', async ({ page, mockCustomer }) => {
    const drive = fakeDrive({ title: 'Glitchy Station Swap' })
    await page.route(isApi('/customer/drives'), json({ drives: [drive] }))
    let failBooks = true
    await page.route(isApi('/books'), route => {
      if (failBooks) {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'could not load books' }) })
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ books: [{ id: 'recovered-1', title: 'Recovered Book Title', authors: ['Jane Doe'] }], total: 1 }),
      })
    })

    await page.goto('/customer/drives')
    await tab(page, 'upcoming').click()
    await (await showDrive(page, drive)).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Glitchy Station Swap' })).toBeVisible()
    const retryButton = dialog.getByRole('button', { name: 'retry book list' })
    await expect(retryButton).toBeVisible()

    // Recover by clicking retry
    failBooks = false
    await retryButton.click()
    await expect(dialog.getByText('Recovered Book Title')).toBeVisible()
    await expect(retryButton).toBeHidden()
  })
})
