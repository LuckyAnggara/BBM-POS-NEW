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
import { useBranches } from '@/contexts/branch-context'
import { toast } from 'sonner'

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
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// Tipe dan Fungsi Appwrite
import type { Supplier, Product, PurchaseOrderInput } from '@/lib/types'
import { listSuppliers } from '@/lib/laravel/suppliers'
import { listProducts } from '@/lib/laravel/product' // Asumsi fungsi ini mengembalikan { documents, total }
import { createPurchaseOrder } from '@/lib/laravel/purchaseOrderService'
import { useDebounce } from '@uidotdev/usehooks'
import { formatCurrency } from '@/lib/helper'

// --- Skema Validasi (Zod) ---
// Skema untuk satu item dalam form, ini adalah data mentah dari UI
const formItemSchema = z.object({
  product_id: z.string().min(1, 'Produk harus dipilih.'),
  product_name: z.string(), // Nama produk untuk display sementara
  quantity: z.coerce.number().positive('Jumlah harus lebih dari 0.'),
  cost: z.coerce.number().min(0, 'Harga beli tidak boleh negatif.'),
})

// Skema untuk keseluruhan form PO
const purchaseOrderFormSchema = z
  .object({
    supplier_id: z.string().min(1, 'Pemasok harus dipilih.'),
    order_date: z.date({ required_error: 'Tanggal pemesanan harus diisi.' }),
    expected_delivery_date: z.date().optional(),
    items: z
      .array(formItemSchema)
      .min(1, 'Minimal satu item harus ditambahkan.'),
    notes: z.string().optional(),
    payment_terms: z
      .enum(['cash', 'credit'], {
        required_error: 'Termin pembayaran harus dipilih.',
      })
      .default('cash'),
    supplier_invoice_number: z.string().optional(),
    payment_due_date: z.date().optional(),
    tax_discount_amount: z.coerce.number().default(0), // actually used as discount amount
    shipping_cost_charged: z.coerce.number().default(0),
    tax_amount: z.coerce.number().default(0),
    tax_type: z.enum(['amount', 'percent']).default('amount'),
    other_costs: z.coerce.number().default(0),
  })
  .refine(
    (data) => {
      if (data.payment_terms === 'credit' && !data.payment_due_date) {
        return false // Gagal validasi jika kredit tapi tidak ada tanggal jatuh tempo
      }
      return true
    },
    {
      message: 'Tanggal jatuh tempo harus diisi untuk termin kredit.',
      path: ['payment_due_date'], // Tunjukkan error pada field ini
    }
  )

// Tipe yang dihasilkan dari skema Zod untuk digunakan di form
type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>

