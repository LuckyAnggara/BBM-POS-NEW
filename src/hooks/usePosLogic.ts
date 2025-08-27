import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useBranches } from '@/contexts/branch-context'
import { useToast } from '@/hooks/use-toast'
import {
  startShift,
  getActiveShift,
  endShift,
} from '@/lib/laravel/shiftService'

import { createSale, listSales, getSaleById } from '@/lib/laravel/saleService'
import { listProducts } from '@/lib/laravel/product'
import { listCustomers, getCustomerById } from '@/lib/laravel/customers'
import { listBankAccounts } from '@/lib/laravel/bankAccounts'
import type {
  Shift,
  Sale,
  CreateSalePayload,
  CartItem,
  PaymentMethod,
  Product,
  Customer,
  BankAccount,
} from '@/lib/types'
import { useDebounce } from '@uidotdev/usehooks'
import { toast } from 'sonner'

const ITEMS_PER_PAGE_OPTIONS = [12, 24, 36, 48]

export const usePosLogic = () => {
  const { selectedBranch } = useBranches()
  const { userData, currentUser } = useAuth()
  const router = useRouter()

  const [activeShift, setActiveShift] = useState<Shift | null>(null)
  const [loadingShift, setLoadingShift] = useState(true)
  const [showStartShiftModal, setShowStartShiftModal] = useState(false)
  const [initialCashInput, setInitialCashInput] = useState('')

  const [showEndShiftModal, setShowEndShiftModal] = useState(false)
  const [actualCashAtEndInput, setActualCashAtEndInput] = useState('')
  const [endShiftCalculations, setEndShiftCalculations] = useState<{
    expectedCash: number
    totalSalesByPaymentMethod: Record<PaymentMethod, number>
    totalSales: number
  } | null>(null)
  const [endingCashBalance, setEndingCashBalance] = useState(0)
  const [isEndingShift, setIsEndingShift] = useState(false)

  const [items, setItems] = useState<Product[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    ITEMS_PER_PAGE_OPTIONS[0]
  )
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const [debouncedSearchTerm] = useDebounce(searchTerm, 1000)

  const [currentPage, setCurrentPage] = useState(1)

  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>('cash')
  const [isProcessingSale, setIsProcessingSale] = useState(false)

  const [lastTransactionId, setLastTransactionId] = useState<number | null>(
    null
  )
  const [showPrintInvoiceDialog, setShowPrintInvoiceDialog] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  const [showCashPaymentModal, setShowCashPaymentModal] = useState(false)
  const [cashAmountPaidInput, setCashAmountPaidInput] = useState('')
  const [calculatedChange, setCalculatedChange] = useState<number | null>(null)

  const [allCustomers, setAllCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [selectedCustomerId, setSelectedCustomerId] = useState<
    string | undefined
  >(undefined)
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [debouncedSearchCustomer] = useDebounce(customerSearchTerm, 1000)

  const [availableBankAccounts, setAvailableBankAccounts] = useState<
    BankAccount[]
  >([])
  const [loadingBankAccounts, setLoadingBankAccounts] = useState(false)
  const [showBankPaymentModal, setShowBankPaymentModal] = useState(false)
  const [selectedbank_name, setSelectedbank_name] = useState<string>('')
  const [bankRefNumberInput, setBankRefNumberInput] = useState('')

  const [shiftTransactions, setShiftTransactions] = useState<Sale[]>([])
  const [loadingShiftTransactions, setLoadingShiftTransactions] =
    useState(false)

  const [shippingCostInput, setShippingCostInput] = useState('')
  const [voucherDiscountInput, setVoucherDiscountInput] = useState('')

  const [isItemDiscountDialogOpen, setIsItemDiscountDialogOpen] =
    useState(false)
  const [selectedItemForDiscount, setSelectedItemForDiscount] =
    useState<CartItem | null>(null)
  const [currentDiscountType, setCurrentDiscountType] = useState<
    'nominal' | 'percentage'
  >('nominal')
  const [currentDiscountValue, setCurrentDiscountValue] = useState<string>('')

  const currencySymbol =
    selectedBranch?.currency === 'IDR' ? 'Rp' : selectedBranch?.currency || '$'
  const tax_rate = selectedBranch?.tax_rate
    ? selectedBranch.tax_rate / 100
    : 0.0

  const fetchBankAccounts = useCallback(async () => {
    if (!selectedBranch) {
      setAvailableBankAccounts([])
      setLoadingBankAccounts(false)
      return
    }
    setLoadingBankAccounts(true)
    try {
      const result = await listBankAccounts(selectedBranch.id)
      setAvailableBankAccounts(result)
    } catch (error) {
      toast.error('Gagal Memuat Data', {
        description: 'Tidak dapat memuat rekening bank.',
      })
    } finally {
      setLoadingBankAccounts(false)
    }
  }, [selectedBranch, toast])

  const fetchItemsData = useCallback(
    async (page: number, currentSearchTerm: string) => {
      if (!selectedBranch) {
        setItems([])
        setLoadingItems(false)
        setTotalItems(0)
        return
      }
      setLoadingItems(true)
      try {
        const options = {
          branchId: selectedBranch.id,
          limit: itemsPerPage,
          searchTerm: currentSearchTerm || undefined,
          page: page || 1,
        }
        const result = await listProducts(options)
        setItems(result.data)
        setTotalItems(result.total)
      } catch (error) {
        toast.error('Gagal Memuat Produk', {
          description: 'Terjadi kesalahan saat mengambil data produk.',
        })
      } finally {
        setLoadingItems(false)
      }
    },
    [selectedBranch, itemsPerPage, toast]
  )

  const fetchCustomers = useCallback(
    async (currentSearchTerm: string) => {
      if (!selectedBranch) {
        setAllCustomers([])
        setLoadingCustomers(false)
        return
      }
      setLoadingCustomers(true)
      try {
        const result = await listCustomers({
          branchId: selectedBranch.id,
          searchTerm: currentSearchTerm,
        })
        setAllCustomers(result.data)
      } catch (error) {
        toast.error('Gagal Memuat Pelanggan', {
          description: 'Tidak dapat memuat data pelanggan.',
        })
      } finally {
        setLoadingCustomers(false)
      }
    },
    [selectedBranch, toast]
  )

  const fetchShiftTransactions = useCallback(async (): Promise<Sale[]> => {
    if (activeShift && selectedBranch) {
      setLoadingShiftTransactions(true)
      try {
        const transactions = await listSales({
          branchId: String(selectedBranch.id),
          shiftId: String(activeShift.id),
        })
        setShiftTransactions(transactions.data)
        return transactions.data
      } catch (error) {
        toast.error('Gagal Memuat Transaksi Shift', {
          description: 'Tidak dapat mengambil data transaksi untuk shift ini.',
        })
        setShiftTransactions([])
        return []
      } finally {
        setLoadingShiftTransactions(false)
      }
    } else {
      setShiftTransactions([])
      return []
    }
  }, [activeShift, selectedBranch, toast])

  const checkForActiveShift = useCallback(async () => {
    if (!currentUser || !selectedBranch) {
      setActiveShift(null)
      setLoadingShift(false)
      return
    }
    setLoadingShift(true)
    try {
      const shift = await getActiveShift()
      setActiveShift(shift)
      if (shift) {
        setInitialCashInput(shift.starting_balance.toString())
      } else {
        setInitialCashInput('')
      }
    } catch (error) {
      toast.error('Gagal Memeriksa Shift', {
        description: 'Tidak dapat memeriksa status shift aktif.',
      })
      setActiveShift(null)
    } finally {
      setLoadingShift(false)
    }
  }, [currentUser, selectedBranch, toast])

  useEffect(() => {
    if (selectedBranch) {
      checkForActiveShift()
      fetchBankAccounts()
    }
  }, [selectedBranch, checkForActiveShift, fetchBankAccounts])

  useEffect(() => {
    if (selectedBranch) {
      fetchItemsData(currentPage, debouncedSearchTerm)
    }
  }, [currentPage, debouncedSearchTerm, selectedBranch, fetchItemsData])

  useEffect(() => {
    if (selectedBranch) {
      fetchCustomers(debouncedSearchCustomer)
    }
  }, [debouncedSearchCustomer, selectedBranch, fetchCustomers])

  useEffect(() => {
    if (activeShift) {
      fetchShiftTransactions()
    }
  }, [activeShift, lastTransactionId, fetchShiftTransactions])

  const handleStartShift = async () => {
    if (!currentUser || !selectedBranch) {
      toast.error('Kesalahan', {
        description: 'Pengguna atau cabang tidak valid.',
      })
      return
    }
    const cash = parseFloat(initialCashInput)
    if (isNaN(cash) || cash < 0) {
      toast.error('Input Tidak Valid', {
        description: 'Modal awal kas tidak valid.',
      })
      return
    }

    try {
      const result = await startShift({
        starting_balance: cash,
        branch_id: selectedBranch.id,
      })
      setActiveShift(result)
      setShowStartShiftModal(false)
      toast.success('Shift Dimulai', {
        description: `Shift dimulai dengan modal awal ${currencySymbol}${cash.toLocaleString()}`,
      })
      setInitialCashInput('')
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        'Terjadi kesalahan pada server. Silakan coba lagi.'
      toast.error('Gagal Memulai Shift', {
        description: errorMessage,
      })
    }
  }

  const prepareEndShiftCalculations = async () => {
    if (!activeShift) return
    setIsEndingShift(true)
    const currentShiftTransactions = await fetchShiftTransactions()

    const salesByPayment: Record<PaymentMethod, number> =
      currentShiftTransactions.reduce(
        (acc, tx) => {
          if (tx.status === 'completed') {
            acc[tx.payment_method] =
              (acc[tx.payment_method] || 0) + tx.total_amount
          }
          return acc
        },
        { cash: 0, credit: 0, card: 0, qris: 0, transfer: 0 }
      )

    const totalSales = Object.values(salesByPayment).reduce(
      (sum, value) => sum + value,
      0
    )

    const expected = (activeShift.starting_balance || 0) + salesByPayment.cash
    setEndingCashBalance(expected)
    setEndShiftCalculations({
      expectedCash: expected,
      totalSalesByPaymentMethod: salesByPayment,
      totalSales,
    })
    setShowEndShiftModal(true)
    setIsEndingShift(false)
  }

  const handleEndShiftConfirm = async () => {
    if (!activeShift || endShiftCalculations === null) return

    const actualCash = Number(actualCashAtEndInput)
    if (isNaN(actualCash) || actualCash < 0) {
      toast.error('Input Tidak Valid', {
        description: 'Kas aktual di laci tidak valid.',
      })
      return
    }
    setIsEndingShift(true)

    try {
      await endShift({
        ending_balance: endingCashBalance,
        actual_balance: actualCash,
        branch_id: Number(activeShift.branch_id),
        total_bank_payments:
          endShiftCalculations.totalSalesByPaymentMethod.transfer || 0,
        total_card_payments:
          endShiftCalculations.totalSalesByPaymentMethod.card || 0,
        total_qris_payments:
          endShiftCalculations.totalSalesByPaymentMethod.qris || 0,
        total_credit_payments:
          endShiftCalculations.totalSalesByPaymentMethod.credit || 0,
        total_cash_payments:
          endShiftCalculations.totalSalesByPaymentMethod.cash || 0,
        total_sales: endShiftCalculations.totalSales || 0,
      })
      toast.success('Shift Diakhiri', {
        description: 'Data shift telah disimpan.',
      })
      setActiveShift(null)
      setInitialCashInput('')
      setActualCashAtEndInput('')
      setEndShiftCalculations(null)
      setShowEndShiftModal(false)
      setCartItems([])
      setShiftTransactions([])
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        'Terjadi kesalahan pada server. Silakan coba lagi.'
      toast.error('Gagal Mengakhiri Shift', { description: errorMessage })
    } finally {
      setIsEndingShift(false)
    }
  }

  const handleAddToCart = (product: Product) => {
    if (!activeShift) {
      toast.error('Shift Belum Dimulai', {
        description: 'Silakan mulai shift untuk menambah item.',
      })
      return
    }
    if (product.quantity <= 0) {
      toast.error('Stok Habis', {
        description: `${product.name} tidak tersedia.`,
      })
      return
    }
    setCartItems((prevItems) => {
      const existingItem = prevItems.find(
        (item) => item.product_id === product.id
      )
      if (existingItem) {
        const newQuantity = existingItem.quantity + 1
        if (newQuantity > product.quantity) {
          toast.warning('Stok Tidak Cukup', {
            description: `Stok maksimal untuk ${product.name} adalah ${product.quantity}.`,
          })
          return prevItems
        }
        return prevItems.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: newQuantity,
                subtotal: newQuantity * item.price,
              }
            : item
        )
      }
      return [
        ...prevItems,
        {
          product_id: product.id,
          product_name: product.name,
          original_price: product.price,
          price: product.price,
          discount_amount: 0,
          item_discount_type: 'nominal',
          item_discount_value: 0,
          quantity: 1,
          cost_price: product.cost_price || 0,
          subtotal: product.price,
          discount: 0,
        },
      ]
    })
  }

  const handleUpdateCartQuantity = (
    product_id: number,
    newQuantity: number
  ) => {
    const productInStock = items.find((p) => p.id === product_id)
    if (!productInStock) return

    if (newQuantity <= 0) {
      handleRemoveFromCart(product_id)
      return
    }
    if (newQuantity > productInStock.quantity) {
      toast.warning('Stok Tidak Cukup', {
        description: `Stok maksimal untuk produk ini adalah ${productInStock.quantity}.`,
      })
      setCartItems((prevItems) =>
        prevItems.map((item) =>
          item.product_id === product_id
            ? {
                ...item,
                quantity: productInStock.quantity,
                subtotal: productInStock.quantity * item.price,
              }
            : item
        )
      )
      return
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.product_id === product_id
          ? {
              ...item,
              quantity: newQuantity,
              subtotal: newQuantity * item.price,
            }
          : item
      )
    )
  }

  const handleRemoveFromCart = (product_id: number) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => item.product_id !== product_id)
    )
  }

  const handleOpenItemDiscountDialog = (item: CartItem) => {
    setSelectedItemForDiscount(item)
    setCurrentDiscountType(item.item_discount_type || 'nominal')
    setCurrentDiscountValue((item.item_discount_value || 0).toString())
    setIsItemDiscountDialogOpen(true)
  }

  const calculateDiscountedPrice = () => {
    if (!selectedItemForDiscount || !selectedItemForDiscount.original_price)
      return { discountedPrice: 0, actualDiscountAmount: 0 }
    const original_price = selectedItemForDiscount.original_price
    const discountValueNum = parseFloat(currentDiscountValue)

    if (isNaN(discountValueNum) || discountValueNum < 0) {
      return { discountedPrice: original_price, actualDiscountAmount: 0 }
    }

    let actualDiscountAmount = 0
    if (currentDiscountType === 'percentage') {
      actualDiscountAmount = original_price * (discountValueNum / 100)
    } else {
      actualDiscountAmount = discountValueNum
    }

    if (actualDiscountAmount > original_price) {
      actualDiscountAmount = original_price
    }

    const discountedPrice = original_price - actualDiscountAmount
    return {
      discountedPrice: discountedPrice < 0 ? 0 : discountedPrice,
      actualDiscountAmount,
    }
  }

  const handleConfirmItemDiscount = () => {
    if (!selectedItemForDiscount) return
    const { discountedPrice, actualDiscountAmount } = calculateDiscountedPrice()

    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (item.product_id === selectedItemForDiscount.product_id) {
          return {
            ...item,
            price: discountedPrice,
            subtotal: discountedPrice * item.quantity,
            discount_amount: actualDiscountAmount,
            item_discount_type: currentDiscountType,
            item_discount_value: parseFloat(currentDiscountValue) || 0,
          }
        }
        return item
      })
    )
    setIsItemDiscountDialogOpen(false)
    setSelectedItemForDiscount(null)
    setCurrentDiscountValue('')
  }

  const handleRemoveCurrentItemDiscount = () => {
    if (!selectedItemForDiscount) return
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (item.product_id === selectedItemForDiscount.product_id) {
          return {
            ...item,
            price: item.original_price,
            subtotal: item.original_price * item.quantity,
            discount_amount: 0,
            item_discount_type: 'nominal',
            item_discount_value: 0,
          }
        }
        return item
      })
    )
    setIsItemDiscountDialogOpen(false)
    setSelectedItemForDiscount(null)
    setCurrentDiscountValue('')
    toast.success('Diskon Dihapus', {
      description: `Diskon untuk ${selectedItemForDiscount.product_name} telah dihapus.`,
    })
  }

  const totalItemDiscount = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + (item.discount_amount || 0) * item.quantity,
        0
      ),
    [cartItems]
  )
  const subtotalAfterItemDiscounts = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.subtotal), 0),
    [cartItems]
  )
  const tax = useMemo(
    () => subtotalAfterItemDiscounts * tax_rate,
    [subtotalAfterItemDiscounts, tax_rate]
  )

  const shippingCost = parseFloat(shippingCostInput) || 0
  const voucherDiscount = parseFloat(voucherDiscountInput) || 0

  const totalDiscountAmount = useMemo(
    () => totalItemDiscount + voucherDiscount,
    [totalItemDiscount, voucherDiscount]
  )

  const total = useMemo(() => {
    return subtotalAfterItemDiscounts + tax + shippingCost - voucherDiscount
  }, [subtotalAfterItemDiscounts, tax, shippingCost, voucherDiscount])

  const totalCost = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + item.quantity * (item.cost_price || 0),
        0
      ),
    [cartItems]
  )

  const resetSaleState = useCallback(() => {
    setCartItems([])
    setSelectedPaymentMethod('cash')
    setShippingCostInput('')
    setVoucherDiscountInput('')
    setSelectedCustomerId(undefined)
    setCustomerSearchTerm('')
    setCashAmountPaidInput('')
    setCalculatedChange(null)
    setShowCashPaymentModal(false)
    setShowBankPaymentModal(false)
    setBankRefNumberInput('')
    setSelectedbank_name('')
    // Re-fetch products to get updated stock
    if (selectedBranch) {
      fetchItemsData(1, '')
    }
  }, [selectedBranch, fetchItemsData])

  const processSale = async (payload: CreateSalePayload) => {
    setIsProcessingSale(true)
    try {
      const result = await createSale(payload)
      toast.success('Transaksi Berhasil', {
        description: 'Penjualan telah direkam.',
      })
      setLastTransactionId(result.id)
      setShowPrintInvoiceDialog(true)
      resetSaleState()
      return result
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        'Terjadi kesalahan saat merekam transaksi.'
      toast.error('Gagal Merekam Transaksi', {
        description: errorMessage,
      })
      throw error // Re-throw error to be caught by caller if needed
    } finally {
      setIsProcessingSale(false)
    }
  }

  const handleConfirmCashPayment = async () => {
    if (!activeShift || !currentUser) return
    const amountPaidNum = parseFloat(cashAmountPaidInput)
    if (isNaN(amountPaidNum) || amountPaidNum < total) {
      toast.error('Pembayaran Tidak Cukup', {
        description: 'Jumlah yang dibayar kurang dari total belanja.',
      })
      return
    }

    const payload: CreateSalePayload = {
      shift_id: activeShift.id,
      payment_method: 'cash',
      amount_paid: amountPaidNum,
      change_given: amountPaidNum - total,
      is_credit_sale: false,
      notes: '',
      customer_id: Number(selectedCustomerId),
      items: cartItems,
    }
    await processSale(payload)
  }

  const handleConfirmBankPayment = async () => {
    if (
      !activeShift ||
      !currentUser ||
      !selectedbank_name ||
      !bankRefNumberInput.trim()
    ) {
      toast.error('Data Tidak Lengkap', {
        description: 'Silakan pilih bank dan isi nomor referensi.',
      })
      return
    }

    const payload: CreateSalePayload = {
      shift_id: activeShift.id,
      payment_method: 'transfer',
      amount_paid: total,
      change_given: 0,
      is_credit_sale: false,
      notes: `Ref: ${bankRefNumberInput}`,
      customer_id: Number(selectedCustomerId),
      items: cartItems,
      bank_account_id: Number(selectedbank_name),
    }
    await processSale(payload)
  }

  const handleConfirmCreditSale = async () => {
    if (!activeShift || !currentUser || !selectedCustomerId) {
      toast.error('Data Tidak Lengkap', {
        description: 'Silakan pilih pelanggan untuk penjualan kredit.',
      })
      return
    }

    const payload: CreateSalePayload = {
      shift_id: activeShift.id,
      payment_method: 'credit',
      amount_paid: total, // For credit, amount_paid is the total
      change_given: 0,
      is_credit_sale: true,
      notes: '',
      customer_id: Number(selectedCustomerId),
      items: cartItems,
    }
    await processSale(payload)
  }

  const handlePrintInvoice = async (transactionIdToPrint?: number) => {
    const targetTransactionId = transactionIdToPrint || lastTransactionId
    if (!targetTransactionId || !selectedBranch || !currentUser || !userData) {
      toast.error('Data Tidak Lengkap', {
        description: 'Tidak dapat mencetak struk, data tidak lengkap.',
      })
      return
    }
    if (!selectedBranch.printer_port) {
      toast.error('Printer Tidak Ditemukan', {
        description: 'Port printer belum diatur untuk cabang ini.',
      })
      return
    }

    setIsPrinting(true)
    try {
      const transaction = await getSaleById(targetTransactionId)
      if (!transaction) {
        toast.error('Transaksi Tidak Ditemukan')
        return
      }

      toast.success('Mencetak Struk', {
        description: `Struk untuk transaksi #${targetTransactionId} dikirim ke printer.`,
      })
    } catch (error) {
      console.error('Gagal mencetak struk:', error)
      toast.error('Gagal Mencetak', {
        description: 'Terjadi kesalahan saat mengirim data ke printer.',
      })
    } finally {
      setIsPrinting(false)
      setShowPrintInvoiceDialog(false)
    }
  }

  return {
    // State
    activeShift,
    loadingShift,
    showStartShiftModal,
    initialCashInput,
    showEndShiftModal,
    actualCashAtEndInput,
    endShiftCalculations,
    isEndingShift,
    items,
    loadingItems,
    searchTerm,
    totalItems,
    itemsPerPage,
    totalPages,
    currentPage,
    cartItems,
    selectedPaymentMethod,
    isProcessingSale,
    lastTransactionId,
    showPrintInvoiceDialog,
    isPrinting,
    showCashPaymentModal,
    cashAmountPaidInput,
    calculatedChange,
    allCustomers,
    loadingCustomers,
    selectedCustomerId,
    customerSearchTerm,
    availableBankAccounts,
    loadingBankAccounts,
    showBankPaymentModal,
    selectedbank_name,
    bankRefNumberInput,
    shiftTransactions,
    loadingShiftTransactions,
    shippingCostInput,
    voucherDiscountInput,
    isItemDiscountDialogOpen,
    selectedItemForDiscount,
    currentDiscountType,
    currentDiscountValue,
    // Derived State
    currencySymbol,
    tax_rate,
    totalItemDiscount,
    subtotalAfterItemDiscounts,
    tax,
    shippingCost,
    voucherDiscount,
    totalDiscountAmount,
    total,
    totalCost,
    // Setters
    setInitialCashInput,
    setShowStartShiftModal,
    setActualCashAtEndInput,
    setShowEndShiftModal,
    setSearchTerm,
    setCurrentPage,
    setItemsPerPage,
    setCartItems,
    setSelectedPaymentMethod,
    setShowPrintInvoiceDialog,
    setCashAmountPaidInput,
    setShowCashPaymentModal,
    setSelectedCustomerId,
    setCustomerSearchTerm,
    setSelectedbank_name,
    setBankRefNumberInput,
    setShowBankPaymentModal,
    setShippingCostInput,
    setVoucherDiscountInput,
    setIsItemDiscountDialogOpen,
    setCurrentDiscountType,
    setCurrentDiscountValue,
    // Functions
    handleStartShift,
    prepareEndShiftCalculations,
    handleEndShiftConfirm,
    handleAddToCart,
    handleUpdateCartQuantity,
    handleRemoveFromCart,
    handleOpenItemDiscountDialog,
    calculateDiscountedPrice,
    handleConfirmItemDiscount,
    handleRemoveCurrentItemDiscount,
    handleConfirmCashPayment,
    handleConfirmBankPayment,
    handleConfirmCreditSale,
    handlePrintInvoice,
    fetchItemsData,
  }
}
