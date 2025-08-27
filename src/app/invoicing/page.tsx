'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/auth-context'
import { useBranches } from '@/contexts/branch-context'
import { useDebounce } from '@uidotdev/usehooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
} from '@/components/ui/alert-dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  PlusCircle,
  Search,
  Eye,
  FileText,
  Download,
  Edit,
  Calendar as CalendarIcon,
  DollarSign,
  Users,
  Package,
  ChevronLeft,
  ChevronRight,
  Filter,
  FilterX,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  CircleDollarSign,
  ArrowUpRight,
  TrendingUp,
  ArrowDownRight,
  Wallet,
  Receipt,
  CreditCard,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { format, isBefore, startOfDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { toast } from 'sonner'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'

import {
  listInvoices,
  getInvoiceSummary,
  deleteInvoice,
  downloadInvoicePDF,
  type InvoiceSummary,
} from '@/lib/laravel/invoiceService'
import type { Invoice, InvoiceStatus, ListInvoicesParams } from '@/lib/types'

// Constants
const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]
const ALL_INVOICE_STATUSES: InvoiceStatus[] = [
  'draft',
  'unpaid',
  'partial',
  'paid',
  'overdue',
]

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const getStatusBadgeVariant = (status: InvoiceStatus) => {
  switch (status) {
    case 'draft':
      return 'secondary'
    case 'unpaid':
      return 'warning'
    case 'partial':
      return 'info'
    case 'paid':
      return 'success'
    case 'overdue':
      return 'destructive'
    default:
      return 'secondary'
  }
}

const getStatusLabel = (status: InvoiceStatus) => {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'unpaid':
      return 'Belum Dibayar'
    case 'partial':
      return 'Dibayar Sebagian'
    case 'paid':
      return 'Lunas'
    case 'overdue':
      return 'Jatuh Tempo'
    default:
      return status
  }
}

const getStatusIcon = (status: InvoiceStatus) => {
  switch (status) {
    case 'draft':
      return <FileText className='h-4 w-4 mr-1' />
    case 'unpaid':
      return <Clock className='h-4 w-4 mr-1' />
    case 'partial':
      return <CircleDollarSign className='h-4 w-4 mr-1' />
    case 'paid':
      return <CheckCircle className='h-4 w-4 mr-1' />
    case 'overdue':
      return <AlertCircle className='h-4 w-4 mr-1' />
    default:
      return null
  }
}

