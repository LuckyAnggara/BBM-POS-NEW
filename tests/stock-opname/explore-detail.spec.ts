import { test, expect } from '@playwright/test'

test.describe('Stock Opname Detail Page Exploration', () => {
  test('explore detail page structure', async ({ page }) => {
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

    console.log('Current URL:', page.url())

    // Check session status first
    const statusElement = page.locator('.bg-muted, [class*="bg-muted"]').first()
    const sessionStatus = await statusElement.textContent()
    console.log('Session status:', sessionStatus)

    // Take screenshot
    await page.screenshot({ path: 'debug-detail-page.png', fullPage: true })

    // Explore buttons
    const buttons = await page.locator('button').all()
    console.log('All buttons found:')
    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const buttonText = await buttons[i].textContent()
      const isVisible = await buttons[i].isVisible()
      console.log(`  ${i}: "${buttonText}" (visible: ${isVisible})`)
    }

    // Explore inputs
    const inputs = await page.locator('input').all()
    console.log('All inputs found:')
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i]
      const type = await input.getAttribute('type')
      const placeholder = await input.getAttribute('placeholder')
      const isVisible = await input.isVisible()
      console.log(
        `  ${i}: type="${type}" placeholder="${placeholder}" (visible: ${isVisible})`
      )
    }

    // Look for specific text patterns
    const hasSubmitButton = await page
      .locator('button:has-text("Submit")')
      .isVisible()
    const hasCariProduk = await page.locator('text=Cari produk').isVisible()

    console.log('Key elements:')
    console.log(`  Submit button: ${hasSubmitButton}`)
    console.log(`  "Cari produk" text: ${hasCariProduk}`)

    // Try submit button regardless
    if (hasSubmitButton) {
      console.log('Clicking submit button...')
      await page.locator('button:has-text("Submit")').click()
      await page.waitForTimeout(2000)

      // Check for dialog
      const hasDialog = await page.locator('text=Kirim').isVisible()
      console.log(`  Confirm dialog visible: ${hasDialog}`)

      if (hasDialog) {
        console.log('Dialog found, clicking confirm...')
        await page.locator('button:has-text("Kirim")').click()
        await page.waitForTimeout(3000)
        console.log('Final URL after submit:', page.url())
      }
    }
  })
})
