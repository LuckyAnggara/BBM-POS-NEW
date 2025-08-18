import { test, expect } from '@playwright/test'

test.describe('Basic Sales Tests', () => {
  test('should login and navigate to dashboard', async ({ page }) => {
    console.log('Starting test...')

    // Navigate to login page
    await page.goto('http://localhost:9002/login')
    console.log('Navigated to login page')

    // Wait for page to load
    await page.waitForTimeout(2000)

    // Check if login form exists
    const emailInput = await page.locator('input[type="email"]').first()
    const passwordInput = await page.locator('input[type="password"]').first()
    const submitButton = await page.locator('button[type="submit"]').first()

    console.log('Found form elements')

    // Fill login form
    await emailInput.fill('aa@gmail.com')
    await passwordInput.fill('123456')

    console.log('Filled form')

    // Submit login
    await submitButton.click()
    console.log('Clicked submit')

    // Wait for redirect
    await page.waitForTimeout(3000)

    // Check current URL
    const currentUrl = page.url()
    console.log('Current URL:', currentUrl)

    // Just verify we're not on login page anymore
    expect(currentUrl).not.toContain('/login')
  })

  test('should access POS page', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:9002/login')
    await page.waitForTimeout(1000)

    await page.locator('input[type="email"]').first().fill('aa@gmail.com')
    await page.locator('input[type="password"]').first().fill('123456')
    await page.locator('button[type="submit"]').first().click()

    await page.waitForTimeout(3000)

    // Navigate to POS
    await page.goto('http://localhost:9002/pos')
    await page.waitForTimeout(2000)

    // Check if we can see POS elements
    const currentUrl = page.url()
    console.log('POS URL:', currentUrl)
    expect(currentUrl).toContain('/pos')
  })
})
