import { isApi, json, trackApiRequests } from '../support/guest.js'
import { test, expect, badge, BOOKS, defaultStation, dialog, row, rows, search, stations, taggedTitle, toast } from '../support/admin.js'


//@ChitanyaBharathi > /admin/open-library always faked > the real site is slow &&& its results change
//@ChitanyaBharathi > descriptions are filled in so the server doesn't go back to open library for one
function fakeLookup(admin) {
  return [
    { title: taggedTitle(admin, 'Harbour Lights'), authors: ['Mei Tan'], isbn: '9780000000011', subjects: ['Fiction'], publicationyear: 2001, description: 'A fake result.', coverurl: '', openlibraryid: 'OL1E2EW' },
    { title: taggedTitle(admin, 'River Songs'), authors: ['Ravi Nair'], isbn: '9780000000028', subjects: ['Poetry'], publicationyear: 1987, description: 'A fake result.', coverurl: '', openlibraryid: 'OL2E2EW' },
    { title: taggedTitle(admin, 'Unknown Year'), authors: ['Ana Lim'], isbn: null, subjects: [], publicationyear: null, description: 'A fake result.', coverurl: '', openlibraryid: 'OL3E2EW' },
  ]
}

const resultsStatus = (page, results, selected) => dialog(page).getByRole('status').filter({ hasText: `${results} results · ${selected} selected` })
const stationFor = (page, title) => dialog(page).getByRole('combobox', { name: `MRT station for ${title}` })

//@ChitanyaBharathi > opens Add book &&& runs a (faked) Open Library search
async function lookUp(page, books, query = 'harbour') {
  await page.route(isApi('/admin/open-library'), json({ books }))
  await page.getByRole('button', { name: 'Add Book' }).click()
  const form = dialog(page)
  await form.getByLabel('Search by title, author or ISBN').fill(query)
  await form.getByRole('button', { name: 'Search', exact: true }).click()
  return form
}

//@ChitanyaBharathi > journey 3.4 > the admin adds donated books by looking them up
test('admin adds books from Open Library', async ({ page, admin }) => {
  const lookup = fakeLookup(admin)
  const [first, second] = lookup
  const station = await defaultStation(page.request)
  const other = (await stations(page.request)).find(item => item.id !== station.id)
  await page.goto('/admin/books')

  // 1. clicks Add Book > Find on Open Library, Enter manually &&& a disabled Search
  await page.getByRole('button', { name: 'Add Book' }).click()
  const form = dialog(page)
  await expect(form.getByRole('heading', { name: 'Add book' })).toBeVisible()
  await expect(form.getByRole('heading', { name: 'Find on Open Library' })).toBeVisible()
  await expect(form.getByRole('button', { name: 'Enter manually' })).toBeVisible()
  await expect(form.getByRole('button', { name: 'Search', exact: true })).toBeDisabled()

  // 2. searches for a title > "Searching…", then 3 results with cover, title, author, ISBN &&& first publication
  await page.route(isApi('/admin/open-library'), async route => {
    await new Promise(resolve => setTimeout(resolve, 500))
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ books: lookup }) })
  })
  await form.getByLabel('Search by title, author or ISBN').fill('harbour')
  await expect(form.getByRole('button', { name: 'Search', exact: true })).toBeEnabled()
  await form.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(form.getByRole('button', { name: 'Searching…' })).toBeVisible()
  await expect(form.getByRole('status').filter({ hasText: 'Searching Open Library…' })).toBeVisible()
  await expect(resultsStatus(page, 3, 0)).toBeVisible()
  const results = form.locator('tbody tr')
  await expect(results).toHaveCount(3)
  await expect(results.nth(0)).toContainText(first.title)
  await expect(results.nth(0)).toContainText('Mei Tan')
  await expect(results.nth(0)).toContainText(first.isbn)
  await expect(results.nth(0)).toContainText('2001')
  await expect(results.nth(2)).toContainText('Not provided')

  // 3. clicks two rows > both ticked, "2 selected" &&& Next enabled
  await results.nth(0).click()
  await results.nth(1).click()
  await expect(resultsStatus(page, 3, 2)).toBeVisible()
  await expect(results.nth(0).getByRole('checkbox')).toBeChecked()
  await expect(results.nth(1).getByRole('checkbox')).toBeChecked()
  await expect(form.getByRole('button', { name: 'Next' })).toBeEnabled()

  // 4. clicks Next > Choose collection locations, 2 books to add, a station per book &&& Remove
  await form.getByRole('button', { name: 'Next' }).click()
  await expect(form.getByRole('heading', { name: 'Choose collection locations' })).toBeVisible()
  await expect(form.getByText('2 books to add')).toBeVisible()
  await expect(stationFor(page, first.title)).toHaveValue('')
  await expect(stationFor(page, second.title)).toHaveValue('')
  await expect(form.getByRole('button', { name: `Remove ${first.title}` })).toBeVisible()
  await expect(form.getByRole('button', { name: `Remove ${second.title}` })).toBeVisible()

  // 5. without stations chosen, Add 2 books can't be pressed
  //    (the plan expected a "Choose an MRT station…" toast, but the button stays disabled until every book has a station)
  await expect(form.getByRole('button', { name: 'Add 2 books' })).toBeDisabled()

  // 6. chooses a station for the first book, then removes the second > Add 1 book
  await stationFor(page, first.title).selectOption(station.id)
  await form.getByRole('button', { name: `Remove ${second.title}` }).click()
  await expect(form.getByRole('button', { name: 'Add 1 book' })).toBeEnabled()

  // 7. Back to results, ticks the second book again, Next > the first keeps its station; the second needs one
  await form.getByRole('button', { name: 'Back to results' }).click()
  await expect(resultsStatus(page, 3, 1)).toBeVisible()
  await results.nth(1).click()
  await form.getByRole('button', { name: 'Next' }).click()
  await expect(stationFor(page, first.title)).toHaveValue(station.id)
  await expect(stationFor(page, second.title)).toHaveValue('')
  await expect(form.getByRole('button', { name: 'Add 2 books' })).toBeDisabled()

  // 8. chooses the second station &&& adds > one POST per book with source open_library, then both show as available
  await stationFor(page, second.title).selectOption(other.id)
  const api = trackApiRequests(page)
  const posted = []
  page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname === BOOKS) { posted.push(request.postDataJSON()) } })
  await form.getByRole('button', { name: 'Add 2 books' }).click()
  await expect(toast(page, '2 books added')).toBeVisible()
  await expect(form).toBeHidden()
  expect(api.to(BOOKS).filter(request => request.method === 'POST')).toHaveLength(2)
  expect(posted.map(body => body.source)).toEqual(['open_library', 'open_library'])
  expect(posted.map(body => body.mrtstationid)).toEqual([station.id, other.id])
  await search(page, BOOKS, admin.tag)
  await expect(rows(page)).toHaveCount(2)
  await expect(badge(row(page, first.title), 'available')).toBeVisible()
  await expect(badge(row(page, second.title), 'available')).toBeVisible()
})

