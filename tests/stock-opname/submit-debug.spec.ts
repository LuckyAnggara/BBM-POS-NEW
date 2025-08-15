import { test, expect } from '@playwright/test'

test.describe('Stock Opname Submit Debug', () => {
  test('debug submit flow', async ({ page }) => {
    // Login
    await page.goto('http://localhost:9002/login')
    await page.fill('#email', 'aa@gmail.com')
    await page.fill('#password', '123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')

    // Navigate to stock opname
    await page.goto('http://localhost:9002/stock-opname')
    await page.waitForLoadState('networkidle')

    // Create new session
    const createButton = page.locator('button:has-text("Draft")').first()
    await createButton.click()
    await page.waitForURL(/stock-opname\/\d+/)

    const sessionId = page.url().split('/').pop()
    console.log(`Created session: ${sessionId}`)

    // Submit session
    const submitButton = page.locator('button:has-text("Submit")').first()
    await submitButton.click()
    console.log('Clicked submit button')

    // Wait a bit
    await page.waitForTimeout(1000)

    // Check dialog appearance
    const confirmButton = page.getByRole('button', { name: 'Kirim' })
    const dialogVisible = await confirmButton.isVisible()
    console.log('Confirm dialog visible:', dialogVisible)

    if (dialogVisible) {
      console.log('Clicking confirm button...')
      await confirmButton.click()

      // Wait and check current URL multiple times
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(1000)
        const currentUrl = page.url()
        console.log(`After ${i + 1}s: ${currentUrl}`)

        if (currentUrl.endsWith('/stock-opname')) {
          console.log('✅ Successfully navigated back to list!')
          break
        }
      }

      // Final URL check
      const finalUrl = page.url()
      console.log('Final URL:', finalUrl)

      // Check if we're still on detail page or somewhere else
      if (finalUrl.includes(`/stock-opname/${sessionId}`)) {
        console.log('Still on detail page - checking for errors')

        // Look for error messages
        const errorElements = await page
          .locator(
            '[role="alert"], .text-red-500, .text-red-600, .text-destructive'
          )
          .all()
        console.log(`Found ${errorElements.length} potential error elements`)

        for (let i = 0; i < errorElements.length; i++) {
          const errorText = await errorElements[i].textContent()
          console.log(`Error ${i}: ${errorText}`)
        }

        // Take screenshot
        await page.screenshot({
          path: 'debug-submit-failed.png',
          fullPage: true,
        })
      } else if (finalUrl.endsWith('/stock-opname')) {
        console.log('✅ Successfully on list page')

        // Check for the session
        const sessionExists = await page
          .locator(`table tbody tr:has-text("${sessionId}")`)
          .isVisible()
        console.log(`Session ${sessionId} visible in table:`, sessionExists)
      } else {
        console.log('On unexpected page:', finalUrl)
      }
    } else {
      console.log('Confirm dialog not visible')
    }
  })
})
