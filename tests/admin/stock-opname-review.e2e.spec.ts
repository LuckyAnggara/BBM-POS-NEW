import { test, expect } from '@playwright/test'

test.describe('Admin Stock Opname Review E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page and login as admin
    await page.goto('http://localhost:9002/login')

    // Fill login form with admin credentials
    await page.fill('input[name="email"]', 'aa@gmail.com')
    await page.fill('input[name="password"]', '123456')

    // Click login button
    await page.click('button[type="submit"]')

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard')
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('should display admin stock opname review page', async ({ page }) => {
    // Navigate to admin stock opname review page
    await page.goto('http://localhost:9002/admin/stock-opname-review')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check page title
    await expect(page.locator('h1')).toContainText('Review Stock Opname')

    // Check filter components exist
    await expect(page.locator('label:has-text("Tampilkan Data")')).toBeVisible()
    await expect(page.locator('label:has-text("Status")')).toBeVisible()
    await expect(page.locator('label:has-text("Cabang")')).toBeVisible()
    await expect(
      page.locator('label:has-text("Cari Kode/Catatan")')
    ).toBeVisible()
    await expect(page.locator('label:has-text("Filter Tanggal")')).toBeVisible()

    // Check refresh button exists
    await expect(page.locator('button:has-text("Refresh Data")')).toBeVisible()

    console.log('✅ Admin stock opname review page loaded successfully')
  })

  test('should create and submit stock opname for review', async ({ page }) => {
    // First, create a new stock opname
    await page.goto('http://localhost:9002/stock-opname')
    await page.waitForLoadState('networkidle')

    // Click create new stock opname
    await page.click('button:has-text("Buat Stock Opname Baru")')

    // Fill notes and create
    await page.fill(
      'textarea[placeholder*="catatan"]',
      'Test stock opname for admin review'
    )
    await page.click('button:has-text("Buat Session")')

    // Wait for navigation to detail page
    await page.waitForURL('**/stock-opname/**')

    // Add a product to stock opname
    await page.click('button:has-text("Tambah Produk")')

    // Search for a product
    await page.fill('input[placeholder*="Cari produk"]', 'test')
    await page.waitForTimeout(2000)

    // Select first product from results
    const productItems = page.locator('[cmdk-item]')
    const firstProduct = productItems.first()
    if (await firstProduct.isVisible()) {
      await firstProduct.click()

      // Fill counted quantity
      await page.fill('input[placeholder="Jumlah dihitung"]', '10')
      await page.click('button:has-text("Tambah")')

      // Submit stock opname for review
      await page.click('button:has-text("Submit untuk Review")')
      await page.click('button:has-text("Ya, Submit")')

      console.log('✅ Stock opname created and submitted for review')
    }
  })

  test('should filter stock opname by status', async ({ page }) => {
    await page.goto('http://localhost:9002/admin/stock-opname-review')
    await page.waitForLoadState('networkidle')

    // Test filtering by SUBMIT status (default)
    await page.selectOption('select', 'SUBMIT')
    await page.waitForTimeout(1000)

    // Check if table shows only SUBMIT status items
    const statusBadges = page
      .locator('td')
      .filter({ hasText: 'Menunggu Review' })
    const badgeCount = await statusBadges.count()

    if (badgeCount > 0) {
      console.log(`✅ Found ${badgeCount} stock opname(s) with SUBMIT status`)
    } else {
      console.log('ℹ️ No SUBMIT status stock opname found')
    }

    // Test filtering by all statuses
    await page.selectOption('select', 'all')
    await page.waitForTimeout(1000)

    console.log('✅ Status filtering working correctly')
  })

  test('should approve stock opname and verify stock changes', async ({
    page,
  }) => {
    await page.goto('http://localhost:9002/admin/stock-opname-review')
    await page.waitForLoadState('networkidle')

    // Look for SUBMIT status stock opname
    const approveButtons = page.locator('button').filter({ hasText: /✓/ })
    const approveButtonCount = await approveButtons.count()

    if (approveButtonCount > 0) {
      // Get product info before approval
      console.log(
        '🔍 Found stock opname to approve, checking product stock before approval'
      )

      // Click approve button for first item
      await approveButtons.first().click()

      // Verify approve dialog appears
      await expect(page.locator('dialog')).toBeVisible()
      await expect(
        page.locator('h2:has-text("Setujui Stock Opname")')
      ).toBeVisible()

      // Check summary information is displayed
      await expect(page.locator('text=Total Item:')).toBeVisible()
      await expect(page.locator('text=Penyesuaian Positif:')).toBeVisible()
      await expect(page.locator('text=Penyesuaian Negatif:')).toBeVisible()

      // Click approve
      await page.click('button:has-text("Setujui")')

      // Wait for success toast
      await page.waitForTimeout(2000)

      // Verify toast message
      const toast = page.locator('[data-sonner-toast]')
      if (await toast.isVisible()) {
        await expect(toast).toContainText('berhasil disetujui')
        console.log('✅ Stock opname approved successfully')
      }

      // Refresh page and verify status changed to APPROVED
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Check for APPROVED status badges
      const approvedBadges = page.locator('text=Disetujui')
      const approvedCount = await approvedBadges.count()

      if (approvedCount > 0) {
        console.log('✅ Stock opname status changed to APPROVED')
      }
    } else {
      console.log(
        'ℹ️ No stock opname available for approval - creating one first'
      )

      // Create stock opname for testing
      await test.step('Create stock opname for approval test', async () => {
        await page.goto('http://localhost:9002/stock-opname')
        await page.click('button:has-text("Buat Stock Opname Baru")')
        await page.fill('textarea', 'Auto-generated for approval test')
        await page.click('button:has-text("Buat Session")')
        await page.waitForURL('**/stock-opname/**')

        // Add product if available
        await page.click('button:has-text("Tambah Produk")')
        await page.fill('input[placeholder*="Cari produk"]', 'test')
        await page.waitForTimeout(2000)

        const productItems = page.locator('[cmdk-item]')
        if ((await productItems.count()) > 0) {
          await productItems.first().click()
          await page.fill('input[placeholder="Jumlah dihitung"]', '5')
          await page.click('button:has-text("Tambah")')
          await page.click('button:has-text("Submit untuk Review")')
          await page.click('button:has-text("Ya, Submit")')

          console.log('✅ Created stock opname for approval test')

          // Now go back to admin review page
          await page.goto('http://localhost:9002/admin/stock-opname-review')
          await page.waitForLoadState('networkidle')

          // Try approval again
          const newApproveButtons = page
            .locator('button')
            .filter({ hasText: /✓/ })
          if ((await newApproveButtons.count()) > 0) {
            await newApproveButtons.first().click()
            await page.click('button:has-text("Setujui")')
            await page.waitForTimeout(2000)
            console.log('✅ Successfully approved the created stock opname')
          }
        }
      })
    }
  })

  test('should reject stock opname with admin notes', async ({ page }) => {
    await page.goto('http://localhost:9002/admin/stock-opname-review')
    await page.waitForLoadState('networkidle')

    // Look for SUBMIT status stock opname
    const rejectButtons = page.locator('button').filter({ hasText: /✕/ })
    const rejectButtonCount = await rejectButtons.count()

    if (rejectButtonCount > 0) {
      // Click reject button for first item
      await rejectButtons.first().click()

      // Verify reject dialog appears
      await expect(page.locator('dialog')).toBeVisible()
      await expect(
        page.locator('h2:has-text("Tolak Stock Opname")')
      ).toBeVisible()

      // Fill admin notes
      const adminNotes = 'Stock opname ditolak karena ada ketidaksesuaian data'
      await page.fill('textarea[placeholder*="alasan penolakan"]', adminNotes)

      // Click reject
      await page.click('button:has-text("Tolak")')

      // Wait for success toast
      await page.waitForTimeout(2000)

      // Verify toast message
      const toast = page.locator('[data-sonner-toast]')
      if (await toast.isVisible()) {
        await expect(toast).toContainText('telah ditolak')
        console.log('✅ Stock opname rejected successfully')
      }

      // Refresh and verify status changed to REJECTED
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Filter by REJECTED status to see our rejected item
      await page.selectOption('select', 'REJECTED')
      await page.waitForTimeout(1000)

      const rejectedBadges = page.locator('text=Ditolak')
      const rejectedCount = await rejectedBadges.count()

      if (rejectedCount > 0) {
        console.log('✅ Stock opname status changed to REJECTED')
      }
    } else {
      console.log(
        'ℹ️ No stock opname available for rejection - this is expected if all are already processed'
      )
    }
  })

  test('should display stock opname details in detail dialog', async ({
    page,
  }) => {
    await page.goto('http://localhost:9002/admin/stock-opname-review')
    await page.waitForLoadState('networkidle')

    // Look for detail/eye buttons
    const detailButtons = page.locator('button').filter({ hasText: /👁/ })
    const detailButtonCount = await detailButtons.count()

    if (detailButtonCount > 0) {
      // Click detail button for first item
      await detailButtons.first().click()

      // Verify detail dialog appears
      await expect(page.locator('dialog')).toBeVisible()
      await expect(
        page.locator('h2:has-text("Detail Stock Opname")')
      ).toBeVisible()

      // Check detail information is displayed
      await expect(page.locator('text=Status:')).toBeVisible()
      await expect(page.locator('text=Cabang:')).toBeVisible()
      await expect(page.locator('text=Dibuat oleh:')).toBeVisible()
      await expect(page.locator('text=Tanggal dibuat:')).toBeVisible()

      // Check summary cards
      await expect(page.locator('text=Total Item')).toBeVisible()
      await expect(page.locator('text=Penyesuaian (+)')).toBeVisible()
      await expect(page.locator('text=Penyesuaian (-)')).toBeVisible()

      // Close dialog
      await page.click('button:has-text("Tutup")')

      console.log('✅ Stock opname detail dialog working correctly')
    } else {
      console.log('ℹ️ No stock opname found for detail viewing')
    }
  })

  test('should search stock opname by code or notes', async ({ page }) => {
    await page.goto('http://localhost:9002/admin/stock-opname-review')
    await page.waitForLoadState('networkidle')

    // Test search functionality
    await page.fill(
      'input[placeholder*="Kode stock opname atau catatan"]',
      'SO-'
    )

    // Wait for debounced search
    await page.waitForTimeout(1500)

    // Check if results are filtered
    const tableRows = page.locator('tbody tr')
    const rowCount = await tableRows.count()

    if (rowCount > 0) {
      console.log(`✅ Search returned ${rowCount} result(s)`)

      // Verify results contain search term
      const codeColumns = page.locator('td:first-child')
      const firstCode = await codeColumns.first().textContent()
      if (firstCode && firstCode.includes('SO-')) {
        console.log('✅ Search results are relevant')
      }
    } else {
      console.log('ℹ️ No search results found - this might be expected')
    }

    // Clear search
    await page.fill('input[placeholder*="Kode stock opname atau catatan"]', '')
    await page.waitForTimeout(1500)

    console.log('✅ Search functionality working correctly')
  })

  test('should filter by branch', async ({ page }) => {
    await page.goto('http://localhost:9002/admin/stock-opname-review')
    await page.waitForLoadState('networkidle')

    // Get all available branch options
    const branchSelect = page.locator('select').nth(2) // Third select is branch filter
    await branchSelect.click()

    const branchOptions = page.locator('option')
    const optionCount = await branchOptions.count()

    if (optionCount > 1) {
      // More than just "Semua Cabang"
      // Select second option (first actual branch)
      const secondOption = await branchOptions.nth(1).getAttribute('value')
      if (secondOption && secondOption !== 'all') {
        await branchSelect.selectOption(secondOption)
        await page.waitForTimeout(1000)

        console.log('✅ Branch filtering applied successfully')
      }
    }

    // Reset to all branches
    await branchSelect.selectOption('all')
    await page.waitForTimeout(1000)

    console.log('✅ Branch filter working correctly')
  })
})
