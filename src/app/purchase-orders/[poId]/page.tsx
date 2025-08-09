'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/auth-context'
import { useBranches } from '@/contexts/branch-context'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle as DialogModalTitle,
  DialogDescription as DialogModalDescription,
  DialogFooter as DialogModalFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import type {
  PurchaseOrder,
  PurchaseOrderItemDocument,
  PurchaseOrderStatus,
  ReceivedItemData,
  PurchaseOrderPaymentStatus,
  SupplierPaymentDocument,
} from '@/lib/appwrite/purchaseOrders'
import {
  getPurchaseOrderById,
  receivePurchaseOrderItems,
  recordPaymentToSupplier,
  updatePaymentToSupplier,
  deletePaymentToSupplier,
  updatePurchaseOrderStatus,
} from '@/lib/appwrite/purchaseOrders'
import { format, isBefore, startOfDay } from 'date-fns'
import Link from 'next/link'
import {
  ArrowLeft,
  Printer,
  PackageCheck,
  PackageX,
  DollarSign,
  CalendarIcon,
  Hash,
  Truck,
  CalendarCheck,
  Clock,
  FileText,
  CalendarClock,
  User,
  NotebookText,
  Edit,
  Trash2,
  CheckCircle,
} from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import {
  useForm,
  useFieldArray,
  Controller,
  type SubmitHandler,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
// import { Calendar } from '@/components/ui/calendar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const receiveItemSchema = z.object({
  purchaseOrderItemId: z.string(),
  productId: z.string(),
  productName: z.string(),
  orderedQuantity: z.number(),
  alreadyReceivedQuantity: z.number(),
  purchasePrice: z.number(),
  quantityReceivedNow: z.coerce
    .number()
    .min(0, 'Jumlah tidak boleh negatif.')
    .max(99999, 'Jumlah terlalu besar.'),
})

const receiveFormSchema = z.object({
  itemsToReceive: z
    .array(receiveItemSchema)
    .refine((items) => items.some((item) => item.quantityReceivedNow > 0), {
      message: 'Minimal satu item harus memiliki jumlah diterima lebih dari 0.',
    })
    .refine(
      (items) =>
        items.every(
          (item) =>
            item.quantityReceivedNow <=
            item.orderedQuantity - item.alreadyReceivedQuantity
        ),
      {
        message:
          'Jumlah diterima tidak boleh melebihi sisa yang belum diterima untuk satu atau lebih item.',
      }
    ),
})
type ReceiveFormValues = z.infer<typeof receiveFormSchema>

const paymentToSupplierFormSchema = z.object({
  paymentDate: z.date({ required_error: 'Tanggal pembayaran harus diisi.' }),
  amountPaid: z.coerce
    .number()
    .positive({ message: 'Jumlah bayar harus lebih dari 0.' }),
  paymentMethod: z.enum(['cash', 'transfer', 'card', 'other'], {
    required_error: 'Metode pembayaran harus dipilih.',
  }),
  notes: z.string().optional(),
})
type PaymentToSupplierFormValues = z.infer<typeof paymentToSupplierFormSchema>

const editPaymentToSupplierFormSchema = z.object({
  paymentId: z.string(),
  paymentDate: z.date({ required_error: 'Tanggal pembayaran harus diisi.' }),
  amountPaid: z.coerce
    .number()
    .positive({ message: 'Jumlah bayar harus lebih dari 0.' }),
  paymentMethod: z.enum(['cash', 'transfer', 'card', 'other'], {
    required_error: 'Metode pembayaran harus dipilih.',
  }),
  notes: z.string().optional(),
})
type EditPaymentToSupplierFormValues = z.infer<
  typeof editPaymentToSupplierFormSchema
>

const changeStatusFormSchema = z.object({
  newStatus: z.enum(['ordered', 'cancelled'], {
    required_error: 'Status harus dipilih.',
  }),
})
type ChangeStatusFormValues = z.infer<typeof changeStatusFormSchema>

// const getPaymentStatusBadgeVariant = (status: PurchaseOrderPaymentStatus | undefined) => {

