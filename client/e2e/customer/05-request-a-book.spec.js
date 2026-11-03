import { isApi, trackApiRequests } from '../support/guest.js'
import { test, expect, adoptionSection, bookCard, openBrowseBooks, uniqueTitles } from '../support/customer.js'

//@ChitanyaBharathi > the same date format my adoptions uses
const today = new Date().toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric' })
const isApplications = isApi('/applications')

//@ChitanyaBharathi > journey 2.5 > a customer asks to adopt a book &&& follows the request
test('customer requests a book and follows it in my adoptions', async ({ page, customer }) => {
  const api = trackApiRequests(page)
  const posts = () => api.to('/applications').filter(request => request.method === 'POST')
  const { books } = await openBrowseBooks(page)
  const [book] = uniqueTitles(books, 1)
  const details = page.getByRole('dialog', { name: 'Book details' })
  const request = page.getByRole('dialog', { name: 'Request a copy' })

  // 1. opens an available book's details
  await bookCard(page, book.title).click()
  await expect(details).toContainText(book.title)
  const requestButton = details.getByRole('button', { name: 'request', exact: true })
  await expect(requestButton).toBeEnabled()

  // 2. clicks request
  await requestButton.click()
  await expect(details).toBeHidden()
  await expect(request).toBeVisible()
  await expect(request.getByText('request & review')).toBeVisible()
  await expect(request).toContainText(book.title)
  const requestingAs = request.locator('dl')
  await expect(requestingAs).toContainText(customer.name)
  await expect(requestingAs).toContainText(customer.email)

  // 3. closes it with Esc
  await page.keyboard.press('Escape')
  await expect(request).toBeHidden()
  expect(posts()).toHaveLength(0)

  // 4. opens the book again, clicks request, then Submit Request
  await page.route(isApplications, async route => {
    if (route.request().method() === 'POST') { await new Promise(resolve => setTimeout(resolve, 500)) }
    await route.continue()
  })
  await bookCard(page, book.title).click()
  await details.getByRole('button', { name: 'request', exact: true }).click()
  await request.getByRole('button', { name: 'Submit Request' }).click()
  await expect(request.getByRole('button', { name: 'Submitting...' })).toBeVisible()
  await expect(request.getByRole('button', { name: 'Request Submitted' })).toBeDisabled()
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'adoption request submitted' })).toBeVisible()
  await page.unroute(isApplications)
  expect(posts()).toHaveLength(1)

  // 5. closes it &&& opens the same book again
  await page.keyboard.press('Escape')
  await expect(request).toBeHidden()
  await bookCard(page, book.title).click()
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'you already requested this copy > check my adoptions' })).toBeVisible()
  await expect(details.getByRole('button', { name: 'Request Pending' })).toBeDisabled()
  await page.keyboard.press('Escape')

  // 6. opens My Adoptions
  await page.getByRole('banner').getByRole('link', { name: 'My Adoptions' }).click()
  await expect(page.getByRole('tab', { name: 'Active (1)' })).toBeVisible()
  const card = adoptionSection(page, 'Awaiting Approval').locator('article').filter({ hasText: book.title })
  await expect(card).toBeVisible()
  await expect(card).toContainText('Pending Review')
  await expect(card).toContainText(`requested ${today}`)

  // 7. clicks View Book on that card
  await card.getByRole('button', { name: 'View Book' }).click()
  await expect(details).toContainText(book.title)
  await expect(details.getByRole('button', { name: 'request', exact: true })).toHaveCount(0)
})

test('🔌 customer is told when a book was taken before they submitted', async ({ page, customer }) => {
  const { books } = await openBrowseBooks(page)
  const [book] = uniqueTitles(books, 1)
  const request = page.getByRole('dialog', { name: 'Request a copy' })

  // 8. 🔌 submits for a book someone else just took
  await page.route(isApplications, route => route.request().method() === 'POST'
    ? route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'selected book is no longer available for adoption' }) })
    : route.continue())
  await bookCard(page, book.title).click()
  await page.getByRole('dialog', { name: 'Book details' }).getByRole('button', { name: 'request', exact: true }).click()
  await request.getByRole('button', { name: 'Submit Request' }).click()
  const error = page.locator('[data-sonner-toast]').filter({ hasText: 'selected book is no longer available for adoption' })
  await expect(error).toBeVisible()
  await expect(error.getByRole('button', { name: 'retry' })).toBeVisible()
  await page.unroute(isApplications)

  await page.goto('/customer/adoptions')
  await expect(page.getByRole('tab', { name: 'Active (0)' })).toBeVisible()
  await expect(page.getByText('No active requests yet')).toBeVisible()
})
