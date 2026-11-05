import { isApi, json, trackApiRequests } from '../support/guest.js'
import { test, expect, bookCard, openBrowseBooks, uniqueTitles } from '../support/customer.js'

const isApplications = isApi('/applications')

//@ChitanyaBharathi > journey 2.5 > a customer asks to adopt a book &&& follows the request
test('customer requests a book and follows it in my adoptions', async ({ page, customer }) => {
  const api = trackApiRequests(page)
  const posts = () => api.to('/applications').filter(request => request.method === 'POST')
  const { books } = await openBrowseBooks(page)
  const [book] = uniqueTitles(books, 1)
  const details = page.getByRole('dialog', { name: 'Book details' })
  const request = page.getByRole('dialog', { name: 'Request this book' })

  // 1. opens an available book's details
  await bookCard(page, book.title).click()
  await expect(details).toContainText(book.title)
  const requestButton = details.getByRole('button', { name: 'Request this book' })
  await expect(requestButton).toBeEnabled()

  // 2. clicks request
  await requestButton.click()
  await expect(details).toBeHidden()
  await expect(request).toBeVisible()
  await expect(request.locator('.adoption-progress li.current')).toContainText('Request')
  await expect(request).toContainText(book.title)
  const requestingAs = request.locator('section[aria-label="Requesting as"]')
  await expect(requestingAs).toContainText(customer.email)

  // 3. clicks Back to book details, then closes with Esc
  await request.getByRole('button', { name: 'Back to book details' }).click()
  await expect(request).toBeHidden()
  await expect(details).toBeVisible()
  await details.getByRole('button', { name: 'Request this book' }).click()
  await page.keyboard.press('Escape')
  await expect(request).toBeHidden()
  expect(posts()).toHaveLength(0)

  // 4. opens the book again, clicks request, then Send adoption request
  await page.route(isApplications, async route => {
    if (route.request().method() === 'POST') { await new Promise(resolve => setTimeout(resolve, 500)) }
    await route.continue()
  })
  await bookCard(page, book.title).click()
  await details.getByRole('button', { name: 'Request this book' }).click()
  await request.getByRole('button', { name: 'Send adoption request' }).click()
  //@brod > dialog accessible name becomes "Adoption request sent" on success
  const sentDialog = page.getByRole('dialog', { name: 'Adoption request sent' })
  await expect(sentDialog.getByRole('heading', { name: 'Adoption request sent' })).toBeVisible()
  await expect(sentDialog.getByText('Under review')).toBeVisible()
  await expect(sentDialog.getByRole('link', { name: 'View my request' })).toBeVisible()
  await page.unroute(isApplications)
  expect(posts()).toHaveLength(1)

  // 5. continues browsing and opens the same book again
  await sentDialog.getByRole('button', { name: 'Continue browsing' }).click()
  await expect(sentDialog).toBeHidden()
  await bookCard(page, book.title).click()
  await expect(details.getByText('You already have a request for this book.')).toBeVisible()
  await expect(details.getByRole('link', { name: 'View my request' })).toBeVisible()
  await page.keyboard.press('Escape')

  // 6. opens My Adoptions
  await page.getByRole('banner').getByRole('link', { name: 'My Adoptions' }).click()
  await expect(page.getByRole('tab', { name: /Active\s+1/ })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Waiting\s+1/ })).toBeVisible()
  const row = page.locator('button.adoption-row').filter({ hasText: book.title })
  await expect(row).toBeVisible()
  await expect(row).toContainText('Under review')

  // 7. clicks the row to view adoption details
  await row.click()
  const adoptionDialog = page.getByRole('dialog')
  await expect(adoptionDialog.getByRole('heading', { name: 'Adoption details' })).toBeVisible()
  await expect(adoptionDialog).toContainText(book.title)
  await expect(adoptionDialog.getByRole('button', { name: 'Withdraw request' })).toBeVisible()
})

//@brod > 🔌 customer is told when a book is no longer available when submitting
test('🔌 customer is told when a book was taken before they submitted', async ({ page, customer }) => {
  const { books } = await openBrowseBooks(page)
  const [book] = uniqueTitles(books, 1)
  const details = page.getByRole('dialog', { name: 'Book details' })
  const request = page.getByRole('dialog', { name: 'Request this book' })

  // 8. 🔌 submits for a book someone else just took
  await bookCard(page, book.title).click()
  await details.getByRole('button', { name: 'Request this book' }).click()

  await page.route(isApplications, route => route.request().method() === 'POST'
    ? route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'selected book is no longer available for adoption' }) })
    : route.continue())
  await page.route(isApi(`/books/${book.id}`), json({ book: { ...book, status: 'reserved' } }))

  await request.getByRole('button', { name: 'Send adoption request' }).click()

  const error = request.getByRole('alert')
  await expect(error).toContainText('This book is no longer available for requests.')
  await page.unroute(isApplications)
  await page.unroute(isApi(`/books/${book.id}`))

  await page.goto('/customer/adoption')
  await expect(page.getByRole('tab', { name: /Active\s+0/ })).toBeVisible()
  await expect(page.getByText('No active adoptions')).toBeVisible()
})
