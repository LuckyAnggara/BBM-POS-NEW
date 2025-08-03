'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/auth-context'
import { useBranches } from '@/contexts/branch-context'

import {
  apiDeletePOSTransaction,
  getTransactions,
  processFullTransactionReturn,
} from '@/lib/appwrite/pos' // Updated import

// import {
//   createDeletionRequest,
//   type TransactionDeletionRequestInput,
// } from '@/lib/appwrite/deletionRequests'
import { startOfMonth, endOfMonth, endOfDay } from 'date-fns'
import {
  ITEMS_PER_PAGE_OPTIONS,
  TransactionDocument,
  TransactionStatus,
} from '@/lib/appwrite/types'
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
import { formatCurrency, formatDate } from '@/lib/helper'

export default function SalesHistoryPage() {
  const { currentUser, userData } = useAuth()
  const { selectedBranch } = useBranches()

  const [transactions, setTransactions] = useState<TransactionDocument[]>([])
  const [loading, setLoading] = useState(true) // PERBAIKAN: Default ke true untuk loading awal
  const [startDate, setStartDate] = useState<Date | undefined>(
    startOfMonth(new Date())
  )
  const [endDate, setEndDate] = useState<Date | undefined>(endOfDay(new Date()))
  const [searchTerm, setSearchTerm] = useState('')
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    ITEMS_PER_PAGE_OPTIONS[0]
  )
  const [totalItems, setTotalItems] = useState(0)
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const [currentPage, setCurrentPage] = useState(1)
  const [refetchCounter, setRefetchCounter] = useState(0)

  const [showReturnDialog, setShowReturnDialog] = useState(false)
  const [transactionToReturn, setTransactionToReturn] =
    useState<TransactionDocument | null>(null)
  const [returnReason, setReturnReason] = useState('')
  const [isProcessingReturn, setIsProcessingReturn] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [adminDeleteDialogOpen, setAdminDeleteDialogOpen] = useState(false)
  const [userDeleteDialogOpen, setUserDeleteDialogOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] =
    useState<TransactionDocument | null>(null)
  const [deletePasswordInput, setDeletePasswordInput] = useState('')

  const [isDeleting, setIsDeleting] = useState(false)
  const [showRequestDeletionDialog, setShowRequestDeletionDialog] =
    useState(false)

  const [deletionRequestReason, setDeletionRequestReason] = useState('')
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false)

  const [requestedDeletionIds, setRequestedDeletionIds] = useState<Set<string>>(
    new Set()
  )

  const debouncedSearchTerm = useDebounce(searchTerm, 500)
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

  const handleOpenReturnDialog = (transaction: TransactionDocument) => {
    setTransactionToReturn(transaction)
    setReturnReason('')
    setShowReturnDialog(true)
  }

  const handleProcessReturn = async () => {
    if (!transactionToReturn || !currentUser || !userData) {
      toast.error('Error', {
        description: 'Transaksi atau pengguna tidak valid untuk retur.',
      })
      return
    }
    if (!returnReason.trim()) {
      toast.error('Alasan Diperlukan', {
        description: 'Silakan masukkan alasan retur.',
      })
      return
    }

    setIsProcessingReturn(true)

    // Panggil fungsi dari pos.ts dengan payload yang benar
    const result = await processFullTransactionReturn({
      transactionId: transactionToReturn.$id, // Gunakan $id
      reason: returnReason,
      returnedByUserId: currentUser.$id,
      returnedByUserName: userData.name, // Gunakan nama dari userData
    })

    setIsProcessingReturn(false)

    if (result && 'error' in result) {
      toast.error('Gagal Memproses Retur', {
        description: result.error,
      })
    } else {
      toast.success('Retur Berhasil', {
        description: `Transaksi ${transactionToReturn.transactionNumber} telah diretur.`,
      })
      setShowReturnDialog(false)
      setTransactionToReturn(null)
      setReturnReason('')
    }
  }

  const handleOpenDeleteAction = (tx: TransactionDocument) => {
    setTransactionToDelete(tx)
    if (userData?.role === 'admin') {
      setDeletePasswordInput('')
      setAdminDeleteDialogOpen(true)
    } else {
      setDeletionRequestReason('')
      setUserDeleteDialogOpen(true)
    }
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)

    if (!transactionToDelete || !selectedBranch) {
      toast.error('Transaksi atau cabang tidak valid untuk dihapus.')
      setIsDeleting(false)
      return
    }
    if (!selectedBranch.transactionDeletionPassword) {
      toast.error(
        'Password hapus transaksi belum diatur untuk cabang ini. Hubungi admin.'
      )
      setIsDeleting(false)
      return
    }
    if (!deletePasswordInput) {
      toast.error('Silakan masukkan password hapus transaksi.')
      setIsDeleting(false)
      return
    }
    if (deletePasswordInput !== selectedBranch.transactionDeletionPassword) {
      toast.error('Password hapus transaksi tidak sesuai.')
      setIsDeleting(false)
      return
    }

    const result = await apiDeletePOSTransaction(
      transactionToDelete.$id,
      userData!,
      deletePasswordInput
    )
    setIsDeleting(false)

    if (result.success) {
      toast.success('Transaksi berhasil dihapus')
      setAdminDeleteDialogOpen(false)
      // PERBAIKAN #3: Gunakan trigger refetch
      fetchTransactions()
    } else {
      toast.error('Gagal Menghapus', { description: result.error || 'Error' })
    }
  }

  const handleConfirmRequestDeletion = async () => {
    if (!transactionToDelete || !currentUser || !userData || !selectedBranch) {
      toast.error('Error', {
        description: 'Data tidak lengkap untuk mengajukan permintaan.',
      })
      return
    }
    if (!deletionRequestReason.trim()) {
      toast.error('Alasan Diperlukan', {
        description: 'Mohon isi alasan mengapa transaksi ini perlu dihapus.',
      })
      return
    }
    setIsRequestingDeletion(true)

    const transactionDate = new Date(transactionToDelete!.$createdAt)

    const requestInput: TransactionDeletionRequestInput = {
      transactionId: transactionToDelete!.$id,
      transactionNumber: transactionToDelete.transactionNumber,
      transactionDate: transactionDate, // Convert Timestamp to Date
      transactionTotalAmount: transactionToDelete.totalAmount,
      branchId: selectedBranch.id,
      requestedByUserId: currentUser.$id,
      requestedByUserName: userData.name,
      reason: deletionRequestReason,
    }
    const result = await createDeletionRequest(requestInput)
    setIsRequestingDeletion(false)

    if ('error' in result) {
      toast.error('Gagal Mengajukan', {
        description: result.error,
      })
    } else {
      toast.success('Permintaan Terkirim', {
        description: 'Permintaan penghapusan transaksi telah dikirim ke admin.',
      })
      setRequestedDeletionIds((prev) =>
        new Set(prev).add(transactionToDelete.$id)
      )
      setShowRequestDeletionDialog(false)
      setTransactionToDelete(null)
      setDeletionRequestReason('')
    }
  }

  const getStatusChip = (status: TransactionStatus) => {
    if (status === 'returned') {
      return (
        <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700'>
          <XCircle className='mr-1 h-3 w-3' /> Diretur
        </span>
      )
    }
    return (
      <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700'>
        <CheckCircle className='mr-1 h-3 w-3' /> Selesai
      </span>
    )
  }

  const fetchTransactions = useCallback(async () => {
    if (!currentUser || !selectedBranch || !startDate || !endDate) {
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

    const result = await getTransactions({
      branchId: selectedBranch.id,
      options: {
        startDate: finalStartDate.toISOString(),
        endDate: finalEndDate.toISOString(),
        searchTerm: debouncedSearchTerm,
        limit: itemsPerPage,
        page: currentPage,
      },
    })

    setTransactions(result.documents)
    setTotalItems(result.total)
    setLoading(false)

    if (
      result.documents.length === 0 &&
      (debouncedSearchTerm || startDate || endDate)
    ) {
      // Hanya tampilkan toast jika user sedang melakukan filter/pencarian
      toast.info('Tidak Ada Transaksi Ditemukan')
    }
  }, [
    currentUser,
    selectedBranch,
    startDate,
    endDate,
    debouncedSearchTerm,
    itemsPerPage,
    currentPage,
  ])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions]) // Hanya perlu fetchTransactions sebagai dependensi

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-4'>
          <h1 className='text-xl md:text-2xl font-semibold font-headline'>
            Riwayat Penjualan {selectedBranch ? `- ${selectedBranch.name}` : ''}
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
                    <SelectTrigger className='h-9 text-xs w-32'>
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

                      {/* <div className='flex justify-end space-x-2'>
                        <Button
                          onClick={handleClearFilters}
                          variant='outline'
                          size='sm'
                          className='h-9 text-xs'
                          disabled={loading}
                        >
                          Reset
                        </Button>
                        <Button
                          onClick={handleSearchAndFilter}
                          size='sm'
                          className='h-9 text-xs'
                          disabled={loading || !selectedBranch}
                        >
                          Terapkan
                        </Button>
                      </div> */}
                    </PopoverContent>
                  </Popover>
                </div>
                <div className='flex flex-col space-y-2 justify-end'>
                  <Button
                    variant='outline'
                    className='h-9 text-xs'
                    onClick={() => {
                      fetchTransactions()
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
                  {formatDate(startDate.toISOString())} hingga{' '}
                  {formatDate(endDate.toISOString())}.
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
                            key={tx.$id}
                            className={cn(
                              tx.status === 'returned' &&
                                'bg-muted/50 hover:bg-muted/60'
                            )}
                          >
                            <TableCell className='text-xs font-medium py-2'>
                              {tx.transactionNumber ||
                                tx.$id.substring(0, 8).toUpperCase()}
                            </TableCell>
                            <TableCell className='text-xs py-2'>
                              {formatDate(tx.$createdAt)}
                            </TableCell>
                            <TableCell className='text-xs hidden md:table-cell py-2'>
                              {tx.customerName || '-'}
                            </TableCell>
                            <TableCell className='text-xs capitalize hidden sm:table-cell py-2'>
                              {tx.paymentMethod}
                            </TableCell>
                            <TableCell className='text-xs text-right py-2'>
                              {formatCurrency(tx.totalAmount)}
                            </TableCell>
                            <TableCell className='text-xs text-center py-2'>
                              {getStatusChip(tx.status)}
                              {tx.status === 'returned' && tx.returnReason && (
                                <p
                                  className='text-xs text-muted-foreground italic mt-0.5 max-w-[150px] truncate'
                                  title={tx.returnReason}
                                >
                                  Alasan: {tx.returnReason}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className='text-xs text-center py-2'>
                              {tx.status !== 'returned' && (
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='text-xs cursor-pointer text-yellow-700 focus:bg-amber-50 focus:text-amber-800'
                                  onClick={() => {
                                    handleOpenReturnDialog(tx)
                                  }}
                                >
                                  <RotateCcw className='mr-2 h-3.5 w-3.5' />
                                </Button>
                              )}
                              <Button asChild variant='ghost' size='icon'>
                                <Link
                                  href={`/invoice/${tx.$id}/view`}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                >
                                  <Printer className='mr-2 h-3.5 w-3.5' />
                                </Link>
                              </Button>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='text-xs cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10'
                                onClick={(e) => {
                                  e.preventDefault()
                                  // 2. Tetap panggil fungsi Anda untuk membuka dialog
                                  handleOpenDeleteAction(tx)
                                }}
                                disabled={requestedDeletionIds.has(tx.$id)}
                              >
                                <Trash2 className='mr-2 h-3.5 w-3.5' />
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

        <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Proses Retur Transaksi</DialogTitle>
              <DialogDescription className='text-xs'>
                Anda akan memproses retur untuk invoice{' '}
                <strong>{transactionToReturn?.transactionNumber}</strong>. Stok
                barang akan dikembalikan.
              </DialogDescription>
            </DialogHeader>
            <div className='py-2 space-y-2'>
              <Label className='text-xs'>Alasan Retur (Wajib)</Label>
              <Input
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder='Contoh: Barang rusak, Salah ukuran, dll.'
                className='text-xs h-9'
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type='button' variant='secondary'>
                  Close
                </Button>
              </DialogClose>
              <Button
                className='text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white'
                onClick={handleProcessReturn}
                disabled={isProcessingReturn || !returnReason.trim()}
              >
                {isProcessingReturn ? 'Memproses...' : 'Ya, Proses Retur'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={adminDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Transaksi</AlertDialogTitle>
              <AlertDialogDescription className='text-xs'>
                Anda akan menghapus invoice{' '}
                <strong>{transactionToDelete?.transactionNumber}</strong> secara
                permanen. Stok akan dikembalikan jika transaksi belum diretur.
                Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className='py-2 space-y-2'>
              <Label htmlFor='deletePasswordInput' className='text-xs'>
                Password Hapus Transaksi
              </Label>
              <Input
                id='deletePasswordInput'
                type='password'
                value={deletePasswordInput}
                onChange={(e) => setDeletePasswordInput(e.target.value)}
                placeholder='Masukkan password'
                className='text-xs h-9'
              />
              <p className='text-xs text-muted-foreground'>
                Password ini diatur oleh admin per cabang.
              </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel
                className='text-xs h-8'
                disabled={isDeleting}
                onClick={() => {
                  setTransactionToDelete(null)
                  setAdminDeleteDialogOpen(false)
                  setDeletePasswordInput('')
                }}
              >
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                className='text-xs h-8'
                onClick={handleConfirmDelete}
                disabled={isDeleting || !deletePasswordInput.trim()}
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Transaksi'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={userDeleteDialogOpen}>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle className='text-base'>
                Ajukan Permintaan Hapus Transaksi
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Permintaan akan dikirim ke Admin untuk invoice:{' '}
                <strong>{transactionToDelete?.transactionNumber}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className='py-3 space-y-2'>
              <Label htmlFor='deletionRequestReason' className='text-xs'>
                Alasan Permintaan Penghapusan (Wajib)
              </Label>
              <Textarea
                id='deletionRequestReason'
                value={deletionRequestReason}
                onChange={(e) => setDeletionRequestReason(e.target.value)}
                placeholder='Jelaskan mengapa transaksi ini perlu dihapus...'
                className='text-xs min-h-[80px]'
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type='button' variant='outline' className='text-xs h-8'>
                  Batal
                </Button>
              </DialogClose>
              <Button
                onClick={handleConfirmRequestDeletion}
                className='text-xs h-8'
                disabled={isRequestingDeletion || !deletionRequestReason.trim()}
              >
                {isRequestingDeletion ? (
                  'Mengirim...'
                ) : (
                  <>
                    <Send className='mr-1.5 h-3.5 w-3.5' /> Kirim Permintaan
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
