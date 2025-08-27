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
  PurchaseOrderStatus,
  PurchaseOrderPaymentStatus,
  SupplierPayment,
  ReceivedItemData,
  PaymentMethod,
  SupplierPaymentInput,
  SupplierPaymentEditInput,
} from '@/lib/types'
import {
  getPurchaseOrderById,
  receivePurchaseOrder,
  receivePurchaseOrderItems,
  updatePurchaseOrderStatus,
} from '@/lib/laravel/purchaseOrderService'
import {
  createSupplierPayment,
  updateSupplierPayment,
  deleteSupplierPayment,
} from '@/lib/laravel/supplierPaymentService'
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
  type FieldErrors,
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
import { formatCurrency } from '@/lib/helper'

// Receive Items Schemas (fixed)
const receiveItemSchema = z.object({
  purchaseOrderItemId: z.coerce.number(),
  product_id: z.coerce.number().optional(),
  product_name: z.string().optional(),
  ordered_quantity: z.coerce.number().optional(),
  already_received_quantity: z.coerce.number().optional(),
  purchase_price: z.coerce.number().optional(),
  quantity_received_now: z.coerce
    .number()
    .min(0, 'Jumlah tidak boleh negatif.')
    .max(99999, 'Jumlah terlalu besar.'),
})

const receiveFormSchema = z.object({
  itemsToReceive: z.array(receiveItemSchema),
})

type ReceiveFormValues = z.infer<typeof receiveFormSchema>
const paymentToSupplierFormSchema = z.object({
  payment_date: z.date({ required_error: 'Tanggal pembayaran harus diisi.' }),
  amount_paid: z.coerce
    .number()
    .positive({ message: 'Jumlah bayar harus lebih dari 0.' }),
  payment_method: z.enum(['cash', 'card', 'transfer', 'qris', 'credit'], {
    required_error: 'Metode pembayaran harus dipilih.',
  }),
  notes: z.string().optional(),
})
type PaymentToSupplierFormValues = z.infer<typeof paymentToSupplierFormSchema>

const editPaymentToSupplierFormSchema = z.object({
  payment_id: z.number(),
  payment_date: z.date({ required_error: 'Tanggal pembayaran harus diisi.' }),
  amount_paid: z.coerce
    .number()
    .positive({ message: 'Jumlah bayar harus lebih dari 0.' }),
  payment_method: z.enum(['cash', 'card', 'transfer', 'qris', 'credit'], {
    required_error: 'Metode pembayaran harus dipilih.',
  }),
  notes: z.string().optional(),
})
type EditPaymentToSupplierFormValues = z.infer<
  typeof editPaymentToSupplierFormSchema
>

