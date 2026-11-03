import { test, expect } from '@playwright/test'
import {
  bookSpines, driveCard, driveCards, isApi, json, openDrivesPage, seededDrives, toast,
} from '../support/guest.js'

const serverDown = json({ error: 'server unavailable > please try again' }, 503)
const isBookList = url => isApi('/books')(url) && url.searchParams.get('limit') === '5'

//@ChitanyaBharathi > journey 1.9 > 🔌 the server is having trouble > the guest recovers without reloading
test('guest recovers on the homepage and drives page when the server is down', async ({ page }) => {
  // 1. 🔌 opens the homepage while the server is down
  await page.route(isApi('/books'), serverDown)
  await page.goto('/')
  const homeError = toast(page, 'server unavailable')
  await expect(homeError).toBeVisible()
  await expect(bookSpines(page)).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Different shelves')

  // 2. 🔌 clicks retry once the server is back
  await page.unroute(isApi('/books'))
  await homeError.getByRole('button', { name: 'retry' }).click()
  await expect(bookSpines(page)).toHaveCount(5)
  await expect(toast(page, 'books refreshed')).toBeVisible()

  // 3. 🔌 opens Adoption Drives while the server is down
  await page.route(isApi('/drives'), serverDown)
  await page.getByRole('link', { name: 'Adoption Drives' }).click()
  const drivesError = page.getByRole('alert').filter({ hasText: 'server unavailable' })
  await expect(drivesError).toBeVisible()
  await expect(driveCards(page)).toHaveCount(0)

  // 4. 🔌 clicks try again once the server is back
  await page.unroute(isApi('/drives'))
  await drivesError.getByRole('button', { name: 'try again' }).click()
  await expect(driveCards(page)).toHaveCount(5)
})

test('guest retries a drive book list that failed to load', async ({ page }) => {
  await openDrivesPage(page)

  // 5. 🔌 opens a drive whose book list fails to load
  await page.route(isBookList, serverDown)
  await driveCard(page, seededDrives.bugis.title).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: seededDrives.bugis.title })).toBeVisible()
  await expect(dialog.getByText('available slots')).toBeVisible()
  const bookError = dialog.getByRole('alert')
  await expect(bookError).toContainText('server unavailable')

  // 6. 🔌 clicks retry book list
  await page.unroute(isBookList)
  const books = page.waitForResponse(response => isBookList(new URL(response.url())))
  await bookError.getByRole('button', { name: 'retry book list' }).click()
  const { books: list } = await (await books).json()
  await expect(bookError).toBeHidden()
  if (list.length) { await expect(dialog).toContainText(list[0].title) }
})

test('guest still sees every drive when one book count fails', async ({ page }) => {
  // 7. 🔌 one station's book count fails to load
  const drivesResponse = page.waitForResponse(response => isApi('/drives')(new URL(response.url())))
  await page.route(url => isApi('/books')(url) && url.searchParams.get('limit') === '1', async route => {
    const { drives } = await (await drivesResponse).json()
    const bugis = drives.find(drive => drive.title === seededDrives.bugis.title)
    const station = new URL(route.request().url()).searchParams.get('mrtstationids')
    return station === bugis.mrtstationid ? serverDown(route) : route.continue()
  })
  await page.goto('/drives')

  await expect(driveCards(page)).toHaveCount(5)
  await expect(driveCard(page, seededDrives.bugis.title)).toContainText('— books')
  for (const drive of [seededDrives.dhobyGhaut, seededDrives.cityHall, seededDrives.tampines, seededDrives.bishan]) {
    await expect(driveCard(page, drive.title)).not.toContainText('— books')
  }
})
