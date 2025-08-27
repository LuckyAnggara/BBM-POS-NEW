'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/auth-context'
import { useBranches } from '@/contexts/branch-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  CalendarIcon,
  Plus,
  Trash2,
  Search,
  Check,
  ChevronsUpDown,
  Save,
  FileText,
  Tag,
  Percent,
  CircleDollarSign,
  Truck,
  Receipt,
  BanknoteIcon,
  CreditCard,
  Package2 as Package,
  Users,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { toast } from 'sonner'
import Link from 'next/link'
import { useDebounce } from '@uidotdev/usehooks'

// Import types and services
import type {
  CreateInvoicePayload,
  InvoiceItemInput,
  Customer,
  Product,
  User,
} from '@/lib/types'
import {
  createInvoice,
  generateInvoiceNumber,
} from '@/lib/laravel/invoiceService'
import { listCustomers } from '@/lib/laravel/customers'
import { listProducts } from '@/lib/laravel/product'
import { listUsers } from '@/lib/laravel/users'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

interface InvoiceItemRow extends InvoiceItemInput {
  id: string // Temporary ID for form management
  product_name?: string
  product?: Product
  quantity: number // Make sure quantity is required
  price: number // Make sure price is required
  discount_percentage?: number // Diskon per produk dalam persen
  discount_amount?: number // Diskon per produk dalam nominal
}

interface DownPayment {
  amount: number
  method: 'cash' | 'transfer'
  notes?: string
}

