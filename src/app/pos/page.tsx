'use client'
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import MainLayout from '@/components/layout/main-layout'
import { useBranch } from '@/contexts/branch-context'
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
import type { InventoryItem } from '@/lib/appwrite/inventory'
import type { Customer } from '@/lib/appwrite/customers'
import type { BankAccount } from '@/lib/appwrite/bankAccounts'
import { getInventoryItems } from '@/lib/appwrite/inventory'
import { getCustomers } from '@/lib/appwrite/customers'
import { getBankAccounts } from '@/lib/appwrite/bankAccounts'
import {
  startShift as startNewShift,
  getActiveShift,
  endShift,
  createPOSTransaction as recordTransaction,
  getTransactions as getTransactionsForShift,
  getTransactionById,
} from '@/lib/appwrite/pos'
// Impor SEMUA tipe yang berhubungan dengan POS dari satu file terpusat
import type {
  ShiftDocument,
  TransactionDocument,
  CreateTransactionPayload,
  TransactionItemDocument,
  TransactionViewModel,
  CartItem, // Tambahkan ini juga
  PaymentMethod,
  InvoicePrintPayload,
} from '@/lib/appwrite/types' // Ubah path jika perlu
import { ScanCustomerDialog } from '@/components/pos/scan-customer-dialog'

import { format, parseISO, isValid } from 'date-fns' // Added parseISO and isValid
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useDebounce } from '@uidotdev/usehooks'

type ViewMode = 'card' | 'table'
const LOCALSTORAGE_POS_VIEW_MODE_KEY = 'branchwise_posViewMode'
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]

const COMMON_BANKS = [
  'BCA',
  'Mandiri',
  'BRI',
  'BNI',
  'CIMB Niaga',
  'Danamon',
  'Lainnya',
]

