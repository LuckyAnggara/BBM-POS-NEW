import { test, expect } from '@playwright/test'

test('Simple product detail test', async ({ page }) => {
  // Login
  await page.goto('/login')
  await page.fill('input[name="email"]', 'aa@gmail.com')
  await page.fill('input[name="password"]', '123456')
  await page.click('button[type="submit"]')

  // Wait for dashboard
  await page.waitForURL('/dashboard')

  // Navigate to products
  await page.goto('/inventory/products')
  await page.waitForLoadState('networkidle')

  // Should see products list
  await expect(page.locator('h1')).toContainText('Produk')

  console.log('✅ Products page loaded successfully')
})
