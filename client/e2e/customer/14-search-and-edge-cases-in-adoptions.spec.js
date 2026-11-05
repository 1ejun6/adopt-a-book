import { isApi, json, singaporeDate } from '../support/guest.js'
import { test, expect, adoptionRow, adoptionRows, fakeApplication, fakeAppointment } from '../support/customer.js'

//@brod > journey 2.14 > searching, pagination, deep-linking, and handling pickup warnings in My Adoptions
test.describe('my adoptions search, pagination, and deep-linking', () => {
  // 1. pagination across 12 active records
  test('customer paginates through active adoptions', async ({ page, customer }) => {
    const apps = Array.from({ length: 12 }, (_, i) => fakeApplication('pending', {
      bookid: {
        id: `00000000-0000-4000-a000-${String(i + 1).padStart(12, '0')}`,
        title: `Paging Book ${String(i + 1).padStart(2, '0')}`,
        authors: ['Author'],
      },
    }))

    await page.route(isApi('/applications'), json({ adoptionapplications: apps }))
    await page.route(isApi('/appointments'), json({ appointments: [] }))

    await page.goto('/customer/adoption?stage=all')
    await expect(page.getByRole('tab', { name: /Active\s+12/ })).toBeVisible()
    await expect(adoptionRows(page)).toHaveCount(10)
    await expect(page.getByText('Page 1 of 2')).toBeVisible()

    await page.getByLabel('Next page').click()
    await expect(page).toHaveURL(/page=2/)
    await expect(adoptionRows(page)).toHaveCount(2)
  })

  // 2 & 3. search and empty search recovery
  test('customer searches adoptions and clears search', async ({ page, customer }) => {
    const targetApp = fakeApplication('pending', {
      bookid: { id: '00000000-0000-4000-a000-000000000777', title: 'Special Target Book', authors: ['Target'] },
    })
    const otherApp = fakeApplication('pending', {
      bookid: { id: '00000000-0000-4000-a000-000000000888', title: 'Regular Book', authors: ['Other'] },
    })

    await page.route(isApi('/applications'), json({ adoptionapplications: [targetApp, otherApp] }))
    await page.route(isApi('/appointments'), json({ appointments: [] }))

    await page.goto('/customer/adoption')
    const searchInput = page.getByRole('searchbox', { name: 'Search all adoptions' })
    await searchInput.fill('Special Target')

    await expect(page).toHaveURL(/search=Special\+Target/)
    await expect(page.getByRole('heading', { name: 'Search results' })).toBeVisible()
    await expect(adoptionRow(page, 'Special Target Book')).toBeVisible()
    await expect(adoptionRow(page, 'Regular Book')).toBeHidden()

    // no match empty state
    await searchInput.fill('NonExistentTitleXYZ')
    await expect(page.getByText('No matching results')).toBeVisible()
    await expect(page.getByText('Try a different title, author or reference number.')).toBeVisible()

    // clear search restores list
    //@brod > exact: true distinguishes outline button from search input clear icon
    await page.getByRole('button', { name: 'Clear search', exact: true }).click()
    await expect(page).not.toHaveURL(/search=/)
    await expect(adoptionRow(page, 'Special Target Book')).toBeVisible()
    await expect(adoptionRow(page, 'Regular Book')).toBeVisible()
  })

  // 4 & 5. query deep-linking and missing record notice
  test('deep-links open matching dialogs and invalid id shows notice', async ({ page, customer }) => {
    const app = fakeApplication('pending', {
      id: '00000000-0000-4000-9000-000000000555',
      bookid: { id: '00000000-0000-4000-a000-000000000555', title: 'Linked Pending Book', authors: ['Author'] },
    })

    await page.route(isApi('/applications'), json({ adoptionapplications: [app] }))
    await page.route(isApi('/appointments'), json({ appointments: [] }))

    // 4. valid deep-link opens adoption dialog
    await page.goto(`/customer/adoption?request=${app.id}`)
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Adoption details' })).toBeVisible()
    await expect(dialog).toContainText('Linked Pending Book')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    // 5. invalid deep-link shows route notice
    await page.goto('/customer/adoption?request=non-existent-id-000')
    await expect(page.getByRole('status').filter({ hasText: 'That adoption or pickup could not be found' })).toBeVisible()
  })
})

//@brod > 🔌 tests edge cases: overdue pickups, unlinked records, and pickup API failures
test.describe('🔌 pickup edge cases and error states', () => {
  // 6. overdue, incomplete, and unlinked appointments
  test('overdue and unlinked pickup records surface appropriate warnings', async ({ page, customer }) => {
    const overdueApp = fakeApplication('approved', {
      bookid: {
        id: '00000000-0000-4000-a000-000000000401',
        title: 'Overdue Pickup Book',
        authors: ['Author'],
        status: 'reserved',
      },
    })
    const overdueAppointment = fakeAppointment('appointment confirmed', {
      id: '00000000-0000-4000-c000-000000000401',
      bookid: overdueApp.bookid.id,
      booktitle: overdueApp.bookid.title,
      appointmentdate: '2020-01-01',
      timeslot: '10:00–11:00',
    })

    const unlinkedAppointment = fakeAppointment('appointment confirmed', {
      id: '00000000-0000-4000-c000-000000000402',
      bookid: '00000000-0000-4000-a000-000000000999',
      booktitle: 'Unlinked Mystery Book',
      appointmentdate: singaporeDate(3),
      timeslot: '12:00–13:00',
    })

    await page.route(isApi('/applications'), json({ adoptionapplications: [overdueApp] }))
    await page.route(isApi('/appointments'), json({ appointments: [overdueAppointment, unlinkedAppointment] }))

    await page.goto('/customer/adoption')
    await expect(page.getByRole('tab', { name: /Needs action/ })).toBeVisible()

    // overdue warning
    const overdueRow = adoptionRow(page, 'Overdue Pickup Book')
    await expect(overdueRow).toBeVisible()
    //@brod > overdue warning is announced via aria-label when grouped under "Check these details"
    await expect(overdueRow).toHaveAttribute('aria-label', /Pickup date has passed/)

    // unlinked record warning
    const unlinkedRow = adoptionRow(page, 'Unlinked Mystery Book')
    await expect(unlinkedRow).toBeVisible()
    await expect(unlinkedRow).toContainText('Needs checking')
  })

  // 7. partial failure when /appointments is down
  test('pickup service failure displays retry banner and restores on retry', async ({ page, customer }) => {
    const app = fakeApplication('approved', {
      bookid: {
        id: '00000000-0000-4000-a000-000000000601',
        title: 'Approved Waiting Book',
        authors: ['Author'],
        status: 'reserved',
      },
    })

    await page.route(isApi('/applications'), json({ adoptionapplications: [app] }))
    await page.route(isApi('/appointments'), json({ error: 'appointments service down' }, 503))

    await page.goto('/customer/adoption')
    const banner = page.getByRole('alert').filter({ hasText: 'Pickup information is unavailable' })
    await expect(banner).toBeVisible()
    await expect(banner.getByRole('button', { name: 'Retry pickup information' })).toBeVisible()

    // unroute and retry restores normal status
    await page.unroute(isApi('/appointments'))
    await page.route(isApi('/appointments'), json({ appointments: [] }))
    await banner.getByRole('button', { name: 'Retry pickup information' }).click()

    await expect(banner).toHaveCount(0)
    await expect(adoptionRow(page, 'Approved Waiting Book')).toBeVisible()
  })
})
