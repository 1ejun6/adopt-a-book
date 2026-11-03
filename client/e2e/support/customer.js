import { test as base, expect } from '@playwright/test'
import { clientUrl, demoCustomer, serverUrl } from './env.js'
import { isApi, nextResponse } from './guest.js'

//@ChitanyaBharathi > journeys log in through the api > only the steps that test the login form type into it

export const customerPassword = 'e2e-Password-123'

//@ChitanyaBharathi > the server rejects mutations with cookies but no client origin > send it on every call
export async function callApi(request, method, path, data) {
  const response = await request.fetch(`${serverUrl}${path}`, { method, data, headers: { origin: clientUrl } })
  if (!response.ok()) { throw new Error(`${method} ${path} failed > ${response.status()} ${await response.text()}`) }
  return response.status() === 204 ? null : response.json()
}

let accountNumber = 0
//@ChitanyaBharathi > a brand new customer > empty watchlist, no requests, no rsvps
export async function registerCustomer(request, name = 'Book Reader') {
  accountNumber += 1
  const email = `e2e-customer-${Date.now()}-${accountNumber}-${Math.random().toString(36).slice(2, 8)}@example.com`
  await callApi(request, 'POST', '/register', { name, email, password: customerPassword })
  return { name, email, password: customerPassword }
}

//@ChitanyaBharathi > page.request shares cookies with the page > call this before the first page.goto()
export async function logIn(request, { email, password }) {
  return callApi(request, 'POST', '/login', { email, password })
}

export const test = base.extend({
  //@ChitanyaBharathi > fresh account, already logged in
  customer: async ({ page }, use) => {
    const customer = await registerCustomer(page.request)
    await logIn(page.request, customer)
    await use(customer)
  },
  //@ChitanyaBharathi > the seeded demo customer, already logged in > read only, never log them out
  demoCustomer: async ({ page }, use) => {
    if (!demoCustomer.email || !demoCustomer.password) {
      throw new Error('journey 2.6 needs e2e_customer_email and e2e_customer_password in the root .env')
    }
    await logIn(page.request, demoCustomer)
    await use(demoCustomer)
  },
})
export { expect }

export const customerNavLinks = ['Browse Books', 'Watchlist', 'My Adoptions', 'Pickups', 'Adoption Drives', 'Account']
export const navLinks = page => page.getByRole('banner').getByRole('link').filter({ hasNotText: 'Adopt a Book' })

//@ChitanyaBharathi > browse books asks for 16 per page > the drive cards ask for 1 \ 5
export const PAGE_SIZE = 16
export const isCatalogue = url => isApi('/books')(url) && url.searchParams.get('limit') === String(PAGE_SIZE)

export const bookCards = page => page.getByRole('main').locator('article[aria-haspopup="dialog"]')
export const bookCard = (page, title) => bookCards(page).filter({ has: page.getByText(title, { exact: true }) }).first()
export const bookTitles = page => bookCards(page).locator('strong')
export const booksFound = (page, count) => page.getByText(new RegExp(`^\\s*${count}\\s+books\\s+found\\s*$`))
export const searchBox = page => page.getByRole('searchbox', { name: 'search', exact: true })
export const genreSelect = page => page.locator('select').filter({ has: page.locator('option', { hasText: 'All genres' }) })
export const bookSortSelect = page => page.locator('select').filter({ has: page.locator('option', { hasText: 'Title A–Z' }) })
export const saveButton = card => card.getByRole('button', { name: /^(Save to|Remove from) watchlist$/ })

//@ChitanyaBharathi > waits for the next browse books response that passes the check
export function nextCatalogue(page, check = () => true) {
  return nextResponse(page, '/books', url => url.searchParams.get('limit') === String(PAGE_SIZE) && check(url))
}

//@ChitanyaBharathi > opens browse books &&& returns what the server sent
export async function openBrowseBooks(page, path = '/customer/books') {
  const response = nextCatalogue(page)
  await page.goto(path)
  const catalogue = await (await response).json()
  await expect(bookCards(page)).toHaveCount(catalogue.books.length)
  return catalogue
}

//@ChitanyaBharathi > checks the cards match exactly what the server sent, in order
export async function expectBooksShown(page, response) {
  const { books, total } = await (await response).json()
  await expect(booksFound(page, total)).toBeVisible()
  await expect(bookTitles(page)).toHaveText(books.map(book => book.title))
  return { books, total }
}

//@ChitanyaBharathi > the database has several copies of some books > cards are found by title, so only use titles that appear once
export function uniqueTitles(books, count) {
  const unique = books.filter(book => books.filter(other => other.title === book.title).length === 1)
  if (unique.length < count) { throw new Error(`fewer than ${count} books with a unique title > seed the database`) }
  return unique.slice(0, count)
}

//@ChitanyaBharathi > a few available books straight from the server > for journeys that set up data first
export async function availableBooks(request, count) {
  const response = await request.get(`${serverUrl}/books`, { params: { status: 'available', limit: PAGE_SIZE } })
  const { books } = await response.json()
  return uniqueTitles(books, count)
}

//@ChitanyaBharathi > an application shaped like a /applications response item > for 🔌 journeys
let fakeId = 0
export function fakeApplication(status, changes = {}) {
  fakeId += 1
  const id = `00000000-0000-4000-9000-${String(fakeId).padStart(12, '0')}`
  return {
    id,
    status,
    createdat: new Date().toISOString(),
    bookid: { id: `00000000-0000-4000-a000-${String(fakeId).padStart(12, '0')}`, title: `${status} book ${fakeId}`, authors: ['someone'], coverurl: '' },
    ...changes,
  }
}

//@ChitanyaBharathi > a section on my adoptions, found by its heading > last() skips the page's own outer section
export const adoptionSection = (page, title) => page.locator('section').filter({ has: page.getByRole('heading', { name: title, exact: true }) }).last()

//@ChitanyaBharathi > slows a request down so the "…ing" button state can be seen
export function slowly(ms = 500) {
  return async route => {
    await new Promise(resolve => setTimeout(resolve, ms))
    await route.continue()
  }
}

//@ChitanyaBharathi > fills in the real login form > only for the steps that test it
export async function logInThroughForm(page, { email, password }) {
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
}
