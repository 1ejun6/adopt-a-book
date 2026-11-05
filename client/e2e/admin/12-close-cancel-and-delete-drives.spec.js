import { singaporeDate, driveCard, driveSearch } from '../support/guest.js'
import {
  test, expect, badge, confirmation, createDrive, dialog, listMain, nextList, pickDate, row, rowCheckbox, rows, search, selectedCount, tab, toast,
} from '../support/admin.js'

const DRIVES = '/admin/drives'
const actionButton = (page, name) => listMain(page).getByRole('group').getByRole('button', { name, exact: true })

async function openView(page, label, view) {
  const list = nextList(page, DRIVES, url => url.searchParams.get('view') === view)
  await tab(page, label).click()
  return (await list).json()
}

//@ChitanyaBharathi > journey 3.12 > the admin closes a full drive, cancels one &&& removes two made by mistake
test('admin closes, cancels and deletes drives', async ({ page, browser, admin }) => {
  const toClose = await createDrive(admin, { title: 'Full Already' })
  const toCancel = await createDrive(admin, { title: 'Rained Out' })
  const mistakeOne = await createDrive(admin, { title: 'Typo Drive' })
  const mistakeTwo = await createDrive(admin, { title: 'Duplicate Drive' })

  await page.goto('/admin/drives')
  await search(page, DRIVES, admin.tag)
  await expect(rows(page)).toHaveCount(4)

  // 1. ticks one drive > "1 selected" with Edit, Close registration, Cancel drives &&& Delete
  await rowCheckbox(page, toClose.title).click()
  await expect(selectedCount(page, 1)).toBeVisible()
  for (const name of ['Edit', 'Close registration', 'Cancel drives', 'Delete']) {
    await expect(actionButton(page, name)).toBeEnabled()
  }

  // 2. Close registration &&& confirm > "existing registrations remain", then "1 drive closed" &&& a closed badge
  await actionButton(page, 'Close registration').click()
  const close = confirmation(page, 'Close registration?')
  await expect(close).toContainText('Stop new registrations. Existing registrations remain.')
  await expect(close).toContainText(toClose.title)
  await close.getByRole('button', { name: 'Close registration' }).click()
  await expect(toast(page, '1 drive closed')).toBeVisible()
  await expect(badge(row(page, toClose.title), 'closed')).toBeVisible()

  // 3. (as a guest, in a second browser) that drive says "registration has closed" instead of rsvp
  const guestContext = await browser.newContext()
  try {
    const guest = await guestContext.newPage()
    await guest.goto('/drives')
    await driveSearch(guest).fill(toClose.title)
    await driveCard(guest, toClose.title).click()
    const guestDialog = guest.getByRole('dialog')
    await expect(guestDialog.getByText('registration has closed')).toBeVisible()
    await expect(guestDialog.getByRole('button', { name: 'rsvp' })).toHaveCount(0)
  } finally {
    await guestContext.close()
  }

  // 4. ticks the closed drive again > Close registration disabled, Cancel drives not
  await rowCheckbox(page, toClose.title).click()
  await expect(actionButton(page, 'Close registration')).toBeDisabled()
  await expect(actionButton(page, 'Cancel drives')).toBeEnabled()
  await rowCheckbox(page, toClose.title).click()

  // 5. opens a different drive &&& Cancel drive, then confirms > "registrations remain for reference", "1 drive cancelled", it moves to Past
  await row(page, toCancel.title).click()
  const details = dialog(page)
  await details.getByRole('button', { name: 'Cancel drive' }).click()
  const cancel = confirmation(page, 'Cancel drive?')
  await expect(cancel).toContainText('These events will be cancelled. Existing registrations remain for reference.')
  await cancel.getByRole('button', { name: 'Cancel drives' }).click()
  await expect(toast(page, '1 drive cancelled')).toBeVisible()
  await expect(row(page, toCancel.title)).toHaveCount(0)

  // 6. Past > no checkboxes, Closed \ Cancelled in the dropdown, &&& the cancelled drive's details have no books \ actions
  await openView(page, 'Past', 'past')
  await expect(badge(row(page, toCancel.title), 'cancelled')).toBeVisible()
  await expect(listMain(page).getByRole('checkbox')).toHaveCount(0)
  const statusSelect = listMain(page).getByRole('combobox', { name: 'Drive status' })
  expect((await statusSelect.locator('option').allTextContents()).map(text => text.trim())).toEqual(['All statuses', 'Closed', 'Cancelled'])
  await row(page, toCancel.title).click()
  await expect(details.getByRole('heading', { name: 'Drive details' })).toBeVisible()
  await expect(details.getByRole('heading', { name: 'Available books' })).toHaveCount(0)
  for (const name of ['Edit', 'Close registration', 'Cancel drive', 'Delete']) {
    await expect(details.getByRole('button', { name, exact: true })).toHaveCount(0)
  }
  await page.keyboard.press('Escape')

  // 7. back to Upcoming, ticks the 2 remaining open drives &&& Delete > "permanently deleted", then "2 drives deleted"
  await openView(page, 'Upcoming', 'upcoming')
  await rowCheckbox(page, mistakeOne.title).click()
  await rowCheckbox(page, mistakeTwo.title).click()
  await actionButton(page, 'Delete').click()
  const remove = confirmation(page, 'Delete drives?')
  await expect(remove).toContainText('These drives and their registrations will be permanently deleted.')
  await remove.getByRole('button', { name: 'Delete' }).click()
  await expect(toast(page, '2 drives deleted')).toBeVisible()
  await expect(row(page, mistakeOne.title)).toHaveCount(0)
  await expect(row(page, mistakeTwo.title)).toHaveCount(0)
  await expect(rows(page)).toHaveCount(1)

  // 8. filters by an Event date with no drives > "No matching drives"
  await pickDate(page, 'Event date', singaporeDate(20))
  await expect(page.getByText('No matching drives')).toBeVisible()
  await expect(page.getByText('Try another date, status, search term, or view.')).toBeVisible()
})

// 9. 🔌 closes 2 drives when the second PATCH fails > "1 drive closed" &&& "1 update failed" with the title, then the list reloads
test('🔌 closing drives that fail part-way reports both results', async ({ page, admin }) => {
  const one = await createDrive(admin, { title: 'Closes Fine' })
  const two = await createDrive(admin, { title: 'Fails To Close' })
  let patches = 0
  await page.route(url => url.pathname.startsWith(`${DRIVES}/`), async route => {
    if (route.request().method() === 'PATCH' && ++patches === 2) {
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'error updating drive' }) })
    }
    await route.continue()
  })
  await page.goto('/admin/drives')
  await search(page, DRIVES, admin.tag)
  await rowCheckbox(page, one.title).click()
  await rowCheckbox(page, two.title).click()
  await actionButton(page, 'Close registration').click()
  const reloaded = nextList(page, DRIVES)
  await confirmation(page, 'Close registration?').getByRole('button', { name: 'Close registration' }).click()
  await expect(toast(page, '1 drive closed')).toBeVisible()
  const failed = toast(page, '1 update failed')
  await expect(failed).toBeVisible()
  await expect(failed).toContainText(/(Closes Fine|Fails To Close) e2e-\w+: error updating drive/)
  await reloaded
  await expect(rows(page).locator('[data-status="closed"]')).toHaveCount(1)
})
