import { isApi } from '../support/guest.js'
import {
  test, expect, confirmation, createBook, dialog, listMain, newCustomer, nextList, requestBook, row, rowCheckbox, rows, search, tab, toast,
} from '../support/admin.js'

const APPLICATIONS = '/admin/applications'
const actionButton = (page, name) => listMain(page).getByRole('group').getByRole('button', { name, exact: true })
const hint = (page, text) => listMain(page).locator('p[role="status"]').filter({ hasText: text })

async function openTab(page, label, status) {
  const list = nextList(page, APPLICATIONS, url => url.searchParams.get('status') === status)
  await tab(page, label).click()
  await list
}

//@ChitanyaBharathi > journey 3.8 > two readers ask for one copy &&& the admin decides several requests at once
test('admin decides competing requests in bulk', async ({ page, admin }) => {
  const bookA = await createBook(admin, { title: 'Only One Copy' })
  const bookB = await createBook(admin, { title: 'Nobody Else Wants' })
  const one = await newCustomer(admin, 'Reader One')
  const two = await newCustomer(admin, 'Reader Two')
  const three = await newCustomer(admin, 'Reader Three')
  await requestBook(admin, one, bookA)
  await requestBook(admin, two, bookA)
  await requestBook(admin, three, bookB)

  await page.goto('/admin/applications')
  await search(page, APPLICATIONS, admin.tag)
  await expect(rows(page)).toHaveCount(3)

  // 1. ticks both requests for book A > "Choose one reader per copy…"; Approve disabled, Reject not
  await rowCheckbox(page, one.email).click()
  await rowCheckbox(page, two.email).click()
  await expect(hint(page, 'Choose one reader per copy to approve requests.')).toBeVisible()
  await expect(actionButton(page, 'Approve')).toBeDisabled()
  await expect(actionButton(page, 'Reject')).toBeEnabled()

  // 2. unticks reader 2 &&& ticks reader 3 (book B) > Approve enabled
  await rowCheckbox(page, two.email).click()
  await rowCheckbox(page, three.email).click()
  await expect(hint(page, 'Choose one reader per copy')).toHaveCount(0)
  await expect(actionButton(page, 'Approve')).toBeEnabled()

  // 3. Approve &&& confirm > "Approve applications?" lists both readers, then "2 applications approved"
  await actionButton(page, 'Approve').click()
  const approve = confirmation(page, 'Approve applications?')
  await expect(approve).toContainText(`${one.name} — ${bookA.title}`)
  await expect(approve).toContainText(`${three.name} — ${bookB.title}`)
  await approve.getByRole('button', { name: 'Approve' }).click()
  await expect(toast(page, '2 applications approved')).toBeVisible()

  // 4. Rejected tab > reader 2's request for book A was rejected automatically
  await openTab(page, 'Rejected', 'rejected')
  await expect(rows(page)).toHaveCount(1)
  await expect(row(page, two.email)).toContainText(bookA.title)

  // 5. All applications, ticks an approved request > "Only pending applications…" &&& both buttons disabled
  await openTab(page, 'All applications', 'all')
  await expect(rows(page)).toHaveCount(3)
  await rowCheckbox(page, one.email).click()
  await expect(hint(page, 'Only pending applications can be approved or rejected.')).toBeVisible()
  await expect(actionButton(page, 'Approve')).toBeDisabled()
  await expect(actionButton(page, 'Reject')).toBeDisabled()

  // 6. Approved tab > no checkboxes
  await openTab(page, 'Approved', 'approved')
  await expect(rows(page)).toHaveCount(2)
  await expect(listMain(page).getByRole('checkbox')).toHaveCount(0)
})

test.describe('🔌 decisions the real data cannot make fail', () => {
  // 7. approves 2 requests when the second PATCH answers 409 > one approved, one failed with the reason, the list reloads
  test('a decision that fails part-way reports both results', async ({ page, admin }) => {
    const first = await newCustomer(admin, 'Reader One')
    const second = await newCustomer(admin, 'Reader Two')
    await requestBook(admin, first, await createBook(admin, { title: 'Left Shelf' }))
    await requestBook(admin, second, await createBook(admin, { title: 'Right Shelf' }))

    let patches = 0
    await page.route(url => url.pathname.startsWith('/admin/applications/') && url.pathname.endsWith('/status'), async route => {
      if (++patches === 2) {
        return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'only pending applications can be decided' }) })
      }
      await route.continue()
    })
    await page.goto('/admin/applications')
    await search(page, APPLICATIONS, admin.tag)
    await rowCheckbox(page, first.email).click()
    await rowCheckbox(page, second.email).click()
    await actionButton(page, 'Approve').click()
    const reloaded = nextList(page, APPLICATIONS)
    await confirmation(page, 'Approve applications?').getByRole('button', { name: 'Approve' }).click()
    await expect(toast(page, '1 application approved')).toBeVisible()
    const failed = toast(page, '1 decision failed')
    await expect(failed).toBeVisible()
    await expect(failed).toContainText(/Reader (One|Two) e2e-\w+: only pending applications can be decided/)
    await reloaded
    await expect(rows(page)).toHaveCount(1)
  })

  // 8. a pending request whose copy is no longer available > "Decisions require an available copy." &&& both disabled
  test('a request for a copy that is gone cannot be decided', async ({ page, admin }) => {
    const reader = await newCustomer(admin, 'Late Reader')
    const book = await createBook(admin, { title: 'Already Gone' })
    await requestBook(admin, reader, book)
    await page.route(isApi(APPLICATIONS), async route => {
      const response = await route.fetch()
      const body = await response.json()
      for (const application of body.adoptionapplications) {
        if (application.bookid.id === book.id) { application.bookid.status = 'reserved' }
      }
      await route.fulfill({ response, json: body })
    })
    await page.goto('/admin/applications')
    await search(page, APPLICATIONS, admin.tag)
    await row(page, reader.email).click()
    const details = dialog(page)
    await expect(details.getByText('Decisions require an available copy.')).toBeVisible()
    await expect(details.getByRole('button', { name: 'Approve' })).toBeDisabled()
    await expect(details.getByRole('button', { name: 'Reject' })).toBeDisabled()
  })
})
