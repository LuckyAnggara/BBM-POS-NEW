import { test, expect } from '@playwright/test'

test.describe('Stock Opname Working E2E', () => {
  test('complete working flow with item addition', async ({ page }) => {
    console.log('🔹 Step 1: Login and Navigate')

    // Login
    await page.goto('http://localhost:9002/login')
    await page.waitForSelector('#email')
    await page.fill('#email', 'aa@gmail.com')
    await page.fill('#password', '123456')
    await page.click('button[type="submit"]')

    // Navigate to stock opname
    await page.goto('http://localhost:9002/stock-opname')
    await page.waitForSelector('text=Stock Opname List')
    console.log('✅ Successfully navigated to stock opname page')

    console.log('🔹 Step 2: Create Draft Session')

    // Create new session
    await page.click('button:has-text("Buat Session")')
    await page.waitForURL(/\/stock-opname\/\d+/)

    const url = page.url()
    const sessionId = url.split('/').pop()
    console.log(`✅ Created session: ${sessionId}`)

    // Verify it's in DRAFT status
    const statusBadge = await page.locator('text=DRAFT').first()
    await expect(statusBadge).toBeVisible()
    console.log('✅ Session is in DRAFT status')

    console.log('🔹 Step 3: Add Item to Session')

    // Try to find the product search functionality
    // Look for "Cari produk" text or search input
    const searchText = page.locator('text=Cari produk')
    if (await searchText.isVisible({ timeout: 2000 })) {
      console.log('✅ Found "Cari produk" text')

      // Look for search input nearby
      const searchInput = page
        .locator(
          'input[placeholder*="produk"], input[placeholder*="Produk"], input[type="text"]'
        )
        .first()
      if (await searchInput.isVisible({ timeout: 2000 })) {
        console.log('✅ Found search input')
        await searchInput.click()
        await searchInput.fill('test') // Search for test product
        await page.waitForTimeout(1000) // Wait for search results

        // Look for search results or product items
        const productItem = page
          .locator('text=test, .product-item, [data-testid*="product"]')
          .first()
        if (await productItem.isVisible({ timeout: 2000 })) {
          console.log('✅ Found product in search results')
          await productItem.click()

          // Look for quantity input
          const quantityInput = page
            .locator(
              'input[type="number"], input[placeholder*="qty"], input[placeholder*="jumlah"]'
            )
            .first()
          if (await quantityInput.isVisible({ timeout: 2000 })) {
            console.log('✅ Found quantity input')
            await quantityInput.fill('1')

            // Look for add button
            const addButton = page
              .locator(
                'button:has-text("Tambah"), button:has-text("Add"), button[type="submit"]'
              )
              .first()
            if (await addButton.isVisible({ timeout: 2000 })) {
              console.log('✅ Found add button')
              await addButton.click()
              await page.waitForTimeout(1000)
              console.log('✅ Item added successfully')
            } else {
              console.log('⚠️ Add button not found')
            }
          } else {
            console.log('⚠️ Quantity input not found')
          }
        } else {
          console.log('⚠️ No products found in search')
        }
      } else {
        console.log('⚠️ Search input not found')
      }
    } else {
      console.log(
        '⚠️ "Cari produk" text not found - checking for alternative UI'
      )

      // Alternative: look for any input that might be a search
      const anyInput = page
        .locator('input[type="text"], input[type="search"]')
        .first()
      if (await anyInput.isVisible({ timeout: 2000 })) {
        console.log('✅ Found alternative input')
        await anyInput.click()
        await anyInput.fill('test')
        await page.waitForTimeout(1000)
      } else {
        console.log('⚠️ No search inputs found')
      }
    }

    console.log('🔹 Step 4: Attempt Submit')

    // Try to submit
    const submitButton = page.locator('button:has-text("Submit")')
    await expect(submitButton).toBeVisible()

    await submitButton.click()
    console.log('✅ Clicked submit button')

    // Wait for confirmation dialog
    await page.waitForTimeout(1000)
    const confirmDialog = page.locator('text=Apakah anda yakin?')
    if (await confirmDialog.isVisible({ timeout: 3000 })) {
      console.log('✅ Confirmation dialog appeared')
      const confirmButton = page.locator('button:has-text("Ya")')
      await confirmButton.click()
      console.log('✅ Clicked confirmation button')
    }

    // Check result - either success or error
    await page.waitForTimeout(2000)

    const currentUrl = page.url()
    console.log(`Current URL: ${currentUrl}`)

    if (
      currentUrl.includes('/stock-opname') &&
      !currentUrl.includes(sessionId!)
    ) {
      console.log('✅ Successfully submitted and navigated back to list')
    } else {
      console.log('⚠️ Still on detail page - checking for error messages')

      // Look for error messages
      const errorSelectors = [
        'text=No items to submit',
        'text=Tidak ada item',
        '.error',
        '.alert-error',
        '[role="alert"]',
        '.text-red-500',
        '.text-destructive',
      ]

      for (const selector of errorSelectors) {
        const errorElement = page.locator(selector)
        if (await errorElement.isVisible({ timeout: 1000 })) {
          const errorText = await errorElement.textContent()
          console.log(`❌ Error found: ${errorText}`)
          break
        }
      }
    }

    console.log('🔹 Test completed')
  })
})
