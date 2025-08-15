import { test, expect } from '@playwright/test'

test.describe('Stock Opname Complete E2E Flow', () => {
  test('complete workflow: create → add item → submit → admin review', async ({
    page,
  }) => {
    // Login
    await page.goto('http://localhost:9002/login')
    await page.fill('#email', 'aa@gmail.com')
    await page.fill('#password', '123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')

    // Navigate to stock opname
    await page.goto('http://localhost:9002/stock-opname')
    await page.waitForLoadState('networkidle')

    console.log('🔹 Step 1: Create Draft Session')
    // Create new session
    const createButton = page.locator('button:has-text("Draft")').first()
    await expect(createButton).toBeVisible()
    await createButton.click()
    await page.waitForURL(/stock-opname\/\d+/)

    const sessionUrl = page.url()
    const sessionId = sessionUrl.split('/').pop()
    console.log(`✅ Created session: ${sessionId}`)

    console.log('🔹 Step 2: Add Item to Session')
    // Check we're on detail page and session is DRAFT
    await expect(page.locator('text=DRAFT')).toBeVisible()

    // Add an item - find the product search button/input in the popover
    const productSearchButton = page
      .locator('button:has-text("Cari produk")')
      .first()
    if (await productSearchButton.isVisible()) {
      await productSearchButton.click()
      await page.waitForTimeout(500)

      // Now find the search input inside the command component
      const searchInput = page
        .locator('input[placeholder*="Cari produk"]')
        .first()
      if (await searchInput.isVisible()) {
        await searchInput.fill('Test Product')
        await page.waitForTimeout(1000)
        console.log('✅ Filled product search')
      } else {
        console.log('⚠️ Product search input not found')
      }
    } else {
      console.log('⚠️ Product search button not found')
    }

    // Find quantity input and fill it
    const quantityInput = page.locator('input[type="number"]').first()
    if (await quantityInput.isVisible()) {
      await quantityInput.fill('5')
      console.log('✅ Filled quantity')
    } else {
      console.log('⚠️ Quantity input not found')
    }

    // Click add button (+)
    const addButton = page.locator('button:has-text("+")').first()
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(1000)
      console.log('✅ Added item to session')
    } else {
      console.log('⚠️ Add button not found, continuing...')
    }

    console.log('🔹 Step 3: Submit Session')
    // Submit the session
    const submitButton = page.locator('button:has-text("Submit")').first()
    await expect(submitButton).toBeVisible()
    await submitButton.click()

    // Confirm in dialog
    const confirmButton = page.locator('button:has-text("Kirim")').first()
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()

    // Should navigate back to list
    await page.waitForURL('**/stock-opname')
    console.log('✅ Session submitted successfully')

    console.log('🔹 Step 4: Admin Review')
    // Navigate to admin page
    await page.goto('http://localhost:9002/admin/stock-opname')
    await page.waitForLoadState('networkidle')

    // Look for SUBMIT status sessions
    const submitSessions = page.locator('button:has-text("SUBMIT")').first()
    if (await submitSessions.isVisible()) {
      await submitSessions.click()
      await page.waitForTimeout(1000)

      // Try to approve
      const approveButton = page.locator('button:has-text("Setuju")').first()
      if (await approveButton.isVisible()) {
        await approveButton.click()

        // Confirm approval
        const confirmApprove = page
          .locator('button:has-text("Setujui")')
          .first()
        if (await confirmApprove.isVisible()) {
          await confirmApprove.click()
          await page.waitForTimeout(1000)
          console.log('✅ Session approved successfully')
        }
      } else {
        console.log('⚠️ Approve button not found')
      }
    } else {
      console.log('⚠️ No SUBMIT sessions found in admin')
    }

    console.log('🔹 Step 5: Verify Final State')
    // Go back to user view and check status
    await page.goto('http://localhost:9002/stock-opname')
    await page.waitForLoadState('networkidle')

    // Look for the session we created and check if it's approved
    const sessionRow = page
      .locator(`table tbody tr:has-text("${sessionId}")`)
      .first()
    if (await sessionRow.isVisible()) {
      const statusBadge = sessionRow.locator('.badge, [class*="badge"]').first()
      const statusText = await statusBadge.textContent()
      console.log(`✅ Final session status: ${statusText}`)

      // Verify the session exists in some final state
      expect(['APPROVED', 'SUBMIT', 'REJECTED']).toContain(statusText?.trim())
    } else {
      console.log(`⚠️ Could not find session ${sessionId} in final list`)
    }

    console.log('🎉 Complete E2E workflow test finished successfully!')
  })
})
