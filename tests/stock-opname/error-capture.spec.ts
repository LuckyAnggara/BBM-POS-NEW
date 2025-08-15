import { test, expect } from '@playwright/test'

test.describe('Stock Opname Error Test', () => {
  test('capture submit error message', async ({ page }) => {
    // Login and navigate directly to stock opname
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

    const url = page.url()
    const sessionId = url.split('/').pop()
    console.log(`Created session: ${sessionId}`)

    // Submit without items
    const submitButton = page.locator('button:has-text("Submit")')
    await expect(submitButton).toBeVisible()
    await submitButton.click()

    // Wait for confirmation dialog and click confirm
    await page.waitForTimeout(1000)
    const confirmButton = page.locator('button:has-text("Kirim")').nth(3) // The actual button, not the text
    if (await confirmButton.isVisible({ timeout: 3000 })) {
      await confirmButton.click()
      console.log('Clicked confirmation button')
    } else {
      console.log('No confirmation dialog found')
    }

    // Wait and capture any error messages
    await page.waitForTimeout(3000)

    // Check if still on the same page (submit failed)
    const currentUrl = page.url()
    console.log(`Current URL: ${currentUrl}`)

    if (currentUrl.includes(sessionId!)) {
      console.log('Still on detail page - submit failed as expected')

      // Capture all possible error messages
      const errorSelectors = [
        'text=No items to submit',
        'text=Tidak ada item untuk dikirim',
        'text=Tidak ada item',
        '[role="alert"]',
        '.alert',
        '.error',
        '.text-red',
        '.text-destructive',
        '[class*="error"]',
        '[class*="alert"]',
      ]

      console.log('Checking for error messages...')
      for (let i = 0; i < errorSelectors.length; i++) {
        const selector = errorSelectors[i]
        const elements = page.locator(selector)
        const count = await elements.count()

        if (count > 0) {
          console.log(`Found ${count} elements with selector: ${selector}`)
          for (let j = 0; j < count; j++) {
            const element = elements.nth(j)
            if (await element.isVisible()) {
              const text = await element.textContent()
              console.log(`  Error message ${j}: "${text}"`)
            }
          }
        }
      }

      // Also check all elements that contain certain words
      const searchTexts = [
        'No items',
        'Tidak ada',
        'error',
        'Error',
        'fail',
        'gagal',
      ]
      for (const searchText of searchTexts) {
        const elements = page.locator(`text=${searchText}`)
        const count = await elements.count()
        if (count > 0) {
          console.log(`Found text "${searchText}" in ${count} elements`)
          for (let j = 0; j < count; j++) {
            const element = elements.nth(j)
            if (await element.isVisible()) {
              const fullText = await element.textContent()
              console.log(`  Text: "${fullText}"`)
            }
          }
        }
      }
    } else {
      console.log('Submit succeeded unexpectedly')
    }
  })
})
