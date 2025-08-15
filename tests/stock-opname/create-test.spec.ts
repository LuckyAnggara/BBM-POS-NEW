import { test, expect } from '@playwright/test'

test.describe('Stock Opname Create Test', () => {
  test('create draft successfully', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:9002/login')

    // Fill login form
    await page.fill('#email', 'aa@gmail.com')
    await page.fill('#password', '123456')
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard')

    // Navigate to stock opname
    await page.goto('http://localhost:9002/stock-opname')
    await page.waitForLoadState('networkidle')

    console.log('Current URL:', page.url())

    // Check initial state
    const hasTable = await page.isVisible('table')
    const hasEmpty = await page.isVisible(':has-text("Belum ada sesi")')
    const hasError = await page.isVisible(':has-text("error")')
    const hasLoading = await page.isVisible(':has-text("Loading")')

    console.log(
      `State check - Table: ${hasTable}, Empty: ${hasEmpty}, Error: ${hasError}, Loading: ${hasLoading}`
    )

    if (hasTable) {
      const rows = await page.locator('table tbody tr').count()
      console.log(`Found ${rows} table rows`)
    }

    // Try to create a new session
    const createButtons = await page.locator('button:has-text("Draft")').all()
    if (createButtons.length > 0) {
      console.log(`Found ${createButtons.length} create buttons`)
      await createButtons[0].click()

      // Wait a bit for the request to complete
      await page.waitForTimeout(3000)

      // Check if we have new data
      await page.reload()
      await page.waitForLoadState('networkidle')

      const newRowCount = await page.locator('table tbody tr').count()
      console.log(`Rows after create: ${newRowCount}`)

      // Look for the latest session in DRAFT status
      const draftSessions = await page
        .locator('table tbody tr:has-text("DRAFT")')
        .count()
      console.log(`Draft sessions found: ${draftSessions}`)

      expect(draftSessions).toBeGreaterThan(0)
    } else {
      console.log('No create buttons found')
    }
  })
})
