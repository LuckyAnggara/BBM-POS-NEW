'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/auth-context'
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
  TableCaption,
} from '@/components/ui/table'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PlusCircle,
  FilePenLine,
  Trash2,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  UserPlus,
  Calendar,
  ArrowLeft,
} from 'lucide-react'
import { useDebounce } from '@uidotdev/usehooks'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import {
  type Payroll,
  listPayrolls,
  deletePayroll,
} from '@/lib/laravel/payroll'
import { ITEMS_PER_PAGE_OPTIONS } from '@/lib/types'
import { formatCurrency } from '@/lib/helper'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

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

export default function PayrollPage() {
  const router = useRouter()
  const { userData } = useAuth()
  const { selectedBranch, isLoadingBranches } = useBranches()

  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [totalPayrolls, setTotalPayrolls] = useState(0)
  const [loadingPayrolls, setLoadingPayrolls] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<
    'daily' | 'monthly' | ''
  >('')
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    ITEMS_PER_PAGE_OPTIONS[0]
  )
  const totalPages = Math.ceil(totalPayrolls / itemsPerPage)

  const debouncedSearchTerm = useDebounce(searchTerm, 1000)

  const [currentPage, setCurrentPage] = useState(1)

  const fetchData = useCallback(
    async (page: number, currentSearchTerm: string) => {
      if (!selectedBranch) {
        setPayrolls([])
        setLoadingPayrolls(false)
        setTotalPayrolls(0)
        return
      }
      setLoadingPayrolls(true)

      const options = {
        branchId: selectedBranch.id,
        limit: itemsPerPage,
        page: page || 1,
        paymentType: (paymentTypeFilter || undefined) as
          | 'daily'
          | 'monthly'
          | undefined,
      }

      try {
        const result = await listPayrolls(options)
        setPayrolls(result.data)
        setTotalPayrolls(result.total)
        setLoadingPayrolls(false)
      } catch (error) {
        console.error('Error fetching payrolls:', error)
        toast.error('Gagal memuat data payroll')
        setLoadingPayrolls(false)
      }
    },
    [selectedBranch, itemsPerPage, paymentTypeFilter]
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedBranch, itemsPerPage, debouncedSearchTerm, paymentTypeFilter])

  useEffect(() => {
    if (!selectedBranch) {
      setPayrolls([])
      setLoadingPayrolls(false)
      return
    }

    fetchData(currentPage, debouncedSearchTerm)
  }, [currentPage, debouncedSearchTerm, selectedBranch, fetchData])

  const handleDeletePayroll = async (
    payrollId: number,
    payrollCode: string
  ) => {
    try {
      await deletePayroll(payrollId)
      toast.success('Payroll Dihapus', {
        description: `${payrollCode} telah dihapus dari sistem.`,
      })
      await fetchData(1, debouncedSearchTerm)
    } catch (error: any) {
      console.error('Gagal menghapus payroll:', error)
      let errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      toast.error('Gagal Menghapus Payroll', {
        description: errorMessage,
      })
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => prevPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => prevPage - 1)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoadingBranches && !selectedBranch) {
    return (
      <MainLayout>
        <div className='flex h-full items-center justify-center'>
          Memuat data cabang...
        </div>
      </MainLayout>
    )
  }

  if (!selectedBranch && userData?.role === 'admin') {
    return (
      <MainLayout>
        <div className='p-4 text-center'>
          Silakan pilih cabang dari sidebar untuk mengelola payroll.
        </div>
      </MainLayout>
    )
  }

  if (!selectedBranch && userData?.role === 'cashier') {
    return (
      <MainLayout>
        <div className='p-4 text-center text-destructive'>
          Anda tidak terhubung ke cabang. Hubungi admin.
        </div>
      </MainLayout>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-4'>
          <div className='flex items-center gap-3'>
            <Button
              variant='outline'
              size='icon'
              className='h-9 w-9'
              onClick={() => router.back()}
            >
              <ArrowLeft className='h-4 w-4' />
            </Button>
            <h1 className='text-xl md:text-2xl font-semibold font-headline'>
              Payroll & Penggajian{' '}
              {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
          </div>

          <div className='flex flex-col sm:flex-row justify-between items-center gap-3'>
            <div className='flex flex-wrap gap-2 w-full sm:w-auto justify-start'>
              <div className='relative flex-grow sm:flex-grow-0'>
                <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
                <Input
                  type='search'
                  placeholder='Cari payroll...'
                  className='pl-8 w-full sm:w-80 rounded-md h-9 text-xs'
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                  }}
                />
              </div>
              <Select
                value={paymentTypeFilter}
                onValueChange={(value) => {
                  setPaymentTypeFilter(
                    value === 'all' ? '' : (value as 'daily' | 'monthly')
                  )
                }}
              >
                <SelectTrigger className='h-9 text-xs rounded-md w-auto sm:w-[120px]'>
                  <SelectValue placeholder='Jenis' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all' className='text-xs'>
                    Semua Jenis
                  </SelectItem>
                  <SelectItem value='daily' className='text-xs'>
                    Harian
                  </SelectItem>
                  <SelectItem value='monthly' className='text-xs'>
                    Bulanan
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value))
                }}
              >
                <SelectTrigger className='h-9 text-xs rounded-md w-auto sm:w-[100px]'>
                  <SelectValue placeholder='Tampil' />
                </SelectTrigger>
                <SelectContent>
                  {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem
                      key={option}
                      value={option.toString()}
                      className='text-xs'
                    >
                      Tampil {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='flex gap-2'>
              <Button
                size='sm'
                className='rounded-md text-xs h-9'
                onClick={() => router.push('/payroll/new')}
                disabled={!selectedBranch}
              >
                <UserPlus className='mr-1.5 h-3.5 w-3.5' /> Buat Payroll
              </Button>
            </div>
          </div>

          {loadingPayrolls ? (
            <div className='space-y-2 border rounded-lg shadow-sm p-4'>
              {[...Array(itemsPerPage)].map((_, i) => (
                <Skeleton key={i} className='h-10 w-full' />
              ))}
            </div>
          ) : payrolls.length === 0 && searchTerm ? (
            <div className='border rounded-lg shadow-sm overflow-hidden p-10 text-center'>
              <p className='text-sm text-muted-foreground'>
                Tidak ada payroll yang cocok dengan pencarian Anda.
              </p>
            </div>
          ) : payrolls.length === 0 ? (
            <div className='border rounded-lg shadow-sm overflow-hidden p-10 text-center'>
              <p className='text-sm text-muted-foreground'>
                Belum ada data payroll di cabang ini.
              </p>
              <Button
                size='sm'
                className='mt-4 text-xs'
                onClick={() => router.push('/payroll/new')}
              >
                <UserPlus className='mr-1.5 h-3.5 w-3.5' /> Buat Payroll Pertama
              </Button>
            </div>
          ) : (
            <>
              <div className='border rounded-lg shadow-sm overflow-hidden'>
                <Table>
                  <TableCaption className='text-xs'>
                    Menampilkan {payrolls.length} dari {totalPayrolls}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-xs px-2'>Kode</TableHead>
                      <TableHead className='text-xs px-2'>Pegawai</TableHead>
                      <TableHead className='hidden md:table-cell text-xs px-2'>
                        Jenis
                      </TableHead>
                      <TableHead className='hidden lg:table-cell text-xs px-2'>
                        Periode
                      </TableHead>
                      <TableHead className='text-right text-xs px-2'>
                        Gaji Pokok
                      </TableHead>
                      <TableHead className='text-right hidden sm:table-cell text-xs px-2'>
                        Total
                      </TableHead>
                      <TableHead className='text-center text-xs px-2'>
                        Status
                      </TableHead>
                      <TableHead className='text-right text-xs px-2'>
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrolls.map((payroll) => (
                      <TableRow key={payroll.id}>
                        <TableCell className='font-medium py-1.5 px-2 text-xs'>
                          {payroll.payroll_code}
                        </TableCell>
                        <TableCell className='py-1.5 px-2 text-xs'>
                          <div>
                            <div className='font-medium'>
                              {payroll.employee?.name}
                            </div>
                            <div className='text-muted-foreground text-[10px]'>
                              {payroll.employee?.employee_code}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className='hidden md:table-cell py-1.5 px-2 text-xs'>
                          {PAYMENT_TYPE_LABELS[payroll.payment_type]}
                          {payroll.payment_type === 'daily' &&
                            payroll.days_worked && (
                              <div className='text-muted-foreground text-[10px]'>
                                {payroll.days_worked} hari
                              </div>
                            )}
                        </TableCell>
                        <TableCell className='hidden lg:table-cell py-1.5 px-2 text-xs'>
                          <div>
                            {formatDate(payroll.period_start)} -{' '}
                            {formatDate(payroll.period_end)}
                          </div>
                          <div className='text-muted-foreground text-[10px]'>
                            Dibayar: {formatDate(payroll.payment_date)}
                          </div>
                        </TableCell>
                        <TableCell className='text-right py-1.5 px-2 text-xs'>
                          {formatCurrency(payroll.base_salary)}
                        </TableCell>
                        <TableCell className='text-right hidden sm:table-cell py-1.5 px-2 text-xs'>
                          <div className='font-medium'>
                            {formatCurrency(payroll.total_amount)}
                          </div>
                          {(payroll.overtime_amount > 0 ||
                            payroll.bonus_amount > 0 ||
                            payroll.deduction_amount > 0) && (
                            <div className='text-muted-foreground text-[10px]'>
                              {payroll.overtime_amount > 0 &&
                                `+${formatCurrency(payroll.overtime_amount)} `}
                              {payroll.bonus_amount > 0 &&
                                `+${formatCurrency(payroll.bonus_amount)} `}
                              {payroll.deduction_amount > 0 &&
                                `-${formatCurrency(payroll.deduction_amount)}`}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className='text-center py-1.5 px-2'>
                          <Badge
                            variant='outline'
                            className={`text-xs ${
                              STATUS_COLORS[payroll.status]
                            }`}
                          >
                            {STATUS_LABELS[payroll.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-right py-1.5 px-2'>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-7 w-7'
                              >
                                <MoreVertical className='h-3.5 w-3.5' />
                                <span className='sr-only'>Aksi</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end'>
                              <DropdownMenuItem
                                className='text-xs cursor-pointer'
                                onClick={() =>
                                  router.push(`/payroll/${payroll.id}/edit`)
                                }
                              >
                                <FilePenLine className='mr-2 h-3.5 w-3.5' />
                                Edit
                              </DropdownMenuItem>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    className='text-xs cursor-pointer text-destructive'
                                    onSelect={(e) => e.preventDefault()}
                                  >
                                    <Trash2 className='mr-2 h-3.5 w-3.5' />
                                    Hapus
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Apakah Anda yakin?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className='text-xs'>
                                      Tindakan ini akan menghapus payroll "
                                      {payroll.payroll_code}" secara permanen.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className='text-xs h-8'>
                                      Batal
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className='text-xs h-8 bg-destructive hover:bg-destructive/90'
                                      onClick={() =>
                                        handleDeletePayroll(
                                          payroll.id,
                                          payroll.payroll_code
                                        )
                                      }
                                    >
                                      Ya, Hapus
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className='flex justify-between items-center pt-2'>
                <Button
                  variant='outline'
                  size='sm'
                  className='text-xs h-8'
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1 || loadingPayrolls}
                >
                  <ChevronLeft className='mr-1 h-4 w-4' /> Sebelumnya
                </Button>
                <span className='text-xs text-muted-foreground'>
                  Halaman {currentPage} dari {totalPages}
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  className='text-xs h-8'
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages || loadingPayrolls}
                >
                  Berikutnya <ChevronRight className='ml-1 h-4 w-4' />
                </Button>
              </div>
            </>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
