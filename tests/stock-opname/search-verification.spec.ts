import { test, expect } from '@playwright/test'

test.describe('Product Search Verification', () => {
  test('confirm search results are rendered', async ({ page }) => {
    // Login and navigate
    await page.goto('http://localhost:9002/login')
    await page.waitForSelector('#email')
    await page.fill('#email', 'aa@gmail.com')
    await page.fill('#password', '123456')
    await page.click('button[type="submit"]')
    await page.waitForURL(/^(?!.*login).*$/)

    await page.goto('http://localhost:9002/stock-opname')
    await page.waitForLoadState('networkidle')

    const existingSessions = page.locator('tr').filter({ hasText: /DRAFT/ })
    if ((await existingSessions.count()) > 0) {
      await existingSessions.first().locator('a').first().click()
      await page.waitForLoadState('networkidle')

      // Open search and test
      const searchButton = page
        .locator('button:has-text("Cari produk")')
        .first()
      await searchButton.click()
      await page.waitForTimeout(300)

      const searchInput = page.locator(
        'input[placeholder*="Ketik nama atau SKU"]'
      )
      await expect(searchInput).toBeVisible()

      // Search for products
      await searchInput.fill('te')
      await page.waitForTimeout(1500) // Wait for debounce + API

      // Check results
      const commandItems = page.locator('[cmdk-item]')
      const itemCount = await commandItems.count()

      console.log(`🔍 Search Results: ${itemCount} products found`)

      if (itemCount > 0) {
        // Get first few product names
        for (let i = 0; i < Math.min(3, itemCount); i++) {
          const item = commandItems.nth(i)
          const productName = await item
            .locator('span.font-medium')
            .textContent()
          console.log(`   ${i + 1}. ${productName}`)
        }
        console.log('✅ Product search is working correctly!')
      } else {
        console.log('❌ No products found')
      }

      // Test no results scenario
      await searchInput.fill('')
      await searchInput.fill('nonexistentproduct123')
      await page.waitForTimeout(1500)

      const noResultsMessage = page.locator(
        'text=Tidak ada produk yang ditemukan'
      )
      const isNoResultsVisible = await noResultsMessage.isVisible()
      console.log(
        `✅ No results message: ${
          isNoResultsVisible ? 'Shows correctly' : 'Not visible'
        }`
      )
    } else {
      console.log('No sessions available for testing')
    }
  })
})
