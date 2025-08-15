import { test, expect } from '@playwright/test'

test.describe('Product Search Fixed', () => {
  test('verify product search works correctly', async ({ page }) => {
    // Login
    await page.goto('http://localhost:9002/login')
    await page.waitForSelector('#email')
    await page.fill('#email', 'aa@gmail.com')
    await page.fill('#password', '123456')
    await page.click('button[type="submit"]')
    await page.waitForURL(/^(?!.*login).*$/)

    // Navigate to stock opname detail
    await page.goto('http://localhost:9002/stock-opname')
    await page.waitForLoadState('networkidle')

    const existingSessions = page.locator('tr').filter({ hasText: /DRAFT/ })
    if ((await existingSessions.count()) > 0) {
      await existingSessions.first().locator('a').first().click()
      await page.waitForLoadState('networkidle')

      console.log('✅ Navigated to detail page')

      // Test search functionality
      const searchButton = page
        .locator('button:has-text("Cari produk")')
        .first()
      await searchButton.click()
      await page.waitForTimeout(500)

      const searchInput = page.locator(
        'input[placeholder*="Ketik nama atau SKU"]'
      )
      await expect(searchInput).toBeVisible()

      // Test minimum character validation
      await searchInput.fill('a')
      await page.waitForTimeout(500)
      const minCharMessage = page.locator('text=Ketik minimal 2 karakter')
      await expect(minCharMessage).toBeVisible()
      console.log('✅ Minimum character validation works')

      // Test actual search
      await searchInput.fill('te')
      await page.waitForTimeout(1200) // Wait for debounce

      // Wait for results to load
      await page.waitForTimeout(2000)

      // Check if results are displayed
      const commandItems = page.locator('[cmdk-item]')
      const itemCount = await commandItems.count()
      console.log(`✅ Found ${itemCount} search results`)

      if (itemCount > 0) {
        // Test selecting a product
        const firstItem = commandItems.first()
        await firstItem.click()

        // Check if search popover closed and product is selected
        const selectedProductButton = page
          .locator('button:has-text("Cari produk")')
          .first()
        await page.waitForTimeout(500)

        const buttonText = await selectedProductButton.textContent()
        console.log(`✅ Product selected: ${buttonText}`)

        // Verify the button text changed (no longer shows "Cari produk...")
        expect(buttonText).not.toContain('Cari produk...')
      }

      // Test search with no results
      await searchButton.click()
      await page.waitForTimeout(300)
      await searchInput.fill('')
      await searchInput.fill('zzzzzznonexistent')
      await page.waitForTimeout(1200)
      await page.waitForTimeout(2000)

      const noResultsMessage = page.locator(
        'text=Tidak ada produk yang ditemukan'
      )
      await expect(noResultsMessage).toBeVisible()
      console.log('✅ No results message displays correctly')

      console.log('🎉 Product search functionality working perfectly!')
    } else {
      console.log('No DRAFT sessions available for testing')
    }
  })
})