export default function NewPurchaseOrderPage() {
  const { currentUser } = useAuth()
  const { selectedBranch } = useBranches()
  const router = useRouter()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [inventoryItems, setInventoryItems] = useState<Product[]>([])

  const [loading, setLoading] = useState(true)
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [loadingInventory, setLoadingInventory] = useState(true)

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  )

  const [searchTerm, setSearchTerm] = useState('')
  const [searchSupplierTerm, setSearchSupplierTerm] = useState('')
  const [openProductPopovers, setOpenProductPopovers] = useState<
    Record<number, boolean>
  >({})

  const debouncedSearchTerm = useDebounce(searchTerm, 500)
  const debouncedSupplierSearchTerm = useDebounce(searchSupplierTerm, 500)

  const poForm = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: {
      order_date: new Date(),
      items: [
        {
          product_id: '',
          product_name: '',
          quantity: 1,
          cost: 0,
        },
      ],
      payment_terms: 'cash',
      tax_discount_amount: 0,
      shipping_cost_charged: 0,
      tax_amount: 0,
      tax_type: 'amount',
      other_costs: 0,
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
    setLoadingInventory(true)
    try {
      const [suppliersResult, inventoryResult] = await Promise.all([
        listSuppliers({ branchId: selectedBranch.id, limit: 5 }),
        listProducts({ branchId: selectedBranch.id, limit: 5 }), // Ambil semua item untuk pencarian
      ])
      setSuppliers(suppliersResult.data || [])
      setInventoryItems(inventoryResult.data || [])
    } catch (error) {
      toast.error('Gagal Memuat Data', {
        description: 'Tidak dapat memuat data pemasok atau inventaris.',
      })
    } finally {
      setLoading(false)
      setLoadingSuppliers(false)
      setLoadingInventory(false)
    }
  }, [selectedBranch, toast])

  const fetchSuppliers = useCallback(
    async (currentSearchTerm: string) => {
      if (!selectedBranch) {
        setSuppliers([])
        setLoadingSuppliers(false)
        return
      }
      setLoadingSuppliers(true)
      const result = await listSuppliers({
        branchId: selectedBranch.id,
        limit: 5,
        searchTerm: debouncedSupplierSearchTerm,
      })
      setSuppliers(result.data)
      setLoadingSuppliers(false)
    },
    [selectedBranch, debouncedSupplierSearchTerm]
  )

  const fetchInventoryData = useCallback(
    async (currentSearchTerm: string) => {
      if (!selectedBranch) return
      setLoadingInventory(true)
      try {
        const [inventoryResult] = await Promise.all([
          listProducts({
            branchId: selectedBranch.id,
            limit: 5,
            searchTerm: currentSearchTerm,
          }), // Ambil semua item untuk pencarian
        ])
        setInventoryItems(inventoryResult.data || [])
      } finally {
        setLoadingInventory(false)
      }
    },
    [debouncedSearchTerm]
  )

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  useEffect(() => {
    fetchSuppliers(debouncedSupplierSearchTerm)
  }, [debouncedSupplierSearchTerm])

  useEffect(() => {
    fetchInventoryData(debouncedSearchTerm)
  }, [debouncedSearchTerm])

  const onSubmitPurchaseOrder: SubmitHandler<PurchaseOrderFormValues> = async (
    values
  ) => {
    if (!selectedBranch || !currentUser) {
      toast.error('Cabang atau pengguna tidak valid.')
      return
    }
    const formatDate = (d?: Date) => (d ? format(d, 'yyyy-MM-dd') : undefined)
    const rawSubtotal = values.items.reduce(
      (acc, item) => acc + Number(item.quantity || 0) * Number(item.cost || 0),
      0
    )
    const discount = Number(values.tax_discount_amount || 0)
    const taxableBase = Math.max(0, rawSubtotal - discount)
    const finalTax =
      (values.tax_type || 'amount') === 'percent'
        ? Math.max(0, (taxableBase * Number(values.tax_amount || 0)) / 100)
        : Number(values.tax_amount || 0)
    const poInputData: PurchaseOrderInput = {
      branch_id: selectedBranch.id,
      is_credit: values.payment_terms === 'credit',
      supplier_id: Number(values.supplier_id),
      order_date: formatDate(values.order_date)!,
      expected_delivery_date: formatDate(values.expected_delivery_date) || null,
      notes: values.notes || '',
      payment_terms: values.payment_terms,
      supplier_invoice_number: values.supplier_invoice_number || undefined,
      payment_due_date:
        values.payment_terms === 'credit'
          ? formatDate(values.payment_due_date)
          : undefined,
      tax_discount_amount: discount,
      shipping_cost_charged: Number(values.shipping_cost_charged || 0),
      tax_amount: finalTax,
      other_costs: Number(values.other_costs || 0),
      items: values.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        cost: item.cost,
      })),
      status: 'pending',
    }
    try {
      setLoading(true)
      const result = await createPurchaseOrder(poInputData)
      toast.success(
        `Pesanan Pembelian Dibuat! PO ${result.po_number} berhasil disimpan.`
      )
      router.push('/purchase-orders')
    } catch (error: any) {
      toast.error(`Gagal Membuat Pesanan: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleProductPopoverOpenChange = (index: number, open: boolean) => {
    setOpenProductPopovers((prev) => ({ ...prev, [index]: open }))
  }

  // --- Kalkulasi Total untuk Ditampilkan di UI ---
  const watchedItems = poForm.watch('items')
  const itemsSubtotal = watchedItems.reduce((acc, item) => {
    const quantity = Number(item.quantity) || 0
    const price = Number(item.cost) || 0
    return acc + quantity * price
  }, 0)

  // Discount (was tax_discount_amount)
  const tax_discount_amount = Number(poForm.watch('tax_discount_amount')) || 0
  const shipping_cost_charged =
    Number(poForm.watch('shipping_cost_charged')) || 0
  const tax_amount_input = Number(poForm.watch('tax_amount')) || 0
  const tax_type = poForm.watch('tax_type') || 'amount'
  const other_costs = Number(poForm.watch('other_costs')) || 0
  // Taxable base is (items subtotal minus discount)
  const taxableBase = Math.max(0, itemsSubtotal - Number(tax_discount_amount))
  const computedTax =
    tax_type === 'percent'
      ? (taxableBase * tax_amount_input) / 100
      : tax_amount_input
  const totalAmount =
    taxableBase +
    Number(shipping_cost_charged) +
    Number(computedTax) +
    Number(other_costs)
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
                    <Label htmlFor='supplier_id' className='text-xs'>
                      Pemasok*
                    </Label>
                    <Controller
                      name='supplier_id'
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
                                value={String(s.id)}
                                className='text-xs'
                              >
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {poForm.formState.errors.supplier_id && (
                      <p className='text-xs text-destructive mt-1'>
                        {poForm.formState.errors.supplier_id.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor='order_date' className='text-xs'>
                      Tanggal Pemesanan*
                    </Label>
                    <Controller
                      name='order_date'
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
                    {poForm.formState.errors.order_date && (
                      <p className='text-xs text-destructive mt-1'>
                        {poForm.formState.errors.order_date.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor='expected_delivery_date' className='text-xs'>
                      Estimasi Tgl Terima
                    </Label>
                    <Controller
                      name='expected_delivery_date'
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
                                poForm.getValues('order_date')
                                  ? date < poForm.getValues('order_date')
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
                    <Label htmlFor='payment_terms' className='text-xs'>
                      Termin Pembayaran*
                    </Label>
                    <Controller
                      name='payment_terms'
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
                    {poForm.formState.errors.payment_terms && (
                      <p className='text-xs text-destructive mt-1'>
                        {poForm.formState.errors.payment_terms.message}
                      </p>
                    )}
                  </div>
                  {poForm.watch('payment_terms') === 'credit' && (
                    <>
                      <div>
                        <Label
                          htmlFor='supplier_invoice_number'
                          className='text-xs'
                        >
                          No. Invoice Pemasok
                        </Label>
                        <Input
                          id='supplier_invoice_number'
                          {...poForm.register('supplier_invoice_number')}
                          className='h-9 text-xs mt-1'
                          placeholder='Opsional'
                        />
                      </div>
                      <div>
                        <Label htmlFor='payment_due_date' className='text-xs'>
                          Tgl Jatuh Tempo Bayar*
                        </Label>
                        <Controller
                          name='payment_due_date'
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
                                    poForm.getValues('order_date')
                                      ? date < poForm.getValues('order_date')
                                      : false
                                  }
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                        />
                        {poForm.formState.errors.payment_due_date && (
                          <p className='text-xs text-destructive mt-1'>
                            {poForm.formState.errors.payment_due_date.message}
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
                    <Label htmlFor='shipping_cost_charged' className='text-xs'>
                      Ongkos Kirim Dibebankan ({currencySymbol})
                    </Label>
                    <Input
                      id='shipping_cost_charged'
                      type='number'
                      {...poForm.register('shipping_cost_charged')}
                      className='h-9 text-xs mt-1'
                      placeholder='0'
                    />
                    {poForm.formState.errors.shipping_cost_charged && (
                      <p className='text-xs text-destructive mt-1'>
                        {poForm.formState.errors.shipping_cost_charged.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor='tax_discount_amount' className='text-xs'>
                      Diskon ({currencySymbol})
                    </Label>
                    <Input
                      id='tax_discount_amount'
                      type='number'
                      {...poForm.register('tax_discount_amount')}
                      className='h-9 text-xs mt-1'
                      placeholder='0'
                    />
                    {poForm.formState.errors.tax_discount_amount && (
                      <p className='text-xs text-destructive mt-1'>
                        {poForm.formState.errors.tax_discount_amount.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor='tax_amount' className='text-xs'>
                      Pajak{' '}
                      {tax_type === 'percent' ? '(%)' : `(${currencySymbol})`}
                    </Label>
                    <div className='flex gap-2 mt-1'>
                      <div className='flex-1'>
                        <Input
                          id='tax_amount'
                          type='number'
                          step={tax_type === 'percent' ? '0.01' : '1'}
                          {...poForm.register('tax_amount')}
                          className='h-9 text-xs'
                          placeholder={
                            tax_type === 'percent'
                              ? '0 (mis. 11 untuk 11%)'
                              : '0'
                          }
                        />
                      </div>
                      <div className='w-32'>
                        <Controller
                          name='tax_type'
                          control={poForm.control}
                          render={({ field }) => (
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <SelectTrigger className='h-9 text-xs'>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='amount' className='text-xs'>
                                  Nominal
                                </SelectItem>
                                <SelectItem value='percent' className='text-xs'>
                                  Persentase
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>
                    {tax_type === 'percent' && (
                      <p className='text-[11px] text-muted-foreground mt-1'>
                        Nilai pajak dihitung dari subtotal setelah diskon.
                      </p>
                    )}
                    {poForm.formState.errors.tax_amount && (
                      <p className='text-xs text-destructive mt-1'>
                        {poForm.formState.errors.tax_amount.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor='other_costs' className='text-xs'>
                      Biaya Lainnya ({currencySymbol})
                    </Label>
                    <Input
                      id='other_costs'
                      type='number'
                      {...poForm.register('other_costs')}
                      className='h-9 text-xs mt-1'
                      placeholder='0'
                    />
                    {poForm.formState.errors.other_costs && (
                      <p className='text-xs text-destructive mt-1'>
                        {poForm.formState.errors.other_costs.message}
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
                        product_id: '',
                        product_name: '',
                        quantity: 1,
                        cost: 0,
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
                    `items.${index}.product_id`
                  )
                  const currentSelectedProduct = inventoryItems.find(
                    (p) => String(p.id) === String(selectedProductValue)
                  )
                  return (
                    <div
                      key={field.id}
                      className='grid grid-cols-12 gap-3 items-start p-2.5 border rounded-md bg-muted/30'
                    >
                      <div className='col-span-12 sm:col-span-4'>
                        <Label
                          htmlFor={`items.${index}.product_id`}
                          className='text-xs'
                        >
                          Produk*
                        </Label>
                        <Controller
                          name={`items.${index}.product_id`}
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
                                          value={String(product.id)}
                                          onSelect={(currentValue) => {
                                            controllerField.onChange(
                                              currentValue
                                            )
                                            const selectedProd =
                                              inventoryItems.find(
                                                (p) =>
                                                  String(p.id) ===
                                                  String(currentValue)
                                              )
                                            poForm.setValue(
                                              `items.${index}.product_name`,
                                              selectedProd?.name || ''
                                            )
                                            poForm.setValue(
                                              `items.${index}.cost`,
                                              selectedProd?.cost_price || 0
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
                                              String(controllerField.value) ===
                                                String(product.id)
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
                        {poForm.formState.errors.items?.[index]?.product_id && (
                          <p className='text-xs text-destructive mt-0.5'>
                            {
                              poForm.formState.errors.items?.[index]?.product_id
                                ?.message
                            }
                          </p>
                        )}
                      </div>
                      <div className='col-span-6 sm:col-span-2'>
                        <Label
                          htmlFor={`items.${index}.quantity`}
                          className='text-xs'
                        >
                          Jumlah*
                        </Label>
                        <Input
                          id={`items.${index}.quantity`}
                          type='number'
                          {...poForm.register(`items.${index}.quantity`)}
                          className='h-8 text-xs mt-0.5'
                        />
                        {poForm.formState.errors.items?.[index]?.quantity && (
                          <p className='text-xs text-destructive mt-0.5'>
                            {
                              poForm.formState.errors.items?.[index]?.quantity
                                ?.message
                            }
                          </p>
                        )}
                      </div>
                      <div className='col-span-6 sm:col-span-3'>
                        <Label
                          htmlFor={`items.${index}.cost`}
                          className='text-xs'
                        >
                          Harga Beli ({currencySymbol})*
                        </Label>
                        <Input
                          id={`items.${index}.cost`}
                          type='number'
                          {...poForm.register(`items.${index}.cost`)}
                          className='h-8 text-xs mt-0.5'
                        />
                        {poForm.formState.errors.items?.[index]?.cost && (
                          <p className='text-xs text-destructive mt-0.5'>
                            {
                              poForm.formState.errors.items?.[index]?.cost
                                ?.message
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
                            (Number(poForm.watch(`items.${index}.quantity`)) ||
                              0) *
                              (Number(poForm.watch(`items.${index}.cost`)) || 0)
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
                {tax_discount_amount > 0 && (
                  <div className='text-xs text-green-600'>
                    (-) Diskon:{' '}
                    <span className='font-semibold'>
                      {currencySymbol}
                      {formatCurrency(tax_discount_amount)}
                    </span>
                  </div>
                )}
                {shipping_cost_charged > 0 && (
                  <div className='text-xs text-destructive'>
                    (+) Ongkos Kirim:{' '}
                    <span className='font-semibold'>
                      {formatCurrency(shipping_cost_charged)}
                    </span>
                  </div>
                )}
                {computedTax > 0 && (
                  <div className='text-xs text-destructive'>
                    (+) Pajak
                    {tax_type === 'percent'
                      ? ` (${tax_amount_input}%)`
                      : ''}:{' '}
                    <span className='font-semibold'>
                      {formatCurrency(computedTax)}
                    </span>
                  </div>
                )}
                {other_costs > 0 && (
                  <div className='text-xs text-destructive'>
                    (+) Biaya Lainnya:{' '}
                    <span className='font-semibold'>
                      {formatCurrency(other_costs)}
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
