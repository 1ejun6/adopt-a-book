import { toast } from '../support/guest.js'
import { test, expect, bookCards, logInThroughForm, registerCustomer } from '../support/customer.js'

const newPassword = 'e2e-New-Password-456'

//@ChitanyaBharathi > journey 2.8 > a fresh account so changing the email &&& password breaks nobody else
test('customer updates their name and password', async ({ page, customer }) => {
  const banner = page.getByRole('banner')

  // 1. opens Account
  await page.goto('/customer/account')
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible()
  const aside = page.locator('aside.account-rail')
  await expect(aside.locator('.identity-name')).toHaveText(customer.name)
  await expect(aside.locator('.avatar')).toHaveText('BR')
  await expect(aside.locator('.identity-email')).toHaveText(customer.email)

  // 2. checks Profile details tab before editing
  const profilePanel = page.locator('#profile-panel')
  const saveProfileButton = profilePanel.getByRole('button', { name: 'Update' })
  await expect(saveProfileButton).toBeDisabled()
  await expect(profilePanel.getByText('No unsaved changes')).toBeVisible()

  // 3. types invalid email and blurs
  const emailInput = profilePanel.getByLabel('Email address')
  await emailInput.fill('invalid-email-format')
  await emailInput.blur()
  await expect(profilePanel.getByText('Enter a valid email address.')).toBeVisible()
  //@brod > empty field disables update button
  await emailInput.fill('')
  await expect(saveProfileButton).toBeDisabled()

  // 4. restores email, changes name &&& saves
  await emailInput.fill(customer.email)
  await profilePanel.getByLabel('Full name').fill('Story Lover')
  await expect(profilePanel.getByText('You have unsaved changes')).toBeVisible()
  await saveProfileButton.click()
  await expect(toast(page, 'Profile saved')).toBeVisible()
  await expect(aside.locator('.identity-name')).toHaveText('Story Lover')
  await expect(aside.locator('.avatar')).toHaveText('SL')

  // 5. opens a book's Request this book window
  await banner.getByRole('link', { name: 'Browse Books' }).click()
  await bookCards(page).first().click()
  const bookDialog = page.getByRole('dialog', { name: 'Book details' })
  await bookDialog.getByRole('button', { name: 'Request this book' }).click()
  const request = page.getByRole('dialog', { name: 'Request this book' })
  await expect(request.locator('section[aria-label="Requesting as"]')).toContainText('Story Lover')
  await page.keyboard.press('Escape')
  await expect(request).toBeHidden()

  // 6. switches to Password tab &&& types mismatched passwords
  await banner.getByRole('link', { name: 'Account' }).click()
  await page.locator('#password-tab').click()
  const passwordPanel = page.locator('#password-panel')
  const savePasswordButton = passwordPanel.getByRole('button', { name: 'Update' })
  await passwordPanel.getByLabel('New password', { exact: true }).fill(newPassword)
  const confirmInput = passwordPanel.getByLabel('Confirm new password')
  await confirmInput.fill('something-else-789')
  await confirmInput.blur()
  await expect(passwordPanel.getByText('Passwords don’t match.')).toBeVisible()
  await expect(savePasswordButton).toBeDisabled()

  // 7. fixes the confirmation &&& saves
  await confirmInput.fill(newPassword)
  await expect(passwordPanel.getByText('Passwords match.')).toBeVisible()
  await savePasswordButton.click()
  await expect(toast(page, 'Password updated')).toBeVisible()

  // 8. logs out &&& logs in with the old password (through the login form)
  await banner.getByRole('button', { name: 'Logout' }).click()
  await expect(page).toHaveURL('/login')
  await logInThroughForm(page, { email: customer.email, password: customer.password })
  await expect(page.locator('[data-sonner-toast][data-type="error"]')).toBeVisible()
  await expect(page).toHaveURL('/login')

  // 9. logs in with the new password (through the login form)
  await page.getByLabel('Password', { exact: true }).fill(newPassword)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL('/customer')

  // 10. changes their email to one another account already uses
  const other = await registerCustomer(page.request, 'Someone Else')
  await banner.getByRole('link', { name: 'Account' }).click()
  const editEmailInput = page.locator('#profile-panel').getByLabel('Email address')
  await editEmailInput.fill(other.email)
  await page.locator('#profile-panel').getByRole('button', { name: 'Update' }).click()
  await expect(page.locator('#profile-panel').getByRole('alert')).toContainText(/user already exists|email already exists/)

  // reload keeps original details
  await page.reload()
  await expect(page.locator('aside.account-rail .identity-email')).toHaveText(customer.email)
})
