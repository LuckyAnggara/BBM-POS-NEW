import { test, expect } from '@playwright/test'

test('Debug login and dashboard', async ({ page }) => {
  // Go to login page
  await page.goto('http://localhost:9002/login')

  // Fill in credentials
  await page.fill('input[id="email"]', 'aa@gmail.com')
  await page.fill('input[id="password"]', '123456')

  // Click login
  await page.getByRole('button', { name: /login/i }).click()

  // Wait for navigation
  await page.waitForTimeout(5000)

  // Try direct navigation to stock-opname
  console.log('Trying direct navigation to stock-opname...')
  await page.goto('http://localhost:9002/stock-opname')
  await page.waitForTimeout(2000)

  console.log('Current URL after direct navigation:', page.url())

  // Take screenshot of stock-opname page
  await page.screenshot({ path: 'debug-stock-opname.png', fullPage: true })

  // Check if we're on the stock-opname page
  const title = await page.textContent('h1')
  console.log('Page title:', title)

  // Look for create button
  const createButtons = await page
    .locator('button:has-text("Draft"), button:has-text("Buat")')
    .all()
  console.log('Found create buttons:', createButtons.length)

  for (let i = 0; i < createButtons.length; i++) {
    const text = await createButtons[i].textContent()
    console.log(`Create button ${i}: "${text}"`)
  }
})
