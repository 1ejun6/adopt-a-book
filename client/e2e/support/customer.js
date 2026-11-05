import { test as base, expect } from '@playwright/test'
import { clientUrl, demoCustomer, serverUrl, supabaseServiceRoleKey, supabaseUrl } from './env.js'
import { isApi, json, nextResponse } from './guest.js'

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
//@brod > retries on rate limits so parallel workers do not fail registration
export async function registerCustomer(request, name = 'Book Reader') {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      accountNumber += 1
      const email = `e2e-customer-${Date.now()}-${accountNumber}-${Math.random().toString(36).slice(2, 8)}@example.com`
      const result = await callApi(request, 'POST', '/register', { name, email, password: customerPassword })
      return { id: result?.user?.id, name, email, password: customerPassword }
    } catch (err) {
      if (attempt === 4 || (!err.message.includes('429') && !err.message.includes('500') && !err.message.includes('503'))) throw err
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }
}

//@ChitanyaBharathi > page.request shares cookies with the page > call this before the first page.goto()
//@brod > retries with backoff on 429 rate limits so parallel workers do not fail login
export async function logIn(request, { email, password }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await callApi(request, 'POST', '/login', { email, password })
    } catch (err) {
      if (attempt === 4 || (!err.message.includes('429') && !err.message.includes('500') && !err.message.includes('503'))) throw err
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }
}

//@brod > deletes a customer account from Supabase Auth & PostgreSQL on test teardown
export async function deleteCustomer(request, userId) {
  if (!supabaseUrl || !supabaseServiceRoleKey || !userId) return
  try {
    const response = await request.fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
      },
    })
    return response.ok()
  } catch {
    // Teardown best-effort cleanup
  }
}

export const fakeCustomer = {
  id: '00000000-0000-4000-b000-000000000001',
  name: 'Mock Customer',
  email: 'mock-customer@example.com',
  role: 'customer',
}

export const test = base.extend({
  //@ChitanyaBharathi > fresh account, already logged in
  //@brod > automatically deletes the test account on teardown so the DB is not flooded
  customer: async ({ page }, use) => {
    const customer = await registerCustomer(page.request)
    await logIn(page.request, customer)
    try {
      await use(customer)
    } finally {
      if (customer?.id) {
        await deleteCustomer(page.request, customer.id)
      }
    }
  },
  //@ChitanyaBharathi > the seeded demo customer, already logged in > read only, never log them out
  //@brod > skip gracefully if credentials are not configured in root .env
  demoCustomer: async ({ page }, use) => {
    test.skip(!demoCustomer.email || !demoCustomer.password, 'journey 2.6 needs e2e_customer_email and e2e_customer_password in the root .env')
    await logIn(page.request, demoCustomer)
    await use(demoCustomer)
  },
  //@brod > mock customer session > zero DB registrations, zero network auth calls
  mockCustomer: async ({ page }, use) => {
    await page.route(isApi('/session'), json({ user: fakeCustomer }))
    await page.route(isApi('/watchlist'), json({ watchlist: [] }))
    await page.route(isApi('/customer/profile'), json({ user: fakeCustomer }))
    await use(fakeCustomer)
  },
})
export { expect, demoCustomer }

//@brod > pickups was merged into my adoptions > 5 customer links in the navbar
export const customerNavLinks = ['Browse Books', 'Watchlist', 'My Adoptions', 'Adoption Drives', 'Account']
export const navLinks = page => page.getByRole('banner').getByRole('link').filter({ hasNotText: 'Adopt a Book' })

//@ChitanyaBharathi > browse books asks for 16 per page > the drive cards ask for 1 \ 5
export const PAGE_SIZE = 16
export const isCatalogue = url => isApi('/books')(url) && url.searchParams.get('limit') === String(PAGE_SIZE)

export const bookCards = page => page.getByRole('main').locator('article[aria-haspopup="dialog"]')
export const bookCard = (page, title) => bookCards(page).filter({ has: page.getByText(title, { exact: true }) }).first()
export const bookTitles = page => bookCards(page).locator('strong')
export const booksFound = (page, count) => page.getByText(new RegExp(`^\\s*${count}\\s+books\\s+found\\s*$`))
//@brod > searchbox placeholder and aria-label are "Search by title, author or ISBN..." > distinguishes from location search
export const searchBox = page => page.getByRole('searchbox', { name: /Search by title/i })
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
  const userUuid = changes.userid || '00000000-0000-4000-b000-000000000001'
  return {
    id,
    status,
    createdat: new Date().toISOString(),
    userid: typeof userUuid === 'object' ? userUuid : { id: userUuid, name: 'Reader' },
    bookid: {
      id: `00000000-0000-4000-a000-${String(fakeId).padStart(12, '0')}`,
      title: `${status} book ${fakeId}`,
      authors: ['someone'],
      coverurl: '',
      status: status === 'approved' ? 'reserved' : 'available',
      condition: 'Good',
      collectionarea: 'Jurong East MRT',
    },
    ...changes,
  }
}

//@brod > an appointment shaped like a /appointments response item > for 🔌 journeys
let fakeAppointmentId = 0
export function fakeAppointment(status = 'pending confirmation', changes = {}) {
  fakeAppointmentId += 1
  const id = `00000000-0000-4000-c000-${String(fakeAppointmentId).padStart(12, '0')}`
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })
  return {
    id,
    userid: '00000000-0000-4000-b000-000000000001',
    bookid: `00000000-0000-4000-a000-${String(fakeAppointmentId).padStart(12, '0')}`,
    booktitle: `fake book ${fakeAppointmentId}`,
    location: 'Jurong East MRT',
    appointmentdate: tomorrow,
    timeslot: '10:30–11:00',
    status,
    createdat: new Date().toISOString(),
    ...changes,
  }
}

//@brod > adoption row on my adoptions > clickable row button for a book
export const adoptionRows = page => page.locator('button.adoption-row')
export const adoptionRow = (page, title) => adoptionRows(page).filter({ hasText: title }).first()

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
