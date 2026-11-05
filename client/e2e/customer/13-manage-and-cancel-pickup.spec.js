import { isApi, json, nextResponse, singaporeDate } from '../support/guest.js'
import { test, expect, adoptionRow, fakeApplication, fakeAppointment } from '../support/customer.js'

//@brod > journey 2.13 > customer reschedules, downloads calendar invite, and cancels a pickup
//@brod > uses mockCustomer fixture to avoid unnecessary DB account registrations
test('customer manages an existing pickup and cancels it', async ({ page, mockCustomer }) => {
  const tomorrow = singaporeDate(2)
  const app = fakeApplication('approved', {
    bookid: {
      id: '00000000-0000-4000-a000-000000000101',
      title: 'City Guide Book',
      authors: ['Explorer'],
      status: 'reserved',
      condition: 'Good',
      collectionarea: 'Jurong East MRT',
    },
  })
  let appointment = fakeAppointment('pending confirmation', {
    id: '00000000-0000-4000-c000-000000000202',
    bookid: app.bookid.id,
    booktitle: app.bookid.title,
    location: 'Jurong East MRT',
    appointmentdate: tomorrow,
    timeslot: '10:30–11:00',
  })

  await page.route(isApi('/applications'), json({ adoptionapplications: [app] }))
  await page.route(isApi('/appointments'), async route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ appointments: [appointment] }) })
    }
    await route.continue()
  })
  await page.route(isApi(`/appointments/${appointment.id}`), async route => {
    if (route.request().method() === 'PATCH') {
      const patch = route.request().postDataJSON()
      appointment = { ...appointment, ...patch, status: 'pending confirmation' }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ appointment }) })
    }
    if (route.request().method() === 'DELETE') {
      appointment = { ...appointment, status: 'cancelled' }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ cancelledids: [appointment.id] }) })
    }
    await route.continue()
  })

  // 1. opens a book in Waiting and clicks Edit pickup request
  await page.goto('/customer/adoption')
  await expect(page.getByRole('tab', { name: /Waiting\s+1/ })).toBeVisible()
  await adoptionRow(page, 'City Guide Book').click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Your pickup request' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Edit pickup request' }).click()
  await expect(dialog.getByRole('heading', { name: 'Edit pickup request' })).toBeVisible()
  await expect(dialog.getByLabel('Preferred pickup location')).toHaveValue('Jurong East MRT')

  // 2. submits without changing anything -> checks validation message
  await dialog.getByRole('button', { name: 'Review pickup request' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Change at least one pickup detail before sending an updated request.')

  // 3. updates location, reviews, and saves changes
  await dialog.getByLabel('Preferred pickup location').fill('Tampines MRT')
  await dialog.getByRole('button', { name: 'Review pickup request' }).click()
  await expect(dialog.getByRole('heading', { name: 'Review pickup request' })).toBeVisible()
  await expect(dialog.getByText('Tampines MRT')).toBeVisible()

  await dialog.getByRole('button', { name: 'Send pickup request' }).click()
  await expect(dialog.getByRole('heading', { name: 'Pickup request sent' })).toBeVisible()
  await expect(dialog.getByText('Tampines MRT')).toBeVisible()
  await dialog.getByRole('button', { name: 'Back to my adoptions' }).click()
  await expect(dialog).toBeHidden()
  await expect(adoptionRow(page, 'City Guide Book')).toContainText('Tampines MRT')

  // 7. opens dialog again, tests cancel confirmation flow
  await adoptionRow(page, 'City Guide Book').click()
  await expect(dialog.getByRole('heading', { name: 'Your pickup request' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancel pickup' }).click()

  const cancelSection = dialog.locator('section[aria-label="Confirm pickup cancellation"]')
  await expect(cancelSection).toBeVisible()
  await expect(cancelSection.getByRole('heading', { name: 'Cancel this pickup?' })).toBeVisible()

  // keep pickup returns without cancelling
  await cancelSection.getByRole('button', { name: 'Keep pickup' }).click()
  await expect(cancelSection).toBeHidden()

  // cancel confirmed
  await dialog.getByRole('button', { name: 'Cancel pickup' }).click()
  await cancelSection.getByRole('button', { name: 'Cancel pickup' }).click()

  await expect(dialog.getByRole('heading', { name: 'Pickup cancelled' })).toBeVisible()
  await expect(dialog.getByText('Your pickup has been cancelled. Your adoption is still approved.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Back to my adoptions' }).click()

  // 8. book moves back to Needs action with previous pickup attempt listed
  await expect(page.getByRole('tab', { name: /Needs action\s+1/ })).toBeVisible()
  const row = adoptionRow(page, 'City Guide Book')
  await expect(row).toContainText('Pickup cancelled')
  await row.click()
  await expect(dialog.getByRole('heading', { name: 'Arrange pickup' })).toBeVisible()
  //@brod > Back navigates from Arrange pickup to Adoption details where past attempts are listed
  await dialog.getByRole('button', { name: 'Back' }).click()
  await expect(dialog.getByRole('heading', { name: 'Adoption details' })).toBeVisible()
  const attempts = dialog.locator('details').filter({ hasText: 'Previous pickup attempts' })
  await attempts.locator('summary').click()
  await expect(attempts.getByText('Pickup cancelled')).toBeVisible()
  await expect(attempts.getByText('Tampines MRT')).toBeVisible()
})

//@brod > 🔌 tests confirmed pickup features: calendar download and change warning
test('confirmed pickup allows calendar download and shows change warning', async ({ page, customer }) => {
  const tomorrow = singaporeDate(2)
  const app = fakeApplication('approved', {
    bookid: {
      id: '00000000-0000-4000-a000-000000000102',
      title: 'Confirmed Journey Book',
      authors: ['Traveler'],
      status: 'reserved',
      condition: 'New',
      collectionarea: 'Bishan MRT',
    },
  })
  const appointment = fakeAppointment('appointment confirmed', {
    id: '00000000-0000-4000-c000-000000000203',
    bookid: app.bookid.id,
    booktitle: app.bookid.title,
    location: 'Bishan MRT',
    appointmentdate: tomorrow,
    timeslot: '10:30–11:00',
  })

  await page.route(isApi('/applications'), json({ adoptionapplications: [app] }))
  await page.route(isApi('/appointments'), json({ appointments: [appointment] }))

  // 4. opens My Adoptions -> Pickups tab
  await page.goto('/customer/adoption')
  await expect(page.getByRole('tab', { name: /Pickups\s+1/ })).toBeVisible()
  await page.getByRole('tab', { name: /Pickups\s+1/ }).click()
  await adoptionRow(page, 'Confirmed Journey Book').click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Pickup details' })).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Confirmed pickup' })).toBeVisible()

  // 5. clicks Add to calendar -> downloads .ics file
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Add to calendar' }).click(),
  ])
  expect(download.suggestedFilename()).toBe(`pickup-${appointment.id}.ics`)

  // 6. clicks Request a change -> review step shows current confirmation warning
  await dialog.getByRole('button', { name: 'Request a change' }).click()
  await expect(dialog.getByRole('heading', { name: 'Request a pickup change' })).toBeVisible()
  await dialog.getByLabel('Preferred time (SGT)').fill('14:00–15:00')
  await dialog.getByRole('button', { name: 'Review pickup request' }).click()

  await expect(dialog.getByRole('heading', { name: 'Review pickup request' })).toBeVisible()
  await expect(dialog.locator('section[aria-label="Current confirmed pickup"]')).toBeVisible()
  await expect(dialog.getByText('Sending these changes replaces your current confirmation')).toBeVisible()
})

