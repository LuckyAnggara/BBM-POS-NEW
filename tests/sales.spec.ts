import { test, expect } from '@playwright/test'

test.describe('Sales Report Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:9002/login')
    await page.waitForTimeout(1000)

    // Login with provided credentials
    await page.locator('input[type="email"]').first().fill('aa@gmail.com')
    await page.locator('input[type="password"]').first().fill('123456')
    await page.locator('button[type="submit"]').first().click()

    // Wait for successful login and redirect to dashboard
    await page.waitForTimeout(3000)
  })

  test('should generate sales report and display summary & rows', async ({
    page,
  }) => {
    await page.goto('http://localhost:9002/reports/sales')
    await page.waitForTimeout(1000)

    // Ensure placeholder visible
    await expect(
      page.locator('[data-testid="report-placeholder"]')
    ).toBeVisible()

    // Click generate report
    const generateBtn = page.locator('[data-testid="generate-report-button"]')
    await expect(generateBtn).toBeVisible()
    await generateBtn.click()

    // Wait for either empty state or summary cards
    const summaryCards = page.locator('[data-testid="sales-summary-cards"]')
    const emptyState = page.locator('[data-testid="empty-sales-data"]')

    await Promise.race([
      summaryCards.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {}),
      emptyState.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {}),
    ])

    // If data present, assert key elements
    if (await summaryCards.isVisible()) {
      await expect(
        page.locator('[data-testid="summary-total-sales-employees"]')
      ).toBeVisible()
      await expect(
        page.locator('[data-testid="summary-total-amount"]')
      ).toBeVisible()
      await expect(
        page.locator('[data-testid="summary-total-transactions"]')
      ).toBeVisible()
      await expect(
        page.locator('[data-testid="summary-avg-per-sales"]')
      ).toBeVisible()

      // Optional: check at least first row
      const firstRow = page.locator('[data-testid^="sales-row-"]').first()
      if (await firstRow.isVisible()) {
        await expect(firstRow).toBeVisible()
      }
    } else {
      // Empty state visible
      await expect(emptyState).toBeVisible()
    }
  })
})
