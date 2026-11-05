import { isApi, json, locationBox, toast } from '../support/guest.js'
import {
  PAGE_SIZE, test, expect, bookSortSelect, bookTitles, booksFound, expectBooksShown, genreSelect, nextCatalogue,
  openBrowseBooks, searchBox,
} from '../support/customer.js'

const has = (key, value) => url => url.searchParams.get(key) === value
//@ChitanyaBharathi > a cleared search is still sent as search= > empty counts as missing
const lacks = key => url => !url.searchParams.get(key)

//@ChitanyaBharathi > journey 2.2 > a customer looks for a book &&& narrows the list down
//@brod > uses seeded demoCustomer from .env so no new DB account is created
test('customer searches, filters and sorts the catalogue', async ({ page, demoCustomer }) => {
  // 1. opens Browse Books
  const first = await openBrowseBooks(page)
  await expect(page.getByRole('heading', { name: 'Find your next read' })).toBeVisible()
  expect(first.books.length).toBeLessThanOrEqual(PAGE_SIZE)
  await expect(booksFound(page, first.total)).toBeVisible()
  await expect(bookTitles(page)).toHaveText(first.books.map(book => book.title))

  // 2. types part of a real title into the search box
  const word = first.books[0].title.split(/\s+/).find(part => part.length > 3) || first.books[0].title
  let response = nextCatalogue(page, has('search', word))
  await searchBox(page).fill(word)
  const searched = await expectBooksShown(page, response)
  await expect(page).toHaveURL(new RegExp(`[?&]search=${encodeURIComponent(word)}`))
  expect(searched.books.map(book => book.title)).toContain(first.books[0].title)

  // 3. clears the search &&& picks a genre
  response = nextCatalogue(page, lacks('search'))
  await searchBox(page).fill('')
  await expectBooksShown(page, response)
  const genres = await genreSelect(page).locator('option').evaluateAll(options => options.map(option => option.value).filter(Boolean))
  const genre = genres.find(name => first.books.some(book => book.subjects?.includes(name))) || genres[0]
  response = nextCatalogue(page, has('subject', genre))
  await genreSelect(page).selectOption(genre)
  await expectBooksShown(page, response)
  await expect(page).toHaveURL(new RegExp(`[?&]subject=${encodeURIComponent(genre)}`))

  // 4. switches the sort to Author A–Z, then Newest
  for (const sort of ['author', 'newest']) {
    response = nextCatalogue(page, has('sort', sort))
    await bookSortSelect(page).selectOption(sort)
    await expectBooksShown(page, response)
    await expect(page).toHaveURL(new RegExp(`[?&]sort=${sort}`))
  }

  // 5. reloads the page
  response = nextCatalogue(page, url => has('subject', genre)(url) && has('sort', 'newest')(url))
  await page.reload()
  await expectBooksShown(page, response)
  await expect(genreSelect(page)).toHaveValue(genre)
  await expect(bookSortSelect(page)).toHaveValue('newest')

  // 6. searches for something that doesn't exist
  response = nextCatalogue(page, has('search', 'zzzz-no-such-book'))
  await searchBox(page).fill('zzzz-no-such-book')
  await response
  await expect(booksFound(page, 0)).toBeVisible()
  await expect(toast(page, 'no books found > adjust search & filters')).toBeVisible()

  // 7. clears the search &&& filters, then goes to page 2
  await page.goto('/customer/books')
  await expect(booksFound(page, first.total)).toBeVisible()
  expect(first.total, `paging needs more than ${PAGE_SIZE} available books > seed the database`).toBeGreaterThan(PAGE_SIZE)
  response = nextCatalogue(page, has('page', '2'))
  await page.getByRole('button', { name: 'Next Page' }).click()
  const second = await expectBooksShown(page, response)
  await expect(page).toHaveURL(/[?&]page=2/)
  expect(second.books.map(book => book.id)).not.toContain(first.books[0].id)

  // 8. changes the genre while on page 2
  response = nextCatalogue(page, has('subject', genre))
  await genreSelect(page).selectOption(genre)
  await expectBooksShown(page, response)
  await expect(page).not.toHaveURL(/[?&]page=/)
  await expect(page.getByText(/^Page 1 of \d+$/)).toBeVisible()

  // 9. presses the browser Back button
  response = nextCatalogue(page, has('page', '2'))
  await page.goBack()
  await expectBooksShown(page, response)
  await expect(page).toHaveURL(/[?&]page=2/)
  await expect(genreSelect(page)).toHaveValue('')
})

//@ChitanyaBharathi > 🔌 the location lookup needs a OneMap token > fake it &&& let /books answer for real
//@brod > uses seeded demoCustomer from .env so no new DB account is created
test('customer filters the catalogue by a place', async ({ page, demoCustomer }) => {
  const { books, total } = await openBrowseBooks(page)
  const book = books.find(item => item.mrtstationid)
  if (!book) { throw new Error('no book on the first page has an MRT station > seed the database') }

  // 10. 🔌 sets a location near Bugis &&& searches
  await page.route(isApi('/locations/nearby'), json({
    location: { name: 'Bugis', lat: 1.3009, lng: 103.8559 },
    stations: [{ id: book.mrtstationid, name: book.mrtstation?.name }],
    radiusKm: 3,
  }))
  let response = nextCatalogue(page, has('mrtstationids', book.mrtstationid))
  await locationBox(page).fill('Bugis')
  await page.getByRole('button', { name: 'search', exact: true }).click()
  const near = await expectBooksShown(page, response)
  expect(near.books.every(item => item.mrtstationid === book.mrtstationid)).toBe(true)
  await expect(page).toHaveURL(/[?&]mrtstationids=/)

  const clear = page.getByRole('button', { name: 'clear location filter' })
  await expect(clear).toBeVisible()
  response = nextCatalogue(page, lacks('mrtstationids'))
  await clear.click()
  await expectBooksShown(page, response)
  await expect(booksFound(page, total)).toBeVisible()
  await expect(clear).toBeHidden()
})