export default function PurchaseOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const poId = params.poId as string

  const { currentUser } = useAuth()
  const { selectedBranch } = useBranches()

  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [loadingPO, setLoadingPO] = useState(true)
  const [isReceivingItemsModalOpen, setIsReceivingItemsModalOpen] =
    useState(false)
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false)

  const [isPaymentToSupplierModalOpen, setIsPaymentToSupplierModalOpen] =
    useState(false)
  const [isProcessingPaymentToSupplier, setIsProcessingPaymentToSupplier] =
    useState(false)
  const [isProcessingChangeStatus, setIsProcessingChangeStatus] =
    useState(false)
  const [isChangeStatusModalOpen, setIsChangeStatusModalOpen] = useState(false)

  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false)
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] =
    useState(false)
  const [selectedPaymentForEdit, setSelectedPaymentForEdit] =
    useState<SupplierPaymentDocument | null>(null)
  const [selectedPaymentForDelete, setSelectedPaymentForDelete] =
    useState<SupplierPaymentDocument | null>(null)
  const [isProcessingDelete, setIsProcessingDelete] = useState(false)

  const paymentToSupplierForm = useForm<PaymentToSupplierFormValues>({
    resolver: zodResolver(paymentToSupplierFormSchema),
    defaultValues: {
      paymentDate: new Date(),
      amountPaid: 0,
      paymentMethod: 'transfer',
      notes: '',
    },
  })

  const editPaymentToSupplierForm = useForm<EditPaymentToSupplierFormValues>({
    resolver: zodResolver(editPaymentToSupplierFormSchema),
  })

  const receiveItemsForm = useForm<ReceiveFormValues>({
    resolver: zodResolver(receiveFormSchema),
    defaultValues: {
      itemsToReceive: [],
    },
  })

  const changeStatusForm = useForm<ChangeStatusFormValues>({
    resolver: zodResolver(changeStatusFormSchema),
  })

  const { fields: receiveFields, replace: replaceReceiveFields } =
    useFieldArray({
      control: receiveItemsForm.control,
      name: 'itemsToReceive',
    })

  const fetchPurchaseOrder = useCallback(async () => {
    if (!poId) {
      setLoadingPO(false)
      toast.error('Error', {
        description: 'ID Pesanan Pembelian tidak valid.',
      })
      router.push('/purchase-orders')
      return
    }
    setLoadingPO(true)
    try {
      const fetchedPO = await getPurchaseOrderById(poId)
      if (fetchedPO) {
        setPurchaseOrder(fetchedPO)
        const itemsForForm = fetchedPO.items
          .filter((item) => item.orderedQuantity > item.receivedQuantity)
          .map((item) => ({
            purchaseOrderItemId: item.$id,
            productId: item.productId,
            productName: item.productName,
            orderedQuantity: item.orderedQuantity,
            alreadyReceivedQuantity: item.receivedQuantity,
            purchasePrice: item.purchasePrice,
            quantityReceivedNow: 0,
          }))
        replaceReceiveFields(itemsForForm)

        if (fetchedPO.isCreditPurchase && fetchedPO.outstandingPOAmount) {
          paymentToSupplierForm.reset({
            paymentDate: new Date(),
            amountPaid: fetchedPO.outstandingPOAmount,
            paymentMethod: 'transfer',
            notes: '',
          })
        }
      } else {
        toast.error('Tidak Ditemukan', {
          description: 'Pesanan Pembelian tidak ditemukan.',
        })
        router.push('/purchase-orders')
      }
    } catch (error) {
      toast.error('Gagal Memuat', {
        description: 'Gagal memuat detail pesanan pembelian.',
      })
    } finally {
      setLoadingPO(false)
    }
  }, [poId, toast, router, replaceReceiveFields, paymentToSupplierForm])

  useEffect(() => {
    fetchPurchaseOrder()
  }, [fetchPurchaseOrder])

  const onSubmitReceiveItems: SubmitHandler<ReceiveFormValues> = async (
    values
  ) => {
    if (!purchaseOrder || !currentUser) return

    const itemsToProcess: ReceivedItemData[] = values.itemsToReceive
      .filter((item) => item.quantityReceivedNow > 0)
      .map((item) => ({
        purchaseOrderItemId: item.purchaseOrderItemId,
        productId: item.productId,
        productName: item.productName,
        quantityReceivedNow: item.quantityReceivedNow,
      }))

    if (itemsToProcess.length === 0) {
      toast.error('Tidak ada item diterima', {
        description: 'Masukkan jumlah untuk setidaknya satu item.',
      })
      return
    }

    setIsProcessingReceipt(true)
    const result = await receivePurchaseOrderItems({
      poId: purchaseOrder.$id,
      poBranchId: purchaseOrder.branchId,
      poNumber: purchaseOrder.poNumber,
      itemsReceived: itemsToProcess,
      receivedByUserId: currentUser.$id,
      receivedByUserName: currentUser.name,
    })
    setIsProcessingReceipt(false)

    if (result && 'error' in result) {
      toast.error('Gagal Menerima Barang', {
        description: result.error,
      })
    } else {
      toast.success('Penerimaan Barang Berhasil', {
        description: 'Stok dan status PO telah diperbarui.',
      })
      setIsReceivingItemsModalOpen(false)
      await fetchPurchaseOrder()
    }
  }

  const onSubmitPaymentToSupplier: SubmitHandler<
    PaymentToSupplierFormValues
  > = async (values) => {
    if (!purchaseOrder || !currentUser) {
      toast.error('Pesanan Pembelian atau pengguna tidak valid.', {
        description: 'Pesanan Pembelian atau pengguna tidak valid.',
      })
      return
    }
    if (values.amountPaid > (purchaseOrder.outstandingPOAmount || 0)) {
      toast.error('Jumlah Tidak Valid', {
        description: 'Jumlah bayar melebihi sisa tagihan.',
      })

      paymentToSupplierForm.setError('amountPaid', {
        type: 'manual',
        message: 'Jumlah bayar melebihi sisa tagihan.',
      })
      return
    }

    const paymentDetails: Omit<
      SupplierPaymentDocument,
      '$id' | 'poId' | 'branchId' | 'supplierId'
    > = {
      amountPaid: values.amountPaid,
      paymentMethod: values.paymentMethod,
      notes: values.notes,
      paymentDate: values.paymentDate.toISOString(),
      recordedByUserId: currentUser.$id,
    }

    setIsProcessingPaymentToSupplier(true)
    const result = await recordPaymentToSupplier(
      purchaseOrder.$id,
      paymentDetails
    )
    setIsProcessingPaymentToSupplier(false)

    if (result && 'error' in result) {
      toast.error('Gagal Mencatat Pembayaran', {
        description: result.error,
      })
    } else {
      toast.success('Pembayaran Dicatat', {
        description: `Pembayaran untuk PO ${purchaseOrder.poNumber} berhasil dicatat.`,
      })
      setIsPaymentToSupplierModalOpen(false)
      await fetchPurchaseOrder()
    }
  }

  const handleEditPayment = (payment: SupplierPaymentDocument) => {
    setSelectedPaymentForEdit(payment)
    editPaymentToSupplierForm.reset({
      paymentId: payment.$id,
      paymentDate: new Date(payment.paymentDate),
      amountPaid: payment.amountPaid,
      paymentMethod: payment.paymentMethod,
      notes: payment.notes || '',
    })
    setIsEditPaymentModalOpen(true)
  }

  const handleDeletePayment = (payment: SupplierPaymentDocument) => {
    setSelectedPaymentForDelete(payment)
    setIsDeleteConfirmModalOpen(true)
  }

  const confirmDeletePayment = async () => {
    if (!selectedPaymentForDelete || !purchaseOrder) return

    setIsProcessingDelete(true)
    const result = await deletePaymentToSupplier(
      purchaseOrder.$id,
      selectedPaymentForDelete.$id
    )
    setIsProcessingDelete(false)

    if (result && 'error' in result) {
      toast.error('Gagal Menghapus Pembayaran', {
        description: result.error,
      })
    } else {
      toast.success('Pembayaran Dihapus', {
        description: 'Riwayat pembayaran telah diperbarui.',
      })
      setIsDeleteConfirmModalOpen(false)
      setSelectedPaymentForDelete(null)
      await fetchPurchaseOrder()
    }
  }

  const onSubmitEditPayment: SubmitHandler<
    EditPaymentToSupplierFormValues
  > = async (values) => {
    if (!purchaseOrder || !currentUser || !selectedPaymentForEdit) return

    const originalAmount = selectedPaymentForEdit.amountPaid
    const newAmount = values.amountPaid
    const difference = newAmount - originalAmount
    const newOutstandingAmount =
      (purchaseOrder.outstandingPOAmount || 0) - difference

    if (newOutstandingAmount < 0) {
      toast.error('Jumlah Tidak Valid', {
        description: `Jumlah bayar baru akan membuat total bayar melebihi total tagihan.`,
      })
      editPaymentToSupplierForm.setError('amountPaid', {
        type: 'manual',
        message: 'Jumlah bayar melebihi sisa tagihan.',
      })
      return
    }

    const paymentUpdateDetails = {
      amountPaid: values.amountPaid,
      paymentMethod: values.paymentMethod,
      notes: values.notes,
      paymentDate: values.paymentDate.toISOString(),
      recordedByUserId: currentUser.$id, // Keep track of who edited
    }

    setIsProcessingPaymentToSupplier(true)
    const result = await updatePaymentToSupplier(
      purchaseOrder.$id,
      values.paymentId,
      paymentUpdateDetails
    )
    setIsProcessingPaymentToSupplier(false)

    if (result && 'error' in result) {
      toast.error('Gagal Memperbarui Pembayaran', {
        description: result.error,
      })
    } else {
      toast.success('Pembayaran Diperbarui', {
        description: 'Detail pembayaran berhasil diperbarui.',
      })
      setIsEditPaymentModalOpen(false)
      setSelectedPaymentForEdit(null)
      await fetchPurchaseOrder()
    }
  }

  const onSubmitChangeStatus: SubmitHandler<ChangeStatusFormValues> = async (
    values
  ) => {
    if (!purchaseOrder || !currentUser) return

    setIsProcessingChangeStatus(true)
    const result = await updatePurchaseOrderStatus({
      poId: purchaseOrder.$id,
      newStatus: values.newStatus,
    })

    setIsProcessingChangeStatus(false)

    if (result && 'error' in result) {
      toast.error('Gagal Mengganti Status', {
        description: result.error,
      })
    } else {
      toast.success('Status Diperbarui', {
        description: 'Status PO telah diperbarui.',
      })
      setIsChangeStatusModalOpen(false)
      await fetchPurchaseOrder()
    }
  }

  const formatDateIntl = (
    dateInput: string | Date | undefined,
    includeTime = false
  ) => {
    if (!dateInput) return 'N/A'
    try {
      const date = new Date(dateInput)
      return format(date, includeTime ? 'dd MMM yyyy, HH:mm' : 'dd MMM yyyy')
    } catch (error) {
      console.error('Invalid date format:', dateInput, error)
      return 'Invalid Date'
    }
  }

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return 'N/A' // Handle null and undefined
    return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString(
      'id-ID'
    )}`
  }

  const getPOStatusBadgeVariant = (status: PurchaseOrderStatus | undefined) => {
    if (!status) return 'secondary'
    switch (status) {
      case 'draft':
        return 'secondary'
      case 'ordered':
        return 'default'
      case 'partially_received':
        return 'outline'
      case 'fully_received':
        return 'default'
      case 'cancelled':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getPOStatusText = (status: PurchaseOrderStatus | undefined) => {
    if (!status) return 'N/A'
    switch (status) {
      case 'draft':
        return 'Draft'
      case 'ordered':
        return 'Dipesan'
      case 'partially_received':
        return 'Diterima Sebagian'
      case 'fully_received':
        return 'Diterima Penuh'
      case 'cancelled':
        return 'Dibatalkan'
      default:
        return status
    }
  }

  const getPaymentStatusBadgeVariant = (
    status: PurchaseOrderPaymentStatus | undefined,
    dueDateString?: string
  ) => {
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' =
      'secondary'
    if (!status) return variant

    if (status === 'paid') {
      variant = 'default'
    } else if (status === 'unpaid') {
      variant = 'destructive'
    } else if (status === 'partially_paid') {
      variant = 'outline'
    }

    if (
      dueDateString &&
      (status === 'unpaid' || status === 'partially_paid') &&
      isBefore(new Date(dueDateString), startOfDay(new Date()))
    ) {
      variant = 'destructive'
    }
    return variant
  }

  const getPaymentStatusText = (
    status: PurchaseOrderPaymentStatus | undefined,
    dueDateString?: string
  ) => {
    if (!status) return 'N/A'
    let text = ''
    switch (status) {
      case 'paid':
        text = 'Lunas'
        break
      case 'unpaid':
        text = 'Belum Bayar'
        break
      case 'partially_paid':
        text = 'Bayar Sebagian'
        break
    }

    if (
      dueDateString &&
      (status === 'unpaid' || status === 'partially_paid') &&
      isBefore(new Date(dueDateString), startOfDay(new Date()))
    ) {
      return text + ' (Jatuh Tempo)'
    }

    return text
  }

  if (loadingPO) {
    return (
      <MainLayout>
        <div className='space-y-4'>
          <Skeleton className='h-8 w-1/4' />
          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-1/2' />
            </CardHeader>
            <CardContent>
              <Skeleton className='h-40 w-full' />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-1/3' />
            </CardHeader>
            <CardContent>
              <Skeleton className='h-20 w-full' />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    )
  }

  if (!purchaseOrder) {
    return (
      <MainLayout>
        <div className='p-4 text-center'>
          Pesanan Pembelian tidak ditemukan.
        </div>
      </MainLayout>
    )
  }

  const canReceiveGoods =
    purchaseOrder.status === 'ordered' ||
    purchaseOrder.status === 'partially_received'
  const itemsPendingReceipt = purchaseOrder.items.filter(
    (item) => item.orderedQuantity > item.receivedQuantity
  )
  const canPaySupplier =
    purchaseOrder.isCreditPurchase &&
    (purchaseOrder.paymentStatusOnPO === 'unpaid' ||
      purchaseOrder.paymentStatusOnPO === 'partially_paid')

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-4'>
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
            <div>
              <h1 className='text-xl md:text-2xl font-semibold font-headline'>
                Detail Pesanan Pembelian: {purchaseOrder.poNumber}
              </h1>
              <div className='flex flex-row space-x-2'>
                <p className='text-sm text-muted-foreground'>Status PO: </p>
                <Badge
                  variant={getPOStatusBadgeVariant(purchaseOrder.status)}
                  className={cn(
                    purchaseOrder.status === 'fully_received' &&
                      'bg-green-600 text-white hover:bg-green-700',
                    purchaseOrder.status === 'ordered' &&
                      'bg-blue-500 text-white hover:bg-blue-600',
                    purchaseOrder.status === 'partially_received' &&
                      'bg-yellow-500 text-white hover:bg-yellow-600',
                    'mr-2'
                  )}
                >
                  {getPOStatusText(purchaseOrder.status)}
                </Badge>
                {purchaseOrder.isCreditPurchase && (
                  <>
                    <p className='text-sm text-muted-foreground'>
                      Status Bayar:
                    </p>
                    <Badge
                      variant={getPaymentStatusBadgeVariant(
                        purchaseOrder.paymentStatusOnPO,
                        purchaseOrder.paymentDueDateOnPO
                      )}
                      className={cn(
                        purchaseOrder.paymentStatusOnPO === 'paid' &&
                          'bg-green-600 hover:bg-green-700 text-white',
                        purchaseOrder.paymentStatusOnPO === 'partially_paid' &&
                          'border-yellow-500 text-yellow-600'
                      )}
                    >
                      {getPaymentStatusText(
                        purchaseOrder.paymentStatusOnPO,
                        purchaseOrder.paymentDueDateOnPO
                      )}
                    </Badge>
                  </>
                )}
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                variant='outline'
                size='sm'
                asChild
                className='text-xs h-8'
              >
                <Link href='/purchase-orders'>
                  <ArrowLeft className='mr-1.5 h-3.5 w-3.5' /> Kembali ke Daftar
                </Link>
              </Button>
              <Button
                variant='outline'
                size='sm'
                className='text-xs h-8'
                onClick={() => setIsChangeStatusModalOpen(true)}
              >
                <CheckCircle className='mr-1.5 h-3.5 w-3.5' /> Ganti Status
              </Button>
              <Button
                variant='outline'
                size='sm'
                className='text-xs h-8'
                disabled
              >
                <Printer className='mr-1.5 h-3.5 w-3.5' /> Cetak PO (Segera)
              </Button>
            </div>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
            <Card className='lg:col-span-2'>
              <CardHeader>
                <CardTitle className='text-base'>Item Pesanan</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-xs'>Nama Produk</TableHead>
                      <TableHead className='text-xs text-center'>
                        Dipesan
                      </TableHead>
                      <TableHead className='text-xs text-center'>
                        Diterima
                      </TableHead>
                      <TableHead className='text-xs text-right'>
                        Harga Beli
                      </TableHead>
                      <TableHead className='text-xs text-right'>
                        Subtotal
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrder.items.map((item, index) => (
                      <TableRow key={item.productId + index}>
                        <TableCell className='text-xs font-medium py-1.5'>
                          {item.productName}
                        </TableCell>
                        <TableCell className='text-xs text-center py-1.5'>
                          {item.orderedQuantity}
                        </TableCell>
                        <TableCell className='text-xs text-center py-1.5'>
                          {item.receivedQuantity}
                        </TableCell>
                        <TableCell className='text-xs text-right py-1.5'>
                          {formatCurrency(item.purchasePrice)}
                        </TableCell>
                        <TableCell className='text-xs text-right py-1.5'>
                          {formatCurrency(item.totalPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Separator className='my-3' />
                <div className='flex justify-end items-start text-sm'>
                  <div className='w-full max-w-xs space-y-1 text-xs'>
                    <div className='flex justify-between'>
                      <span>Subtotal Item:</span>
                      <span className='font-medium'>
                        {formatCurrency(purchaseOrder.subtotal)}
                      </span>
                    </div>
                    {(purchaseOrder.taxDiscountAmount || 0) > 0 && (
                      <div className='flex justify-between text-green-600'>
                        <span>Diskon Pajak (-):</span>
                        <span className='font-medium'>
                          {formatCurrency(purchaseOrder.taxDiscountAmount)}
                        </span>
                      </div>
                    )}
                    {(purchaseOrder.shippingCostCharged || 0) > 0 && (
                      <div className='flex justify-between text-destructive'>
                        <span>Ongkos Kirim (+):</span>
                        <span className='font-medium'>
                          {formatCurrency(purchaseOrder.shippingCostCharged)}
                        </span>
                      </div>
                    )}
                    {(purchaseOrder.otherCosts || 0) > 0 && (
                      <div className='flex justify-between text-destructive'>
                        <span>Biaya Lainnya (+):</span>
                        <span className='font-medium'>
                          {formatCurrency(purchaseOrder.otherCosts)}
                        </span>
                      </div>
                    )}
                    <Separator className='my-1.5' />
                    <div className='flex justify-between font-semibold text-base'>
                      <span>Total Pesanan:</span>
                      <span>{formatCurrency(purchaseOrder.totalAmount)}</span>
                    </div>
                    {purchaseOrder.isCreditPurchase && (
                      <div className='flex justify-between text-destructive font-semibold'>
                        <span>Sisa Utang:</span>
                        <span>
                          {formatCurrency(purchaseOrder.outstandingPOAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className='lg:col-span-1 space-y-4'>
              <Card>
                <CardHeader>
                  <CardTitle className='text-base'>Informasi Umum PO</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4 text-xs'>
                  <div className='grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2'>
                    {/* PO Number */}
                    <div className='flex items-center'>
                      <Hash className='mr-3 h-4 w-4 text-muted-foreground' />
                      <div>
                        <p className='text-xs text-muted-foreground'>No. PO</p>
                        <p className='font-semibold'>
                          {purchaseOrder.poNumber}
                        </p>
                      </div>
                    </div>
                    {/* Supplier */}
                    <div className='flex items-center'>
                      <Truck className='mr-3 h-4 w-4 text-muted-foreground' />
                      <div>
                        <p className='text-xs text-muted-foreground'>Pemasok</p>
                        <p className='font-semibold'>
                          {purchaseOrder.supplierName}
                        </p>
                      </div>
                    </div>
                    {/* Order Date */}
                    <div className='flex items-center'>
                      <CalendarIcon className='mr-3 h-4 w-4 text-muted-foreground' />
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Tanggal Pesan
                        </p>
                        <p className='font-semibold'>
                          {formatDateIntl(purchaseOrder.orderDate)}
                        </p>
                      </div>
                    </div>
                    {/* Expected Delivery */}
                    <div className='flex items-center'>
                      <CalendarCheck className='mr-3 h-4 w-4 text-muted-foreground' />
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Estimasi Terima
                        </p>
                        <p className='font-semibold'>
                          {purchaseOrder.expectedDeliveryDate
                            ? formatDateIntl(purchaseOrder.expectedDeliveryDate)
                            : '-'}
                        </p>
                      </div>
                    </div>
                    {/* Payment Terms */}
                    <div className='flex items-center'>
                      <Clock className='mr-3 h-4 w-4 text-muted-foreground' />
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Termin Pembayaran
                        </p>
                        <p className='font-semibold capitalize'>
                          {purchaseOrder.paymentTermsOnPO}
                        </p>
                      </div>
                    </div>
                    {/* Created By */}
                    <div className='flex items-center'>
                      <User className='mr-3 h-4 w-4 text-muted-foreground' />
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Dibuat Oleh
                        </p>
                        <p className='font-semibold'>
                          ID: {purchaseOrder.createdById.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </div>

                  {purchaseOrder.paymentTermsOnPO === 'credit' && (
                    <>
                      <Separator />
                      <div className='grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2'>
                        {/* Supplier Invoice */}
                        <div className='flex items-center'>
                          <FileText className='mr-3 h-4 w-4 text-muted-foreground' />
                          <div>
                            <p className='text-xs text-muted-foreground'>
                              No. Invoice Pemasok
                            </p>
                            <p className='font-semibold'>
                              {purchaseOrder.supplierInvoiceNumber || '-'}
                            </p>
                          </div>
                        </div>
                        {/* Payment Due Date */}
                        <div className='flex items-center'>
                          <CalendarClock className='mr-3 h-4 w-4 text-muted-foreground' />
                          <div>
                            <p className='text-xs text-muted-foreground'>
                              Jatuh Tempo
                            </p>
                            <p className='font-semibold'>
                              {purchaseOrder.paymentDueDateOnPO
                                ? formatDateIntl(
                                    purchaseOrder.paymentDueDateOnPO
                                  )
                                : '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {purchaseOrder.notes && (
                    <>
                      <Separator />
                      <div>
                        <div className='flex items-start'>
                          <NotebookText className='mt-0.5 mr-3 h-4 w-4 flex-shrink-0 text-muted-foreground' />
                          <div>
                            <p className='text-xs text-muted-foreground'>
                              Catatan PO
                            </p>
                            <p className='whitespace-pre-wrap font-semibold'>
                              {purchaseOrder.notes}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div className='space-y-1 text-xs text-muted-foreground'>
                    <p>
                      Dibuat: {formatDateIntl(purchaseOrder.$createdAt, true)}
                    </p>
                    <p>
                      Diperbarui:{' '}
                      {formatDateIntl(purchaseOrder.$updatedAt, true)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className='text-base'>Aksi Pesanan</CardTitle>
                </CardHeader>
                <CardContent className='space-y-2'>
                  {canReceiveGoods && (
                    <Button
                      size='sm'
                      className='w-full text-xs h-8'
                      variant='outline'
                      onClick={() => setIsReceivingItemsModalOpen(true)}
                      disabled={itemsPendingReceipt.length === 0}
                    >
                      {itemsPendingReceipt.length === 0 ? (
                        <PackageX className='mr-1.5 h-3.5 w-3.5' />
                      ) : (
                        <PackageCheck className='mr-1.5 h-3.5 w-3.5' />
                      )}
                      {itemsPendingReceipt.length === 0
                        ? 'Semua Item Diterima'
                        : 'Catat Penerimaan Barang'}
                    </Button>
                  )}
                  {canPaySupplier && (
                    <Button
                      size='sm'
                      className='w-full text-xs h-8'
                      variant='default'
                      onClick={() => setIsPaymentToSupplierModalOpen(true)}
                    >
                      <DollarSign className='mr-1.5 h-3.5 w-3.5' /> Catat
                      Pembayaran ke Pemasok
                    </Button>
                  )}
                  {purchaseOrder.status === 'fully_received' &&
                    !canPaySupplier &&
                    purchaseOrder.paymentStatusOnPO === 'paid' && (
                      <p className='text-xs text-green-600 text-center font-medium py-2'>
                        PO selesai dan sudah lunas.
                      </p>
                    )}
                  {purchaseOrder.status === 'cancelled' && (
                    <p className='text-xs text-destructive text-center font-medium py-2'>
                      Pesanan pembelian ini telah dibatalkan.
                    </p>
                  )}
                  {!(
                    canReceiveGoods ||
                    canPaySupplier ||
                    (purchaseOrder.status === 'fully_received' &&
                      purchaseOrder.paymentStatusOnPO === 'paid') ||
                    purchaseOrder.status === 'cancelled'
                  ) && (
                    <p className='text-xs text-muted-foreground text-center py-2'>
                      Tidak ada aksi yang tersedia untuk status PO saat ini.
                    </p>
                  )}
                </CardContent>
              </Card>
              {purchaseOrder.payments && purchaseOrder.payments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className='text-base'>
                      Riwayat Pembayaran ke Pemasok
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className='h-32'>
                      <ul className='space-y-1.5 text-xs'>
                        {purchaseOrder.payments.map((pmt, idx) => (
                          <li
                            key={idx}
                            className='p-1.5 bg-muted/50 rounded-md flex justify-between items-start'
                          >
                            <div>
                              <p>
                                <strong>Tgl:</strong>{' '}
                                {formatDateIntl(pmt.paymentDate, true)} -{' '}
                                <strong>
                                  {formatCurrency(pmt.amountPaid)}
                                </strong>{' '}
                                ({pmt.paymentMethod})
                              </p>
                              {pmt.notes && (
                                <p className='text-muted-foreground italic text-[0.7rem]'>
                                  Catatan: {pmt.notes}
                                </p>
                              )}
                            </div>
                            <div className='flex items-center space-x-1 flex-shrink-0 ml-2'>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-6 w-6'
                                onClick={() => handleEditPayment(pmt)}
                              >
                                <Edit className='h-3.5 w-3.5' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-6 w-6 text-destructive hover:text-destructive'
                                onClick={() => handleDeletePayment(pmt)}
                              >
                                <Trash2 className='h-3.5 w-3.5' />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        <Dialog
          open={isReceivingItemsModalOpen}
          onOpenChange={setIsReceivingItemsModalOpen}
        >
          <DialogContent className='sm:max-w-2xl'>
            <DialogHeader>
              <DialogModalTitle>
                Catat Penerimaan Barang untuk PO: {purchaseOrder.poNumber}
              </DialogModalTitle>
              <DialogModalDescription className='text-xs'>
                Masukkan jumlah barang yang diterima untuk setiap item. Stok
                inventaris akan diperbarui.
              </DialogModalDescription>
            </DialogHeader>
            <form
              onSubmit={receiveItemsForm.handleSubmit(onSubmitReceiveItems)}
            >
              <div className='py-3 max-h-[60vh] overflow-y-auto pr-2 space-y-3'>
                {itemsPendingReceipt.length === 0 ? (
                  <p className='text-sm text-muted-foreground text-center py-4'>
                    Semua item untuk PO ini sudah diterima.
                  </p>
                ) : (
                  receiveFields.map((field, index) => {
                    const remainingToReceive =
                      field.orderedQuantity - field.alreadyReceivedQuantity
                    return (
                      <div
                        key={field.id}
                        className='grid grid-cols-12 gap-x-3 gap-y-1 p-2.5 border rounded-md items-center bg-muted/30'
                      >
                        <div className='col-span-12 sm:col-span-5'>
                          <Label className='text-xs font-medium'>
                            {field.productName}
                          </Label>
                          <p className='text-xs text-muted-foreground'>
                            Dipesan: {field.orderedQuantity} | Sudah Diterima:{' '}
                            {field.alreadyReceivedQuantity} | Sisa:{' '}
                            {remainingToReceive}
                          </p>
                        </div>
                        <div className='col-span-12 sm:col-span-4'>
                          <Label
                            htmlFor={`itemsToReceive.${index}.quantityReceivedNow`}
                            className='text-xs'
                          >
                            Diterima Sekarang
                          </Label>
                          <Input
                            id={`itemsToReceive.${index}.quantityReceivedNow`}
                            type='number'
                            {...receiveItemsForm.register(
                              `itemsToReceive.${index}.quantityReceivedNow`
                            )}
                            className='h-8 text-xs mt-0.5'
                            placeholder='0'
                            min='0'
                            max={remainingToReceive}
                          />
                          {receiveItemsForm.formState.errors.itemsToReceive?.[
                            index
                          ]?.quantityReceivedNow && (
                            <p className='text-xs text-destructive mt-0.5'>
                              {
                                receiveItemsForm.formState.errors
                                  .itemsToReceive?.[index]?.quantityReceivedNow
                                  ?.message
                              }
                            </p>
                          )}
                        </div>
                        <div className='col-span-12 sm:col-span-3'>
                          <Label className='text-xs'>Harga Beli Satuan</Label>
                          <p className='text-xs font-medium mt-0.5'>
                            {formatCurrency(field.purchasePrice)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                {receiveItemsForm.formState.errors.itemsToReceive?.root && (
                  <p className='text-sm text-destructive mt-2 text-center'>
                    {
                      receiveItemsForm.formState.errors.itemsToReceive.root
                        .message
                    }
                  </p>
                )}
                {receiveItemsForm.formState.errors.itemsToReceive &&
                  !receiveItemsForm.formState.errors.itemsToReceive.root &&
                  typeof receiveItemsForm.formState.errors.itemsToReceive
                    .message === 'string' && (
                    <p className='text-sm text-destructive mt-2 text-center'>
                      {receiveItemsForm.formState.errors.itemsToReceive.message}
                    </p>
                  )}
              </div>
              <DialogModalFooter className='pt-4'>
                <DialogClose asChild>
                  <Button
                    type='button'
                    variant='outline'
                    className='text-xs h-8'
                    disabled={isProcessingReceipt}
                  >
                    Batal
                  </Button>
                </DialogClose>
                <Button
                  type='submit'
                  className='text-xs h-8'
                  disabled={
                    isProcessingReceipt || itemsPendingReceipt.length === 0
                  }
                >
                  {isProcessingReceipt ? 'Memproses...' : 'Simpan Penerimaan'}
                </Button>
              </DialogModalFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Change Status Modal */}

        <Dialog
          open={isChangeStatusModalOpen}
          onOpenChange={setIsChangeStatusModalOpen}
        >
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogModalTitle className='text-base'>
                Ganti Status Pesanan
              </DialogModalTitle>
              <DialogModalDescription className='text-xs'>
                Ganti status PO: {purchaseOrder.poNumber}
                <Badge
                  variant={getPOStatusBadgeVariant(purchaseOrder.status)}
                  className={cn(
                    purchaseOrder.status === 'fully_received' &&
                      'bg-green-600 text-white hover:bg-green-700',
                    purchaseOrder.status === 'ordered' &&
                      'bg-blue-500 text-white hover:bg-blue-600',
                    purchaseOrder.status === 'partially_received' &&
                      'bg-yellow-500 text-white hover:bg-yellow-600',
                    'mr-2'
                  )}
                >
                  {getPOStatusText(purchaseOrder.status)}
                </Badge>
              </DialogModalDescription>
            </DialogHeader>
            <form
              onSubmit={changeStatusForm.handleSubmit(onSubmitChangeStatus)}
              className='space-y-3 p-2 max-h-[70vh] overflow-y-auto pr-1'
            >
              <div>
                <Label htmlFor='newStatus' className='text-xs'>
                  Pilih Status Baru*
                </Label>
                <Controller
                  name='newStatus'
                  control={changeStatusForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className='h-9 text-xs mt-1'>
                        <SelectValue placeholder='Pilih status baru' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='draft' className='text-xs'>
                          Draft
                        </SelectItem>
                        <SelectItem value='ordered' className='text-xs '>
                          Dipesan
                        </SelectItem>
                        <SelectItem value='cancelled' className='text-xs'>
                          Dibatalkan
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <DialogModalFooter className='pt-3'>
                <DialogClose asChild>
                  <Button
                    type='button'
                    variant='outline'
                    className='text-xs h-8'
                    disabled={isProcessingChangeStatus}
                  >
                    Batal
                  </Button>
                </DialogClose>
                <Button
                  type='submit'
                  className='text-xs h-8'
                  disabled={isProcessingChangeStatus}
                >
                  {isProcessingChangeStatus
                    ? 'Menyimpan...'
                    : 'Simpan Perubahan'}
                </Button>
              </DialogModalFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Payment To Supplier Modal */}

        <Dialog
          open={isPaymentToSupplierModalOpen}
          onOpenChange={setIsPaymentToSupplierModalOpen}
        >
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogModalTitle className='text-base'>
                Catat Pembayaran ke Pemasok
              </DialogModalTitle>
              <DialogModalDescription className='text-xs'>
                PO: {purchaseOrder.poNumber} ({purchaseOrder.supplierName}){' '}
                <br />
                Sisa Tagihan:{' '}
                <span className='font-semibold'>
                  {formatCurrency(purchaseOrder.outstandingPOAmount)}
                </span>
              </DialogModalDescription>
            </DialogHeader>
            <form
              onSubmit={paymentToSupplierForm.handleSubmit(
                onSubmitPaymentToSupplier
              )}
              className='space-y-3 p-2 max-h-[70vh] overflow-y-auto pr-1'
            >
              <div>
                <Label htmlFor='paymentDateSupplier' className='text-xs'>
                  Tanggal Pembayaran*
                </Label>
                <Controller
                  name='paymentDate'
                  control={paymentToSupplierForm.control}
                  render={({ field }) => (
                    <Popover modal={true}>
                      <PopoverTrigger asChild>
                        <Button
                          variant={'outline'}
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
                          className='rounded-lg border shadow-sm'
                          mode='single'
                          selected={field.value}
                          onSelect={field.onChange}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {paymentToSupplierForm.formState.errors.paymentDate && (
                  <p className='text-xs text-destructive mt-1'>
                    {paymentToSupplierForm.formState.errors.paymentDate.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='amountPaidSupplier' className='text-xs'>
                  Jumlah Dibayar* ({selectedBranch?.currency || 'Rp'})
                </Label>
                <Input
                  id='amountPaidSupplier'
                  type='number'
                  {...paymentToSupplierForm.register('amountPaid')}
                  className='h-9 text-xs mt-1'
                  placeholder='0'
                />
                {paymentToSupplierForm.formState.errors.amountPaid && (
                  <p className='text-xs text-destructive mt-1'>
                    {paymentToSupplierForm.formState.errors.amountPaid.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='paymentMethodSupplier' className='text-xs'>
                  Metode Pembayaran*
                </Label>
                <Controller
                  name='paymentMethod'
                  control={paymentToSupplierForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className='h-9 text-xs mt-1'>
                        <SelectValue placeholder='Pilih metode' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='cash' className='text-xs'>
                          Tunai
                        </SelectItem>
                        <SelectItem value='transfer' className='text-xs'>
                          Transfer Bank
                        </SelectItem>
                        <SelectItem value='card' className='text-xs'>
                          Kartu
                        </SelectItem>
                        <SelectItem value='other' className='text-xs'>
                          Lainnya
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {paymentToSupplierForm.formState.errors.paymentMethod && (
                  <p className='text-xs text-destructive mt-1'>
                    {
                      paymentToSupplierForm.formState.errors.paymentMethod
                        .message
                    }
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='notesSupplier' className='text-xs'>
                  Catatan (Opsional)
                </Label>
                <Textarea
                  id='notesSupplier'
                  {...paymentToSupplierForm.register('notes')}
                  className='text-xs mt-1 min-h-[60px]'
                  placeholder='Catatan tambahan...'
                />
              </div>
              <DialogModalFooter className='pt-3'>
                <DialogClose asChild>
                  <Button
                    type='button'
                    variant='outline'
                    className='text-xs h-8'
                    disabled={isProcessingPaymentToSupplier}
                  >
                    Batal
                  </Button>
                </DialogClose>
                <Button
                  type='submit'
                  className='text-xs h-8'
                  disabled={
                    isProcessingPaymentToSupplier ||
                    paymentToSupplierForm.formState.isSubmitting
                  }
                >
                  {isProcessingPaymentToSupplier ||
                  paymentToSupplierForm.formState.isSubmitting
                    ? 'Menyimpan...'
                    : 'Simpan Pembayaran'}
                </Button>
              </DialogModalFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Payment Modal */}
        <Dialog
          open={isEditPaymentModalOpen}
          onOpenChange={setIsEditPaymentModalOpen}
        >
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogModalTitle className='text-base'>
                Edit Pembayaran ke Pemasok
              </DialogModalTitle>
              <DialogModalDescription className='text-xs'>
                Perbarui detail pembayaran untuk PO: {purchaseOrder.poNumber}
              </DialogModalDescription>
            </DialogHeader>
            <form
              onSubmit={editPaymentToSupplierForm.handleSubmit(
                onSubmitEditPayment
              )}
              className='space-y-3 p-2 max-h-[70vh] overflow-y-auto pr-1'
            >
              <div>
                <Label htmlFor='editPaymentDate' className='text-xs'>
                  Tanggal Pembayaran*
                </Label>
                <Controller
                  name='paymentDate'
                  control={editPaymentToSupplierForm.control}
                  render={({ field }) => (
                    <Popover modal={true}>
                      <PopoverTrigger asChild>
                        <Button
                          variant={'outline'}
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
                          className='rounded-lg border shadow-sm'
                          mode='single'
                          selected={field.value}
                          onSelect={field.onChange}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {editPaymentToSupplierForm.formState.errors.paymentDate && (
                  <p className='text-xs text-destructive mt-1'>
                    {
                      editPaymentToSupplierForm.formState.errors.paymentDate
                        .message
                    }
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='editAmountPaid' className='text-xs'>
                  Jumlah Dibayar* ({selectedBranch?.currency || 'Rp'})
                </Label>
                <Input
                  id='editAmountPaid'
                  type='number'
                  {...editPaymentToSupplierForm.register('amountPaid')}
                  className='h-9 text-xs mt-1'
                />
                {editPaymentToSupplierForm.formState.errors.amountPaid && (
                  <p className='text-xs text-destructive mt-1'>
                    {
                      editPaymentToSupplierForm.formState.errors.amountPaid
                        .message
                    }
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='editPaymentMethod' className='text-xs'>
                  Metode Pembayaran*
                </Label>
                <Controller
                  name='paymentMethod'
                  control={editPaymentToSupplierForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className='h-9 text-xs mt-1'>
                        <SelectValue placeholder='Pilih metode' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='cash' className='text-xs'>
                          Tunai
                        </SelectItem>
                        <SelectItem value='transfer' className='text-xs'>
                          Transfer Bank
                        </SelectItem>
                        <SelectItem value='card' className='text-xs'>
                          Kartu
                        </SelectItem>
                        <SelectItem value='other' className='text-xs'>
                          Lainnya
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {editPaymentToSupplierForm.formState.errors.paymentMethod && (
                  <p className='text-xs text-destructive mt-1'>
                    {
                      editPaymentToSupplierForm.formState.errors.paymentMethod
                        .message
                    }
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='editNotes' className='text-xs'>
                  Catatan (Opsional)
                </Label>
                <Textarea
                  id='editNotes'
                  {...editPaymentToSupplierForm.register('notes')}
                  className='text-xs mt-1 min-h-[60px]'
                  placeholder='Catatan tambahan...'
                />
              </div>
              <DialogModalFooter className='pt-3'>
                <DialogClose asChild>
                  <Button
                    type='button'
                    variant='outline'
                    className='text-xs h-8'
                    disabled={isProcessingPaymentToSupplier}
                  >
                    Batal
                  </Button>
                </DialogClose>
                <Button
                  type='submit'
                  className='text-xs h-8'
                  disabled={
                    isProcessingPaymentToSupplier ||
                    editPaymentToSupplierForm.formState.isSubmitting
                  }
                >
                  {isProcessingPaymentToSupplier ||
                  editPaymentToSupplierForm.formState.isSubmitting
                    ? 'Menyimpan...'
                    : 'Simpan Perubahan'}
                </Button>
              </DialogModalFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog
          open={isDeleteConfirmModalOpen}
          onOpenChange={setIsDeleteConfirmModalOpen}
        >
          <DialogContent className='sm:max-w-sm'>
            <DialogHeader>
              <DialogModalTitle>Hapus Pembayaran?</DialogModalTitle>
              <DialogModalDescription>
                Aksi ini tidak dapat dibatalkan. Ini akan menghapus catatan
                pembayaran secara permanen dan memperbarui sisa tagihan PO.
              </DialogModalDescription>
            </DialogHeader>
            <DialogModalFooter>
              <DialogClose asChild>
                <Button
                  type='button'
                  variant='outline'
                  disabled={isProcessingDelete}
                >
                  Batal
                </Button>
              </DialogClose>
              <Button
                type='button'
                variant='destructive'
                onClick={confirmDeletePayment}
                disabled={isProcessingDelete}
              >
                {isProcessingDelete ? 'Menghapus...' : 'Ya, Hapus'}
              </Button>
            </DialogModalFooter>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  )
}
