import { isApi, json, nextResponse, singaporeDate } from '../support/guest.js'
import { test, expect, adoptionRow, fakeApplication, fakeAppointment } from '../support/customer.js'

//@brod > journey 2.12 > a customer proposes a pickup location, date, and time for an approved book
//@brod > uses mockCustomer fixture to avoid unnecessary DB account registrations
test('customer arranges a pickup for an approved book', async ({ page, mockCustomer }) => {
  const approvedApp = fakeApplication('approved', {
    bookid: {
      id: '00000000-0000-4000-a000-000000000099',
      title: 'The Great Adventure',
      authors: ['Author One'],
      status: 'reserved',
      condition: 'Like New',
      collectionarea: 'Jurong East MRT',
    },
  })
  let appointments = []
  const futureDate = singaporeDate(5)

  await page.route(isApi('/applications'), json({ adoptionapplications: [approvedApp] }))
  await page.route(isApi('/appointments'), async route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ appointments }) })
    }
    if (route.request().method() === 'POST') {
      const data = route.request().postDataJSON()
      const newAppointment = fakeAppointment('pending confirmation', {
        id: '00000000-0000-4000-c000-000000000999',
        bookid: approvedApp.bookid.id,
        booktitle: approvedApp.bookid.title,
        location: data.location,
        appointmentdate: data.appointmentdate,
        timeslot: data.timeslot,
      })
      appointments = [newAppointment]
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ appointment: newAppointment }) })
    }
    await route.continue()
  })

  // 1. opens My Adoptions
  const appResponse = nextResponse(page, '/applications')
  await page.goto('/customer/adoption')
  await appResponse
  await expect(page.getByRole('tab', { name: /Active\s+1/ })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Needs action\s+1/ })).toBeVisible()
  const row = adoptionRow(page, 'The Great Adventure')
  await expect(row).toBeVisible()
  await expect(row).toContainText('Not scheduled')

  // 2. clicks the row
  await row.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Arrange pickup' })).toBeVisible()
  await expect(dialog.locator('.adoption-progress li.current')).toContainText('Pickup')
  await expect(dialog.getByLabel('Preferred pickup location')).toHaveValue('Jurong East MRT')

  // 3. clears location, enters past date, empty time, and reviews
  await dialog.getByLabel('Preferred pickup location').fill('')
  await dialog.getByLabel('Preferred date').fill('2020-01-01')
  await dialog.getByLabel('Preferred time (SGT)').fill('')
  await dialog.getByRole('button', { name: 'Review pickup request' }).click()

  const summary = dialog.getByRole('alert').filter({ hasText: 'Check your pickup details' })
  await expect(summary).toBeVisible()
  await expect(summary.getByRole('button', { name: 'Enter a preferred pickup location.' })).toBeVisible()
  await expect(summary.getByRole('button', { name: 'Choose today or a later date in Singapore time.' })).toBeVisible()
  await expect(summary.getByRole('button', { name: 'Enter a preferred time or time range.' })).toBeVisible()

  // clicking a summary error focuses the target input
  await summary.getByRole('button', { name: 'Enter a preferred pickup location.' }).click()
  await expect(dialog.getByLabel('Preferred pickup location')).toBeFocused()

  // 4. edits a field and tests unsaved-changes guard
  await dialog.getByLabel('Preferred pickup location').fill('Bishan MRT')
  await page.keyboard.press('Escape')
  await expect(dialog.getByRole('heading', { name: 'Leave without sending?' })).toBeVisible()
  await expect(dialog.getByText('Your pickup details haven’t been sent. Leaving now will discard your changes.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Keep editing' }).click()
  await expect(dialog.getByRole('heading', { name: 'Arrange pickup' })).toBeVisible()
  await expect(dialog.getByLabel('Preferred pickup location')).toHaveValue('Bishan MRT')

  // 5. fills valid details and proceeds to review
  await dialog.getByLabel('Preferred date').fill(futureDate)
  await dialog.getByLabel('Preferred time (SGT)').fill('10:30–11:00')
  await dialog.getByRole('button', { name: 'Review pickup request' }).click()

  await expect(dialog.getByRole('heading', { name: 'Review pickup request' })).toBeVisible()
  await expect(dialog.getByText('Not submitted yet')).toBeVisible()
  await expect(dialog.getByText('Bishan MRT')).toBeVisible()
  await expect(dialog.getByText('10:30–11:00')).toBeVisible()

  // 6. clicks Change next to time, updates it, and reviews again
  await dialog.getByRole('button', { name: 'Change time' }).click()
  await expect(dialog.getByRole('heading', { name: 'Arrange pickup' })).toBeVisible()
  //@brod > fill preferred time with updated slot
  await dialog.getByLabel('Preferred time (SGT)').fill('14:00–15:00')
  await dialog.getByRole('button', { name: 'Review pickup request' }).click()
  await expect(dialog.getByText('14:00–15:00')).toBeVisible()

  // 7. sends the pickup request
  await dialog.getByRole('button', { name: 'Send pickup request' }).click()
  await expect(dialog.getByRole('heading', { name: 'Pickup request sent' })).toBeVisible()
  await expect(dialog.getByText('Pickup awaiting confirmation')).toBeVisible()
  await expect(dialog.getByText('Bishan MRT')).toBeVisible()

  // 8. returns to My Adoptions
  await dialog.getByRole('button', { name: 'Back to my adoptions' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('tab', { name: /Waiting\s+1/ })).toBeVisible()
  const updatedRow = adoptionRow(page, 'The Great Adventure')
  await expect(updatedRow).toBeVisible()
  await expect(updatedRow).toContainText('Bishan MRT')
  await expect(updatedRow).toContainText('14:00–15:00')
})
