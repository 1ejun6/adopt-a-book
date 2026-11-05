import { isApi, trackApiRequests } from '../support/guest.js'
import { test, expect, confirmation, coverFiles, defaultStation, dialog, row, rows, search, taggedTitle, toast } from '../support/admin.js'

const BOOKS = '/admin/books'
const COVER = '/admin/books/cover'
const ERROR_TOAST = 'Please check the highlighted fields. Title and collection area are required; enter only one subject.'

//@ChitanyaBharathi > Add Book → Enter manually > returns the form dialog
async function openManualForm(page) {
  await page.getByRole('button', { name: 'Add Book' }).click()
  const form = dialog(page)
  await form.getByRole('button', { name: 'Enter manually' }).click()
  await expect(form.getByRole('textbox', { name: 'Title', exact: true })).toBeVisible()
  return form
}
const coverInput = form => form.locator('#edit-cover-file')
const preview = form => form.getByRole('img', { name: 'Preview of the book’s front cover' })

//@ChitanyaBharathi > journey 3.5 > the admin types in a book Open Library doesn't know, with a photo of its cover
test('admin adds a book by hand with a cover photo', async ({ page, admin }) => {
  const station = await defaultStation(page.request)
  const firstTitle = taggedTitle(admin, 'Handwritten Notes')
  const secondTitle = taggedTitle(admin, 'Second Copy')
  await page.goto('/admin/books')

  // 1. Add Book → Enter manually > every field, a closed metadata section &&& the three buttons
  const form = await openManualForm(page)
  await expect(form.getByLabel('Authors (comma separated)')).toBeVisible()
  await expect(form.getByText('Cover photo', { exact: true })).toBeVisible()
  await expect(form.getByLabel('Condition')).toBeVisible()
  await expect(form.getByLabel('Collection area (MRT station)')).toBeVisible()
  await expect(form.getByLabel('Description')).toBeVisible()
  const metadata = form.locator('details')
  await expect(metadata).not.toHaveAttribute('open', '')
  await expect(form.locator('summary')).toHaveText('ISBN and other metadata')
  for (const name of ['Cancel', 'Add and continue', 'Add book']) {
    await expect(form.getByRole('button', { name, exact: true })).toBeVisible()
  }

  // 2. Add book with nothing filled in > the error toast &&& Title focused + invalid
  await form.getByRole('button', { name: 'Add book', exact: true }).click()
  await expect(toast(page, ERROR_TOAST)).toBeVisible()
  await expect(form.getByRole('textbox', { name: 'Title', exact: true })).toBeFocused()
  await expect(form.getByRole('textbox', { name: 'Title', exact: true })).toHaveAttribute('aria-invalid', 'true')

  // 3. only spaces as the title &&& two subjects > title still invalid, metadata opens by itself with Subject invalid
  await form.getByRole('textbox', { name: 'Title', exact: true }).fill('   ')
  await form.locator('summary').click()
  await form.getByLabel('Subject').fill('Fiction, Poetry')
  await form.locator('summary').click()
  await expect(metadata).not.toHaveAttribute('open', '')
  await form.getByRole('button', { name: 'Add book', exact: true }).click()
  await expect(form.getByRole('textbox', { name: 'Title', exact: true })).toHaveAttribute('aria-invalid', 'true')
  await expect(metadata).toHaveAttribute('open', '')
  await expect(form.getByLabel('Subject')).toHaveAttribute('aria-invalid', 'true')
  await form.getByLabel('Subject').fill('Fiction')

  // 4. a GIF, then a 6 MB PNG > each error under the field (role="alert") &&& as a toast, no preview
  await coverInput(form).setInputFiles(coverFiles.gif)
  await expect(form.getByRole('alert')).toHaveText('Choose a JPG, PNG or WebP image.')
  await expect(toast(page, 'Choose a JPG, PNG or WebP image.')).toBeVisible()
  await coverInput(form).setInputFiles(coverFiles.huge)
  await expect(form.getByRole('alert')).toHaveText('This photo exceeds 5 MB. Choose a smaller file.')
  await expect(toast(page, 'This photo exceeds 5 MB. Choose a smaller file.')).toBeVisible()
  await expect(preview(form)).toHaveCount(0)

  // 5. a small PNG > preview, file name, the save hint, Change photo &&& Cover URL disabled
  await coverInput(form).setInputFiles(coverFiles.png)
  await expect(preview(form)).toBeVisible()
  await expect(form.getByText('cover.png')).toBeVisible()
  await expect(form.getByText('Photo will be saved when you save the book.')).toBeVisible()
  await expect(form.getByRole('button', { name: 'Change photo' })).toBeVisible()
  await expect(form.getByLabel('Cover URL')).toBeDisabled()

  // 6. fills in the rest &&& Add and continue > cover upload first, then the book with that coverurl; the form empties but stays open
  await form.getByRole('textbox', { name: 'Title', exact: true }).fill(firstTitle)
  await form.getByLabel('Authors (comma separated)').fill('Hand Writer')
  await form.getByLabel('Condition').selectOption('like new')
  await form.getByLabel('Collection area (MRT station)').selectOption(station.id)
  const api = trackApiRequests(page)
  const upload = page.waitForResponse(response => new URL(response.url()).pathname === COVER && response.request().method() === 'POST')
  const created = page.waitForRequest(request => new URL(request.url()).pathname === BOOKS && request.method() === 'POST')
  await form.getByRole('button', { name: 'Add and continue' }).click()
  const { coverurl } = await (await upload).json()
  expect((await created).postDataJSON().coverurl).toBe(coverurl)
  const order = api.requests.filter(request => request.method === 'POST').map(request => request.path)
  expect(order.slice(0, 2)).toEqual([COVER, BOOKS])
  await expect(toast(page, `you have created book ${firstTitle} successfully!`)).toBeVisible()
  await expect(form).toBeVisible()
  await expect(form.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('')
  await expect(preview(form)).toHaveCount(0)

  // 7. a second book (no photo) &&& Add book > the window closes; both books show, the first with its cover
  await form.getByRole('textbox', { name: 'Title', exact: true }).fill(secondTitle)
  await form.getByLabel('Collection area (MRT station)').selectOption(station.id)
  await form.getByRole('button', { name: 'Add book', exact: true }).click()
  await expect(toast(page, `you have created book ${secondTitle} successfully!`)).toBeVisible()
  await expect(form).toBeHidden()
  await search(page, BOOKS, admin.tag)
  await expect(rows(page)).toHaveCount(2)
  await expect(row(page, firstTitle).locator('img')).toBeAttached()
  await expect(row(page, secondTitle).locator('img')).toHaveCount(0)

  // 9. types a title, then Esc > "Discard your changes?"; Keep editing keeps it, Discard closes
  const again = await openManualForm(page)
  await again.getByRole('textbox', { name: 'Title', exact: true }).fill('Not saved')
  await page.keyboard.press('Escape')
  const discard = confirmation(page, 'Discard your changes?')
  await expect(discard).toBeVisible()
  await discard.getByRole('button', { name: 'Keep editing' }).click()
  await expect(again.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('Not saved')
  await page.keyboard.press('Escape')
  //@ChitanyaBharathi > the first confirmation may still be fading out > use the newest one
  await confirmation(page, 'Discard your changes?').last().getByRole('button', { name: 'Discard' }).click()
  await expect(again).toBeHidden()

  // 10. opens it again &&& presses Esc without typing > closes without asking
  const untouched = await openManualForm(page)
  await page.keyboard.press('Escape')
  await expect(untouched).toBeHidden()
  await expect(confirmation(page, 'Discard your changes?')).toHaveCount(0)
})

// 8. 🔌 the book fails to save after its photo uploaded > error toast, the photo is removed again &&& their typing is kept
test('🔌 a failed save removes the uploaded photo and keeps the form', async ({ page, admin }) => {
  const station = await defaultStation(page.request)
  const title = taggedTitle(admin, 'Never Saved')
  await page.goto('/admin/books')
  const form = await openManualForm(page)
  await form.getByRole('textbox', { name: 'Title', exact: true }).fill(title)
  await form.getByLabel('Collection area (MRT station)').selectOption(station.id)
  await coverInput(form).setInputFiles(coverFiles.png)
  await expect(preview(form)).toBeVisible()

  await page.route(isApi(BOOKS), async route => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'error creating book' }) })
    }
    await route.continue()
  })
  const upload = page.waitForResponse(response => new URL(response.url()).pathname === COVER && response.request().method() === 'POST')
  const removed = page.waitForRequest(request => new URL(request.url()).pathname === COVER && request.method() === 'DELETE')
  await form.getByRole('button', { name: 'Add book', exact: true }).click()
  const { coverurl } = await (await upload).json()
  expect((await removed).postDataJSON()).toEqual({ coverurl })
  await expect(toast(page, 'error creating book')).toBeVisible()
  await expect(form).toBeVisible()
  await expect(form.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(title)
})
