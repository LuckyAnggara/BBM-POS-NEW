'use client'
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import {
  Dialog, // Keep for dialogs not yet refactored or for simplicity
  // ... other dialog imports
} from '@/components/ui/dialog'
// Import new components
import { PosHeader } from '@/components/pos/PosHeader'
import { ProductDisplay } from '@/components/pos/ProductDisplay'
import { SaleSummaryPanel } from '@/components/pos/SaleSummaryPanel'
// Import Dialog components (example)
import { StartShiftDialog } from '@/components/pos/StartShiftDialog'
import { EndShiftDialog } from '@/components/pos/EndShiftDialog'
// ... import other dialog components

// Other imports from original file...
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useBranch } from '@/contexts/branch-context'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { getInventoryItems } from '@/lib/appwrite/inventory'
import { getCustomers } from '@/lib/appwrite/customers'
import { BankAccount, getBankAccounts } from '@/lib/appwrite/bankAccounts'
import {
  startShift as startNewShift,
  getActiveShift,
  endShift,
  createPOSTransaction as recordTransaction,
  getTransactions as getTransactionsForShift,
  getTransactionById,
  type POSShift,
  type POSTransaction,
  type PaymentMethod,
} from '@/lib/appwrite/pos'
import type { InventoryItem } from '@/lib/appwrite/inventory'
import type { Customer } from '@/lib/appwrite/customers'
import { useRouter } from 'next/navigation'
import { CartItem } from '@/lib/appwrite/types'

