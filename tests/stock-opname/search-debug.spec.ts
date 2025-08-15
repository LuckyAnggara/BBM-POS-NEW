import { test, expect } from '@playwright/test'

test.describe('Product Search Debug', () => {
  test('debug product search rendering issue', async ({ page }) => {
    // Setup console logging
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()))
    page.on('response', (response) => {
      if (response.url().includes('/api/products')) {
        console.log('API RESPONSE:', response.status(), response.url())
      }
    })

    // Login
    await page.goto('http://localhost:9002/login')
    await page.waitForSelector('#email')
    await page.fill('#email', 'aa@gmail.com')
    await page.fill('#password', '123456')
    await page.click('button[type="submit"]')
    await page.waitForURL(/^(?!.*login).*$/)

    // Navigate to stock opname
    await page.goto('http://localhost:9002/stock-opname')
    await page.waitForLoadState('networkidle')

    // Find existing session
    const existingSessions = page.locator('tr').filter({ hasText: /DRAFT/ })
    const sessionCount = await existingSessions.count()

    if (sessionCount > 0) {
      await existingSessions.first().locator('a').first().click()
      await page.waitForLoadState('networkidle')

      console.log('✅ Navigated to detail page')

      // Open search popover
      const searchButton = page
        .locator('button:has-text("Cari produk")')
        .first()
      await searchButton.click()
      await page.waitForTimeout(500)

      // Check if popover opened
      const popover = page.locator('[role="dialog"], .popover')
      console.log('Popover visible:', await popover.isVisible())

      // Find and fill search input
      const searchInput = page.locator(
        'input[placeholder*="Ketik nama atau SKU"]'
      )
      console.log('Search input visible:', await searchInput.isVisible())

      if (await searchInput.isVisible()) {
        // Test search with 2+ characters
        await searchInput.fill('te')
        await page.waitForTimeout(1200) // Wait for debounce

        // Check network requests
        await page.waitForTimeout(2000)

        // Check command items
        const commandItems = page.locator('[cmdk-item]')
        const itemCount = await commandItems.count()
        console.log('Command items found:', itemCount)

        // Check if any results are visible
        const commandGroup = page.locator('[cmdk-group]')
        const groupCount = await commandGroup.count()
        console.log('Command groups found:', groupCount)

        // Check for any text content in the popover
        const popoverText = await popover.textContent()
        console.log('Popover content:', popoverText)

        // Try with a common word
        await searchInput.fill('')
        await page.waitForTimeout(200)
        await searchInput.fill('produk')
        await page.waitForTimeout(1200)

        // Wait for results
        await page.waitForTimeout(2000)

        const commandItems2 = page.locator('[cmdk-item]')
        const itemCount2 = await commandItems2.count()
        console.log('Command items found after "produk":', itemCount2)

        // Take screenshot for debugging
        await page.screenshot({ path: 'search-debug.png', fullPage: true })
        console.log('Screenshot saved: search-debug.png')
      }
    } else {
      console.log('No sessions found to test with')
    }
  })
})
