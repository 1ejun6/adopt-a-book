import { nextResponse } from '../support/guest.js'
import {
  test, expect, closeDialog, badge, BOOKS, createBook, dialog, field, listMain, listSearch, nextList, openList, PAGE_SIZE, pageCount, row, rowCheckbox, rows, search, seedAdoption, tab,
} from '../support/admin.js'

const titlesOf = books => books.map(book => book.title)

//@ChitanyaBharathi > journey 3.3 > the admin finds a particular copy &&& checks its details
test('admin browses the inventory and checks a book', async ({ page, admin }) => {
  // setup > 2 tagged books (one with no ISBN \ description \ subject) + a tagged reserved book
  const plain = await createBook(admin, { title: 'Plain Cover', isbn: null, description: '', subjects: [], publicationyear: null })
  const full = await createBook(admin, { title: 'Full Record', publicationyear: 1999 })
  const { book: reserved } = await seedAdoption(admin, 'approved', { book: { title: 'Kept Aside' } })

  // 1. opens Book Inventory > description, tabs with the server's counts, up to 15 rows &&& the page count
  const first = await openList(page, '/admin/books', BOOKS)
  await expect(page.getByText('Manage book records and track their availability.')).toBeVisible()
  await expect(page.getByRole('tab', { name: `All books ${first.counts.all}` })).toBeVisible()
  for (const [label, status] of [['Available', 'available'], ['Reserved', 'reserved'], ['Adopted', 'adopted']]) {
    await expect(page.getByRole('tab', { name: `${label} ${first.counts[status]}` })).toBeVisible()
  }
  await expect(rows(page)).toHaveCount(Math.min(first.total, PAGE_SIZE))
  const pages = Math.max(1, Math.ceil(first.total / PAGE_SIZE))
  await expect(pageCount(page)).toHaveText(`1–${Math.min(PAGE_SIZE, first.total)} of ${first.total} books`)
  await expect(listMain(page).getByText(`Page 1 of ${pages}`)).toBeVisible()

  // 2. next page > a different set of rows &&& "16–30 of N"; then searching takes them back to page 1
  if (pages > 1) {
    const second = nextList(page, BOOKS, url => url.searchParams.get('page') === '2')
    await listMain(page).getByRole('button', { name: 'Next page' }).click()
    const { books } = await (await second).json()
    await expect(rows(page).first()).toContainText(books[0].title)
    //@ChitanyaBharathi > other journeys add \ delete books in parallel > the total can move between the two loads
    await expect(pageCount(page)).toHaveText(/^16–\d+ of \d+ books$/)
    await expect(listMain(page).getByText(/^Page 2 of \d+$/)).toBeVisible()
  }

  // 3. searches for their tag > only their 3 books &&& the page count drops to match
  //    (the tab counts are totals for the whole inventory, so they stay as the server sent them)
  const tagged = await search(page, BOOKS, admin.tag)
  expect(tagged.page).toBe(1)
  await expect(rows(page)).toHaveCount(3)
  await expect(pageCount(page)).toHaveText('1–3 of 3 books')
  await expect(page.getByRole('tab', { name: `All books ${tagged.counts.all}` })).toBeVisible()

  // 4. searches by an author, then an ISBN > the rows match what the server returned
  for (const text of ['E2E Author', full.isbn]) {
    const { books } = await search(page, BOOKS, text)
    await expect(rows(page)).toHaveCount(Math.min(books.length, PAGE_SIZE))
    for (const title of titlesOf(books).slice(0, 3)) { await expect(rows(page).filter({ hasText: title }).first()).toBeVisible() }
    if (text === full.isbn) { expect(titlesOf(books)).toContain(full.title) }
  }

  // 5. picks a genre > only books with that subject stay (the plain book has no subject)
  await search(page, BOOKS, admin.tag)
  const genre = nextList(page, BOOKS, url => url.searchParams.get('subject') === 'Fiction')
  await listMain(page).locator('select').filter({ has: page.locator('option', { hasText: 'All genres' }) }).selectOption('Fiction')
  await genre
  await expect(rows(page)).toHaveCount(2)
  await expect(row(page, plain.title)).toHaveCount(0)
  await listMain(page).locator('select').filter({ has: page.locator('option', { hasText: 'All genres' }) }).selectOption('all')

  // 6. Reserved tab > only the reserved book, a reserved badge &&& no checkboxes
  const reservedList = nextList(page, BOOKS, url => url.searchParams.get('status') === 'reserved')
  await tab(page, 'Reserved').click()
  await reservedList
  await expect(rows(page)).toHaveCount(1)
  await expect(badge(row(page, reserved.title), 'reserved')).toBeVisible()
  await expect(listMain(page).getByRole('checkbox')).toHaveCount(0)
  await tab(page, 'All books').click()
  await expect(rowCheckbox(page, full.title)).toBeVisible()

  // 7. searches for something that doesn't exist
  await search(page, BOOKS, `no-such-book-${admin.tag}`)
  await expect(page.getByText('No books in this view')).toBeVisible()
  await expect(page.getByText('Try another Status Tab, Genre, Search term')).toBeVisible()

  // 8. clears the search &&& clicks a book > Book details with every field
  await search(page, BOOKS, admin.tag)
  const details = dialog(page)
  const fullDetails = nextResponse(page, `/admin/books/${full.id}`)
  await row(page, full.title).click()
  await fullDetails
  await expect(details.getByRole('heading', { name: 'Book details' })).toBeVisible()
  await expect(details).toContainText(full.title)
  await expect(badge(details, 'available')).toBeVisible()
  for (const label of ['Title', 'Authors', 'Condition', 'Collection area', 'Subjects', 'ISBN', 'First publication', 'Open Library ID', 'Source', 'Updated at']) {
    await expect(details.locator('dt', { hasText: new RegExp(`^${label}$`) })).toBeVisible()
  }
  await expect(field(details, 'Authors')).toHaveText('E2E Author')
  await expect(field(details, 'ISBN')).toHaveText(full.isbn)
  await expect(field(details, 'First publication')).toHaveText('1999')
  await expect(field(details, 'Collection area')).toHaveText(full.collectionarea)
  await closeDialog(page)
  await expect(details).toBeHidden()

  // 9. the book with no ISBN \ description > "Not provided" &&& "No description recorded."
  await row(page, plain.title).click()
  await expect(details.getByRole('heading', { name: 'Book details' })).toBeVisible()
  await expect(field(details, 'ISBN')).toHaveText('Not provided')
  await expect(field(details, 'Subjects')).toHaveText('Not provided')
  await expect(details.getByText('No description recorded.')).toBeVisible()
  await closeDialog(page)

  // 10. the reserved book > Edit is disabled &&& Esc closes the window
  await row(page, reserved.title).click()
  await expect(details.getByRole('heading', { name: 'Book details' })).toBeVisible()
  await expect(details.getByRole('button', { name: 'Edit' })).toBeDisabled()
  await closeDialog(page)
  await expect(details).toBeHidden()
  await expect(listSearch(page)).toHaveValue(admin.tag)
})
