'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  useForm,
  useFieldArray,
  Controller,
  type SubmitHandler,
  Control,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  PlusCircle,
  Trash2,
  CalendarIcon,
  AlertTriangle,
  ArrowLeft,
  ChevronsUpDown,
  CheckCircle,
  Package,
} from 'lucide-react'

// Konteks dan Hook
import { useAuth } from '@/contexts/auth-context'
import { useBranch } from '@/contexts/branch-context'
import { useToast } from '@/hooks/use-toast'

// Komponen UI
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Calendar } from '@/components/ui/calendar'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// Tipe dan Fungsi Appwrite
import type { Supplier } from '@/lib/appwrite/suppliers'
import type { InventoryItem } from '@/lib/appwrite/inventory' // Menggunakan tipe dokumen baru jika ada
import {
  PurchaseOrderInput,
  PurchaseOrderPaymentTerms,
} from '@/lib/appwrite/purchaseOrders' // Tipe input utama kita
import { getSuppliers } from '@/lib/appwrite/suppliers'
import { getInventoryItems } from '@/lib/appwrite/inventory' // Asumsi fungsi ini mengembalikan { documents, total }
import { addPurchaseOrder } from '@/lib/appwrite/purchaseOrders'
import { useDebounce } from '@uidotdev/usehooks'
import { formatCurrency } from '@/lib/helper'

// --- Skema Validasi (Zod) ---
// Skema untuk satu item dalam form, ini adalah data mentah dari UI
const formItemSchema = z.object({
  productId: z.string().min(1, 'Produk harus dipilih.'),
  productName: z.string(), // Nama produk untuk display sementara
  orderedQuantity: z.coerce.number().positive('Jumlah harus lebih dari 0.'),
  purchasePrice: z.coerce.number().min(0, 'Harga beli tidak boleh negatif.'),
})

// Skema untuk keseluruhan form PO
const purchaseOrderFormSchema = z
  .object({
    supplierId: z.string().min(1, 'Pemasok harus dipilih.'),
    orderDate: z.date({ required_error: 'Tanggal pemesanan harus diisi.' }),
    expectedDeliveryDate: z.date().optional(),
    items: z
      .array(formItemSchema)
      .min(1, 'Minimal satu item harus ditambahkan.'),
    notes: z.string().optional(),
    paymentTermsOnPO: z
      .enum(['cash', 'credit'], {
        required_error: 'Termin pembayaran harus dipilih.',
      })
      .default('cash'),
    supplierInvoiceNumber: z.string().optional(),
    paymentDueDateOnPO: z.date().optional(),
    taxDiscountAmount: z.coerce.number().default(0),
    shippingCostCharged: z.coerce.number().default(0),
    otherCosts: z.coerce.number().default(0),
  })
  .refine(
    (data) => {
      if (data.paymentTermsOnPO === 'credit' && !data.paymentDueDateOnPO) {
        return false // Gagal validasi jika kredit tapi tidak ada tanggal jatuh tempo
      }
      return true
    },
    {
      message: 'Tanggal jatuh tempo harus diisi untuk termin kredit.',
      path: ['paymentDueDateOnPO'], // Tunjukkan error pada field ini
    }
  )

// Tipe yang dihasilkan dari skema Zod untuk digunakan di form
type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>

