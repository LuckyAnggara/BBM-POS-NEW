import React, { useCallback, useMemo, useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  ShoppingCart,
  MinusCircle,
  PlusCircle,
  XCircle,
  Edit3,
  CheckCircle,
  DollarSign,
  CreditCard,
  Banknote,
  UserPlus,
  ChevronsUpDown,
  QrCode,
  CalendarIcon,
  Trash2,
} from 'lucide-react'
import type { Customer } from '@/lib/appwrite/customers'
import type { CartItem, InventoryItem } from '@/lib/appwrite/types' // Assuming type is exported from page.tsx
import type { PaymentMethod } from '@/lib/appwrite/pos'
import { useBranch } from '@/contexts/branch-context'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { BankAccount } from '@/lib/appwrite/bankAccounts'
import { getCustomers } from '@/lib/appwrite/customers'
import { getBankAccounts } from '@/lib/appwrite/bankAccounts'

// Define the props interface
interface SaleSummaryPanelProps {
  activeShift: boolean
  taxAmount: number
  subtotal: number
  voucherCode: string
  voucherDiscount: string
  selectedPaymentTerms: PaymentMethod
  selectedCustomerId?: string
  creditDueDate?: Date
  loadingCustomers: boolean
  customerSearchTerm: string
  isCustomerComboboxOpen: boolean
  onSetShippingCost: (value: string) => void
  onSetVoucherCode: (value: string) => void
  onSetVoucherDiscount: (value: string) => void
  onSetSelectedPaymentTerms: (method: PaymentMethod) => void
  onSetSelectedCustomerId: (id: string | undefined) => void
  onSetCreditDueDate: (date: Date | undefined) => void
  onSetCustomerSearchTerm: (term: string) => void
  onSetIsCustomerComboboxOpen: (isOpen: boolean) => void
  onShowScanCustomerDialog: () => void
  onCompleteSale: () => void
}

