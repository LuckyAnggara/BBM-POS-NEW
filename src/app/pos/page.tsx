'use client'
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import MainLayout from '@/components/layout/main-layout'
import { useBranches } from '@/contexts/branch-context'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog'
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Search,
  PlusCircle,
  MinusCircle,
  XCircle,
  CheckCircle,
  LayoutGrid,
  List,
  PackagePlus,
  LogOut,
  PlayCircle,
  StopCircle,
  DollarSign,
  ShoppingCart,
  Printer,
  UserPlus,
  CreditCard,
  CalendarIcon,
  QrCode,
  Banknote,
  ChevronsUpDown,
  Info,
  Eye,
  History as HistoryIcon,
  Percent,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Trash2,
  Loader2,
  Loader2Icon,
} from 'lucide-react'
import Image from 'next/image'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  type Product,
  type Customer,
  type BankAccount,
  ITEMS_PER_PAGE_OPTIONS,
} from '@/lib/types'
import { listProducts } from '@/lib/laravel/product'
import { getCustomerById, listCustomers } from '@/lib/laravel/customers'
import { listBankAccounts } from '@/lib/laravel/bankAccounts'
// import {
//   startShift as startShift,
//   getActiveShift,
//   endShift,
//   createPOSTransaction as createSale,
//   getTransactions as listSales,
//   getSaleById,
// } from '@/lib/laravel/pos'

import {
  startShift,
  getActiveShift,
  endShift,
} from '@/lib/laravel/shiftService'

import { createSale, listSales, getSaleById } from '@/lib/laravel/saleService'

// Impor SEMUA tipe yang berhubungan dengan POS dari satu file terpusat
import type {
  Shift,
  Sale,
  CreateSalePayload,
  CartItem, // Tambahkan ini juga
  PaymentMethod,
} from '@/lib/types' // Ubah path jika perlu

import { format, parseISO, isValid } from 'date-fns' // Added parseISO and isValid
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useDebounce } from '@uidotdev/usehooks'
import {
  formatCurrency,
  formatDateIntl,
  formatDateIntlIntl,
} from '@/lib/helper'
import { handlePrint } from '@/lib/printHelper'
import { is } from 'date-fns/locale'

type ViewMode = 'card' | 'table'
const LOCALSTORAGE_POS_VIEW_MODE_KEY = 'branchwise_posViewMode'
type TaxMode = 'no_tax' | 'add_tax' | 'price_includes_tax'

