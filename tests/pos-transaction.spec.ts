import { test, expect } from '@playwright/test'

// Test credentials
const TEST_EMAIL = 'aa@gmail.com'
const TEST_PASSWORD = '123456'

test.describe('Point of Sales Transaction Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')

    // Fill login form
    await page.fill('input[id="email"]', TEST_EMAIL)
    await page.fill('input[id="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')

    // Wait for successful login and redirect
    await page.waitForURL('/dashboard')
    await expect(page).toHaveURL('/dashboard')

    // Navigate to POS
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  // ✅ 1. Skenario Transaksi Dasar (Happy Path)
  test.describe('Tipe Pembayaran', () => {
    test('Transaksi sukses menggunakan Cash (tanpa pajak, diskon, shipping, WIC)', async ({
      page,
    }) => {
      // Add product to cart
      const productButton = page.locator('[data-testid="product-item"]').first()
      await productButton.click()

      // Verify product is added to cart
      await expect(page.locator('[data-testid="cart-item"]')).toBeVisible()

      // Click payment button
      await page.click('[data-testid="payment-button"]')

      // Select Cash payment method
      await page.click('[data-testid="payment-cash"]')

      // Enter payment amount
      const totalAmount = await page
        .locator('[data-testid="total-amount"]')
        .textContent()
      await page.fill(
        '[data-testid="payment-amount"]',
        totalAmount?.replace(/[^0-9]/g, '') || '0'
      )

      // Process payment
      await page.click('[data-testid="process-payment"]')

      // Verify transaction success
      await expect(
        page.locator('[data-testid="transaction-success"]')
      ).toBeVisible()

      // Verify receipt
      await expect(page.locator('[data-testid="receipt"]')).toBeVisible()
      await expect(
        page.locator('[data-testid="payment-method"]')
      ).toContainText('Cash')

      console.log('✅ Cash transaction completed successfully')
    })

    test('Transaksi sukses menggunakan Transfer (tanpa pajak, diskon, shipping, WIC)', async ({
      page,
    }) => {
      // Add product to cart
      const productButton = page.locator('[data-testid="product-item"]').first()
      await productButton.click()

      // Click payment button
      await page.click('[data-testid="payment-button"]')

      // Select Transfer payment method
      await page.click('[data-testid="payment-transfer"]')

      // Enter payment amount
      const totalAmount = await page
        .locator('[data-testid="total-amount"]')
        .textContent()
      await page.fill(
        '[data-testid="payment-amount"]',
        totalAmount?.replace(/[^0-9]/g, '') || '0'
      )

      // Process payment
      await page.click('[data-testid="process-payment"]')

      // Verify transaction success
      await expect(
        page.locator('[data-testid="transaction-success"]')
      ).toBeVisible()
      await expect(
        page.locator('[data-testid="payment-method"]')
      ).toContainText('Transfer')

      console.log('✅ Transfer transaction completed successfully')
    })

    test('Transaksi sukses menggunakan QRIS (tanpa pajak, diskon, shipping, WIC)', async ({
      page,
    }) => {
      // Add product to cart
      const productButton = page.locator('[data-testid="product-item"]').first()
      await productButton.click()

      // Click payment button
      await page.click('[data-testid="payment-button"]')

      // Select QRIS payment method
      await page.click('[data-testid="payment-qris"]')

      // Enter payment amount
      const totalAmount = await page
        .locator('[data-testid="total-amount"]')
        .textContent()
      await page.fill(
        '[data-testid="payment-amount"]',
        totalAmount?.replace(/[^0-9]/g, '') || '0'
      )

      // Process payment
      await page.click('[data-testid="process-payment"]')

      // Verify transaction success
      await expect(
        page.locator('[data-testid="transaction-success"]')
      ).toBeVisible()
      await expect(
        page.locator('[data-testid="payment-method"]')
      ).toContainText('QRIS')

      console.log('✅ QRIS transaction completed successfully')
    })

    test('Transaksi sukses menggunakan Kredit (tanpa pajak, diskon, shipping, WIC)', async ({
      page,
    }) => {
      // Add product to cart
      const productButton = page.locator('[data-testid="product-item"]').first()
      await productButton.click()

      // Click payment button
      await page.click('[data-testid="payment-button"]')

      // Select Credit payment method
      await page.click('[data-testid="payment-credit"]')

      // Enter payment amount
      const totalAmount = await page
        .locator('[data-testid="total-amount"]')
        .textContent()
      await page.fill(
        '[data-testid="payment-amount"]',
        totalAmount?.replace(/[^0-9]/g, '') || '0'
      )

      // Process payment
      await page.click('[data-testid="process-payment"]')

      // Verify transaction success
      await expect(
        page.locator('[data-testid="transaction-success"]')
      ).toBeVisible()
      await expect(
        page.locator('[data-testid="payment-method"]')
      ).toContainText('Credit')

      console.log('✅ Credit transaction completed successfully')
    })
  })

  test.describe('Opsi Pajak', () => {
    test('Transaksi dengan opsi Dengan Pajak (PPN 11%) menghitung total dengan benar', async ({
      page,
    }) => {
      // Add product to cart
      const productButton = page.locator('[data-testid="product-item"]').first()
      await productButton.click()

      // Get subtotal before tax
      const subtotal = await page
        .locator('[data-testid="subtotal"]')
        .textContent()
      const subtotalAmount = parseFloat(subtotal?.replace(/[^0-9]/g, '') || '0')

      // Enable tax (PPN 11%)
      await page.click('[data-testid="tax-toggle"]')

      // Verify tax calculation
      const taxAmount = await page
        .locator('[data-testid="tax-amount"]')
        .textContent()
      const expectedTax = subtotalAmount * 0.11
      const actualTax = parseFloat(taxAmount?.replace(/[^0-9]/g, '') || '0')

      expect(Math.abs(actualTax - expectedTax)).toBeLessThan(1) // Allow 1 rupiah difference due to rounding

      // Verify total includes tax
      const totalAmount = await page
        .locator('[data-testid="total-amount"]')
        .textContent()
      const actualTotal = parseFloat(totalAmount?.replace(/[^0-9]/g, '') || '0')
      const expectedTotal = subtotalAmount + expectedTax

      expect(Math.abs(actualTotal - expectedTotal)).toBeLessThan(1)

      console.log('✅ Tax calculation (11%) verified correctly')
    })

    test('Transaksi dengan opsi Tanpa Pajak tidak menambahkan komponen pajak', async ({
      page,
    }) => {
      // Add product to cart
      const productButton = page.locator('[data-testid="product-item"]').first()
      await productButton.click()

      // Ensure tax is disabled
      const taxToggle = page.locator('[data-testid="tax-toggle"]')
      if (await taxToggle.isChecked()) {
        await taxToggle.click()
      }

      // Verify no tax component
      await expect(page.locator('[data-testid="tax-amount"]')).toHaveText(
        'Rp 0'
      )

      // Verify subtotal equals total
      const subtotal = await page
        .locator('[data-testid="subtotal"]')
        .textContent()
      const total = await page
        .locator('[data-testid="total-amount"]')
        .textContent()

      expect(subtotal).toBe(total)

      console.log('✅ No tax scenario verified correctly')
    })

    test('Transaksi dengan opsi Termasuk Pajak menunjukkan pemisahan pajak dengan benar', async ({
      page,
    }) => {
      // Add product to cart
      const productButton = page.locator('[data-testid="product-item"]').first()
      await productButton.click()

      // Enable "Tax Inclusive" option
      await page.click('[data-testid="tax-inclusive-toggle"]')

      // Verify tax separation is shown correctly
      const totalAmount = await page
        .locator('[data-testid="total-amount"]')
        .textContent()
      const taxInclusiveAmount = await page
        .locator('[data-testid="tax-inclusive-amount"]')
        .textContent()
      const baseAmount = await page
        .locator('[data-testid="base-amount"]')
        .textContent()

      const total = parseFloat(totalAmount?.replace(/[^0-9]/g, '') || '0')
      const taxInclusive = parseFloat(
        taxInclusiveAmount?.replace(/[^0-9]/g, '') || '0'
      )
      const base = parseFloat(baseAmount?.replace(/[^0-9]/g, '') || '0')

      // Verify: base + tax = total
      expect(Math.abs(base + taxInclusive - total)).toBeLessThan(1)

      console.log('✅ Tax inclusive calculation verified correctly')
    })
  })

  test.describe('Fitur Lainnya', () => {
    test('Transaksi berhasil menggunakan Diskon nominal dan total terpotong dengan benar', async ({
      page,
    }) => {
      // Add product to cart
      const productButton = page.locator('[data-testid="product-item"]').first()
      await productButton.click()

      // Get subtotal before discount
      const subtotalBefore = await page
        .locator('[data-testid="subtotal"]')
        .textContent()
      const subtotalAmount = parseFloat(
        subtotalBefore?.replace(/[^0-9]/g, '') || '0'
      )

      // Apply nominal discount (e.g., 10000)
      await page.click('[data-testid="discount-toggle"]')
      await page.selectOption('[data-testid="discount-type"]', 'nominal')
      await page.fill('[data-testid="discount-amount"]', '10000')

      // Verify discount is applied
      const discountAmount = await page
        .locator('[data-testid="discount-value"]')
        .textContent()
      expect(discountAmount).toContain('10000')

      // Verify total is reduced by discount
      const totalAmount = await page
        .locator('[data-testid="total-amount"]')
        .textContent()
      const actualTotal = parseFloat(totalAmount?.replace(/[^0-9]/g, '') || '0')
      const expectedTotal = subtotalAmount - 10000

      expect(Math.abs(actualTotal - expectedTotal)).toBeLessThan(1)

      console.log('✅ Nominal discount applied correctly')
    })

    test('Transaksi berhasil menggunakan Diskon persen dan total terpotong dengan benar', async ({
      page,
    }) => {
      // Add product to cart
      const productButton = page.locator('[data-testid="product-item"]').first()
      await productButton.click()

      // Get subtotal before discount
      const subtotalBefore = await page
        .locator('[data-testid="subtotal"]')
        .textContent()
      const subtotalAmount = parseFloat(
        subtotalBefore?.replace(/[^0-9]/g, '') || '0'
      )

      // Apply percentage discount (e.g., 10%)
      await page.click('[data-testid="discount-toggle"]')
      await page.selectOption('[data-testid="discount-type"]', 'percentage')
      await page.fill('[data-testid="discount-amount"]', '10')

      // Verify discount is applied
      const expectedDiscountAmount = subtotalAmount * 0.1
      const discountValue = await page
        .locator('[data-testid="discount-value"]')
        .textContent()
      const actualDiscountAmount = parseFloat(
        discountValue?.replace(/[^0-9]/g, '') || '0'
      )

      expect(
        Math.abs(actualDiscountAmount - expectedDiscountAmount)
      ).toBeLessThan(1)

      // Verify total is reduced by discount percentage
      const totalAmount = await page
        .locator('[data-testid="total-amount"]')
        .textContent()
      const actualTotal = parseFloat(totalAmount?.replace(/[^0-9]/g, '') || '0')
      const expectedTotal = subtotalAmount - expectedDiscountAmount

      expect(Math.abs(actualTotal - expectedTotal)).toBeLessThan(1)

      console.log('✅ Percentage discount applied correctly')
    })

    test('Transaksi berhasil menambahkan Shipping Cost dan total bertambah dengan benar', async ({
      page,
    }) => {
      // Add product to cart
      const productButton = page.locator('[data-testid="product-item"]').first()
      await productButton.click()

      // Get subtotal before shipping
      const subtotalBefore = await page
        .locator('[data-testid="subtotal"]')
        .textContent()
      const subtotalAmount = parseFloat(
        subtotalBefore?.replace(/[^0-9]/g, '') || '0'
      )

      // Add shipping cost (e.g., 15000)
      await page.click('[data-testid="shipping-toggle"]')
      await page.fill('[data-testid="shipping-amount"]', '15000')

      // Verify shipping is added
      const shippingAmount = await page
        .locator('[data-testid="shipping-value"]')
        .textContent()
      expect(shippingAmount).toContain('15000')

      // Verify total includes shipping
      const totalAmount = await page
        .locator('[data-testid="total-amount"]')
        .textContent()
      const actualTotal = parseFloat(totalAmount?.replace(/[^0-9]/g, '') || '0')
      const expectedTotal = subtotalAmount + 15000

      expect(Math.abs(actualTotal - expectedTotal)).toBeLessThan(1)

      console.log('✅ Shipping cost added correctly')
    })

    test('Transaksi berhasil dengan memilih Pelanggan yang sudah terdaftar', async ({
      page,
    }) => {
      // Add product to cart
      const productButton = page.locator('[data-testid="product-item"]').first()
      await productButton.click()

      // Select registered customer
      await page.click('[data-testid="customer-select"]')
      await page.click('[data-testid="customer-option"]') // Select first customer

      // Verify customer is selected
      const selectedCustomer = await page
        .locator('[data-testid="selected-customer"]')
        .textContent()
      expect(selectedCustomer).not.toBe('Walk-In Customer')

      // Complete transaction
      await page.click('[data-testid="payment-button"]')
      await page.click('[data-testid="payment-cash"]')

      const totalAmount = await page
        .locator('[data-testid="total-amount"]')
        .textContent()
      await page.fill(
        '[data-testid="payment-amount"]',
        totalAmount?.replace(/[^0-9]/g, '') || '0'
      )

      await page.click('[data-testid="process-payment"]')

      // Verify transaction success with customer
      await expect(
        page.locator('[data-testid="transaction-success"]')
      ).toBeVisible()
      await expect(
        page.locator('[data-testid="receipt-customer"]')
      ).toBeVisible()

      console.log('✅ Transaction with registered customer completed')
    })

    test('Transaksi berhasil dengan Walk-In Customer (WIC)', async ({
      page,
    }) => {
      // Add product to cart
      const productButton = page.locator('[data-testid="product-item"]').first()
      await productButton.click()

      // Ensure Walk-In Customer is selected (default)
      const customerDisplay = await page
        .locator('[data-testid="selected-customer"]')
        .textContent()
      expect(customerDisplay).toContain('Walk-In Customer')

      // Complete transaction
      await page.click('[data-testid="payment-button"]')
      await page.click('[data-testid="payment-cash"]')

      const totalAmount = await page
        .locator('[data-testid="total-amount"]')
        .textContent()
      await page.fill(
        '[data-testid="payment-amount"]',
        totalAmount?.replace(/[^0-9]/g, '') || '0'
      )

      await page.click('[data-testid="process-payment"]')

      // Verify transaction success with WIC
      await expect(
        page.locator('[data-testid="transaction-success"]')
      ).toBeVisible()
      await expect(
        page.locator('[data-testid="receipt-customer"]')
      ).toContainText('Walk-In Customer')

      console.log('✅ Walk-In Customer transaction completed')
    })
  })

  test.describe('Shift Data Verification', () => {
    test('Semua transaksi tercatat dalam shift data dengan perhitungan yang benar', async ({
      page,
    }) => {
      // Perform multiple transactions
      const transactions = [
        { paymentMethod: 'cash', amount: 50000 },
        { paymentMethod: 'transfer', amount: 75000 },
        { paymentMethod: 'qris', amount: 100000 },
      ]

      let totalTransactionAmount = 0

      for (const transaction of transactions) {
        // Add product to cart
        const productButton = page
          .locator('[data-testid="product-item"]')
          .first()
        await productButton.click()

        // Complete transaction
        await page.click('[data-testid="payment-button"]')
        await page.click(`[data-testid="payment-${transaction.paymentMethod}"]`)

        await page.fill(
          '[data-testid="payment-amount"]',
          transaction.amount.toString()
        )
        await page.click('[data-testid="process-payment"]')

        // Wait for transaction to complete
        await expect(
          page.locator('[data-testid="transaction-success"]')
        ).toBeVisible()

        // Get actual transaction amount from receipt
        const receiptTotal = await page
          .locator('[data-testid="receipt-total"]')
          .textContent()
        const actualAmount = parseFloat(
          receiptTotal?.replace(/[^0-9]/g, '') || '0'
        )
        totalTransactionAmount += actualAmount

        // Start new transaction
        await page.click('[data-testid="new-transaction"]')
      }

      // Navigate to shift summary
      await page.goto('/pos/shift-summary')
      await page.waitForLoadState('networkidle')

      // Verify shift data
      const shiftTotal = await page
        .locator('[data-testid="shift-total"]')
        .textContent()
      const shiftTotalAmount = parseFloat(
        shiftTotal?.replace(/[^0-9]/g, '') || '0'
      )

      expect(Math.abs(shiftTotalAmount - totalTransactionAmount)).toBeLessThan(
        1
      )

      // Verify transaction count
      const transactionCount = await page
        .locator('[data-testid="transaction-count"]')
        .textContent()
      expect(transactionCount).toContain(transactions.length.toString())

      // Verify payment method breakdown
      for (const transaction of transactions) {
        const methodTotalElement = page.locator(
          `[data-testid="shift-${transaction.paymentMethod}-total"]`
        )
        await expect(methodTotalElement).toBeVisible()
      }

      console.log('✅ Shift data verification completed successfully')
    })

    test('Summary data sesuai dengan transaksi yang dilakukan', async ({
      page,
    }) => {
      // Perform a complex transaction with tax, discount, and shipping
      const productButton = page.locator('[data-testid="product-item"]').first()
      await productButton.click()

      // Apply tax (11%)
      await page.click('[data-testid="tax-toggle"]')

      // Apply discount (10%)
      await page.click('[data-testid="discount-toggle"]')
      await page.selectOption('[data-testid="discount-type"]', 'percentage')
      await page.fill('[data-testid="discount-amount"]', '10')

      // Add shipping
      await page.click('[data-testid="shipping-toggle"]')
      await page.fill('[data-testid="shipping-amount"]', '10000')

      // Get transaction breakdown
      const subtotal = parseFloat(
        (await page.locator('[data-testid="subtotal"]').textContent())?.replace(
          /[^0-9]/g,
          ''
        ) || '0'
      )
      const taxAmount = parseFloat(
        (
          await page.locator('[data-testid="tax-amount"]').textContent()
        )?.replace(/[^0-9]/g, '') || '0'
      )
      const discountAmount = parseFloat(
        (
          await page.locator('[data-testid="discount-value"]').textContent()
        )?.replace(/[^0-9]/g, '') || '0'
      )
      const shippingAmount = parseFloat(
        (
          await page.locator('[data-testid="shipping-value"]').textContent()
        )?.replace(/[^0-9]/g, '') || '0'
      )
      const totalAmount = parseFloat(
        (
          await page.locator('[data-testid="total-amount"]').textContent()
        )?.replace(/[^0-9]/g, '') || '0'
      )

      // Verify calculation
      const expectedTotal =
        subtotal + taxAmount - discountAmount + shippingAmount
      expect(Math.abs(totalAmount - expectedTotal)).toBeLessThan(1)

      // Complete transaction
      await page.click('[data-testid="payment-button"]')
      await page.click('[data-testid="payment-cash"]')
      await page.fill('[data-testid="payment-amount"]', totalAmount.toString())
      await page.click('[data-testid="process-payment"]')

      // Navigate to detailed summary
      await page.goto('/pos/detailed-summary')
      await page.waitForLoadState('networkidle')

      // Verify detailed breakdown in summary
      await expect(
        page.locator('[data-testid="summary-subtotal"]')
      ).toContainText(subtotal.toString())
      await expect(page.locator('[data-testid="summary-tax"]')).toContainText(
        taxAmount.toString()
      )
      await expect(
        page.locator('[data-testid="summary-discount"]')
      ).toContainText(discountAmount.toString())
      await expect(
        page.locator('[data-testid="summary-shipping"]')
      ).toContainText(shippingAmount.toString())
      await expect(page.locator('[data-testid="summary-total"]')).toContainText(
        totalAmount.toString()
      )

      console.log('✅ Detailed summary verification completed successfully')
    })
  })
})
