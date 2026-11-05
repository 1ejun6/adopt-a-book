import { isApi, singaporeDate, trackApiRequests, driveCard, driveSearch } from '../support/guest.js'
import { callApi, slowly } from '../support/customer.js'
import {
  test, expect, badge, confirmation, createBook, defaultStation, dialog, DRIVES, field, listMain, listSelect, newCustomer, openList, optionsOf, row, rows, rsvp, search, taggedTitle, toast,
} from '../support/admin.js'


//@ChitanyaBharathi > journey 3.11 > the admin plans a drive, checks which books will be there &&& tweaks it later
test('admin creates and edits an adoption drive', async ({ page, browser, admin }) => {
  const station = await defaultStation(page.request)
  const nearbyBook = await createBook(admin, { title: 'At The Drive', mrtstationid: station.id })
  const title = taggedTitle(admin, 'Spring Book Swap')
  const renamed = taggedTitle(admin, 'Summer Book Swap')
  const eventdate = singaporeDate(10)

  // 1. opens Drives > Upcoming selected, Upcoming \ Past with counts, an Event date picker &&& a status dropdown
  const opened = await openList(page, '/admin/drives', DRIVES)
  await expect(page.getByRole('tab', { name: `Upcoming ${opened.counts.upcoming}` })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tab', { name: `Past / cancelled ${opened.counts.past}` })).toBeVisible()
  await expect(listMain(page).getByRole('button', { name: 'Event date', exact: true })).toBeVisible()
  const statusSelect = listSelect(page, 'Drive status')
  expect(await optionsOf(statusSelect)).toEqual(['All statuses', 'Open', 'Closed'])

  // 2. Create drive > every field, today's date &&& a capacity of 30
  await page.getByRole('button', { name: 'Create drive' }).click()
  const form = dialog(page)
  await expect(form.getByRole('heading', { name: 'Create drive' })).toBeVisible()
  for (const label of ['Drive title', 'Venue and address', 'Nearest MRT station', 'Description']) {
    await expect(form.getByLabel(label)).toBeVisible()
  }
  await expect(form.getByLabel('Event date')).toHaveValue(opened.today)
  await expect(form.getByLabel('Maximum capacity')).toHaveValue('30')

  // 3. Create drive with no title > the error toast &&& Drive title focused + invalid
  await form.getByRole('button', { name: 'Create drive' }).click()
  await expect(toast(page, 'Please check the highlighted fields. Complete all required fields and check the date and capacity.')).toBeVisible()
  await expect(form.getByLabel('Drive title')).toBeFocused()
  await expect(form.getByLabel('Drive title')).toHaveAttribute('aria-invalid', 'true')

  // 4. a date before today &&& a capacity of 0 > both invalid &&& nothing sent
  await form.getByLabel('Drive title').fill(title)
  await form.getByLabel('Venue and address').fill('Library Hall, 10 Example Road')
  await form.getByLabel('Nearest MRT station').selectOption(station.id)
  await form.getByLabel('Event date').fill(singaporeDate(-1))
  await form.getByLabel('Maximum capacity').fill('0')
  const api = trackApiRequests(page)
  await form.getByRole('button', { name: 'Create drive' }).click()
  await expect(form.getByLabel('Event date')).toHaveAttribute('aria-invalid', 'true')
  await expect(form.getByLabel('Maximum capacity')).toHaveAttribute('aria-invalid', 'true')
  expect(api.to(DRIVES).filter(request => request.method === 'POST')).toHaveLength(0)

  // 5. fills it in properly (10 days away) &&& saves > "Saving…", the success toast, then the row shows 0 / 30 &&& open
  await form.getByLabel('Event date').fill(eventdate)
  await form.getByLabel('Maximum capacity').fill('30')
  await form.getByLabel('Description').fill('Bring a book, take a book.')
  //@ChitanyaBharathi > slow only the POST (times: 1) > unrouting while it's still waiting makes playwright throw
  await page.route(isApi(DRIVES), slowly(), { times: 1 })
  await form.getByRole('button', { name: 'Create drive' }).click()
  await expect(form.getByRole('button', { name: 'Saving…' })).toBeVisible()
  await expect(toast(page, 'adoption drive created successfully')).toBeVisible()
  await expect(form).toBeHidden()
  await search(page, DRIVES, admin.tag)
  await expect(rows(page)).toHaveCount(1)
  await expect(row(page, title)).toContainText('0 / 30')
  await expect(badge(row(page, title), 'open')).toBeVisible()

  // 6. (as a guest, in a second browser) Adoption Drives lists the new drive
  const guestContext = await browser.newContext()
  try {
    const guest = await guestContext.newPage()
    await guest.goto('/drives')
    await driveSearch(guest).fill(title)
    await expect(driveCard(guest, title)).toBeVisible()
  } finally {
    await guestContext.close()
  }

  // 7. clicks the drive > Drive details with the badge, description, date, location + maps link, registrations &&& books at that station
  await row(page, title).click()
  const details = dialog(page)
  await expect(details.getByRole('heading', { name: 'Drive details' })).toBeVisible()
  await expect(details.getByRole('heading', { name: title })).toBeVisible()
  await expect(badge(details, 'open')).toBeVisible()
  await expect(details.getByText('Bring a book, take a book.')).toBeVisible()
  await expect(field(details, 'Event date')).not.toHaveText('Not provided')
  await expect(field(details, 'Location')).toContainText('Library Hall, 10 Example Road')
  const maps = details.getByRole('link', { name: 'Open in Google Maps ↗' })
  await expect(maps).toHaveAttribute('target', '_blank')
  await expect(maps).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(field(details, 'Registrations')).toHaveText('0 / 30')
  await expect(details.getByRole('heading', { name: 'Available books' })).toBeVisible()
  const books = details.getByRole('region', { name: 'Available books at this MRT station' })

  // 8. searches the station's books by title, then something that doesn't exist
  const bookSearch = details.getByRole('searchbox', { name: 'Search available books by title or author' })
  //@ChitanyaBharathi > the dialog reads every available book at the station, 100 at a time > can take a while on a big station
  await expect(bookSearch).toBeEnabled({ timeout: 20_000 })
  await bookSearch.fill(nearbyBook.title)
  await expect(books.locator('tbody tr')).toHaveCount(1)
  await expect(books).toContainText(nearbyBook.title)
  await bookSearch.fill(`nothing-${admin.tag}`)
  await expect(books.getByText('No matching books')).toBeVisible()

  // 9. Edit > Edit drive filled in, with "0 registered…"
  await details.getByRole('button', { name: 'Edit' }).click()
  await expect(form.getByRole('heading', { name: 'Edit drive' })).toBeVisible()
  await expect(form.getByLabel('Drive title')).toHaveValue(title)
  await expect(form.getByLabel('Event date')).toHaveValue(eventdate)
  await expect(form.getByText('0 registered. Capacity cannot be lower than this count.')).toBeVisible()

  // 10. changes the title &&& capacity, Save changes > the success toast &&& the row shows them
  await form.getByLabel('Drive title').fill(renamed)
  await form.getByLabel('Maximum capacity').fill('25')
  await form.getByRole('button', { name: 'Save changes' }).click()
  await expect(toast(page, 'adoption drive updated successfully')).toBeVisible()
  await expect(form).toBeHidden()
  await expect(row(page, renamed)).toContainText('0 / 25')

  // 11. a fresh customer rsvps (through the api) &&& the admin sets capacity to 0 > "1 registered…" &&& capacity invalid
  const reader = await newCustomer(admin, 'Drive Reader')
  const { drives } = await callApi(page.request, 'GET', `${DRIVES}?view=all&search=${encodeURIComponent(renamed)}`)
  await rsvp(admin, reader, drives[0])
  await openList(page, '/admin/drives', DRIVES)
  await search(page, DRIVES, admin.tag)
  await expect(row(page, renamed)).toContainText('1 / 25')
  await row(page, renamed).click()
  await details.getByRole('button', { name: 'Edit' }).click()
  await expect(form.getByText('1 registered. Capacity cannot be lower than this count.')).toBeVisible()
  await form.getByLabel('Maximum capacity').fill('0')
  await form.getByRole('button', { name: 'Save changes' }).click()
  await expect(form.getByLabel('Maximum capacity')).toHaveAttribute('aria-invalid', 'true')

  // 12. Esc with that unsaved change > "Discard your changes?"; Discard closes &&& the drive keeps its saved capacity
  await page.keyboard.press('Escape')
  const discard = confirmation(page, 'Discard your changes?')
  await expect(discard).toBeVisible()
  await discard.getByRole('button', { name: 'Discard' }).click()
  await expect(form).toBeHidden()
  await expect(row(page, renamed)).toContainText('1 / 25')
})