export default function POSPage() {
  // -- GANTI BLOK STATE ANDA DENGAN YANG INI --
  // Ambil State dari Context
  const { selectedBranch } = useBranch()
  const { userData, currentUser } = useAuth()
  const router = useRouter()
  // General UI State
  const [posModeActive, setPosModeActive] = useState(false)

  // Shift Management State
  const [activeShift, setActiveShift] = useState<POSShift | null>(null)
  const [loadingShift, setLoadingShift] = useState(true)
  const [isEndingShift, setIsEndingShift] = useState(false)
  const [endShiftCalculations, setEndShiftCalculations] = useState<{
    expectedCash: number
    totalSalesByPaymentMethod: Record<PaymentMethod, number>
  } | null>(null)



  // Bank & Transfer State
  const [availableBankAccounts, setAvailableBankAccounts] = useState<
    BankAccount[]
  >([])
  const [loadingBankAccounts, setLoadingBankAccounts] = useState(false)
  const [selectedBankName, setSelectedBankName] = useState<string>('')
  const [bankRefNumberInput, setBankRefNumberInput] = useState('')
  const [customerNameInputBank, setCustomerNameInputBank] = useState('')

  // Cash Payment State
  const [cashAmountPaidInput, setCashAmountPaidInput] = useState('')
  const [customerNameInputCash, setCustomerNameInputCash] = useState('')
  const [calculatedChange, setCalculatedChange] = useState<number | null>(null)

  // Transaction & History State
  const [shiftTransactions, setShiftTransactions] = useState<POSTransaction[]>(
    []
  )
  const [loadingShiftTransactions, setLoadingShiftTransactions] =
    useState(false)
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(
    null
  )

  // Dialog & Modal Visibility State
  const [showStartShiftModal, setShowStartShiftModal] = useState(false)
  const [showEndShiftModal, setShowEndShiftModal] = useState(false)
  const [showPrintInvoiceDialog, setShowPrintInvoiceDialog] = useState(false)
  const [showCashPaymentModal, setShowCashPaymentModal] = useState(false)
  const [showBankPaymentModal, setShowBankPaymentModal] = useState(false)
  const [showScanCustomerDialog, setShowScanCustomerDialog] = useState(false)
  const [showBankHistoryDialog, setShowBankHistoryDialog] = useState(false)
  const [showShiftCashDetailsDialog, setShowShiftCashDetailsDialog] =
    useState(false)
  const [showAllShiftTransactionsDialog, setShowAllShiftTransactionsDialog] =
    useState(false)
  const [isItemDiscountDialogOpen, setIsItemDiscountDialogOpen] =
    useState(false)

  // Item Discount Dialog State
  const [selectedItemForDiscount, setSelectedItemForDiscount] =
    useState<CartItem | null>(null)
  const [currentDiscountType, setCurrentDiscountType] = useState<
    'nominal' | 'percentage'
  >('nominal')
  const [currentDiscountValue, setCurrentDiscountValue] = useState<string>('')

  // -- AKHIR DARI BLOK STATE --



  // =================================================================
  // 3. FUNGSI DAN EVENT HANDLER (didefinisikan dengan useCallback)
  // =================================================================

  /**
   * Mengambil data pelanggan dan rekening bank untuk cabang yang dipilih.
   */


  /**
   * Mengambil riwayat transaksi untuk shift yang sedang aktif.
   */
  const fetchShiftTransactions = useCallback(async () => {
    if (activeShift && selectedBranch) {
      setLoadingShiftTransactions(true)
      try {
        const transactions = await getTransactionsForShift(
          selectedBranch.id,
          activeShift.id
        )
        setShiftTransactions(transactions)
      } catch (error) {
        console.error('Error fetching shift transactions:', error)
        toast.error('Gagal memuat riwayat shift.')
      } finally {
        setLoadingShiftTransactions(false)
      }
    } else {
      setShiftTransactions([])
    }
  }, [activeShift, selectedBranch])

  /**
   * Memeriksa apakah ada shift aktif untuk pengguna dan cabang saat ini saat halaman dimuat.
   */
  const checkForActiveShift = useCallback(async () => {
    if (!currentUser || !selectedBranch) {
      setActiveShift(null)
      setLoadingShift(false)
      return
    }
    setLoadingShift(true)
    const shift = await getActiveShift(currentUser.$id, selectedBranch.id)
    setActiveShift(shift)
    setLoadingShift(false)
  }, [currentUser, selectedBranch])

  /**
   * Menangani proses memulai shift baru dengan modal awal.
   */
  const handleStartShift = useCallback(
    async (initialCash: number) => {
      if (!currentUser || !selectedBranch) {
        toast.error('Kesalahan', {
          description: 'Pengguna atau cabang tidak valid.',
        })
        return
      }
      const result = await startNewShift(
        currentUser.$id,
        selectedBranch.id,
        initialCash
      )
      if ('error' in result) {
        toast.error('Gagal Memulai Shift', { description: result.error })
      } else {
        setActiveShift(result)
        setShowStartShiftModal(false)
        toast.success('Shift Dimulai', {
          description: `Shift dimulai dengan modal awal ${
            selectedBranch.currency
          }${initialCash.toLocaleString()}`,
        })
      }
    },
    [currentUser, selectedBranch]
  )

  /**
   * Menyiapkan dan menampilkan kalkulasi untuk proses akhir shift.
   */
  const prepareEndShiftCalculations = useCallback(async () => {
    if (!activeShift) return
    setIsEndingShift(true)
    await fetchShiftTransactions()
    // Gunakan callback di setState untuk memastikan kita mendapatkan state terbaru dari shiftTransactions
    setShiftTransactions((currentShiftTransactions) => {
      const salesByPayment: Record<PaymentMethod, number> = {
        cash: 0,
        card: 0,
        transfer: 0,
        qris: 0,
      }
      currentShiftTransactions.forEach((tx) => {
        if (
          tx.status === 'completed' &&
          (tx.paymentTerms === 'cash' ||
            tx.paymentTerms === 'card' ||
            tx.paymentTerms === 'transfer')
        ) {
          const paymentMethodForShift = tx.paymentTerms as PaymentMethod
          salesByPayment[paymentMethodForShift] =
            (salesByPayment[paymentMethodForShift] || 0) + tx.totalAmount
        }
      })

      const expected = (activeShift.initialCash || 0) + salesByPayment.cash
      setEndShiftCalculations({
        expectedCash: expected,
        totalSalesByPaymentMethod: salesByPayment,
      })
      return currentShiftTransactions
    })

    setShowEndShiftModal(true)
    setIsEndingShift(false)
  }, [activeShift, fetchShiftTransactions])

  /**
   * Mengkonfirmasi dan menyelesaikan proses akhir shift.
   */
  const handleEndShiftConfirm = useCallback(
    async (actualCash: number) => {
      if (!activeShift || endShiftCalculations === null) return

      setIsEndingShift(true)
      const result = await endShift(activeShift.id)

      if (result && 'error' in result) {
        toast.error('Gagal Mengakhiri Shift', { description: result.error })
      } else {
        toast.success('Shift Diakhiri', {
          description: 'Data shift telah disimpan.',
        })
        setActiveShift(null)
        setEndShiftCalculations(null)
        setShowEndShiftModal(false)
        setCartItems([])
        setShiftTransactions([])
      }
      setIsEndingShift(false)
    },
    [activeShift, endShiftCalculations]
  )

  const resetSaleState = useCallback(() => {
    setCartItems([])
    setSelectedPaymentTerms('cash')
    setShippingCostInput('')
    setVoucherCodeInput('')
    setVoucherDiscountInput('')
    setSelectedCustomerId(undefined)
    setCreditDueDate(undefined)
    setCustomerSearchTerm('')
    setCashAmountPaidInput('')
    setCustomerNameInputCash('')
    setCalculatedChange(null)
    setSelectedBankName('')
    setBankRefNumberInput('')
    setCustomerNameInputBank('')
    fetchPOSProducts(1, 'reset')
  }, [fetchPOSProducts])

  const processTransactionResult = useCallback(
    (result: { id: string } | { error: string }) => {
      if ('error' in result || !result.id) {
        toast.error('Gagal Merekam Transaksi', {
          description:
            (result as { error: string }).error ||
            'ID transaksi tidak ditemukan.',
        })
        setLastTransactionId(null)
      } else {
        toast.success('Transaksi Berhasil', {
          description: 'Penjualan telah direkam.',
        })
        setLastTransactionId(result.id)
        setShowPrintInvoiceDialog(true)
        resetSaleState()
      }
    },
    [resetSaleState]
  )

  /**
   * Menangani penyelesaian penjualan untuk pembayaran tunai.
   */
  const handleConfirmCashPayment = useCallback(async () => {
    if (!activeShift || !selectedBranch || !currentUser) return

    const amountPaidNum = parseFloat(cashAmountPaidInput)
    if (isNaN(amountPaidNum) || amountPaidNum < total) {
      toast.error('Pembayaran Tidak Cukup', {
        description: 'Jumlah yang dibayar kurang dari total belanja.',
      })
      return
    }

    setIsProcessingSale(true)
    const transactionData = {
      shiftId: activeShift.id,
      branchId: selectedBranch.id,
      userId: currentUser.$id,
      items: cartItems,
      subtotal: subtotalAfterItemDiscounts,
      taxAmount: tax,
      shippingCost: shippingCost,
      voucherCode: voucherCodeInput || undefined,
      voucherDiscountAmount: voucherDiscount,
      totalDiscountAmount,
      totalAmount: total,
      totalCost,
      paymentTerms: 'cash' as PaymentMethod,
      amountPaid: amountPaidNum,
      changeGiven: amountPaidNum - total,
      customerName: customerNameInputCash.trim() || undefined,
    }

    const result = await recordTransaction(transactionData, userData?.name)
    setIsProcessingSale(false)
    setShowCashPaymentModal(false)
    processTransactionResult(result)
  }, [
    activeShift,
    selectedBranch,
    currentUser,
    cashAmountPaidInput,
    total,
    cartItems,
    subtotalAfterItemDiscounts,
    tax,
    shippingCost,
    voucherCodeInput,
    voucherDiscount,
    totalDiscountAmount,
    totalCost,
    customerNameInputCash,
    userData,
    processTransactionResult,
  ])

  /**
   * Menangani penyelesaian penjualan untuk pembayaran transfer bank.
   */
  const handleConfirmBankPayment = useCallback(async () => {
    if (
      !activeShift ||
      !selectedBranch ||
      !currentUser ||
      !selectedBankName ||
      !bankRefNumberInput.trim()
    ) {
      toast.error('Data Tidak Lengkap', {
        description: 'Pastikan bank dan nomor referensi telah diisi.',
      })
      return
    }
    setIsProcessingSale(true)
    const transactionData = {
      shiftId: activeShift.id,
      branchId: selectedBranch.id,
      userId: currentUser.$id,
      items: cartItems,
      subtotal: subtotalAfterItemDiscounts,
      taxAmount: tax,
      shippingCost: shippingCost,
      voucherCode: voucherCodeInput || undefined,
      voucherDiscountAmount: voucherDiscount,
      totalDiscountAmount,
      totalAmount: total,
      totalCost,
      paymentTerms: 'transfer' as PaymentMethod,
      amountPaid: total,
      changeGiven: 0,
      customerName: customerNameInputBank.trim() || undefined,
      bankName: selectedBankName,
      bankTransactionRef: bankRefNumberInput.trim(),
    }

    const result = await recordTransaction(transactionData, userData?.name)
    setIsProcessingSale(false)
    setShowBankPaymentModal(false)
    processTransactionResult(result)
  }, [
    activeShift,
    selectedBranch,
    currentUser,
    selectedBankName,
    bankRefNumberInput,
    cartItems,
    subtotalAfterItemDiscounts,
    tax,
    shippingCost,
    voucherCodeInput,
    voucherDiscount,
    totalDiscountAmount,
    total,
    totalCost,
    customerNameInputBank,
    userData,
    processTransactionResult,
  ])

  /**
   * Mengarahkan alur penyelesaian penjualan berdasarkan metode pembayaran yang dipilih.
   */
  const handleCompleteSale = useCallback(async () => {
    if (
      !activeShift ||
      !selectedBranch ||
      !currentUser ||
      cartItems.length === 0
    ) {
      toast.error('Tidak Dapat Memproses', {
        description: 'Pastikan shift aktif dan keranjang tidak kosong.',
      })
      return
    }

    if (selectedPaymentTerms === 'cash') {
      setCashAmountPaidInput(total.toString())
      setCustomerNameInputCash('')
      setCalculatedChange(0)
      setShowCashPaymentModal(true)
      return
    }
    if (selectedPaymentTerms === 'transfer') {
      setShowBankPaymentModal(true)
      return
    }

    // Penanganan untuk Kartu dan Kredit
    let customerNameForTx: string | undefined = undefined
    if (selectedPaymentTerms === 'credit') {
      if (!selectedCustomerId || !creditDueDate) {
        toast.error('Data Kredit Tidak Lengkap', {
          description: 'Pilih pelanggan dan tanggal jatuh tempo.',
        })
        return
      }
      customerNameForTx = allCustomers.find(
        (c) => c.id === selectedCustomerId
      )?.name
    }

    setIsProcessingSale(true)
    const transactionData = {
      shiftId: activeShift.id,
      branchId: selectedBranch.id,
      userId: currentUser.$id,
      items: cartItems,
      subtotal: subtotalAfterItemDiscounts,
      taxAmount: tax,
      shippingCost: shippingCost,
      voucherCode: voucherCodeInput || undefined,
      voucherDiscountAmount: voucherDiscount,
      totalDiscountAmount,
      totalAmount: total,
      totalCost,
      paymentTerms: selectedPaymentTerms,
      amountPaid: selectedPaymentTerms === 'credit' ? 0 : total,
      changeGiven: 0,
      customerId:
        selectedPaymentTerms === 'credit' ? selectedCustomerId : undefined,
      customerName: customerNameForTx,
      creditDueDate:
        selectedPaymentTerms === 'credit' && creditDueDate
          ? creditDueDate.toISOString()
          : undefined,
      isCreditSale: selectedPaymentTerms === 'credit',
      outstandingAmount: selectedPaymentTerms === 'credit' ? total : 0,
      paymentStatus:
        selectedPaymentTerms === 'credit'
          ? ('unpaid' as const)
          : ('paid' as const),
    }
    const result = await recordTransaction(transactionData, userData?.name)
    setIsProcessingSale(false)
    processTransactionResult(result)
  }, [
    activeShift,
    selectedBranch,
    currentUser,
    cartItems,
    selectedPaymentTerms,
    total,
    creditDueDate,
    selectedCustomerId,
    allCustomers,
    subtotalAfterItemDiscounts,
    tax,
    shippingCost,
    voucherCodeInput,
    voucherDiscount,
    totalDiscountAmount,
    totalCost,
    userData,
    processTransactionResult,
  ])

  /**
   * Menangani permintaan cetak invoice, baik ke printer lokal maupun membuka tab baru.
   */
  const handlePrintInvoice = useCallback(
    async (transactionIdToPrint?: string) => {
      const targetTransactionId = transactionIdToPrint || lastTransactionId
      if (
        !targetTransactionId ||
        !selectedBranch ||
        !currentUser ||
        !userData
      ) {
        toast.error('Data Tidak Lengkap', {
          description: 'Tidak dapat mencetak invoice.',
        })
        return
      }

      // Logika untuk mengirim ke printer lokal atau membuka di tab baru
      // ... (Logika handlePrintInvoice dari file asli Anda bisa ditempatkan di sini) ...

      toast.info('Membuka Invoice', {
        description: 'Membuka invoice di tab baru.',
      })
      window.open(`/invoice/${targetTransactionId}/view`, '_blank')

      setShowPrintInvoiceDialog(false)
      setLastTransactionId(null)
    },
    [lastTransactionId, selectedBranch, currentUser, userData]
  )

  /**
   * Wrapper untuk mencetak ulang invoice dari riwayat.
   */
  const handlePrintInvoiceFromHistory = useCallback(
    (transactionId: string) => {
      handlePrintInvoice(transactionId)
    },
    [handlePrintInvoice]
  )

  /**
   * Menangani hasil pemindaian QR code pelanggan.
   */
  const handleScanCustomerSuccess = useCallback(
    (scannedId: string) => {
      const foundCustomer = allCustomers.find(
        (c) => c.id === scannedId || c.qrCodeId === scannedId
      )
      if (foundCustomer) {
        setSelectedCustomerId(foundCustomer.id)
        setCustomerSearchTerm(foundCustomer.name)
        setSelectedPaymentTerms('credit')
        toast.success('Pelanggan Ditemukan', {
          description: `Pelanggan "${foundCustomer.name}" dipilih.`,
        })
      } else {
        toast.error('Pelanggan Tidak Ditemukan', {
          description: 'ID pelanggan dari QR code tidak terdaftar.',
        })
      }
      setShowScanCustomerDialog(false)
    },
    [allCustomers]
  )
  if (loadingShift) {
    return (
      <div className='flex h-screen items-center justify-center'>
        Memuat Mode POS...
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout focusMode={true}>
        <div className='flex flex-col h-screen bg-background'>
          <PosHeader
            selectedBranchName={selectedBranch?.name}
            activeShift={activeShift}
            isEndingShift={isEndingShift}
            onShowStartShiftModal={() => setShowStartShiftModal(true)}
            onPrepareEndShift={prepareEndShiftCalculations}
            onShowAllTransactions={() =>
              setShowAllShiftTransactionsDialog(true)
            }
            onShowCashInfo={() => setShowShiftCashDetailsDialog(true)}
            isUserAndBranchSelected={!!currentUser && !!selectedBranch}
          />

          <div className='flex flex-1 overflow-hidden'>
            <ResizablePanelGroup direction='horizontal'>
              <ResizablePanel defaultSize={65} minSize={30}>
                <ProductDisplay
                  activeShift={!!activeShift}
                  onAddToCart={handleAddToCart}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={35} minSize={35}>
                <SaleSummaryPanel
                  cartItems={cartItems}
                  activeShift={!!activeShift}
                  isProcessingSale={isProcessingSale}
                  taxRate={taxRate}
                  taxAmount={tax}
                  subtotal={subtotalAfterItemDiscounts}
                  totalDiscount={totalDiscountAmount}
                  total={total}
                  shippingCost={shippingCostInput}
                  voucherCode={voucherCodeInput}
                  voucherDiscount={voucherDiscountInput}
                  selectedPaymentTerms={selectedPaymentTerms}
                  selectedCustomerId={selectedCustomerId}
                  creditDueDate={creditDueDate}
                  allCustomers={allCustomers}
                  filteredCustomers={filteredCustomers}
                  loadingCustomers={loadingCustomers}
                  customerSearchTerm={customerSearchTerm}
                  isCustomerComboboxOpen={isCustomerComboboxOpen}
                  onUpdateCartQuantity={handleUpdateCartQuantity}
                  onRemoveFromCart={handleRemoveFromCart}
                  onOpenItemDiscountDialog={handleOpenItemDiscountDialog}
                  onSetShippingCost={setShippingCostInput}
                  onSetVoucherCode={setVoucherCodeInput}
                  onSetVoucherDiscount={setVoucherDiscountInput}
                  onSetSelectedPaymentTerms={setSelectedPaymentTerms}
                  onSetSelectedCustomerId={setSelectedCustomerId}
                  onSetCreditDueDate={setCreditDueDate}
                  onSetCustomerSearchTerm={setCustomerSearchTerm}
                  onSetIsCustomerComboboxOpen={setIsCustomerComboboxOpen}
                  onShowScanCustomerDialog={() =>
                    setShowScanCustomerDialog(true)
                  }
                  onCompleteSale={handleCompleteSale}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>

        {/* Dialogs are rendered here, using their new components */}
        <StartShiftDialog
          isOpen={showStartShiftModal}
          onOpenChange={setShowStartShiftModal}
          onConfirm={handleStartShift}
        />
        <EndShiftDialog
          isOpen={showEndShiftModal}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setEndShiftCalculations(null) // Penting untuk mereset kalkulasi saat dialog ditutup
            }
            setShowEndShiftModal(isOpen)
          }}
          onConfirm={handleEndShiftConfirm}
          calculations={endShiftCalculations}
          activeShift={activeShift}
          isEndingShift={isEndingShift}
        />
        {/* ... other dialog components */}

        
      </MainLayout>
    </ProtectedRoute>
  )
}
