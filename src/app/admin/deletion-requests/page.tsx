'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/auth-context'
import { useBranches } from '@/contexts/branch-context'

import {
  approveSaleAction,
  listSalesRequest,
  rejectSaleAction,
} from '@/lib/laravel/saleService' // Updated import

// import {
//   createDeletionRequest,
//   type TransactionDeletionRequestInput,
// } from '@/lib/appwrite/deletionRequests'
import { startOfMonth, endOfMonth, endOfDay, set } from 'date-fns'
import {
  ITEMS_PER_PAGE_OPTIONS,
  Sale,
  SaleRequestActionPayload,
  SaleStatus,
  SaleActionParams,
  AdminRequestActionPayload,
  ADMIN_REQUEST_SALES_STATUS,
  Branch,
} from '@/lib/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Printer,
  RotateCcw,
  CheckCircle,
  XCircle,
  Trash2,
  CalendarIcon,
  Search,
  FilterX,
  MoreHorizontal,
  Send,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogFooter,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format, isValid, parseISO } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { useDebounce } from '@uidotdev/usehooks'
import {
  formatCurrency,
  formatDateIntl,
  formatDateIntlIntl,
} from '@/lib/helper'

export default function SalesHistoryPage() {
  const { currentUser, userData } = useAuth()

  const [transactions, setTransactions] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true) // PERBAIKAN: Default ke true untuk loading awal
  const [startDate, setStartDate] = useState<Date | undefined>(
    startOfMonth(new Date())
  )
  const [statusTransaction, setStatusTransaction] = useState('all')
  const { branches } = useBranches()
  const [currentBranchId, setCurrentBranchId] = useState<string | undefined>(
    'all'
  )
  const [endDate, setEndDate] = useState<Date | undefined>(endOfDay(new Date()))
  const [searchTerm, setSearchTerm] = useState('')
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    ITEMS_PER_PAGE_OPTIONS[0]
  )
  const [totalItems, setTotalItems] = useState(0)
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const [currentPage, setCurrentPage] = useState(1)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)

  const [transactionInAction, setTransactionInAction] = useState<Sale | null>(
    null
  )
  const [isDeleting, setIsDeleting] = useState(false)
  const [isloadingProcess, setIsloadingProcess] = useState(false)

  const [requestedDeletionIds, setRequestedDeletionIds] = useState<Set<number>>(
    new Set()
  )

  const debouncedSearchTerm = useDebounce(searchTerm, 1000)

  const fetchTransactions = useCallback(
    async (page: number, currentSearchTerm: string) => {
      if (!currentUser || !startDate || !endDate) {
        setTransactions([])
        setTotalItems(0)
        return
      }

      if (endDate < startDate) {
        toast.error('Rentang Tanggal Tidak Valid')
        return
      }
      setLoading(true)

      // PERBAIKAN 3: Format tanggal yang aman saat akan melakukan query
      const finalStartDate = new Date(startDate)
      finalStartDate.setHours(0, 0, 0, 0) // Set ke awal hari

      const finalEndDate = new Date(endDate)
      finalEndDate.setHours(23, 59, 59, 999) // Set ke akhir hari

      const result = await listSalesRequest({
        branchId: currentBranchId,
        startDate: finalStartDate.toISOString(),
        endDate: finalEndDate.toISOString(),
        searchTerm: debouncedSearchTerm,
        limit: itemsPerPage,
        page: currentPage,
        status: statusTransaction,
      })

      setTransactions(result.data)
      setTotalItems(result.total)
      setLoading(false)

      if (
        result.data.length === 0 &&
        (debouncedSearchTerm || startDate || endDate)
      ) {
        // Hanya tampilkan toast jika user sedang melakukan filter/pencarian
        toast.info('Tidak Ada Transaksi Ditemukan')
      }
    },
    [
      currentUser,
      currentBranchId,
      startDate,
      endDate,
      debouncedSearchTerm,
      itemsPerPage,
      currentPage,
      statusTransaction,
    ]
  )

  useEffect(() => {
    fetchTransactions(1, debouncedSearchTerm)
  }, [fetchTransactions]) // Hanya perlu fetchTransactions sebagai dependensi

  const handleNextPage = () => {
    // Cek jika halaman saat ini belum mencapai halaman terakhir
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => prevPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => prevPage - 1)
    }
  }

  const handleOpenDialog = (tx: Sale, type: 'approve' | 'reject') => {
    setTransactionInAction(tx)
    if (type === 'approve') {
      setApproveDialogOpen(true)
    } else {
      setRejectDialogOpen(true)
    }
  }

  const handleConfirmationRequest = async () => {
    if (!transactionInAction || currentUser?.role !== 'admin') {
      toast.error('Error', {
        description: 'Data tidak lengkap untuk mengajukan permintaan.',
      })
      return
    }
    setIsloadingProcess(true)

    try {
      const result = await approveSaleAction(transactionInAction!.id)
      setIsloadingProcess(false)
      setApproveDialogOpen(false)
      setTransactionInAction(null)
      fetchTransactions(currentPage, debouncedSearchTerm)
      toast.success(
        `Transaksi berhasil ${
          transactionInAction.status === 'pending_void' ? 'dihapus' : 'diretur'
        }`,
        {
          description: `Transaksi berhasil ${
            transactionInAction.status === 'pending_void'
              ? 'dihapus'
              : 'diretur'
          }`,
        }
      )
    } catch (error: any) {
      let errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'

      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
        const firstErrorKey = Object.keys(validationErrors)[0]
        errorMessage = validationErrors[firstErrorKey][0]
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }

      toast.error('Gagal memproses permintaan', {
        description: errorMessage,
      })
    } finally {
      setIsloadingProcess(false)
    }
  }
  // Handler to reject sale request
  const handleRejectRequest = async () => {
    if (!transactionInAction || currentUser?.role !== 'admin') {
      toast.error('Error', {
        description: 'Data tidak lengkap untuk menolak permintaan.',
      })
      return
    }
    setIsloadingProcess(true)
    try {
      await rejectSaleAction(transactionInAction.id)
      setRejectDialogOpen(false)
      setTransactionInAction(null)
      fetchTransactions(currentPage, debouncedSearchTerm)
      toast.success('Permintaan transaksi berhasil ditolak', {
        description: `Transaksi nomor ${transactionInAction.transaction_number} telah ditolak.`,
      })
    } catch (error: any) {
      let errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
        const firstKey = Object.keys(validationErrors)[0]
        errorMessage = validationErrors[firstKey][0]
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      toast.error('Gagal menolak permintaan', { description: errorMessage })
    } finally {
      setIsloadingProcess(false)
    }
  }

  const getStatusChip = (status: SaleStatus) => {
    if (status === 'returned') {
      return (
        <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700'>
          <XCircle className='mr-1 h-3 w-3' /> Diretur
        </span>
      )
    }
    if (status === 'voided') {
      return (
        <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700'>
          <XCircle className='mr-1 h-3 w-3' /> Dibatalkan
        </span>
      )
    }
    if (status === 'pending_return') {
      return (
        <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-red-700'>
          <XCircle className='mr-1 h-3 w-3' /> Menunggu Retur
        </span>
      )
    }
    if (status === 'pending_void') {
      return (
        <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-red-700'>
          <XCircle className='mr-1 h-3 w-3' /> MenungguDibatalkan
        </span>
      )
    }
    return (
      <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700'>
        <CheckCircle className='mr-1 h-3 w-3' /> Selesai
      </span>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-4'>
          <h1 className='text-xl md:text-2xl font-semibold font-headline'>
            Daftar Permintaan Transaksi{' '}
            {currentBranchId
              ? `- ${
                  currentBranchId !== 'all'
                    ? `Cabang ${
                        branches.find(
                          (branch) => branch.id === Number(currentBranchId)
                        )?.name
                      }`
                    : 'Semua Cabang'
                }`
              : 'Semua Cabang'}
          </h1>

          <Card>
            <CardHeader>
              <CardTitle className='text-base font-semibold'>
                Filter Transaksi
              </CardTitle>
              <CardDescription className='text-xs'>
                Pilih rentang tanggal dan cari untuk menampilkan transaksi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 sm:flex flex-row space-x-4'>
                <div className='space-y-2'>
                  <Label htmlFor='itemsPerPage' className='text-xs'>
                    Tampilkan Data
                  </Label>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value))
                    }}
                  >
                    <SelectTrigger className='h-9 text-xs w-24'>
                      <SelectValue placeholder='Pilih jumlah' />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                        <SelectItem
                          key={option}
                          value={option.toString()}
                          className='text-xs'
                        >
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='status' className='text-xs'>
                    Status
                  </Label>
                  <Select
                    value={statusTransaction}
                    onValueChange={(value) => {
                      setStatusTransaction(value)
                    }}
                  >
                    <SelectTrigger className='h-9 text-xs w-32'>
                      <SelectValue placeholder='Pilih status' />
                    </SelectTrigger>
                    <SelectContent>
                      {ADMIN_REQUEST_SALES_STATUS.map((option) => (
                        <SelectItem
                          key={option}
                          value={option.toString()}
                          className='text-xs'
                        >
                          {option.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='status' className='text-xs'>
                    Cabang
                  </Label>
                  <Select
                    value={currentBranchId}
                    onValueChange={(value) => {
                      setCurrentBranchId(value)
                    }}
                  >
                    <SelectTrigger className='h-9 text-xs w-48'>
                      <SelectValue placeholder='Pilih cabang' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all' className='text-xs'>
                        Semua Cabang
                      </SelectItem>
                      {branches.map((option) => (
                        <SelectItem
                          key={option.id}
                          value={option.id.toString()}
                          className='text-xs'
                        >
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2 w-full'>
                  <Label htmlFor='searchTerm' className='text-xs'>
                    Cari Invoice/Pelanggan
                  </Label>
                  <Input
                    id='searchTerm'
                    placeholder='Nomor invoice atau nama...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className='h-9 text-xs'
                  />
                </div>
                <div className='flex flex-col space-y-2 justify-end'>
                  <Label className='text-xs'>Filter Tanggal</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant='outline' className='h-9 text-xs'>
                        <FilterX className='mr-2 h-4 w-4' /> Filter
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-[320px] lg:w-[500px] space-y-4 p-4'>
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 items-start'></div>
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                          <Label htmlFor='startDate' className='text-xs'>
                            Tanggal Mulai
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'w-full justify-start text-left font-normal h-9 text-xs',
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
                        <div className='space-y-2'>
                          <Label htmlFor='endDate' className='text-xs'>
                            Tanggal Akhir
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'w-full justify-start text-left font-normal h-9 text-xs',
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
                                disabled={{ before: startDate }}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className='flex flex-col space-y-2 justify-end'>
                  <Button
                    variant='outline'
                    className='h-9 text-xs'
                    onClick={() => {
                      fetchTransactions(1, debouncedSearchTerm)
                    }}
                  >
                    <RotateCcw
                      className={`mr-2 h-3.5 w-3.5 ${
                        loading ? 'animate-spin' : ''
                      }`}
                    />

                    {/* 3. (Opsional) Ubah teks tombol untuk memberikan feedback yang lebih jelas */}
                    {loading ? 'Memuat...' : 'Refresh Data'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='text-base font-semibold'>
                Daftar Transaksi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className='space-y-2'>
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className='h-10 w-full' />
                  ))}
                </div>
              ) : !startDate || !endDate ? (
                <p className='text-sm text-muted-foreground text-center py-8'>
                  Silakan pilih rentang tanggal dan klik "Terapkan" untuk
                  melihat riwayat penjualan.
                </p>
              ) : transactions.length === 0 && debouncedSearchTerm ? (
                <p className='text-sm text-muted-foreground text-center py-8'>
                  Tidak ada transaksi yang cocok dengan pencarian Anda untuk
                  rentang tanggal yang dipilih.
                </p>
              ) : transactions.length === 0 ? (
                <p className='text-sm text-muted-foreground text-center py-8'>
                  Tidak ada riwayat penjualan dari tanggal{' '}
                  {formatDateIntl(startDate.toISOString())} hingga{' '}
                  {formatDateIntl(endDate.toISOString())}.
                </p>
              ) : (
                <>
                  <div className='border rounded-md overflow-x-auto'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className='text-xs'>No. Invoice</TableHead>
                          <TableHead className='text-xs'>Tanggal</TableHead>
                          <TableHead className='text-xs hidden md:table-cell'>
                            Pelanggan
                          </TableHead>
                          <TableHead className='text-xs hidden sm:table-cell'>
                            Metode Bayar
                          </TableHead>
                          <TableHead className='text-xs text-right'>
                            Total
                          </TableHead>
                          <TableHead className='text-xs text-center'>
                            Status
                          </TableHead>
                          <TableHead className='text-xs text-center'>
                            Aksi
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx) => (
                          <TableRow
                            key={tx.id}
                            className={cn(
                              tx.status === 'returned' &&
                                'bg-muted/50 hover:bg-muted/60'
                            )}
                          >
                            <TableCell className='text-xs font-medium py-2'>
                              {tx.transaction_number || tx.id}
                            </TableCell>
                            <TableCell className='text-xs py-2'>
                              {formatDateIntlIntl(tx.created_at)}
                            </TableCell>
                            <TableCell className='text-xs hidden md:table-cell py-2'>
                              {tx.customer_name || '-'}
                            </TableCell>
                            <TableCell className='text-xs capitalize hidden sm:table-cell py-2'>
                              {tx.payment_method}
                            </TableCell>
                            <TableCell className='text-xs text-right py-2'>
                              {formatCurrency(tx.total_amount)}
                            </TableCell>
                            <TableCell className='text-xs text-center py-2'>
                              {getStatusChip(tx.status)}
                              {tx.status === 'returned' &&
                                tx.returned_reason && (
                                  <p
                                    className='text-xs text-muted-foreground italic mt-0.5 max-w-[150px] truncate'
                                    title={tx.returned_reason}
                                  >
                                    Alasan: {tx.returned_reason}
                                  </p>
                                )}
                            </TableCell>
                            <TableCell className='text-xs text-center py-2'>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='text-xs cursor-pointer text-green-700 focus:text-green-800 focus:bg-green-50 '
                                onClick={(e) => {
                                  e.preventDefault()
                                  // 2. Tetap panggil fungsi Anda untuk membuka dialog
                                  handleOpenDialog(tx, 'approve')
                                }}
                                disabled={requestedDeletionIds.has(tx.id)}
                              >
                                <CheckCircle2 className='mr-2 h-3.5 w-3.5' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='text-xs cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10'
                                onClick={(e) => {
                                  e.preventDefault()
                                  // 2. Tetap panggil fungsi Anda untuk membuka dialog
                                  handleOpenDialog(tx, 'reject')
                                }}
                                disabled={requestedDeletionIds.has(tx.id)}
                              >
                                <XCircle className='mr-2 h-3.5 w-3.5' />
                              </Button>
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
                      disabled={currentPage <= 1 || loading}
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
                      disabled={currentPage >= totalPages || loading}
                    >
                      Berikutnya <ChevronRight className='ml-1 h-4 w-4' />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle className='text-base'>
                Permintaan Persetujuan Transaksi untuk dilakukan{' '}
                {transactionInAction?.status === 'pending_void'
                  ? 'Penghapusan'
                  : 'Retur'}
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Transaksi nomor{' '}
                <strong>{transactionInAction?.transaction_number}</strong>{' '}
                {transactionInAction?.status === 'pending_void'
                  ? 'akan dihapus'
                  : 'akan diretur'}{' '}
                secara permanen. Stok akan dikembalikan jika transaksi belum
                diretur. Tindakan ini tidak dapat dibatalkan.
                <br />
                <br />
                Alasan:
                <blockquote className='mt-6 border-l-2 pl-6 italic'>
                  {transactionInAction?.returned_reason || '-'}
                </blockquote>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <DialogClose asChild>
                <Button type='button' variant='outline' className='text-xs h-8'>
                  Batal
                </Button>
              </DialogClose>
              <Button
                onClick={handleConfirmationRequest}
                className='text-xs h-8'
                disabled={isloadingProcess}
              >
                {isloadingProcess ? (
                  'Mengirim...'
                ) : (
                  <>
                    <CheckCircle className='mr-1.5 h-3.5 w-3.5' /> Approve
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Reject Confirmation Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle className='text-base'>
                Tolak Permintaan Transaksi{' '}
                {transactionInAction?.status === 'pending_void'
                  ? 'Penghapusan'
                  : 'Retur'}
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Transaksi nomor{' '}
                <strong>{transactionInAction?.transaction_number}</strong> akan
                ditolak secara permanen. Tindakan ini tidak dapat dibatalkan.
                <br />
                <br />
                Alasan Permintaan:
                <blockquote className='mt-4 border-l-2 pl-6 italic'>
                  {transactionInAction?.returned_reason || '-'}
                </blockquote>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button type='button' variant='outline' className='text-xs h-8'>
                  Batal
                </Button>
              </DialogClose>
              <Button
                onClick={handleRejectRequest}
                className='text-xs h-8'
                disabled={isloadingProcess}
              >
                {isloadingProcess ? (
                  'Memproses...'
                ) : (
                  <>
                    <XCircle className='mr-1.5 h-3.5 w-3.5' /> Tolak
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  )
}
