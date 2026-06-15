import { test, expect } from '@playwright/test'

/**
 * E2E: Gestión Submission Flow
 *
 * These tests verify the gestión (management) submission workflow:
 * 1. Login
 * 2. Click a client row in the table
 * 3. Fill the gestión form (tipo, efecto, nota)
 * 4. Submit and verify toast + modal closes
 *
 * Note: All tests are marked .skip because they require:
 * - Real Supabase credentials
 * - Test data (clients in the cartera)
 *
 * Run with: TEST_EMAIL=xxx TEST_PASSWORD=xxx npx playwright test gestion.spec.ts
 */

test.describe('Gestión Submission', () => {
  // Helper to login
  async function login(
    page: import('@playwright/test').Page,
    email: string,
    password: string
  ) {
    await page.goto('/')
    await page.getByPlaceholder('nombre.apellido@segal.cl').fill(email)
    await page.locator('input[type="password"]').fill(password)
    await page.getByRole('button', { name: 'Ingresar a la cascada' }).click()

    // Wait for dashboard
    await expect(page.locator('header')).toBeVisible({ timeout: 10000 })
  }

  // Skip: requires real Supabase and test data
  test.skip('should open client modal on row click', async ({ page }) => {
    const email = process.env.TEST_EMAIL
    const password = process.env.TEST_PASSWORD

    if (!email || !password) {
      test.skip(true, 'TEST_EMAIL and TEST_PASSWORD required')
      return
    }

    await login(page, email, password)

    // Wait for table to load
    await expect(page.getByText('Cartera priorizada')).toBeVisible({ timeout: 10000 })

    // Click first row in the table (skip header)
    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()

    // Modal should open
    await expect(page.getByText('Nueva gestion')).toBeVisible({ timeout: 5000 })
  })

  // Skip: requires real Supabase
  test.skip('should submit gestión and show toast', async ({ page }) => {
    const email = process.env.TEST_EMAIL
    const password = process.env.TEST_PASSWORD

    if (!email || !password) {
      test.skip(true, 'TEST_EMAIL and TEST_PASSWORD required')
      return
    }

    await login(page, email, password)

    // Wait for table to load
    await expect(page.getByText('Cartera priorizada')).toBeVisible({ timeout: 10000 })

    // Click first row
    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()

    // Wait for modal
    await expect(page.getByText('Nueva gestion')).toBeVisible({ timeout: 5000 })

    // Select tipo (default is 'llamada', change to WhatsApp)
    await page.locator('select').first().selectOption('whatsapp')

    // Select efecto
    await page.locator('select').nth(1).selectOption('no_contesta')

    // Fill nota (optional)
    await page.getByPlaceholder('Anota lo que conversaste').fill('Test E2E nota')

    // Submit
    await page.getByRole('button', { name: 'Registrar gestion' }).click()

    // Verify toast appears
    await expect(page.getByRole('alert')).toContainText('Gestion registrada', {
      timeout: 10000,
    })

    // Modal should close
    await expect(page.getByText('Nueva gestion')).not.toBeVisible({ timeout: 5000 })
  })

  // Skip: requires real Supabase
  test.skip('should validate efecto selection before submit', async ({ page }) => {
    const email = process.env.TEST_EMAIL
    const password = process.env.TEST_PASSWORD

    if (!email || !password) {
      test.skip(true, 'TEST_EMAIL and TEST_PASSWORD required')
      return
    }

    await login(page, email, password)

    // Wait for table and click first row
    await expect(page.getByText('Cartera priorizada')).toBeVisible({ timeout: 10000 })
    await page.locator('table tbody tr').first().click()

    // Wait for modal
    await expect(page.getByText('Nueva gestion')).toBeVisible({ timeout: 5000 })

    // Try to submit without selecting efecto
    await page.getByRole('button', { name: 'Registrar gestion' }).click()

    // Should show error toast
    await expect(page.getByRole('alert')).toContainText('Selecciona un efecto', {
      timeout: 5000,
    })
  })

  // Skip: requires real Supabase
  test.skip('should close modal with Escape key', async ({ page }) => {
    const email = process.env.TEST_EMAIL
    const password = process.env.TEST_PASSWORD

    if (!email || !password) {
      test.skip(true, 'TEST_EMAIL and TEST_PASSWORD required')
      return
    }

    await login(page, email, password)

    // Wait for table and click first row
    await expect(page.getByText('Cartera priorizada')).toBeVisible({ timeout: 10000 })
    await page.locator('table tbody tr').first().click()

    // Wait for modal
    await expect(page.getByText('Nueva gestion')).toBeVisible({ timeout: 5000 })

    // Press Escape
    await page.keyboard.press('Escape')

    // Modal should close
    await expect(page.getByText('Nueva gestion')).not.toBeVisible({ timeout: 3000 })
  })
})
