'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/auth-context'
import { useBranches } from '@/contexts/branch-context'
import { listShiftHistory } from '@/lib/laravel/shiftService'
import type { PaymentMethod, Shift } from '@/lib/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, Search, FilterX, Filter, Eye, Info } from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { formatDateIntl } from '@/lib/helper'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { useDebounce } from '@uidotdev/usehooks'

export default function ShiftHistoryPage() {
  // Context and state hooks (keep order stable)
  const router = useRouter()
  const { currentUser } = useAuth()
  const { selectedBranch } = useBranches()
  const { toast } = useToast()
  const [startDate, setStartDate] = useState<Date | undefined>(
    startOfDay(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000))
  )
  const [endDate, setEndDate] = useState<Date | undefined>(endOfDay(new Date()))
  const [searchTerm, setSearchTerm] = useState('')
  const [allFetchedShifts, setAllFetchedShifts] = useState<Shift[]>([])
  const [filteredShifts, setFilteredShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(false)
  // Details dialog
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const debouncedSearchTerm = useDebounce(searchTerm, 1000)

  const fetchShifts = useCallback(async () => {
    if (currentUser && selectedBranch && startDate && endDate) {
      if (endDate < startDate) {
        toast({
          title: 'Rentang Tanggal Tidak Valid',
          description: 'Tanggal akhir tidak boleh sebelum tanggal mulai.',
          variant: 'destructive',
        })
        setAllFetchedShifts([])
        return
      }
      setLoading(true)
      const fetchedShifts = await listShiftHistory({
        branchId: selectedBranch.id,
        page: 1, // Default ke halaman pertama
      })
      // Compute cash difference and update state
      const shiftsWithDiff = fetchedShifts.data.map((x: Shift) => ({
        ...x,
        cash_difference: Number(x.actual_balance) - Number(x.ending_balance),
      }))
      // if (fetchedShifts.length === 0) {
      setAllFetchedShifts(shiftsWithDiff)
      // Apply initial filter (no search) so table displays data
      setFilteredShifts(shiftsWithDiff)

      // const shiftsWithDiff = fetchedShifts.data.map((x: Shift) => ({
      //   ...x,
      //   cash_difference:
      //     Number(x.actual_balance) - Number(x.ending_balance),
      // }))
      // if (fetchedShifts.length === 0) {
      //   toast({
      //     title: 'Tidak Ada Shift',
      //     description:
      //       'Tidak ada riwayat shift ditemukan untuk filter yang dipilih.',
      //     variant: 'default',
      //   })
      // }
      setLoading(false)
    } else {
      setAllFetchedShifts([])
      setLoading(false)
    }
  }, [currentUser, selectedBranch, startDate, endDate])

  useEffect(() => {
    fetchShifts()
  }, [fetchShifts, debouncedSearchTerm])

  const paymentMethods: PaymentMethod[] = [
    'cash',
    'credit',
    'card',
    'transfer',
    'qris',
  ]
  // Local currency formatter ...
  // Local currency formatter to avoid hook in helper
  const formatAmount = (amount: number) => {
    const currency = selectedBranch?.currency || 'IDR'
    const hasDecimal = amount % 1 !== 0
    const formatted = Math.floor(amount).toLocaleString('id-ID', {
      minimumFractionDigits: hasDecimal ? 2 : 0,
      maximumFractionDigits: 2,
    })
    return `${currency} ${formatted}`
  }
  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-4'>
          <h1 className='text-xl md:text-2xl font-semibold font-headline'>
            Riwayat Shift {selectedBranch ? `- ${selectedBranch.name}` : ''}
          </h1>

          <Card>
            <CardHeader className='pb-3 pt-4 px-4'>
              <CardTitle className='text-base font-semibold'>
                Filter Riwayat Shift
              </CardTitle>
            </CardHeader>
            <CardContent className='px-4 pb-4'>
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 items-end'>
                <div>
                  <Label htmlFor='startDateShift' className='text-xs'>
                    Tanggal Mulai
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
                  <Label htmlFor='endDateShift' className='text-xs'>
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
                <div className='lg:col-span-1'>
                  <Label htmlFor='searchTermShift' className='text-xs'>
                    Cari (Waktu/Modal/Kas)
                  </Label>
                  <Input
                    id='searchTermShift'
                    placeholder='Ketik untuk mencari...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className='h-8 text-xs mt-0.5'
                  />
                </div>
                {/* <div className='flex gap-2 lg:col-start-4'>
                  <Button
                    onClick={handleApplyFilters}
                    size='sm'
                    className='h-8 text-xs flex-grow'
                    disabled={loading || !selectedBranch}
                  >
                    <Filter className='mr-1.5 h-3.5 w-3.5' /> Terapkan
                  </Button>
                  <Button
                    onClick={handleClearFilters}
                    variant='outline'
                    size='sm'
                    className='h-8 text-xs flex-grow'
                    disabled={loading || !selectedBranch}
                  >
                    <FilterX className='mr-1.5 h-3.5 w-3.5' /> Reset
                  </Button>
                </div> */}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='text-base font-semibold'>
                Daftar Shift
              </CardTitle>
              <CardDescription className='text-xs'>
                Menampilkan riwayat shift berdasarkan filter yang dipilih.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className='space-y-2'>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className='h-20 w-full' />
                  ))}
                </div>
              ) : !selectedBranch ? (
                <p className='text-sm text-muted-foreground text-center py-8'>
                  Pilih cabang untuk melihat riwayat shift.
                </p>
              ) : filteredShifts.length === 0 ? (
                <p className='text-sm text-muted-foreground text-center py-8'>
                  {allFetchedShifts.length === 0
                    ? 'Tidak ada data shift untuk filter saat ini.'
                    : 'Tidak ada hasil yang cocok dengan pencarian Anda.'}
                </p>
              ) : (
                <div className='border rounded-md overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='text-xs'>Waktu Mulai</TableHead>
                        <TableHead className='text-xs'>Waktu Selesai</TableHead>
                        <TableHead className='text-xs text-right'>
                          Modal Awal
                        </TableHead>
                        <TableHead className='text-xs text-right hidden lg:table-cell'>
                          Kas Akhir Seharusnya
                        </TableHead>
                        <TableHead className='text-xs text-right'>
                          Kas Aktual
                        </TableHead>
                        <TableHead className='text-xs text-right'>
                          Selisih Kas
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
                      {filteredShifts.map((shift) => (
                        <TableRow key={shift.id}>
                          <TableCell className='text-xs py-2'>
                            {formatDateIntl(shift.start_shift)}
                          </TableCell>
                          <TableCell className='text-xs py-2'>
                            {shift.end_shift
                              ? formatDateIntl(shift.end_shift)
                              : 'Aktif'}
                          </TableCell>
                          <TableCell className='text-xs text-right py-2'>
                            {formatAmount(shift.starting_balance)}
                          </TableCell>
                          <TableCell className='text-xs text-right py-2 hidden lg:table-cell'>
                            {formatAmount(Number(shift.ending_balance))}
                          </TableCell>
                          <TableCell className='text-xs text-right py-2'>
                            {formatAmount(Number(shift.actual_balance))}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-xs text-right py-2 font-medium',
                              shift.cash_difference && shift.cash_difference < 0
                                ? 'text-destructive'
                                : shift.cash_difference &&
                                  shift.cash_difference > 0
                                ? 'text-green-600'
                                : ''
                            )}
                          >
                            {formatAmount(Number(shift.cash_difference))}
                            {shift.cash_difference !== undefined &&
                              shift.cash_difference !== 0 && (
                                <span className='ml-1 text-[0.65rem]'>
                                  (
                                  {Number(shift.cash_difference) < 0
                                    ? 'Kurang'
                                    : 'Lebih'}
                                  )
                                </span>
                              )}
                          </TableCell>
                          <TableCell className='text-xs text-center py-2'>
                            <span
                              className={cn(
                                'px-1.5 py-0.5 rounded-full text-[0.7rem] font-medium',
                                shift.status === 'open'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700'
                              )}
                            >
                              {shift.status === 'open' ? 'Open' : 'Closed'}
                            </span>
                          </TableCell>
                          <TableCell className='text-xs text-center py-2'>
                            <div className='flex items-center justify-center gap-1'>
                              <Button
                                variant='outline'
                                size='sm'
                                className='text-xs h-7 px-2'
                                onClick={() =>
                                  router.push(`/shift-history/${shift.id}`)
                                }
                              >
                                <Eye className='h-3 w-3 mr-1' />
                                Detail
                              </Button>
                              <Button
                                variant='ghost'
                                size='sm'
                                className='text-xs h-7 px-2'
                                onClick={() => {
                                  setSelectedShift(shift)
                                  setShowDetailDialog(true)
                                }}
                              >
                                <Info className='h-3 w-3' />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
      {/* Detail Shift Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Rincian Shift</DialogTitle>
            <DialogDescription className='text-xs'>
              Detail transaksi shift nomor: <strong>{selectedShift?.id}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-2 text-sm'>
            <div className='flex justify-between'>
              <span>Modal Awal:</span>
              <span>{formatAmount(selectedShift?.starting_balance || 0)}</span>
            </div>
            <div className='flex justify-between'>
              <span>Total Cash:</span>
              <span>
                {formatAmount(selectedShift?.total_cash_payments || 0)}
              </span>
            </div>
            <div className='flex justify-between'>
              <span>Total Credit:</span>
              <span>
                {formatAmount(selectedShift?.total_credit_payments || 0)}
              </span>
            </div>
            <div className='flex justify-between'>
              <span>Total Card:</span>
              <span>
                {formatAmount(selectedShift?.total_card_payments || 0)}
              </span>
            </div>
            <div className='flex justify-between'>
              <span>Total Transfer:</span>
              <span>
                {formatAmount(selectedShift?.total_bank_payments || 0)}
              </span>
            </div>
            <div className='flex justify-between'>
              <span>Total QRIS:</span>
              <span>
                {formatAmount(selectedShift?.total_qris_payments || 0)}
              </span>
            </div>
            <div className='flex justify-between'>
              <span>Estimasi Kas Akhir:</span>
              <span>
                {formatAmount(
                  (selectedShift?.starting_balance || 0) +
                    (selectedShift?.total_cash_payments || 0)
                )}
              </span>
            </div>
            <div className='flex justify-between'>
              <span>Kas Aktual:</span>
              <span>{formatAmount(selectedShift?.actual_balance || 0)}</span>
            </div>
            <div className='flex justify-between font-bold'>
              <span>Selisih Kas:</span>
              <span>{formatAmount(selectedShift?.cash_difference || 0)}</span>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline' size='sm'>
                Tutup
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}
