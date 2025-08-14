import { test, expect } from '@playwright/test'

const EMAIL = process.env.TEST_USER_EMAIL || 'aa@gmail.com'
const PASSWORD = process.env.TEST_USER_PASSWORD || '123456'

async function login(page: any) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: /login/i }).click()
  await page.waitForLoadState('networkidle')
}

test.describe('Send Notification Flow', () => {
  test('admin can send notification and it appears in history', async ({
    page,
  }) => {
    await login(page)

    // Go to send notification page
    await page.goto('/admin/send-notification')
    await expect(page.getByText(/Kirim Notifikasi Baru/i)).toBeVisible()

    const title = 'E2E Test Notif ' + Date.now()
    const message = 'Pesan otomatis pengujian end-to-end.'

    await page.getByLabel('Judul Notifikasi*').fill(title)
    // Open category select (aria-label on trigger)
    await page.getByLabel('Kategori Notifikasi*').click()
    await page.getByRole('option', { name: /^general$/i }).click()
    await page.getByLabel('Pesan Notifikasi*').fill(message)

    await page.getByRole('button', { name: /Kirim Notifikasi/i }).click()

    // Expect toast success
    await expect(page.getByText(/Notifikasi Terkirim/i)).toBeVisible({
      timeout: 10000,
    })

    // Redirect to history
    await page.waitForURL(/.*\/admin\/notification-history.*/)

    // Verify appears in table
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(message.substring(0, 10))).toBeVisible()
  })
})
