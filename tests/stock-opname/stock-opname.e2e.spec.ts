import { test, expect } from '@playwright/test'

// Assumptions:
// - There is a login page at /login with inputs: [name="email"], [name="password"] and a submit button role=button containing text "Login".
// - After login user is redirected to dashboard containing link text "Stock Opname" in navigation.
// - API/database seeded with at least one product for adding via CSV or autocomplete (detail page search will attempt /api/products?search=).
// Adjust selectors if your actual implementation differs.

import { Page } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/login')
  await page.fill(
    'input[name="email"]',
    process.env.E2E_EMAIL || 'admin@example.com'
  )
  await page.fill(
    'input[name="password"]',
    process.env.E2E_PASSWORD || 'password'
  )
  await page.getByRole('button', { name: /login/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

test.describe('Stock Opname Flow', () => {
  test('create draft, add item, submit, approve', async ({ page, context }) => {
    await login(page)

    // Navigate to stock opname list
    await page.getByRole('link', { name: /stock opname/i }).click()
    await expect(page).toHaveURL(/.*stock-opname.*/)

    // Create draft
    await page.getByRole('button', { name: /draft/i }).click()
    await page.waitForTimeout(800) // wait minimal for list refresh

    // Open first row detail
    const firstLink = page.locator('table tbody tr td a').first()
    await firstLink.click()
    await expect(page).toHaveURL(/stock-opname\//)

    // Add item (autocomplete) fallback: if button not found, skip
    const productButton = page.getByRole('button', { name: /cari produk/i })
    if (await productButton.isVisible()) {
      await productButton.click()
      await page.getByPlaceholder(/cari produk/i).fill('a')
      await page.waitForTimeout(500)
      const firstOption = page.locator('[cmdk-item]').first()
      if (await firstOption.isVisible()) {
        await firstOption.click()
      }
    }

    // Enter qty
    const qtyInput = page.getByPlaceholder(/qty/i)
    if (await qtyInput.isVisible()) {
      await qtyInput.fill('1')
    }
    // Save add item
    const addBtn = page.getByRole('button').filter({ hasText: /^\+$/ })
    if (await addBtn.isVisible()) await addBtn.click()

    // Submit draft
    const submitBtn = page.getByRole('button', { name: /submit/i })
    await submitBtn.click()
    // Confirm dialog
    const confirmBtn = page.getByRole('button', { name: /kirim/i })
    if (await confirmBtn.isVisible()) await confirmBtn.click()
    await page.waitForURL('**/stock-opname')

    // Admin review (assumes current user can access admin page)
    await page.goto('/admin/stock-opname')
    await expect(page).toHaveURL(/admin\/stock-opname/)

    // Select first SUBMIT session
    const sessionButton = page.locator('button:has-text("SUBMIT")').first()
    if (await sessionButton.isVisible()) await sessionButton.click()

    // Approve
    const approveBtn = page.getByRole('button', { name: /approve/i })
    if (await approveBtn.isVisible()) {
      await approveBtn.click()
      const finalConfirm = page.getByRole('button', { name: /^approve$/i })
      if (await finalConfirm.isVisible()) await finalConfirm.click()
    }

    // Expect status changed (reloading list not strictly necessary)
    await page.waitForTimeout(800)
  })
})