test.describe('🔌 Open Library answers the real site cannot be made to give', () => {
  // 9. the second POST fails > one added, one failed, the window stays open with only the failed book &&& retry adds it
  test('a failed book can be retried on its own', async ({ page, admin }) => {
    const lookup = fakeLookup(admin)
    const [first, second] = lookup
    const station = await defaultStation(page.request)
    await page.goto('/admin/books')
    const form = await lookUp(page, lookup)
    await form.locator('tbody tr').nth(0).click()
    await form.locator('tbody tr').nth(1).click()
    await form.getByRole('button', { name: 'Next' }).click()
    await stationFor(page, first.title).selectOption(station.id)
    await stationFor(page, second.title).selectOption(station.id)

    let posts = 0
    await page.route(isApi(BOOKS), async route => {
      if (route.request().method() === 'POST' && ++posts === 2) {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'error creating book' }) })
      }
      await route.continue()
    })
    await form.getByRole('button', { name: 'Add 2 books' }).click()
    await expect(toast(page, '1 book added')).toBeVisible()
    const failed = toast(page, '1 book could not be added')
    await expect(failed).toBeVisible()
    await expect(failed).toContainText(`${second.title}: error creating book`)
    await expect(form).toBeVisible()
    await expect(form.locator('tbody tr')).toHaveCount(1)
    await expect(stationFor(page, second.title)).toHaveValue(station.id)

    await page.unroute(isApi(BOOKS))
    await form.getByRole('button', { name: 'Add 1 book' }).click()
    await expect(form).toBeHidden()
    await search(page, BOOKS, admin.tag)
    await expect(rows(page)).toHaveCount(2)
  })

  // 10. a search with no matches
  test('a search with no matches says so', async ({ page, admin }) => {
    await page.goto('/admin/books')
    const form = await lookUp(page, [], 'zzzz')
    await expect(resultsStatus(page, 0, 0)).toBeVisible()
    await expect(form.getByText('Try another title, author or ISBN, or enter the book manually.')).toBeVisible()
  })

  // 11. Open Library is down (502) > an error toast &&& they can search again
  test('Open Library being down shows an error', async ({ page, admin }) => {
    await page.goto('/admin/books')
    await page.route(isApi('/admin/open-library'), json({ error: 'open library search unavailable' }, 502))
    await page.getByRole('button', { name: 'Add Book' }).click()
    const form = dialog(page)
    await form.getByLabel('Search by title, author or ISBN').fill('harbour')
    await form.getByRole('button', { name: 'Search', exact: true }).click()
    await expect(toast(page, 'open library search unavailable')).toBeVisible()
    await expect(form.getByRole('button', { name: 'Search', exact: true })).toBeEnabled()
  })
})
