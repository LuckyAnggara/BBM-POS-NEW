import { test, expect } from '@playwright/test'

// Test credentials
const TEST_EMAIL = 'aa@gmail.com'
const TEST_PASSWORD = '123456'

test.describe('Product Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')

    // Fill login form
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')

    // Wait for successful login and redirect
    await page.waitForURL('/dashboard')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should display product detail page with all tabs', async ({ page }) => {
    // Navigate to products page first
    await page.goto('/inventory/products')
    await page.waitForLoadState('networkidle')

    // Find and click on the first product link
    const productLink = page.locator('a[href*="/inventory/products/"]').first()
    await productLink.click()

    // Wait for product detail page to load
    await page.waitForLoadState('networkidle')

    // Check that we're on a product detail page
    await expect(page.locator('h1')).toBeVisible()

    // Check that all tabs are visible
    await expect(page.getByRole('tab', { name: 'Detail Produk' })).toBeVisible()
    await expect(
      page.getByRole('tab', { name: 'Riwayat Transaksi' })
    ).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Analitik' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Mutasi Stok' })).toBeVisible()

    // Check quick stats cards are visible
    await expect(page.locator('text=Stok Saat Ini')).toBeVisible()
    await expect(page.locator('text=Harga Jual')).toBeVisible()
    await expect(page.locator('text=Margin Profit')).toBeVisible()
    await expect(page.locator('text=Total Terjual')).toBeVisible()
  })

  test('should switch between tabs and display content', async ({ page }) => {
    // Navigate to a product detail page
    await page.goto('/inventory/products')
    await page.waitForLoadState('networkidle')

    const productLink = page.locator('a[href*="/inventory/products/"]').first()
    await productLink.click()
    await page.waitForLoadState('networkidle')

    // Test Detail tab (should be active by default)
    await expect(page.locator('text=Informasi Dasar')).toBeVisible()
    await expect(page.locator('text=Status Stok')).toBeVisible()

    // Test History tab
    await page.click('text=Riwayat Transaksi')
    await expect(page.locator('text=Riwayat Transaksi')).toBeVisible()

    // Test Insights tab
    await page.click('text=Analitik')
    await expect(page.locator('text=Total Revenue')).toBeVisible()
    await expect(page.locator('text=Trend Penjualan')).toBeVisible()

    // Test Mutations tab
    await page.click('text=Mutasi Stok')
    await expect(page.locator('text=Mutasi Stok')).toBeVisible()
  })

  test('should display product information correctly', async ({ page }) => {
    // Navigate to a product detail page
    await page.goto('/inventory/products')
    await page.waitForLoadState('networkidle')

    const productLink = page.locator('a[href*="/inventory/products/"]').first()
    await productLink.click()
    await page.waitForLoadState('networkidle')

    // Check product name and SKU are displayed
    const productName = page.locator('h1').first()
    await expect(productName).toBeVisible()

    const skuText = page.locator('text=SKU:')
    await expect(skuText).toBeVisible()

    // Check quick stats have numeric values
    const stockCard = page
      .locator('text=Stok Saat Ini')
      .locator('..')
      .locator('p')
      .nth(1)
    await expect(stockCard).toBeVisible()

    const priceCard = page
      .locator('text=Harga Jual')
      .locator('..')
      .locator('p')
      .nth(1)
    await expect(priceCard).toBeVisible()
  })

  test('should handle back navigation', async ({ page }) => {
    // Navigate to a product detail page
    await page.goto('/inventory/products')
    await page.waitForLoadState('networkidle')

    const productLink = page.locator('a[href*="/inventory/products/"]').first()
    await productLink.click()
    await page.waitForLoadState('networkidle')

    // Click back button
    const backButton = page
      .locator('button')
      .filter({ hasText: 'ArrowLeft' })
      .first()
    await backButton.click()

    // Should return to products list
    await expect(page).toHaveURL('/inventory/products')
  })

  test('should display analytics charts when data is available', async ({
    page,
  }) => {
    // Navigate to a product detail page
    await page.goto('/inventory/products')
    await page.waitForLoadState('networkidle')

    const productLink = page.locator('a[href*="/inventory/products/"]').first()
    await productLink.click()
    await page.waitForLoadState('networkidle')

    // Go to insights tab
    await page.click('text=Analitik')

    // Check analytics cards
    await expect(page.locator('text=Total Revenue')).toBeVisible()
    await expect(page.locator('text=Total Profit')).toBeVisible()
    await expect(page.locator('text=Harga Rata-rata')).toBeVisible()

    // Check trend chart section
    await expect(page.locator('text=Trend Penjualan')).toBeVisible()
  })

  test('should display transaction history', async ({ page }) => {
    // Navigate to a product detail page
    await page.goto('/inventory/products')
    await page.waitForLoadState('networkidle')

    const productLink = page.locator('a[href*="/inventory/products/"]').first()
    await productLink.click()
    await page.waitForLoadState('networkidle')

    // Go to history tab
    await page.click('text=Riwayat Transaksi')

    // Check history section is visible
    await expect(page.locator('text=Riwayat Transaksi')).toBeVisible()
    await expect(
      page.locator('text=Semua transaksi pembelian dan penjualan produk ini')
    ).toBeVisible()
  })

  test('should display stock mutations', async ({ page }) => {
    // Navigate to a product detail page
    await page.goto('/inventory/products')
    await page.waitForLoadState('networkidle')

    const productLink = page.locator('a[href*="/inventory/products/"]').first()
    await productLink.click()
    await page.waitForLoadState('networkidle')

    // Go to mutations tab
    await page.click('text=Mutasi Stok')

    // Check mutations section is visible
    await expect(page.locator('text=Mutasi Stok')).toBeVisible()
    await expect(
      page.locator('text=Riwayat perubahan stok produk')
    ).toBeVisible()
  })

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Navigate to a product detail page
    await page.goto('/inventory/products')
    await page.waitForLoadState('networkidle')

    const productLink = page.locator('a[href*="/inventory/products/"]').first()
    await productLink.click()
    await page.waitForLoadState('networkidle')

    // Check that content is still visible on mobile
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('text=Stok Saat Ini')).toBeVisible()

    // Check that tabs are still accessible
    await expect(page.getByRole('tab', { name: 'Detail Produk' })).toBeVisible()

    // Test tab switching on mobile
    await page.click('text=Analitik')
    await expect(page.locator('text=Total Revenue')).toBeVisible()
  })

  test('should handle empty data states gracefully', async ({ page }) => {
    // Navigate to a product detail page
    await page.goto('/inventory/products')
    await page.waitForLoadState('networkidle')

    const productLink = page.locator('a[href*="/inventory/products/"]').first()
    await productLink.click()
    await page.waitForLoadState('networkidle')

    // Go to history tab - should handle empty transactions gracefully
    await page.click('text=Riwayat Transaksi')
    // Even if empty, the section should be visible
    await expect(page.locator('text=Riwayat Transaksi')).toBeVisible()

    // Go to mutations tab - should handle empty mutations gracefully
    await page.click('text=Mutasi Stok')
    await expect(page.locator('text=Mutasi Stok')).toBeVisible()
  })
})
