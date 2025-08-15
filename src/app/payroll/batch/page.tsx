'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useBranches } from '@/contexts/branch-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import {
  PlusCircle,
  FilePenLine,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  DollarSign,
  Filter,
  CalendarIcon,
  Eye,
  TrendingUp,
} from 'lucide-react'
import { useDebounce } from '@uidotdev/usehooks'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { DateRange } from 'react-day-picker'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import {
  type Payroll,
  listPayrolls,
  deletePayroll,
} from '@/lib/laravel/payroll'
import { ITEMS_PER_PAGE_OPTIONS } from '@/lib/types'
import { formatCurrency } from '@/lib/helper'

const PAYMENT_TYPE_OPTIONS = [
  { value: '', label: 'Semua Jenis' },
  { value: 'daily', label: 'Harian' },
  { value: 'monthly', label: 'Bulanan' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'paid', label: 'Terbayar' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'cancelled', label: 'Dibatalkan' },
]

const PAYMENT_TYPE_LABELS = {
  daily: 'Harian',
  monthly: 'Bulanan',
}

const STATUS_LABELS = {
  paid: 'Terbayar',
  pending: 'Menunggu',
  cancelled: 'Dibatalkan',
}

const STATUS_COLORS = {
  paid: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

// Local date formatter
const formatDateIntl = (dateInput: string | Date) => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  return format(date, 'dd MMM yyyy')
}

