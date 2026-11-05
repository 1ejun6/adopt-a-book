import { isApi, json, trackApiRequests } from '../support/guest.js'
import { slowly } from '../support/customer.js'
import {
  test, expect, badge, confirmation, createBook, dialog, field, listMain, nextList, row, rowCheckbox, rows, search, seedAdoption, selectedCount, taggedTitle, toast,
} from '../support/admin.js'

const BOOKS = '/admin/books'
const actionButton = (page, name) => listMain(page).getByRole('group').getByRole('button', { name, exact: true })

//@ChitanyaBharathi > journey 3.6 > the admin fixes a book's details &&& removes copies added by mistake
test('admin edits a book and deletes two others', async ({ page, admin }) => {
  const first = await createBook(admin, { title: 'Wrong Condition', condition: 'fair' })
  const second = await createBook(admin, { title: 'Added Twice' })
  const third = await createBook(admin, { title: 'Also Twice' })
  const { book: reserved } = await seedAdoption(admin, 'approved', { book: { title: 'Already Promised' } })
  const renamed = taggedTitle(admin, 'Right Condition')

  await page.goto('/admin/books')
  await search(page, BOOKS, admin.tag)
  await expect(rows(page)).toHaveCount(4)

  // 1. ticks one available book > "1 selected" with Edit &&& Delete
  await rowCheckbox(page, first.title).click()
  await expect(selectedCount(page, 1)).toBeVisible()
  await expect(actionButton(page, 'Edit')).toBeEnabled()
  await expect(actionButton(page, 'Delete')).toBeEnabled()

  // 2. clicks Edit > Edit book filled in, with its available badge &&& Save changes
  await actionButton(page, 'Edit').click()
  const form = dialog(page)
  await expect(form.getByRole('heading', { name: 'Edit book' })).toBeVisible()
  await expect(form.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(first.title)
  await expect(form.getByLabel('Condition')).toHaveValue('fair')
  await expect(badge(form, 'available')).toBeVisible()
  await expect(form.getByRole('button', { name: 'Save changes' })).toBeVisible()

  // 3. changes the title &&& condition > "Saving…", the success toast, the window closes, the row shows the new title
  await form.getByRole('textbox', { name: 'Title', exact: true }).fill(renamed)
  await form.getByLabel('Condition').selectOption('like new')
  await page.route(isApi(`/admin/books/${first.id}`), slowly(), { times: 1 })
  await form.getByRole('button', { name: 'Save changes' }).click()
  await expect(form.getByRole('button', { name: 'Saving…' })).toBeVisible()
  await expect(toast(page, `you have updated book ${renamed} successfully!`)).toBeVisible()
  await expect(form).toBeHidden()
  await expect(row(page, renamed)).toBeVisible()

  // 4. opens its details > the new condition &&& Updated at; Edit inside opens the same form
  await row(page, renamed).click()
  const details = dialog(page)
  await expect(details.getByRole('heading', { name: 'Book details' })).toBeVisible()
  await expect(field(details, 'Condition')).toHaveText('like new')
  await expect(field(details, 'Updated at')).not.toHaveText('Not provided')
  await details.getByRole('button', { name: 'Edit' }).click()
  await expect(form.getByRole('heading', { name: 'Edit book' })).toBeVisible()
  await expect(form.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(renamed)
  await page.keyboard.press('Escape')
  await expect(form).toBeHidden()

  // 5. ticks a second book > "2 selected" &&& Edit is disabled
  await rowCheckbox(page, second.title).click()
  await rowCheckbox(page, third.title).click()
  await expect(selectedCount(page, 2)).toBeVisible()
  await expect(actionButton(page, 'Edit')).toBeDisabled()

  // 6. also ticks the reserved book > "Only available books can be deleted." &&& both actions disabled
  await rowCheckbox(page, reserved.title).click()
  await expect(listMain(page).locator('p[role="status"]').filter({ hasText: 'Only available books can be deleted.' })).toBeVisible()
  await expect(actionButton(page, 'Delete')).toBeDisabled()
  await expect(actionButton(page, 'Edit')).toBeDisabled()

  // 7. unticks the reserved book, Delete, then Cancel > both titles listed with the warning, no DELETE sent
  await rowCheckbox(page, reserved.title).click()
  const api = trackApiRequests(page)
  await actionButton(page, 'Delete').click()
  const ask = confirmation(page, 'Delete books?')
  await expect(ask).toBeVisible()
  await expect(ask).toContainText('related applications, appointments, and watchlist entries will be permanently deleted')
  await expect(ask).toContainText(second.title)
  await expect(ask).toContainText(third.title)
  await ask.getByRole('button', { name: 'Cancel' }).click()
  await expect(ask).toBeHidden()
  expect(api.to(BOOKS).filter(request => request.method === 'DELETE')).toHaveLength(0)

  // 8. Delete again &&& confirm > "Deleting…", "2 deleted" with both titles numbered, the rows go &&& All books updates
  //    (other journeys add \ delete books at the same time, so the tab is checked against the server's new count, not "minus 2")
  await page.route(isApi(BOOKS), async route => {
    if (route.request().method() === 'DELETE') { await new Promise(resolve => setTimeout(resolve, 500)) }
    await route.continue()
  })
  const reloaded = nextList(page, BOOKS)
  await actionButton(page, 'Delete').click()
  await confirmation(page, 'Delete books?').getByRole('button', { name: 'Delete' }).click()
  await expect(actionButton(page, 'Deleting…')).toBeVisible()
  const { counts } = await (await reloaded).json()
  const deleted = toast(page, '2 deleted')
  await expect(deleted).toBeVisible()
  await expect(deleted).toContainText(`1. ${second.title}`)
  await expect(deleted).toContainText(`2. ${third.title}`)
  await expect(row(page, second.title)).toHaveCount(0)
  await expect(row(page, third.title)).toHaveCount(0)
  await expect(rows(page)).toHaveCount(2)
  await expect(page.getByRole('tab', { name: `All books ${counts.all}` })).toBeVisible()
  await page.unroute(isApi(BOOKS))
})

// 9. 🔌 DELETE /admin/books fails > the error toast &&& the row stays
test('🔌 a failed delete keeps the book', async ({ page, admin }) => {
  const book = await createBook(admin, { title: 'Stays Put' })
  await page.route(isApi(BOOKS), async route => {
    if (route.request().method() === 'DELETE') { return json({ error: 'error deleting book(s)!' }, 500)(route) }
    await route.continue()
  })
  await page.goto('/admin/books')
  await search(page, BOOKS, admin.tag)
  await rowCheckbox(page, book.title).click()
  await actionButton(page, 'Delete').click()
  await confirmation(page, 'Delete book?').getByRole('button', { name: 'Delete' }).click()
  await expect(toast(page, 'error deleting book(s)!')).toBeVisible()
  await expect(row(page, book.title)).toBeVisible()
})
