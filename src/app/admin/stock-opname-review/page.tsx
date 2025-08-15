'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useBranches } from '@/contexts/branch-context'
import { useDebounce } from '@uidotdev/usehooks'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircle,
  XCircle,
  Eye,
  RotateCcw,
  ListChecks,
  FileText,
  Hash,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  InfoIcon,
} from 'lucide-react'
import { formatDateIntl, formatCurrency } from '@/lib/helper'
import { startOfMonth, endOfDay } from 'date-fns'
import { toast } from '@/hooks/use-toast'
import {
  listStockOpnameForReview,
  approveStockOpname,
  rejectStockOpname,
  getStockOpname,
} from '@/lib/laravel/stockOpname'
import {
  StockOpnameSession,
  StockOpnameStatus,
  STOCK_OPNAME_PAGE_SIZE_OPTIONS,
} from '@/lib/types'

const STOCK_OPNAME_STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'SUBMIT', label: 'Menunggu Review' },
  { value: 'APPROVED', label: 'Disetujui' },
  { value: 'REJECTED', label: 'Ditolak' },
  { value: 'DRAFT', label: 'Draft' },
]

export default function AdminStockOpnameReviewPage() {
  const { currentUser, userData } = useAuth()
  const { branches } = useBranches()

  const [sessions, setSessions] = useState<StockOpnameSession[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState<Date | undefined>(
    startOfMonth(new Date())
  )
  const [endDate, setEndDate] = useState<Date | undefined>(endOfDay(new Date()))
  const [statusFilter, setStatusFilter] = useState('SUBMIT') // Default to pending review
  const [currentBranchId, setCurrentBranchId] = useState<string | undefined>(
    'all'
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    STOCK_OPNAME_PAGE_SIZE_OPTIONS[0]
  )
  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  // Dialog states
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [sessionInAction, setSessionInAction] =
    useState<StockOpnameSession | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const debouncedSearchTerm = useDebounce(searchTerm, 1000)
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const fetchSessions = useCallback(
    async (page: number, currentSearchTerm: string) => {
      if (!currentUser || !startDate || !endDate) {
        setSessions([])
        setTotalItems(0)
        return
      }

      if (endDate < startDate) {
        toast({
          title: 'Error',
          description: 'Rentang tanggal tidak valid',
          variant: 'destructive',
        })
        return
      }

      setLoading(true)

      try {
        const finalStartDate = new Date(startDate)
        finalStartDate.setHours(0, 0, 0, 0)

        const finalEndDate = new Date(endDate)
        finalEndDate.setHours(23, 59, 59, 999)

        const result = await listStockOpnameForReview({
          status:
            statusFilter === 'all'
              ? undefined
              : (statusFilter as StockOpnameStatus),
          branch_id: currentBranchId,
          start_date: finalStartDate.toISOString(),
          end_date: finalEndDate.toISOString(),
          search: currentSearchTerm,
          per_page: itemsPerPage,
          page: page,
        })

        setSessions(result.data)
        setTotalItems(result.total)

        if (
          result.data.length === 0 &&
          (currentSearchTerm || startDate || endDate)
        ) {
          toast({
            title: 'Info',
            description: 'Tidak ada stock opname ditemukan',
          })
        }
      } catch (error: any) {
        let errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        }
        toast({
          title: 'Gagal memuat data',
          description: errorMessage,
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [
      currentUser,
      currentBranchId,
      startDate,
      endDate,
      debouncedSearchTerm,
      itemsPerPage,
      statusFilter,
    ]
  )

  useEffect(() => {
    fetchSessions(1, debouncedSearchTerm)
  }, [fetchSessions])

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

  const handleOpenDialog = (
    session: StockOpnameSession,
    type: 'approve' | 'reject' | 'detail'
  ) => {
    setSessionInAction(session)
    setAdminNotes('')

    if (type === 'approve') {
      setApproveDialogOpen(true)
    } else if (type === 'reject') {
      setRejectDialogOpen(true)
    } else if (type === 'detail') {
      setDetailDialogOpen(true)
    }
  }

  const handleApproveSession = async () => {
    if (!sessionInAction || userData?.role !== 'admin') {
      toast({
        title: 'Error',
        description: 'Data tidak lengkap untuk approve.',
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)
    try {
      await approveStockOpname(sessionInAction.id)
      setApproveDialogOpen(false)
      setSessionInAction(null)
      fetchSessions(currentPage, debouncedSearchTerm)
      toast({
        title: 'Berhasil',
        description: `Stock Opname ${sessionInAction.code} berhasil disetujui. Stok produk telah diperbarui.`,
      })
    } catch (error: any) {
      let errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      toast({
        title: 'Gagal approve stock opname',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectSession = async () => {
    if (!sessionInAction || userData?.role !== 'admin' || !adminNotes.trim()) {
      toast({
        title: 'Error',
        description: 'Alasan penolakan harus diisi.',
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)
    try {
      await rejectStockOpname(sessionInAction.id, adminNotes.trim())
      setRejectDialogOpen(false)
      setSessionInAction(null)
      setAdminNotes('')
      fetchSessions(currentPage, debouncedSearchTerm)
      toast({
        title: 'Berhasil',
        description: `Stock Opname ${sessionInAction.code} telah ditolak.`,
      })
    } catch (error: any) {
      let errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      toast({
        title: 'Gagal menolak stock opname',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status: StockOpnameStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <Badge variant='secondary' className='text-xs'>
            <FileText className='mr-1 h-3 w-3' />
            Draft
          </Badge>
        )
      case 'SUBMIT':
        return (
          <Badge
            variant='outline'
            className='text-xs border-yellow-300 text-yellow-700 bg-yellow-50'
          >
            <AlertCircle className='mr-1 h-3 w-3' />
            Menunggu Review
          </Badge>
        )
      case 'APPROVED':
        return (
          <Badge
            variant='default'
            className='text-xs bg-green-100 text-green-700 border-green-300'
          >
            <CheckCircle className='mr-1 h-3 w-3' />
            Disetujui
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant='destructive' className='text-xs'>
            <XCircle className='mr-1 h-3 w-3' />
            Ditolak
          </Badge>
        )
      default:
        return (
          <Badge variant='secondary' className='text-xs'>
            {status}
          </Badge>
        )
    }
  }

  const branchName = useMemo(() => {
    if (currentBranchId === 'all') return 'Semua Cabang'
    const branch = branches.find((b) => b.id === Number(currentBranchId))
    return branch ? `Cabang ${branch.name}` : 'Cabang Tidak Ditemukan'
  }, [currentBranchId, branches])

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-4'>
          <div className='flex items-center gap-2'>
            <ListChecks className='h-6 w-6 text-primary' />
            <h1 className='text-xl md:text-2xl font-semibold font-headline'>
              Review Stock Opname - {branchName}
            </h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className='text-base font-semibold flex items-center gap-2'>
                <Eye className='h-4 w-4' />
                Filter Stock Opname
              </CardTitle>
              <CardDescription className='text-xs'>
                Pilih rentang tanggal dan filter untuk menampilkan stock opname
                yang perlu direview.
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
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className='h-9 text-xs w-24'>
                      <SelectValue placeholder='Pilih jumlah' />
                    </SelectTrigger>
                    <SelectContent>
                      {STOCK_OPNAME_PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={size.toString()}>
                          {size}
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
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className='h-9 text-xs w-48'>
                      <SelectValue placeholder='Pilih status' />
                    </SelectTrigger>
                    <SelectContent>
                      {STOCK_OPNAME_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='branch' className='text-xs'>
                    Cabang
                  </Label>
                  <Select
                    value={currentBranchId}
                    onValueChange={(value) => {
                      setCurrentBranchId(value)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className='h-9 text-xs w-48'>
                      <SelectValue placeholder='Pilih cabang' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>Semua Cabang</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem
                          key={branch.id}
                          value={branch.id.toString()}
                        >
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2 w-full'>
                  <Label htmlFor='searchTerm' className='text-xs'>
                    Cari Kode/Catatan
                  </Label>
                  <Input
                    id='searchTerm'
                    placeholder='Kode stock opname atau catatan...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className='h-9 text-xs'
                  />
                </div>

                <div className='flex flex-col space-y-2 justify-end'>
                  <Label className='text-xs'>Filter Tanggal</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant='outline'
                        className='h-9 text-xs justify-start text-left font-normal'
                      >
                        <CalendarIcon className='mr-2 h-3.5 w-3.5' />
                        {startDate && endDate
                          ? `${formatDateIntl(
                              startDate.toISOString()
                            )} - ${formatDateIntl(endDate.toISOString())}`
                          : 'Pilih tanggal'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-[320px] lg:w-[500px] space-y-4 p-4'>
                      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                          <Label className='text-xs font-medium'>
                            Tanggal Mulai
                          </Label>
                          <Calendar
                            mode='single'
                            selected={startDate}
                            onSelect={setStartDate}
                            disabled={(date) => date > new Date()}
                            initialFocus
                            className='text-xs'
                          />
                        </div>
                        <div className='space-y-2'>
                          <Label className='text-xs font-medium'>
                            Tanggal Selesai
                          </Label>
                          <Calendar
                            mode='single'
                            selected={endDate}
                            onSelect={setEndDate}
                            disabled={(date) => date > new Date()}
                            className='text-xs'
                          />
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
                      setCurrentPage(1)
                      fetchSessions(1, debouncedSearchTerm)
                    }}
                  >
                    <RotateCcw
                      className={`mr-2 h-3.5 w-3.5 ${
                        loading ? 'animate-spin' : ''
                      }`}
                    />
                    {loading ? 'Memuat...' : 'Refresh Data'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='text-base font-semibold flex items-center gap-2'>
                <ListChecks className='h-4 w-4' />
                Daftar Stock Opname
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
                  Silakan pilih rentang tanggal untuk melihat stock opname.
                </p>
              ) : sessions.length === 0 && debouncedSearchTerm ? (
                <p className='text-sm text-muted-foreground text-center py-8'>
                  Tidak ada stock opname yang cocok dengan pencarian Anda untuk
                  rentang tanggal yang dipilih.
                </p>
              ) : sessions.length === 0 ? (
                <p className='text-sm text-muted-foreground text-center py-8'>
                  Tidak ada stock opname dari tanggal{' '}
                  {formatDateIntl(startDate.toISOString())} hingga{' '}
                  {formatDateIntl(endDate.toISOString())}.
                </p>
              ) : (
                <>
                  <div className='border rounded-md overflow-x-auto'>
                    <table className='w-full text-xs'>
                      <thead className='bg-muted'>
                        <tr>
                          <th className='text-left p-2 font-medium'>
                            <div className='flex items-center gap-1'>
                              <Hash className='h-3 w-3' />
                              Kode
                            </div>
                          </th>
                          <th className='text-left p-2 font-medium'>Cabang</th>
                          <th className='text-left p-2 font-medium'>Status</th>
                          <th className='text-left p-2 font-medium'>
                            Total Item
                          </th>
                          <th className='text-left p-2 font-medium'>
                            <div className='flex items-center gap-1'>
                              <TrendingUp className='h-3 w-3 text-green-600' />
                              Penyesuaian (+)
                            </div>
                          </th>
                          <th className='text-left p-2 font-medium'>
                            <div className='flex items-center gap-1'>
                              <TrendingDown className='h-3 w-3 text-red-600' />
                              Penyesuaian (-)
                            </div>
                          </th>
                          <th className='text-left p-2 font-medium'>Dibuat</th>
                          <th className='text-left p-2 font-medium'>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map((session) => (
                          <tr
                            key={session.id}
                            className='border-t hover:bg-muted/50'
                          >
                            <td className='p-2 font-mono text-xs'>
                              {session.code}
                            </td>
                            <td className='p-2'>
                              {session.branch?.name || 'N/A'}
                            </td>
                            <td className='p-2'>
                              {getStatusBadge(session.status)}
                            </td>
                            <td className='p-2 text-center'>
                              {session.total_items}
                            </td>
                            <td className='p-2 text-green-600 font-medium'>
                              +{session.total_positive_adjustment}
                            </td>
                            <td className='p-2 text-red-600 font-medium'>
                              -{session.total_negative_adjustment}
                            </td>
                            <td className='p-2'>
                              <div className='space-y-1'>
                                <div>{formatDateIntl(session.created_at)}</div>
                                <div className='text-muted-foreground'>
                                  oleh {session.creator?.name || 'N/A'}
                                </div>
                              </div>
                            </td>
                            <td className='p-2'>
                              <div className='flex gap-1'>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  onClick={() =>
                                    handleOpenDialog(session, 'detail')
                                  }
                                  className='h-7 px-2 text-xs'
                                >
                                  <Eye className='h-3 w-3' />
                                </Button>
                                {session.status === 'SUBMIT' && (
                                  <>
                                    <Button
                                      variant='default'
                                      size='sm'
                                      onClick={() =>
                                        handleOpenDialog(session, 'approve')
                                      }
                                      className='h-7 px-2 text-xs bg-green-600 hover:bg-green-700'
                                    >
                                      <CheckCircle className='h-3 w-3' />
                                    </Button>
                                    <Button
                                      variant='destructive'
                                      size='sm'
                                      onClick={() =>
                                        handleOpenDialog(session, 'reject')
                                      }
                                      className='h-7 px-2 text-xs'
                                    >
                                      <XCircle className='h-3 w-3' />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className='flex justify-between items-center pt-2'>
                    <p className='text-xs text-muted-foreground'>
                      Menampilkan {sessions.length} dari {totalItems} stock
                      opname
                    </p>
                    <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        className='h-8 text-xs'
                      >
                        <ChevronLeftIcon className='h-3.5 w-3.5' />
                        Sebelumnya
                      </Button>
                      <span className='flex items-center text-xs px-2'>
                        Halaman {currentPage} dari {totalPages}
                      </span>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={handleNextPage}
                        disabled={currentPage >= totalPages}
                        className='h-8 text-xs'
                      >
                        Selanjutnya
                        <ChevronRightIcon className='h-3.5 w-3.5' />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Approve Dialog */}
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle className='text-base flex items-center gap-2'>
                <CheckCircle className='h-4 w-4 text-green-600' />
                Setujui Stock Opname
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Stock Opname <strong>{sessionInAction?.code}</strong> akan
                disetujui dan stok produk akan diperbarui sesuai dengan hasil
                hitung.
                <br />
                <br />
                <div className='bg-blue-50 p-3 rounded-md border border-blue-200'>
                  <div className='flex items-center gap-2 text-blue-800 mb-2'>
                    <InfoIcon className='h-4 w-4' />
                    <span className='font-medium'>Ringkasan Penyesuaian:</span>
                  </div>
                  <div className='space-y-1 text-blue-700'>
                    <div className='flex justify-between'>
                      <span>Total Item:</span>
                      <span className='font-medium'>
                        {sessionInAction?.total_items}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span>Penyesuaian Positif:</span>
                      <span className='font-medium text-green-600'>
                        +{sessionInAction?.total_positive_adjustment}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span>Penyesuaian Negatif:</span>
                      <span className='font-medium text-red-600'>
                        -{sessionInAction?.total_negative_adjustment}
                      </span>
                    </div>
                  </div>
                </div>
                <br />
                Tindakan ini <strong>tidak dapat dibatalkan</strong>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button type='button' variant='outline' className='text-xs h-8'>
                  Batal
                </Button>
              </DialogClose>
              <Button
                onClick={handleApproveSession}
                className='text-xs h-8 bg-green-600 hover:bg-green-700'
                disabled={isProcessing}
              >
                {isProcessing ? (
                  'Memproses...'
                ) : (
                  <>
                    <CheckCircle className='mr-1.5 h-3.5 w-3.5' />
                    Setujui
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle className='text-base flex items-center gap-2'>
                <XCircle className='h-4 w-4 text-red-600' />
                Tolak Stock Opname
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Stock Opname <strong>{sessionInAction?.code}</strong> akan
                ditolak dan dikembalikan ke status REJECTED. Silakan berikan
                alasan penolakan.
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-2'>
              <Label htmlFor='adminNotes' className='text-xs font-medium'>
                Alasan Penolakan <span className='text-red-500'>*</span>
              </Label>
              <Textarea
                id='adminNotes'
                placeholder='Jelaskan alasan penolakan stock opname ini...'
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className='text-xs'
                rows={3}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type='button' variant='outline' className='text-xs h-8'>
                  Batal
                </Button>
              </DialogClose>
              <Button
                onClick={handleRejectSession}
                variant='destructive'
                className='text-xs h-8'
                disabled={isProcessing || !adminNotes.trim()}
              >
                {isProcessing ? (
                  'Memproses...'
                ) : (
                  <>
                    <XCircle className='mr-1.5 h-3.5 w-3.5' />
                    Tolak
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog - will be implemented if needed */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className='sm:max-w-4xl max-h-[80vh] overflow-y-auto'>
            <DialogHeader>
              <DialogTitle className='text-base flex items-center gap-2'>
                <Eye className='h-4 w-4' />
                Detail Stock Opname: {sessionInAction?.code}
              </DialogTitle>
            </DialogHeader>
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4 text-xs'>
                <div>
                  <Label className='font-medium'>Status:</Label>
                  <div className='mt-1'>
                    {sessionInAction && getStatusBadge(sessionInAction.status)}
                  </div>
                </div>
                <div>
                  <Label className='font-medium'>Cabang:</Label>
                  <div className='mt-1'>
                    {sessionInAction?.branch?.name || 'N/A'}
                  </div>
                </div>
                <div>
                  <Label className='font-medium'>Dibuat oleh:</Label>
                  <div className='mt-1'>
                    {sessionInAction?.creator?.name || 'N/A'}
                  </div>
                </div>
                <div>
                  <Label className='font-medium'>Tanggal dibuat:</Label>
                  <div className='mt-1'>
                    {sessionInAction &&
                      formatDateIntl(sessionInAction.created_at)}
                  </div>
                </div>
              </div>

              {sessionInAction?.notes && (
                <div>
                  <Label className='font-medium text-xs'>Catatan:</Label>
                  <div className='mt-1 p-2 bg-muted rounded text-xs'>
                    {sessionInAction.notes}
                  </div>
                </div>
              )}

              {sessionInAction?.admin_notes && (
                <div>
                  <Label className='font-medium text-xs'>Catatan Admin:</Label>
                  <div className='mt-1 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700'>
                    {sessionInAction.admin_notes}
                  </div>
                </div>
              )}

              <div>
                <Label className='font-medium text-xs'>Ringkasan:</Label>
                <div className='mt-2 grid grid-cols-3 gap-4'>
                  <div className='bg-blue-50 p-3 rounded border border-blue-200'>
                    <div className='text-xs text-blue-600 font-medium'>
                      Total Item
                    </div>
                    <div className='text-lg font-bold text-blue-700'>
                      {sessionInAction?.total_items}
                    </div>
                  </div>
                  <div className='bg-green-50 p-3 rounded border border-green-200'>
                    <div className='text-xs text-green-600 font-medium'>
                      Penyesuaian (+)
                    </div>
                    <div className='text-lg font-bold text-green-700'>
                      +{sessionInAction?.total_positive_adjustment}
                    </div>
                  </div>
                  <div className='bg-red-50 p-3 rounded border border-red-200'>
                    <div className='text-xs text-red-600 font-medium'>
                      Penyesuaian (-)
                    </div>
                    <div className='text-lg font-bold text-red-700'>
                      -{sessionInAction?.total_negative_adjustment}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type='button' variant='outline' className='text-xs h-8'>
                  Tutup
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  )
}
