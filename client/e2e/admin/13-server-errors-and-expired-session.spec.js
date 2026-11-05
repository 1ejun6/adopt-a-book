import { guestNavLinks, isApi, json, nextResponse, trackApiRequests } from '../support/guest.js'
import {
  test, expect, confirmation, createBook, createDrive, dialog, goTo, listMain, navLinks, pageCount, row, rowCheckbox, rows, search, seedAdoption, selectionButton, toast,
} from '../support/admin.js'

const down = { error: 'service unavailable' }
const isDetails = url => /^\/admin\/books\/[0-9a-f-]{36}$/.test(url.pathname)

//@ChitanyaBharathi > journey 3.13 > things go wrong &&& the admin recovers without reloading
test.describe('🔌 admin recovers when the server is down', () => {
  // 1. Book Inventory while /admin/books is down > toast with retry, no table \ page count; retry loads the books
  test('book inventory', async ({ page, admin }) => {
    await page.route(isApi('/admin/books'), json(down, 503))
    await page.goto('/admin/books')
    const failed = toast(page, 'service unavailable')
    await expect(failed).toBeVisible()
    await expect(listMain(page).locator('table')).toHaveCount(0)
    await expect(pageCount(page)).toHaveCount(0)

    await page.unroute(isApi('/admin/books'))
    const books = nextResponse(page, '/admin/books')
    await failed.getByRole('button', { name: 'retry' }).click()
    const { total } = await (await books).json()
    await expect(rows(page).first()).toBeVisible()
    await expect(pageCount(page)).toContainText(`of ${total} books`)
  })

  // 2. Applications, Appointments &&& Drives while their lists are down > the same toast + retry
  for (const [path, endpoint, heading] of [
    ['/admin/applications', '/admin/applications', 'Adoption applications'],
    ['/admin/appointments', '/admin/appointments', 'Appointments'],
    ['/admin/drives', '/admin/drives', 'Drives'],
  ]) {
    test(`${heading} list`, async ({ page, admin }) => {
      await page.route(isApi(endpoint), json(down, 503))
      await page.goto(path)
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
      const failed = toast(page, 'service unavailable')
      await expect(failed).toBeVisible()
      await expect(listMain(page).locator('table')).toHaveCount(0)

      await page.unroute(isApi(endpoint))
      const list = nextResponse(page, endpoint)
      await failed.getByRole('button', { name: 'retry' }).click()
      expect((await list).ok()).toBe(true)
      await expect(failed).toBeHidden()
      //@ChitanyaBharathi > the list is back > either rows ||| its empty message, depending on the data
      await expect(rows(page).first().or(listMain(page).getByRole('heading', { level: 2 }))).toBeVisible()
    })
  }

  // 3. a book's details fail to load > a toast &&& no window; clicking again asks again &&& opens it
  test('book details', async ({ page, admin }) => {
    const book = await createBook(admin, { title: 'Details Fail' })
    await page.goto('/admin/books')
    await search(page, '/admin/books', admin.tag)
    await page.route(isDetails, json(down, 503))
    await row(page, book.title).click()
    await expect(toast(page, 'service unavailable')).toBeVisible()
    await expect(dialog(page)).toHaveCount(0)

    await page.unroute(isDetails)
    await row(page, book.title).click()
    await expect(dialog(page).getByRole('heading', { name: 'Book details' })).toBeVisible()
  })

  // 4. Add Book \ Create drive while /locations/stations is down > a toast &&& no form; it opens once the server is back
  for (const [path, button, heading] of [['/admin/books', 'Add Book', 'Add book'], ['/admin/drives', 'Create drive', 'Create drive']]) {
    test(`${button} without stations`, async ({ page, admin }) => {
      await page.route(isApi('/locations/stations'), json(down, 503))
      await page.goto(path)
      await page.getByRole('button', { name: button }).click()
      await expect(toast(page, 'service unavailable')).toBeVisible()
      await expect(dialog(page)).toHaveCount(0)

      await page.unroute(isApi('/locations/stations'))
      await page.getByRole('button', { name: button }).click()
      await expect(dialog(page).getByRole('heading', { name: heading })).toBeVisible()
    })
  }

  // 5. a drive whose Available books fail to load > details still show, the list is hidden &&& retry loads it
  test('drive books', async ({ page, admin }) => {
    const drive = await createDrive(admin, { title: 'Books Fail' })
    await page.route(isApi('/books'), json(down, 503))
    await page.goto('/admin/drives')
    await search(page, '/admin/drives', admin.tag)
    await row(page, drive.title).click()
    const details = dialog(page)
    await expect(details.getByRole('heading', { name: drive.title })).toBeVisible()
    const failed = toast(page, 'service unavailable')
    await expect(failed).toBeVisible()
    const books = details.getByRole('region', { name: 'Available books at this MRT station' })
    await expect(books).toHaveCount(0)

    await page.unroute(isApi('/books'))
    await failed.getByRole('button', { name: 'retry' }).click()
    await expect(books).toBeVisible()
  })

  // 6. approving when PATCH …/status fails > "1 decision failed" with the reason &&& the request stays pending
  test('approving a request', async ({ page, admin }) => {
    const { customer } = await seedAdoption(admin, 'requested', { book: { title: 'Approve Fails' } })
    await page.route(url => url.pathname.endsWith('/status'), json({ error: 'error updating adoption application status' }, 500))
    await page.goto('/admin/applications')
    await search(page, '/admin/applications', admin.tag)
    await rowCheckbox(page, customer.email).click()
    await selectionButton(page, 'Approve').click()
    await confirmation(page, 'Approve application?').getByRole('button', { name: 'Approve' }).click()
    const failed = toast(page, '1 decision failed')
    await expect(failed).toBeVisible()
    await expect(failed).toContainText(`${customer.name}: error updating adoption application status`)
    await expect(row(page, customer.email).locator('[data-status="pending"]')).toBeVisible()
  })

  // 7. starts deleting a book, leaves the confirmation open &&& goes to another page > it disappears &&& no DELETE is sent
  test('leaving a delete confirmation open', async ({ page, admin }) => {
    const book = await createBook(admin, { title: 'Almost Deleted' })
    //@ChitanyaBharathi > the confirmation toast covers the navbar > leave with the browser's Back button instead (still an in-app navigation)
    await page.goto('/admin')
    await goTo(page, 'Book Inventory')
    await search(page, '/admin/books', admin.tag)
    const api = trackApiRequests(page)
    await rowCheckbox(page, book.title).click()
    await selectionButton(page, 'Delete').click()
    const ask = confirmation(page, 'Delete book?')
    await expect(ask).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
    await expect(ask).toHaveCount(0)
    expect(api.requests.filter(request => request.method === 'DELETE')).toHaveLength(0)
  })
})

// 8. their session expires &&& they go to another page > sent to Login with the guest navbar
test('admin whose session expires is sent to login', async ({ page, context, admin }) => {
  await page.goto('/admin/books')
  await expect(page.getByRole('heading', { name: 'Book Inventory', level: 1 })).toBeVisible()
  await context.clearCookies()
  await page.goto('/admin/applications')
  await expect(page).toHaveURL('/login')
  await expect(navLinks(page)).toHaveText(guestNavLinks)
})
