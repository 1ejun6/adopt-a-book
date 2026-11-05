import {
  test, expect, APPLICATIONS, badge, BOOKS, confirmation, dialog, field, goTo, listSelect, nextList, openList, openTab, row, rowCheckbox, rows, search, seedAdoption, selectionButton, tab, toast,
} from '../support/admin.js'


//@ChitanyaBharathi > journey 3.7 > the admin approves one new request &&& turns one down
test('admin reviews adoption applications', async ({ page, admin }) => {
  const older = await seedAdoption(admin, 'requested', { book: { title: 'First Asked' } })
  const newer = await seedAdoption(admin, 'requested', { book: { title: 'Second Asked' } })

  // 1. opens Adoption Applications > Pending &&& Oldest first selected, 5 tabs with the server's counts
  const first = await openList(page, '/admin/applications', APPLICATIONS)
  await expect(tab(page, 'Pending')).toHaveAttribute('aria-selected', 'true')
  await expect(listSelect(page, 'Application order')).toHaveValue('oldest')
  await expect(page.getByRole('tab', { name: `All applications ${first.counts.all}` })).toBeVisible()
  for (const status of ['pending', 'approved', 'rejected', 'cancelled']) {
    const label = status[0].toUpperCase() + status.slice(1)
    await expect(page.getByRole('tab', { name: `${label} ${first.counts[status]}` })).toBeVisible()
  }

  // 2. searches for their tag > their 2 requests, each with applicant, email, copy, submitted date &&& a pending badge
  await search(page, APPLICATIONS, admin.tag)
  await expect(rows(page)).toHaveCount(2)
  for (const { customer, book } of [older, newer]) {
    const line = row(page, customer.email)
    await expect(line).toContainText(customer.name)
    await expect(line).toContainText(book.title)
    await expect(line).toContainText(new Date().getFullYear().toString())
    await expect(badge(line, 'pending')).toBeVisible()
  }
  await expect(rows(page).nth(0)).toContainText(older.book.title)

  // 3. switches to Newest first > the two rows swap places
  const newest = nextList(page, APPLICATIONS, url => url.searchParams.get('sort') === 'newest')
  await listSelect(page, 'Application order').selectOption('newest')
  await newest
  await expect(rows(page).nth(0)).toContainText(newer.book.title)
  await expect(rows(page).nth(1)).toContainText(older.book.title)

  // 4. clicks the older request > Application details with every field, "No reason stated." &&& Reject \ Approve
  await row(page, older.customer.email).click()
  const details = dialog(page)
  await expect(details.getByRole('heading', { name: 'Application details' })).toBeVisible()
  await expect(details).toContainText(older.book.title)
  await expect(badge(details, 'pending')).toBeVisible()
  await expect(field(details, 'Applicant')).toHaveText(older.customer.name)
  await expect(field(details, 'Email')).toHaveText(older.customer.email)
  await expect(field(details, 'Submitted')).not.toHaveText('Not provided')
  await expect(field(details, 'Collection area')).toHaveText(older.book.collectionarea)
  await expect(details.getByText('Reason', { exact: true })).toBeVisible()
  await expect(details.getByText('No reason stated.')).toBeVisible()
  await expect(details.getByRole('button', { name: 'Reject' })).toBeEnabled()
  await expect(details.getByRole('button', { name: 'Approve' })).toBeEnabled()

  // 5. Approve, then confirm > the explanation &&& "<applicant> — <title>", then "1 application approved", the row leaves Pending
  await details.getByRole('button', { name: 'Approve' }).click()
  const approve = confirmation(page, 'Approve application?')
  await expect(approve).toContainText('Each approved copy becomes reserved. Competing pending requests will be rejected.')
  await expect(approve).toContainText(`${older.customer.name} — ${older.book.title}`)
  const afterApprove = nextList(page, APPLICATIONS)
  await approve.getByRole('button', { name: 'Approve' }).click()
  await expect(toast(page, '1 application approved')).toBeVisible()
  await afterApprove
  await expect(rows(page)).toHaveCount(1)
  await expect(row(page, older.customer.email)).toHaveCount(0)
  await openTab(page, APPLICATIONS, 'Approved', { status: 'approved' })
  await expect(badge(row(page, older.customer.email), 'approved')).toBeVisible()

  // 6. Book Inventory > that book is now reserved &&& Edit is disabled
  await goTo(page, 'Book Inventory')
  await search(page, BOOKS, older.book.title)
  await expect(badge(row(page, older.book.title), 'reserved')).toBeVisible()
  await row(page, older.book.title).click()
  await expect(dialog(page).getByRole('button', { name: 'Edit' })).toBeDisabled()
  await page.keyboard.press('Escape')

  // 7. back, ticks the second request &&& Reject > "Reject application?" with a red Reject, then "1 application rejected"
  await page.goBack()
  await expect(tab(page, 'Pending')).toHaveAttribute('aria-selected', 'true')
  await search(page, APPLICATIONS, admin.tag)
  await rowCheckbox(page, newer.customer.email).click()
  await selectionButton(page, 'Reject').click()
  const reject = confirmation(page, 'Reject application?')
  await expect(reject).toContainText(`${newer.customer.name} — ${newer.book.title}`)
  await expect(reject.getByRole('button', { name: 'Reject' })).toHaveAttribute('data-variant', 'destructive')
  await reject.getByRole('button', { name: 'Reject' }).click()
  await expect(toast(page, '1 application rejected')).toBeVisible()
  await openTab(page, APPLICATIONS, 'Rejected', { status: 'rejected' })
  await expect(badge(row(page, newer.customer.email), 'rejected')).toBeVisible()

  // 8. opens the rejected request > no Approve or Reject
  await row(page, newer.customer.email).click()
  await expect(details.getByRole('heading', { name: 'Application details' })).toBeVisible()
  await expect(badge(details, 'rejected')).toBeVisible()
  await expect(details.getByRole('button', { name: 'Approve' })).toHaveCount(0)
  await expect(details.getByRole('button', { name: 'Reject' })).toHaveCount(0)
  await page.keyboard.press('Escape')

  // 9. searches for something that doesn't exist
  await search(page, APPLICATIONS, `no-such-request-${admin.tag}`)
  await expect(page.getByText('No matching applications')).toBeVisible()
  await expect(page.getByText('Try another search term or status.')).toBeVisible()
})