export function SaleSummaryPanel({
  activeShift,
  taxAmount,
  subtotal,
  voucherCode,
  onSetShippingCost,
  onSetVoucherCode,
  onSetVoucherDiscount,
  onSetSelectedPaymentTerms,
  onSetSelectedCustomerId,
  onSetCreditDueDate,
  onSetCustomerSearchTerm,
  onSetIsCustomerComboboxOpen,
  onShowScanCustomerDialog,
  onCompleteSale,
}: SaleSummaryPanelProps) {
  const { selectedBranch } = useBranch()
  const currency = selectedBranch?.currency || 'Rp'
  const taxDisplayRate = (selectedBranch?.taxRate || 11 * 100).toFixed(0)

  // Cart & Sale State

  const [isProcessingSale, setIsProcessingSale] = useState(false)
  const [shippingCostInput, setShippingCostInput] = useState('')
  const [voucherCodeInput, setVoucherCodeInput] = useState('')
  const [voucherDiscountInput, setVoucherDiscountInput] = useState('')

  // Payment & Customer State
  const [selectedPaymentTerms, setSelectedPaymentTerms] =
    useState<PaymentMethod>('cash')
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

  // Bank
  const [availableBankAccounts, setAvailableBankAccounts] = useState<
    BankAccount[]
  >([])
  const [loadingBankAccounts, setLoadingBankAccounts] = useState(false)
  const [showBankPaymentModal, setShowBankPaymentModal] = useState(false)
  const [selectedBankName, setSelectedBankName] = useState<string>('')
  const [bankRefNumberInput, setBankRefNumberInput] = useState('')
  const [customerNameInputBank, setCustomerNameInputBank] = useState('')

  const [cartItems, setCartItems] = useState<CartItem[]>([])

  // Discount
  const [isItemDiscountDialogOpen, setIsItemDiscountDialogOpen] =
    useState(false)
  const [selectedItemForDiscount, setSelectedItemForDiscount] =
    useState<CartItem | null>(null)
  const [currentDiscountType, setCurrentDiscountType] = useState<
    'nominal' | 'percentage'
  >('nominal')
  const [currentDiscountValue, setCurrentDiscountValue] = useState<string>('')

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

  const {
    discountedPrice: previewDiscountedPrice,
    actualDiscountAmount: previewActualDiscountAmount,
  } = calculateDiscountedPrice()

  // Cart Item handlers
  const handleAddToCart = useCallback(
    (product: InventoryItem) => {
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
            total: product.price,
          },
        ]
      })
    },
    [activeShift]
  )
  const handleUpdateCartQuantity = useCallback(
    (productId: string, newQuantity: number) => {
      const productInStock = cartItems.find((p) => p.productId === productId)
      if (!productInStock) return

      if (newQuantity <= 0) {
        setCartItems((prev) =>
          prev.filter((item) => item.productId !== productId)
        )
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
            ? {
                ...item,
                quantity: newQuantity,
                total: newQuantity * item.price,
              }
            : item
        )
      )
    },
    [cartItems]
  )
  const handleRemoveFromCart = useCallback((productId: string) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => item.productId !== productId)
    )
  }, [])

  // Discount Handler
  const handleItemDiscountTypeChange = (type: 'nominal' | 'percentage') => {
    setCurrentDiscountType(type)
    setCurrentDiscountValue('')
  }
  const handleOpenItemDiscountDialog = (item: CartItem) => {
    setSelectedItemForDiscount(item)
    setCurrentDiscountType(item.itemDiscountType || 'nominal')
    setCurrentDiscountValue((item.itemDiscountValue || 0).toString())
    setIsItemDiscountDialogOpen(true)
  }

  const handleItemDiscountValueChange = (value: string) => {
    setCurrentDiscountValue(value)
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

  // Customer Handler
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
      const [resultCustomers, resulBankAccounts] = await Promise.all([
        getCustomers(selectedBranch.id),
        getBankAccounts(selectedBranch.id),
      ])
      setAllCustomers(resultCustomers.customers)
      setFilteredCustomers(resultCustomers.customers.slice(0, 5))
      setAvailableBankAccounts(resulBankAccounts)
    } catch (error) {
      console.error('Error fetching customers/banks for POS:', error)
      toast.error('Gagal Memuat Data', {
        description: 'Tidak dapat memuat pelanggan atau rekening bank.',
      })
    } finally {
      setLoadingCustomers(false)
      setLoadingBankAccounts(false)
    }
  }, [selectedBranch])

  // --- Memos for calculations ---
  const totalItemDiscount = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + (item.discountAmount || 0) * item.quantity,
        0
      ),
    [cartItems]
  )
  const subtotalAfterItemDiscounts = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.total, 0),
    [cartItems]
  )
  const taxRate = selectedBranch?.taxRate ? selectedBranch.taxRate / 100 : 0.0
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
  const total = useMemo(
    () => subtotalAfterItemDiscounts + tax + shippingCost - voucherDiscount,
    [subtotalAfterItemDiscounts, tax, shippingCost, voucherDiscount]
  )
  // ... other memos

  return (
    <>
      <Card className='m-3 ml-2 flex flex-col shadow-lg rounded-lg h-full'>
        <CardHeader className='p-3 border-b'>
          <CardTitle className='text-base font-semibold'>
            Penjualan Saat Ini
          </CardTitle>
        </CardHeader>

        <CardContent className='flex-grow overflow-y-auto p-0'>
          {/* Cart Items Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='text-xs px-2 py-1.5'>Item</TableHead>
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
              {cartItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className='text-center text-muted-foreground py-8 text-xs'
                  >
                    <ShoppingCart className='mx-auto h-8 w-8 text-muted-foreground/50 mb-2' />
                    Keranjang kosong
                  </TableCell>
                </TableRow>
              ) : (
                cartItems.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell className='font-medium text-xs py-1 px-2 truncate'>
                      {item.productName}
                      {item.discountAmount && item.discountAmount > 0 && (
                        <div className='flex items-center gap-1'>
                          <span className='text-[0.65rem] text-muted-foreground line-through'>
                            {currency}
                            {(item.originalPrice || 0).toLocaleString('id-ID')}
                          </span>
                          <span className='text-[0.65rem] text-destructive'>
                            (-{currency}
                            {item.discountAmount.toLocaleString('id-ID')})
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className='text-center text-xs py-1 px-1'>
                      <div className='flex items-center justify-center gap-0.5'>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-5 w-5'
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
                          className='h-5 w-5'
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
                        onClick={() => handleOpenItemDiscountDialog(item)}
                        disabled={!activeShift}
                      >
                        <Edit3 className='h-3.5 w-3.5 text-blue-600' />
                        <span className='sr-only'>Edit Diskon</span>
                      </Button>
                    </TableCell>
                    <TableCell className='text-right text-xs py-1 px-2'>
                      {currency}
                      {item.total.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className='text-right py-1 px-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-5 w-5 text-destructive'
                        disabled={!activeShift}
                        onClick={() => handleRemoveFromCart(item.productId)}
                      >
                        <XCircle className='h-3.5 w-3.5' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        <CardFooter className='flex flex-col gap-1.5 border-t p-3'>
          {/* Financial Summary */}
          <div className='flex justify-between text-xs w-full'>
            <span>Subtotal (Stlh Diskon Item):</span>
            <span>
              {currency}
              {subtotal.toLocaleString('id-ID')}
            </span>
          </div>
          <div className='flex justify-between text-xs w-full'>
            <span>Pajak ({taxDisplayRate}%):</span>
            <span>
              {currency}
              {taxAmount.toLocaleString('id-ID')}
            </span>
          </div>

          {/* Additional Costs & Discounts */}
          <div className='w-full grid grid-cols-2 gap-x-3 gap-y-1.5 mt-1'>
            <div>
              <Label
                htmlFor='shippingCostInput'
                className='text-[0.7rem] text-muted-foreground'
              >
                Ongkos Kirim ({currency})
              </Label>
              <Input
                id='shippingCostInput'
                type='number'
                value={shippingCost}
                onChange={(e) => onSetShippingCost(e.target.value)}
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
                value={voucherCode}
                onChange={(e) => onSetVoucherCode(e.target.value)}
                placeholder='Opsional'
                className='h-8 text-xs mt-0.5'
              />
            </div>
            <div className='col-span-2'>
              <Label
                htmlFor='voucherDiscountInput'
                className='text-[0.7rem] text-muted-foreground'
              >
                Diskon Voucher ({currency})
              </Label>
              <Input
                id='voucherDiscountInput'
                type='number'
                value={voucherDiscount}
                onChange={(e) => onSetVoucherDiscount(e.target.value)}
                placeholder='0'
                className='h-8 text-xs mt-0.5'
              />
            </div>
          </div>

          {totalDiscount > 0 && (
            <div className='flex justify-between text-xs w-full text-destructive pt-1'>
              <span>Total Diskon Keseluruhan:</span>
              <span>
                -{currency}
                {totalDiscount.toLocaleString('id-ID')}
              </span>
            </div>
          )}

          <div className='flex justify-between text-base font-bold w-full mt-1.5 pt-1.5 border-t'>
            <span>Total:</span>
            <span>
              {currency}
              {total.toLocaleString('id-ID')}
            </span>
          </div>

          {/* Payment Selection */}
          <div className='w-full mt-2 pt-2 border-t'>
            <Label className='text-xs font-medium mb-1 block'>
              Termin Pembayaran:
            </Label>
            <Select
              value={selectedPaymentTerms}
              onValueChange={(value) =>
                onSetSelectedPaymentTerms(value as PaymentMethod)
              }
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

          {/* Credit Sale Section */}
          {selectedPaymentTerms === 'credit' && (
            <div className='w-full mt-2 space-y-2 p-2 border rounded-md bg-muted/30'>
              {/* Customer Selection */}
              <div className='flex items-center gap-2'>
                <div className='flex-grow'>
                  <Label htmlFor='selectedCustomer' className='text-xs'>
                    Pelanggan
                  </Label>
                  <Popover
                    open={isCustomerComboboxOpen}
                    onOpenChange={onSetIsCustomerComboboxOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant='outline'
                        role='combobox'
                        className='w-full justify-between h-8 text-xs mt-1 font-normal'
                        disabled={loadingCustomers || allCustomers.length === 0}
                      >
                        {selectedCustomerId
                          ? allCustomers.find(
                              (c) => c.id === selectedCustomerId
                            )?.name
                          : loadingCustomers
                          ? 'Memuat...'
                          : 'Pilih Pelanggan'}
                        <ChevronsUpDown className='ml-2 h-3.5 w-3.5 shrink-0 opacity-50' />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-[--radix-popover-trigger-width] p-0'>
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder='Cari pelanggan...'
                          value={customerSearchTerm}
                          onValueChange={onSetCustomerSearchTerm}
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
                                onSelect={(val) => {
                                  onSetSelectedCustomerId(
                                    val === selectedCustomerId ? undefined : val
                                  )
                                  onSetCustomerSearchTerm(
                                    val === selectedCustomerId
                                      ? ''
                                      : customer.name
                                  )
                                  onSetIsCustomerComboboxOpen(false)
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
                  onClick={onShowScanCustomerDialog}
                  disabled={loadingCustomers}
                >
                  <QrCode className='h-4 w-4' />
                  <span className='sr-only'>Scan</span>
                </Button>
              </div>
              {/* Credit Due Date */}
              <div>
                <Label htmlFor='creditDueDate' className='text-xs'>
                  Tgl Jatuh Tempo
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
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
                      onSelect={onSetCreditDueDate}
                      initialFocus
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
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
            onClick={onCompleteSale}
          >
            {isProcessingSale ? (
              'Memproses...'
            ) : (
              <>
                <CheckCircle className='mr-1.5 h-4 w-4' /> Selesaikan Penjualan
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
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
              Harga Asli: {currency}
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
                    Nominal ({currency})
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
                onChange={(e) => handleItemDiscountValueChange(e.target.value)}
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
                    {currency}
                    {previewActualDiscountAmount.toLocaleString('id-ID')}
                  </span>
                </p>
                <p>
                  Harga Baru per Item:{' '}
                  <span className='font-medium'>
                    {currency}
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
    </>
  )
}