export default function NewInvoicePage() {
  const router = useRouter()
  const { currentUser } = useAuth()
  const { selectedBranch } = useBranches()

  // Product search state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [searchProductTerm, setSearchProductTerm] = useState('')
  const [openProductSearch, setOpenProductSearch] = useState(false)
  const debouncedProductSearch = useDebounce(searchProductTerm, 300)

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [customerId, setCustomerId] = useState<number | undefined>()
  const [salesAgentId, setSalesAgentId] = useState<number | undefined>()
  const [dueDate, setDueDate] = useState<Date>()
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<InvoiceItemRow[]>([])
  const [shippingCost, setShippingCost] = useState(0)
  const [taxRate, setTaxRate] = useState(11) // Default 11% PPN

  // New fields for discounts and down payment
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<
    'percentage' | 'amount'
  >('percentage')
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState(0)
  const [downPayment, setDownPayment] = useState<DownPayment>({
    amount: 0,
    method: 'cash',
    notes: '',
  })

  // Data state
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [salesAgents, setSalesAgents] = useState<User[]>([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [loadingProduct, setLoadingProduct] = useState(false)
  const [openCustomerCombobox, setOpenCustomerCombobox] = useState(false)
  const [openSalesCombobox, setOpenSalesCombobox] = useState(false)
  const [searchCustomer, setSearchCustomer] = useState('')
  const [searchSales, setSearchSales] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const fetchItemsData = useCallback(
    async (currentSearchTerm: string) => {
      if (!selectedBranch) {
        setProducts([])
        setLoadingProduct(false)
        return
      }
      setLoadingProduct(true)

      const options = {
        branchId: selectedBranch.id,
        limit: 10,
        searchTerm: currentSearchTerm,
        page: 1,
      }

      // Panggil fungsi API yang baru
      const result = await listProducts(options)
      setProducts(result.data)
      setLoadingProduct(false)
    },
    [selectedBranch] // Dependensi lebih sederhana
  )

  useEffect(() => {
    fetchItemsData(debouncedProductSearch)
  }, [debouncedProductSearch, fetchItemsData]) // Sertakan semua dependensi relevan

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!selectedBranch) return

      setLoadingData(true)
      try {
        const [customersData, salesAgentsData, newInvoiceNumber] =
          await Promise.all([
            listCustomers({ branchId: selectedBranch.id }),
            listUsers({ branch_id: selectedBranch.id }),
            generateInvoiceNumber(selectedBranch.id),
          ])

        setCustomers(customersData.data || customersData)
        setSalesAgents(salesAgentsData) // listUsers returns User[] directly
        setInvoiceNumber(newInvoiceNumber)
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Gagal memuat data')
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
  }, [selectedBranch])

  // Add product to items
  const addProductToItems = () => {
    if (!selectedProduct) {
      toast.error('Pilih produk terlebih dahulu')
      return
    }

    const newItem: InvoiceItemRow = {
      id: `item-${Date.now()}-${Math.random()}`,
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      product: selectedProduct,
      quantity: 1,
      price: selectedProduct.price || 0,
      discount_percentage: 0,
      discount_amount: 0,
    }
    setItems([...items, newItem])
    setSelectedProduct(null)
    setSearchProductTerm('')
  }

  // Item management
  const removeItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId))
  }

  const updateItem = (
    itemId: string,
    field: keyof InvoiceItemRow,
    value: any
  ) => {
    setItems(
      items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    )
  }

  // Handle invoice discount type change
  const handleInvoiceDiscountTypeChange = (type: 'percentage' | 'amount') => {
    setInvoiceDiscountType(type)
    setInvoiceDiscountValue(0) // Reset discount value when changing type
  }

  // Handle item discount type change
  const handleItemDiscountTypeChange = (
    itemId: string,
    type: 'percentage' | 'amount'
  ) => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          // Reset discount values when changing type
          if (type === 'percentage') {
            return {
              ...item,
              discount_percentage: 0,
              discount_amount: undefined,
            }
          } else {
            return {
              ...item,
              discount_percentage: undefined,
              discount_amount: 0,
            }
          }
        }
        return item
      })
    )
  }

  // Calculations
  const subtotal = items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.price
    const itemDiscount = item.discount_percentage
      ? (itemTotal * item.discount_percentage) / 100
      : item.discount_amount || 0
    return sum + (itemTotal - itemDiscount)
  }, 0)

  // Invoice level discount
  const invoiceDiscount =
    invoiceDiscountType === 'percentage'
      ? (subtotal * invoiceDiscountValue) / 100
      : invoiceDiscountValue

  const subtotalAfterDiscount = subtotal - invoiceDiscount
  const taxAmount = (subtotalAfterDiscount * taxRate) / 100
  const totalAmount = subtotalAfterDiscount + taxAmount + shippingCost
  const remainingAmount = totalAmount - downPayment.amount

  // Calculate item total
  const calculateItemTotal = (item: InvoiceItemRow): number => {
    const itemTotal = item.quantity * item.price
    const itemDiscount = item.discount_percentage
      ? (itemTotal * item.discount_percentage) / 100
      : item.discount_amount || 0
    return itemTotal - itemDiscount
  }

  // Form validation
  const isFormValid = () => {
    return (
      invoiceNumber &&
      customerId &&
      dueDate &&
      items.length > 0 &&
      items.every(
        (item) => item.product_id > 0 && item.quantity > 0 && item.price > 0
      )
    )
  }

  // Form submission
  const handleSubmit = async () => {
    if (!selectedBranch) {
      toast.error('Cabang belum dipilih')
      return
    }

    if (!isFormValid()) {
      toast.error('Harap lengkapi semua field yang diperlukan')
      return
    }

    setLoading(true)
    try {
      const payload: CreateInvoicePayload = {
        customer_id: customerId!,
        sales_agent_id: salesAgentId,
        due_date: format(dueDate!, 'yyyy-MM-dd'),
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          discount_percentage: item.discount_percentage,
          discount_amount: item.discount_amount,
        })),
        notes: notes || undefined,
        shipping_cost: shippingCost > 0 ? shippingCost : undefined,
        tax_amount: taxAmount,
        invoice_discount_type:
          invoiceDiscountValue > 0 ? invoiceDiscountType : undefined,
        invoice_discount_value:
          invoiceDiscountValue > 0 ? invoiceDiscountValue : undefined,
        down_payment_amount:
          downPayment.amount > 0 ? downPayment.amount : undefined,
        down_payment_method:
          downPayment.amount > 0 ? downPayment.method : undefined,
        down_payment_notes:
          downPayment.amount > 0 && downPayment.notes
            ? downPayment.notes
            : undefined,
      }

      const result = await createInvoice(payload)
      toast.success('Invoice berhasil dibuat')
      router.push(`/invoicing/${result.id}`)
    } catch (error) {
      console.error('Error creating invoice:', error)
      toast.error('Gagal membuat invoice')
    } finally {
      setLoading(false)
      setShowConfirmDialog(false)
    }
  }

  const handleSubmitClick = () => {
    if (!isFormValid()) {
      toast.error('Harap lengkapi semua field yang diperlukan')
      return
    }
    setShowConfirmDialog(true)
  }

  const selectedCustomer = customers.find((c) => c.id === customerId)
  const selectedSalesAgent = salesAgents.find((s) => s.id === salesAgentId)

  if (loadingData) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className='flex items-center justify-center min-h-screen'>
            <div className='text-center'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto'></div>
              <p className='mt-4 text-muted-foreground'>Memuat data...</p>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-4'>
          {/* Header */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              <Button
                variant='outline'
                size='sm'
                asChild
                className='h-8 text-xs'
              >
                <Link href='/invoicing'>
                  <ArrowLeft className='h-4 w-4 mr-1.5' />
                  Kembali
                </Link>
              </Button>
              <div>
                <h1 className='text-xl font-semibold'>Buat Invoice Baru</h1>
                <p className='text-xs text-muted-foreground'>
                  Buat invoice untuk transaksi kredit
                </p>
              </div>
            </div>
            <div className='flex space-x-2'>
              <Button
                variant='outline'
                onClick={() => router.push('/invoicing')}
                size='sm'
                className='h-8 text-xs'
              >
                Batal
              </Button>
              <Button
                onClick={handleSubmitClick}
                disabled={!isFormValid() || loading}
                size='sm'
                className='h-8 text-xs'
              >
                {loading ? (
                  <>
                    <div className='animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-1.5'></div>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className='h-3.5 w-3.5 mr-1.5' />
                    Simpan Invoice
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
            {/* Main Form */}
            <div className='lg:col-span-2 space-y-4'>
              {/* Basic Info */}
              <Card className='shadow-sm bg-white'>
                <CardHeader className='pb-2 pt-4 px-4'>
                  <CardTitle className='flex items-center text-base font-semibold'>
                    <FileText className='h-4 w-4 mr-2' />
                    Informasi Invoice
                  </CardTitle>
                </CardHeader>
                <CardContent className='px-4 py-3 space-y-3'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                    <div>
                      <Label htmlFor='invoice_number' className='text-xs'>
                        Nomor Invoice
                      </Label>
                      <Input
                        id='invoice_number'
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder='Auto-generated'
                        className='h-8 text-xs mt-0.5'
                      />
                    </div>
                    <div>
                      <Label htmlFor='due_date' className='text-xs'>
                        Tanggal Jatuh Tempo
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full justify-start text-left font-normal h-8 text-xs mt-0.5',
                              !dueDate && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className='mr-1.5 h-3.5 w-3.5' />
                            {dueDate
                              ? format(dueDate, 'dd MMM yyyy')
                              : 'Pilih tanggal'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-auto p-0'>
                          <Calendar
                            mode='single'
                            selected={dueDate}
                            onSelect={setDueDate}
                            initialFocus
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                    <div>
                      <Label htmlFor='customer' className='text-xs'>
                        Customer *
                      </Label>
                      <Popover
                        open={openCustomerCombobox}
                        onOpenChange={setOpenCustomerCombobox}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant='outline'
                            role='combobox'
                            aria-expanded={openCustomerCombobox}
                            className='w-full justify-between h-8 text-xs mt-0.5'
                          >
                            {customerId
                              ? customers.find((c) => c.id === customerId)?.name
                              : 'Pilih customer...'}
                            <ChevronsUpDown className='ml-2 h-3.5 w-3.5 shrink-0 opacity-50' />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-[300px] p-0'>
                          <Command>
                            <CommandInput
                              placeholder='Cari customer...'
                              className='h-9 text-xs'
                              value={searchCustomer}
                              onValueChange={setSearchCustomer}
                            />
                            <CommandEmpty className='text-xs py-2'>
                              Tidak ada customer ditemukan.
                            </CommandEmpty>
                            <CommandList>
                              <CommandGroup className='max-h-[200px] overflow-auto'>
                                {customers
                                  .filter((c) =>
                                    c.name
                                      .toLowerCase()
                                      .includes(searchCustomer.toLowerCase())
                                  )
                                  .map((customer) => (
                                    <CommandItem
                                      key={customer.id}
                                      value={customer.id.toString()}
                                      onSelect={() => {
                                        setCustomerId(customer.id)
                                        setOpenCustomerCombobox(false)
                                        setSearchCustomer('')
                                      }}
                                      className='text-xs'
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-3.5 w-3.5',
                                          customerId === customer.id
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

                    <div>
                      <Label htmlFor='sales_agent' className='text-xs'>
                        Sales Agent (Opsional)
                      </Label>
                      <Popover
                        open={openSalesCombobox}
                        onOpenChange={setOpenSalesCombobox}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant='outline'
                            role='combobox'
                            aria-expanded={openSalesCombobox}
                            className='w-full justify-between h-8 text-xs mt-0.5'
                          >
                            {salesAgentId
                              ? salesAgents.find((s) => s.id === salesAgentId)
                                  ?.name
                              : 'Pilih sales agent...'}
                            <ChevronsUpDown className='ml-2 h-3.5 w-3.5 shrink-0 opacity-50' />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-[300px] p-0'>
                          <Command>
                            <CommandInput
                              placeholder='Cari sales agent...'
                              className='h-9 text-xs'
                              value={searchSales}
                              onValueChange={setSearchSales}
                            />
                            <CommandEmpty className='text-xs py-2'>
                              Tidak ada sales agent ditemukan.
                            </CommandEmpty>
                            <CommandList>
                              <CommandGroup className='max-h-[200px] overflow-auto'>
                                {salesAgents
                                  .filter((s) =>
                                    s.name
                                      .toLowerCase()
                                      .includes(searchSales.toLowerCase())
                                  )
                                  .map((agent) => (
                                    <CommandItem
                                      key={agent.id}
                                      value={agent.id.toString()}
                                      onSelect={() => {
                                        setSalesAgentId(agent.id)
                                        setOpenSalesCombobox(false)
                                        setSearchSales('')
                                      }}
                                      className='text-xs'
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-3.5 w-3.5',
                                          salesAgentId === agent.id
                                            ? 'opacity-100'
                                            : 'opacity-0'
                                        )}
                                      />
                                      {agent.name}
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor='notes' className='text-xs'>
                      Catatan
                    </Label>
                    <Textarea
                      id='notes'
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder='Catatan tambahan untuk invoice ini...'
                      rows={2}
                      className='text-xs mt-0.5 resize-none'
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Product Selection */}
              <Card className='shadow-sm bg-white'>
                <CardHeader className='pb-2 pt-4 px-4'>
                  <CardTitle className='text-base font-semibold'>
                    Pilih Produk
                  </CardTitle>
                </CardHeader>
                <CardContent className='px-4 py-3'>
                  <div className='flex gap-2'>
                    <div className='flex-grow'>
                      <Popover
                        open={openProductSearch}
                        onOpenChange={setOpenProductSearch}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant='outline'
                            role='combobox'
                            aria-expanded={openProductSearch}
                            className='w-full justify-between h-8 text-xs'
                          >
                            {selectedProduct
                              ? selectedProduct.name
                              : 'Pilih produk...'}
                            <ChevronsUpDown className='ml-2 h-3.5 w-3.5 shrink-0 opacity-50' />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-[400px] p-0'>
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder='Cari produk (nama/SKU)...'
                              value={searchProductTerm}
                              onValueChange={(value) =>
                                setSearchProductTerm(value)
                              }
                              className='h-9 text-xs'
                              // placeholder='Cari produk...'
                              // className='h-9 text-xs'
                              // value={searchProductTerm}
                              // onValueChange={setSearchProductTerm}
                            />
                            <CommandEmpty className='text-xs p-2'>
                              {loadingProduct ? (
                                <Loader2 className='animate-spin h-4 w-4' />
                              ) : (
                                'Tidak ada produk ditemukan.'
                              )}
                            </CommandEmpty>
                            <CommandList>
                              <CommandGroup className='max-h-[250px] overflow-auto'>
                                {products.map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    value={product.id.toString()}
                                    onSelect={() => {
                                      setSelectedProduct(product)
                                      setOpenProductSearch(false)
                                    }}
                                    className='text-xs cursor-pointer'
                                  >
                                    <div className='flex flex-col w-full'>
                                      <div className='flex justify-between w-full'>
                                        <span className='font-medium'>
                                          {product.name}
                                        </span>
                                        <span className='font-semibold'>
                                          {formatCurrency(product.price || 0)}
                                        </span>
                                      </div>
                                      <div className='flex justify-between text-muted-foreground text-xs'>
                                        <span>
                                          {product.sku ||
                                            product.barcode ||
                                            'No SKU'}
                                        </span>
                                        <span>
                                          Stok: {product.quantity || 0}
                                        </span>
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Button
                      onClick={addProductToItems}
                      disabled={!selectedProduct}
                      size='sm'
                      className='h-8 text-xs'
                    >
                      <Plus className='h-3.5 w-3.5 mr-1.5' />
                      Tambah
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Items */}
              <Card className='shadow-sm bg-white'>
                <CardHeader className='pb-2 pt-4 px-4'>
                  <CardTitle className='text-base font-semibold flex items-center'>
                    <Package className='h-4 w-4 mr-2' />
                    Item Invoice ({items.length} item)
                  </CardTitle>
                </CardHeader>
                <CardContent className='px-4 pb-4'>
                  {items.length === 0 ? (
                    <div className='text-center py-6 border border-dashed rounded-md'>
                      <Package className='h-8 w-8 mx-auto text-muted-foreground mb-2' />
                      <p className='text-sm text-muted-foreground'>
                        Belum ada item ditambahkan. Pilih produk di atas untuk
                        menambahkan.
                      </p>
                    </div>
                  ) : (
                    <div className='border rounded-md'>
                      <Table>
                        <TableHeader>
                          <TableRow className='bg-gray-50'>
                            <TableHead className='w-[240px] text-xs font-semibold'>
                              Produk
                            </TableHead>
                            <TableHead className='w-[80px] text-xs font-semibold text-center'>
                              Qty
                            </TableHead>
                            <TableHead className='w-[180px] text-xs font-semibold text-right'>
                              Harga
                            </TableHead>
                            <TableHead className='w-[200px] text-xs font-semibold text-center'>
                              Diskon
                            </TableHead>
                            <TableHead className='w-[120px] text-xs font-semibold text-right'>
                              Total
                            </TableHead>
                            <TableHead className='w-[50px] text-xs font-semibold text-center'>
                              Aksi
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item, index) => (
                            <TableRow
                              key={item.id}
                              className='hover:bg-gray-50'
                            >
                              <TableCell className='py-3'>
                                <div className='space-y-1'>
                                  <div className='font-medium text-sm'>
                                    {item.product_name}
                                  </div>
                                  <div className='flex gap-2'>
                                    <Badge
                                      variant='outline'
                                      className='text-xs'
                                    >
                                      {item.product?.sku || 'No SKU'}
                                    </Badge>
                                    <Badge
                                      variant='secondary'
                                      className='text-xs'
                                    >
                                      Stok: {item.product?.quantity || 0}
                                    </Badge>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className='text-center'>
                                <Input
                                  type='number'
                                  min='0'
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateItem(
                                      item.id,
                                      'quantity',
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  className='h-8 text-xs text-center w-16 mx-auto'
                                />
                              </TableCell>
                              <TableCell className='text-right'>
                                <Input
                                  type='number'
                                  min='1'
                                  value={item.price}
                                  onChange={(e) =>
                                    updateItem(
                                      item.id,
                                      'price',
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className='h-8 text-xs text-left'
                                />
                              </TableCell>
                              <TableCell>
                                <div className='space-y-2'>
                                  <Select
                                    value={
                                      item.discount_percentage !== undefined
                                        ? 'percentage'
                                        : 'amount'
                                    }
                                    onValueChange={(v) =>
                                      handleItemDiscountTypeChange(
                                        item.id,
                                        v as 'percentage' | 'amount'
                                      )
                                    }
                                  >
                                    <SelectTrigger className='h-7 text-xs'>
                                      <SelectValue placeholder='Tipe' />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem
                                        value='percentage'
                                        className='text-xs'
                                      >
                                        % Persen
                                      </SelectItem>
                                      <SelectItem
                                        value='amount'
                                        className='text-xs'
                                      >
                                        Rp Nominal
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <div className='flex gap-1 items-center'>
                                    {item.discount_percentage !== undefined ? (
                                      <>
                                        <Input
                                          type='number'
                                          min='0'
                                          max='100'
                                          value={item.discount_percentage}
                                          onChange={(e) =>
                                            updateItem(
                                              item.id,
                                              'discount_percentage',
                                              parseFloat(e.target.value) || 0
                                            )
                                          }
                                          className='h-7 text-xs w-16'
                                        />
                                        <span className='text-xs text-muted-foreground'>
                                          %
                                        </span>
                                      </>
                                    ) : (
                                      <Input
                                        type='number'
                                        min='0'
                                        max={item.quantity * item.price}
                                        value={item.discount_amount || 0}
                                        onChange={(e) =>
                                          updateItem(
                                            item.id,
                                            'discount_amount',
                                            parseFloat(e.target.value) || 0
                                          )
                                        }
                                        className='h-7 text-xs'
                                      />
                                    )}
                                  </div>
                                  {item.discount_percentage ||
                                  item.discount_amount ? (
                                    <div className='text-xs text-muted-foreground'>
                                      Diskon:{' '}
                                      {formatCurrency(
                                        item.discount_percentage
                                          ? (item.quantity *
                                              item.price *
                                              item.discount_percentage) /
                                              100
                                          : item.discount_amount || 0
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell className='text-right'>
                                <div className='font-semibold text-sm'>
                                  {formatCurrency(calculateItemTotal(item))}
                                </div>
                              </TableCell>
                              <TableCell className='text-center'>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  onClick={() => removeItem(item.id)}
                                  className='h-7 w-7 text-muted-foreground hover:text-red-600'
                                >
                                  <Trash2 className='h-4 w-4' />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Summary */}
            <div className='space-y-4'>
              <Card className='shadow-sm bg-white'>
                <CardHeader className='pb-2 pt-4 px-4'>
                  <CardTitle className='text-base font-semibold flex items-center'>
                    <Receipt className='h-4 w-4 mr-2' />
                    Ringkasan Invoice
                  </CardTitle>
                </CardHeader>
                <CardContent className='px-4 py-3 space-y-3'>
                  <div className='space-y-2 text-xs'>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>
                        Subtotal Items:
                      </span>
                      <span className='font-medium'>
                        {formatCurrency(subtotal)}
                      </span>
                    </div>

                    {/* Invoice Discount */}
                    <div className='space-y-2 border-t pt-2'>
                      <Label className='text-xs'>Diskon Invoice:</Label>
                      <div className='flex space-x-2'>
                        <Select
                          value={invoiceDiscountType}
                          onValueChange={(v) =>
                            handleInvoiceDiscountTypeChange(
                              v as 'percentage' | 'amount'
                            )
                          }
                        >
                          <SelectTrigger className='h-7 text-xs w-28'>
                            <SelectValue placeholder='Tipe Diskon' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='percentage' className='text-xs'>
                              <div className='flex items-center'>
                                <Percent className='h-3.5 w-3.5 mr-1.5' />
                                Persen
                              </div>
                            </SelectItem>
                            <SelectItem value='amount' className='text-xs'>
                              <div className='flex items-center'>
                                <Tag className='h-3.5 w-3.5 mr-1.5' />
                                Nominal
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type='number'
                          min='0'
                          max={
                            invoiceDiscountType === 'percentage'
                              ? '100'
                              : subtotal
                          }
                          value={invoiceDiscountValue}
                          onChange={(e) =>
                            setInvoiceDiscountValue(
                              parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder={
                            invoiceDiscountType === 'percentage' ? '0-100' : '0'
                          }
                          className='h-7 text-xs'
                        />
                      </div>
                      {invoiceDiscount > 0 && (
                        <div className='text-xs text-muted-foreground'>
                          Diskon: {formatCurrency(invoiceDiscount)}
                        </div>
                      )}
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='shipping_cost' className='text-xs'>
                        Biaya Pengiriman:
                      </Label>
                      <div className='flex items-center gap-2'>
                        <Truck className='h-3.5 w-3.5 text-muted-foreground' />
                        <Input
                          id='shipping_cost'
                          type='number'
                          min='0'
                          value={shippingCost}
                          onChange={(e) =>
                            setShippingCost(parseFloat(e.target.value) || 0)
                          }
                          className='h-7 text-xs'
                        />
                      </div>
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='tax_rate' className='text-xs'>
                        Pajak (%):
                      </Label>
                      <div className='flex items-center gap-2'>
                        <Percent className='h-3.5 w-3.5 text-muted-foreground' />
                        <Input
                          id='tax_rate'
                          type='number'
                          min='0'
                          max='100'
                          value={taxRate}
                          onChange={(e) =>
                            setTaxRate(parseFloat(e.target.value) || 0)
                          }
                          className='h-7 text-xs'
                        />
                      </div>
                    </div>

                    <div className='flex justify-between pt-2 border-t text-xs'>
                      <span className='text-muted-foreground'>
                        Subtotal Setelah Diskon:
                      </span>
                      <span className='font-medium'>
                        {formatCurrency(subtotalAfterDiscount)}
                      </span>
                    </div>

                    <div className='flex justify-between text-xs'>
                      <span className='text-muted-foreground'>
                        Pajak ({taxRate}%):
                      </span>
                      <span className='font-medium'>
                        {formatCurrency(taxAmount)}
                      </span>
                    </div>

                    <div className='flex justify-between text-xs'>
                      <span className='text-muted-foreground'>
                        Biaya Pengiriman:
                      </span>
                      <span className='font-medium'>
                        {formatCurrency(shippingCost)}
                      </span>
                    </div>

                    <div className='border-t pt-2'>
                      <div className='flex justify-between font-bold text-sm'>
                        <span>Total Invoice:</span>
                        <span>{formatCurrency(totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Down Payment */}
              <Card className='shadow-sm bg-white'>
                <CardHeader className='pb-2 pt-4 px-4'>
                  <CardTitle className='text-base font-semibold flex items-center'>
                    <BanknoteIcon className='h-4 w-4 mr-2' />
                    Uang Muka (Down Payment)
                  </CardTitle>
                </CardHeader>
                <CardContent className='px-4 py-3 space-y-3'>
                  <div className='space-y-2'>
                    <Label htmlFor='dp_amount' className='text-xs'>
                      Jumlah Uang Muka:
                    </Label>
                    <Input
                      id='dp_amount'
                      type='number'
                      min='0'
                      max={totalAmount}
                      value={downPayment.amount}
                      onChange={(e) =>
                        setDownPayment({
                          ...downPayment,
                          amount: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder='0'
                      className='h-7 text-xs'
                    />
                  </div>

                  {downPayment.amount > 0 && (
                    <>
                      <div className='space-y-2'>
                        <Label htmlFor='dp_method' className='text-xs'>
                          Metode Pembayaran:
                        </Label>
                        <Select
                          value={downPayment.method}
                          onValueChange={(value) =>
                            setDownPayment({
                              ...downPayment,
                              method: value as 'cash' | 'transfer',
                            })
                          }
                        >
                          <SelectTrigger className='h-7 text-xs'>
                            <SelectValue placeholder='Pilih metode' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='cash' className='text-xs'>
                              <div className='flex items-center'>
                                <BanknoteIcon className='h-3.5 w-3.5 mr-1.5' />
                                Tunai
                              </div>
                            </SelectItem>
                            <SelectItem value='transfer' className='text-xs'>
                              <div className='flex items-center'>
                                <CreditCard className='h-3.5 w-3.5 mr-1.5' />
                                Transfer Bank
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className='space-y-2'>
                        <Label htmlFor='dp_notes' className='text-xs'>
                          Catatan Pembayaran:
                        </Label>
                        <Textarea
                          id='dp_notes'
                          value={downPayment.notes}
                          onChange={(e) =>
                            setDownPayment({
                              ...downPayment,
                              notes: e.target.value,
                            })
                          }
                          placeholder='Catatan untuk pembayaran uang muka...'
                          rows={2}
                          className='text-xs resize-none'
                        />
                      </div>

                      <div className='border-t pt-2'>
                        <div className='flex justify-between font-bold text-sm'>
                          <span>Sisa Pembayaran:</span>
                          <span>{formatCurrency(remainingAmount)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Customer Info */}
              {selectedCustomer && (
                <Card className='shadow-sm bg-white'>
                  <CardHeader className='pb-2 pt-4 px-4'>
                    <CardTitle className='text-base font-semibold flex items-center'>
                      <Users className='h-4 w-4 mr-2' />
                      Informasi Customer
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='px-4 py-3'>
                    <div className='space-y-2 text-xs'>
                      <div className='font-medium'>{selectedCustomer.name}</div>
                      <div className='text-muted-foreground'>
                        {selectedCustomer.address || 'Tidak ada alamat'}
                      </div>
                      {selectedCustomer.email && (
                        <div className='text-muted-foreground'>
                          Email: {selectedCustomer.email}
                        </div>
                      )}
                      {selectedCustomer.phone && (
                        <div className='text-muted-foreground'>
                          Telepon: {selectedCustomer.phone}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation Dialog */}
        <AlertDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
        >
          <AlertDialogContent className='max-w-md'>
            <AlertDialogHeader>
              <AlertDialogTitle className='text-lg font-semibold'>
                Konfirmasi Simpan Invoice
              </AlertDialogTitle>
              <AlertDialogDescription className='text-sm text-muted-foreground space-y-2'>
                <div>Pastikan data invoice sudah benar sebelum menyimpan:</div>
                <div className='bg-gray-50 p-3 rounded-md space-y-1 text-xs'>
                  <div className='flex justify-between'>
                    <span>Customer:</span>
                    <span className='font-medium'>
                      {selectedCustomer?.name}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Jumlah Item:</span>
                    <span className='font-medium'>{items.length} item</span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Total Amount:</span>
                    <span className='font-medium'>
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                  {downPayment.amount > 0 && (
                    <div className='flex justify-between'>
                      <span>Uang Muka:</span>
                      <span className='font-medium'>
                        {formatCurrency(downPayment.amount)}
                      </span>
                    </div>
                  )}
                  <div className='flex justify-between'>
                    <span>Sisa Pembayaran:</span>
                    <span className='font-medium'>
                      {formatCurrency(remainingAmount)}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Jatuh Tempo:</span>
                    <span className='font-medium'>
                      {dueDate
                        ? format(dueDate, 'dd MMM yyyy', { locale: id })
                        : '-'}
                    </span>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading} className='text-xs h-8'>
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSubmit}
                disabled={loading}
                className='text-xs h-8'
              >
                {loading ? (
                  <>
                    <div className='animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-1.5'></div>
                    Menyimpan...
                  </>
                ) : (
                  'Ya, Simpan Invoice'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MainLayout>
    </ProtectedRoute>
  )
}