const changeStatusFormSchema = z.object({
  status: z.enum(
    ['draft', 'ordered', 'partially_received', 'fully_received', 'cancelled'],
    {
      required_error: 'Status harus dipilih.',
    }
  ),
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
    useState<SupplierPaymentEditInput | null>(null)
  const [selectedPaymentForDelete, setSelectedPaymentForDelete] =
    useState<SupplierPayment | null>(null)
  const [isProcessingDelete, setIsProcessingDelete] = useState(false)

  const paymentToSupplierForm = useForm<PaymentToSupplierFormValues>({
    resolver: zodResolver(paymentToSupplierFormSchema),
    defaultValues: {
      payment_date: new Date(),
      amount_paid: 0,
      payment_method: 'transfer',
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

        if (fetchedPO.purchase_order_details) {
          const itemsForForm = fetchedPO.purchase_order_details
            .filter((item) => item.ordered_quantity > item.received_quantity)
            .map((item) => ({
              purchaseOrderItemId: item.id,
              product_id: item.product_id,
              product_name: item.product_name,
              ordered_quantity: item.ordered_quantity,
              already_received_quantity: item.received_quantity,
              purchase_price: item.purchase_price,
              quantity_received_now: 0,
            }))
          replaceReceiveFields(itemsForForm)
        }

        if (fetchedPO.is_credit && fetchedPO.outstanding_amount) {
          paymentToSupplierForm.reset({
            payment_date: new Date(),
            amount_paid: fetchedPO.outstanding_amount,
            payment_method: 'transfer',
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
  }, [poId, replaceReceiveFields, paymentToSupplierForm])

  useEffect(() => {
    fetchPurchaseOrder()
  }, [fetchPurchaseOrder])

  const onInvalidReceive = (errors: FieldErrors<ReceiveFormValues>) => {
    // Prefer array-level errors (refine messages), otherwise the first field error
    const arrayError = errors.itemsToReceive as any
    const arrayRootMessage = arrayError?.root?.message as string | undefined
    const firstItemErrorMsg: string | undefined = Array.isArray(arrayError)
      ? arrayError.find((e: any) => e?.quantity_received_now)
          ?.quantity_received_now?.message
      : undefined
    const message =
      arrayRootMessage ||
      firstItemErrorMsg ||
      'Periksa input penerimaan barang.'
    toast.error('Validasi Gagal', { description: message })
  }

  const onSubmitReceiveItems: SubmitHandler<ReceiveFormValues> = async (
    values
  ) => {
    if (!purchaseOrder) return

    // Validate quantities against remaining using server data
    const detailMap = new Map(
      (purchaseOrder.purchase_order_details || []).map((d) => [d.id, d])
    )
    for (let i = 0; i < values.itemsToReceive.length; i++) {
      const item = values.itemsToReceive[i]
      if (item.quantity_received_now > 0) {
        const detail = detailMap.get(item.purchaseOrderItemId)
        const ordered = detail?.ordered_quantity ?? 0
        const already = detail?.received_quantity ?? 0
        const remaining = ordered - already
        if (item.quantity_received_now > remaining) {
          receiveItemsForm.setError(
            `itemsToReceive.${i}.quantity_received_now` as any,
            {
              type: 'manual',
              message: `Jumlah melebihi sisa (${remaining}).`,
            }
          )
          toast.error('Validasi Gagal', {
            description: `Jumlah diterima untuk ${
              detail?.product_name || 'item'
            } melebihi sisa (${remaining}).`,
          })
          return
        }
      }
    }

    const itemsToProcess: ReceivedItemData[] = values.itemsToReceive
      .filter((item) => item.quantity_received_now > 0)
      .map((item) => ({
        purchase_order_detail_id: item.purchaseOrderItemId,
        quantity_received: item.quantity_received_now,
      }))

    if (itemsToProcess.length === 0) {
      toast.error('Tidak ada item diterima', {
        description: 'Masukkan jumlah untuk setidaknya satu item.',
      })
      return
    }

    try {
      setIsProcessingReceipt(true)
      const result = await receivePurchaseOrderItems(
        purchaseOrder.id,
        itemsToProcess
      )
      toast.success('Penerimaan Barang Berhasil', {
        description: 'Stok dan status PO telah diperbarui.',
      })
      setIsReceivingItemsModalOpen(false)

      await fetchPurchaseOrder()
    } catch (error) {
      const anyErr = error as any
      const backendMsg = anyErr?.response?.data?.message
      toast.error('Gagal Menerima Barang', {
        description: backendMsg || 'Terjadi kesalahan saat menerima barang.',
      })
    } finally {
      setIsProcessingReceipt(false)
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
    if (values.amount_paid > (purchaseOrder.outstanding_amount || 0)) {
      toast.error('Jumlah Tidak Valid', {
        description: 'Jumlah bayar melebihi sisa tagihan.',
      })

      paymentToSupplierForm.setError('amount_paid', {
        type: 'manual',
        message: 'Jumlah bayar melebihi sisa tagihan.',
      })
      return
    }

    const paymentDetails: SupplierPaymentInput = {
      purchase_order_id: purchaseOrder.id,
      amount_paid: values.amount_paid,
      payment_date: values.payment_date.toISOString(),
      payment_method: values.payment_method,
      notes: values.notes ?? '',
      recorded_by_user_id: currentUser.id,
    }

    try {
      setIsProcessingPaymentToSupplier(true)
      const result = await createSupplierPayment(paymentDetails)

      toast.success('Pembayaran Dicatat', {
        description: `Pembayaran untuk PO ${purchaseOrder.po_number} berhasil dicatat.`,
      })
      setIsPaymentToSupplierModalOpen(false)
      await fetchPurchaseOrder()
    } catch (error: any) {
      toast.error('Gagal Mencatat Pembayaran', {
        description: error.message,
      })
    } finally {
      setIsProcessingPaymentToSupplier(false)
    }
  }

  const handleEditPayment = (payment: SupplierPayment) => {
    setSelectedPaymentForEdit(payment)
    editPaymentToSupplierForm.reset({
      payment_id: payment.id,
      payment_date: new Date(payment.payment_date),
      amount_paid: payment.amount_paid,
      payment_method: payment.payment_method,
      notes: payment.notes || '',
    })
    setIsEditPaymentModalOpen(true)
  }

  const handleDeletePayment = (payment: SupplierPayment) => {
    setSelectedPaymentForDelete(payment)
    setIsDeleteConfirmModalOpen(true)
  }

  const confirmDeletePayment = async () => {
    if (!selectedPaymentForDelete || !purchaseOrder) return

    try {
      setIsProcessingDelete(true)
      const result = await deleteSupplierPayment(purchaseOrder.id)
      toast.success('Pembayaran Dihapus', {
        description: 'Riwayat pembayaran telah dihapus.',
      })
      setIsDeleteConfirmModalOpen(false)
      setSelectedPaymentForDelete(null)
      await fetchPurchaseOrder()
    } catch (error: any) {
      toast.error('Gagal Menghapus Pembayaran', {
        description: error.message,
      })
    } finally {
      setIsProcessingDelete(false)
    }
  }

  const onSubmitEditPayment: SubmitHandler<
    EditPaymentToSupplierFormValues
  > = async (values) => {
    if (!purchaseOrder || !currentUser || !selectedPaymentForEdit) return

    const originalAmount = selectedPaymentForEdit.amount_paid
    const newAmount = values.amount_paid
    const difference = newAmount - originalAmount
    const newOutstandingAmount =
      (purchaseOrder.outstanding_amount || 0) - difference

    if (newOutstandingAmount < 0) {
      toast.error('Jumlah Tidak Valid', {
        description: `Jumlah bayar baru akan membuat total bayar melebihi total tagihan.`,
      })
      editPaymentToSupplierForm.setError('amount_paid', {
        type: 'manual',
        message: 'Jumlah bayar melebihi sisa tagihan.',
      })
      return
    }

    const paymentUpdateDetails = {
      amount_paid: values.amount_paid,
      payment_method: values.payment_method,
      notes: values.notes,
      payment_date: values.payment_date.toISOString(),
      recorded_by_user_id: currentUser.id, // Keep track of who edited
    }

    try {
      setIsProcessingPaymentToSupplier(true)
      const result = await updateSupplierPayment(
        purchaseOrder.id,
        paymentUpdateDetails
      )

      toast.success('Pembayaran Diperbarui', {
        description: 'Detail pembayaran berhasil diperbarui.',
      })
      setIsEditPaymentModalOpen(false)
      setSelectedPaymentForEdit(null)
      await fetchPurchaseOrder()
    } catch (error: any) {
      toast.error('Gagal Memperbarui Pembayaran', {
        description: error.message,
      })
    } finally {
      setIsProcessingPaymentToSupplier(false)
    }
  }

  const onSubmitChangeStatus: SubmitHandler<ChangeStatusFormValues> = async (
    values
  ) => {
    if (!purchaseOrder || !currentUser) return

    // Intercept statuses that require recording item receipts instead of direct status update
    if (
      (values.status === 'partially_received' ||
        values.status === 'fully_received') &&
      purchaseOrder.purchase_order_details &&
      purchaseOrder.purchase_order_details.length > 0
    ) {
      const pending = purchaseOrder.purchase_order_details.filter(
        (d) => d.ordered_quantity > d.received_quantity
      )

      if (pending.length === 0) {
        // No pending items; allow normal flow (could already be fully received)
      } else {
        // Prepare receive form fields if user wants to mark fully received
        if (values.status === 'fully_received') {
          // Prefill each remaining quantity
          receiveFields.forEach((field, index) => {
            const remaining =
              (field.ordered_quantity ?? 0) -
              (field.already_received_quantity ?? 0)
            if (remaining > 0) {
              receiveItemsForm.setValue(
                `itemsToReceive.${index}.quantity_received_now` as const,
                remaining
              )
            }
          })
          toast.info('Lengkapi penerimaan', {
            description:
              'Semua jumlah sisa telah diisi otomatis. Simpan penerimaan untuk menyelesaikan PO.',
          })
        } else {
          // Partially received - let user input manually
          // Clear any previous auto-filled quantities to avoid confusion
          receiveFields.forEach((field, index) => {
            receiveItemsForm.setValue(
              `itemsToReceive.${index}.quantity_received_now` as const,
              0
            )
          })
          toast.message('Catat Penerimaan Barang', {
            description:
              'Masukkan jumlah barang yang diterima untuk memperbarui status.',
          })
        }
        // Close change status modal and open receive items modal instead of direct status update
        setIsChangeStatusModalOpen(false)
        setIsReceivingItemsModalOpen(true)
        return
      }
    }

    try {
      setIsProcessingChangeStatus(true)
      const result = await updatePurchaseOrderStatus(
        purchaseOrder.id,
        values.status
      )
      toast.success('Status Diperbarui', {
        description: 'Status PO telah diperbarui.',
      })
      setIsChangeStatusModalOpen(false)
      await fetchPurchaseOrder()
    } catch (error: any) {
      toast.error('Gagal Mengganti Status', {
        description: error.message,
      })
    } finally {
      setIsProcessingChangeStatus(false)
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
  const itemsPendingReceipt = purchaseOrder.purchase_order_details
    ? purchaseOrder.purchase_order_details.filter(
        (item) => item.ordered_quantity > item.received_quantity
      )
    : []
  const canPaySupplier =
    purchaseOrder.is_credit &&
    (purchaseOrder.payment_status === 'unpaid' ||
      purchaseOrder.payment_status === 'partially_paid')

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-4'>
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
            <div>
              <h1 className='text-xl md:text-2xl font-semibold font-headline'>
                Detail Pesanan Pembelian: {purchaseOrder.po_number}
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
                {purchaseOrder.is_credit && (
                  <>
                    <p className='text-sm text-muted-foreground'>
                      Status Bayar:
                    </p>
                    <Badge
                      variant={getPaymentStatusBadgeVariant(
                        purchaseOrder.payment_status,
                        purchaseOrder.payment_due_date ?? ''
                      )}
                      className={cn(
                        purchaseOrder.payment_status === 'paid' &&
                          'bg-green-600 hover:bg-green-700 text-white',
                        purchaseOrder.payment_status === 'partially_paid' &&
                          'border-yellow-500 text-yellow-600'
                      )}
                    >
                      {getPaymentStatusText(
                        purchaseOrder.payment_status,
                        purchaseOrder.payment_due_date ?? ''
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
                    {purchaseOrder.purchase_order_details?.map(
                      (item, index) => (
                        <TableRow key={item.product_id + index}>
                          <TableCell className='text-xs font-medium py-1.5'>
                            {item.product_name}
                          </TableCell>
                          <TableCell className='text-xs text-center py-1.5'>
                            {item.ordered_quantity}
                          </TableCell>
                          <TableCell className='text-xs text-center py-1.5'>
                            {item.received_quantity}
                          </TableCell>
                          <TableCell className='text-xs text-right py-1.5'>
                            {formatCurrency(item.purchase_price)}
                          </TableCell>
                          <TableCell className='text-xs text-right py-1.5'>
                            {formatCurrency(item.total_price)}
                          </TableCell>
                        </TableRow>
                      )
                    )}
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
                    {(purchaseOrder.tax_discount_amount || 0) > 0 && (
                      <div className='flex justify-between text-green-600'>
                        <span>Diskon Pajak (-):</span>
                        <span className='font-medium'>
                          {formatCurrency(purchaseOrder.tax_discount_amount)}
                        </span>
                      </div>
                    )}
                    {(purchaseOrder.shipping_cost_charged || 0) > 0 && (
                      <div className='flex justify-between text-destructive'>
                        <span>Ongkos Kirim (+):</span>
                        <span className='font-medium'>
                          {formatCurrency(purchaseOrder.shipping_cost_charged)}
                        </span>
                      </div>
                    )}
                    {(purchaseOrder.other_costs || 0) > 0 && (
                      <div className='flex justify-between text-destructive'>
                        <span>Biaya Lainnya (+):</span>
                        <span className='font-medium'>
                          {formatCurrency(purchaseOrder.other_costs)}
                        </span>
                      </div>
                    )}
                    <Separator className='my-1.5' />
                    <div className='flex justify-between font-semibold text-base'>
                      <span>Total Pesanan:</span>
                      <span>{formatCurrency(purchaseOrder.total_amount)}</span>
                    </div>
                    {purchaseOrder.is_credit && (
                      <div className='flex justify-between text-destructive font-semibold'>
                        <span>Sisa Utang:</span>
                        <span>
                          {formatCurrency(purchaseOrder.outstanding_amount)}
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
                          {purchaseOrder.po_number}
                        </p>
                      </div>
                    </div>
                    {/* Supplier */}
                    <div className='flex items-center'>
                      <Truck className='mr-3 h-4 w-4 text-muted-foreground' />
                      <div>
                        <p className='text-xs text-muted-foreground'>Pemasok</p>
                        <p className='font-semibold'>
                          {purchaseOrder.supplier_name}
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
                          {formatDateIntl(purchaseOrder.order_date)}
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
                          {purchaseOrder.expected_delivery_date
                            ? formatDateIntl(
                                purchaseOrder.expected_delivery_date
                              )
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
                          {purchaseOrder.payment_terms}
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
                          {purchaseOrder.user?.name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {purchaseOrder.payment_terms === 'credit' && (
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
                              {purchaseOrder.supplier_invoice_number || '-'}
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
                              {purchaseOrder.payment_due_date
                                ? formatDateIntl(purchaseOrder.payment_due_date)
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
                      Dibuat: {formatDateIntl(purchaseOrder.created_at, true)}
                    </p>
                    <p>
                      Diperbarui:{' '}
                      {formatDateIntl(purchaseOrder.updated_at, true)}
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
                    purchaseOrder.payment_status === 'paid' && (
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
                      purchaseOrder.payment_status === 'paid') ||
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
                                {formatDateIntl(pmt.payment_date, true)} -{' '}
                                <strong>
                                  {formatCurrency(pmt.amount_paid)}
                                </strong>{' '}
                                ({pmt.payment_method})
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
                Catat Penerimaan Barang untuk PO: {purchaseOrder.po_number}
              </DialogModalTitle>
              <DialogModalDescription className='text-xs'>
                Masukkan jumlah barang yang diterima untuk setiap item. Stok
                inventaris akan diperbarui.
              </DialogModalDescription>
            </DialogHeader>
            <form
              noValidate
              onSubmit={receiveItemsForm.handleSubmit(
                onSubmitReceiveItems,
                onInvalidReceive
              )}
            >
              <div className='py-3 max-h-[60vh] overflow-y-auto pr-2 space-y-3'>
                {itemsPendingReceipt.length === 0 ? (
                  <p className='text-sm text-muted-foreground text-center py-4'>
                    Semua item untuk PO ini sudah diterima.
                  </p>
                ) : (
                  receiveFields.map((field, index) => {
                    const remainingToReceive =
                      (field.ordered_quantity ?? 0) -
                      (field.already_received_quantity ?? 0)
                    return (
                      <div
                        key={field.id}
                        className='grid grid-cols-12 gap-x-3 gap-y-1 p-2.5 border rounded-md items-center bg-muted/30'
                      >
                        {/* Hidden required field to satisfy schema */}
                        <input
                          type='hidden'
                          {...receiveItemsForm.register(
                            `itemsToReceive.${index}.purchaseOrderItemId`
                          )}
                          defaultValue={field.purchaseOrderItemId}
                        />
                        <div className='col-span-12 sm:col-span-5'>
                          <Label className='text-xs font-medium'>
                            {field.product_name}
                          </Label>
                          <p className='text-xs text-muted-foreground'>
                            Dipesan: {field.ordered_quantity ?? 0} | Sudah
                            Diterima: {field.already_received_quantity ?? 0} |
                            Sisa: {remainingToReceive}
                          </p>
                        </div>
                        <div className='col-span-12 sm:col-span-4'>
                          <Label
                            htmlFor={`itemsToReceive.${index}.quantity_received_now`}
                            className='text-xs'
                          >
                            Diterima Sekarang
                          </Label>
                          <Input
                            id={`itemsToReceive.${index}.quantity_received_now`}
                            type='number'
                            {...receiveItemsForm.register(
                              `itemsToReceive.${index}.quantity_received_now`
                            )}
                            className='h-8 text-xs mt-0.5'
                            placeholder='0'
                            min='0'
                          />
                          {receiveItemsForm.formState.errors.itemsToReceive?.[
                            index
                          ]?.quantity_received_now && (
                            <p className='text-xs text-destructive mt-0.5'>
                              {
                                receiveItemsForm.formState.errors
                                  .itemsToReceive?.[index]
                                  ?.quantity_received_now?.message
                              }
                            </p>
                          )}
                        </div>
                        <div className='col-span-12 sm:col-span-3'>
                          <Label className='text-xs'>Harga Beli Satuan</Label>
                          <p className='text-xs font-medium mt-0.5'>
                            {formatCurrency(field.purchase_price ?? 0)}
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
                Ganti status PO: {purchaseOrder.po_number}
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
              <Label htmlFor='status' className='text-xs'>
                Pilih Status Baru*
              </Label>
              <Controller
                name='status'
                control={changeStatusForm.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className='h-9 text-xs mt-1'>
                      <SelectValue placeholder='Pilih status baru' />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        [
                          'draft',
                          'ordered',
                          'partially_received',
                          'fully_received',
                          'cancelled',
                        ] as PurchaseOrderStatus[]
                      ).map((status) => (
                        <SelectItem
                          key={status}
                          value={status}
                          className='text-xs'
                        >
                          {getPOStatusText(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
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
                PO: {purchaseOrder.po_number} ({purchaseOrder.supplier_name}){' '}
                <br />
                Sisa Tagihan:{' '}
                <span className='font-semibold'>
                  {formatCurrency(purchaseOrder.outstanding_amount)}
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
                <Label htmlFor='payment_dateSupplier' className='text-xs'>
                  Tanggal Pembayaran*
                </Label>
                <Controller
                  name='payment_date'
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
                {paymentToSupplierForm.formState.errors.payment_date && (
                  <p className='text-xs text-destructive mt-1'>
                    {
                      paymentToSupplierForm.formState.errors.payment_date
                        .message
                    }
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='amount_paidSupplier' className='text-xs'>
                  Jumlah Dibayar* ({selectedBranch?.currency || 'Rp'})
                </Label>
                <Input
                  id='amount_paidSupplier'
                  type='number'
                  {...paymentToSupplierForm.register('amount_paid')}
                  className='h-9 text-xs mt-1'
                  placeholder='0'
                />
                {paymentToSupplierForm.formState.errors.amount_paid && (
                  <p className='text-xs text-destructive mt-1'>
                    {paymentToSupplierForm.formState.errors.amount_paid.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='payment_methodSupplier' className='text-xs'>
                  Metode Pembayaran*
                </Label>
                <Controller
                  name='payment_method'
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
                        <SelectItem value='qris' className='text-xs'>
                          QRIS
                        </SelectItem>
                        <SelectItem value='credit' className='text-xs'>
                          Kredit
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {paymentToSupplierForm.formState.errors.payment_method && (
                  <p className='text-xs text-destructive mt-1'>
                    {
                      paymentToSupplierForm.formState.errors.payment_method
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
                Perbarui detail pembayaran untuk PO: {purchaseOrder.po_number}
              </DialogModalDescription>
            </DialogHeader>
            <form
              onSubmit={editPaymentToSupplierForm.handleSubmit(
                onSubmitEditPayment
              )}
              className='space-y-3 p-2 max-h-[70vh] overflow-y-auto pr-1'
            >
              <div>
                <Label htmlFor='editpayment_date' className='text-xs'>
                  Tanggal Pembayaran*
                </Label>
                <Controller
                  name='payment_date'
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
                {editPaymentToSupplierForm.formState.errors.payment_date && (
                  <p className='text-xs text-destructive mt-1'>
                    {
                      editPaymentToSupplierForm.formState.errors.payment_date
                        .message
                    }
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='editamount_paid' className='text-xs'>
                  Jumlah Dibayar* ({selectedBranch?.currency || 'Rp'})
                </Label>
                <Input
                  id='editamount_paid'
                  type='number'
                  {...editPaymentToSupplierForm.register('amount_paid')}
                  className='h-9 text-xs mt-1'
                />
                {editPaymentToSupplierForm.formState.errors.amount_paid && (
                  <p className='text-xs text-destructive mt-1'>
                    {
                      editPaymentToSupplierForm.formState.errors.amount_paid
                        .message
                    }
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='editpayment_method' className='text-xs'>
                  Metode Pembayaran*
                </Label>
                <Controller
                  name='payment_method'
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
                        <SelectItem value='qris' className='text-xs'>
                          QRIS
                        </SelectItem>
                        <SelectItem value='credit' className='text-xs'>
                          Kredit
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {editPaymentToSupplierForm.formState.errors.payment_method && (
                  <p className='text-xs text-destructive mt-1'>
                    {
                      editPaymentToSupplierForm.formState.errors.payment_method
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
