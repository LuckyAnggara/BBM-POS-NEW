import { test, expect } from '@playwright/test'

test.describe('Stock Opname Navigation Test', () => {
  test('check navigation and links', async ({ page }) => {
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

    console.log('Current URL:', page.url())

    // Take screenshot
    await page.screenshot({
      path: 'debug-stock-opname-list.png',
      fullPage: true,
    })

    // Check table structure
    const hasTable = await page.locator('table').isVisible()
    console.log('Has table:', hasTable)

    if (hasTable) {
      const rows = await page.locator('table tbody tr').count()
      console.log('Total rows:', rows)

      // Check each row for links
      for (let i = 0; i < Math.min(rows, 3); i++) {
        const row = page.locator('table tbody tr').nth(i)
        const links = await row.locator('a').count()
        const firstCellText = await row.locator('td').first().textContent()
        console.log(`Row ${i}: ${firstCellText} - Links: ${links}`)

        if (links > 0) {
          const firstLink = row.locator('a').first()
          const linkText = await firstLink.textContent()
          const linkHref = await firstLink.getAttribute('href')
          console.log(`  First link: "${linkText}" -> ${linkHref}`)
        }
      }

      // Try to click first link if exists
      const firstRowFirstLink = page
        .locator('table tbody tr')
        .first()
        .locator('a')
        .first()
      if ((await firstRowFirstLink.count()) > 0) {
        console.log('Clicking first link...')
        await firstRowFirstLink.click()
        await page.waitForTimeout(2000)
        console.log('URL after click:', page.url())
      } else {
        console.log('No links found in first row')
      }
    }
  })
})