export default function NewPurchaseOrderPage() {
  const { currentUser } = useAuth()
  const { selectedBranch } = useBranch()
  const { toast } = useToast()
  const router = useRouter()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])

  const [loading, setLoading] = useState(true)
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [loadingInventory, setLoadingInventory] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [openProductPopovers, setOpenProductPopovers] = useState<
    Record<number, boolean>
  >({})

  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  const poForm = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: {
      orderDate: new Date(),
      items: [
        {
          productId: '',
          productName: '',
          orderedQuantity: 1,
          purchasePrice: 0,
        },
      ],
      paymentTermsOnPO: 'cash',
      taxDiscountAmount: 0,
      shippingCostCharged: 0,
      otherCosts: 0,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: poForm.control,
    name: 'items',
  })

  const fetchInitialData = useCallback(async () => {
    if (!selectedBranch) return
    setLoading(true)
    setLoadingSuppliers(true)

    try {
      const [suppliersResult, inventoryResult] = await Promise.all([
        getSuppliers(selectedBranch.id),
        getInventoryItems(selectedBranch.id, { limit: 5 }), // Ambil semua item untuk pencarian
      ])
      setSuppliers(suppliersResult.suppliers || [])
      setInventoryItems(inventoryResult.items || [])
    } catch (error) {
      console.error('Error fetching initial data:', error)
      toast({
        title: 'Gagal Memuat Data',
        description: 'Tidak dapat memuat data pemasok atau inventaris.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setLoadingSuppliers(false)
      setLoadingInventory(false)
    }
  }, [selectedBranch, toast])

  const fetchInventoryData = useCallback(async () => {
    if (!selectedBranch) return
    setLoadingInventory(true)
    try {
      const [inventoryResult] = await Promise.all([
        getInventoryItems(selectedBranch.id, {
          limit: 5,
          searchTerm: debouncedSearchTerm,
        }), // Ambil semua item untuk pencarian
      ])
      setInventoryItems(inventoryResult.items || [])
    } finally {
      setLoadingInventory(false)
    }
  }, [debouncedSearchTerm])

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  useEffect(() => {
    fetchInventoryData()
  }, [debouncedSearchTerm])

  const getFilteredProductsForItem = (index: number) => {
    const searchTerm = inventoryItems
  }

  const onSubmitPurchaseOrder: SubmitHandler<PurchaseOrderFormValues> = async (
    values
  ) => {
    if (!selectedBranch || !currentUser) {
      toast({
        title: 'Error',
        description: 'Cabang atau pengguna tidak valid.',
        variant: 'destructive',
      })
      return
    }

    const selectedSupplier = suppliers.find((s) => s.id === values.supplierId)
    if (!selectedSupplier) {
      toast({ title: 'Pemasok Tidak Valid', variant: 'destructive' })
      return
    }

    // Transformasi data form menjadi struktur yang dibutuhkan oleh `addPurchaseOrder`
    const poInputData: PurchaseOrderInput = {
      branchId: selectedBranch.id,
      supplierId: values.supplierId,
      createdById: currentUser.$id,
      orderDate: values.orderDate.toISOString(),
      expectedDeliveryDate: values.expectedDeliveryDate?.toISOString(),
      notes: values.notes,
      paymentTermsOnPO: values.paymentTermsOnPO,
      supplierInvoiceNumber: values.supplierInvoiceNumber,
      paymentDueDateOnPO: values.paymentDueDateOnPO?.toISOString(),
      taxDiscountAmount: values.taxDiscountAmount,
      shippingCostCharged: values.shippingCostCharged,
      otherCosts: values.otherCosts,
      // Map item dari form ke struktur yang benar
      items: values.items.map((item) => ({
        productId: item.productId,
        productName: item.productName, // Denormalisasi nama saat membuat
        orderedQuantity: item.orderedQuantity,
        purchasePrice: item.purchasePrice,
      })),
      status: 'draft', // or another default status as required by your app
      supplierName: selectedSupplier.name,
    }

    setLoading(true)
    const result = await addPurchaseOrder(poInputData, selectedSupplier.name)
    setLoading(false)

    if (result && 'error' in result) {
      toast({
        title: 'Gagal Membuat Pesanan',
        description: result.error,
        variant: 'destructive',
      })
    } else if (result) {
      toast({
        title: 'Pesanan Pembelian Dibuat!',
        description: `PO ${result.poNumber} berhasil disimpan.`,
      })
      router.push('/purchase-orders')
    }
  }

  const handleProductPopoverOpenChange = (index: number, open: boolean) => {
    setOpenProductPopovers((prev) => ({ ...prev, [index]: open }))
  }

  // --- Kalkulasi Total untuk Ditampilkan di UI ---
  const watchedItems = poForm.watch('items')
  const itemsSubtotal = watchedItems.reduce((acc, item) => {
    const quantity = Number(item.orderedQuantity) || 0
    const price = Number(item.purchasePrice) || 0
    return acc + quantity * price
  }, 0)

  const taxDiscountAmount = Number(poForm.watch('taxDiscountAmount')) || 0
  const shippingCostCharged = Number(poForm.watch('shippingCostCharged')) || 0
  const otherCosts = Number(poForm.watch('otherCosts')) || 0
  const totalAmount =
    itemsSubtotal -
    Number(taxDiscountAmount) +
    Number(shippingCostCharged) +
    Number(otherCosts)
  const currencySymbol = selectedBranch?.currency || 'Rp'

  if (!selectedBranch) {
    return (
      <MainLayout>
        <div className='p-4 text-center text-muted-foreground'>
          <AlertTriangle className='mx-auto h-10 w-10 mb-2 text-yellow-500' />
          Silakan pilih cabang terlebih dahulu untuk membuat pesanan pembelian.
          <Button asChild variant='outline' className='mt-4'>
            <Link href='/dashboard'>Kembali ke Dashboard</Link>
          </Button>
        </div>
      </MainLayout>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h1 className='text-xl md:text-2xl font-semibold font-headline'>
              Buat Pesanan Pembelian Baru
            </h1>
            <Button variant='outline' size='sm' asChild className='text-xs'>
              <Link href='/purchase-orders'>
                <ArrowLeft className='mr-1.5 h-3.5 w-3.5' /> Kembali ke Daftar
                PO
              </Link>
            </Button>
          </div>

          <form onSubmit={poForm.handleSubmit(onSubmitPurchaseOrder)}>
            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Informasi Pesanan</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <div>
                    <Label htmlFor='supplierId' className='text-xs'>
                      Pemasok*
                    </Label>
                    <Controller
                      name='supplierId'
                      control={poForm.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={loadingSuppliers}
                        >
                          <SelectTrigger className='h-9 text-xs mt-1'>
                            <SelectValue
                              placeholder={
                                loadingSuppliers ? 'Memuat...' : 'Pilih pemasok'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((s) => (
                              <SelectItem
                                key={s.id}
                                value={s.id}
                                className='text-xs'
                              >
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {poForm.formState.errors.supplierId && (
                      <p className='text-xs text-destructive mt-1'>
                        {poForm.formState.errors.supplierId.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor='orderDate' className='text-xs'>
                      Tanggal Pemesanan*
                    </Label>
                    <Controller
                      name='orderDate'
                      control={poForm.control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant='outline'
                              className='w-full justify-start text-left font-normal h-9 text-xs mt-1'
                            >
                              <CalendarIcon className='mr-1.5 h-3.5 w-3.5' />
                              {field.value ? (
                                format(field.value, 'dd MMM yyyy')
                              ) : (
                                <span>Pilih tanggal</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className='w-auto p-0'>
                            <Calendar
                              mode='single'
                              selected={field.value}
                              onSelect={field.onChange}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    {poForm.formState.errors.orderDate && (
                      <p className='text-xs text-destructive mt-1'>
                        {poForm.formState.errors.orderDate.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor='expectedDeliveryDate' className='text-xs'>
                      Estimasi Tgl Terima
                    </Label>
                    <Controller
                      name='expectedDeliveryDate'
                      control={poForm.control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant='outline'
                              className='w-full justify-start text-left font-normal h-9 text-xs mt-1'
                            >
                              <CalendarIcon className='mr-1.5 h-3.5 w-3.5' />
                              {field.value ? (
                                format(field.value, 'dd MMM yyyy')
                              ) : (
                                <span>Pilih tanggal</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className='w-auto p-0'>
                            <Calendar
                              mode='single'
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                poForm.getValues('orderDate')
                                  ? date < poForm.getValues('orderDate')
                                  : false
                              }
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <div>
                    <Label htmlFor='paymentTermsOnPO' className='text-xs'>
                      Termin Pembayaran*
                    </Label>
                    <Controller
                      name='paymentTermsOnPO'
                      control={poForm.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className='h-9 text-xs mt-1'>
                            <SelectValue placeholder='Pilih termin' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='cash' className='text-xs'>
                              Tunai
                            </SelectItem>
                            <SelectItem value='credit' className='text-xs'>
                              Kredit
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {poForm.formState.errors.paymentTermsOnPO && (
                      <p className='text-xs text-destructive mt-1'>
                        {poForm.formState.errors.paymentTermsOnPO.message}
                      </p>
                    )}
                  </div>
                  {poForm.watch('paymentTermsOnPO') === 'credit' && (
                    <>
                      <div>
                        <Label
                          htmlFor='supplierInvoiceNumber'
                          className='text-xs'
                        >
                          No. Invoice Pemasok
                        </Label>
                        <Input
                          id='supplierInvoiceNumber'
                          {...poForm.register('supplierInvoiceNumber')}
                          className='h-9 text-xs mt-1'
                          placeholder='Opsional'
                        />
                      </div>
                      <div>
                        <Label htmlFor='paymentDueDateOnPO' className='text-xs'>
                          Tgl Jatuh Tempo Bayar*
                        </Label>
                        <Controller
                          name='paymentDueDateOnPO'
                          control={poForm.control}
                          render={({ field }) => (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant='outline'
                                  className='w-full justify-start text-left font-normal h-9 text-xs mt-1'
                                >
                                  <CalendarIcon className='mr-1.5 h-3.5 w-3.5' />
                                  {field.value ? (
                                    format(field.value, 'dd MMM yyyy')
                                  ) : (
                                    <span>Pilih tanggal</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className='w-auto p-0'>
                                <Calendar
                                  mode='single'
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    poForm.getValues('orderDate')
                                      ? date < poForm.getValues('orderDate')
                                      : false
                                  }
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                        />
                        {poForm.formState.errors.paymentDueDateOnPO && (
                          <p className='text-xs text-destructive mt-1'>
                            {poForm.formState.errors.paymentDueDateOnPO.message}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <Separator />
                <p className='text-sm font-medium text-muted-foreground'>
                  Biaya & Diskon Tambahan
                </p>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <div>
                    <Label htmlFor='shippingCostCharged' className='text-xs'>
                      Ongkos Kirim Dibebankan ({currencySymbol})
                    </Label>
                    <Input
                      id='shippingCostCharged'
                      type='number'
                      {...poForm.register('shippingCostCharged')}
                      className='h-9 text-xs mt-1'
                      placeholder='0'
                    />
                    {poForm.formState.errors.shippingCostCharged && (
                      <p className='text-xs text-destructive mt-1'>
                        {poForm.formState.errors.shippingCostCharged.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor='taxDiscountAmount' className='text-xs'>
                      Diskon Pajak ({currencySymbol})
                    </Label>
                    <Input
                      id='taxDiscountAmount'
                      type='number'
                      {...poForm.register('taxDiscountAmount')}
                      className='h-9 text-xs mt-1'
                      placeholder='0'
                    />
                    {poForm.formState.errors.taxDiscountAmount && (
                      <p className='text-xs text-destructive mt-1'>
                        {poForm.formState.errors.taxDiscountAmount.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor='otherCosts' className='text-xs'>
                      Biaya Lainnya ({currencySymbol})
                    </Label>
                    <Input
                      id='otherCosts'
                      type='number'
                      {...poForm.register('otherCosts')}
                      className='h-9 text-xs mt-1'
                      placeholder='0'
                    />
                    {poForm.formState.errors.otherCosts && (
                      <p className='text-xs text-destructive mt-1'>
                        {poForm.formState.errors.otherCosts.message}
                      </p>
                    )}
                  </div>
                </div>
                <Separator />

                <div>
                  <Label htmlFor='notes' className='text-xs'>
                    Catatan (Opsional)
                  </Label>
                  <Textarea
                    id='notes'
                    {...poForm.register('notes')}
                    className='text-xs mt-1 min-h-[60px]'
                    placeholder='Catatan tambahan untuk pesanan ini'
                  />
                </div>
              </CardContent>
            </Card>

            <Card className='mt-4'>
              <CardHeader>
                <div className='flex justify-between items-center'>
                  <CardTitle className='text-base'>Item Pesanan</CardTitle>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='text-xs h-8'
                    onClick={() =>
                      append({
                        productId: '',
                        productName: '',
                        orderedQuantity: 1,
                        purchasePrice: 0,
                      })
                    }
                    disabled={loadingInventory}
                  >
                    <PlusCircle className='mr-1.5 h-3.5 w-3.5' /> Tambah Item
                  </Button>
                </div>
                {poForm.formState.errors.items &&
                  !poForm.formState.errors.items.root && (
                    <p className='text-xs text-destructive mt-1'>
                      {poForm.formState.errors.items.message}
                    </p>
                  )}
                {poForm.formState.errors.items?.root && (
                  <p className='text-xs text-destructive mt-1'>
                    {poForm.formState.errors.items.root.message}
                  </p>
                )}
              </CardHeader>
              <CardContent className='space-y-3'>
                {fields.map((field, index) => {
                  const filteredProducts = inventoryItems
                  const selectedProductValue = poForm.watch(
                    `items.${index}.productId`
                  )
                  const currentSelectedProduct = inventoryItems.find(
                    (p) => p.id === selectedProductValue
                  )
                  return (
                    <div
                      key={field.id}
                      className='grid grid-cols-12 gap-2 items-start p-2.5 border rounded-md bg-muted/30'
                    >
                      <div className='col-span-12 sm:col-span-4'>
                        <Label
                          htmlFor={`items.${index}.productId`}
                          className='text-xs'
                        >
                          Produk*
                        </Label>
                        <Controller
                          name={`items.${index}.productId`}
                          control={poForm.control}
                          render={({ field: controllerField }) => (
                            <Popover
                              open={openProductPopovers[index] || false}
                              onOpenChange={(open) =>
                                handleProductPopoverOpenChange(index, open)
                              }
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant='outline'
                                  role='combobox'
                                  aria-expanded={
                                    openProductPopovers[index] || false
                                  }
                                  className='w-full justify-between h-8 text-xs mt-0.5 font-normal'
                                  disabled={
                                    loadingInventory ||
                                    inventoryItems.length === 0
                                  }
                                >
                                  {currentSelectedProduct ? (
                                    <span className='truncate max-w-[calc(100%-20px)]'>
                                      {currentSelectedProduct.name}
                                    </span>
                                  ) : loadingInventory ? (
                                    'Memuat...'
                                  ) : inventoryItems.length === 0 ? (
                                    'Tidak ada produk'
                                  ) : (
                                    'Pilih produk'
                                  )}
                                  <ChevronsUpDown className='ml-2 h-3.5 w-3.5 shrink-0 opacity-50' />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className='w-[--radix-popover-trigger-width] p-0'>
                                <Command shouldFilter={false}>
                                  <CommandInput
                                    placeholder='Cari produk (nama/SKU)...'
                                    value={searchTerm}
                                    onValueChange={(value) =>
                                      setSearchTerm(value)
                                    }
                                    className='h-9 text-xs'
                                  />
                                  <CommandEmpty className='p-2 text-xs text-center'>
                                    {loadingInventory
                                      ? 'Memuat...'
                                      : 'Produk tidak ditemukan.'}
                                  </CommandEmpty>
                                  <CommandList>
                                    <CommandGroup>
                                      {filteredProducts.map((product) => (
                                        <CommandItem
                                          key={product.id}
                                          value={product.id}
                                          onSelect={(currentValue) => {
                                            controllerField.onChange(
                                              currentValue
                                            )
                                            const selectedProd =
                                              inventoryItems.find(
                                                (p) => p.id === currentValue
                                              )
                                            poForm.setValue(
                                              `items.${index}.productName`,
                                              selectedProd?.name || ''
                                            )
                                            poForm.setValue(
                                              `items.${index}.purchasePrice`,
                                              selectedProd?.costPrice || 0
                                            )
                                            handleProductPopoverOpenChange(
                                              index,
                                              false
                                            )
                                          }}
                                          className='text-xs'
                                        >
                                          <CheckCircle
                                            className={cn(
                                              'mr-2 h-3.5 w-3.5',
                                              controllerField.value ===
                                                product.id
                                                ? 'opacity-100'
                                                : 'opacity-0'
                                            )}
                                          />
                                          <div className='flex items-center gap-2'>
                                            <Package className='h-3.5 w-3.5 text-muted-foreground' />
                                            <span className='truncate'>
                                              {product.name}
                                            </span>
                                            <span className='text-muted-foreground'>
                                              (Stok: {product.quantity})
                                            </span>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          )}
                        />
                        {poForm.formState.errors.items?.[index]?.productId && (
                          <p className='text-xs text-destructive mt-0.5'>
                            {
                              poForm.formState.errors.items?.[index]?.productId
                                ?.message
                            }
                          </p>
                        )}
                      </div>
                      <div className='col-span-6 sm:col-span-2'>
                        <Label
                          htmlFor={`items.${index}.orderedQuantity`}
                          className='text-xs'
                        >
                          Jumlah*
                        </Label>
                        <Input
                          id={`items.${index}.orderedQuantity`}
                          type='number'
                          {...poForm.register(`items.${index}.orderedQuantity`)}
                          className='h-8 text-xs mt-0.5'
                        />
                        {poForm.formState.errors.items?.[index]
                          ?.orderedQuantity && (
                          <p className='text-xs text-destructive mt-0.5'>
                            {
                              poForm.formState.errors.items?.[index]
                                ?.orderedQuantity?.message
                            }
                          </p>
                        )}
                      </div>
                      <div className='col-span-6 sm:col-span-3'>
                        <Label
                          htmlFor={`items.${index}.purchasePrice`}
                          className='text-xs'
                        >
                          Harga Beli ({currencySymbol})*
                        </Label>
                        <Input
                          id={`items.${index}.purchasePrice`}
                          type='number'
                          {...poForm.register(`items.${index}.purchasePrice`)}
                          className='h-8 text-xs mt-0.5'
                        />
                        {poForm.formState.errors.items?.[index]
                          ?.purchasePrice && (
                          <p className='text-xs text-destructive mt-0.5'>
                            {
                              poForm.formState.errors.items?.[index]
                                ?.purchasePrice?.message
                            }
                          </p>
                        )}
                      </div>
                      <div className='col-span-9 sm:col-span-2'>
                        <Label className='text-xs block mb-0.5'>
                          Total Item
                        </Label>
                        <Input
                          value={`${formatCurrency(
                            (Number(
                              poForm.watch(`items.${index}.orderedQuantity`)
                            ) || 0) *
                              (Number(
                                poForm.watch(`items.${index}.purchasePrice`)
                              ) || 0)
                          )}`}
                          className='h-8 text-xs mt-0.5 bg-transparent border-0 px-0'
                          readOnly
                          tabIndex={-1}
                        />
                      </div>
                      <div className='col-span-3 sm:col-span-1 flex items-end justify-end'>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8 text-destructive hover:text-destructive/80'
                          onClick={() => remove(index)}
                          disabled={fields.length <= 1}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
              <CardFooter className='flex flex-col items-end p-3 border-t space-y-1'>
                <div className='text-xs'>
                  Subtotal Item:{' '}
                  <span className='font-semibold'>
                    {currencySymbol}
                    {formatCurrency(itemsSubtotal)}
                  </span>
                </div>
                {taxDiscountAmount > 0 && (
                  <div className='text-xs text-green-600'>
                    (-) Diskon Pajak:{' '}
                    <span className='font-semibold'>
                      {currencySymbol}
                      {formatCurrency(taxDiscountAmount)}
                    </span>
                  </div>
                )}
                {shippingCostCharged > 0 && (
                  <div className='text-xs text-destructive'>
                    (+) Ongkos Kirim:{' '}
                    <span className='font-semibold'>
                      {formatCurrency(shippingCostCharged)}
                    </span>
                  </div>
                )}
                {otherCosts > 0 && (
                  <div className='text-xs text-destructive'>
                    (+) Biaya Lainnya:{' '}
                    <span className='font-semibold'>
                      {formatCurrency(otherCosts)}
                    </span>
                  </div>
                )}
                <Separator className='my-1' />
                <div className='text-base font-bold'>
                  Total Pesanan:{' '}
                  <span className='font-semibold'>
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </CardFooter>
            </Card>

            <div className='mt-6 flex justify-end'>
              <Button
                type='submit'
                className='text-sm'
                disabled={
                  poForm.formState.isSubmitting ||
                  loadingInventory ||
                  loadingSuppliers
                }
              >
                {poForm.formState.isSubmitting
                  ? 'Menyimpan...'
                  : 'Simpan Pesanan sebagai Draft'}
              </Button>
            </div>
          </form>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
