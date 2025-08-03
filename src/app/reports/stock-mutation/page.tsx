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
  endOfDay,
  startOfDay,
  subDays,
} from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { getInventoryItems, type InventoryItem } from '@/lib/firebase/inventory'
import {
  getStockLevelAtDate,
  getMutationsForProductInRange,
  type StockMutation,
} from '@/lib/firebase/stockMutations'

interface StockMutationReportItem {
  productId: string
  productName: string
  sku?: string
  categoryName?: string
  initialStock: number
  stockInFromPO: number
  stockSold: number
  stockReturned: number
  finalStockCalculated: number // Renamed from finalStock
  currentLiveStock: number // Stock from inventoryItems
}

export default function StockMutationReportPage() {
  const { selectedBranch } = useBranches()
  const { toast } = useToast()

  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [loadingReport, setLoadingReport] = useState(false)
  const [reportData, setReportData] = useState<
    StockMutationReportItem[] | null
  >(null)

  useEffect(() => {
    if (selectedBranch && selectedBranch.defaultReportPeriod) {
      const now = new Date()
      let newStart: Date, newEnd: Date
      switch (selectedBranch.defaultReportPeriod) {
        case 'thisWeek':
          newStart = startOfWeek(now, { weekStartsOn: 1 })
          newEnd = endOfWeek(now, { weekStartsOn: 1 })
          break
        case 'today':
          newStart = startOfDay(now)
          newEnd = endOfDay(now)
          break
        case 'thisMonth':
        default:
          newStart = startOfMonth(now)
          newEnd = endOfMonth(now)
          break
      }
      setStartDate(newStart)
      setEndDate(newEnd)
    } else if (!selectedBranch) {
      setStartDate(startOfMonth(new Date()))
      setEndDate(endOfMonth(new Date()))
    } else {
      setStartDate(startOfMonth(new Date()))
      setEndDate(endOfMonth(new Date()))
    }
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
    if (!startDate || !endDate) {
      toast({
        title: 'Tanggal Tidak Lengkap',
        description: 'Silakan pilih tanggal mulai dan tanggal akhir.',
        variant: 'destructive',
      })
      return
    }
    if (endDate < startDate) {
      toast({
        title: 'Rentang Tanggal Tidak Valid',
        description: 'Tanggal akhir tidak boleh sebelum tanggal mulai.',
        variant: 'destructive',
      })
      return
    }

    setLoadingReport(true)
    setReportData(null)

    try {
      const inventoryItemsResult = await getInventoryItems(selectedBranch.id)
      const itemsArrayForReport = inventoryItemsResult.items

      if (itemsArrayForReport.length === 0) {
        toast({
          title: 'Tidak Ada Produk',
          description:
            'Tidak ada produk inventaris ditemukan untuk cabang ini.',
          variant: 'default',
        })
        setLoadingReport(false)
        return
      }

      const processedData: StockMutationReportItem[] = []

      for (const item of itemsArrayForReport) {
        const dateBeforeStartDate = subDays(startDate, 1) // Get stock at end of day before startDate
        const initialStock = await getStockLevelAtDate(
          item.id,
          selectedBranch.id,
          dateBeforeStartDate
        )

        const mutationsInPeriod = await getMutationsForProductInRange(
          item.id,
          selectedBranch.id,
          startDate,
          endDate
        )

        let stockInFromPO = 0
        let stockSold = 0
        let stockReturned = 0
        // Can add other mutation types here like ADJUSTMENT_IN, ADJUSTMENT_OUT

        mutationsInPeriod.forEach((mutation) => {
          switch (mutation.type) {
            case 'PURCHASE_RECEIPT':
              stockInFromPO += mutation.quantityChange
              break
            case 'SALE':
              stockSold += Math.abs(mutation.quantityChange) // quantityChange is negative
              break
            case 'SALE_RETURN':
              stockReturned += mutation.quantityChange
              break
            case 'TRANSACTION_DELETED_SALE_RESTOCK':
              // This is effectively a "return" or "inflow" from a sale perspective
              stockReturned += mutation.quantityChange
              break
            // Add cases for ADJUSTMENT_IN, ADJUSTMENT_OUT etc. if needed
          }
        })

        const finalStockCalculated =
          initialStock + stockInFromPO - stockSold + stockReturned

        processedData.push({
          productId: item.id,
          productName: item.name,
          sku: item.sku,
          categoryName: item.categoryName,
          initialStock: initialStock,
          stockInFromPO: stockInFromPO,
          stockSold: stockSold,
          stockReturned: stockReturned,
          finalStockCalculated: finalStockCalculated,
          currentLiveStock: item.quantity, // This is the current live stock from inventoryItems
        })
      }

      setReportData(processedData)

      if (
        processedData.length > 0 &&
        processedData.every(
          (p) =>
            p.initialStock === p.finalStockCalculated &&
            p.stockInFromPO === 0 &&
            p.stockSold === 0 &&
            p.stockReturned === 0
        )
      ) {
        toast({
          title: 'Tidak Ada Mutasi',
          description:
            'Tidak ada pergerakan stok signifikan (penjualan, retur, atau penerimaan PO) untuk produk pada periode ini.',
          variant: 'default',
        })
      }
    } catch (error: any) {
      console.error('Error generating stock mutation report:', error)
      toast({
        title: 'Gagal Membuat Laporan',
        description: 'Terjadi kesalahan saat mengambil data.',
        variant: 'destructive',
      })
    } finally {
      setLoadingReport(false)
    }
  }, [selectedBranch, startDate, endDate, toast])

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-6'>
          <div className='flex flex-col sm:flex-row justify-between items-center gap-3'>
            <h1 className='text-xl md:text-2xl font-semibold font-headline'>
              Laporan Mutasi Stok{' '}
              {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            {reportData && !loadingReport && (
              <Button
                variant='outline'
                size='sm'
                className='rounded-md text-xs'
                disabled
              >
                <Download className='mr-1.5 h-3.5 w-3.5' /> Ekspor ke CSV/PDF
                (Segera)
              </Button>
            )}
          </div>

          <Card className='shadow-sm'>
            <CardHeader className='p-4'>
              <CardTitle className='text-base font-semibold'>
                Filter Laporan
              </CardTitle>
              <CardDescription className='text-xs'>
                Pilih rentang tanggal untuk melihat mutasi stok.
              </CardDescription>
            </CardHeader>
            <CardContent className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end p-4 pt-0'>
              <div className='lg:col-span-1'>
                <label
                  htmlFor='branch'
                  className='block text-xs font-medium mb-1'
                >
                  Cabang
                </label>
                <Select value={selectedBranch?.id || ''} disabled>
                  <SelectTrigger id='branch' className='rounded-md h-9 text-xs'>
                    <SelectValue placeholder='Pilih Cabang' />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedBranch ? (
                      <SelectItem value={selectedBranch.id} className='text-xs'>
                        {selectedBranch.name}
                      </SelectItem>
                    ) : (
                      <SelectItem value='' className='text-xs' disabled>
                        Pilih cabang dari sidebar
                      </SelectItem>
                    )}
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
                      disabled={{ before: startDate }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button
                size='sm'
                className='w-full sm:w-auto self-end rounded-md text-xs h-9'
                onClick={handleGenerateReport}
                disabled={loadingReport || !selectedBranch}
              >
                {loadingReport ? 'Memuat...' : 'Buat Laporan'}
              </Button>
            </CardContent>
          </Card>

          {loadingReport && (
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

          {reportData && !loadingReport && (
            <Card className='shadow-sm'>
              <CardHeader className='p-4'>
                <CardTitle className='text-base font-semibold'>
                  Laporan Mutasi Stok
                </CardTitle>
                <CardDescription className='text-xs'>
                  Untuk cabang: {selectedBranch?.name || 'N/A'} <br />
                  Periode:{' '}
                  {startDate ? format(startDate, 'dd MMM yyyy') : 'N/A'} -{' '}
                  {endDate ? format(endDate, 'dd MMM yyyy') : 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent className='p-4 overflow-x-auto'>
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
                      {reportData.map((item) => (
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
              </CardContent>
            </Card>
          )}

          {!reportData && !loadingReport && (
            <Card className='shadow-sm'>
              <CardContent className='p-10 text-center'>
                <p className='text-sm text-muted-foreground'>
                  Pilih filter di atas dan klik "Buat Laporan" untuk melihat
                  hasilnya.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
