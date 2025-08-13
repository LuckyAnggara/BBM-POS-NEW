'use client'

import React, { useState, useEffect, useCallback } from 'react'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useBranches } from '@/contexts/branch-context'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table'
import { CalendarIcon, Download } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  endOfDay,
  startOfDay,
} from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import {
  generateStockMutationReport,
  getStockMutationReport,
  getLiveStockMutationReport,
  type StockMutationReportItem,
} from '@/lib/laravel/stockMutationReportService'
import { ITEMS_PER_PAGE_OPTIONS } from '@/lib/types'

// Types imported from service

export default function StockMutationReportPage() {
  const { selectedBranch } = useBranches()
  const { toast } = useToast()

  // Start date is fixed at 01 Jan 2025 by backend; remove UI for start date
  const fixedStart = new Date('2025-01-01T00:00:00')
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [loadingGenerate, setLoadingGenerate] = useState(false)
  const [loadingView, setLoadingView] = useState(false)
  const [reportData, setReportData] = useState<
    StockMutationReportItem[] | null
  >(null)
  const [perPage, setPerPage] = useState<number>(
    ITEMS_PER_PAGE_OPTIONS[1] || 20
  )
  const [page, setPage] = useState<number>(1)

  const paginated = React.useMemo(() => {
    if (!reportData) return []
    const start = (page - 1) * perPage
    return reportData.slice(start, start + perPage)
  }, [reportData, page, perPage])
  const totalPages = React.useMemo(() => {
    if (!reportData || perPage <= 0) return 1
    return Math.max(1, Math.ceil(reportData.length / perPage))
  }, [reportData, perPage])

  useEffect(() => {
    // Default end date to end of month whenever branch changes or on mount
    const now = new Date()
    setEndDate(endOfMonth(now))
  }, [selectedBranch])

  const handleGenerateReport = useCallback(async () => {
    if (!selectedBranch) {
      toast({
        title: 'Pilih Cabang',
        description: 'Silakan pilih cabang terlebih dahulu.',
        variant: 'destructive',
      })
      return
    }
    if (!endDate) {
      toast({
        title: 'Tanggal Tidak Lengkap',
        description: 'Silakan pilih tanggal akhir.',
        variant: 'destructive',
      })
      return
    }
    setLoadingGenerate(true)
    setReportData(null)
    setPage(1)

    try {
      const apiEnd = format(endDate, 'yyyy-MM-dd')

      await generateStockMutationReport({
        branch_id: Number(selectedBranch.id),
        end_date: apiEnd,
      })

      const stored = await getStockMutationReport({
        branch_id: Number(selectedBranch.id),
        end_date: apiEnd,
      })

      const items: StockMutationReportItem[] = stored?.data || []
      setReportData(items)

      if (!items || items.length === 0) {
        toast({
          title: 'Tidak Ada Data',
          description:
            'Tidak ada produk atau mutasi stok pada periode ini untuk cabang terpilih.',
          variant: 'default',
        })
      } else {
        toast({
          title: 'Laporan Diperbarui',
          description: 'Laporan berhasil digenerate dan disimpan.',
          variant: 'default',
        })
      }
    } catch (error: any) {
      console.error('Error generating stock mutation report:', error)
      toast({
        title: 'Gagal Membuat Laporan',
        description: 'Terjadi kesalahan saat membuat laporan.',
        variant: 'destructive',
      })
    } finally {
      setLoadingGenerate(false)
    }
  }, [selectedBranch, endDate, toast])

  const handleViewReport = useCallback(async () => {
    if (!selectedBranch) {
      toast({
        title: 'Pilih Cabang',
        description: 'Silakan pilih cabang terlebih dahulu.',
        variant: 'destructive',
      })
      return
    }
    if (!endDate) {
      toast({
        title: 'Tanggal Tidak Lengkap',
        description: 'Silakan pilih tanggal akhir.',
        variant: 'destructive',
      })
      return
    }

    setLoadingView(true)
    setReportData(null)
    setPage(1)
    try {
      const apiEnd = format(endDate, 'yyyy-MM-dd')
      const stored = await getStockMutationReport({
        branch_id: Number(selectedBranch.id),
        end_date: apiEnd,
      })
      const items: StockMutationReportItem[] = stored?.data || []
      setReportData(items)

      if (!items || items.length === 0) {
        toast({
          title: 'Laporan Tidak Ditemukan',
          description:
            'Belum ada laporan tersimpan untuk periode ini. Gunakan Generate Laporan terlebih dahulu.',
          variant: 'default',
        })
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        toast({
          title: 'Laporan Tidak Ditemukan',
          description:
            'Belum ada laporan tersimpan untuk periode ini. Gunakan Generate Laporan terlebih dahulu.',
          variant: 'default',
        })
      } else {
        toast({
          title: 'Gagal Memuat Laporan',
          description: 'Terjadi kesalahan saat mengambil data.',
          variant: 'destructive',
        })
      }
    } finally {
      setLoadingView(false)
    }
  }, [selectedBranch, endDate, toast])

  const handleLiveReport = useCallback(async () => {
    if (!selectedBranch) {
      toast({
        title: 'Pilih Cabang',
        description: 'Silakan pilih cabang terlebih dahulu.',
        variant: 'destructive',
      })
      return
    }
    setLoadingView(true)
    setReportData(null)
    setPage(1)
    try {
      const live = await getLiveStockMutationReport(Number(selectedBranch.id))
      const items: StockMutationReportItem[] = live?.data || []
      setReportData(items)
      if (!items || items.length === 0) {
        toast({
          title: 'Tidak Ada Data',
          description: 'Tidak ada data untuk laporan live hari ini.',
          variant: 'default',
        })
      }
    } catch (e) {
      toast({
        title: 'Gagal Memuat Laporan',
        description: 'Terjadi kesalahan saat mengambil laporan live.',
        variant: 'destructive',
      })
    } finally {
      setLoadingView(false)
    }
  }, [selectedBranch, toast])

  const handleExportCsv = useCallback(() => {
    if (!reportData || reportData.length === 0) return
    const headers = [
      'Produk',
      'SKU',
      'Kategori',
      'Stok Awal Periode',
      'Masuk (PO) (+)',
      'Terjual (-)',
      'Retur Jual (+)',
      'Stok Akhir Periode (Hit.)',
      'Stok Live Saat Ini',
    ]
    const rows = reportData.map((r) => [
      r.productName,
      r.sku ?? '',
      r.categoryName ?? '',
      r.initialStock,
      r.stockInFromPO,
      r.stockSold,
      r.stockReturned,
      r.finalStockCalculated,
      r.currentLiveStock,
    ])
    const csv = [headers, ...rows]
      .map((arr) =>
        arr
          .map((v) => String(v).replaceAll('"', '""'))
          .map((v) => `"${v}"`)
          .join(',')
      )
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const endLabel = endDate ? format(endDate, 'yyyy-MM-dd') : 'live'
    a.href = url
    a.download = `mutasi-stok-${
      selectedBranch?.name || 'cabang'
    }-${endLabel}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [reportData, selectedBranch, endDate])

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-6'>
          <div className='flex flex-col sm:flex-row justify-between items-center gap-3'>
            <h1 className='text-xl md:text-2xl font-semibold font-headline'>
              Laporan Mutasi Stok{' '}
              {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            {reportData && !loadingGenerate && !loadingView && (
              <Button
                variant='outline'
                size='sm'
                className='rounded-md text-xs'
                onClick={handleExportCsv}
              >
                <Download className='mr-1.5 h-3.5 w-3.5' /> Ekspor CSV
              </Button>
            )}
          </div>

          <Card className='shadow-sm'>
            <CardHeader className='p-4'>
              <CardTitle className='text-base font-semibold'>
                Filter Laporan
              </CardTitle>
              <CardDescription className='text-xs'>
                Laporan backdate otomatis dibuat setiap malam. Anda dapat
                melihat laporan tersimpan (01 Jan 2025 s.d. tanggal akhir) atau
                melihat laporan live hari ini.
              </CardDescription>
            </CardHeader>
            <CardContent className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end p-4 pt-0'>
              <div className='lg:col-span-1'>
                <label
                  htmlFor='branch'
                  className='block text-xs font-medium mb-1'
                >
                  Cabang
                </label>
                <Select
                  defaultValue={
                    selectedBranch ? String(selectedBranch.id) : undefined
                  }
                  disabled
                >
                  <SelectTrigger id='branch' className='rounded-md h-9 text-xs'>
                    <SelectValue placeholder='Pilih Cabang' />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedBranch && (
                      <SelectItem
                        value={String(selectedBranch.id)}
                        className='text-xs'
                      >
                        {selectedBranch.name}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {/* Start date removed: fixed to 01 Jan 2025 */}
              <div>
                <label
                  htmlFor='endDate'
                  className='block text-xs font-medium mb-1'
                >
                  Tanggal Akhir
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className='w-full justify-start text-left font-normal rounded-md h-9 text-xs'
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
                      className='text-xs'
                      disabled={(date) => date < fixedStart}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  className='w-full sm:w-auto self-end rounded-md text-xs h-9'
                  onClick={handleViewReport}
                  disabled={loadingView || !selectedBranch}
                >
                  {loadingView ? 'Memuat...' : 'Lihat Laporan'}
                </Button>
                <Button
                  variant='secondary'
                  size='sm'
                  className='w-full sm:w-auto self-end rounded-md text-xs h-9'
                  onClick={handleLiveReport}
                  disabled={loadingView || !selectedBranch}
                >
                  Laporan Live (Hari Ini)
                </Button>
              </div>
            </CardContent>
          </Card>

          {(loadingGenerate || loadingView) && (
            <Card className='shadow-sm'>
              <CardHeader className='p-4'>
                <Skeleton className='h-6 w-1/2' />
                <Skeleton className='h-4 w-3/4 mt-1' />
              </CardHeader>
              <CardContent className='p-4 space-y-2'>
                <Skeleton className='h-8 w-full' />
                <Skeleton className='h-8 w-full' />
                <Skeleton className='h-8 w-full' />
                <Skeleton className='h-8 w-full' />
              </CardContent>
            </Card>
          )}

          {reportData && !loadingGenerate && !loadingView && (
            <Card className='shadow-sm'>
              <CardHeader className='p-4'>
                <CardTitle className='text-base font-semibold'>
                  Laporan Mutasi Stok
                </CardTitle>
                <CardDescription className='text-xs'>
                  Untuk cabang: {selectedBranch?.name || 'N/A'} <br />
                  Periode: {format(fixedStart, 'dd MMM yyyy')} -{' '}
                  {endDate
                    ? format(endDate, 'dd MMM yyyy')
                    : format(new Date(), 'dd MMM yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent className='p-4 overflow-x-auto space-y-3'>
                {/* Top controls: per-page selector and count */}
                <div className='flex items-center justify-between gap-3'>
                  <div className='text-xs text-muted-foreground'>
                    Menampilkan {paginated.length} dari {reportData.length} item
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs'>Tampil</span>
                    <Select
                      value={String(perPage)}
                      onValueChange={(v) => {
                        const n = parseInt(v, 10)
                        setPerPage(n)
                        setPage(1)
                      }}
                    >
                      <SelectTrigger className='h-8 w-24 rounded-md text-xs'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt}
                            value={String(opt)}
                            className='text-xs'
                          >
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className='text-xs'>per halaman</span>
                  </div>
                </div>

                {reportData.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='text-xs'>Produk</TableHead>
                        <TableHead className='text-xs hidden md:table-cell'>
                          SKU
                        </TableHead>
                        <TableHead className='text-xs hidden lg:table-cell'>
                          Kategori
                        </TableHead>
                        <TableHead className='text-xs text-right'>
                          Stok Awal Periode
                        </TableHead>
                        <TableHead className='text-xs text-right text-blue-600'>
                          Masuk (PO) (+)
                        </TableHead>
                        <TableHead className='text-xs text-right text-destructive'>
                          Terjual (-)
                        </TableHead>
                        <TableHead className='text-xs text-right text-green-600'>
                          Retur Jual (+)
                        </TableHead>
                        <TableHead className='text-xs text-right font-bold'>
                          Stok Akhir Periode (Hit.)
                        </TableHead>
                        <TableHead className='text-xs text-right'>
                          Stok Live Saat Ini
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((item) => (
                        <TableRow key={item.productId}>
                          <TableCell className='text-xs font-medium py-1.5'>
                            {item.productName}
                          </TableCell>
                          <TableCell className='text-xs hidden md:table-cell py-1.5'>
                            {item.sku || '-'}
                          </TableCell>
                          <TableCell className='text-xs hidden lg:table-cell py-1.5'>
                            {item.categoryName || '-'}
                          </TableCell>
                          <TableCell className='text-xs text-right py-1.5'>
                            {item.initialStock}
                          </TableCell>
                          <TableCell className='text-xs text-right py-1.5 text-blue-600'>
                            {item.stockInFromPO > 0
                              ? `${item.stockInFromPO}`
                              : '-'}
                          </TableCell>
                          <TableCell className='text-xs text-right py-1.5 text-destructive'>
                            {item.stockSold > 0 ? `${item.stockSold}` : '-'}
                          </TableCell>
                          <TableCell className='text-xs text-right py-1.5 text-green-600'>
                            {item.stockReturned > 0
                              ? `${item.stockReturned}`
                              : '-'}
                          </TableCell>
                          <TableCell className='text-xs text-right font-bold py-1.5'>
                            {item.finalStockCalculated}
                          </TableCell>
                          <TableCell className='text-xs text-right py-1.5 text-muted-foreground'>
                            {item.currentLiveStock}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableCaption className='text-xs py-2 text-left'>
                      <strong>Catatan:</strong>
                      <ul className='list-disc pl-4'>
                        <li>
                          <strong>Stok Awal Periode:</strong> Stok produk pada
                          akhir hari sebelum Tanggal Mulai periode laporan.
                        </li>
                        <li>
                          <strong>Masuk (PO) (+):</strong> Total kuantitas
                          barang diterima dari Pesanan Pembelian selama periode
                          laporan.
                        </li>
                        <li>
                          <strong>Terjual (-):</strong> Total kuantitas barang
                          terjual selama periode laporan.
                        </li>
                        <li>
                          <strong>Retur Jual (+):</strong> Total kuantitas
                          barang yang dikembalikan pelanggan selama periode
                          laporan.
                        </li>
                        <li>
                          <strong>Stok Akhir Periode (Hit.):</strong> Stok yang
                          dihitung berdasarkan Stok Awal dan semua mutasi (Masuk
                          PO, Terjual, Retur Jual) selama periode laporan.
                        </li>
                        <li>
                          <strong>Stok Live Saat Ini:</strong> Kuantitas stok
                          produk aktual di inventaris saat ini (real-time).
                        </li>
                      </ul>
                    </TableCaption>
                  </Table>
                ) : (
                  <p className='text-sm text-muted-foreground text-center py-6'>
                    Tidak ada data produk inventaris untuk ditampilkan pada
                    cabang ini atau tidak ada mutasi pada periode terpilih.
                  </p>
                )}

                {/* Pagination controls */}
                {reportData.length > 0 && (
                  <div className='flex items-center justify-between pt-1'>
                    <div className='text-xs text-muted-foreground'>
                      Halaman {page} dari {totalPages}
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-8 rounded-md text-xs'
                        onClick={() => setPage(1)}
                        disabled={page === 1}
                      >
                        « Pertama
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-8 rounded-md text-xs'
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        ‹ Sebelumnya
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-8 rounded-md text-xs'
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={page >= totalPages}
                      >
                        Berikutnya ›
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-8 rounded-md text-xs'
                        onClick={() => setPage(totalPages)}
                        disabled={page >= totalPages}
                      >
                        Terakhir »
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!reportData && !loadingGenerate && !loadingView && (
            <Card className='shadow-sm'>
              <CardContent className='p-10 text-center'>
                <p className='text-sm text-muted-foreground'>
                  Laporan belum tersedia
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
