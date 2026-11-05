import { foundCount, guestNavLinks, isApi, json, nextResponse, toast, upcomingDrives } from '../support/guest.js'
import {
  test, expect, bookCards, isCatalogue, navLinks, nextCatalogue, openBrowseBooks, saveButton,
} from '../support/customer.js'

const serverDown = json({ error: 'server unavailable > please try again' }, 503)
const isWatchlist = isApi('/watchlist')

//@ChitanyaBharathi > journey 2.9 > 🔌 the server is having trouble > the customer recovers without reloading
test.describe('🔌 customer recovers when the server is down', () => {
  // 1. opens Browse Books while /books is down
  test('browse books', async ({ page, customer }) => {
    await page.route(isCatalogue, serverDown)
    await page.goto('/customer/books')
    const error = toast(page, 'server unavailable')
    await expect(error).toBeVisible()
    await expect(bookCards(page)).toHaveCount(0)

    await page.unroute(isCatalogue)
    const response = nextCatalogue(page)
    await error.getByRole('button', { name: 'retry' }).click()
    const { books } = await (await response).json()
    await expect(bookCards(page)).toHaveCount(books.length)
  })

  // 2. opens Browse Books while only /watchlist is down
  test('browse books without the watchlist', async ({ page, customer }) => {
    await page.route(isWatchlist, serverDown)
    const { books } = await openBrowseBooks(page)
    const firstSave = saveButton(bookCards(page).first())
    await expect(firstSave).toBeDisabled()

    await page.unroute(isWatchlist)
    await toast(page, 'server unavailable').getByRole('button', { name: 'retry' }).click()
    await expect(firstSave).toBeEnabled()
    await expect(bookCards(page)).toHaveCount(books.length)
  })

  // 3. opens Watchlist while the server is down
  test('watchlist', async ({ page, customer }) => {
    await page.route(isWatchlist, serverDown)
    await page.goto('/customer/watchlist')
    const error = page.getByRole('alert').filter({ hasText: /couldn.t load your watchlist/ })
    await expect(error).toContainText('server unavailable')

    await page.unroute(isWatchlist)
    await error.getByRole('button', { name: 'Try Again' }).click()
    await expect(page.getByRole('heading', { name: 'Your shelf is waiting' })).toBeVisible()
  })

  // 4. opens My Adoptions while the server is down
  test('my adoptions', async ({ page, customer }) => {
    await page.route(isApi('/applications'), serverDown)
    await page.goto('/customer/adoption')
    await expect(page.getByText('server unavailable')).toBeVisible()

    await page.unroute(isApi('/applications'))
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByText('No active adoptions')).toBeVisible()
  })

  // 5. opens Account while the server is down
  test('account', async ({ page, customer }) => {
    await page.route(isApi('/customer/profile'), serverDown)
    await page.goto('/customer/account')
    const error = page.getByRole('alert').filter({ hasText: /couldn.t load your details/ })
    await expect(error).toContainText('server unavailable')

    await page.unroute(isApi('/customer/profile'))
    await error.getByRole('button', { name: 'Try again' }).click()
    await expect(page.locator('aside.account-rail .identity-name')).toHaveText(customer.name)
  })

  // 6. opens Adoption Drives while the server is down
  test('adoption drives', async ({ page, customer }) => {
    await page.route(isApi('/customer/drives'), serverDown)
    await page.goto('/customer/drives')
    const error = toast(page, 'server unavailable')
    await expect(error).toBeVisible()

    await page.unroute(isApi('/customer/drives'))
    const response = nextResponse(page, '/customer/drives')
    await error.getByRole('button', { name: 'retry' }).click()
    const upcoming = upcomingDrives((await (await response).json()).drives)
    await page.getByRole('tab', { name: /^upcoming/ }).click()
    await expect(foundCount(page, upcoming.length)).toBeVisible()
  })

  // 7. opens a book whose details fail to load
  test('book details', async ({ page, customer }) => {
    const { books } = await openBrowseBooks(page)
    const isDetails = isApi(`/books/${books[0].id}`)
    await page.route(isDetails, serverDown)
    await bookCards(page).first().click()
    const dialog = page.getByRole('dialog', { name: 'Book details' })
    const error = toast(page, 'server unavailable')
    await expect(error).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Request this book' })).toHaveCount(0)

    await page.unroute(isDetails)
    await error.getByRole('button', { name: 'Retry' }).click()
    await expect(dialog).toContainText(books[0].title)
    await expect(dialog.getByRole('button', { name: 'Request this book' })).toBeVisible()
  })
})

//@brod > no faking needed > clearing cookies simulates session expiry > navigating to protected page redirects to login
test('customer whose session expires is sent to login', async ({ page, context, customer }) => {
  await page.goto('/customer/watchlist')
  await expect(page.getByRole('heading', { name: 'My Watchlist' })).toBeVisible()

  // 8. their session expires &&& they navigate to a protected page
  await context.clearCookies()
  await page.goto('/customer/adoption')
  await expect(page).toHaveURL('/login')
  await expect(navLinks(page)).toHaveText(guestNavLinks)
})