//@brod > 🔌 9. tests admin declined pickup flow: surfaces in Needs action, shows declined attempt in history, allows re-proposing time
test('customer sees an admin-declined pickup under Needs action and can re-propose a time', async ({ page, mockCustomer }) => {
  const tomorrow = singaporeDate(2)
  const app = fakeApplication('approved', {
    bookid: {
      id: '00000000-0000-4000-a000-000000000103',
      title: 'Declined Journey Book',
      authors: ['Storyteller'],
      status: 'reserved',
      condition: 'Good',
      collectionarea: 'Woodlands MRT',
    },
  })
  const declinedAppointment = fakeAppointment('rejected', {
    id: '00000000-0000-4000-c000-000000000204',
    bookid: app.bookid.id,
    booktitle: app.bookid.title,
    location: 'Woodlands MRT',
    appointmentdate: tomorrow,
    timeslot: '10:30–11:00',
  })
  let appointments = [declinedAppointment]

  await page.route(isApi('/applications'), json({ adoptionapplications: [app] }))
  await page.route(isApi('/appointments'), async route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ appointments }) })
    }
    if (route.request().method() === 'POST') {
      const data = route.request().postDataJSON()
      const newAppointment = fakeAppointment('pending confirmation', {
        id: '00000000-0000-4000-c000-000000000205',
        bookid: app.bookid.id,
        booktitle: app.bookid.title,
        location: data.location,
        appointmentdate: data.appointmentdate,
        timeslot: data.timeslot,
      })
      appointments = [declinedAppointment, newAppointment]
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ appointment: newAppointment }) })
    }
    await route.continue()
  })

  // 9. opens My Adoptions -> book is in Needs action with status "Pickup declined"
  const response = nextResponse(page, '/applications')
  await page.goto('/customer/adoption')
  await response
  await expect(page.getByRole('tab', { name: /Needs action\s+1/ })).toBeVisible()
  const row = adoptionRow(page, 'Declined Journey Book')
  await expect(row).toBeVisible()
  await expect(row).toContainText('Pickup declined')

  // clicks row -> Arrange pickup opens directly
  await row.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Arrange pickup' })).toBeVisible()

  // clicking Back navigates to Adoption details where the declined attempt is recorded
  await dialog.getByRole('button', { name: 'Back' }).click()
  await expect(dialog.getByRole('heading', { name: 'Adoption details' })).toBeVisible()
  const attempts = dialog.locator('details').filter({ hasText: 'Previous pickup attempts' })
  await attempts.locator('summary').click()
  await expect(attempts.getByText('Pickup declined')).toBeVisible()
  await expect(attempts.getByText('Woodlands MRT')).toBeVisible()

  // clicks Arrange pickup to re-propose a new time
  await dialog.getByRole('button', { name: 'Arrange pickup' }).click()
  await expect(dialog.getByRole('heading', { name: 'Arrange pickup' })).toBeVisible()
  await dialog.getByLabel('Preferred pickup location').fill('Yishun MRT')
  await dialog.getByLabel('Preferred date').fill(tomorrow)
  await dialog.getByLabel('Preferred time (SGT)').fill('15:00–16:00')
  await dialog.getByRole('button', { name: 'Review pickup request' }).click()

  await expect(dialog.getByRole('heading', { name: 'Review pickup request' })).toBeVisible()
  await expect(dialog.getByText('Yishun MRT')).toBeVisible()
  await expect(dialog.getByText('15:00–16:00')).toBeVisible()

  // sends new pickup proposal -> receives confirmation receipt
  await dialog.getByRole('button', { name: 'Send pickup request' }).click()
  await expect(dialog.getByRole('heading', { name: 'Pickup request sent' })).toBeVisible()
  await expect(dialog.getByText('Pickup awaiting confirmation')).toBeVisible()
  await dialog.getByRole('button', { name: 'Back to my adoptions' }).click()
  await expect(dialog).toBeHidden()

  // book has moved from Needs action to Waiting
  await expect(page.getByRole('tab', { name: /Waiting\s+1/ })).toBeVisible()
  const updatedRow = adoptionRow(page, 'Declined Journey Book')
  await expect(updatedRow).toBeVisible()
  await expect(updatedRow).toContainText('Yishun MRT')
})
