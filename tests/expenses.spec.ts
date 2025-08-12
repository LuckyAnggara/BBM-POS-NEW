import { test, expect } from '@playwright/test'

// To run these tests, set TEST_USER_EMAIL and TEST_USER_PASSWORD in your environment.

test.describe('Expenses Summary Automation', () => {
  test('should display non-zero total expenses after login and filter', async ({
    page,
  }) => {
    // Go to login page
    await page.goto('/login')

    // Perform login
    await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL || '')
    await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD || '')
    await page.getByRole('button', { name: 'Login' }).click()
    // Wait for navigation to expenses page
    await page.waitForURL('**/expenses')

    // Ensure card is visible
    const totalCard = page.locator('div:has-text("Total Pengeluaran")')
    await expect(totalCard).toBeVisible()

    // Extract and parse total
    const totalText = await totalCard.locator('.text-2xl').textContent()
    const numeric = parseFloat((totalText || '0').replace(/[^0-9.-]+/g, ''))

    // Assert total is greater than zero
    expect(numeric).toBeGreaterThan(0)
  })
})
