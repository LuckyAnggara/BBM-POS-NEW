'use client'

import React, { useState, useEffect, useCallback } from 'react'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/auth-context'
import { useBranches } from '@/contexts/branch-context'
import { Button } from '@/components/ui/button'
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
  PlusCircle,
  Eye,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  CalendarIcon,
  Search,
  FilterX,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import {
  type PurchaseOrder,
  type PurchaseOrderStatus,
  type PurchaseOrderPaymentStatus,
  ITEMS_PER_PAGE_OPTIONS,
} from '@/lib/types'
import {
  listPurchaseOrders,
  updatePurchaseOrderStatus,
} from '@/lib/laravel/purchaseOrderService'
import { format, isBefore, startOfDay } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { useDebounce } from '@uidotdev/usehooks'
import { formatDateIntl } from '@/lib/helper'

const ALL_PO_STATUSES: PurchaseOrderStatus[] = [
  'draft',
  'ordered',
  'partially_received',
  'fully_received',
  'cancelled',
]
const ALL_PAYMENT_STATUSES: PurchaseOrderPaymentStatus[] = [
  'unpaid',
  'partially_paid',
  'paid',
  'overdue',
]

export default function PurchaseOrdersPage() {
  const { currentUser } = useAuth()
  const { selectedBranch } = useBranches()

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [poToUpdate, setPoToUpdate] = useState<{
    id: number
    newStatus: PurchaseOrderStatus
    po_number: string
  } | null>(null)

  // Filter states
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth() + 1, 0)
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    ITEMS_PER_PAGE_OPTIONS[0]
  )
  const [totalItems, setTotalItems] = useState(0)
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const [currentPage, setCurrentPage] = useState(1)
  const [statusPoFilter, setStatusPoFilter] = useState<
    PurchaseOrderStatus | 'all'
  >('all')
  const [paymentStatusPoFilter, setPaymentStatusPoFilter] = useState<
    PurchaseOrderPaymentStatus | 'all'
  >('all')

  const debouncedSearchTerm = useDebounce(searchTerm, 1000)

  const fetchTransactions = useCallback(
    async (page: number, currentSearchTerm: string) => {
      if (!selectedBranch || !startDate || !endDate) {
        setPurchaseOrders([])
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      try {
        const options = {
          branchId: selectedBranch.id,
          limit: itemsPerPage,
          search: currentSearchTerm || undefined,
          start_date: startDate,
          end_date: endDate,
          page: page || 1,
        }

        const fetchedPOs = await listPurchaseOrders(options)
        setPurchaseOrders(fetchedPOs.data)
        setIsLoading(false)
        if (fetchedPOs.total === 0) {
          toast.info('Tidak Ada Pesanan', {
            description:
              'Tidak ada pesanan pembelian ditemukan untuk filter tanggal yang dipilih.',
          })
        }
      } catch (error) {
        toast.error('Gagal Memuat Pesanan', {
          description:
            'Terjadi kesalahan saat mengambil data pesanan pembelian.',
        })
        setIsLoading(false)
      }
    },
    [selectedBranch, startDate, endDate, toast]
  )

  useEffect(() => {
    if (selectedBranch) {
      if (startDate && endDate) {
        fetchTransactions(currentPage, debouncedSearchTerm)
      }
    } else {
      // No branch_id selected, clear data
      setPurchaseOrders([])
      setIsLoading(false)
    }
  }, [
    selectedBranch,
    startDate,
    endDate,
    fetchTransactions,
    debouncedSearchTerm,
  ])

  const handleApplyFilters = () => {
    if (!startDate || !endDate) {
      toast.error('Pilih Rentang Tanggal', {
        description:
          'Silakan pilih tanggal mulai dan akhir untuk filter tanggal.',
      })
      return
    }

    fetchTransactions(currentPage, debouncedSearchTerm)
  }

  const handleClearFilters = () => {
    setStartDate(undefined)
    setEndDate(undefined)
    setSearchTerm('')
    setStatusPoFilter('all')
    setPaymentStatusPoFilter('all')
    // useEffect will handle fetching default data when startDate/endDate become undefined
  }

  const handleUpdateStatus = async () => {
    if (!poToUpdate || !selectedBranch) return

    try {
      setIsUpdatingStatus(true)
      const result = await updatePurchaseOrderStatus(
        poToUpdate.id,
        poToUpdate.newStatus
      )
      toast.success('Status Diperbarui', {
        description: `Status ${
          poToUpdate.po_number
        } telah diubah menjadi ${getPOStatusText(poToUpdate.newStatus)}. `,
      })
      fetchTransactions(currentPage, debouncedSearchTerm)
    } catch (error: any) {
      toast.error('Gagal Update Status', {
        description: error.message,
      })
    } finally {
      setIsUpdatingStatus(false)
      setShowConfirmDialog(false)
      setPoToUpdate(null)
    }
  }

  const openConfirmDialog = (
    po: PurchaseOrder,
    newStatus: PurchaseOrderStatus
  ) => {
    setPoToUpdate({ id: po.id, newStatus, po_number: po.po_number })
    setShowConfirmDialog(true)
  }

  const getPOStatusBadgeVariant = (status: PurchaseOrderStatus) => {
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
    status: PurchaseOrderPaymentStatus,
    dueDateString?: string | null
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
    dueDateString?: string | null
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

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-4'>
          <div className='flex flex-col sm:flex-row justify-between items-center gap-3'>
            <h1 className='text-xl md:text-2xl font-semibold font-headline'>
              Pesanan Pembelian{' '}
              {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            <Button
              size='sm'
              className='rounded-md text-xs h-8'
              asChild
              disabled={!selectedBranch}
            >
              <Link href='/purchase-orders/new'>
                <PlusCircle className='mr-1.5 h-3.5 w-3.5' /> Buat Pesanan Baru
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader className='pb-3 pt-4 px-4'>
              <CardTitle className='text-base font-semibold'>
                Filter Pesanan Pembelian
              </CardTitle>
            </CardHeader>
            <CardContent className='px-4 pb-4'>
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-end'>
                <div>
                  <Label htmlFor='startDatePO' className='text-xs'>
                    Tanggal Awal
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full justify-start text-left font-normal h-8 text-xs mt-0.5',
                          !startDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className='mr-1.5 h-3.5 w-3.5' />
                        {startDate ? (
                          format(startDate, 'dd MMM yyyy')
                        ) : (
                          <span>Pilih tanggal</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-auto p-0'>
                      <Calendar
                        mode='single'
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor='endDatePO' className='text-xs'>
                    Tanggal Akhir
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full justify-start text-left font-normal h-8 text-xs mt-0.5',
                          !endDate && 'text-muted-foreground'
                        )}
                        disabled={!startDate}
                      >
                        <CalendarIcon className='mr-1.5 h-3.5 w-3.5' />
                        {endDate ? (
                          format(endDate, 'dd MMM yyyy')
                        ) : (
                          <span>Pilih tanggal</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-auto p-0'>
                      <Calendar
                        mode='single'
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        disabled={startDate ? { before: startDate } : undefined}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor='searchTermPO' className='text-xs'>
                    Cari PO/Pemasok
                  </Label>
                  <Input
                    id='searchTermPO'
                    placeholder='Ketik...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className='h-8 text-xs mt-0.5'
                  />
                </div>
                <div>
                  <Label htmlFor='statusPoFilter' className='text-xs'>
                    Status
                  </Label>
                  <Select
                    value={statusPoFilter}
                    onValueChange={(value) =>
                      setStatusPoFilter(value as PurchaseOrderStatus | 'all')
                    }
                  >
                    <SelectTrigger className='h-8 text-xs mt-0.5'>
                      <SelectValue placeholder='Semua Status' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all' className='text-xs'>
                        Semua Status
                      </SelectItem>
                      {ALL_PO_STATUSES.map((status) => (
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
                </div>
                <div>
                  <Label htmlFor='paymentStatusPoFilter' className='text-xs'>
                    Status Bayar (Kredit)
                  </Label>
                  <Select
                    value={paymentStatusPoFilter}
                    onValueChange={(value) =>
                      setPaymentStatusPoFilter(
                        value as PurchaseOrderPaymentStatus | 'all'
                      )
                    }
                  >
                    <SelectTrigger className='h-8 text-xs mt-0.5'>
                      <SelectValue placeholder='Semua Status Bayar' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all' className='text-xs'>
                        Semua Status Bayar
                      </SelectItem>
                      {ALL_PAYMENT_STATUSES.map((status) => (
                        <SelectItem
                          key={status}
                          value={status}
                          className='text-xs'
                        >
                          {getPaymentStatusText(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='flex gap-2 items-end lg:col-start-4 lg:col-span-2'>
                  <Button
                    onClick={handleApplyFilters}
                    size='sm'
                    className='h-8 text-xs flex-grow'
                    disabled={isLoading || !selectedBranch}
                  >
                    <Filter className='mr-1.5 h-3.5 w-3.5' /> Terapkan
                  </Button>
                  <Button
                    onClick={handleClearFilters}
                    variant='outline'
                    size='sm'
                    className='h-8 text-xs flex-grow'
                    disabled={isLoading || !selectedBranch}
                  >
                    <FilterX className='mr-1.5 h-3.5 w-3.5' /> Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className='space-y-2 border rounded-lg shadow-sm p-4'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
            </div>
          ) : !selectedBranch ? (
            <div className='border rounded-lg shadow-sm overflow-hidden p-10 text-center'>
              <p className='text-sm text-muted-foreground'>
                Pilih cabang untuk mengelola pesanan pembelian.
              </p>
            </div>
          ) : purchaseOrders.length === 0 ? (
            <div className='border rounded-lg shadow-sm overflow-hidden p-10 text-center'>
              <p className='text-sm text-muted-foreground'>
                {purchaseOrders.length === 0 && !startDate && !endDate
                  ? 'Belum ada pesanan pembelian untuk cabang ini.'
                  : 'Tidak ada pesanan pembelian yang cocok dengan filter Anda.'}
              </p>
              {purchaseOrders.length === 0 && !startDate && !endDate && (
                <Button size='sm' className='mt-4 text-xs' asChild>
                  <Link href='/purchase-orders/new'>
                    <PlusCircle className='mr-1.5 h-3.5 w-3.5' /> Buat Pesanan
                    Pembelian Pertama
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className='border rounded-lg shadow-sm overflow-hidden'>
              <Table>
                <TableCaption className='text-xs'>
                  Daftar pesanan pembelian untuk{' '}
                  {selectedBranch?.name || 'cabang terpilih'}.
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-xs'>No. PO</TableHead>
                    <TableHead className='text-xs hidden sm:table-cell'>
                      Pemasok
                    </TableHead>
                    <TableHead className='text-xs'>Tgl Pesan</TableHead>
                    <TableHead className='text-xs hidden md:table-cell'>
                      Jenis Beli
                    </TableHead>
                    <TableHead className='text-xs text-center'>
                      Status
                    </TableHead>
                    <TableHead className='text-xs text-center hidden md:table-cell'>
                      Status Bayar
                    </TableHead>
                    <TableHead className='text-right text-xs'>Total</TableHead>
                    <TableHead className='text-center text-xs w-[80px]'>
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className='py-2 text-xs font-medium'>
                        {po.po_number || po.id}
                      </TableCell>
                      <TableCell className='py-2 text-xs hidden sm:table-cell'>
                        {po.supplier_name}
                      </TableCell>
                      <TableCell className='py-2 text-xs'>
                        {formatDateIntl(po.order_date)}
                      </TableCell>
                      <TableCell className='py-2 text-xs hidden md:table-cell'>
                        {po.is_credit ? 'Kredit' : 'Tunai'}
                      </TableCell>
                      <TableCell className='py-2 text-xs text-center'>
                        <Badge
                          variant={getPOStatusBadgeVariant(po.status)}
                          className={cn(
                            po.status === 'fully_received' &&
                              'bg-green-600 text-white hover:bg-green-700',
                            po.status === 'ordered' &&
                              'bg-blue-500 text-white hover:bg-blue-600',
                            po.status === 'partially_received' &&
                              'bg-yellow-500 text-white hover:bg-yellow-600'
                          )}
                        >
                          {getPOStatusText(po.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className='py-2 text-xs text-center hidden md:table-cell'>
                        {po.is_credit ? (
                          <Badge
                            variant={getPaymentStatusBadgeVariant(
                              po.payment_status,
                              po?.payment_due_date
                            )}
                            className={cn(
                              po.payment_status === 'paid' &&
                                'bg-green-600 hover:bg-green-700 text-white',
                              po.payment_status === 'partially_paid' &&
                                'border-yellow-500 text-yellow-600'
                            )}
                          >
                            {getPaymentStatusText(
                              po.payment_status,
                              po.payment_due_date
                            )}
                          </Badge>
                        ) : (
                          <span className='text-muted-foreground'>-</span>
                        )}
                      </TableCell>
                      <TableCell className='text-right py-2 text-xs'>
                        {formatCurrency(po.total_amount)}
                      </TableCell>
                      <TableCell className='text-center py-1.5 flex flex-row gap-2 items-center'>
                        <Link href={`/purchase-orders/${po.id}`}>
                          <Eye className='mr-2 h-3.5 w-3.5' />
                        </Link>
                        {po.status === 'draft' && (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='text-xs cursor-pointer h-7 w-7 '
                            onClick={() => openConfirmDialog(po, 'ordered')}
                            disabled={isUpdatingStatus}
                          >
                            <CheckCircle className='mr-2 h-3.5 w-3.5' />
                          </Button>
                        )}
                        {(po.status === 'draft' || po.status === 'ordered') && (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-7 w-7 text-xs cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10'
                            onClick={() => openConfirmDialog(po, 'cancelled')}
                            disabled={isUpdatingStatus}
                          >
                            <XCircle className='mr-2 h-3.5 w-3.5' />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <AlertDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Perubahan Status</AlertDialogTitle>
              <AlertDialogDescription className='text-xs'>
                Apakah Anda yakin ingin mengubah status untuk PO{' '}
                <strong>{poToUpdate?.po_number}</strong> menjadi{' '}
                <strong>"{getPOStatusText(poToUpdate?.newStatus)}"</strong>?
                {poToUpdate?.newStatus === 'ordered' &&
                  ' Ini menandakan pesanan telah dikirim ke pemasok.'}
                {poToUpdate?.newStatus === 'cancelled' &&
                  ' Tindakan ini tidak dapat diurungkan.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                className='text-xs h-8'
                onClick={() => {
                  setShowConfirmDialog(false)
                  setPoToUpdate(null)
                }}
                disabled={isUpdatingStatus}
              >
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                className={cn(
                  'text-xs h-8',
                  poToUpdate?.newStatus === 'cancelled' &&
                    'bg-destructive hover:bg-destructive/90'
                )}
                onClick={handleUpdateStatus}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus
                  ? 'Memproses...'
                  : `Ya, ${
                      poToUpdate?.newStatus === 'ordered'
                        ? 'Tandai Dipesan'
                        : 'Batalkan PO'
                    }`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MainLayout>
    </ProtectedRoute>
  )
}
