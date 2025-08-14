import { test, expect } from '@playwright/test'

// Basic dashboard smoke test
// Uses fixed credentials as requested (aa@gmail.com / 123456) unless overridden by env vars

const EMAIL = process.env.TEST_USER_EMAIL || 'aa@gmail.com'
const PASSWORD = process.env.TEST_USER_PASSWORD || '123456'

// Helper to login
async function login(page: any) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: /login/i }).click()
  // Wait for redirect (dashboard or branch selection dependent)
  await page.waitForLoadState('networkidle')
}

test.describe('Dashboard', () => {
  test('should show key dashboard widgets after login', async ({ page }) => {
    await login(page)

    // Navigate explicitly if not redirected
    if (!/dashboard/.test(page.url())) {
      await page.goto('/dashboard')
    }

    // Assert presence of key KPI cards (case-insensitive match)
    await expect(page.getByText(/Pendapatan Kotor/i)).toBeVisible()
    await expect(page.getByText(/Pendapatan Bersih/i)).toBeVisible()
    await expect(page.getByText(/Total Pengeluaran/i)).toBeVisible()
    await expect(page.getByText(/Transaksi Selesai/i)).toBeVisible()

    // Charts / sections
    await expect(page.getByText(/Tren Penjualan \(Omset\)/i)).toBeVisible()
    await expect(page.getByText(/Tren Laba \/ Rugi Harian/i)).toBeVisible()
    await expect(page.getByText(/Status Inventaris/)).toBeVisible()
    await expect(page.getByText(/Top Produk/)).toBeVisible()
  })
})