// Card analytics component
const AnalyticsCard = ({
  title,
  value,
  description,
  icon,
  trend = null,
  trendValue = null,
  isLoading = false,
}) => {
  const getTrendIcon = () => {
    if (trend === 'up')
      return <ArrowUpRight className='h-4 w-4 text-emerald-500' />
    if (trend === 'down')
      return <ArrowDownRight className='h-4 w-4 text-red-500' />
    return null
  }

  return (
    <Card className='shadow-sm hover:shadow-md transition-shadow duration-200'>
      <CardHeader className='pb-2'>
        <div className='flex justify-between items-center'>
          <CardTitle className='text-base font-medium'>{title}</CardTitle>
          <div className='p-2 bg-muted rounded-md'>{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className='h-8 w-1/2 mb-2' />
        ) : (
          <div className='text-2xl font-bold mb-1'>{value}</div>
        )}
        <div className='flex items-center text-xs text-muted-foreground'>
          {description}
          {trend && (
            <div className='flex items-center ml-2 font-medium'>
              {getTrendIcon()}
              <span
                className={cn(
                  'ml-1',
                  trend === 'up'
                    ? 'text-emerald-500'
                    : trend === 'down'
                    ? 'text-red-500'
                    : ''
                )}
              >
                {trendValue}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function InvoicingPage() {
  const router = useRouter()
  const { currentUser } = useAuth()
  const { selectedBranch } = useBranches()

  // State for data
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Date range filter
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth() + 1, 0)
  })

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_OPTIONS[0])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Fetch invoice data and summary
  const loadInvoices = useCallback(async () => {
    if (!selectedBranch || !startDate || !endDate) {
      setInvoices([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const params: ListInvoicesParams = {
        branchId: selectedBranch.id,
        status:
          statusFilter === 'all' ? undefined : (statusFilter as InvoiceStatus),
        searchTerm: debouncedSearchTerm || undefined,
        page: currentPage,
        limit: itemsPerPage,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      }

      // Fetch invoices and summary in parallel
      const [invoiceResponse, summaryResponse] = await Promise.all([
        listInvoices(params),
        getInvoiceSummary(selectedBranch.id),
      ])

      setInvoices(invoiceResponse.data || [])
      setTotalItems(invoiceResponse.total || 0)
      setTotalPages(Math.ceil((invoiceResponse.total || 0) / itemsPerPage))
      setInvoiceSummary(summaryResponse)
    } catch (error) {
      console.error('Error loading invoices:', error)
      toast.error('Gagal memuat data faktur')
    } finally {
      setLoading(false)
    }
  }, [
    selectedBranch,
    statusFilter,
    debouncedSearchTerm,
    currentPage,
    itemsPerPage,
    startDate,
    endDate,
  ])

  // Load data on param changes
  useEffect(() => {
    if (selectedBranch) {
      loadInvoices()
    }
  }, [
    selectedBranch,
    statusFilter,
    debouncedSearchTerm,
    currentPage,
    itemsPerPage,
    startDate,
    endDate,
    loadInvoices,
  ])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, debouncedSearchTerm, itemsPerPage, startDate, endDate])

  // Reset filters
  const handleResetFilters = () => {
    const today = new Date()
    setSearchTerm('')
    setStatusFilter('all')
    setStartDate(new Date(today.getFullYear(), today.getMonth(), 1))
    setEndDate(new Date(today.getFullYear(), today.getMonth() + 1, 0))
  }

  // Handle invoice PDF download
  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      const blob = await downloadInvoicePDF(invoice.id)
      const url = window.URL.createObjectURL(blob)

      // Create a link and trigger download
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `Invoice-${invoice.invoice_number}.pdf`
      document.body.appendChild(a)
      a.click()

      // Clean up
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`Invoice ${invoice.invoice_number} berhasil diunduh`)
    } catch (error) {
      console.error('Error downloading invoice PDF:', error)
      toast.error('Gagal mengunduh PDF faktur')
    }
  }

  // Handle invoice deletion
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const confirmDelete = (invoice: Invoice) => {
    setDeleteTarget(invoice)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      await deleteInvoice(deleteTarget.id)
      toast.success(`Faktur ${deleteTarget.invoice_number} berhasil dihapus`)
      loadInvoices()
    } catch (error) {
      console.error('Error deleting invoice:', error)
      toast.error('Gagal menghapus faktur')
    } finally {
      setIsDeleteDialogOpen(false)
      setDeleteTarget(null)
    }
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        {/* Header Section */}
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Faktur</h1>
            <p className='text-muted-foreground'>
              Kelola faktur untuk transaksi kredit pelanggan
            </p>
          </div>
          <div className='flex gap-2'>
            <Button asChild>
              <Link href='/invoicing/new'>
                <PlusCircle className='h-4 w-4 mr-2' />
                Buat Faktur Baru
              </Link>
            </Button>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
          <AnalyticsCard
            title='Total Faktur'
            value={
              invoiceSummary ? invoiceSummary.total_invoices.toString() : '0'
            }
            description='Jumlah faktur aktif'
            icon={<Receipt className='h-5 w-5 text-indigo-500' />}
            isLoading={loading}
          />
          <AnalyticsCard
            title='Total Tagihan'
            value={
              invoiceSummary
                ? formatCurrency(invoiceSummary.total_amount)
                : 'Rp0'
            }
            description='Nilai seluruh faktur'
            icon={<DollarSign className='h-5 w-5 text-emerald-500' />}
            isLoading={loading}
            trend='up'
            trendValue='2.5%'
          />
          <AnalyticsCard
            title='Belum Dibayar'
            value={
              invoiceSummary
                ? formatCurrency(invoiceSummary.total_outstanding)
                : 'Rp0'
            }
            description={`${
              invoiceSummary?.unpaid_count || 0
            } faktur menunggu pembayaran`}
            icon={<Wallet className='h-5 w-5 text-amber-500' />}
            isLoading={loading}
          />
          <AnalyticsCard
            title='Jatuh Tempo'
            value={
              invoiceSummary
                ? formatCurrency(invoiceSummary.overdue_amount)
                : 'Rp0'
            }
            description={`${
              invoiceSummary?.overdue_count || 0
            } faktur terlambat dibayar`}
            icon={<AlertCircle className='h-5 w-5 text-red-500' />}
            isLoading={loading}
            trend='down'
            trendValue='1.2%'
          />
        </div>

        {/* Filters */}
        <Card className='mb-6'>
          <CardContent className='p-4'>
            <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4'>
              {/* Search */}
              <div className='relative'>
                <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  type='search'
                  placeholder='Cari faktur atau pelanggan...'
                  className='pl-9'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder='Status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>Semua Status</SelectItem>
                    {ALL_INVOICE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {getStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      className='w-full justify-start text-left font-normal'
                    >
                      <CalendarIcon className='mr-2 h-4 w-4' />
                      {startDate ? (
                        format(startDate, 'PPP', { locale: id })
                      ) : (
                        <span>Tanggal Mulai</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0'>
                    <Calendar
                      mode='single'
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      locale={id}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      className='w-full justify-start text-left font-normal'
                    >
                      <CalendarIcon className='mr-2 h-4 w-4' />
                      {endDate ? (
                        format(endDate, 'PPP', { locale: id })
                      ) : (
                        <span>Tanggal Akhir</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0'>
                    <Calendar
                      mode='single'
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      locale={id}
                      disabled={(date) =>
                        startDate
                          ? isBefore(date, startOfDay(startDate))
                          : false
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Actions */}
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='icon'
                  onClick={handleResetFilters}
                  title='Reset filter'
                >
                  <FilterX className='h-4 w-4' />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  onClick={() => loadInvoices()}
                  title='Muat ulang'
                >
                  <RefreshCw className='h-4 w-4' />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card>
          <CardContent className='p-0'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[120px]'>No. Faktur</TableHead>
                  <TableHead className='w-[160px]'>Tanggal</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead className='text-right'>Total</TableHead>
                  <TableHead className='text-right'>Dibayar</TableHead>
                  <TableHead className='text-right'>Sisa</TableHead>
                  <TableHead className='w-[110px]'>Status</TableHead>
                  <TableHead className='w-[170px] text-right'>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Loading skeletons
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      {Array.from({ length: 8 }).map((_, cellIndex) => (
                        <TableCell key={`cell-${index}-${cellIndex}`}>
                          <Skeleton className='h-5 w-full' />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className='h-32 text-center'>
                      <div className='flex flex-col items-center justify-center text-muted-foreground'>
                        <FileText className='h-8 w-8 mb-2' />
                        <p>Tidak ada faktur ditemukan</p>
                        <Button
                          variant='link'
                          onClick={handleResetFilters}
                          className='mt-2'
                        >
                          Reset Filter
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  // Invoices data
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id} className='group'>
                      <TableCell className='font-medium'>
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-col'>
                          <span>
                            {invoice.invoice_date
                              ? format(
                                  new Date(invoice.invoice_date),
                                  'dd MMM yyyy'
                                )
                              : 'Tidak ada'}
                          </span>
                          <span className='text-xs text-muted-foreground'>
                            Jatuh tempo:{' '}
                            {invoice.due_date
                              ? format(
                                  new Date(invoice.due_date),
                                  'dd MMM yyyy'
                                )
                              : 'Tidak ada'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-col'>
                          <span>{invoice.customer.name}</span>
                          <span className='text-xs text-muted-foreground truncate max-w-xs'>
                            {invoice.customer.phone ||
                              invoice.customer.email ||
                              '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className='text-right font-medium'>
                        {formatCurrency(invoice.total_amount)}
                      </TableCell>
                      <TableCell className='text-right'>
                        {formatCurrency(invoice.amount_paid)}
                      </TableCell>
                      <TableCell className='text-right'>
                        {formatCurrency(invoice.outstanding_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(invoice.status)}
                          className='gap-1 min-w-[100px] justify-center'
                        >
                          {getStatusIcon(invoice.status)}
                          {getStatusLabel(invoice.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex justify-end gap-1 opacity-70 group-hover:opacity-100'>
                          <Button variant='ghost' size='icon' asChild>
                            <Link href={`/invoicing/${invoice.id}`}>
                              <Eye className='h-4 w-4' />
                            </Link>
                          </Button>
                          <Button variant='ghost' size='icon' asChild>
                            <Link href={`/invoice/${invoice.id}`}>
                              <FileText className='h-4 w-4' />
                            </Link>
                          </Button>
                          {invoice.status === 'draft' && (
                            <Button variant='ghost' size='icon' asChild>
                              <Link href={`/invoicing/${invoice.id}/edit`}>
                                <Edit className='h-4 w-4' />
                              </Link>
                            </Button>
                          )}
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => handleDownloadPDF(invoice)}
                          >
                            <Download className='h-4 w-4' />
                          </Button>
                          {invoice.status === 'draft' && (
                            <Button
                              variant='ghost'
                              size='icon'
                              onClick={() => confirmDelete(invoice)}
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>

          {/* Pagination */}
          {totalPages > 0 && (
            <CardFooter className='flex justify-between items-center py-4 border-t bg-muted/20'>
              <div className='flex items-center gap-3 text-sm text-muted-foreground'>
                <span>Menampilkan</span>
                <div className='flex items-center gap-2'>
                  <Select
                    value={String(itemsPerPage)}
                    onValueChange={(value) => setItemsPerPage(Number(value))}
                  >
                    <SelectTrigger className='h-8 w-16 text-xs font-medium border border-border/50 hover:border-border transition-colors'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent side='top'>
                      {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                        <SelectItem
                          key={option}
                          value={String(option)}
                          className='text-xs'
                        >
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>dari</span>
                  <span className='font-medium text-foreground'>
                    {totalItems}
                  </span>
                  <span>faktur</span>
                </div>
              </div>

              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 px-3 text-xs'
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className='h-3.5 w-3.5 mr-1' />
                  Sebelumnya
                </Button>

                <div className='flex items-center gap-1 px-3 py-1.5 rounded-md bg-muted/50 border border-border/30'>
                  <span className='text-xs text-muted-foreground'>Halaman</span>
                  <span className='font-semibold text-sm px-2 py-0.5 bg-background rounded border min-w-[28px] text-center'>
                    {currentPage}
                  </span>
                  <span className='text-xs text-muted-foreground'>dari</span>
                  <span className='font-medium text-sm'>{totalPages}</span>
                </div>

                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 px-3 text-xs'
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                >
                  Selanjutnya
                  <ChevronRight className='h-3.5 w-3.5 ml-1' />
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Hapus Faktur</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus faktur{' '}
                <span className='font-semibold'>
                  {deleteTarget?.invoice_number}
                </span>
                ? Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className='bg-destructive text-destructive-foreground'
              >
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MainLayout>
    </ProtectedRoute>
  )
}
