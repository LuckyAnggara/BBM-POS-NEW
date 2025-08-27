'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  ArrowLeft,
  Edit,
  FileText,
  Package2 as Package,
  Users,
  Calendar,
  CreditCard,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck,
  RefreshCw,
  History,
  User,
  DollarSign,
  Eye,
  Download,
  Printer,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/helper'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { toast } from 'sonner'
import Link from 'next/link'

// Import types and services
import type { Invoice, User as UserType } from '@/lib/types'
import {
  getInvoiceById,
  updateInvoiceStatus,
} from '@/lib/laravel/invoiceService'

// Extended status types for comprehensive tracking
type ExtendedInvoiceStatus =
  | 'draft'
  | 'confirmed'
  | 'preparing'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'returned'

type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue'

type ShippingStatus =
  | 'not_shipped'
  | 'preparing'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'failed'

interface StatusHistory {
  id: string
  status: ExtendedInvoiceStatus
  previous_status?: ExtendedInvoiceStatus
  notes?: string
  changed_by: UserType
  changed_at: string
  payment_amount?: number
}

// Status configuration with colors and labels
const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-800',
    icon: FileText,
    description: 'Invoice masih dalam tahap draft',
  },
  confirmed: {
    label: 'Dikonfirmasi',
    color: 'bg-blue-100 text-blue-800',
    icon: CheckCircle,
    description: 'Invoice telah dikonfirmasi dan siap diproses',
  },
  preparing: {
    label: 'Sedang Disiapkan',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Package,
    description: 'Barang sedang disiapkan',
  },
  ready_to_ship: {
    label: 'Siap Dikirim',
    color: 'bg-orange-100 text-orange-800',
    icon: Package,
    description: 'Barang siap untuk dikirim',
  },
  shipped: {
    label: 'Sedang Dikirim',
    color: 'bg-purple-100 text-purple-800',
    icon: Truck,
    description: 'Barang sedang dalam perjalanan',
  },
  delivered: {
    label: 'Terkirim',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    description: 'Barang telah sampai di tujuan',
  },
  completed: {
    label: 'Selesai',
    color: 'bg-emerald-100 text-emerald-800',
    icon: CheckCircle,
    description: 'Transaksi telah selesai',
  },
  cancelled: {
    label: 'Dibatalkan',
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
    description: 'Invoice dibatalkan',
  },
  returned: {
    label: 'Diretur',
    color: 'bg-amber-100 text-amber-800',
    icon: RefreshCw,
    description: 'Barang dikembalikan',
  },
}

const PAYMENT_STATUS_CONFIG = {
  unpaid: { label: 'Belum Dibayar', color: 'bg-red-100 text-red-800' },
  partial: {
    label: 'Dibayar Sebagian',
    color: 'bg-yellow-100 text-yellow-800',
  },
  paid: { label: 'Lunas', color: 'bg-green-100 text-green-800' },
  overdue: { label: 'Jatuh Tempo', color: 'bg-red-100 text-red-800' },
}

