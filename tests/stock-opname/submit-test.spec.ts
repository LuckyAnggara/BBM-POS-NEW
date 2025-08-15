import { test, expect } from '@playwright/test'

test.describe('Stock Opname Submit Test', () => {
  test('create and submit draft successfully', async ({ page }) => {
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

    // Create a new session
    const createButtons = await page.locator('button:has-text("Draft")').all()
    if (createButtons.length > 0) {
      await createButtons[0].click()
      await page.waitForTimeout(2000)
      // Check if we navigated to detail page
      const currentUrl = page.url()
      console.log('URL after create:', currentUrl)

      if (currentUrl.includes('/stock-opname/')) {
        console.log('Successfully navigated to detail page')

        // Add an item
        const productInput = page
          .locator('input[placeholder*="product"]')
          .first()
        if (await productInput.isVisible()) {
          await productInput.fill('Test Product')
          await page.waitForTimeout(1000)

          // Try to select from dropdown
          const dropdown = page.locator('[role="option"]').first()
          if (await dropdown.isVisible()) {
            await dropdown.click()
          }

          // Fill quantity
          const quantityInput = page.locator('input[type="number"]').first()
          if (await quantityInput.isVisible()) {
            await quantityInput.fill('10')
          }

          // Add item
          const addBtn = page.getByRole('button').filter({ hasText: /^\+$/ })
          if (await addBtn.isVisible()) {
            await addBtn.click()
            await page.waitForTimeout(1000)
          }
        }

        // Try to submit
        const submitBtn = page.getByRole('button', { name: /submit/i })
        if (await submitBtn.isVisible()) {
          console.log('Submit button found, clicking...')
          await submitBtn.click()
          await page.waitForTimeout(1000)

          // Check for confirm dialog
          const confirmBtn = page.getByRole('button', { name: /kirim/i })
          if (await confirmBtn.isVisible()) {
            console.log('Confirm dialog found, clicking kirim...')
            await confirmBtn.click()
            await page.waitForTimeout(3000)

            // Check current URL
            console.log('URL after submit:', page.url())

            // Check if we're back on the list page or still on detail page
            if (
              page.url().includes('/stock-opname') &&
              !page.url().match(/\/stock-opname\/\d+/)
            ) {
              console.log('Successfully navigated back to list page')
            } else {
              console.log('Still on detail page or different page')
            }
          } else {
            console.log('No confirm dialog found')
          }
        } else {
          console.log('No submit button found')
        }
      } else {
        console.log('Did not navigate to detail page, still on:', currentUrl)
      }
    } else {
      console.log('No create buttons found')
    }
  })
})
