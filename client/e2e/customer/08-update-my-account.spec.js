import { toast } from '../support/guest.js'
import { test, expect, bookCards, logInThroughForm, registerCustomer } from '../support/customer.js'

const newPassword = 'e2e-New-Password-456'

//@ChitanyaBharathi > journey 2.8 > a fresh account so changing the email &&& password breaks nobody else
test('customer updates their name and password', async ({ page, customer }) => {
  const banner = page.getByRole('banner')
  const edit = page.getByRole('dialog', { name: 'Edit profile' })
  const save = edit.getByRole('button', { name: 'Save changes' })

  // 1. opens Account
  await page.goto('/customer/account')
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible()
  await expect(page.getByRole('heading', { name: customer.name, level: 2 })).toBeVisible()
  await expect(page.getByText('BR', { exact: true })).toBeVisible()
  await expect(page.getByText('reader account')).toBeVisible()
  await expect(page.getByText(customer.email)).toBeVisible()

  // 2. clicks Edit profile without changing anything
  await page.getByRole('button', { name: 'Edit profile' }).click()
  await expect(save).toBeDisabled()
  await expect(edit.getByText('No changes yet')).toBeVisible()

  // 3. changes their name &&& saves
  await edit.getByLabel('Full name').fill('Story Lover')
  await expect(edit.getByText('Changes ready to save')).toBeVisible()
  await save.click()
  await expect(toast(page, 'account details updated')).toBeVisible()
  await expect(edit).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Story Lover', level: 2 })).toBeVisible()
  await expect(page.getByText('SL', { exact: true })).toBeVisible()

  // 4. opens a book's Request a copy window
  await banner.getByRole('link', { name: 'Browse Books' }).click()
  await bookCards(page).first().click()
  await page.getByRole('dialog', { name: 'Book details' }).getByRole('button', { name: 'request', exact: true }).click()
  const request = page.getByRole('dialog', { name: 'Request a copy' })
  await expect(request.locator('dl')).toContainText('Story Lover')
  await page.keyboard.press('Escape')
  await expect(request).toBeHidden()

  // 5. opens Change password &&& types two different passwords
  await banner.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Edit profile' }).click()
  await edit.getByRole('button', { name: /Change password/ }).click()
  await edit.getByLabel('New password', { exact: true }).fill(newPassword)
  await edit.getByLabel('Confirm new password').fill('something-else-789')
  await edit.getByLabel('Confirm new password').blur()
  await expect(edit.getByText('Passwords do not match.')).toBeVisible()
  await expect(save).toBeDisabled()

  // 6. fixes the confirmation &&& saves
  await edit.getByLabel('Confirm new password').fill(newPassword)
  await expect(edit.getByText('Passwords do not match.')).toBeHidden()
  await save.click()
  await expect(toast(page, 'password updated')).toBeVisible()
  await expect(edit).toBeHidden()

  // 7. logs out &&& logs in with the old password (through the login form)
  await banner.getByRole('button', { name: 'Logout' }).click()
  await expect(page).toHaveURL('/login')
  await logInThroughForm(page, { email: customer.email, password: customer.password })
  await expect(page.locator('[data-sonner-toast][data-type="error"]')).toBeVisible()
  await expect(page).toHaveURL('/login')

  // 8. logs in with the new password (through the login form)
  await page.getByLabel('Password', { exact: true }).fill(newPassword)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL('/customer')

  // 9. changes their email to one another account already uses
  const other = await registerCustomer(page.request, 'Someone Else')
  await banner.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Edit profile' }).click()
  await edit.getByLabel('Email address').fill(other.email)
  await save.click()
  await expect(edit.getByRole('alert')).toContainText('email already exists')
  await expect(edit).toBeVisible()
  await expect(edit.getByLabel('Email address')).toHaveValue(other.email)

  // 10. presses Esc
  await page.keyboard.press('Escape')
  await expect(edit).toBeHidden()
  await expect(page.getByText(customer.email)).toBeVisible()
  await expect(page.getByText(other.email)).toBeHidden()
})
