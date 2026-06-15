import { test, expect } from '@playwright/test'

/**
 * E2E: Login Flow
 *
 * These tests verify the login screen renders correctly and
 * the authentication flow works with valid credentials.
 *
 * Note: Tests that require real Supabase auth are marked .skip
 * Run with real credentials: TEST_EMAIL=xxx TEST_PASSWORD=xxx npx playwright test
 */

test.describe('Login Flow', () => {
  test('should render login screen', async ({ page }) => {
    await page.goto('/')

    // Verify login screen elements
    await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible()
    await expect(page.getByPlaceholder('nombre.apellido@segal.cl')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ingresar a la cascada' })).toBeVisible()
  })

  test('should show password toggle', async ({ page }) => {
    await page.goto('/')

    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()

    // Click show button
    await page.getByRole('button', { name: 'Mostrar' }).click()

    // Password should now be visible (type=text)
    await expect(page.locator('input[type="text"][autocomplete="current-password"]')).toBeVisible()

    // Click hide button
    await page.getByRole('button', { name: 'Ocultar' }).click()

    // Back to password type
    await expect(passwordInput).toBeVisible()
  })

  test('should require email and password', async ({ page }) => {
    await page.goto('/')

    const submitButton = page.getByRole('button', { name: 'Ingresar a la cascada' })

    // Click submit without filling form
    await submitButton.click()

    // Browser validation should prevent submission (required fields)
    // Email field should be invalid
    const emailInput = page.getByPlaceholder('nombre.apellido@segal.cl')
    const isEmailInvalid = await emailInput.evaluate(
      (el) => !(el as HTMLInputElement).checkValidity()
    )
    expect(isEmailInvalid).toBe(true)
  })

  // Skip: requires real Supabase credentials
  test.skip('should login with valid credentials and show dashboard', async ({ page }) => {
    const email = process.env.TEST_EMAIL
    const password = process.env.TEST_PASSWORD

    if (!email || !password) {
      test.skip(true, 'TEST_EMAIL and TEST_PASSWORD required')
      return
    }

    await page.goto('/')

    // Fill login form
    await page.getByPlaceholder('nombre.apellido@segal.cl').fill(email)
    await page.locator('input[type="password"]').fill(password)

    // Submit
    await page.getByRole('button', { name: 'Ingresar a la cascada' }).click()

    // Wait for dashboard to load
    await expect(page.locator('header')).toBeVisible({ timeout: 10000 })

    // Verify TopBar shows user name
    await expect(page.getByText(/Cartera/)).toBeVisible()

    // Verify we're on the dashboard (breadcrumb visible)
    await expect(page.getByText(/Mi cartera|Equipo completo/)).toBeVisible()
  })

  // Skip: requires real Supabase
  test.skip('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/')

    // Fill with invalid credentials
    await page.getByPlaceholder('nombre.apellido@segal.cl').fill('invalid@test.com')
    await page.locator('input[type="password"]').fill('wrongpassword')

    // Submit
    await page.getByRole('button', { name: 'Ingresar a la cascada' }).click()

    // Should show error message
    await expect(page.getByText(/Invalid|Error|Credenciales/i)).toBeVisible({ timeout: 5000 })
  })
})
