'use client'

import { usePosLogic } from '@/hooks/usePosLogic'
import type { ViewMode } from '@/lib/types'
import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PosHeader from '@/components/pos/PosHeader'
import ProductGrid from '@/components/pos/ProductGrid'
import CartSummary from '@/components/pos/CartSummary'
import PaymentActions from '@/components/pos/PaymentActions'
import StartShiftModal from '@/components/pos/StartShiftModal'
import EndShiftModal from '@/components/pos/EndShiftModal'
import CashPaymentModal from '@/components/pos/CashPaymentModal'
import BankPaymentModal from '@/components/pos/BankPaymentModal'
import ItemDiscountModal from '@/components/pos/ItemDiscountModal'
import PrintInvoiceDialog from '@/components/pos/PrintInvoiceDialog'
import PosPagination from '@/components/pos/PosPagination' // Import komponen paginasi
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const LOCALSTORAGE_POS_VIEW_MODE_KEY = 'branchwise_posViewMode'

export default function POSPage() {
  const { toast } = useToast()
  const logic = usePosLogic()
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [showCreditConfirmation, setShowCreditConfirmation] = useState(false)

  useEffect(() => {
    const savedViewMode = localStorage.getItem(
      LOCALSTORAGE_POS_VIEW_MODE_KEY
    ) as ViewMode | null
    if (
      savedViewMode &&
      (savedViewMode === 'card' || savedViewMode === 'table')
    ) {
      setViewMode(savedViewMode)
    }
  }, [])

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem(LOCALSTORAGE_POS_VIEW_MODE_KEY, mode)
  }

  const handleCompleteSale = () => {
    if (logic.cartItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Keranjang Kosong',
        description: 'Tidak dapat melanjutkan, keranjang masih kosong.',
      })
      return
    }

    switch (logic.selectedPaymentMethod) {
      case 'cash':
        logic.setShowCashPaymentModal(true)
        break
      case 'transfer':
        logic.setShowBankPaymentModal(true)
        break
      case 'credit':
        if (!logic.selectedCustomerId) {
          toast({
            variant: 'destructive',
            title: 'Pelanggan Belum Dipilih',
            description: 'Pilih pelanggan untuk transaksi kredit.',
          })
          return
        }
        setShowCreditConfirmation(true)
        break
      default:
        toast({
          variant: 'destructive',
          title: 'Metode Tidak Valid',
          description: 'Metode pembayaran tidak dikenali.',
        })
    }
  }

  const onConfirmCreditSale = () => {
    logic.handleConfirmCreditSale()
    setShowCreditConfirmation(false)
  }

  if (logic.loadingShift) {
    return (
      <div className='flex h-screen items-center justify-center'>
        Memuat Mode POS...
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <PosHeader
        isEndingShift={logic.isEndingShift}
        currentUser={logic.currentUser}
        activeShift={logic.activeShift}
        prepareEndShiftCalculations={logic.prepareEndShiftCalculations}
        setShowStartShiftModal={logic.setShowStartShiftModal}
        setShowAllShiftTransactionsDialog={
          logic.setShowAllShiftTransactionsDialog
        }
        setShowShiftCashDetailsDialog={logic.setShowShiftCashDetailsDialog}
      />
      <div className='grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 h-screen bg-muted/40'>
        {/* Kolom Kiri - Produk */}
        <div className='lg:col-span-3 flex flex-col gap-4'>
          <div className='flex-grow'>
            <ProductGrid
              items={logic.items}
              loadingItems={logic.loadingItems}
              handleAddToCart={logic.handleAddToCart}
              viewMode={viewMode}
              currencySymbol={logic.currencySymbol}
            />
          </div>
          <PosPagination
            currentPage={logic.currentPage}
            totalPages={logic.totalPages}
            setCurrentPage={logic.setCurrentPage}
            itemsPerPage={logic.itemsPerPage}
            setItemsPerPage={logic.setItemsPerPage}
            totalItems={logic.totalItems}
          />
        </div>

        {/* Kolom Kanan - Keranjang & Pembayaran */}
        <div className='lg:col-span-2 flex flex-col gap-4'>
          <CartSummary
            cartItems={logic.cartItems}
            handleUpdateCartQuantity={logic.handleUpdateCartQuantity}
            handleRemoveFromCart={logic.handleRemoveFromCart}
            handleOpenItemDiscountDialog={logic.handleOpenItemDiscountDialog}
            subtotalAfterItemDiscounts={logic.subtotalAfterItemDiscounts}
            tax={logic.tax}
            shippingCost={logic.shippingCost}
            total={logic.total}
            currencySymbol={logic.currencySymbol}
          />
          <PaymentActions
            selectedPaymentMethod={logic.selectedPaymentMethod}
            setSelectedPaymentMethod={logic.setSelectedPaymentMethod}
            handleCompleteSale={handleCompleteSale}
            cartIsEmpty={logic.cartItems.length === 0}
          />
        </div>
      </div>

      {/* Semua Modal dan Dialog */}
      <StartShiftModal
        show={logic.showStartShiftModal}
        onClose={() => logic.setShowStartShiftModal(false)}
        initialCashInput={logic.initialCashInput}
        setInitialCashInput={logic.setInitialCashInput}
        handleStartShift={logic.handleStartShift}
        currencySymbol={logic.currencySymbol}
      />
      <EndShiftModal
        show={logic.showEndShiftModal}
        onClose={() => logic.setShowEndShiftModal(false)}
        isEndingShift={logic.isEndingShift}
        endShiftCalculations={logic.endShiftCalculations}
        actualCashAtEndInput={logic.actualCashAtEndInput}
        setActualCashAtEndInput={logic.setActualCashAtEndInput}
        handleEndShiftConfirm={logic.handleEndShiftConfirm}
        currencySymbol={logic.currencySymbol}
      />
      <CashPaymentModal
        show={logic.showCashPaymentModal}
        onClose={() => logic.setShowCashPaymentModal(false)}
        total={logic.total}
        cashAmountPaidInput={logic.cashAmountPaidInput}
        setCashAmountPaidInput={logic.setCashAmountPaidInput}
        calculatedChange={logic.calculatedChange}
        handleConfirmCashPayment={logic.handleConfirmCashPayment}
        isProcessingSale={logic.isProcessingSale}
        currencySymbol={logic.currencySymbol}
      />
      <BankPaymentModal
        show={logic.showBankPaymentModal}
        onClose={() => logic.setShowBankPaymentModal(false)}
        total={logic.total}
        availableBankAccounts={logic.availableBankAccounts}
        selectedBankAccountId={logic.selectedbank_name}
        setSelectedBankAccountId={logic.setSelectedbank_name}
        bankRefNumberInput={logic.bankRefNumberInput}
        setBankRefNumberInput={logic.setBankRefNumberInput}
        handleConfirmBankPayment={logic.handleConfirmBankPayment}
        isProcessingSale={logic.isProcessingSale}
        currencySymbol={logic.currencySymbol}
      />
      <ItemDiscountModal
        show={logic.isItemDiscountDialogOpen}
        onClose={() => logic.setIsItemDiscountDialogOpen(false)}
        selectedItem={logic.selectedItemForDiscount}
        discountType={logic.currentDiscountType}
        setDiscountType={logic.setCurrentDiscountType}
        discountValue={logic.currentDiscountValue}
        setDiscountValue={logic.setCurrentDiscountValue}
        handleConfirmItemDiscount={logic.handleConfirmItemDiscount}
        handleRemoveCurrentItemDiscount={logic.handleRemoveCurrentItemDiscount}
        currencySymbol={logic.currencySymbol}
        previewDiscountedPrice={
          logic.calculateDiscountedPrice().discountedPrice
        }
        previewActualDiscountAmount={
          logic.calculateDiscountedPrice().actualDiscountAmount
        }
      />
      <PrintInvoiceDialog
        show={logic.showPrintInvoiceDialog}
        onClose={() => logic.setShowPrintInvoiceDialog(false)}
        onConfirm={() => logic.handlePrintInvoice()}
        isPrinting={logic.isPrinting}
      />
      <AlertDialog
        open={showCreditConfirmation}
        onOpenChange={setShowCreditConfirmation}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Penjualan Kredit</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan mencatat penjualan ini sebagai kredit untuk pelanggan
              terpilih. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmCreditSale}>
              Ya, Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  )
}