export default function InvoiceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { currentUser } = useAuth()
  const { selectedBranch } = useBranches()
  const invoiceId = params.id as string

  // State
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)

  // Status update state
  const [newStatus, setNewStatus] = useState<ExtendedInvoiceStatus>('draft')
  const [statusNotes, setStatusNotes] = useState('')
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentNotes, setPaymentNotes] = useState('')

  // Mock status history (in real app, this would come from API)
  const [statusHistory] = useState<StatusHistory[]>([
    {
      id: '1',
      status: 'draft',
      changed_by: {
        id: 1,
        name: 'System',
        email: 'system@bbm.com',
      } as UserType,
      changed_at: '2024-01-15T10:00:00Z',
      notes: 'Invoice dibuat',
    },
    {
      id: '2',
      status: 'confirmed',
      previous_status: 'draft',
      changed_by: {
        id: 2,
        name: 'Admin POS',
        email: 'admin@bbm.com',
      } as UserType,
      changed_at: '2024-01-15T11:30:00Z',
      notes: 'Invoice dikonfirmasi oleh admin',
    },
  ])

  // Load invoice data
  useEffect(() => {
    const loadInvoice = async () => {
      if (!invoiceId || !selectedBranch) return

      setLoading(true)
      try {
        const invoiceData = await getInvoiceById(parseInt(invoiceId))
        setInvoice(invoiceData)
      } catch (error) {
        console.error('Error loading invoice:', error)
        toast.error('Gagal memuat data invoice')
        router.push('/invoicing')
      } finally {
        setLoading(false)
      }
    }

    loadInvoice()
  }, [invoiceId, selectedBranch])

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!invoice) return

    setUpdating(true)
    try {
      await updateInvoiceStatus(invoice.id, {
        status: newStatus as any, // Type conversion for compatibility
        notes: statusNotes || undefined,
      })

      // Update local state
      setInvoice({
        ...invoice,
        status: newStatus as any,
      })

      toast.success('Status invoice berhasil diperbarui')
      setShowStatusDialog(false)
      setStatusNotes('')
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Gagal memperbarui status invoice')
    } finally {
      setUpdating(false)
    }
  }

  // Handle payment update
  const handlePaymentUpdate = async () => {
    if (!invoice || paymentAmount <= 0) return

    setUpdating(true)
    try {
      await updateInvoiceStatus(invoice.id, {
        status: invoice.status,
        payment_amount: paymentAmount,
        notes: paymentNotes || undefined,
      })

      // Update local state (simplified - in real app would recalculate from API)
      const newAmountPaid = invoice.amount_paid + paymentAmount
      const newOutstanding = invoice.total_amount - newAmountPaid

      setInvoice({
        ...invoice,
        amount_paid: newAmountPaid,
        outstanding_amount: newOutstanding,
      })

      toast.success('Pembayaran berhasil dicatat')
      setShowPaymentDialog(false)
      setPaymentAmount(0)
      setPaymentNotes('')
    } catch (error) {
      console.error('Error updating payment:', error)
      toast.error('Gagal mencatat pembayaran')
    } finally {
      setUpdating(false)
    }
  }

  // Get current payment status
  const getPaymentStatus = (): PaymentStatus => {
    if (!invoice) return 'unpaid'

    if (invoice.amount_paid === 0) return 'unpaid'
    if (invoice.amount_paid >= invoice.total_amount) return 'paid'
    if (new Date(invoice.due_date) < new Date()) return 'overdue'
    return 'partial'
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className='flex items-center justify-center min-h-screen'>
            <div className='text-center'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto'></div>
              <p className='mt-4 text-muted-foreground text-sm'>
                Memuat data invoice...
              </p>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  if (!invoice) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className='flex items-center justify-center min-h-screen'>
            <div className='text-center'>
              <XCircle className='h-12 w-12 text-red-500 mx-auto mb-4' />
              <h1 className='text-xl font-semibold mb-2'>
                Invoice Tidak Ditemukan
              </h1>
              <p className='text-muted-foreground text-sm mb-4'>
                Invoice dengan ID {invoiceId} tidak ditemukan atau tidak dapat
                diakses.
              </p>
              <Button asChild size='sm'>
                <Link href='/invoicing'>
                  <ArrowLeft className='h-4 w-4 mr-2' />
                  Kembali ke Daftar Invoice
                </Link>
              </Button>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  const currentStatus = invoice.status as ExtendedInvoiceStatus
  const currentStatusConfig =
    STATUS_CONFIG[currentStatus] || STATUS_CONFIG.draft
  const StatusIcon = currentStatusConfig.icon
  const paymentStatus = getPaymentStatus()
  const paymentStatusConfig = PAYMENT_STATUS_CONFIG[paymentStatus]

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-4'>
          {/* Header */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
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
                <h1 className='text-xl font-semibold'>Detail Invoice</h1>
                <p className='text-xs text-muted-foreground'>
                  {invoice.invoice_number} • {invoice.customer_name}
                </p>
              </div>
            </div>
            <div className='flex space-x-2'>
              <Button variant='outline' size='sm' className='h-8 text-xs'>
                <Printer className='h-3.5 w-3.5 mr-1.5' />
                Print
              </Button>
              <Button variant='outline' size='sm' className='h-8 text-xs'>
                <Download className='h-3.5 w-3.5 mr-1.5' />
                Download PDF
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setShowStatusDialog(true)}
                className='h-8 text-xs'
              >
                <Edit className='h-3.5 w-3.5 mr-1.5' />
                Update Status
              </Button>
            </div>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
            {/* Main Content */}
            <div className='lg:col-span-2 space-y-4'>
              {/* Invoice Status */}
              <Card className='shadow-sm bg-white'>
                <CardHeader className='pb-3 pt-4 px-4'>
                  <CardTitle className='text-base font-semibold flex items-center justify-between'>
                    <div className='flex items-center'>
                      <StatusIcon className='h-4 w-4 mr-2' />
                      Status Invoice
                    </div>
                    <div className='flex gap-2'>
                      <Badge
                        className={cn('text-xs', currentStatusConfig.color)}
                      >
                        {currentStatusConfig.label}
                      </Badge>
                      <Badge
                        className={cn('text-xs', paymentStatusConfig.color)}
                      >
                        {paymentStatusConfig.label}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className='px-4 py-3'>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-xs'>
                    <div>
                      <Label className='text-muted-foreground'>
                        Status Pesanan
                      </Label>
                      <div className='mt-1 flex items-center'>
                        <StatusIcon className='h-4 w-4 mr-2 text-current' />
                        <span className='font-medium'>
                          {currentStatusConfig.label}
                        </span>
                      </div>
                      <p className='text-muted-foreground mt-0.5'>
                        {currentStatusConfig.description}
                      </p>
                    </div>
                    <div>
                      <Label className='text-muted-foreground'>
                        Status Pembayaran
                      </Label>
                      <div className='mt-1'>
                        <span className='font-medium'>
                          {paymentStatusConfig.label}
                        </span>
                      </div>
                      <p className='text-muted-foreground mt-0.5'>
                        Dibayar: {formatCurrency(invoice.amount_paid)} dari{' '}
                        {formatCurrency(invoice.total_amount)}
                      </p>
                    </div>
                    <div>
                      <Label className='text-muted-foreground'>
                        Jatuh Tempo
                      </Label>
                      <div className='mt-1'>
                        <span className='font-medium'>
                          {format(new Date(invoice.due_date), 'dd MMM yyyy', {
                            locale: id,
                          })}
                        </span>
                      </div>
                      <p className='text-muted-foreground mt-0.5'>
                        {new Date(invoice.due_date) < new Date()
                          ? 'Sudah jatuh tempo'
                          : 'Belum jatuh tempo'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Invoice Items */}
              <Card className='shadow-sm bg-white'>
                <CardHeader className='pb-3 pt-4 px-4'>
                  <CardTitle className='text-base font-semibold flex items-center'>
                    <Package className='h-4 w-4 mr-2' />
                    Item Invoice ({invoice.items?.length || 0} item)
                  </CardTitle>
                </CardHeader>
                <CardContent className='px-4 pb-4'>
                  {invoice.items && invoice.items.length > 0 ? (
                    <div className='border rounded-md'>
                      <Table>
                        <TableHeader>
                          <TableRow className='bg-gray-50'>
                            <TableHead className='text-xs font-semibold'>
                              Produk
                            </TableHead>
                            <TableHead className='text-xs font-semibold text-center w-20'>
                              Qty
                            </TableHead>
                            <TableHead className='text-xs font-semibold text-right w-24'>
                              Harga
                            </TableHead>
                            <TableHead className='text-xs font-semibold text-right w-24'>
                              Diskon
                            </TableHead>
                            <TableHead className='text-xs font-semibold text-right w-28'>
                              Total
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoice.items.map((item, index) => (
                            <TableRow
                              key={item.id}
                              className='hover:bg-gray-50'
                            >
                              <TableCell className='py-3'>
                                <div className='space-y-1'>
                                  <div className='font-medium text-sm'>
                                    {item.product_name}
                                  </div>
                                  <div className='text-xs text-muted-foreground'>
                                    ID: {item.product_id}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className='text-center text-sm'>
                                {item.quantity}
                              </TableCell>
                              <TableCell className='text-right text-sm'>
                                {formatCurrency(item.price)}
                              </TableCell>
                              <TableCell className='text-right text-sm'>
                                {formatCurrency(item.discount_amount || 0)}
                              </TableCell>
                              <TableCell className='text-right text-sm font-semibold'>
                                {formatCurrency(
                                  item.quantity * item.price -
                                    (item.discount_amount || 0)
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className='text-center py-6 border border-dashed rounded-md'>
                      <Package className='h-8 w-8 mx-auto text-muted-foreground mb-2' />
                      <p className='text-sm text-muted-foreground'>
                        Tidak ada item dalam invoice ini.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status History */}
              <Card className='shadow-sm bg-white'>
                <CardHeader className='pb-3 pt-4 px-4'>
                  <CardTitle className='text-base font-semibold flex items-center'>
                    <History className='h-4 w-4 mr-2' />
                    Riwayat Status
                  </CardTitle>
                </CardHeader>
                <CardContent className='px-4 pb-4'>
                  <div className='space-y-3'>
                    {statusHistory.map((history, index) => {
                      const historyStatusConfig =
                        STATUS_CONFIG[history.status] || STATUS_CONFIG.draft
                      const HistoryIcon = historyStatusConfig.icon
                      const isLatest = index === statusHistory.length - 1

                      return (
                        <div
                          key={history.id}
                          className='flex items-start space-x-3'
                        >
                          <div
                            className={cn(
                              'flex items-center justify-center w-8 h-8 rounded-full border-2',
                              isLatest
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'bg-gray-100 border-gray-300 text-gray-600'
                            )}
                          >
                            <HistoryIcon className='h-4 w-4' />
                          </div>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center justify-between'>
                              <div className='flex items-center space-x-2'>
                                <span className='text-sm font-medium'>
                                  {historyStatusConfig.label}
                                </span>
                                {isLatest && (
                                  <Badge variant='outline' className='text-xs'>
                                    Status Saat Ini
                                  </Badge>
                                )}
                              </div>
                              <span className='text-xs text-muted-foreground'>
                                {format(
                                  new Date(history.changed_at),
                                  'dd MMM yyyy HH:mm',
                                  { locale: id }
                                )}
                              </span>
                            </div>
                            {history.notes && (
                              <p className='text-xs text-muted-foreground mt-1'>
                                {history.notes}
                              </p>
                            )}
                            <div className='flex items-center space-x-2 mt-1'>
                              <User className='h-3 w-3 text-muted-foreground' />
                              <span className='text-xs text-muted-foreground'>
                                {history.changed_by.name}
                              </span>
                              {history.payment_amount && (
                                <>
                                  <Separator
                                    orientation='vertical'
                                    className='h-3'
                                  />
                                  <DollarSign className='h-3 w-3 text-muted-foreground' />
                                  <span className='text-xs text-muted-foreground'>
                                    Pembayaran:{' '}
                                    {formatCurrency(history.payment_amount)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className='space-y-4'>
              {/* Quick Actions */}
              <Card className='shadow-sm bg-white'>
                <CardHeader className='pb-3 pt-4 px-4'>
                  <CardTitle className='text-base font-semibold'>
                    Aksi Cepat
                  </CardTitle>
                </CardHeader>
                <CardContent className='px-4 py-3 space-y-2'>
                  <Button
                    size='sm'
                    className='w-full text-xs justify-start h-8'
                    onClick={() => setShowStatusDialog(true)}
                  >
                    <Edit className='h-3.5 w-3.5 mr-2' />
                    Update Status
                  </Button>
                  {paymentStatus !== 'paid' && (
                    <Button
                      size='sm'
                      variant='outline'
                      className='w-full text-xs justify-start h-8'
                      asChild
                    >
                      <Link href={`/accounts-receivable/${invoiceId}`}>
                        <CreditCard className='h-3.5 w-3.5 mr-2' />
                        Lihat Piutang
                      </Link>
                    </Button>
                  )}
                  <Button
                    size='sm'
                    variant='outline'
                    className='w-full text-xs justify-start h-8'
                    asChild
                  >
                    <Link href={`/invoice/${invoiceId}`}>
                      <Eye className='h-3.5 w-3.5 mr-2' />
                      Lihat Preview
                    </Link>
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='w-full text-xs justify-start h-8'
                  >
                    <Printer className='h-3.5 w-3.5 mr-2' />
                    Print Invoice
                  </Button>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className='shadow-sm bg-white'>
                <CardHeader className='pb-3 pt-4 px-4'>
                  <CardTitle className='text-base font-semibold'>
                    Ringkasan Pembayaran
                  </CardTitle>
                </CardHeader>
                <CardContent className='px-4 py-3 space-y-2 text-xs'>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Subtotal:</span>
                    <span className='font-medium'>
                      {formatCurrency(invoice.subtotal)}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Pajak:</span>
                    <span className='font-medium'>
                      {formatCurrency(invoice.tax_amount)}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Ongkir:</span>
                    <span className='font-medium'>
                      {formatCurrency(invoice.shipping_cost)}
                    </span>
                  </div>
                  <Separator />
                  <div className='flex justify-between font-semibold'>
                    <span>Total:</span>
                    <span>{formatCurrency(invoice.total_amount)}</span>
                  </div>
                  <div className='flex justify-between text-green-600'>
                    <span>Sudah Dibayar:</span>
                    <span className='font-medium'>
                      {formatCurrency(invoice.amount_paid)}
                    </span>
                  </div>
                  <div className='flex justify-between text-red-600 font-semibold'>
                    <span>Sisa Tagihan:</span>
                    <span>{formatCurrency(invoice.outstanding_amount)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Info */}
              {invoice.customer && (
                <Card className='shadow-sm bg-white'>
                  <CardHeader className='pb-3 pt-4 px-4'>
                    <CardTitle className='text-base font-semibold flex items-center'>
                      <Users className='h-4 w-4 mr-2' />
                      Informasi Customer
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='px-4 py-3'>
                    <div className='space-y-2 text-xs'>
                      <div className='font-medium text-sm'>
                        {invoice.customer.name}
                      </div>
                      {invoice.customer.email && (
                        <div className='text-muted-foreground'>
                          Email: {invoice.customer.email}
                        </div>
                      )}
                      {invoice.customer.phone && (
                        <div className='text-muted-foreground'>
                          Telepon: {invoice.customer.phone}
                        </div>
                      )}
                      {invoice.customer.address && (
                        <div className='text-muted-foreground'>
                          <MapPin className='h-3 w-3 inline mr-1' />
                          {invoice.customer.address}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Status Update Dialog */}
        <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <AlertDialogContent className='max-w-md'>
            <AlertDialogHeader>
              <AlertDialogTitle className='text-lg font-semibold'>
                Update Status Invoice
              </AlertDialogTitle>
              <AlertDialogDescription className='text-sm text-muted-foreground'>
                Pilih status baru untuk invoice ini dan berikan catatan jika
                diperlukan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className='space-y-4 py-4'>
              <div>
                <Label htmlFor='new_status' className='text-sm font-medium'>
                  Status Baru
                </Label>
                <Select
                  value={newStatus}
                  onValueChange={(value) =>
                    setNewStatus(value as ExtendedInvoiceStatus)
                  }
                >
                  <SelectTrigger className='mt-1'>
                    <SelectValue placeholder='Pilih status...' />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                      const StatusIcon = config.icon
                      return (
                        <SelectItem key={key} value={key} className='text-sm'>
                          <div className='flex items-center'>
                            <StatusIcon className='h-4 w-4 mr-2' />
                            {config.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor='status_notes' className='text-sm font-medium'>
                  Catatan (Opsional)
                </Label>
                <Textarea
                  id='status_notes'
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder='Tambahkan catatan untuk perubahan status ini...'
                  rows={3}
                  className='mt-1 text-sm resize-none'
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={updating} className='text-sm'>
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleStatusUpdate}
                disabled={updating || newStatus === currentStatus}
                className='text-sm'
              >
                {updating ? (
                  <>
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                    Memperbarui...
                  </>
                ) : (
                  'Update Status'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Payment Dialog */}
        <AlertDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
        >
          <AlertDialogContent className='max-w-md'>
            <AlertDialogHeader>
              <AlertDialogTitle className='text-lg font-semibold'>
                Catat Pembayaran
              </AlertDialogTitle>
              <AlertDialogDescription className='text-sm text-muted-foreground'>
                Masukkan jumlah pembayaran yang diterima untuk invoice ini.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className='space-y-4 py-4'>
              <div className='bg-gray-50 p-3 rounded-md space-y-1 text-xs'>
                <div className='flex justify-between'>
                  <span>Total Invoice:</span>
                  <span className='font-medium'>
                    {formatCurrency(invoice.total_amount)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span>Sudah Dibayar:</span>
                  <span className='font-medium'>
                    {formatCurrency(invoice.amount_paid)}
                  </span>
                </div>
                <div className='flex justify-between font-semibold'>
                  <span>Sisa Tagihan:</span>
                  <span>{formatCurrency(invoice.outstanding_amount)}</span>
                </div>
              </div>
              <div>
                <Label htmlFor='payment_amount' className='text-sm font-medium'>
                  Jumlah Pembayaran
                </Label>
                <Input
                  id='payment_amount'
                  type='number'
                  min='0'
                  max={invoice.outstanding_amount}
                  value={paymentAmount}
                  onChange={(e) =>
                    setPaymentAmount(parseFloat(e.target.value) || 0)
                  }
                  placeholder='0'
                  className='mt-1'
                />
              </div>
              <div>
                <Label htmlFor='payment_notes' className='text-sm font-medium'>
                  Catatan Pembayaran (Opsional)
                </Label>
                <Textarea
                  id='payment_notes'
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder='Metode pembayaran, referensi, atau catatan lainnya...'
                  rows={3}
                  className='mt-1 text-sm resize-none'
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={updating} className='text-sm'>
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handlePaymentUpdate}
                disabled={updating || paymentAmount <= 0}
                className='text-sm'
              >
                {updating ? (
                  <>
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                    Menyimpan...
                  </>
                ) : (
                  'Catat Pembayaran'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MainLayout>
    </ProtectedRoute>
  )
}