export default function POSPage() {
  const { selectedBranch } = useBranch()
  const { userData, currentUser } = useAuth()
  const router = useRouter()

  const [viewMode, setViewMode] = useState<ViewMode>('table')

  const [activeShift, setActiveShift] = useState<ShiftDocument | null>(null) // Changed to POSShift
  const [loadingShift, setLoadingShift] = useState(true)
  const [showStartShiftModal, setShowStartShiftModal] = useState(false)
  const [initialCashInput, setInitialCashInput] = useState('')

  const [showEndShiftModal, setShowEndShiftModal] = useState(false)
  const [actualCashAtEndInput, setActualCashAtEndInput] = useState('')
  const [endShiftCalculations, setEndShiftCalculations] = useState<{
    expectedCash: number
    totalSalesByPaymentMethod: Record<PaymentMethod, number>
  } | null>(null)
  const [isEndingShift, setIsEndingShift] = useState(false)

  const [items, setItems] = useState<InventoryItem[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    ITEMS_PER_PAGE_OPTIONS[0]
  )
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const debouncedSearchTerm = useDebounce(searchTerm, 1000)
  const [hasNextPage, setHasNextPage] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)

  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [selectedPaymentTerms, setSelectedPaymentTerms] =
    useState<PaymentMethod>('cash')
  const [isProcessingSale, setIsProcessingSale] = useState(false)

  const [posModeActive, setPosModeActive] = useState(false)
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(
    null
  )
  const [showPrintInvoiceDialog, setShowPrintInvoiceDialog] = useState(false)

  const [showCashPaymentModal, setShowCashPaymentModal] = useState(false)
  const [cashAmountPaidInput, setCashAmountPaidInput] = useState('')
  const [customerNameInputCash, setCustomerNameInputCash] = useState('')
  const [calculatedChange, setCalculatedChange] = useState<number | null>(null)

  const [allCustomers, setAllCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
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
  const [selectedBankName, setSelectedBankName] = useState<string>('')
  const [bankRefNumberInput, setBankRefNumberInput] = useState('')
  const [customerNameInputBank, setCustomerNameInputBank] = useState('')

  const [shiftTransactions, setShiftTransactions] = useState<
    TransactionDocument[]
  >([]) // Changed to POSTransaction
  const [loadingShiftTransactions, setLoadingShiftTransactions] =
    useState(false)
  const [showBankHistoryDialog, setShowBankHistoryDialog] = useState(false)
  const [showShiftCashDetailsDialog, setShowShiftCashDetailsDialog] =
    useState(false)
  const [showAllShiftTransactionsDialog, setShowAllShiftTransactionsDialog] =
    useState(false)

  const [shippingCostInput, setShippingCostInput] = useState('')
  const [voucherCodeInput, setVoucherCodeInput] = useState('')
  const [voucherDiscountInput, setVoucherDiscountInput] = useState('')

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
  const taxRate = selectedBranch?.taxRate ? selectedBranch.taxRate / 100 : 0.0

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
        limit: itemsPerPage,
        searchTerm: currentSearchTerm || undefined,
        page: page, // Kirim nomor halaman
      }

      // Panggil fungsi API yang baru
      const result = await getInventoryItems(selectedBranch.id, options)

      setItems(result.items)
      setTotalItems(result.total) // Simpan total item
      setLoadingItems(false)
    },
    [selectedBranch, itemsPerPage] // Dependensi lebih sederhana
  )

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

  useEffect(() => {
    // Jika tidak ada cabang yang dipilih, bersihkan state dan jangan lakukan apa-apa lagi.
    if (!selectedBranch) {
      setItems([])
      setLoadingItems(false)
      setHasNextPage(false) // Sesuaikan dengan mode paginasi Anda
      return // Hentikan eksekusi lebih lanjut
    }

    // Jika ada cabang, panggil fetchData.
    // Efek ini akan otomatis berjalan ketika `currentPage` berubah (dari efek reset di atas)
    // atau ketika `fetchData` itu sendiri berubah (jika dependensinya berubah).
    fetchItemsData(currentPage, debouncedSearchTerm)
  }, [currentPage, debouncedSearchTerm, selectedBranch, fetchItemsData]) // Sertakan semua dependensi relevan

  const fetchCustomersAndBankAccounts = useCallback(async () => {
    if (!selectedBranch) {
      setAllCustomers([])
      setAvailableBankAccounts([])
      setLoadingCustomers(false)
      setLoadingBankAccounts(false)
      return
    }
    setLoadingCustomers(true)
    setLoadingBankAccounts(true)
    try {
      const [fetchedCustomers, fetchedBankAccounts] = await Promise.all([
        getCustomers(selectedBranch.id),
        getBankAccounts(selectedBranch.id),
      ])
      // setAllCustomers(fetchedCustomers)
      // setFilteredCustomers(fetchedCustomers.slice(0, 5))
      setAvailableBankAccounts(fetchedBankAccounts)
    } catch (error) {
      console.error('Error fetching customers/banks for POS:', error)
      toast.error('Gagal Memuat Data', {
        description: 'Tidak dapat memuat pelanggan atau rekening bank.',
      })
    } finally {
      setLoadingCustomers(false)
      setLoadingBankAccounts(false)
    }
  }, [selectedBranch, toast])

  useEffect(() => {
    fetchCustomersAndBankAccounts()
  }, [fetchCustomersAndBankAccounts])

  useEffect(() => {
    if (!customerSearchTerm.trim()) {
      setFilteredCustomers(allCustomers.slice(0, 5))
    } else {
      const lowerSearch = customerSearchTerm.toLowerCase()
      setFilteredCustomers(
        allCustomers
          .filter(
            (customer) =>
              customer.name.toLowerCase().includes(lowerSearch) ||
              (customer.id &&
                customer.id.toLowerCase().includes(lowerSearch)) ||
              (customer.phone && customer.phone.includes(lowerSearch))
          )
          .slice(0, 10)
      )
    }
  }, [customerSearchTerm, allCustomers])

  const fetchShiftTransactions = useCallback(async () => {
    if (activeShift && selectedBranch) {
      setLoadingShiftTransactions(true)
      const transactions = await getTransactionsForShift(
        selectedBranch.id,
        activeShift.$id
      )
      setShiftTransactions(transactions)
      setLoadingShiftTransactions(false)
    } else {
      setShiftTransactions([])
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
    const shift = await getActiveShift(currentUser.$id, selectedBranch.id)
    console.log(currentUser.$id, selectedBranch.id)
    setActiveShift(shift)
    console.log(shift)
    if (shift) {
      setInitialCashInput(shift.startingBalance.toString())
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
    const result = await startNewShift(
      currentUser.$id,
      selectedBranch.id,
      currentUser.name,
      cash
    )
    if ('error' in result) {
      toast.error('Gagal Memulai Shift', {
        description: result.error,
      })
    } else {
      setActiveShift(result)
      setShowStartShiftModal(false)
      toast.success('Shift Dimulai', {
        description: `Shift dimulai dengan modal awal ${currencySymbol}${cash.toLocaleString()}`,
      })
    }
  }

  const prepareEndShiftCalculations = async () => {
    if (!activeShift) return
    setIsEndingShift(true)
    await fetchShiftTransactions()
    const currentShiftTransactions = shiftTransactions

    const salesByPayment: Record<PaymentMethod, number> = {
      cash: 0,
      credit: 0,
      card: 0,
      transfer: 0,
      qris: 0,
    }

    currentShiftTransactions.forEach((tx) => {
      if (
        tx.paymentMethod === 'cash' ||
        tx.paymentMethod === 'card' ||
        tx.paymentMethod === 'transfer'
      ) {
        if (tx.status === 'completed') {
          const paymentMethodForShift = tx.paymentMethod as PaymentMethod
          salesByPayment[paymentMethodForShift] =
            (salesByPayment[paymentMethodForShift] || 0) + tx.totalAmount
        }
      }
    })

    const expected = (activeShift.startingBalance || 0) + salesByPayment.cash
    setEndShiftCalculations({
      expectedCash: expected,
      totalSalesByPaymentMethod: salesByPayment,
    })
    setShowEndShiftModal(true)
    setIsEndingShift(false)
  }

  const handleEndShiftConfirm = async () => {
    if (!activeShift || endShiftCalculations === null) return

    const actualCash = parseFloat(actualCashAtEndInput)
    if (isNaN(actualCash) || actualCash < 0) {
      toast.error('Input Tidak Valid', {
        description: 'Kas aktual di laci tidak valid.',
      })
      return
    }
    setIsEndingShift(true)

    const cashDifference = actualCash - endShiftCalculations.expectedCash

    const result = await endShift(activeShift.$id)

    if (result && 'error' in result) {
      toast.error('Gagal Mengakhiri Shift', { description: result.error })
    } else {
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
    }
    setIsEndingShift(false)
  }

  const handleAddToCart = (product: InventoryItem) => {
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
        (item) => item.productId === product.id
      )
      if (existingItem) {
        if (existingItem.quantity < product.quantity) {
          return prevItems.map((item) =>
            item.productId === product.id
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  total: (item.quantity + 1) * item.price,
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
          productId: product.id,
          productName: product.name,
          originalPrice: product.price,
          price: product.price,
          discountAmount: 0,
          itemDiscountType: 'nominal',
          itemDiscountValue: 0,
          quantity: 1,
          costPrice: product.costPrice || 0,
          subtotal: product.price,
        },
      ]
    })
  }

  const handleOpenItemDiscountDialog = (item: CartItem) => {
    setSelectedItemForDiscount(item)
    setCurrentDiscountType(item.itemDiscountType || 'nominal')
    setCurrentDiscountValue((item.itemDiscountValue || 0).toString())
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
    if (!selectedItemForDiscount || !selectedItemForDiscount.originalPrice)
      return { discountedPrice: 0, actualDiscountAmount: 0 }
    const originalPrice = selectedItemForDiscount.originalPrice
    const discountValueNum = parseFloat(currentDiscountValue)

    if (isNaN(discountValueNum) || discountValueNum < 0) {
      return { discountedPrice: originalPrice, actualDiscountAmount: 0 }
    }

    let actualDiscountAmount = 0
    if (currentDiscountType === 'percentage') {
      actualDiscountAmount = originalPrice * (discountValueNum / 100)
    } else {
      actualDiscountAmount = discountValueNum
    }

    if (actualDiscountAmount > originalPrice) {
      actualDiscountAmount = originalPrice
    }

    const discountedPrice = originalPrice - actualDiscountAmount
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
        if (item.productId === selectedItemForDiscount.productId) {
          return {
            ...item,
            price: discountedPrice,
            discountAmount: actualDiscountAmount,
            itemDiscountType: currentDiscountType,
            itemDiscountValue: parseFloat(currentDiscountValue) || 0,
            total: discountedPrice * item.quantity,
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
        if (item.productId === selectedItemForDiscount.productId) {
          return {
            ...item,
            price: item.originalPrice || item.price, // Revert to original price
            discountAmount: 0,
            itemDiscountType: undefined,
            itemDiscountValue: 0,
            total: (item.originalPrice || item.price) * item.quantity,
          }
        }
        return item
      })
    )
    setIsItemDiscountDialogOpen(false)
    setSelectedItemForDiscount(null)
    setCurrentDiscountValue('')
    toast.success('Diskon Dihapus', {
      description: `Diskon untuk ${selectedItemForDiscount.productName} telah dihapus.`,
    })
  }

  const handleUpdateCartQuantity = (productId: string, newQuantity: number) => {
    const productInStock = items.find((p) => p.id === productId)
    if (!productInStock) return

    if (newQuantity <= 0) {
      handleRemoveFromCart(productId)
      return
    }
    if (newQuantity > productInStock.quantity) {
      toast.warning('Stok Tidak Cukup', {
        description: `Stok maksimal untuk produk ini adalah ${productInStock.quantity}.`,
      })
      setCartItems((prevItems) =>
        prevItems.map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity: productInStock.quantity,
                total: productInStock.quantity * item.price,
              }
            : item
        )
      )
      return
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.productId === productId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
          : item
      )
    )
  }

  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => item.productId !== productId)
    )
  }

  const totalItemDiscount = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + (item.discountAmount || 0) * item.quantity,
        0
      ),
    [cartItems]
  )
  const subtotalAfterItemDiscounts = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.subtotal, 0),
    [cartItems]
  )
  const tax = useMemo(
    () => subtotalAfterItemDiscounts * taxRate,
    [subtotalAfterItemDiscounts, taxRate]
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
        (sum, item) => sum + item.quantity * (item.costPrice || 0),
        0
      ),
    [cartItems]
  )

  const openCashPaymentModal = () => {
    setCashAmountPaidInput(total.toString())
    setCustomerNameInputCash('')
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
      const payload: CreateTransactionPayload = {
        // --- Relational & Denormalized Info ---
        branchId: selectedBranch.id,
        shiftId: activeShift.$id,
        // userId: currentUser.$id,
        userIda: currentUser.$id,
        userName: currentUser.name,
        customerName: customerNameInputCash.trim() || undefined,

        // --- Items ---
        items: cartItems, // Kirim langsung array cartItems

        // --- Financial Summary (ambil dari state/memo) ---
        subtotal: subtotalAfterItemDiscounts,
        itemsDiscountAmount: totalItemDiscount,
        voucherCode: voucherCodeInput || undefined,
        voucherDiscountAmount: voucherDiscount,
        totalDiscountAmount: totalDiscountAmount,
        shippingCost: shippingCost,
        taxAmount: tax,
        totalAmount: total,
        totalCOGS: totalCost,
        paymentStatus: 'paid',

        // --- Payment Details ---
        paymentMethod: 'cash',
        amountPaid: amountPaidNum,
        isCreditSale: false,
      }

      // 2. Blok `try`: Berisi "Happy Path" atau alur sukses
      const result = await recordTransaction(payload)

      // Jika server mengembalikan error dalam respons (bukan melempar exception)
      if (!result || !result.$id || 'error' in result) {
        // Kita "lemparkan" error ini agar ditangkap oleh blok `catch`
        throw new Error(
          result?.error || 'ID transaksi tidak valid setelah rekaman.'
        )
      }

      // --- Semua logika jika SUKSES ---
      toast.success('Transaksi Berhasil', {
        description: 'Penjualan telah direkam.',
      })

      setLastTransactionId(result.$id)
      setShowPrintInvoiceDialog(true)

      // Reset semua state
      setCartItems([])
      setSelectedPaymentTerms('cash')
      setShippingCostInput('')
      setVoucherCodeInput('')
      // ... reset state lainnya
      setCashAmountPaidInput('')
      setCustomerNameInputCash('')
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
    if (!selectedBankName) {
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
      const payload: CreateTransactionPayload = {
        // --- Info Relasi & Denormalisasi ---
        branchId: selectedBranch.id,
        shiftId: activeShift.$id,
        userId: currentUser.$id,
        userName: currentUser.name,
        customerName: customerNameInputBank.trim() || undefined, // Gunakan state yang benar

        // --- Items & Finansial (sudah benar) ---
        items: cartItems,
        subtotal: subtotalAfterItemDiscounts,
        itemsDiscountAmount: totalItemDiscount,
        voucherCode: voucherCodeInput || undefined,
        voucherDiscountAmount: voucherDiscount,
        totalDiscountAmount: totalDiscountAmount,
        shippingCost: shippingCost,
        taxAmount: tax,
        totalAmount: total,
        totalCOGS: totalCost,

        // --- Detail Pembayaran (INI YANG DIPERBAIKI) ---
        paymentMethod: 'transfer', // Ganti ke 'transfer'
        amountPaid: total, // Untuk transfer, jumlah dibayar = total
        isCreditSale: false,
        bankName: selectedBankName, // Tambahkan ini
        bankTransactionRef: bankRefNumberInput.trim(), // Tambahkan ini
      }
      // 2. Blok `try`: Eksekusi alur sukses
      const result = await recordTransaction(payload)

      if (!result || !result.$id || 'error' in result) {
        throw new Error(
          result?.error || 'ID transaksi tidak valid setelah rekaman.'
        )
      }

      // --- Semua logika jika SUKSES ---
      toast.success('Transaksi Berhasil', {
        description: 'Penjualan transfer telah direkam.',
      })

      setLastTransactionId(result.$id)
      setShowPrintInvoiceDialog(true)

      // Reset semua state yang relevan
      setCartItems([])
      setSelectedPaymentTerms('cash')
      setShippingCostInput('')
      setVoucherCodeInput('')
      setVoucherDiscountInput('')
      setSelectedBankName('')
      setBankRefNumberInput('')
      setCustomerNameInputBank('')
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
      setSelectedBankName('')
      setBankRefNumberInput('')
      setCustomerNameInputBank('')
      setShowBankPaymentModal(true)
      return
    }

    // --- Awal dari Logika Asinkron (untuk 'credit' atau metode langsung lainnya) ---

    let customerNameForTx: string | undefined = undefined

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
      const cust = allCustomers.find((c) => c.id === selectedCustomerId)
      customerNameForTx = cust?.name
    }

    setIsProcessingSale(true)

    try {
      // Persiapan data transaksi
      const payload: CreateTransactionPayload = {
        // --- Info Relasi & Denormalisasi ---
        branchId: selectedBranch.id,
        shiftId: activeShift.$id,
        userId: currentUser.$id,
        userName: currentUser.name,
        customerId: selectedCustomerId, // Gunakan ID pelanggan yang dipilih
        customerName: customerNameForTx, // Gunakan nama pelanggan yang sudah divalidasi

        // --- Items & Finansial (sudah benar) ---
        items: cartItems,
        subtotal: subtotalAfterItemDiscounts,
        itemsDiscountAmount: totalItemDiscount,
        voucherCode: voucherCodeInput || undefined,
        voucherDiscountAmount: voucherDiscount,
        totalDiscountAmount: totalDiscountAmount,
        shippingCost: shippingCost,
        taxAmount: tax,
        totalAmount: total,
        totalCOGS: totalCost,

        // --- Detail Pembayaran & Kredit (INI YANG DIPERBAIKI) ---
        paymentMethod: 'credit', // Ganti ke 'credit'
        amountPaid: 0, // Untuk penjualan kredit baru, yang dibayar adalah 0
        isCreditSale: true, // Set ke true
        creditDueDate: creditDueDate ? creditDueDate.toISOString() : undefined,
      }

      const result = await recordTransaction(payload)

      if (!result || !result.$id || 'error' in result) {
        throw new Error(
          result?.error || 'ID transaksi tidak valid setelah rekaman.'
        )
      }

      // --- Logika jika SUKSES ---
      toast.success('Transaksi Berhasil', {
        description: 'Penjualan telah direkam.',
      })
      setLastTransactionId(result.$id)
      setShowPrintInvoiceDialog(true)

      // Reset semua state yang relevan
      setCartItems([])
      setSelectedPaymentTerms('cash')
      setShippingCostInput('')
      setVoucherCodeInput('')
      setVoucherDiscountInput('')
      setSelectedCustomerId(undefined)
      setCreditDueDate(undefined)
      setCustomerSearchTerm('')
      fetchItemsData(currentPage, debouncedSearchTerm)
    } catch (error) {
      // Menangkap semua error dari proses `await`
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
      // Jaminan untuk menonaktifkan status loading
      setIsProcessingSale(false)
    }
  }

  const handlePrintInvoice = async (transactionIdToPrint?: string) => {
    const targetTransactionId = transactionIdToPrint || lastTransactionId

    if (!targetTransactionId || !selectedBranch || !currentUser || !userData) {
      toast.error('Data Tidak Lengkap', {
        description: 'Tidak dapat mencetak invoice, data kurang.',
      })
      setShowPrintInvoiceDialog(false)
      setLastTransactionId(null)
      return
    }

    if (userData.localPrinterUrl) {
      try {
        const transactionDetails = await getTransactionById(targetTransactionId)

        if (!transactionDetails) {
          toast.error('Gagal Cetak', {
            description: 'Detail transaksi tidak ditemukan.',
          })
          return
        }

        // PERBAIKAN: Gunakan `$createdAt` dari tipe dokumen baru kita.
        const transactionDate = parseISO(transactionDetails.$createdAt)

        // Membuat payload sesuai tipe InvoicePrintPayload yang kita definisikan
        const payload: InvoicePrintPayload = {
          branchName: selectedBranch.invoiceName || selectedBranch.name,
          branchAddress: selectedBranch.address || '',
          branchPhone: selectedBranch.phoneNumber || '',
          invoiceNumber: transactionDetails.transactionNumber,
          transactionDate: format(transactionDate, 'dd MMM yyyy, HH:mm'),
          cashierName: transactionDetails.userName, // Lebih akurat dari transaksi
          customerName: transactionDetails.customerName || '',

          // PERBAIKAN: Mapping item sesuai tipe `TransactionItemDocument`
          items: transactionDetails.items.map((item) => ({
            name: item.productName,
            quantity: item.quantity,
            price: item.priceAtSale ?? 0, // Gunakan `priceAtSale`
            total: item.subtotal, // Gunakan `subtotal` dari item
            // Penjelasan: `originalPrice` tidak kita simpan di `TransactionItemDocument`.
            // Anda bisa menambahkannya jika perlu, atau cukup tampilkan harga setelah diskon.
            // Di sini kita gunakan `priceAtSale` + `discountAmount` untuk merekonstruksinya.
            originalPrice:
              (item.priceAtSale ?? 0) +
              (item.discountAmount ?? 0) / item.quantity,
            discountAmount:
              item.discountAmount == 0
                ? 0
                : (item.discountAmount ?? 0) / item.quantity, // Diskon per unit
          })),

          // PERBAIKAN: Ambil nilai yang sudah dikalkulasi, bukan hitung ulang
          subtotal: transactionDetails.subtotal,
          taxAmount: transactionDetails.taxAmount,
          shippingCost: transactionDetails.shippingCost,
          totalItemDiscount: transactionDetails.itemsDiscountAmount, // Ambil dari data, bukan reduce()
          voucherDiscount: transactionDetails.voucherDiscountAmount,
          overallTotalDiscount: transactionDetails.totalDiscountAmount,

          totalAmount: transactionDetails.totalAmount,
          amountPaid: transactionDetails.amountPaid,
          changeGiven: transactionDetails.changeGiven,
          notes: transactionDetails.notes || '', // Ambil dari data transaksi

          // PERBAIKAN: Logika yang lebih sederhana untuk paymentMethod
          paymentMethod:
            transactionDetails.paymentMethod.charAt(0).toUpperCase() +
            transactionDetails.paymentMethod.slice(1),
        }

        const response = await fetch(userData.localPrinterUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (response.ok) {
          toast.success('Terkirim ke Printer', {
            description: 'Data invoice berhasil dikirim ke printer lokal.',
          })
        } else {
          // ... sisa logika error handling (sudah benar)
          const errorData = await response.text()
          toast.error('Gagal Kirim ke Printer', {
            description: `Printer lokal merespons dengan kesalahan: ${
              response.status
            } - ${errorData || response.statusText}`,
            duration: 7000,
          })
          window.open(`/invoice/${targetTransactionId}/view`, '_blank')
        }
      } catch (error: any) {
        // ... sisa logika error handling (sudah benar)
        console.error('Error sending to local printer:', error)
        toast.error('Error Printer Lokal', {
          description: `Tidak dapat terhubung ke printer lokal: ${error.message}. Invoice web akan dibuka.`,
          duration: 7000,
        })
        window.open(`/invoice/${targetTransactionId}/view`, '_blank')
      }
    } else {
      // ... sisa logika jika printer tidak diatur (sudah benar)
      toast.info('Printer Lokal Belum Diatur', {
        description: 'URL printer lokal belum diatur. Membuka invoice web.',
        duration: 7000,
      })
      window.open(`/invoice/${targetTransactionId}/view`, '_blank')
    }

    setShowPrintInvoiceDialog(false)
    setLastTransactionId(null)
  }

  const handlePrintInvoiceFromHistory = (transactionIdForReprint: string) => {
    handlePrintInvoice(transactionIdForReprint)
  }

  const handleScanCustomerSuccess = (scannedId: string) => {
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
  }

  const totalCashSalesInShift = useMemo(() => {
    return shiftTransactions
      .filter((tx) => tx.paymentMethod === 'cash' && tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.totalAmount, 0)
  }, [shiftTransactions])

  const totalCardSalesInShift = useMemo(() => {
    return shiftTransactions
      .filter((tx) => tx.paymentMethod === 'card' && tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.totalAmount, 0)
  }, [shiftTransactions])

  const totalTransferSalesInShift = useMemo(() => {
    return shiftTransactions
      .filter(
        (tx) => tx.paymentMethod === 'transfer' && tx.status === 'completed'
      )
      .reduce((sum, tx) => sum + tx.totalAmount, 0)
  }, [shiftTransactions])

  const estimatedCashInDrawer = useMemo(() => {
    return (activeShift?.startingBalance || 0) + totalCashSalesInShift
  }, [activeShift, totalCashSalesInShift])

  const bankTransactionsInShift = useMemo(() => {
    return shiftTransactions.filter(
      (tx) => tx.paymentMethod === 'transfer' && tx.status === 'completed'
    )
  }, [shiftTransactions])

  const formatDateTimestamp = (
    timestampString?: string,
    includeTime = true
  ) => {
    if (!timestampString) return 'N/A'
    const date = parseISO(timestampString) // Parse ISO string to Date
    if (!isValid(date)) return 'Invalid Date'
    return format(date, includeTime ? 'dd MMM yy, HH:mm' : 'dd MMM yyyy')
  }

  const totalSalesShift = useMemo(() => {
    return shiftTransactions
      .filter((tx) => tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.totalAmount, 0)
  }, [shiftTransactions])

  const totalReturnsShift = useMemo(() => {
    return shiftTransactions
      .filter((tx) => tx.status === 'returned')
      .reduce((sum, tx) => sum + tx.totalAmount, 0)
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
                  <PlayCircle className='h-4 w-4 mr-1.5' /> Shift Aktif
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
                                product.imageUrl ||
                                `https://placehold.co/150x100.png`
                              }
                              alt={product.name}
                              layout='fill'
                              objectFit='cover'
                              className='rounded-t-md'
                              data-ai-hint={
                                product.imageHint ||
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
                                      product.imageUrl ||
                                      `https://placehold.co/28x28.png`
                                    }
                                    alt={product.name}
                                    width={28}
                                    height={28}
                                    className='rounded object-cover h-7 w-7'
                                    data-ai-hint={
                                      product.imageHint ||
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
                                <TableCell className='p-1.5 text-xs text-right'>
                                  {currencySymbol}
                                  {product.price.toLocaleString('id-ID')}
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
                            Jml
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
                          <TableRow key={item.productId}>
                            <TableCell className='font-medium text-xs py-1 px-2 truncate'>
                              {item.productName}
                              {item.discountAmount &&
                                item.discountAmount > 0 && (
                                  <div className='flex items-center gap-1'>
                                    <span className='text-[0.65rem] text-muted-foreground line-through'>
                                      {currencySymbol}
                                      {(item.originalPrice || 0).toLocaleString(
                                        'id-ID'
                                      )}
                                    </span>
                                    <span className='text-[0.65rem] text-destructive'>
                                      (-{currencySymbol}
                                      {item.discountAmount.toLocaleString(
                                        'id-ID'
                                      )}
                                      )
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
                                      item.productId,
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
                                      item.productId,
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
                                      item.productId,
                                      item.quantity + 1
                                    )
                                  }
                                >
                                  <PlusCircle className='h-3.5 w-3.5' />
                                </Button>
                              </div>
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
                              {currencySymbol}
                              {item.subtotal.toLocaleString('id-ID')}
                            </TableCell>
                            <TableCell className='text-right py-1 px-1'>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-5 w-5 text-destructive hover:text-destructive/80'
                                disabled={!activeShift}
                                onClick={() =>
                                  handleRemoveFromCart(item.productId)
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
                              colSpan={5}
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
                      <span>
                        {currencySymbol}
                        {subtotalAfterItemDiscounts.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className='flex justify-between text-xs w-full'>
                      <span>
                        Pajak (
                        {selectedBranch?.taxRate || (taxRate * 100).toFixed(0)}
                        %):
                      </span>
                      <span>
                        {currencySymbol}
                        {tax.toLocaleString('id-ID')}
                      </span>
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
                      <span>
                        {currencySymbol}
                        {total.toLocaleString('id-ID')}
                      </span>
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
                            setCustomerSearchTerm('')
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
                          <SelectItem value='card' className='text-xs'>
                            <CreditCard className='inline-block mr-2 h-4 w-4' />
                            Kartu
                          </SelectItem>
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
                                          customer.id === selectedCustomerId
                                      )?.name
                                    : loadingCustomers
                                    ? 'Memuat...'
                                    : allCustomers.length === 0
                                    ? 'Tidak ada pelanggan'
                                    : 'Pilih Pelanggan'}
                                  <ChevronsUpDown className='ml-2 h-3.5 w-3.5 shrink-0 opacity-50' />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className='w-[--radix-popover-trigger-width] p-0'>
                                <Command shouldFilter={false}>
                                  <CommandInput
                                    placeholder='Cari pelanggan (nama/ID)...'
                                    value={customerSearchTerm}
                                    onValueChange={setCustomerSearchTerm}
                                    className='h-9 text-xs'
                                  />
                                  <CommandEmpty className='p-2 text-xs text-center'>
                                    {loadingCustomers
                                      ? 'Memuat...'
                                      : 'Pelanggan tidak ditemukan.'}
                                  </CommandEmpty>
                                  <CommandList>
                                    <CommandGroup>
                                      {filteredCustomers.map((customer) => (
                                        <CommandItem
                                          key={customer.id}
                                          value={customer.id}
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
                                              selectedCustomerId === customer.id
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

                    <Button
                      size='lg'
                      className='w-full mt-2 h-10 text-sm'
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
                Diskon untuk: {selectedItemForDiscount?.productName}
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Harga Asli: {currencySymbol}
                {(selectedItemForDiscount?.originalPrice || 0).toLocaleString(
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
                  (selectedItemForDiscount.discountAmount || 0) === 0
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

        <AlertDialog
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
                      Modal Awal: {currencySymbol}
                      {activeShift.startingBalance.toLocaleString('id-ID')}
                    </p>
                    <p>
                      Total Penjualan Tunai: {currencySymbol}
                      {endShiftCalculations.totalSalesByPaymentMethod.cash.toLocaleString(
                        'id-ID'
                      )}
                    </p>
                    <p>
                      Total Penjualan Kartu: {currencySymbol}
                      {endShiftCalculations.totalSalesByPaymentMethod.card.toLocaleString(
                        'id-ID'
                      )}
                    </p>
                    <p>
                      Total Penjualan Transfer: {currencySymbol}
                      {endShiftCalculations.totalSalesByPaymentMethod.transfer.toLocaleString(
                        'id-ID'
                      )}
                    </p>
                    <p className='font-semibold'>
                      Estimasi Kas Seharusnya: {currencySymbol}
                      {endShiftCalculations.expectedCash.toLocaleString(
                        'id-ID'
                      )}
                    </p>
                  </div>
                )}
                <div className='mt-2'>
                  <Label htmlFor='actualCashAtEndInput' className='text-xs'>
                    Kas Aktual di Laci ({currencySymbol})
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
        </AlertDialog>

        <Dialog
          open={showCashPaymentModal}
          onOpenChange={setShowCashPaymentModal}
        >
          <DialogContent className='sm:max-w-sm'>
            <DialogHeader>
              <DialogTitle className='text-base'>Pembayaran Tunai</DialogTitle>
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
                    calculatedChange < 0 ? 'text-destructive' : 'text-green-600'
                  )}
                >
                  Kembalian: {currencySymbol}
                  {calculatedChange.toLocaleString('id-ID')}
                </p>
              )}
              <div>
                <Label htmlFor='customerNameInputCash' className='text-xs'>
                  Nama Pelanggan (Opsional)
                </Label>
                <div className='flex items-center mt-1'>
                  <UserPlus className='h-4 w-4 mr-2 text-muted-foreground' />
                  <Input
                    id='customerNameInputCash'
                    type='text'
                    value={customerNameInputCash}
                    onChange={(e) => setCustomerNameInputCash(e.target.value)}
                    placeholder='Masukkan nama pelanggan'
                    className='h-9 text-sm flex-1'
                  />
                </div>
                <p className='text-xs text-muted-foreground mt-1'>
                  Kosongkan jika tidak ada nama pelanggan.
                </p>
              </div>
            </div>
            <DialogFooter>
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
                onClick={handleConfirmCashPayment}
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
                <Label htmlFor='selectedBankName' className='text-xs'>
                  Nama Bank*
                </Label>
                <Select
                  value={selectedBankName}
                  onValueChange={setSelectedBankName}
                  disabled={loadingBankAccounts}
                >
                  <SelectTrigger
                    id='selectedBankName'
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
                        value=''
                        disabled
                        className='text-xs text-muted-foreground'
                      >
                        Tidak ada rekening bank aktif
                      </SelectItem>
                    ) : (
                      availableBankAccounts.map((acc) => (
                        <SelectItem
                          key={acc.id}
                          value={acc.bankName}
                          className='text-xs'
                        >
                          {acc.bankName} ({acc.accountNumber}) - A/N:{' '}
                          {acc.accountHolderName}
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
                <Label htmlFor='customerNameInputBank' className='text-xs'>
                  Nama Pelanggan (Opsional)
                </Label>
                <div className='flex items-center mt-1'>
                  <UserPlus className='h-4 w-4 mr-2 text-muted-foreground' />
                  <Input
                    id='customerNameInputBank'
                    type='text'
                    value={customerNameInputBank}
                    onChange={(e) => setCustomerNameInputBank(e.target.value)}
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
                  !selectedBankName ||
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
          <DialogContent className='sm:max-w-lg'>
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
                      <TableRow key={tx.$id}>
                        <TableCell className='text-xs py-1.5 font-medium'>
                          {tx.transactionNumber}
                        </TableCell>
                        <TableCell className='text-xs py-1.5'>
                          {formatDateTimestamp(tx.$createdAt)}
                        </TableCell>
                        <TableCell className='text-xs py-1.5'>
                          {tx.bankName || '-'}
                        </TableCell>
                        <TableCell className='text-xs hidden sm:table-cell py-1.5'>
                          {tx.bankTransactionRef || '-'}
                        </TableCell>
                        <TableCell className='text-xs text-right py-1.5'>
                          {currencySymbol}
                          {tx.totalAmount.toLocaleString('id-ID')}
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
              </DialogDescription>
            </DialogHeader>
            <div className='py-3 space-y-2 text-sm'>
              <div className='flex justify-between p-2 bg-muted/30 rounded-md'>
                <span>Modal Awal Shift:</span>
                <span className='font-semibold'>
                  {currencySymbol}
                  {(activeShift?.startingBalance || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <Separator />
              <div className='flex justify-between p-2'>
                <span>Total Penjualan Tunai:</span>
                <span className='font-semibold'>
                  {currencySymbol}
                  {totalCashSalesInShift.toLocaleString('id-ID')}
                </span>
              </div>
              <div className='flex justify-between p-2 bg-muted/30 rounded-md'>
                <span>Estimasi Kas di Laci:</span>
                <span className='font-semibold'>
                  {currencySymbol}
                  {estimatedCashInDrawer.toLocaleString('id-ID')}
                </span>
              </div>
              <Separator />
              <div className='flex justify-between p-2'>
                <span>Total Penjualan Kartu:</span>
                <span className='font-semibold'>
                  {currencySymbol}
                  {totalCardSalesInShift.toLocaleString('id-ID')}
                </span>
              </div>
              <div className='flex justify-between items-center p-2 bg-muted/30 rounded-md'>
                <span>Total Penjualan Transfer:</span>
                <div className='flex items-center gap-2'>
                  <span className='font-semibold'>
                    {currencySymbol}
                    {totalTransferSalesInShift.toLocaleString('id-ID')}
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

        <Dialog
          open={showAllShiftTransactionsDialog}
          onOpenChange={setShowAllShiftTransactionsDialog}
        >
          <DialogContent className='max-w-2xl'>
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
                      <TableHead className='text-xs'>No. Inv</TableHead>
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
                        key={tx.$id}
                        className={cn(
                          tx.status === 'returned' && 'bg-muted/40'
                        )}
                      >
                        <TableCell className='text-xs py-1.5 font-medium'>
                          {tx.transactionNumber}
                        </TableCell>
                        <TableCell className='text-xs hidden sm:table-cell py-1.5'>
                          {formatDateTimestamp(tx.$createdAt)}
                        </TableCell>
                        <TableCell className='text-xs py-1.5'>
                          {tx.customerName || '-'}
                        </TableCell>
                        <TableCell className='text-xs py-1.5 capitalize'>
                          {tx.paymentMethod}
                        </TableCell>
                        <TableCell className='text-xs text-right py-1.5'>
                          {currencySymbol}
                          {tx.totalAmount.toLocaleString('id-ID')}
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
                            onClick={() =>
                              handlePrintInvoiceFromHistory(tx.$id)
                            }
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