export default function POSPage() {
  const { selectedBranch } = useBranches()
  const { userData, currentUser } = useAuth()
  const router = useRouter()

  const [viewMode, setViewMode] = useState<ViewMode>('table')

  const [activeShift, setActiveShift] = useState<Shift | null>(null) // Changed to POSShift
  const [loadingShift, setLoadingShift] = useState(true)
  const [showStartShiftModal, setShowStartShiftModal] = useState(false)
  const [initialCashInput, setInitialCashInput] = useState('')

  const [showEndShiftModal, setShowEndShiftModal] = useState(false)
  const [actualCashAtEndInput, setActualCashAtEndInput] = useState('')
  const [endShiftCalculations, setEndShiftCalculations] = useState<{
    expectedCash: number
    totalSalesByPaymentMethod: Record<PaymentMethod, number>
    totalSales: number
    difference: number
  } | null>(null)
  const [endingCashBalance, setEndingCashBalance] = useState(0)
  const [isEndingShift, setIsEndingShift] = useState(false)

  const [items, setItems] = useState<Product[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchCustomerTerm, setSearchCustomerTerm] = useState('')
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    ITEMS_PER_PAGE_OPTIONS[0]
  )
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const debouncedSearchTerm = useDebounce(searchTerm, 1000)
  const debouncedSearchCustomer = useDebounce(searchCustomerTerm, 1000)
  const [hasNextPage, setHasNextPage] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)

  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [selectedPaymentTerms, setSelectedPaymentTerms] =
    useState<PaymentMethod>('cash')
  const [isProcessingSale, setIsProcessingSale] = useState(false)
  const [isCreditSaleProcessing, setIsCreditSaleProcessing] = useState(false)

  const [lastTransactionId, setLastTransactionId] = useState<number | null>(
    null
  )
  const [showPrintInvoiceDialog, setShowPrintInvoiceDialog] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  const [showCashPaymentModal, setShowCashPaymentModal] = useState(false)
  const [cashAmountPaidInput, setCashAmountPaidInput] = useState('')
  const [customer_nameInputCash, setcustomer_nameInputCash] = useState('')
  const [calculatedChange, setCalculatedChange] = useState<number | null>(null)
  const [showCreditConfirmationDialog, setShowCreditConfirmationDialog] =
    useState(false)

  const [allCustomers, setAllCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [selectedCustomerId, setSelectedCustomerId] = useState<
    string | undefined
  >(undefined)
  const [creditDueDate, setCreditDueDate] = useState<Date | undefined>(
    undefined
  )
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [isCustomerComboboxOpen, setIsCustomerComboboxOpen] = useState(false)

  const [showScanCustomerDialog, setShowScanCustomerDialog] = useState(false)

  const [availableBankAccounts, setAvailableBankAccounts] = useState<
    BankAccount[]
  >([])
  const [loadingBankAccounts, setLoadingBankAccounts] = useState(false)
  const [showBankPaymentModal, setShowBankPaymentModal] = useState(false)
  const [selectedbank_name, setSelectedbank_name] = useState<string>('')
  const [bankRefNumberInput, setBankRefNumberInput] = useState('')
  const [customer_nameInputBank, setcustomer_nameInputBank] = useState('')

  const [shiftTransactions, setShiftTransactions] = useState<Sale[]>([]) // Changed to POSTransaction
  const [loadingShiftTransactions, setLoadingShiftTransactions] =
    useState(false)
  const [showBankHistoryDialog, setShowBankHistoryDialog] = useState(false)
  const [showCashHistoryDialog, setShowCashHistoryDialog] = useState(false)
  const [showShiftCashDetailsDialog, setShowShiftCashDetailsDialog] =
    useState(false)
  const [showAllShiftTransactionsDialog, setShowAllShiftTransactionsDialog] =
    useState(false)

  const [shippingCostInput, setShippingCostInput] = useState('')
  const [voucherCodeInput, setVoucherCodeInput] = useState('')
  const [voucherDiscountInput, setVoucherDiscountInput] = useState('')
  const [taxMode, setTaxMode] = useState<TaxMode>('no_tax')

  const [isItemDiscountDialogOpen, setIsItemDiscountDialogOpen] =
    useState(false)
  const [selectedItemForDiscount, setSelectedItemForDiscount] =
    useState<CartItem | null>(null)
  const [currentDiscountType, setCurrentDiscountType] = useState<
    'nominal' | 'percentage'
  >('nominal')
  const [currentDiscountValue, setCurrentDiscountValue] = useState<string>('')

  useEffect(() => {
    // setPosModeActive(true)
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

  const currencySymbol =
    selectedBranch?.currency === 'IDR' ? 'Rp' : selectedBranch?.currency || '$'
  const tax_rate = selectedBranch?.tax_rate
    ? selectedBranch.tax_rate / 100
    : 0.0

  const computeTaxForSubtotal = (netSubtotal: number) => {
    switch (taxMode) {
      case 'no_tax':
        return { tax: 0, total: netSubtotal }
      case 'add_tax':
        return {
          tax: netSubtotal * tax_rate,
          total: netSubtotal * (1 + tax_rate),
        }
      case 'price_includes_tax':
        return {
          tax: netSubtotal - netSubtotal / (1 + tax_rate),
          total: netSubtotal,
        }
    }
  }

  const handleNextPage = () => {
    // Cek jika halaman saat ini belum mencapai halaman terakhir
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => prevPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => prevPage - 1)
    }
  }

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
  }, [selectedBranch])

  const fetchItemsData = useCallback(
    async (page: number, currentSearchTerm: string) => {
      if (!selectedBranch) {
        setItems([])
        setLoadingItems(false)
        setTotalItems(0)
        return
      }
      setLoadingItems(true)

      const options = {
        branchId: selectedBranch.id,
        limit: itemsPerPage,
        searchTerm: currentSearchTerm || undefined,
        page: page || 1,
      }

      // Panggil fungsi API yang baru
      const result = await listProducts(options)
      setItems(result.data)
      setTotalItems(result.total) // Simpan total item
      setLoadingItems(false)
    },
    [selectedBranch, itemsPerPage] // Dependensi lebih sederhana
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
        toast.error('Gagal Memuat Data', {
          description: 'Tidak dapat memuat pelanggan.',
        })
      } finally {
        setLoadingCustomers(false)
        setSearchCustomerTerm('') // Simpan search term yang digunakan
      }
    },
    [selectedBranch, toast]
  )

  useEffect(() => {
    // Jika tidak ada cabang yang dipilih, bersihkan state dan jangan lakukan apa-apa lagi.
    if (!selectedBranch) {
      setItems([])
      setLoadingItems(false)
      setHasNextPage(false) // Sesuaikan dengan mode paginasi Anda
      return // Hentikan eksekusi lebih lanjut
    }
    fetchItemsData(currentPage, debouncedSearchTerm)
  }, [currentPage, debouncedSearchTerm, selectedBranch, fetchItemsData]) // Sertakan semua dependensi relevan

  useEffect(() => {
    // Jika tidak ada cabang yang dipilih, bersihkan state dan jangan lakukan apa-apa lagi.
    if (!selectedBranch) {
      setAllCustomers([])
      setLoadingCustomers(false)
      return // Hentikan eksekusi lebih lanjut
    }
    fetchCustomers(debouncedSearchCustomer)
  }, [debouncedSearchCustomer, selectedBranch, fetchCustomers]) // Sertakan semua dependensi relevan

  // useEffect(() => {
  //   fetchCustomers(debouncedSearchCustomer)
  //   fetchBankAccounts()
  // }, [fetchCustomers, fetchBankAccounts])

  const fetchShiftTransactions = useCallback(async (): Promise<Sale[]> => {
    if (activeShift && selectedBranch) {
      setLoadingShiftTransactions(true)
      const transactions = await listSales({
        branchId: String(selectedBranch.id),
        shiftId: String(activeShift.id),
      })
      setShiftTransactions(transactions.data)
      setLoadingShiftTransactions(false)
      return transactions.data
    } else {
      setShiftTransactions([])
      return []
    }
  }, [activeShift, selectedBranch])

  useEffect(() => {
    fetchShiftTransactions()
  }, [fetchShiftTransactions, lastTransactionId])

  const checkForActiveShift = useCallback(async () => {
    if (!currentUser || !selectedBranch) {
      setActiveShift(null)
      setLoadingShift(false)
      return
    }
    setLoadingShift(true)
    const shift = await getActiveShift()
    setActiveShift(shift)
    if (shift) {
      setInitialCashInput(shift.starting_balance.toString())
    } else {
      setInitialCashInput('')
    }
    setLoadingShift(false)
  }, [currentUser, selectedBranch])

  useEffect(() => {
    checkForActiveShift()
  }, [checkForActiveShift])

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
    } catch (error: any) {
      let errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'

      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
        const firstErrorKey = Object.keys(validationErrors)[0]
        errorMessage = validationErrors[firstErrorKey][0]
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }

      toast.error('Gagal Memulai Shift', {
        description: errorMessage,
      })
    }
    setInitialCashInput('')
  }

  const prepareEndShiftCalculations = async () => {
    if (!activeShift) return
    setIsEndingShift(true)
    // Fetch up-to-date transactions directly
    const currentShiftTransactions = await fetchShiftTransactions()

    // Sum transactions by payment method
    const salesByPayment: Record<PaymentMethod, number> =
      currentShiftTransactions.reduce(
        (acc, tx) => {
          if (tx.status === 'completed') {
            const method = tx.payment_method as PaymentMethod
            if (acc.hasOwnProperty(method)) {
              acc[method] += Number(tx.total_amount)
            }
          }
          return acc
        },
        { cash: 0, credit: 0, card: 0, qris: 0, transfer: 0 }
      )

    // Total sales across all payment methods
    const totalSales = Object.values(salesByPayment).reduce(
      (sum, value) => sum + value,
      0
    )

    const expected =
      Number(activeShift.starting_balance || 0) + salesByPayment.cash
    setEndingCashBalance(expected)
    setEndShiftCalculations({
      difference: expected - totalSales,
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
      const result = await endShift({
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
      let errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'

      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
        const firstErrorKey = Object.keys(validationErrors)[0]
        errorMessage = validationErrors[firstErrorKey][0]
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }

      toast.error('Gagal Mengakhiri Shift', { description: errorMessage })
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
        if (existingItem.quantity < product.quantity) {
          return prevItems.map((item) =>
            item.product_id === product.id
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  subtotal: (item.quantity + 1) * item.price,
                }
              : item
          )
        } else {
          toast.info('Stok Tidak Cukup', {
            description: `Stok maksimal untuk ${product.name} telah ditambahkan.`,
          })
          return prevItems
        }
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
          discount: 0, // Ensure required property is present
        },
      ]
    })
  }

  const handleOpenItemDiscountDialog = (item: CartItem) => {
    setSelectedItemForDiscount(item)
    setCurrentDiscountType(item.item_discount_type || 'nominal')
    setCurrentDiscountValue((item.item_discount_value || 0).toString())
    setIsItemDiscountDialogOpen(true)
  }

  const handleItemDiscountTypeChange = (type: 'nominal' | 'percentage') => {
    setCurrentDiscountType(type)
    setCurrentDiscountValue('')
  }

  const handleItemDiscountValueChange = (value: string) => {
    setCurrentDiscountValue(value)
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
            discount_amount: actualDiscountAmount,
            item_discount_type: currentDiscountType,
            item_discount_value: parseFloat(currentDiscountValue) || 0,
            subtotal: discountedPrice * item.quantity,
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
            price: item.original_price || item.price, // Revert to original price
            discount_amount: 0,
            item_discount_type: undefined,
            item_discount_value: 0,
            total: (item.original_price || item.price) * item.quantity,
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
  // Hitung pajak dan subtotal+tax berdasarkan mode pajak yang dipilih
  const { tax, total: subtotalWithTax } = useMemo(() => {
    return computeTaxForSubtotal(subtotalAfterItemDiscounts)
  }, [subtotalAfterItemDiscounts, tax_rate, taxMode])

  // Subtotal yang ditampilkan di UI: jika harga termasuk pajak, tampilkan subtotal sebelum pajak
  const displaySubtotal = useMemo(() => {
    if (taxMode === 'price_includes_tax') {
      return tax_rate > 0
        ? subtotalAfterItemDiscounts / (1 + tax_rate)
        : subtotalAfterItemDiscounts
    }
    return subtotalAfterItemDiscounts
  }, [subtotalAfterItemDiscounts, taxMode, tax_rate])

  const shippingCost = parseFloat(shippingCostInput) || 0
  const voucherDiscount = parseFloat(voucherDiscountInput) || 0

  const totalDiscountAmount = useMemo(
    () => totalItemDiscount + voucherDiscount,
    [totalItemDiscount, voucherDiscount]
  )

  const total = useMemo(() => {
    return subtotalWithTax + shippingCost - voucherDiscount
  }, [subtotalWithTax, shippingCost, voucherDiscount])

  const totalCost = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + item.quantity * (item.cost_price || 0),
        0
      ),
    [cartItems]
  )

  const openCashPaymentModal = () => {
    setCashAmountPaidInput(total.toString())
    setcustomer_nameInputCash('')
    setCalculatedChange(0)
    setShowCashPaymentModal(true)
  }

  const handleCashAmountPaidChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const paidAmountStr = e.target.value
    setCashAmountPaidInput(paidAmountStr)
    const paidAmount = parseFloat(paidAmountStr)
    if (!isNaN(paidAmount) && paidAmount >= total) {
      setCalculatedChange(paidAmount - total)
    } else {
      setCalculatedChange(null)
    }
  }
  const handleConfirmCashPayment = async () => {
    // 1. Validasi Input (Guard Clauses) - Ini sudah sangat baik, kita pertahankan.
    if (!activeShift || !selectedBranch || !currentUser) {
      toast.error('Kesalahan', {
        description: 'Shift, cabang, atau pengguna tidak aktif.',
      })
      return
    }

    const amountPaidNum = parseFloat(cashAmountPaidInput)
    if (isNaN(amountPaidNum) || amountPaidNum < total) {
      toast.error('Pembayaran Tidak Cukup', {
        description: 'Jumlah yang dibayar kurang dari total belanja.',
      })
      return
    }

    // --- Mulai proses transaksi ---
    setIsProcessingSale(true)

    try {
      // Persiapan data tetap di sini
      const change = amountPaidNum - total
      const payload: CreateSalePayload = {
        shift_id: activeShift.id,
        payment_method: 'cash',
        amount_paid: amountPaidNum,
        change_given: change,
        shipping_cost: shippingCost,
        voucher_discount_amount: voucherDiscount,
        tax_amount: tax,
        is_credit_sale: false,
        notes: '',
        customer_id: Number(selectedCustomerId),
        items: cartItems,
      }

      // 2. Blok `try`: Berisi "Happy Path" atau alur sukses
      const result = await createSale(payload)

      // --- Semua logika jika SUKSES ---
      toast.success('Transaksi Berhasil', {
        description: 'Penjualan telah direkam.',
      })

      setLastTransactionId(result.id)
      setShowPrintInvoiceDialog(true)

      // Reset semua state
      setCartItems([])
      setSelectedPaymentTerms('cash')
      setShippingCostInput('')
      setVoucherCodeInput('')
      // ... reset state lainnya
      setCashAmountPaidInput('')
      setcustomer_nameInputCash('')
      setCalculatedChange(null)
      fetchItemsData(currentPage, debouncedSearchTerm)
    } catch (error) {
      // 3. Blok `catch`: Menangkap SEMUA jenis error dari blok `try`

      // Logging error di console untuk debugging oleh developer
      console.error('Gagal memproses transaksi:', error)

      // Menampilkan pesan error yang ramah ke pengguna
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan yang tidak diketahui.'
      toast.error('Gagal Merekam Transaksi', {
        description: errorMessage,
      })

      setLastTransactionId(null)
    } finally {
      // 4. Blok `finally`: SELALU dijalankan, baik sukses maupun gagal
      setIsProcessingSale(false)
      // Modal bisa ditutup di sini jika diinginkan, atau hanya saat sukses
      setShowCashPaymentModal(false)
    }
  }

  const handleConfirmBankPayment = async () => {
    // 1. Validasi Input (Guard Clauses) - Sudah sangat baik, kita pertahankan.
    if (!activeShift || !selectedBranch || !currentUser) {
      toast.error('Kesalahan', {
        description: 'Shift, cabang, atau pengguna tidak aktif.',
      })
      return
    }
    if (!selectedbank_name) {
      toast.error('Bank Diperlukan', {
        description: 'Pilih nama bank.',
      })
      return
    }
    if (!bankRefNumberInput.trim()) {
      toast.error('No. Referensi Diperlukan', {
        description: 'Masukkan nomor referensi transaksi bank.',
      })
      return
    }

    // --- Mulai proses transaksi ---
    setIsProcessingSale(true)

    try {
      const payload: CreateSalePayload = {
        shift_id: activeShift.id,
        payment_method: 'transfer',
        amount_paid: total,
        tax_amount: tax,
        shipping_cost: shippingCost,
        voucher_discount_amount: voucherDiscount,
        is_credit_sale: false,
        notes: '',
        customer_id: Number(selectedCustomerId),
        items: cartItems,
      }
      // 2. Blok `try`: Eksekusi alur sukses
      const result = await createSale(payload)

      // --- Semua logika jika SUKSES ---
      toast.success('Transaksi Berhasil', {
        description: 'Penjualan transfer telah direkam.',
      })

      setLastTransactionId(result.id)
      setShowPrintInvoiceDialog(true)

      // Reset semua state yang relevan
      setCartItems([])
      setSelectedPaymentTerms('cash')
      setShippingCostInput('')
      setVoucherCodeInput('')
      setVoucherDiscountInput('')
      setSelectedbank_name('')
      setBankRefNumberInput('')
      setcustomer_nameInputBank('')
      setSelectedCustomerId('')
      fetchItemsData(currentPage, debouncedSearchTerm)
    } catch (error) {
      // 3. Blok `catch`: Menangkap semua jenis error
      console.error('Gagal memproses transaksi bank:', error)

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan yang tidak diketahui.'
      toast.error('Gagal Merekam Transaksi', {
        description: errorMessage,
      })
      setLastTransactionId(null)
    } finally {
      // 4. Blok `finally`: Jaminan cleanup
      setIsProcessingSale(false)
      setShowBankPaymentModal(false)
    }
  }

  const handleCompleteSale = async () => {
    // --- Validasi Awal & Routing (Sinkron) ---
    // Bagian ini tidak perlu try...catch karena tidak ada proses async.
    // Pola guard clause di sini sudah sangat baik.
    if (!activeShift || !selectedBranch || !currentUser) {
      toast.error('Kesalahan', {
        description: 'Shift, cabang, atau pengguna tidak aktif.',
      })
      return
    }
    if (cartItems.length === 0) {
      toast.error('Keranjang Kosong', {
        description: 'Tidak ada item di keranjang.',
      })
      return
    }

    // Routing ke modal pembayaran tunai
    if (selectedPaymentTerms === 'cash') {
      openCashPaymentModal()
      return
    }

    // Routing ke modal pembayaran bank
    if (selectedPaymentTerms === 'transfer') {
      setSelectedbank_name('')
      setBankRefNumberInput('')
      setSelectedCustomerId('')
      setcustomer_nameInputBank('')
      setShowBankPaymentModal(true)
      return
    }

    // --- Awal dari Logika Asinkron (untuk 'credit' atau metode langsung lainnya) ---

    // Validasi spesifik untuk penjualan kredit
    if (selectedPaymentTerms === 'credit') {
      if (!selectedCustomerId) {
        toast.error('Pelanggan Diperlukan', {
          description: 'Pilih pelanggan untuk penjualan kredit.',
        })
        return
      }
      if (!creditDueDate) {
        toast.error('Tanggal Jatuh Tempo Diperlukan', {
          description: 'Pilih tanggal jatuh tempo untuk penjualan kredit.',
        })
        return
      }
      setShowCreditConfirmationDialog(true)
      return
    }
    // setIsProcessingSale(true)

    // try {
    //   // Persiapan data transaksi
    //   const payload: CreateSalePayload = {
    //     shift_id: activeShift.id,
    //     payment_method: 'credit',
    //     amount_paid: total,
    //     is_credit_sale: true,
    //     notes: '',
    //     customer_id: Number(selectedCustomerId),
    //     items: cartItems,
    //   }

    //   const result = await createSale(payload)

    //   // --- Logika jika SUKSES ---
    //   toast.success('Transaksi Berhasil', {
    //     description: 'Penjualan telah direkam.',
    //   })
    //   setLastTransactionId(result.id)
    //   setShowPrintInvoiceDialog(true)

    //   // Reset semua state yang relevan
    //   setCartItems([])
    //   setSelectedPaymentTerms('cash')
    //   setShippingCostInput('')
    //   setVoucherCodeInput('')
    //   setVoucherDiscountInput('')
    //   setSelectedCustomerId(undefined)
    //   setCreditDueDate(undefined)
    //   setSearchCustomerTerm('')
    //   fetchItemsData(currentPage, debouncedSearchTerm)
    // } catch (error) {
    //   // Menangkap semua error dari proses `await`
    //   console.error('Gagal menyelesaikan penjualan:', error)
    //   const errorMessage =
    //     error instanceof Error
    //       ? error.message
    //       : 'Terjadi kesalahan yang tidak diketahui.'
    //   toast.error('Gagal Merekam Transaksi', {
    //     description: errorMessage,
    //   })
    //   setLastTransactionId(null)
    // } finally {
    //   // Jaminan untuk menonaktifkan status loading
    //   setIsProcessingSale(false)
    // }
  }

  // Handler untuk konfirmasi penjualan kredit
  const handleConfirmCreditSale = async () => {
    setIsProcessingSale(true)
    setIsCreditSaleProcessing(true)
    try {
      const payload: CreateSalePayload = {
        shift_id: activeShift!.id,
        payment_method: 'credit',
        amount_paid: 0,
        tax_amount: tax,
        shipping_cost: shippingCost,
        outstanding_amount: total,
        is_credit_sale: true,
        credit_due_date: creditDueDate?.toISOString(),
        notes: '',
        customer_id: Number(selectedCustomerId),
        items: cartItems,
      }
      const result = await createSale(payload)
      toast.success('Transaksi Berhasil', {
        description: 'Penjualan telah direkam.',
      })
      setLastTransactionId(result.id)
      setShowPrintInvoiceDialog(true)
      setCartItems([])
      setSelectedPaymentTerms('cash')
      setShippingCostInput('')
      setVoucherCodeInput('')
      setVoucherDiscountInput('')
      setSelectedCustomerId(undefined)
      setCreditDueDate(undefined)
      setSearchCustomerTerm('')
      fetchItemsData(currentPage, debouncedSearchTerm)
    } catch (error) {
      console.error('Gagal menyelesaikan penjualan:', error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan yang tidak diketahui.'
      toast.error('Gagal Merekam Transaksi', {
        description: errorMessage,
      })
      setLastTransactionId(null)
    } finally {
      setIsProcessingSale(false)
      setIsCreditSaleProcessing(false)

      setShowCreditConfirmationDialog(false)
    }
  }

  const handlePrintInvoice = async (transactionIdToPrint?: number) => {
    const targetTransactionId = transactionIdToPrint || lastTransactionId

    if (!targetTransactionId || !selectedBranch || !currentUser || !userData) {
      toast.error('Data Tidak Lengkap', {
        description: 'Tidak dapat mencetak invoice, data kurang.',
      })
      setShowPrintInvoiceDialog(false)
      setLastTransactionId(null)
      return
    }

    if (!selectedBranch) {
      toast.error('Tidak ada cabang yang dipilih.')
      return
    }
    if (!selectedBranch.printer_port) {
      toast.error('Fitur ini tidak didukung untuk printer port.', {
        id: 'print-error',
      })
      return
    }

    const transaction = await getSaleById(targetTransactionId)

    if (!transaction) {
      toast.error('Gagal Cetak', {
        description: 'Detail transaksi tidak ditemukan.',
      })
      return
    }

    setIsPrinting(true)
    try {
      toast.loading('Mengirim data untuk dicetak...', {
        id: 'print-loading',
      })
      const result = await handlePrint({
        printerType: '58mm',
        branch: selectedBranch,
        transaction,
      })
      toast.success(result, { id: 'print-loading' })
    } catch (error) {
      toast.error('Gagal mencetak invoice.', { id: 'print-loading' })
    } finally {
      setIsPrinting(false)

      setShowPrintInvoiceDialog(false)
      setLastTransactionId(null)
    }
  }

  const handlePrintInvoiceFromHistory = (transactionIdForReprint: number) => {
    handlePrintInvoice(transactionIdForReprint)
  }

  const handleScanCustomerSuccess = async (scannedId: string) => {
    const foundCustomer = await getCustomerById(scannedId)

    if (foundCustomer) {
      setSelectedCustomerId(String(foundCustomer.id))
      setSearchCustomerTerm(foundCustomer.name)
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
  }

  const totalCashSalesInShift = useMemo(() => {
    return shiftTransactions
      .filter((tx) => tx.payment_method === 'cash' && tx.status === 'completed')
      .reduce((sum, tx) => sum + Number(tx.total_amount), 0)
  }, [shiftTransactions])

  const totalCardSalesInShift = useMemo(() => {
    return shiftTransactions
      .filter((tx) => tx.payment_method === 'card' && tx.status === 'completed')
      .reduce((sum, tx) => sum + Number(tx.total_amount), 0)
  }, [shiftTransactions])

  const totalCreditSalesInShift = useMemo(() => {
    return shiftTransactions
      .filter(
        (tx) => tx.payment_method === 'credit' && tx.status === 'completed'
      )
      .reduce((sum, tx) => sum + Number(tx.total_amount), 0)
  }, [shiftTransactions])

  const totalTransferSalesInShift = useMemo(() => {
    return shiftTransactions
      .filter(
        (tx) => tx.payment_method === 'transfer' && tx.status === 'completed'
      )
      .reduce((sum, tx) => sum + Number(tx.total_amount), 0)
  }, [shiftTransactions])

  const estimatedCashInDrawer = useMemo(() => {
    const startingBalance = Number(activeShift?.starting_balance || 0)
    const cashSales = Number(totalCashSalesInShift)
    return startingBalance + cashSales
  }, [activeShift, totalCashSalesInShift])

  const cashTransactionsInShift = useMemo(() => {
    return shiftTransactions.filter(
      (tx) => tx.payment_method === 'cash' && tx.status === 'completed'
    )
  }, [shiftTransactions])

  const bankTransactionsInShift = useMemo(() => {
    return shiftTransactions.filter(
      (tx) => tx.payment_method === 'transfer' && tx.status === 'completed'
    )
  }, [shiftTransactions])

  const cardTransactionsInShift = useMemo(() => {
    return shiftTransactions.filter(
      (tx) => tx.payment_method === 'card' && tx.status === 'completed'
    )
  }, [shiftTransactions])

  const creditTransactionsInShift = useMemo(() => {
    return shiftTransactions.filter(
      (tx) => tx.payment_method === 'credit' && tx.status === 'completed'
    )
  }, [shiftTransactions])

  const totalSalesShift = useMemo(() => {
    return shiftTransactions
      .filter((tx) => tx.status === 'completed')
      .reduce((sum, tx) => sum + Number(tx.total_amount), 0)
  }, [shiftTransactions])

  const totalReturnsShift = useMemo(() => {
    return shiftTransactions
      .filter((tx) => tx.status === 'returned')
      .reduce((sum, tx) => sum + Number(tx.total_amount), 0)
  }, [shiftTransactions])

  const {
    discountedPrice: previewDiscountedPrice,
    actualDiscountAmount: previewActualDiscountAmount,
  } = calculateDiscountedPrice()

  // if (loadingShift) {
  //   return (
  //     <div className='flex h-screen items-center justify-center'>
  //       Memuat Mode POS...
  //     </div>
  //   )
  // }

  return (
    <ProtectedRoute>
      <MainLayout focusMode={true}>
        <div className='flex flex-col h-screen bg-background'>
          <header className='grid grid-cols-3 items-center justify-between p-3 border-b bg-card shadow-sm sticky top-0 z-10 gap-3'>
            <div className='flex items-center gap-2 col-span-1'>
              <DollarSign className='h-6 w-6 text-primary' />
              <h1 className='text-lg font-semibold font-headline'>
                {loadingShift ? (
                  // Tampilkan div dengan ikon spinner dan teks saat loading
                  <div className='flex items-center text-muted-foreground text-sm'>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    <span>Sedang memuat data shift...</span>
                  </div>
                ) : (
                  // Tampilkan teks POS dan nama cabang jika tidak loading
                  <>
                    {'POS '}
                    {selectedBranch
                      ? `- ${selectedBranch.name}`
                      : '(Pilih Cabang)'}
                  </>
                )}
              </h1>
            </div>

            {activeShift ? (
              <div className='col-span-1 text-center'>
                <p className='text-green-600 font-medium flex items-center justify-center text-sm'>
                  <PlayCircle className='h-4 w-4 mr-1.5' /> SHIFT AKTIF
                </p>
              </div>
            ) : (
              <div className='col-span-1 text-center'>
                <Button
                  variant='default'
                  size='sm'
                  className='text-xs h-8'
                  onClick={() => setShowStartShiftModal(true)}
                  disabled={!selectedBranch || !currentUser}
                >
                  <PlayCircle className='mr-1.5 h-3.5 w-3.5' /> Mulai Shift
                </Button>
              </div>
            )}

            <div className='col-span-1 flex justify-end items-center gap-2'>
              {activeShift && (
                <>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-8 text-xs'
                    onClick={() => setShowAllShiftTransactionsDialog(true)}
                  >
                    <HistoryIcon className='mr-1.5 h-3.5 w-3.5' /> Riwayat Shift
                    Ini
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-8 text-xs'
                    onClick={() => setShowShiftCashDetailsDialog(true)}
                  >
                    <Info className='mr-1.5 h-3.5 w-3.5' /> Info Kas Shift
                  </Button>
                  <Button
                    variant='destructive'
                    size='sm'
                    className='text-xs h-8'
                    onClick={prepareEndShiftCalculations}
                    disabled={isEndingShift}
                  >
                    {isEndingShift ? (
                      'Memproses...'
                    ) : (
                      <>
                        <StopCircle className='mr-1.5 h-3.5 w-3.5' /> Akhiri
                        Shift
                      </>
                    )}
                  </Button>
                </>
              )}
              <Button
                variant='outline'
                size='sm'
                className='h-8 text-xs'
                onClick={() => router.push('/dashboard')}
              >
                <LogOut className='mr-1.5 h-3.5 w-3.5' /> Keluar
                <span className='sr-only'>Keluar dari Mode POS</span>
              </Button>
            </div>
          </header>

          <div className='flex flex-1 overflow-hidden'>
            <ResizablePanelGroup direction='horizontal'>
              <ResizablePanel defaultSize={65} minSize={30}>
                <div className='p-3 space-y-3 flex flex-col h-full'>
                  <div className='flex justify-between items-center gap-2'>
                    <div className='relative flex-grow'>
                      <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
                      <Input
                        type='search'
                        placeholder='Cari produk atau SKU...'
                        className='pl-8 w-full rounded-md h-8 text-xs'
                        disabled={!activeShift || loadingItems}
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value)
                          setCurrentPage(1)
                        }}
                      />
                    </div>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value))
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className='h-8 text-xs rounded-md w-auto sm:w-[120px]'>
                        <SelectValue placeholder='Tampil' />
                      </SelectTrigger>
                      <SelectContent>
                        {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                          <SelectItem
                            key={option}
                            value={option.toString()}
                            className='text-xs'
                          >
                            Tampil {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className='flex items-center gap-1.5'>
                      <Button
                        variant={viewMode === 'card' ? 'secondary' : 'outline'}
                        size='sm'
                        className='h-8 w-8 p-0'
                        onClick={() => handleSetViewMode('card')}
                        aria-label='Card View'
                        disabled={!activeShift}
                      >
                        <LayoutGrid className='h-4 w-4' />
                      </Button>
                      <Button
                        variant={viewMode === 'table' ? 'secondary' : 'outline'}
                        size='sm'
                        className='h-8 w-8 p-0'
                        onClick={() => handleSetViewMode('table')}
                        aria-label='Table View'
                        disabled={!activeShift}
                      >
                        <List className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'flex-grow overflow-y-auto p-0.5 -m-0.5 relative min-h-0',
                      viewMode === 'card'
                        ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5'
                        : ''
                    )}
                  >
                    {loadingItems ? (
                      <div
                        className={cn(
                          'flex w-full items-center justify-center',
                          viewMode === 'card' ? 'h-48' : 'h-24'
                        )}
                      >
                        <Loader2 className='h-10 w-10 animate-spin text-muted-foreground' />
                      </div>
                    ) : items.length === 0 ? (
                      <div className='text-center py-10 text-muted-foreground text-sm'>
                        {'Produk tidak ditemukan atau belum ada produk.'}
                      </div>
                    ) : viewMode === 'card' ? (
                      items.map((product) => (
                        <Card
                          key={product.id}
                          className={cn(
                            'h-64 overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-md cursor-pointer flex flex-col',
                            product.quantity <= 0 &&
                              'opacity-60 cursor-not-allowed'
                          )}
                          onClick={() =>
                            product.quantity > 0 && handleAddToCart(product)
                          }
                        >
                          <div className='relative w-full aspect-[4/3]'>
                            <Image
                              src={
                                product.image_url ||
                                `https://placehold.co/150x100.png`
                              }
                              alt={product.name}
                              layout='fill'
                              objectFit='cover'
                              className='rounded-t-md'
                              data-ai-hint={
                                product.image_hint ||
                                product.name
                                  .split(' ')
                                  .slice(0, 2)
                                  .join(' ')
                                  .toLowerCase()
                              }
                              onError={(e) =>
                                (e.currentTarget.src =
                                  'https://placehold.co/150x100.png')
                              }
                            />
                          </div>
                          <CardContent className='p-2 flex flex-col flex-grow'>
                            <h3 className='font-semibold text-xs truncate leading-snug flex-grow'>
                              {product.name}
                            </h3>
                            <p className='text-primary font-bold text-sm mt-0.5'>
                              {currencySymbol}
                              {product.price.toLocaleString('id-ID')}
                            </p>
                            <p className='text-xs text-muted-foreground mb-1'>
                              Stok: {product.quantity}
                            </p>
                            <Button
                              size='sm'
                              className='w-full text-xs h-7 mt-auto'
                              disabled={!activeShift || product.quantity <= 0}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (product.quantity > 0)
                                  handleAddToCart(product)
                              }}
                            >
                              <PackagePlus className='mr-1.5 h-3.5 w-3.5' />{' '}
                              Tambah
                            </Button>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className='border rounded-md overflow-hidden'>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className='w-[40px] p-1.5 hidden sm:table-cell'></TableHead>
                              <TableHead className='p-1.5 text-xs'>
                                Nama Produk
                              </TableHead>
                              <TableHead className='p-1.5 text-xs'>
                                SKU
                              </TableHead>
                              <TableHead className='p-1.5 text-xs text-right'>
                                Harga
                              </TableHead>
                              <TableHead className='p-1.5 text-xs text-center hidden md:table-cell'>
                                Stok
                              </TableHead>
                              <TableHead className='p-1.5 text-xs text-center'>
                                Aksi
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((product) => (
                              <TableRow
                                key={product.id}
                                className={cn(
                                  product.quantity <= 0 && 'opacity-60'
                                )}
                              >
                                <TableCell className='p-1 hidden sm:table-cell'>
                                  <Image
                                    src={
                                      product.image_url ||
                                      `https://placehold.co/28x28.png`
                                    }
                                    alt={product.name}
                                    width={28}
                                    height={28}
                                    className='rounded object-cover h-7 w-7'
                                    data-ai-hint={
                                      product.image_hint ||
                                      product.name
                                        .split(' ')
                                        .slice(0, 2)
                                        .join(' ')
                                        .toLowerCase()
                                    }
                                    onError={(e) =>
                                      (e.currentTarget.src =
                                        'https://placehold.co/28x28.png')
                                    }
                                  />
                                </TableCell>
                                <TableCell className='p-1.5 text-xs font-medium'>
                                  {product.name}
                                </TableCell>
                                <TableCell className='p-1.5 text-xs font-medium'>
                                  {product.sku ?? '-'}
                                </TableCell>
                                <TableCell className='p-1.5 text-xs text-right'>
                                  {formatCurrency(product.price)}
                                </TableCell>
                                <TableCell className='p-1.5 text-xs text-center hidden md:table-cell'>
                                  {product.quantity}
                                </TableCell>
                                <TableCell className='p-1.5 text-xs text-center'>
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    className='h-7 text-xs'
                                    disabled={
                                      !activeShift || product.quantity <= 0
                                    }
                                    onClick={() =>
                                      product.quantity > 0 &&
                                      handleAddToCart(product)
                                    }
                                  >
                                    <PackagePlus className='mr-1 h-3 w-3' />{' '}
                                    Tambah
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {!activeShift && (
                      <div className='absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md z-10'>
                        <p className='text-sm font-medium text-muted-foreground p-4 bg-card border rounded-lg shadow-md'>
                          Mulai shift untuk mengaktifkan penjualan.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className='flex justify-between items-center pt-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      className='text-xs h-8'
                      onClick={handlePrevPage}
                      disabled={currentPage <= 1 || loadingItems}
                    >
                      <ChevronLeft className='mr-1 h-4 w-4' /> Sebelumnya
                    </Button>
                    <span className='text-xs text-muted-foreground'>
                      Halaman {currentPage} dari {totalPages}
                    </span>
                    <Button
                      variant='outline'
                      size='sm'
                      className='text-xs h-8'
                      onClick={handleNextPage}
                      disabled={
                        currentPage >= totalPages ||
                        loadingItems ||
                        !activeShift
                      }
                    >
                      Berikutnya <ChevronRight className='ml-1 h-4 w-4' />
                    </Button>
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={35} minSize={35}>
                <Card className='m-3 ml-2 flex flex-col shadow-lg rounded-lg h-full'>
                  <CardHeader className='p-3 border-b'>
                    <CardTitle className='text-base font-semibold'>
                      Penjualan Saat Ini
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='flex-grow overflow-y-auto p-0'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className='text-xs px-2 py-1.5'>
                            Item
                          </TableHead>
                          <TableHead className='text-center text-xs px-1 py-1.5 w-[60px]'>
                            Quantity
                          </TableHead>
                          <TableHead className='text-right text-xs px-2 py-1.5'>
                            Harga
                          </TableHead>
                          <TableHead className='text-xs px-1 py-1.5 text-center w-[60px]'>
                            Diskon
                          </TableHead>
                          <TableHead className='text-right text-xs px-2 py-1.5'>
                            Total
                          </TableHead>
                          <TableHead className='text-right text-xs px-1 py-1.5 w-[30px]'>
                            {' '}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cartItems.map((item) => (
                          <TableRow key={item.product_id}>
                            <TableCell className='font-medium text-xs py-1 px-2 truncate'>
                              {item.product_name}
                              {item.discount_amount > 0 && (
                                <div className='flex items-center gap-1'>
                                  <span className='text-[0.65rem] text-muted-foreground line-through'>
                                    {formatCurrency(item.original_price || 0)}
                                  </span>
                                  <span className='text-[0.65rem] text-destructive'>
                                    (-
                                    {formatCurrency(item.discount_amount)})
                                  </span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className='text-center text-xs py-1 px-1'>
                              <div className='flex items-center justify-center gap-0.5'>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='h-5 w-5 text-muted-foreground hover:text-foreground'
                                  disabled={!activeShift}
                                  onClick={() =>
                                    handleUpdateCartQuantity(
                                      item.product_id,
                                      item.quantity - 1
                                    )
                                  }
                                >
                                  <MinusCircle className='h-3.5 w-3.5' />
                                </Button>
                                <Input
                                  type='number'
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateCartQuantity(
                                      item.product_id,
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className='h-6 w-9 text-center text-xs p-0 border-0 focus-visible:ring-0 bg-transparent'
                                  disabled={!activeShift}
                                />
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='h-5 w-5 text-muted-foreground hover:text-foreground'
                                  disabled={!activeShift}
                                  onClick={() =>
                                    handleUpdateCartQuantity(
                                      item.product_id,
                                      item.quantity + 1
                                    )
                                  }
                                >
                                  <PlusCircle className='h-3.5 w-3.5' />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className='text-right text-xs py-1 px-2'>
                              {formatCurrency(item.price)}
                            </TableCell>
                            <TableCell className='text-center py-1 px-1'>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-6 w-6'
                                onClick={() =>
                                  handleOpenItemDiscountDialog(item)
                                }
                                disabled={!activeShift}
                              >
                                <Edit3 className='h-3.5 w-3.5 text-blue-600' />
                                <span className='sr-only'>Edit Diskon</span>
                              </Button>
                            </TableCell>
                            <TableCell className='text-right text-xs py-1 px-2'>
                              {formatCurrency(item.subtotal)}
                            </TableCell>
                            <TableCell className='text-right py-1 px-1'>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-5 w-5 text-destructive hover:text-destructive/80'
                                disabled={!activeShift}
                                onClick={() =>
                                  handleRemoveFromCart(item.product_id)
                                }
                              >
                                <XCircle className='h-3.5 w-3.5' />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {cartItems.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className='text-center text-muted-foreground py-8 text-xs'
                            >
                              <ShoppingCart className='mx-auto h-8 w-8 text-muted-foreground/50 mb-2' />
                              Keranjang kosong
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                  <CardFooter className='flex flex-col gap-1.5 border-t p-3'>
                    <div className='flex justify-between text-xs w-full'>
                      <span>Subtotal (Stlh Diskon Item):</span>
                      <span>{formatCurrency(displaySubtotal)}</span>
                    </div>
                    <div className='flex justify-between text-xs w-full'>
                      <span>
                        Pajak (
                        {selectedBranch?.tax_rate ||
                          (tax_rate * 100).toFixed(0)}
                        %):
                      </span>
                      <span>
                        {currencySymbol}
                        {tax.toLocaleString('id-ID')}
                      </span>
                    </div>

                    {/* Pilihan Mode Pajak */}
                    <div className='w-full mt-2'>
                      <Label className='text-xs font-medium mb-1 block'>
                        Mode Pajak
                      </Label>
                      <Select
                        value={taxMode}
                        onValueChange={(v) => setTaxMode(v as TaxMode)}
                        disabled={!activeShift || cartItems.length === 0}
                      >
                        <SelectTrigger className='h-8 text-xs'>
                          <SelectValue placeholder='Pilih mode pajak' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='no_tax' className='text-xs'>
                            Tanpa Pajak
                          </SelectItem>
                          <SelectItem value='add_tax' className='text-xs'>
                            Tambah Pajak ({(tax_rate * 100).toFixed(0)}%)
                          </SelectItem>
                          <SelectItem
                            value='price_includes_tax'
                            className='text-xs'
                          >
                            Harga Termasuk Pajak
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='w-full grid grid-cols-2 gap-x-3 gap-y-1.5 mt-1'>
                      <div>
                        <Label
                          htmlFor='shippingCostInput'
                          className='text-[0.7rem] text-muted-foreground'
                        >
                          Ongkos Kirim ({currencySymbol})
                        </Label>
                        <Input
                          id='shippingCostInput'
                          type='number'
                          value={shippingCostInput}
                          onChange={(e) => setShippingCostInput(e.target.value)}
                          placeholder='0'
                          className='h-8 text-xs mt-0.5'
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor='voucherCodeInput'
                          className='text-[0.7rem] text-muted-foreground'
                        >
                          Kode Voucher
                        </Label>
                        <Input
                          id='voucherCodeInput'
                          type='text'
                          value={voucherCodeInput}
                          onChange={(e) => setVoucherCodeInput(e.target.value)}
                          placeholder='Opsional'
                          className='h-8 text-xs mt-0.5'
                        />
                      </div>
                      <div className='col-span-2'>
                        <Label
                          htmlFor='voucherDiscountInput'
                          className='text-[0.7rem] text-muted-foreground'
                        >
                          Diskon Voucher ({currencySymbol})
                        </Label>
                        <Input
                          id='voucherDiscountInput'
                          type='number'
                          value={voucherDiscountInput}
                          onChange={(e) =>
                            setVoucherDiscountInput(e.target.value)
                          }
                          placeholder='0'
                          className='h-8 text-xs mt-0.5'
                        />
                      </div>
                    </div>

                    {totalDiscountAmount > 0 && (
                      <div className='flex justify-between text-xs w-full text-destructive pt-1'>
                        <span>Total Diskon Keseluruhan:</span>
                        <span>
                          -{currencySymbol}
                          {totalDiscountAmount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}

                    <div className='flex justify-between text-base font-bold w-full mt-1.5 pt-1.5 border-t'>
                      <span>Total:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>

                    <div className='w-full mt-2 pt-2 border-t'>
                      <Label className='text-xs font-medium mb-1 block'>
                        Termin Pembayaran:
                      </Label>
                      <Select
                        value={selectedPaymentTerms}
                        onValueChange={(value) => {
                          setSelectedPaymentTerms(value as PaymentMethod)
                          if (value !== 'credit') {
                            setSelectedCustomerId(undefined)
                            setCreditDueDate(undefined)
                            setSearchCustomerTerm('')
                          }
                        }}
                        disabled={!activeShift || cartItems.length === 0}
                      >
                        <SelectTrigger className='h-9 text-xs'>
                          <SelectValue placeholder='Pilih termin pembayaran' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='cash' className='text-xs'>
                            <DollarSign className='inline-block mr-2 h-4 w-4' />
                            Tunai
                          </SelectItem>
                          {/* <SelectItem value='card' className='text-xs'>
                            <CreditCard className='inline-block mr-2 h-4 w-4' />
                            Kartu
                          </SelectItem> */}
                          <SelectItem value='transfer' className='text-xs'>
                            <Banknote className='inline-block mr-2 h-4 w-4' />
                            Transfer Bank
                          </SelectItem>
                          <SelectItem value='credit' className='text-xs'>
                            <UserPlus className='inline-block mr-2 h-4 w-4' />
                            Kredit
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedPaymentTerms === 'credit' && (
                      <div className='w-full mt-2 space-y-2 p-2 border rounded-md bg-muted/30'>
                        <div className='flex items-center gap-2'>
                          <div className='flex-grow'>
                            <Label
                              htmlFor='selectedCustomer'
                              className='text-xs'
                            >
                              Pelanggan
                            </Label>
                            <Popover
                              open={isCustomerComboboxOpen}
                              onOpenChange={setIsCustomerComboboxOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant='outline'
                                  role='combobox'
                                  aria-expanded={isCustomerComboboxOpen}
                                  className='w-full justify-between h-8 text-xs mt-1 font-normal'
                                  disabled={
                                    loadingCustomers ||
                                    allCustomers.length === 0
                                  }
                                >
                                  {selectedCustomerId
                                    ? allCustomers.find(
                                        (customer) =>
                                          String(customer.id) ===
                                          selectedCustomerId
                                      )?.name
                                    : loadingCustomers
                                    ? 'Memuat...'
                                    : allCustomers.length === 0
                                    ? 'Tidak ada pelanggan'
                                    : 'Cari Pelanggan'}
                                  {!loadingCustomers ? (
                                    <ChevronsUpDown className='ml-2 h-3.5 w-3.5 shrink-0 opacity-50' />
                                  ) : (
                                    <Loader2 className='ml-2 h-3.5 w-3.5 shrink-0 opacity-50 animate-spin' />
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className='w-[--radix-popover-trigger-width] p-0'>
                                <Command shouldFilter={false}>
                                  <CommandInput
                                    placeholder='Cari pelanggan (nama/phone)...'
                                    value={searchCustomerTerm}
                                    onValueChange={setSearchCustomerTerm}
                                    className='h-9 text-xs'
                                  />
                                  <CommandEmpty className='p-2 text-xs text-center'>
                                    {loadingCustomers
                                      ? 'Memuat...'
                                      : 'Pelanggan tidak ditemukan.'}
                                    {!loadingCustomers ? (
                                      <ChevronsUpDown className='ml-2 h-3.5 w-3.5 shrink-0 opacity-50' />
                                    ) : (
                                      <Loader2 className='ml-2 h-3.5 w-3.5 shrink-0 opacity-50 animate-spin' />
                                    )}
                                  </CommandEmpty>
                                  <CommandList>
                                    <CommandGroup>
                                      {allCustomers.map((customer) => (
                                        <CommandItem
                                          key={customer.id}
                                          value={String(customer.id)}
                                          onSelect={(currentValue) => {
                                            setSelectedCustomerId(
                                              currentValue ===
                                                selectedCustomerId
                                                ? undefined
                                                : currentValue
                                            )
                                            setCustomerSearchTerm(
                                              currentValue ===
                                                selectedCustomerId
                                                ? ''
                                                : customer.name
                                            )
                                            setIsCustomerComboboxOpen(false)
                                          }}
                                          className='text-xs'
                                        >
                                          <CheckCircle
                                            className={cn(
                                              'mr-2 h-3.5 w-3.5',
                                              selectedCustomerId ===
                                                String(customer.id)
                                                ? 'opacity-100'
                                                : 'opacity-0'
                                            )}
                                          />
                                          {customer.name}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            className='h-8 w-8 mt-[18px]'
                            onClick={() => setShowScanCustomerDialog(true)}
                            disabled={loadingCustomers}
                          >
                            <QrCode className='h-4 w-4' />
                            <span className='sr-only'>Scan Pelanggan</span>
                          </Button>
                        </div>
                        <div>
                          <Label htmlFor='creditDueDate' className='text-xs'>
                            Tgl Jatuh Tempo
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'w-full justify-start text-left font-normal h-8 text-xs mt-1',
                                  !creditDueDate && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className='mr-1.5 h-3.5 w-3.5' />
                                {creditDueDate ? (
                                  format(creditDueDate, 'dd MMM yyyy')
                                ) : (
                                  <span>Pilih tanggal</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className='w-auto p-0'>
                              <Calendar
                                mode='single'
                                selected={creditDueDate}
                                onSelect={setCreditDueDate}
                                initialFocus
                                disabled={(date) =>
                                  date <
                                  new Date(new Date().setHours(0, 0, 0, 0))
                                }
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    )}
                    {selectedPaymentTerms === 'cash' && (
                      <div className='w-full mt-2 space-y-2 p-2 border rounded-md bg-muted/30'>
                        <Label
                          htmlFor='customer_nameInputCash'
                          className='text-xs'
                        >
                          Nama Pelanggan (Opsional)
                        </Label>
                        <div className='flex-grow'>
                          <Popover
                            modal={true}
                            open={isCustomerComboboxOpen}
                            onOpenChange={setIsCustomerComboboxOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant='outline'
                                role='combobox'
                                aria-expanded={isCustomerComboboxOpen}
                                className='w-full justify-between h-8 text-xs mt-1 font-normal'
                              >
                                {selectedCustomerId
                                  ? allCustomers.find(
                                      (customer) =>
                                        String(customer.id) ===
                                        selectedCustomerId
                                    )?.name
                                  : loadingCustomers
                                  ? 'Memuat...'
                                  : allCustomers.length === 0
                                  ? 'Tidak ada pelanggan'
                                  : 'Cari Pelanggan'}
                                {!loadingCustomers ? (
                                  <ChevronsUpDown className='ml-2 h-3.5 w-3.5 shrink-0 opacity-50' />
                                ) : (
                                  <Loader2 className='ml-2 h-3.5 w-3.5 shrink-0 opacity-50 animate-spin' />
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              asChild
                              className='w-[--radix-popover-trigger-width] p-0'
                            >
                              <Command shouldFilter={false}>
                                <CommandInput
                                  placeholder='Cari pelanggan (nama/phone)...'
                                  value={searchCustomerTerm}
                                  onValueChange={setSearchCustomerTerm}
                                  className='h-9 text-xs'
                                />
                                <CommandEmpty className='p-2 text-xs text-center'>
                                  {loadingCustomers
                                    ? 'Memuat...'
                                    : 'Pelanggan tidak ditemukan.'}
                                  {!loadingCustomers ? (
                                    <ChevronsUpDown className='ml-2 h-3.5 w-3.5 shrink-0 opacity-50' />
                                  ) : (
                                    <Loader2 className='ml-2 h-3.5 w-3.5 shrink-0 opacity-50 animate-spin' />
                                  )}
                                </CommandEmpty>
                                <CommandList>
                                  <CommandGroup>
                                    {allCustomers.map((customer) => (
                                      <CommandItem
                                        key={customer.id}
                                        value={String(customer.id)}
                                        onSelect={(currentValue) => {
                                          setSelectedCustomerId(
                                            currentValue === selectedCustomerId
                                              ? undefined
                                              : currentValue
                                          )
                                          setCustomerSearchTerm(
                                            currentValue === selectedCustomerId
                                              ? ''
                                              : customer.name
                                          )
                                          setIsCustomerComboboxOpen(false)
                                        }}
                                        className='text-xs'
                                      >
                                        <CheckCircle
                                          className={cn(
                                            'mr-2 h-3.5 w-3.5',
                                            selectedCustomerId ===
                                              String(customer.id)
                                              ? 'opacity-100'
                                              : 'opacity-0'
                                          )}
                                        />
                                        {customer.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        {/* <div className='flex items-center mt-1'>
                    <UserPlus className='h-4 w-4 mr-2 text-muted-foreground' />
                    <Input
                      id='customer_nameInputCash'
                      type='text'
                      value={customer_nameInputCash}
                      onChange={(e) =>
                        setcustomer_nameInputCash(e.target.value)
                      }
                      placeholder='Masukkan nama pelanggan'
                      className='h-9 text-sm flex-1'
                    />
                  </div> */}
                        <p className='text-xs text-muted-foreground mt-1'>
                          Kosongkan jika tidak ada nama pelanggan.
                        </p>
                      </div>
                    )}

                    <Button
                      size='lg'
                      className='w-full my-4 h-10 text-sm'
                      disabled={
                        !activeShift ||
                        cartItems.length === 0 ||
                        isProcessingSale ||
                        (selectedPaymentTerms === 'credit' &&
                          (!selectedCustomerId || !creditDueDate))
                      }
                      onClick={handleCompleteSale}
                    >
                      {isProcessingSale ? (
                        'Memproses...'
                      ) : (
                        <>
                          <CheckCircle className='mr-1.5 h-4 w-4' /> Selesaikan
                          Penjualan
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>

        {/* Item Discount Dialog */}
        <Dialog
          open={isItemDiscountDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedItemForDiscount(null)
              setCurrentDiscountValue('')
            }
            setIsItemDiscountDialogOpen(open)
          }}
        >
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle className='text-base'>
                Diskon untuk: {selectedItemForDiscount?.product_name}
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Harga Asli: {currencySymbol}
                {(selectedItemForDiscount?.original_price || 0).toLocaleString(
                  'id-ID'
                )}{' '}
                per item
              </DialogDescription>
            </DialogHeader>
            <div className='py-3 space-y-3'>
              <div>
                <Label className='text-xs'>Tipe Diskon</Label>
                <RadioGroup
                  value={currentDiscountType}
                  onValueChange={handleItemDiscountTypeChange}
                  className='flex gap-4 mt-1'
                >
                  <div className='flex items-center space-x-2'>
                    <RadioGroupItem value='nominal' id='nominal' />
                    <Label htmlFor='nominal' className='text-xs font-normal'>
                      Nominal ({currencySymbol})
                    </Label>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <RadioGroupItem value='percentage' id='percentage' />
                    <Label htmlFor='percentage' className='text-xs font-normal'>
                      Persentase (%)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label htmlFor='discountValue' className='text-xs'>
                  Nilai Diskon
                </Label>
                <Input
                  id='discountValue'
                  type='number'
                  value={currentDiscountValue}
                  onChange={(e) =>
                    handleItemDiscountValueChange(e.target.value)
                  }
                  placeholder={
                    currentDiscountType === 'nominal'
                      ? 'Contoh: 5000'
                      : 'Contoh: 10'
                  }
                  className='h-9 text-sm mt-1'
                />
              </div>
              {selectedItemForDiscount && currentDiscountValue && (
                <div className='text-xs space-y-0.5 pt-1'>
                  <p>
                    Diskon Dihitung:{' '}
                    <span className='font-medium'>
                      {currencySymbol}
                      {previewActualDiscountAmount.toLocaleString('id-ID')}
                    </span>
                  </p>
                  <p>
                    Harga Baru per Item:{' '}
                    <span className='font-medium'>
                      {currencySymbol}
                      {previewDiscountedPrice.toLocaleString('id-ID')}
                    </span>
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className='grid grid-cols-2 gap-2 pt-2'>
              <Button
                type='button'
                variant='destructive'
                className='text-xs h-8 col-span-1'
                onClick={handleRemoveCurrentItemDiscount}
                disabled={
                  !selectedItemForDiscount ||
                  (selectedItemForDiscount.discount_amount || 0) === 0
                }
              >
                <Trash2 className='mr-1.5 h-3.5 w-3.5' /> Hapus Diskon
              </Button>
              <div className='col-span-1 flex justify-end gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  className='text-xs h-8'
                  onClick={() => setIsItemDiscountDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type='button'
                  className='text-xs h-8'
                  onClick={handleConfirmItemDiscount}
                  disabled={!selectedItemForDiscount}
                >
                  Terapkan
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showStartShiftModal}
          onOpenChange={setShowStartShiftModal}
        >
          <DialogContent className='sm:max-w-xs'>
            <DialogHeader>
              <DialogTitle className='text-base'>Mulai Shift Baru</DialogTitle>
              <DialogDescription className='text-xs'>
                Masukkan jumlah modal awal kas di laci kas.
              </DialogDescription>
            </DialogHeader>
            <div className='py-2 space-y-2'>
              <Label htmlFor='initialCashInput' className='text-xs'>
                Modal Awal Kas ({currencySymbol})
              </Label>
              <Input
                id='initialCashInput'
                type='number'
                value={initialCashInput}
                onChange={(e) => setInitialCashInput(e.target.value)}
                placeholder='Contoh: 500000'
                className='h-9 text-sm'
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type='button' variant='outline' className='text-xs h-8'>
                  Batal
                </Button>
              </DialogClose>
              <Button onClick={handleStartShift} className='text-xs h-8'>
                Mulai Shift
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showEndShiftModal} onOpenChange={setShowEndShiftModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Konfirmasi Akhiri Shift</DialogTitle>
              <DialogDescription>
                Harap hitung kas fisik Anda dan masukkan jumlahnya di bawah ini.
              </DialogDescription>
            </DialogHeader>
            <div className='py-4 space-y-4'>
              <div className='p-4 bg-muted rounded-lg'>
                <h4 className='font-semibold mb-2'>Ringkasan Penjualan</h4>
                <div className='space-y-1 text-sm'>
                  {endShiftCalculations &&
                    Object.entries(
                      endShiftCalculations.totalSalesByPaymentMethod
                    ).map(([method, total]) => (
                      <div key={method} className='flex justify-between'>
                        <span>Penjualan {method}</span>
                        <span>{formatCurrency(total)}</span>
                      </div>
                    ))}
                  <div className='flex justify-between font-bold pt-2 border-t'>
                    <span>Total Penjualan</span>
                    <span>
                      {formatCurrency(endShiftCalculations?.totalSales ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className='p-4 border rounded-lg'>
                <h4 className='font-semibold mb-2'>Perhitungan Kas</h4>
                <div className='space-y-1 text-sm'>
                  <div className='flex justify-between'>
                    <span>Kas Seharusnya</span>
                    <span>
                      {formatCurrency(endShiftCalculations?.expectedCash ?? 0)}
                    </span>
                  </div>
                  <div>
                    <Label htmlFor='actual-cash'>Kas Aktual di Laci</Label>
                    <div className='relative mt-1'>
                      <span className='absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground'>
                        {selectedBranch?.currency}
                      </span>
                      <Input
                        id='actual-cash'
                        type='number'
                        value={actualCashAtEndInput}
                        onChange={(e) =>
                          setActualCashAtEndInput(e.target.value)
                        }
                        placeholder='0'
                        className='pl-10'
                      />
                    </div>
                  </div>
                  <div
                    className={`flex justify-between font-bold pt-2 ${
                      endShiftCalculations?.difference !== 0
                        ? 'text-red-500'
                        : ''
                    }`}
                  >
                    <span>Selisih</span>
                    <span>
                      {endShiftCalculations
                        ? formatCurrency(endShiftCalculations.difference ?? 0)
                        : formatCurrency(0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => {
                  setShowEndShiftModal(false)
                  setActualCashAtEndInput('')
                  setEndShiftCalculations(null)
                }}
                disabled={isEndingShift}
              >
                Batal
              </Button>
              <Button onClick={handleEndShiftConfirm} disabled={isEndingShift}>
                {isEndingShift ? 'Memproses...' : 'Konfirmasi & Akhiri Shift'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* <AlertDialog
          open={showEndShiftModal}
          onOpenChange={setShowEndShiftModal}
        >
          <AlertDialogContent className='sm:max-w-md'>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Akhiri Shift</AlertDialogTitle>
              <AlertDialogDescription className='text-xs'>
                {activeShift && endShiftCalculations && (
                  <div className='mt-2 p-2 border rounded-md bg-muted/50 text-xs space-y-1'>
                    <p>
                      Modal Awal:
                      {formatCurrency(activeShift.starting_balance)}
                    </p>
                    <p>
                      Total Penjualan Tunai:
                      {formatCurrency(
                        endShiftCalculations.totalSalesByPaymentMethod.cash
                      )}
                    </p>
                    <p>
                      Total Penjualan Kredit:
                      {formatCurrency(
                        endShiftCalculations.totalSalesByPaymentMethod.credit
                      )}
                    </p>
                    <p>
                      Total Penjualan Qris:
                      {formatCurrency(
                        endShiftCalculations.totalSalesByPaymentMethod.qris
                      )}
                    </p>
                    <p>
                      Total Penjualan Transfer:
                      {formatCurrency(
                        endShiftCalculations.totalSalesByPaymentMethod.transfer
                      )}
                    </p>
                    <p>
                      Total Penjualan Semua:
                      {formatCurrency(endShiftCalculations.totalSales)}
                    </p>
                    <p className='font-semibold text-md'>
                      Estimasi Kas Seharusnya:
                      {formatCurrency(endShiftCalculations.expectedCash)}
                    </p>
                  </div>
                )}
                <div className='mt-2'>
                  <Label htmlFor='actualCashAtEndInput' className='text-xs'>
                    Kas Aktual di Laci
                  </Label>
                  <Input
                    id='actualCashAtEndInput'
                    type='number'
                    value={actualCashAtEndInput}
                    onChange={(e) => setActualCashAtEndInput(e.target.value)}
                    placeholder='Hitung dan masukkan kas aktual'
                    className='h-9 text-sm mt-1'
                  />
                </div>
                {activeShift &&
                  endShiftCalculations &&
                  actualCashAtEndInput &&
                  !isNaN(parseFloat(actualCashAtEndInput)) && (
                    <p className='mt-1 font-medium text-xs'>
                      Selisih Kas:{' '}
                      <span
                        className={cn(
                          parseFloat(actualCashAtEndInput) -
                            endShiftCalculations.expectedCash <
                            0
                            ? 'text-destructive'
                            : 'text-green-600'
                        )}
                      >
                        {currencySymbol}
                        {(
                          parseFloat(actualCashAtEndInput) -
                          endShiftCalculations.expectedCash
                        ).toLocaleString('id-ID')}
                      </span>
                      {parseFloat(actualCashAtEndInput) -
                        endShiftCalculations.expectedCash ===
                      0
                        ? ' (Sesuai)'
                        : ''}
                      {parseFloat(actualCashAtEndInput) -
                        endShiftCalculations.expectedCash <
                      0
                        ? ' (Kurang)'
                        : ''}
                      {parseFloat(actualCashAtEndInput) -
                        endShiftCalculations.expectedCash >
                      0
                        ? ' (Lebih)'
                        : ''}
                    </p>
                  )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                className='text-xs h-8'
                onClick={() => {
                  setShowEndShiftModal(false)
                  setActualCashAtEndInput('')
                  setEndShiftCalculations(null)
                }}
              >
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                className='text-xs h-8 bg-destructive hover:bg-destructive/90'
                onClick={handleEndShiftConfirm}
                disabled={isEndingShift || !actualCashAtEndInput.trim()}
              >
                {isEndingShift ? 'Memproses...' : 'Ya, Akhiri Shift'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog> */}

        <Dialog
          open={showCashPaymentModal}
          onOpenChange={setShowCashPaymentModal}
        >
          <DialogContent className='sm:max-w-sm'>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleConfirmCashPayment()
              }}
            >
              <DialogHeader>
                <DialogTitle className='text-base'>
                  Pembayaran Tunai
                </DialogTitle>
                <DialogDescription className='text-xs'>
                  Total Belanja:{' '}
                  <span className='font-semibold'>
                    {currencySymbol}
                    {total.toLocaleString('id-ID')}
                  </span>
                </DialogDescription>
              </DialogHeader>
              <div className='py-3 space-y-3'>
                <div>
                  <Label htmlFor='cashAmountPaidInput' className='text-xs'>
                    Jumlah Dibayar Pelanggan ({currencySymbol})
                  </Label>
                  <Input
                    id='cashAmountPaidInput'
                    type='number'
                    value={cashAmountPaidInput}
                    onChange={handleCashAmountPaidChange}
                    placeholder='Masukkan jumlah bayar'
                    className='h-9 text-sm mt-1'
                  />
                </div>
                {calculatedChange !== null && (
                  <p
                    className={cn(
                      'text-sm font-medium',
                      calculatedChange < 0
                        ? 'text-destructive'
                        : 'text-green-600'
                    )}
                  >
                    Kembalian: {currencySymbol}
                    {calculatedChange.toLocaleString('id-ID')}
                  </p>
                )}
              </div>
              <DialogFooter className='mt-4'>
                <DialogClose asChild>
                  <Button
                    type='button'
                    variant='outline'
                    className='text-xs h-8'
                    onClick={() => setShowCashPaymentModal(false)}
                  >
                    Batal
                  </Button>
                </DialogClose>
                <Button
                  type='submit' // agar Enter memicu tombol ini
                  className='text-xs h-8'
                  disabled={
                    isProcessingSale ||
                    calculatedChange === null ||
                    calculatedChange < 0
                  }
                >
                  {isProcessingSale ? 'Memproses...' : 'Konfirmasi Pembayaran'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showBankPaymentModal}
          onOpenChange={setShowBankPaymentModal}
        >
          <DialogContent className='sm:max-w-sm'>
            <DialogHeader>
              <DialogTitle className='text-base'>
                Pembayaran via Transfer Bank
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Total Belanja:{' '}
                <span className='font-semibold'>
                  {currencySymbol}
                  {total.toLocaleString('id-ID')}
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className='py-3 space-y-3'>
              <div>
                <Label htmlFor='selectedbank_name' className='text-xs'>
                  Nama Bank*
                </Label>
                <Select
                  value={selectedbank_name}
                  onValueChange={setSelectedbank_name}
                  disabled={loadingBankAccounts}
                >
                  <SelectTrigger
                    id='selectedbank_name'
                    className='h-9 text-xs mt-1'
                  >
                    <SelectValue
                      placeholder={
                        loadingBankAccounts ? 'Memuat...' : 'Pilih bank tujuan'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBankAccounts.length === 0 &&
                    !loadingBankAccounts ? (
                      <SelectItem
                        value='no-accounts'
                        disabled
                        className='text-xs text-muted-foreground'
                      >
                        Tidak ada rekening bank aktif
                      </SelectItem>
                    ) : (
                      availableBankAccounts.map((acc) => (
                        <SelectItem
                          key={acc.id}
                          value={acc.bank_name}
                          className='text-xs'
                        >
                          {acc.bank_name} ({acc.account_number}) - A/N:{' '}
                          {acc.account_holder_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor='bankRefNumberInput' className='text-xs'>
                  Nomor Referensi Transaksi*
                </Label>
                <Input
                  id='bankRefNumberInput'
                  type='text'
                  value={bankRefNumberInput}
                  onChange={(e) => setBankRefNumberInput(e.target.value)}
                  placeholder='Masukkan nomor referensi'
                  className='h-9 text-sm mt-1'
                />
              </div>
              <div>
                <Label htmlFor='customer_nameInputBank' className='text-xs'>
                  Nama Pelanggan (Opsional)
                </Label>
                <div className='flex items-center mt-1'>
                  <UserPlus className='h-4 w-4 mr-2 text-muted-foreground' />
                  <Input
                    id='customer_nameInputBank'
                    type='text'
                    value={customer_nameInputBank}
                    onChange={(e) => setcustomer_nameInputBank(e.target.value)}
                    placeholder='Masukkan nama pelanggan'
                    className='h-9 text-sm flex-1'
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type='button'
                  variant='outline'
                  className='text-xs h-8'
                  onClick={() => setShowBankPaymentModal(false)}
                >
                  Batal
                </Button>
              </DialogClose>
              <Button
                onClick={handleConfirmBankPayment}
                className='text-xs h-8'
                disabled={
                  isProcessingSale ||
                  !selectedbank_name ||
                  !bankRefNumberInput.trim()
                }
              >
                {isProcessingSale ? 'Memproses...' : 'Konfirmasi Pembayaran'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showPrintInvoiceDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowPrintInvoiceDialog(false)
              setLastTransactionId(null)
            } else {
              setShowPrintInvoiceDialog(true)
            }
          }}
        >
          <DialogContent className='sm:max-w-xs'>
            <DialogHeader>
              <DialogTitle className='text-base'>
                Transaksi Berhasil
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Penjualan telah berhasil direkam.
              </DialogDescription>
            </DialogHeader>
            <div className='py-4'>
              <p className='text-sm text-center'>
                Apakah Anda ingin mencetak invoice untuk transaksi ini?
              </p>
            </div>
            <DialogFooter className='sm:justify-center'>
              <Button
                type='button'
                variant='outline'
                className='text-xs h-8'
                onClick={() => {
                  setShowPrintInvoiceDialog(false)
                  setLastTransactionId(null)
                }}
              >
                Tutup
              </Button>
              <Button
                onClick={() => handlePrintInvoice()}
                className='text-xs h-8'
                disabled={!lastTransactionId}
              >
                <Printer className='mr-1.5 h-4 w-4' /> Cetak Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* <ScanCustomerDialog isOpen={showScanCustomerDialog} /> */}

        <Dialog
          open={showBankHistoryDialog}
          onOpenChange={setShowBankHistoryDialog}
        >
          <DialogContent className='sm:max-w-2xl'>
            <DialogHeader>
              <DialogTitle className='text-base'>
                Riwayat Transaksi Transfer Bank (Shift Ini)
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Menampilkan semua transaksi dengan metode pembayaran transfer
                bank selama shift berjalan.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className='max-h-[60vh] py-3'>
              {loadingShiftTransactions ? (
                <Skeleton className='h-20 w-full' />
              ) : bankTransactionsInShift.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-xs'>No. Inv</TableHead>
                      <TableHead className='text-xs'>Tanggal</TableHead>
                      <TableHead className='text-xs'>Bank</TableHead>
                      <TableHead className='text-xs hidden sm:table-cell'>
                        Ref.
                      </TableHead>
                      <TableHead className='text-xs text-right'>
                        Jumlah
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankTransactionsInShift.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className='text-xs py-1.5 font-medium'>
                          {tx.transaction_number}
                        </TableCell>
                        <TableCell className='text-xs py-1.5'>
                          {formatDateIntlIntl(tx.created_at)}
                        </TableCell>
                        <TableCell className='text-xs py-1.5'>
                          {tx.bank_name || '-'}
                        </TableCell>
                        <TableCell className='text-xs hidden sm:table-cell py-1.5'>
                          {tx.bank_transaction_ref || '-'}
                        </TableCell>
                        <TableCell className='text-xs text-right py-1.5'>
                          {formatCurrency(tx.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className='text-sm text-muted-foreground text-center py-4'>
                  Belum ada transaksi transfer bank pada shift ini.
                </p>
              )}
            </ScrollArea>
            <DialogFooter>
              <DialogClose asChild>
                <Button type='button' variant='outline' className='text-xs h-8'>
                  Tutup
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showCashHistoryDialog}
          onOpenChange={setShowCashHistoryDialog}
        >
          <DialogContent className='sm:max-w-2xl'>
            <DialogHeader>
              <DialogTitle className='text-base'>
                Riwayat Transaksi Tunai (Shift Ini)
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Menampilkan semua transaksi dengan metode pembayaran tunai
                selama shift berjalan.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className='max-h-[60vh] py-3'>
              {loadingShiftTransactions ? (
                <Skeleton className='h-20 w-full' />
              ) : cashTransactionsInShift.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-xs'>No. Inv</TableHead>
                      <TableHead className='text-xs'>Tanggal</TableHead>
                      <TableHead className='text-xs'>Pelanggan</TableHead>
                      <TableHead className='text-xs text-right'>
                        Dibayar
                      </TableHead>
                      <TableHead className='text-xs text-right'>
                        Kembalian
                      </TableHead>
                      <TableHead className='text-xs text-right'>
                        Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashTransactionsInShift.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className='text-xs py-1.5 font-medium'>
                          {tx.transaction_number}
                        </TableCell>
                        <TableCell className='text-xs py-1.5'>
                          {formatDateIntlIntl(tx.created_at)}
                        </TableCell>
                        <TableCell className='text-xs py-1.5'>
                          {tx.customer_name || 'Umum'}
                        </TableCell>
                        <TableCell className='text-xs text-right py-1.5'>
                          {formatCurrency(tx.amount_paid || 0)}
                        </TableCell>
                        <TableCell className='text-xs text-right py-1.5'>
                          {formatCurrency(tx.change_given || 0)}
                        </TableCell>
                        <TableCell className='text-xs text-right py-1.5'>
                          {formatCurrency(tx.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className='text-sm text-muted-foreground text-center py-4'>
                  Belum ada transaksi tunai pada shift ini.
                </p>
              )}
            </ScrollArea>
            <DialogFooter>
              <DialogClose asChild>
                <Button type='button' variant='outline' className='text-xs h-8'>
                  Tutup
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showShiftCashDetailsDialog}
          onOpenChange={setShowShiftCashDetailsDialog}
        >
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle className='text-base'>
                Informasi Kas Shift Saat Ini
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Detail keuangan untuk shift yang sedang berjalan.
                <br />
                {activeShift?.start_shift && (
                  <span className='block mt-1 text-[11px] text-muted-foreground'>
                    Shift dimulai pada:{' '}
                    <b>{formatDateIntlIntl(activeShift.start_shift)}</b>
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className='py-3 space-y-2 text-sm'>
              <div className='flex justify-between p-2 bg-muted/30 rounded-md'>
                <span>Modal Awal Shift:</span>
                <span className='font-semibold'>
                  {formatCurrency(activeShift?.starting_balance || 0)}
                </span>
              </div>
              <Separator />
              <div className='flex justify-between items-center p-2'>
                <span>Total Penjualan Tunai:</span>
                <div className='flex items-center gap-2'>
                  <span className='font-semibold'>
                    {formatCurrency(totalCashSalesInShift)}
                  </span>
                  <Button
                    variant='link'
                    size='sm'
                    className='h-auto p-0 text-xs'
                    onClick={() => {
                      setShowShiftCashDetailsDialog(false)
                      setShowCashHistoryDialog(true)
                    }}
                    disabled={cashTransactionsInShift.length === 0}
                  >
                    Detail
                  </Button>
                </div>
              </div>
              <div className='flex justify-between p-2 bg-muted/30 rounded-md'>
                <span>Estimasi Kas di Laci:</span>
                <span className='font-semibold'>
                  {formatCurrency(estimatedCashInDrawer)}
                </span>
              </div>
              <Separator />
              <div className='flex justify-between p-2'>
                <span>Total Penjualan Kartu:</span>
                <span className='font-semibold'>
                  {formatCurrency(totalCardSalesInShift)}
                </span>
              </div>
              <div className='flex justify-between p-2'>
                <span>Total Penjualan Kredit:</span>
                <span className='font-semibold'>
                  {formatCurrency(totalCreditSalesInShift)}
                </span>
              </div>
              <div className='flex justify-between items-center p-2 bg-muted/30 rounded-md'>
                <span>Total Penjualan Transfer:</span>
                <div className='flex items-center gap-2'>
                  <span className='font-semibold'>
                    {formatCurrency(totalTransferSalesInShift)}
                  </span>
                  <Button
                    variant='link'
                    size='sm'
                    className='h-auto p-0 text-xs'
                    onClick={() => {
                      setShowShiftCashDetailsDialog(false)
                      setShowBankHistoryDialog(true)
                    }}
                    disabled={bankTransactionsInShift.length === 0}
                  >
                    Detail
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type='button' variant='outline' className='text-xs h-8'>
                  Tutup
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Credit Confirmation Dialog */}
        <Dialog
          open={showCreditConfirmationDialog}
          onOpenChange={setShowCreditConfirmationDialog}
        >
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle>Konfirmasi Penjualan Kredit</DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin memproses penjualan kredit ini?
              </DialogDescription>
            </DialogHeader>
            <div className='py-3 space-y-2'>
              <div className='flex justify-between text-xs'>
                <span>Pelanggan:</span>
                <span className='font-semibold'>
                  {allCustomers.find((c) => String(c.id) === selectedCustomerId)
                    ?.name || '-'}
                </span>
              </div>
              <div className='flex justify-between text-xs'>
                <span>Jatuh Tempo:</span>
                <span className='font-semibold'>
                  {creditDueDate ? formatDateIntlIntl(creditDueDate) : '-'}
                </span>
              </div>
              <div className='flex justify-between text-sm font-bold border-t pt-2'>
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <DialogFooter className='flex flex-row gap-2 pt-2'>
              <Button
                variant='outline'
                className='text-xs h-8'
                onClick={() => setShowCreditConfirmationDialog(false)}
                disabled={isCreditSaleProcessing}
              >
                Batal
              </Button>
              {!isCreditSaleProcessing ? (
                <Button
                  className='text-xs h-8'
                  onClick={handleConfirmCreditSale}
                >
                  Konfirmasi
                </Button>
              ) : (
                <Button size='sm' disabled>
                  <Loader2Icon className='animate-spin' />
                  Please wait
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showAllShiftTransactionsDialog}
          onOpenChange={setShowAllShiftTransactionsDialog}
        >
          <DialogContent className='max-w-5xl'>
            <DialogHeader>
              <DialogTitle className='text-base'>
                Riwayat Transaksi Shift Ini
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Semua transaksi yang tercatat selama shift ini.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className='max-h-[60vh] py-3'>
              {loadingShiftTransactions ? (
                <Skeleton className='h-40 w-full' />
              ) : shiftTransactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-xs'>No. Invoice</TableHead>
                      <TableHead className='text-xs hidden sm:table-cell'>
                        Waktu
                      </TableHead>
                      <TableHead className='text-xs'>Pelanggan</TableHead>
                      <TableHead className='text-xs'>Metode</TableHead>
                      <TableHead className='text-xs text-right'>
                        Total
                      </TableHead>
                      <TableHead className='text-xs text-center'>
                        Status
                      </TableHead>
                      <TableHead className='text-xs text-center'>
                        Cetak
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shiftTransactions.map((tx) => (
                      <TableRow
                        key={tx.id}
                        className={cn(
                          tx.status === 'returned' && 'bg-muted/40'
                        )}
                      >
                        <TableCell className='text-xs py-1.5 font-medium'>
                          {tx.transaction_number}
                        </TableCell>
                        <TableCell className='text-xs hidden sm:table-cell py-1.5'>
                          {formatDateIntlIntl(tx.created_at)}
                        </TableCell>
                        <TableCell className='text-xs py-1.5'>
                          {tx.customer_name || '-'}
                        </TableCell>
                        <TableCell className='text-xs py-1.5 capitalize'>
                          {tx.payment_method}
                        </TableCell>
                        <TableCell className='text-xs text-right py-1.5'>
                          {formatCurrency(tx.total_amount)}
                        </TableCell>
                        <TableCell className='text-xs text-center py-1.5'>
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded-full text-[0.65rem] font-medium',
                              tx.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            )}
                          >
                            {tx.status === 'completed' ? 'Selesai' : 'Diretur'}
                          </span>
                        </TableCell>
                        <TableCell className='text-xs text-center py-1.5'>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-6 w-6'
                            onClick={() => handlePrintInvoiceFromHistory(tx.id)}
                          >
                            <Printer className='h-3.5 w-3.5 text-muted-foreground hover:text-primary' />
                            <span className='sr-only'>Cetak Ulang</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className='text-sm text-muted-foreground text-center py-6'>
                  Belum ada transaksi pada shift ini.
                </p>
              )}
            </ScrollArea>
            <DialogFooter className='items-center pt-3 border-t'>
              <div className='text-xs text-muted-foreground mr-auto'>
                <p>
                  Total Penjualan (Bersih): {currencySymbol}
                  {totalSalesShift.toLocaleString('id-ID')} (
                  {
                    shiftTransactions.filter((tx) => tx.status === 'completed')
                      .length
                  }{' '}
                  transaksi)
                </p>
                <p>
                  Total Retur: {currencySymbol}
                  {totalReturnsShift.toLocaleString('id-ID')} (
                  {
                    shiftTransactions.filter((tx) => tx.status === 'returned')
                      .length
                  }{' '}
                  transaksi)
                </p>
              </div>
              <DialogClose asChild>
                <Button type='button' variant='outline' className='text-xs h-8'>
                  Tutup
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  )
}
