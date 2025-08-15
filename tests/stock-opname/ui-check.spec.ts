import { test, expect } from '@playwright/test'

test.describe('Stock Opname Detail UI', () => {
  test('check redesigned UI elements', async ({ page }) => {
    // Navigate directly to login
    await page.goto('http://localhost:9002/login')
    await page.waitForLoadState('networkidle')

    console.log('🔹 Current URL:', page.url())

    // Check if already logged in or need to login
    const currentUrl = page.url()
    if (currentUrl.includes('login')) {
      console.log('🔹 Need to login')

      // Wait for email field and login
      await page.waitForSelector('#email', { timeout: 10000 })
      await page.fill('#email', 'aa@gmail.com')
      await page.fill('#password', '123456')
      await page.click('button[type="submit"]')

      // Wait for redirect
      await page.waitForURL(/^(?!.*login).*$/, { timeout: 10000 })
      console.log('✅ Logged in successfully')
    }

    // Navigate to stock opname list
    await page.goto('http://localhost:9002/stock-opname')
    await page.waitForLoadState('networkidle')

    console.log('🔹 Stock Opname Page URL:', page.url())

    // Take a screenshot to see the current state
    await page.screenshot({ path: 'stock-opname-list.png', fullPage: true })
    console.log('📸 Screenshot saved: stock-opname-list.png')

    // Try to find any existing session or create one
    const existingSessions = page
      .locator('tr')
      .filter({ hasText: /DRAFT|SUBMIT/ })
    const sessionCount = await existingSessions.count()

    console.log(`📊 Found ${sessionCount} existing sessions`)

    if (sessionCount > 0) {
      // Click on first session
      const firstSessionLink = existingSessions.first().locator('a').first()
      await firstSessionLink.click()
      await page.waitForLoadState('networkidle')

      console.log('✅ Navigated to existing session detail')
    } else {
      // Try to create new session
      const createButton = page.locator('button:has-text("Buat Session")')
      if (await createButton.isVisible({ timeout: 5000 })) {
        await createButton.click()
        await page.waitForLoadState('networkidle')
        console.log('✅ Created new session')
      } else {
        console.log('⚠️ No create button found')
        return
      }
    }

    // Now we should be on detail page - take screenshot
    await page.screenshot({ path: 'stock-opname-detail.png', fullPage: true })
    console.log('📸 Screenshot saved: stock-opname-detail.png')

    // Check for redesigned elements
    const redesignElements = [
      { name: 'Header Title', selector: 'h1:has-text("Stock Opname")' },
      { name: 'Status Badge', selector: '[class*="badge"], .badge' },
      { name: 'Back Button', selector: 'a[href="/stock-opname"]' },
      { name: 'Notes Section', selector: 'text=Catatan' },
      { name: 'Items Section', selector: 'text=Item Stock Opname' },
      { name: 'Search Button', selector: 'button:has-text("Cari produk")' },
    ]

    for (const element of redesignElements) {
      const isVisible = await page
        .locator(element.selector)
        .isVisible({ timeout: 2000 })
      console.log(
        `${isVisible ? '✅' : '❌'} ${element.name}: ${
          isVisible ? 'Visible' : 'Not found'
        }`
      )
    }

    // Check for icons - look for any SVG elements which indicate icons are present
    const iconCount = await page.locator('svg').count()
    console.log(`🎨 Found ${iconCount} icons (SVG elements)`)

    // Check for search functionality
    const searchButton = page.locator('button:has-text("Cari produk")')
    if (await searchButton.isVisible({ timeout: 2000 })) {
      await searchButton.click()
      await page.waitForTimeout(500)

      const searchInput = page.locator(
        'input[placeholder*="Ketik"], input[placeholder*="Cari"]'
      )
      if (await searchInput.isVisible({ timeout: 2000 })) {
        console.log('✅ Search popover opens successfully')

        // Test typing
        await searchInput.fill('test')
        await page.waitForTimeout(500)
        console.log('✅ Search input works')
      } else {
        console.log('❌ Search input not found')
      }
    }

    console.log('🎉 UI check completed!')
  })
})
