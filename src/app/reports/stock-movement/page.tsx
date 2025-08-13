'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
} from '@/components/ui/table'
import { CalendarIcon, Download, Info } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  parseISO,
  endOfDay,
  startOfDay,
  isValid,
} from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import Image from 'next/image'
import { listProducts } from '@/lib/laravel/product'
import type { Product } from '@/lib/types'
import {
  getLiveStockMovement,
  getCachedStockMovement,
  type ClientStockMovementRow,
} from '@/lib/laravel/stockMovementService'
import { ITEMS_PER_PAGE_OPTIONS } from '@/lib/types'
import {
  Alert,
  AlertDescription as AlertDescUI,
  AlertTitle as AlertTitleUI,
} from '@/components/ui/alert'

interface StockMovementReportData {
  product: Product
  movements: ClientStockMovementRow[]
  currentStock: number
}

export default function StockMovementReportPage() {
  const { selectedBranch } = useBranches()
  const { toast } = useToast()

  const [inventoryItems, setInventoryItems] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<
    string | undefined
  >(undefined)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [loadingReport, setLoadingReport] = useState(false)
  const [loadingInventory, setLoadingInventory] = useState(true)
  const [reportData, setReportData] = useState<StockMovementReportData | null>(
    null
  )
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    ITEMS_PER_PAGE_OPTIONS[0]
  )
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / itemsPerPage)),
    [totalItems, itemsPerPage]
  )
  const [useLive, setUseLive] = useState(true)
  const [fullRows, setFullRows] = useState<ClientStockMovementRow[]>([])

  useEffect(() => {
    const now = new Date()
    setStartDate(startOfMonth(now))
    setEndDate(endOfMonth(now))
  }, [selectedBranch])

  const fetchInventory = useCallback(async () => {
    if (!selectedBranch) {
      setInventoryItems([])
      setLoadingInventory(false)
      return
    }
    setLoadingInventory(true)
    try {
      const res = await listProducts({
        branchId: selectedBranch.id,
        page: 1,
        limit: 200,
      })
      setInventoryItems(res.data)
    } catch (e) {
      setInventoryItems([])
    } finally {
      setLoadingInventory(false)
    }
  }, [selectedBranch])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  const handleGenerateReport = useCallback(async () => {
    if (!selectedBranch) {
      toast({
        title: 'Pilih Cabang',
        description: 'Silakan pilih cabang terlebih dahulu.',
        variant: 'destructive',
      })
      return
    }
    if (!selectedProductId) {
      toast({
        title: 'Pilih Produk',
        description: 'Silakan pilih produk.',
        variant: 'destructive',
      })
      return
    }
    if (!startDate || !endDate) {
      toast({
        title: 'Tanggal Tidak Lengkap',
        description: 'Pilih tanggal mulai dan akhir.',
        variant: 'destructive',
      })
      return
    }
    if (endDate < startDate) {
      toast({
        title: 'Rentang Tidak Valid',
        description: 'Tanggal akhir < tanggal mulai.',
        variant: 'destructive',
      })
      return
    }

    setLoadingReport(true)
    setReportData(null)
    try {
      const product = inventoryItems.find(
        (item) => `${item.id}` === selectedProductId
      )
      if (!product) {
        toast({ title: 'Produk Tidak Ditemukan', variant: 'destructive' })
        return
      }

      const params = {
        branch_id: selectedBranch.id,
        product_id: Number(product.id),
        start_date: startDate.toISOString().slice(0, 10),
        end_date: endDate.toISOString().slice(0, 10),
      }

      let data
      if (useLive) {
        data = await getLiveStockMovement(params)
      } else {
        try {
          data = await getCachedStockMovement(params)
        } catch (e: any) {
          if (e?.response?.status === 404) {
            toast({
              title: 'Data Belum Tersedia',
              description: 'Laporan tersimpan belum ada. Gunakan Lihat Live.',
            })
          } else {
            toast({ title: 'Gagal memuat laporan', variant: 'destructive' })
          }
          return
        }
      }

      const rows = (data.data ?? []) as ClientStockMovementRow[]
      setFullRows(rows)
      setTotalItems(rows.length)
      const startIdx = (currentPage - 1) * itemsPerPage
      const endIdx = startIdx + itemsPerPage
      const pageSlice = rows.slice(startIdx, endIdx)
      setReportData({
        product,
        movements: pageSlice,
        currentStock: data.current_stock ?? product.quantity,
      })
    } catch (error) {
      console.error('Error generating stock movement report:', error)
      toast({
        title: 'Gagal Membuat Laporan',
        description: 'Terjadi kesalahan saat mengambil data.',
        variant: 'destructive',
      })
    } finally {
      setLoadingReport(false)
    }
  }, [
    selectedBranch,
    selectedProductId,
    startDate,
    endDate,
    useLive,
    currentPage,
    itemsPerPage,
    inventoryItems,
    toast,
  ])

  // Re-slice when pagination changes
  useEffect(() => {
    if (!reportData) return
    const startIdx = (currentPage - 1) * itemsPerPage
    const endIdx = startIdx + itemsPerPage
    const pageSlice = fullRows.slice(startIdx, endIdx)
    setReportData((prev) => (prev ? { ...prev, movements: pageSlice } : prev))
  }, [currentPage, itemsPerPage, fullRows])

  const formatMovementDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = parseISO(dateString)
    if (!isValid(date)) return 'Tanggal Invalid'
    return format(date, 'dd MMM yyyy, HH:mm')
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-6'>
          <div className='flex flex-col sm:flex-row justify-between items-center gap-3'>
            <h1 className='text-xl md:text-2xl font-semibold font-headline'>
              Laporan Pergerakan Stok Produk{' '}
              {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            {reportData && !loadingReport && (
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  className='rounded-md text-xs'
                  onClick={() => {
                    const headers = [
                      'Tanggal',
                      'Tipe',
                      'Dok. Terkait',
                      'Catatan',
                      '+/- Jml',
                      'Stok Sblm',
                      'Stok Ssdh',
                    ]
                    const rows = reportData.movements.map((m) => [
                      m.mutationTime,
                      m.type,
                      m.referenceId ?? '',
                      m.notes ?? '',
                      m.type === 'INITIAL_STOCK'
                        ? ''
                        : m.quantityChange > 0
                        ? `+${m.quantityChange}`
                        : `${m.quantityChange}`,
                      m.stockBeforeMutation,
                      m.stockAfterMutation,
                    ])
                    const csv = [headers, ...rows]
                      .map((r) =>
                        r
                          .map((v) => `"${String(v).replaceAll('"', '""')}"`)
                          .join(',')
                      )
                      .join('\n')
                    const blob = new Blob([csv], {
                      type: 'text/csv;charset=utf-8;',
                    })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `stock-movement-${
                      reportData.product.sku || reportData.product.id
                    }-${startDate ? format(startDate, 'yyyyMMdd') : 'NA'}-${
                      endDate ? format(endDate, 'yyyyMMdd') : 'NA'
                    }.csv`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  <Download className='mr-1.5 h-3.5 w-3.5' /> Ekspor CSV
                </Button>
              </div>
            )}
          </div>

          <Card className='shadow-sm'>
            <CardHeader className='p-4'>
              <CardTitle className='text-base font-semibold'>
                Filter Laporan
              </CardTitle>
              <CardDescription className='text-xs'>
                Pilih produk dan rentang tanggal untuk melihat pergerakan
                stoknya.
              </CardDescription>
            </CardHeader>
            <CardContent className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end p-4 pt-0'>
              <div className='lg:col-span-2'>
                <label
                  htmlFor='productSelect'
                  className='block text-xs font-medium mb-1'
                >
                  Produk
                </label>
                <Select
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                  disabled={loadingInventory || inventoryItems.length === 0}
                >
                  <SelectTrigger
                    id='productSelect'
                    className='rounded-md h-9 text-xs'
                  >
                    <SelectValue
                      placeholder={
                        loadingInventory
                          ? 'Memuat produk...'
                          : inventoryItems.length === 0
                          ? 'Tidak ada produk'
                          : 'Pilih produk'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryItems.map((item) => (
                      <SelectItem
                        key={item.id}
                        value={String(item.id)}
                        className='text-xs'
                      >
                        {item.name} (SKU: {item.sku || '-'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label
                  htmlFor='startDate'
                  className='block text-xs font-medium mb-1'
                >
                  Tanggal Mulai
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className='w-full justify-start text-left font-normal rounded-md h-9 text-xs'
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
                      className='text-xs'
                    />
                  </PopoverContent>
                </Popover>
              </div>
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
                      disabled={startDate ? { before: startDate } : undefined}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className='block text-xs font-medium mb-1'>
                  Sumber Data
                </label>
                <Select
                  value={useLive ? 'live' : 'cached'}
                  onValueChange={(v) => setUseLive(v === 'live')}
                >
                  <SelectTrigger className='rounded-md h-9 text-xs'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='live' className='text-xs'>
                      Lihat Live (Tidak Disimpan)
                    </SelectItem>
                    <SelectItem value='cached' className='text-xs'>
                      Lihat Tersimpan (Backend)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className='block text-xs font-medium mb-1'>
                  Per Halaman
                </label>
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(v) => {
                    setItemsPerPage(Number(v))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className='rounded-md h-9 text-xs'>
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
              </div>
              <Button
                size='sm'
                className='w-full sm:w-auto self-end rounded-md text-xs h-9'
                onClick={handleGenerateReport}
                disabled={loadingReport || !selectedBranch || loadingInventory}
              >
                {loadingReport ? 'Memuat...' : 'Buat Laporan'}
              </Button>
            </CardContent>
          </Card>

          {loadingReport && (
            <Card className='shadow-sm'>
              <CardHeader className='p-4'>
                <Skeleton className='h-6 w-1/3' />
                <Skeleton className='h-4 w-1/2 mt-1' />
              </CardHeader>
              <CardContent className='p-4 space-y-2'>
                <Skeleton className='h-8 w-full' />
                <Skeleton className='h-8 w-full' />
                <Skeleton className='h-8 w-full' />
              </CardContent>
            </Card>
          )}

          {reportData && !loadingReport && (
            <Card className='shadow-sm'>
              <CardHeader className='p-4'>
                <div className='flex justify-between items-start'>
                  <div>
                    <CardTitle className='text-base font-semibold'>
                      Laporan Pergerakan Stok: {reportData.product.name}
                    </CardTitle>
                    <CardDescription className='text-xs mt-0.5'>
                      SKU: {reportData.product.sku || '-'} | Kategori:{' '}
                      {reportData.product.category_name || '-'} <br />
                      Periode:{' '}
                      {startDate
                        ? format(startDate, 'dd MMM yyyy')
                        : 'N/A'} -{' '}
                      {endDate ? format(endDate, 'dd MMM yyyy') : 'N/A'} <br />
                      Stok Live Saat Ini (di Inventaris):{' '}
                      {reportData.currentStock}
                    </CardDescription>
                  </div>
                  <div className='text-right'>
                    <Image
                      src={
                        reportData.product.image_url ||
                        `https://placehold.co/80x80.png`
                      }
                      alt={reportData.product.name}
                      width={60}
                      height={60}
                      className='rounded object-cover border'
                      data-ai-hint={
                        reportData.product.image_hint ||
                        reportData.product.name
                          .split(' ')
                          .slice(0, 2)
                          .join(' ')
                          .toLowerCase()
                      }
                      onError={(e) =>
                        (e.currentTarget.src = 'https://placehold.co/80x80.png')
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className='p-4 overflow-x-auto'>
                {reportData.movements.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className='text-xs w-[150px]'>
                            Tanggal
                          </TableHead>
                          <TableHead className='text-xs'>Tipe</TableHead>
                          <TableHead className='text-xs hidden sm:table-cell'>
                            Dok. Terkait
                          </TableHead>
                          <TableHead className='text-xs hidden md:table-cell'>
                            Catatan
                          </TableHead>
                          <TableHead className='text-xs text-right'>
                            +/- Jml
                          </TableHead>
                          <TableHead className='text-xs text-right'>
                            Stok Sblm
                          </TableHead>
                          <TableHead className='text-xs text-right'>
                            Stok Ssdh
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.movements.map((move, index) => (
                          <TableRow key={move.id + index}>
                            <TableCell className='text-xs py-1.5'>
                              {formatMovementDate(move.mutationTime)}
                            </TableCell>
                            <TableCell className='text-xs py-1.5 font-medium'>
                              {move.type === 'INITIAL_STOCK'
                                ? 'Stok Awal Periode'
                                : move.type}
                            </TableCell>
                            <TableCell className='text-xs hidden sm:table-cell py-1.5'>
                              {move.referenceId ?? '-'}
                            </TableCell>
                            <TableCell
                              className='text-xs hidden md:table-cell py-1.5 max-w-[200px] truncate'
                              title={move.notes || ''}
                            >
                              {move.notes || '-'}
                            </TableCell>
                            <TableCell
                              className={`text-xs text-right py-1.5 font-semibold ${
                                move.quantityChange > 0
                                  ? 'text-green-600'
                                  : move.quantityChange < 0
                                  ? 'text-destructive'
                                  : ''
                              }`}
                            >
                              {move.type === 'INITIAL_STOCK'
                                ? '-'
                                : move.quantityChange > 0
                                ? `+${move.quantityChange}`
                                : `${move.quantityChange}`}
                            </TableCell>
                            <TableCell className='text-xs text-right py-1.5'>
                              {move.stockBeforeMutation}
                            </TableCell>
                            <TableCell className='text-xs text-right py-1.5 font-bold'>
                              {move.stockAfterMutation}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Alert
                      variant='default'
                      className='mt-4 text-xs bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700/50 dark:text-blue-300'
                    >
                      <Info className='h-4 w-4 !text-blue-600 dark:!text-blue-400' />
                      <AlertTitleUI className='font-semibold text-blue-700 dark:text-blue-200'>
                        Catatan Kalkulasi
                      </AlertTitleUI>
                      <AlertDescUI className='text-blue-600 dark:text-blue-400'>
                        <ul className='list-disc pl-4'>
                          <li>
                            <strong>Stok Awal Periode:</strong> Stok produk pada
                            akhir hari sebelum Tanggal Mulai periode laporan,
                            dihitung berdasarkan riwayat mutasi.
                          </li>
                          <li>
                            <strong>Pergerakan:</strong> Semua mutasi
                            (Penjualan, Retur, Penerimaan PO, dll.) dalam
                            periode laporan.
                          </li>
                          <li>
                            <strong>Stok Live Saat Ini:</strong> Stok produk
                            aktual di master inventaris saat ini.
                          </li>
                        </ul>
                      </AlertDescUI>
                    </Alert>
                    <div className='flex justify-between items-center pt-3'>
                      <Button
                        variant='outline'
                        size='sm'
                        className='text-xs h-8'
                        onClick={() =>
                          currentPage > 1 && setCurrentPage((p) => p - 1)
                        }
                        disabled={currentPage <= 1 || loadingReport}
                      >
                        Sebelumnya
                      </Button>
                      <span className='text-xs text-muted-foreground'>
                        Halaman {currentPage} dari {totalPages}
                      </span>
                      <Button
                        variant='outline'
                        size='sm'
                        className='text-xs h-8'
                        onClick={() =>
                          currentPage < totalPages &&
                          setCurrentPage((p) => p + 1)
                        }
                        disabled={currentPage >= totalPages || loadingReport}
                      >
                        Berikutnya
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className='text-sm text-muted-foreground text-center py-6'>
                    {selectedProductId
                      ? 'Tidak ada data pergerakan stok untuk produk dan periode yang dipilih.'
                      : 'Pilih produk terlebih dahulu untuk melihat laporan.'}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!reportData && !loadingReport && (
            <Card className='shadow-sm'>
              <CardContent className='p-10 text-center'>
                <p className='text-sm text-muted-foreground'>
                  Pilih produk dan rentang tanggal, lalu klik "Buat Laporan"
                  untuk melihat hasilnya. Jika laporan tersimpan belum tersedia,
                  gunakan opsi "Lihat Live".
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