export default function BatchPayrollPage() {
  const router = useRouter()
  const { selectedBranch, isLoadingBranches } = useBranches()

  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [totalPayrolls, setTotalPayrolls] = useState(0)
  const [loadingPayrolls, setLoadingPayrolls] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    ITEMS_PER_PAGE_OPTIONS[0]
  )
  const [currentPage, setCurrentPage] = useState(1)
  const [payrollToDelete, setPayrollToDelete] = useState<Payroll | null>(null)

  // Filter states
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [selectedPaymentTypes, setSelectedPaymentTypes] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })

  // Temporary filter states
  const [tempPaymentTypes, setTempPaymentTypes] =
    useState<string[]>(selectedPaymentTypes)
  const [tempStatuses, setTempStatuses] = useState<string[]>(selectedStatuses)
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(
    dateRange
  )

  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  // Compute summary from filtered payrolls
  const payrollSummary = payrolls.reduce<
    Record<string, { count: number; total: number }>
  >((acc, p) => {
    const status = p.status
    if (!acc[status]) {
      acc[status] = { count: 0, total: 0 }
    }
    acc[status].count += 1
    acc[status].total += Number(p.total_amount || 0)
    return acc
  }, {})

  const totalPayrollAmount = Object.values(payrollSummary).reduce(
    (sum, v) => sum + v.total,
    0
  )

  const loadPayrolls = useCallback(async () => {
    if (!selectedBranch?.id) {
      setPayrolls([])
      setLoadingPayrolls(false)
      setTotalPayrolls(0)
      return
    }

    try {
      setLoadingPayrolls(true)
      const response = await listPayrolls({
        branchId: selectedBranch.id,
        page: currentPage,
        limit: itemsPerPage,
        paymentType:
          selectedPaymentTypes.length === 1
            ? (selectedPaymentTypes[0] as any)
            : undefined,
        startDate: format(
          dateRange?.from || startOfMonth(new Date()),
          'yyyy-MM-dd'
        ),
        endDate: format(dateRange?.to || endOfMonth(new Date()), 'yyyy-MM-dd'),
      })

      setPayrolls(response.data)
      setTotalPayrolls(response.total)
    } catch (error) {
      toast.error('Gagal memuat data payroll')
    } finally {
      setLoadingPayrolls(false)
    }
  }, [
    selectedBranch?.id,
    currentPage,
    itemsPerPage,
    selectedPaymentTypes,
    selectedStatuses,
    dateRange,
    debouncedSearchTerm,
  ])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedBranch])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, selectedPaymentTypes, selectedStatuses, dateRange])

  useEffect(() => {
    loadPayrolls()
  }, [loadPayrolls])

  const handleDeletePayroll = async () => {
    if (!payrollToDelete) return
    try {
      await deletePayroll(payrollToDelete.id)
      toast.success('Payroll berhasil dihapus')
      await loadPayrolls()
    } catch (error: any) {
      let errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
        const firstErrorKey = Object.keys(validationErrors)[0]
        errorMessage = validationErrors[firstErrorKey][0]
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      toast.error('Gagal menghapus payroll', { description: errorMessage })
    }
    setPayrollToDelete(null)
  }

  const handleApplyFilters = () => {
    setSelectedPaymentTypes(tempPaymentTypes)
    setSelectedStatuses(tempStatuses)
    setDateRange(tempDateRange)
    setIsFilterOpen(false)
  }

  const handleResetFilters = () => {
    const now = new Date()
    const defaultStart = startOfMonth(now)
    const defaultEnd = endOfMonth(now)

    // Reset temp state
    setTempDateRange({ from: defaultStart, to: defaultEnd })
    setTempPaymentTypes([])
    setTempStatuses([])

    // Also apply them immediately to re-fetch
    setDateRange({ from: defaultStart, to: defaultEnd })
    setSelectedPaymentTypes([])
    setSelectedStatuses([])
    setIsFilterOpen(false)
  }

  const activeFilterCount =
    (selectedPaymentTypes.length > 0 ? 1 : 0) +
    (selectedStatuses.length > 0 ? 1 : 0) +
    (dateRange?.from || dateRange?.to ? 1 : 0)

  const totalPages = Math.ceil(totalPayrolls / itemsPerPage)

  if (isLoadingBranches) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className='space-y-4'>
            <Skeleton className='h-8 w-48' />
            <div className='space-y-2 border rounded-lg shadow-sm p-4'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
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
          <div className='flex flex-col sm:flex-row justify-between items-center gap-3'>
            <h1 className='text-xl md:text-2xl font-semibold font-headline'>
              Payroll {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            <div className='flex gap-2 w-full sm:w-auto items-center'>
              {/* Search */}
              <div className='relative flex-1 sm:flex-initial sm:w-64'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4' />
                <Input
                  type='text'
                  placeholder='Cari payroll...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='pl-10 text-sm h-9'
                />
              </div>

              {/* Filter */}
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-9 border-dashed'
                  >
                    <Filter className='mr-2 h-4 w-4' />
                    Filter
                    {activeFilterCount > 0 && (
                      <Badge
                        variant='secondary'
                        className='ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs'
                      >
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-80' align='end'>
                  <div className='space-y-4'>
                    <div className='space-y-2'>
                      <h4 className='font-medium leading-none'>
                        Filter Payroll
                      </h4>
                      <p className='text-sm text-muted-foreground'>
                        Atur filter untuk menyaring data payroll.
                      </p>
                    </div>

                    {/* Payment Type Filter */}
                    <div className='space-y-2'>
                      <label className='text-sm font-medium'>
                        Jenis Pembayaran
                      </label>
                      <div className='space-y-2'>
                        {PAYMENT_TYPE_OPTIONS.filter(
                          (opt) => opt.value !== ''
                        ).map((option) => (
                          <div
                            key={option.value}
                            className='flex items-center space-x-2'
                          >
                            <input
                              type='checkbox'
                              id={`payment-${option.value}`}
                              checked={tempPaymentTypes.includes(option.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTempPaymentTypes([
                                    ...tempPaymentTypes,
                                    option.value,
                                  ])
                                } else {
                                  setTempPaymentTypes(
                                    tempPaymentTypes.filter(
                                      (p) => p !== option.value
                                    )
                                  )
                                }
                              }}
                              className='rounded'
                            />
                            <label
                              htmlFor={`payment-${option.value}`}
                              className='text-sm'
                            >
                              {option.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div className='space-y-2'>
                      <label className='text-sm font-medium'>Status</label>
                      <div className='space-y-2'>
                        {STATUS_OPTIONS.filter((opt) => opt.value !== '').map(
                          (option) => (
                            <div
                              key={option.value}
                              className='flex items-center space-x-2'
                            >
                              <input
                                type='checkbox'
                                id={`status-${option.value}`}
                                checked={tempStatuses.includes(option.value)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTempStatuses([
                                      ...tempStatuses,
                                      option.value,
                                    ])
                                  } else {
                                    setTempStatuses(
                                      tempStatuses.filter(
                                        (s) => s !== option.value
                                      )
                                    )
                                  }
                                }}
                                className='rounded'
                              />
                              <label
                                htmlFor={`status-${option.value}`}
                                className='text-sm'
                              >
                                {option.label}
                              </label>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* Date Range */}
                    <div className='space-y-2'>
                      <label className='text-sm font-medium'>
                        Periode Tanggal
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant='outline'
                            className='w-full justify-start text-left font-normal'
                          >
                            <CalendarIcon className='mr-2 h-4 w-4' />
                            {tempDateRange?.from ? (
                              tempDateRange.to ? (
                                <>
                                  {format(tempDateRange.from, 'LLL dd, y')} -{' '}
                                  {format(tempDateRange.to, 'LLL dd, y')}
                                </>
                              ) : (
                                format(tempDateRange.from, 'LLL dd, y')
                              )
                            ) : (
                              <span>Pilih rentang tanggal</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-auto p-0' align='start'>
                          <Calendar
                            initialFocus
                            mode='range'
                            defaultMonth={tempDateRange?.from}
                            selected={tempDateRange}
                            onSelect={setTempDateRange}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className='flex justify-between pt-4 border-t'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={handleResetFilters}
                      >
                        Reset
                      </Button>
                      <Button size='sm' onClick={handleApplyFilters}>
                        Terapkan Filter
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Items per page */}
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => setItemsPerPage(parseInt(value))}
              >
                <SelectTrigger className='w-20 h-9'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Add New Button */}
              <Button
                onClick={() => router.push('/payroll/new')}
                size='sm'
                className='h-9'
              >
                <PlusCircle className='mr-2 h-4 w-4' />
                Tambah
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          {!loadingPayrolls && selectedBranch && (
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4'>
              <div className='bg-white border rounded-lg p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600'>
                      Total Payroll
                    </p>
                    <p className='text-2xl font-bold'>
                      {formatCurrency(totalPayrollAmount)}
                    </p>
                  </div>
                  <TrendingUp className='h-8 w-8 text-blue-600' />
                </div>
              </div>

              {(selectedStatuses.length
                ? selectedStatuses
                : Object.keys(payrollSummary)
              ).map((status) => (
                <div key={status} className='bg-white border rounded-lg p-4'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-medium text-gray-600'>
                        {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
                      </p>
                      <p className='text-lg font-semibold'>
                        {payrollSummary[status]?.count || 0} payroll
                      </p>
                      <p className='text-sm text-gray-500'>
                        {formatCurrency(payrollSummary[status]?.total || 0)}
                      </p>
                    </div>
                    <Badge
                      className={
                        STATUS_COLORS[status as keyof typeof STATUS_COLORS]
                      }
                    >
                      {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Main Content */}
          {loadingPayrolls ? (
            <div className='space-y-2 border rounded-lg shadow-sm p-4'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
            </div>
          ) : !selectedBranch ? (
            <div className='border rounded-lg shadow-sm overflow-hidden p-10 text-center'>
              <DollarSign className='mx-auto h-12 w-12 text-muted-foreground mb-4' />
              <h3 className='text-lg font-medium text-muted-foreground mb-2'>
                Pilih Cabang
              </h3>
              <p className='text-sm text-muted-foreground'>
                Silakan pilih cabang terlebih dahulu untuk melihat data payroll.
              </p>
            </div>
          ) : payrolls.length === 0 ? (
            <div className='border rounded-lg shadow-sm overflow-hidden p-10 text-center'>
              <DollarSign className='mx-auto h-12 w-12 text-muted-foreground mb-4' />
              <h3 className='text-lg font-medium text-muted-foreground mb-2'>
                Belum ada payroll
              </h3>
              <p className='text-sm text-muted-foreground mb-4'>
                Mulai dengan membuat payroll pertama Anda.
              </p>
              <Button onClick={() => router.push('/payroll/new')} size='sm'>
                <PlusCircle className='mr-2 h-4 w-4' />
                Buat Payroll Pertama
              </Button>
            </div>
          ) : (
            <div className='border rounded-lg shadow-sm overflow-hidden'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/50'>
                    <TableHead className='text-xs font-medium'>Kode</TableHead>
                    <TableHead className='text-xs font-medium'>Judul</TableHead>
                    <TableHead className='text-xs font-medium'>Jenis</TableHead>
                    <TableHead className='text-xs font-medium'>
                      Periode
                    </TableHead>
                    <TableHead className='text-right text-xs font-medium'>
                      Total
                    </TableHead>
                    <TableHead className='text-center text-xs font-medium'>
                      Status
                    </TableHead>
                    <TableHead className='text-center text-xs font-medium'>
                      Pegawai
                    </TableHead>
                    <TableHead className='w-20 text-center text-xs font-medium'>
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.map((payroll) => (
                    <TableRow key={payroll.id} className='hover:bg-muted/50'>
                      <TableCell className='font-medium text-xs'>
                        {payroll.payroll_code || `PAY-${payroll.id}`}
                      </TableCell>
                      <TableCell className='text-xs'>
                        <div>
                          <div className='font-medium'>{payroll.title}</div>
                          {payroll.description && (
                            <div className='text-muted-foreground text-[10px] mt-1'>
                              {payroll.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className='text-xs'>
                        <Badge variant='outline' className='text-[10px]'>
                          {PAYMENT_TYPE_LABELS[payroll.payment_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-xs'>
                        <div>
                          <div className='font-medium'>
                            {formatDateIntl(payroll.period_start)} -{' '}
                            {formatDateIntl(payroll.period_end)}
                          </div>
                          <div className='text-muted-foreground text-[10px] mt-1'>
                            Dibayar: {formatDateIntl(payroll.payment_date)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className='text-right text-xs font-medium'>
                        {formatCurrency(payroll.total_amount)}
                      </TableCell>
                      <TableCell className='text-center'>
                        <Badge
                          className={`text-[10px] ${
                            STATUS_COLORS[payroll.status]
                          }`}
                        >
                          {STATUS_LABELS[payroll.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-center text-xs'>
                        <div className='flex items-center justify-center'>
                          <span className='bg-muted text-muted-foreground px-2 py-1 rounded text-[10px]'>
                            {payroll.details?.length || 0} pegawai
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className='text-center'>
                        <Button
                          variant='ghost'
                          className='text-xs cursor-pointer'
                          onClick={() => router.push(`/payroll/${payroll.id}`)}
                        >
                          <Eye className='mr-2 h-3.5 w-3.5' />
                        </Button>

                        <Button
                          variant='ghost'
                          className='text-xs cursor-pointer'
                          onClick={() =>
                            router.push(`/payroll/${payroll.id}/edit`)
                          }
                        >
                          <FilePenLine className='mr-2 h-3.5 w-3.5' />
                        </Button>

                        <Button
                          variant='ghost'
                          className='text-xs cursor-pointer text-destructive'
                          onClick={() => setPayrollToDelete(payroll)}
                        >
                          <Trash2 className='mr-2 h-3.5 w-3.5' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          <div className='flex justify-between items-center pt-2'>
            <Button
              variant='outline'
              size='sm'
              className='text-xs h-8'
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loadingPayrolls}
            >
              <ChevronLeft className='h-4 w-4 mr-1' />
              Sebelumnya
            </Button>
            <span className='text-xs text-muted-foreground'>
              Halaman {currentPage} dari {totalPages}
            </span>
            <Button
              variant='outline'
              size='sm'
              className='text-xs h-8'
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage >= totalPages || loadingPayrolls}
            >
              Berikutnya
              <ChevronRight className='h-4 w-4 ml-1' />
            </Button>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!payrollToDelete}
          onOpenChange={() => setPayrollToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Payroll</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus payroll "
                {payrollToDelete?.title}"? Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePayroll}
                className='bg-destructive hover:bg-destructive/90'
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
