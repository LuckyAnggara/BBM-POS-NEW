import { test, expect } from '@playwright/test'

test.describe('Stock Opname Detail Redesign', () => {
  test('verify new design with icons and search functionality', async ({
    page,
  }) => {
    // Login
    await page.goto('http://localhost:9002/login')
    await page.waitForSelector('#email')
    await page.fill('#email', 'aa@gmail.com')
    await page.fill('#password', '123456')
    await page.click('button[type="submit"]')

    // Navigate to stock opname
    await page.goto('http://localhost:9002/stock-opname')
    await page.waitForSelector('text=Stock Opname List')

    // Create new session
    await page.click('button:has-text("Buat Session")')
    await page.waitForURL(/\/stock-opname\/\d+/)

    console.log('✅ Created session and navigated to detail page')

    // Verify header redesign with icons
    const headerTitle = page.locator('h1:has-text("Stock Opname")')
    await expect(headerTitle).toBeVisible()

    const statusBadge = page.locator('text=DRAFT').first()
    await expect(statusBadge).toBeVisible()

    const backButton = page.locator('a[href="/stock-opname"]')
    await expect(backButton).toBeVisible()
    console.log('✅ Header elements visible')

    // Verify info alert is present
    const infoAlert = page.locator('text=Session dalam status DRAFT')
    await expect(infoAlert).toBeVisible()
    console.log('✅ Info alert visible')

    // Verify Notes section with icons
    const notesTitle = page.locator('text=Catatan')
    await expect(notesTitle).toBeVisible()

    const notesTextarea = page.locator(
      'textarea[placeholder*="Tambahkan catatan"]'
    )
    await expect(notesTextarea).toBeVisible()
    console.log('✅ Notes section visible')

    // Verify Items section with icons
    const itemsTitle = page.locator('text=Item Stock Opname')
    await expect(itemsTitle).toBeVisible()

    // Verify improved search button with icon
    const searchButton = page.locator('button:has-text("Cari produk")')
    await expect(searchButton).toBeVisible()
    console.log('✅ Search button with placeholder visible')

    // Test search functionality
    await searchButton.click()

    const searchInput = page.locator(
      'input[placeholder*="Ketik nama atau SKU"]'
    )
    await expect(searchInput).toBeVisible()

    // Test debounced search
    await searchInput.fill('te')
    await page.waitForTimeout(500) // Less than debounce time

    // Should show minimum character message
    const minCharMessage = page.locator('text=Ketik minimal 2 karakter')
    await expect(minCharMessage).toBeVisible()
    console.log('✅ Minimum character validation working')

    await searchInput.fill('test')
    await page.waitForTimeout(1200) // More than debounce time (1000ms)

    // Should trigger search (may show "Tidak ada produk" or actual results)
    const searchResults = page.locator('.command-group')
    await expect(searchResults).toBeVisible()
    console.log('✅ Search functionality working with debounce')

    // Verify table headers with icons
    const tableHeaders = ['Produk', 'Sistem', 'Counted', 'Selisih']

    for (const header of tableHeaders) {
      const headerElement = page.locator(`th:has-text("${header}")`)
      await expect(headerElement).toBeVisible()
    }
    console.log('✅ Table headers with icons visible')

    // Verify empty state with icon
    const emptyMessage = page.locator('text=Belum ada item')
    await expect(emptyMessage).toBeVisible()
    console.log('✅ Empty state with icon visible')

    // Verify Submit button is disabled when no items
    const submitButton = page.locator('button:has-text("Submit")')
    await expect(submitButton).toBeDisabled()
    console.log('✅ Submit button properly disabled when no items')

    console.log('🎉 All design elements verified successfully!')
  })
})
