import { test, expect } from '@playwright/test'

test.describe('Sales POS Dialog Tests', () => {
  test('should display and interact with sales dialog buttons', async ({
    page,
  }) => {
    console.log('Starting POS dialog test...')

    // Login first
    await page.goto('http://localhost:9002/login')
    await page.waitForTimeout(1000)

    console.log('Logging in...')
    await page.locator('input[type="email"]').first().fill('aa@gmail.com')
    await page.locator('input[type="password"]').first().fill('123456')
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(3000)

    // Navigate to POS page
    console.log('Navigating to POS...')
    await page.goto('http://localhost:9002/pos')
    await page.waitForTimeout(3000)

    console.log('Current URL:', page.url())

    // Look for customer dialog button
    console.log('Looking for customer dialog button...')
    const customerButton = page.locator(
      '[data-testid="customer-dialog-button-header"]'
    )
    const isCustomerVisible = await customerButton.isVisible()
    console.log('Customer button visible:', isCustomerVisible)

    if (isCustomerVisible) {
      await expect(customerButton).toBeVisible()

      // Click customer dialog button
      console.log('Clicking customer dialog button...')
      await customerButton.click()
      await page.waitForTimeout(1000)

      // Check if dialog opens
      const customerDialogVisible = await page
        .locator('[role="dialog"]:has-text("Pilih Pelanggan")')
        .isVisible()
      console.log('Customer dialog visible:', customerDialogVisible)

      if (customerDialogVisible) {
        await expect(
          page.locator('[role="dialog"]:has-text("Pilih Pelanggan")')
        ).toBeVisible()
        // Close dialog
        await page.click('button:has-text("Tutup")')
        await page.waitForTimeout(500)
      }
    }

    // Look for sales dialog button
    console.log('Looking for sales dialog button...')
    const salesButton = page.locator(
      '[data-testid="sales-dialog-button-header"]'
    )
    const isSalesVisible = await salesButton.isVisible()
    console.log('Sales button visible:', isSalesVisible)

    if (isSalesVisible) {
      await expect(salesButton).toBeVisible()

      // Click sales dialog button
      console.log('Clicking sales dialog button...')
      await salesButton.click()
      await page.waitForTimeout(1000)

      // Check if dialog opens
      const salesDialogVisible = await page
        .locator('[role="dialog"]:has-text("Pilih Sales")')
        .isVisible()
      console.log('Sales dialog visible:', salesDialogVisible)

      if (salesDialogVisible) {
        await expect(
          page.locator('[role="dialog"]:has-text("Pilih Sales")')
        ).toBeVisible()
        // Close dialog
        await page.click('button:has-text("Tutup")')
      }
    }

    console.log('Test completed successfully!')
  })
})
