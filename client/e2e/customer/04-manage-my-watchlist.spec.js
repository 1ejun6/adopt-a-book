import { toast } from '../support/guest.js'
import { test, expect, availableBooks, bookCard, bookCards, callApi } from '../support/customer.js'

//@ChitanyaBharathi > journey 2.4 > a customer looks after the books they saved
test('customer edits notes and empties their watchlist', async ({ page, customer }) => {
  //@ChitanyaBharathi > setup > save 3 books through the api, one with a note
  const [noted, plain, last] = await availableBooks(page.request, 3)
  await callApi(page.request, 'POST', '/watchlist', { bookid: noted.id, comments: 'pick up before the drive' })
  await callApi(page.request, 'POST', '/watchlist', { bookid: plain.id, comments: '' })
  await callApi(page.request, 'POST', '/watchlist', { bookid: last.id, comments: '' })
  const dialog = page.getByRole('dialog', { name: 'Book details' })

  // 1. opens Watchlist
  await page.goto('/customer/watchlist')
  await expect(page.getByText('3 saved books')).toBeVisible()
  await expect(bookCards(page)).toHaveCount(3)
  for (const book of [noted, plain, last]) {
    const card = bookCard(page, book.title)
    await expect(card).toBeVisible()
    const collection = book.collectionarea || book.mrtstation?.name
    if (collection) { await expect(card).toContainText(`collection: ${collection}`) }
  }

  // 2. clicks the card with a note, then one without
  await bookCard(page, noted.title).click()
  await expect(dialog.getByRole('heading', { name: 'Your private note' })).toBeVisible()
  await expect(dialog).toContainText('pick up before the drive')
  await page.keyboard.press('Escape')
  await bookCard(page, plain.title).click()
  await expect(dialog).toContainText('no note added yet')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  // 3. clicks Edit note, changes the text &&& saves
  await bookCard(page, noted.title).click()
  await dialog.getByRole('button', { name: 'Edit note' }).click()
  const editor = page.locator('[data-sonner-toast]').filter({ hasText: 'edit your note' })
  const note = editor.getByPlaceholder('optional comment')
  await expect(note).toHaveValue('pick up before the drive')
  await note.fill('ask if the cover is torn')
  await editor.getByRole('button', { name: 'save' }).click()
  await expect(toast(page, 'comment saved')).toBeVisible()
  await expect(dialog).toContainText('ask if the cover is torn')

  // 4. reloads the page &&& opens the same book
  await page.reload()
  await bookCard(page, noted.title).click()
  await expect(dialog).toContainText('ask if the cover is torn')

  // 5. removes it from inside the window
  await dialog.getByRole('button', { name: 'Remove from watchlist' }).click()
  await expect(toast(page, 'removed from watchlist')).toBeVisible()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('2 saved books')).toBeVisible()

  // 6. removes one from its card
  await bookCard(page, plain.title).getByRole('button', { name: 'Remove from watchlist' }).click()
  await expect(bookCard(page, plain.title)).toBeHidden()
  await expect(page.getByText('1 saved book', { exact: true })).toBeVisible()

  // 7. removes the last book
  await bookCard(page, last.title).getByRole('button', { name: 'Remove from watchlist' }).click()
  await expect(page.getByRole('heading', { name: 'Your shelf is waiting' })).toBeVisible()

  // 8. clicks Browse books
  await page.getByRole('main').getByRole('link', { name: 'Browse books' }).click()
  await expect(page).toHaveURL('/customer/books')
})
