'use client'

import MainLayout from '@/components/layout/main-layout'
import { useBranches } from '@/contexts/branch-context'
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
import { CalendarIcon, Download } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
} from 'date-fns' // Added more date-fns
import React, { useState, useEffect } from 'react' // Added useEffect
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { toast } from 'sonner'
import { listSales } from '@/lib/laravel/saleService'
import { listExpenses } from '@/lib/laravel/expenseService'
import { generateReport, getReport } from '@/lib/laravel/reportService'
import type { PaymentMethod, Sale, Expense } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

type ReportType = 'sales_summary' | 'income_statement' | 'balance_sheet'

interface SalesSummaryData {
  grossRevenueBeforeReturns: number
  totalValueReturned: number
  netRevenue: number
  totalNetTransactions: number
  averageTransactionValue: number
  salesByPaymentMethod: Record<PaymentMethod, number>
}

interface IncomeStatementData {
  grossRevenueBeforeReturns: number
  totalValueReturned: number
  netRevenue: number

  grossCOGSBeforeReturns: number
  cogsOfReturnedItems: number
  netCOGS: number

  grossProfit: number
  totalExpenses: number
  netProfit: number
  expensesBreakdown?: { category: string; amount: number }[]
}

export default function ReportsPage() {
  const { selectedBranch } = useBranches()

  const [reportType, setReportType] = useState<ReportType>('sales_summary')
  type PeriodMode = 'daily' | 'monthly' | 'ytd2025' | 'custom'
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly')
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [loadingGenerate, setLoadingGenerate] = useState(false)
  const [loadingReport, setLoadingReport] = useState(false)
  const [loadingView, setLoadingView] = useState(false)
  const [salesSummaryData, setSalesSummaryData] =
    useState<SalesSummaryData | null>(null)
  const [incomeStatementData, setIncomeStatementData] =
    useState<IncomeStatementData | null>(null)

  useEffect(() => {
    // Apply period presets when branch changes or when periodMode changes
    const now = new Date()
    if (periodMode === 'daily') {
      setStartDate(startOfDay(now))
      setEndDate(endOfDay(now))
    } else if (periodMode === 'monthly') {
      setStartDate(startOfMonth(now))
      setEndDate(endOfMonth(now))
    } else if (periodMode === 'ytd2025') {
      // Year-to-date starting from 01 Jan 2025 to today
      setStartDate(new Date(2025, 0, 1))
      setEndDate(endOfDay(now))
    } else if (periodMode === 'custom') {
      // If custom and dates not set yet (e.g., first load), default to current month
      if (!startDate || !endDate) {
        setStartDate(startOfMonth(now))
        setEndDate(endOfMonth(now))
      }
    }
  }, [selectedBranch, periodMode])

  const formatCurrency = (amount: number) => {
    return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString(
      'id-ID',
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    )}`
  }

  const validateFilters = () => {
    if (!startDate || !endDate) {
      toast.error('Tanggal Tidak Lengkap', {
        description: 'Silakan pilih tanggal mulai dan tanggal akhir.',
      })
      return false
    }
    if (endDate < startDate) {
      toast.error('Rentang Tanggal Tidak Valid', {
        description: 'Tanggal akhir tidak boleh sebelum tanggal mulai.',
      })
      return false
    }
    return true
  }

  const handleGenerateReport = async () => {
    if (!selectedBranch) {
      toast.error('Pilih Cabang', {
        description: 'Silakan pilih cabang terlebih dahulu.',
      })
      return false
    }
    if (!validateFilters()) return

    setLoadingGenerate(true)
    setSalesSummaryData(null)
    setIncomeStatementData(null)

    try {
      // Helper to format dates for Laravel API (YYYY-MM-DD)
      const apiStart = format(startDate!, 'yyyy-MM-dd')
      const apiEnd = format(endDate!, 'yyyy-MM-dd')

      // Generate and persist on backend
      const generated = await generateReport({
        branch_id: Number(selectedBranch.id),
        report_type: reportType,
        start_date: apiStart,
        end_date: apiEnd,
      })

      // Optionally display immediately after generate for good UX
      const stored = await getReport({
        branch_id: Number(selectedBranch.id),
        report_type: reportType,
        start_date: apiStart,
        end_date: apiEnd,
      })

      const data = stored?.data || {}

      // Legacy client-side fetch kept as fallback (optional)
      const fetchAllSales = async (): Promise<Sale[]> => {
        const pageSize = 100
        let page = 1
        let collected: Sale[] = []
        while (true) {
          const res = await listSales({
            branchId: String(selectedBranch.id),
            startDate: apiStart,
            endDate: apiEnd,
            page,
            limit: pageSize,
          })
          collected = collected.concat(res.data)
          const total = res.total ?? collected.length
          if (collected.length >= total || (res.data?.length ?? 0) < pageSize) {
            break
          }
          page += 1
        }
        return collected
      }

      // Fetch ALL expenses within date range (iterate pagination)
      const fetchAllExpenses = async (): Promise<Expense[]> => {
        const pageSize = 100
        let page = 1
        let collected: Expense[] = []
        while (true) {
          const res = await listExpenses({
            branchId: Number(selectedBranch.id),
            startDate: apiStart,
            endDate: apiEnd,
            page,
            limit: pageSize,
          } as any)
          collected = collected.concat(res.data)
          const total = res.total ?? collected.length
          if (collected.length >= total || (res.data?.length ?? 0) < pageSize) {
            break
          }
          page += 1
        }
        return collected
      }

      // If backend returned data, prefer it; otherwise fallback to client computation
      const allSales = [] as Sale[]
      const completedTransactions = [] as Sale[]
      const returnedTransactions = [] as Sale[]
      const totalValueReturned = data?.totalValueReturned ?? 0
      const cogsOfReturnedItems = data?.cogsOfReturnedItems ?? 0

      if (reportType === 'sales_summary') {
        const netRevenue = data?.netRevenue ?? 0
        const grossRevenueBeforeReturns =
          data?.grossRevenueBeforeReturns ?? netRevenue + totalValueReturned

        const salesByPaymentMethod: Record<PaymentMethod, number> = {
          cash: data?.salesByPaymentMethod?.cash ?? 0,
          card: data?.salesByPaymentMethod?.card ?? 0,
          transfer: data?.salesByPaymentMethod?.transfer ?? 0,
          qris: 0 as any,
          credit: 0 as any,
        }

        const totalNetTransactions = data?.totalNetTransactions ?? 0
        const averageTransactionValue = data?.averageTransactionValue ?? 0

        setSalesSummaryData({
          grossRevenueBeforeReturns,
          totalValueReturned,
          netRevenue,
          totalNetTransactions,
          averageTransactionValue,
          salesByPaymentMethod,
        })
        if (!data || Object.keys(data).length === 0) {
          toast.error('Tidak Ada Data', {
            description:
              'Tidak ada transaksi (selesai maupun retur) ditemukan untuk rentang tanggal dan cabang yang dipilih.',
          })
        } else {
          toast.success('Laporan Diperbarui', {
            description: 'Laporan berhasil digenerate dan disimpan.',
          })
        }
      } else if (reportType === 'income_statement') {
        const netRevenue = data?.netRevenue ?? 0
        const netCOGS = data?.netCOGS ?? 0
        const grossRevenueBeforeReturns =
          data?.grossRevenueBeforeReturns ?? netRevenue + totalValueReturned
        const grossCOGSBeforeReturns =
          data?.grossCOGSBeforeReturns ?? netCOGS + cogsOfReturnedItems

        const totalExpenses = data?.totalExpenses ?? 0
        const expensesBreakdown = data?.expensesBreakdown ?? []

        const grossProfit = data?.grossProfit ?? netRevenue - netCOGS
        const netProfit = data?.netProfit ?? grossProfit - totalExpenses

        setIncomeStatementData({
          grossRevenueBeforeReturns,
          totalValueReturned,
          netRevenue,
          grossCOGSBeforeReturns,
          cogsOfReturnedItems,
          netCOGS,
          grossProfit,
          totalExpenses,
          netProfit,
          expensesBreakdown,
        })

        if (!data || Object.keys(data).length === 0) {
          toast.error('Tidak Ada Data', {
            description:
              'Tidak ada data transaksi penjualan, retur, maupun pengeluaran ditemukan untuk periode ini.',
          })
        } else {
          toast.success('Laporan Diperbarui', {
            description: 'Laporan berhasil digenerate dan disimpan.',
          })
        }
      } else {
        toast.info('Fitur Belum Tersedia', {
          description: `Pembuatan laporan "${reportType}" belum diimplementasikan.`,
        })
      }
    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Gagal Membuat Laporan', {
        description: 'Terjadi kesalahan saat mengambil data.',
      })
    }
    setLoadingGenerate(false)
  }

  const handleViewReport = async () => {
    if (!selectedBranch) {
      toast.error('Pilih Cabang', {
        description: 'Silakan pilih cabang terlebih dahulu.',
      })
      return false
    }
    if (!validateFilters()) return

    setLoadingView(true)
    setSalesSummaryData(null)
    setIncomeStatementData(null)

    try {
      const apiStart = format(startDate!, 'yyyy-MM-dd')
      const apiEnd = format(endDate!, 'yyyy-MM-dd')

      const stored = await getReport({
        branch_id: Number(selectedBranch.id),
        report_type: reportType,
        start_date: apiStart,
        end_date: apiEnd,
      })

      const data = stored?.data || {}

      if (reportType === 'sales_summary') {
        const netRevenue = data?.netRevenue ?? 0
        const totalValueReturned = data?.totalValueReturned ?? 0
        const grossRevenueBeforeReturns =
          data?.grossRevenueBeforeReturns ?? netRevenue + totalValueReturned
        const salesByPaymentMethod: Record<PaymentMethod, number> = {
          cash: data?.salesByPaymentMethod?.cash ?? 0,
          card: data?.salesByPaymentMethod?.card ?? 0,
          transfer: data?.salesByPaymentMethod?.transfer ?? 0,
          qris: 0 as any,
          credit: 0 as any,
        }
        const totalNetTransactions = data?.totalNetTransactions ?? 0
        const averageTransactionValue = data?.averageTransactionValue ?? 0

        setSalesSummaryData({
          grossRevenueBeforeReturns,
          totalValueReturned,
          netRevenue,
          totalNetTransactions,
          averageTransactionValue,
          salesByPaymentMethod,
        })
      } else if (reportType === 'income_statement') {
        const netRevenue = data?.netRevenue ?? 0
        const totalValueReturned = data?.totalValueReturned ?? 0
        const netCOGS = data?.netCOGS ?? 0
        const cogsOfReturnedItems = data?.cogsOfReturnedItems ?? 0
        const grossRevenueBeforeReturns =
          data?.grossRevenueBeforeReturns ?? netRevenue + totalValueReturned
        const grossCOGSBeforeReturns =
          data?.grossCOGSBeforeReturns ?? netCOGS + cogsOfReturnedItems
        const totalExpenses = data?.totalExpenses ?? 0
        const expensesBreakdown = data?.expensesBreakdown ?? []
        const grossProfit = data?.grossProfit ?? netRevenue - netCOGS
        const netProfit = data?.netProfit ?? grossProfit - totalExpenses

        setIncomeStatementData({
          grossRevenueBeforeReturns,
          totalValueReturned,
          netRevenue,
          grossCOGSBeforeReturns,
          cogsOfReturnedItems,
          netCOGS,
          grossProfit,
          totalExpenses,
          netProfit,
          expensesBreakdown,
        })
      }

      if (!data || Object.keys(data).length === 0) {
        toast.info('Laporan Tidak Ditemukan', {
          description:
            'Belum ada laporan tersimpan untuk periode ini. Gunakan Generate Laporan terlebih dahulu.',
        })
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        toast.info('Laporan Tidak Ditemukan', {
          description:
            'Belum ada laporan tersimpan untuk periode ini. Gunakan Generate Laporan terlebih dahulu.',
        })
      } else {
        toast.error('Gagal Memuat Laporan', {
          description: 'Terjadi kesalahan saat mengambil data.',
        })
      }
    }
    setLoadingView(false)
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-6'>
          <div className='flex flex-col sm:flex-row justify-between items-center gap-3'>
            <h1 className='text-xl md:text-2xl font-semibold font-headline'>
              Laporan Keuangan{' '}
              {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            {(salesSummaryData || incomeStatementData) && !loadingReport && (
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
                Pilih jenis laporan dan filter untuk membuat laporan.
              </CardDescription>
            </CardHeader>
            <CardContent className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end p-4 pt-0'>
              <div>
                <label
                  htmlFor='reportType'
                  className='block text-xs font-medium mb-1'
                >
                  Jenis Laporan
                </label>
                <Select
                  value={reportType}
                  onValueChange={(value) => setReportType(value as ReportType)}
                >
                  <SelectTrigger
                    id='reportType'
                    className='rounded-md h-9 text-xs'
                  >
                    <SelectValue placeholder='Pilih jenis' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='sales_summary' className='text-xs'>
                      Ringkasan Penjualan
                    </SelectItem>
                    <SelectItem value='income_statement' className='text-xs'>
                      Laporan Laba Rugi
                    </SelectItem>
                    <SelectItem
                      value='balance_sheet'
                      className='text-xs'
                      disabled
                    >
                      Neraca Saldo (Segera)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label
                  htmlFor='periodMode'
                  className='block text-xs font-medium mb-1'
                >
                  Periode
                </label>
                <Select
                  value={periodMode}
                  onValueChange={(v) => setPeriodMode(v as PeriodMode)}
                >
                  <SelectTrigger
                    id='periodMode'
                    className='rounded-md h-9 text-xs'
                  >
                    <SelectValue placeholder='Pilih periode' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='daily' className='text-xs'>
                      Harian
                    </SelectItem>
                    <SelectItem value='monthly' className='text-xs'>
                      Bulanan
                    </SelectItem>
                    <SelectItem value='ytd2025' className='text-xs'>
                      S/D 2025 (YTD)
                    </SelectItem>
                    <SelectItem value='custom' className='text-xs'>
                      Kustom
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='lg:col-span-1'>
                <label
                  htmlFor='branch'
                  className='block text-xs font-medium mb-1'
                >
                  Cabang
                </label>
                <Select
                  value={selectedBranch ? String(selectedBranch.id) : undefined}
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
                      onSelect={(d) => {
                        if (d) setStartDate(d)
                        setPeriodMode('custom')
                      }}
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
                      onSelect={(d) => {
                        if (d) setEndDate(d)
                        setPeriodMode('custom')
                      }}
                      initialFocus
                      className='text-xs'
                      disabled={(date) =>
                        startDate ? date < startDate : false
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className='flex gap-2'>
                <Button
                  size='sm'
                  className='w-full sm:w-auto self-end rounded-md text-xs h-9'
                  onClick={handleGenerateReport}
                  disabled={loadingGenerate || !selectedBranch}
                >
                  {loadingGenerate ? 'Menggenerate...' : 'Generate Laporan'}
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='w-full sm:w-auto self-end rounded-md text-xs h-9'
                  onClick={handleViewReport}
                  disabled={loadingView || !selectedBranch}
                >
                  {loadingView ? 'Memuat...' : 'Lihat Laporan'}
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
              <CardContent className='p-4 space-y-3'>
                <Skeleton className='h-8 w-full' />
                <Skeleton className='h-8 w-full' />
                <Skeleton className='h-8 w-2/3' />
              </CardContent>
            </Card>
          )}

          {salesSummaryData &&
            !loadingGenerate &&
            !loadingView &&
            reportType === 'sales_summary' && (
              <Card className='shadow-sm'>
                <CardHeader className='p-4'>
                  <CardTitle className='text-base font-semibold'>
                    Ringkasan Penjualan
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Untuk cabang: {selectedBranch?.name || 'N/A'} <br />
                    Periode:{' '}
                    {startDate
                      ? format(startDate, 'dd MMM yyyy')
                      : 'N/A'} -{' '}
                    {endDate ? format(endDate, 'dd MMM yyyy') : 'N/A'}
                  </CardDescription>
                </CardHeader>
                <CardContent className='p-4 grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='space-y-2 p-3 border rounded-md bg-muted/30'>
                    <h3 className='text-sm font-medium text-muted-foreground'>
                      Ringkasan Umum
                    </h3>
                    <div className='flex justify-between text-sm'>
                      <span>Pendapatan Kotor (Sebelum Retur):</span>
                      <span className='font-semibold'>
                        {formatCurrency(
                          salesSummaryData.grossRevenueBeforeReturns
                        )}
                      </span>
                    </div>
                    <div className='flex justify-between text-sm'>
                      <span>Total Nilai Retur:</span>
                      <span className='font-semibold text-destructive'>
                        ({formatCurrency(salesSummaryData.totalValueReturned)})
                      </span>
                    </div>
                    <Separator />
                    <div className='flex justify-between text-sm'>
                      <span>Total Pendapatan Bersih:</span>
                      <span className='font-semibold'>
                        {formatCurrency(salesSummaryData.netRevenue)}
                      </span>
                    </div>
                    <div className='flex justify-between text-sm'>
                      <span>Jumlah Transaksi Bersih:</span>
                      <span className='font-semibold'>
                        {salesSummaryData.totalNetTransactions}
                      </span>
                    </div>
                    <div className='flex justify-between text-sm'>
                      <span>Rata-rata per Transaksi (Bersih):</span>
                      <span className='font-semibold'>
                        {formatCurrency(
                          salesSummaryData.averageTransactionValue
                        )}
                      </span>
                    </div>
                  </div>
                  <div className='space-y-2 p-3 border rounded-md bg-muted/30'>
                    <h3 className='text-sm font-medium text-muted-foreground'>
                      Pendapatan Bersih per Metode Pembayaran
                    </h3>
                    <div className='flex justify-between text-sm'>
                      <span>Tunai (Cash):</span>
                      <span className='font-semibold'>
                        {formatCurrency(
                          salesSummaryData.salesByPaymentMethod.cash
                        )}
                      </span>
                    </div>
                    <div className='flex justify-between text-sm'>
                      <span>Kartu (Card):</span>
                      <span className='font-semibold'>
                        {formatCurrency(
                          salesSummaryData.salesByPaymentMethod.card
                        )}
                      </span>
                    </div>
                    <div className='flex justify-between text-sm'>
                      <span>Transfer:</span>
                      <span className='font-semibold'>
                        {formatCurrency(
                          salesSummaryData.salesByPaymentMethod.transfer
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          {incomeStatementData &&
            !loadingGenerate &&
            !loadingView &&
            reportType === 'income_statement' && (
              <Card className='shadow-sm'>
                <CardHeader className='p-4'>
                  <CardTitle className='text-base font-semibold'>
                    Laporan Laba Rugi
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Untuk cabang: {selectedBranch?.name || 'N/A'} <br />
                    Periode:{' '}
                    {startDate
                      ? format(startDate, 'dd MMM yyyy')
                      : 'N/A'} -{' '}
                    {endDate ? format(endDate, 'dd MMM yyyy') : 'N/A'}
                  </CardDescription>
                </CardHeader>
                <CardContent className='p-4 space-y-3'>
                  <div className='border rounded-md p-3 bg-muted/30 space-y-1.5 text-sm'>
                    <h3 className='text-sm font-medium text-muted-foreground mb-1'>
                      Pendapatan
                    </h3>
                    <div className='flex justify-between'>
                      <span>Pendapatan Kotor (Bruto):</span>
                      <span className='font-medium'>
                        {formatCurrency(
                          incomeStatementData.grossRevenueBeforeReturns
                        )}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span>(-) Retur Penjualan:</span>
                      <span className='font-medium text-destructive'>
                        (
                        {formatCurrency(incomeStatementData.totalValueReturned)}
                        )
                      </span>
                    </div>
                    <Separator />
                    <div className='flex justify-between font-semibold'>
                      <span>(=) Pendapatan Penjualan Bersih (Neto):</span>
                      <span>
                        {formatCurrency(incomeStatementData.netRevenue)}
                      </span>
                    </div>
                  </div>

                  <div className='border rounded-md p-3 bg-muted/30 space-y-1.5 text-sm'>
                    <h3 className='text-sm font-medium text-muted-foreground mb-1'>
                      Harga Pokok Penjualan (HPP)
                    </h3>
                    <div className='flex justify-between'>
                      <span>HPP Kotor (untuk penjualan bruto):</span>
                      <span className='font-medium text-destructive'>
                        (
                        {formatCurrency(
                          incomeStatementData.grossCOGSBeforeReturns
                        )}
                        )
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span>(-) Pengurangan HPP dari Retur:</span>
                      <span className='font-medium text-green-600'>
                        {formatCurrency(
                          incomeStatementData.cogsOfReturnedItems
                        )}
                      </span>
                    </div>
                    <Separator />
                    <div className='flex justify-between font-semibold'>
                      <span>(=) HPP Bersih (Neto):</span>
                      <span className='text-destructive'>
                        ({formatCurrency(incomeStatementData.netCOGS)})
                      </span>
                    </div>
                  </div>

                  <div className='border rounded-md p-3 bg-background mt-1'>
                    <div className='flex justify-between text-sm font-bold'>
                      <span>Laba Kotor:</span>
                      <span>
                        {formatCurrency(incomeStatementData.grossProfit)}
                      </span>
                    </div>
                  </div>

                  <div className='border rounded-md p-3 bg-muted/30 space-y-1.5 text-sm'>
                    <h3 className='text-sm font-medium text-muted-foreground mb-1'>
                      Beban Operasional:
                    </h3>
                    {incomeStatementData.expensesBreakdown &&
                    incomeStatementData.expensesBreakdown.length > 0 ? (
                      incomeStatementData.expensesBreakdown.map((exp) => (
                        <div
                          key={exp.category}
                          className='flex items-center justify-between'
                        >
                          <span className='truncate pr-2'>{exp.category}:</span>
                          <span className='font-medium text-destructive whitespace-nowrap'>
                            - {formatCurrency(exp.amount)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className='text-xs text-muted-foreground'>
                        Tidak ada beban operasional tercatat untuk periode ini.
                      </p>
                    )}
                    <Separator />
                    <div className='flex justify-between font-semibold'>
                      <span>Total Beban Operasional:</span>
                      <span className='text-destructive'>
                        ({formatCurrency(incomeStatementData.totalExpenses)})
                      </span>
                    </div>
                  </div>

                  <div className='border rounded-md p-3 bg-background mt-2'>
                    <div className='flex justify-between text-base font-bold'>
                      <span>Laba / (Rugi) Bersih:</span>
                      <span
                        className={
                          incomeStatementData.netProfit >= 0
                            ? 'text-green-600'
                            : 'text-destructive'
                        }
                      >
                        {formatCurrency(incomeStatementData.netProfit)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          {!(salesSummaryData || incomeStatementData) &&
            !loadingGenerate &&
            !loadingView && (
              <Card className='shadow-sm'>
                <CardContent className='p-10 text-center'>
                  <p className='text-sm text-muted-foreground'>
                    Pilih filter di atas dan klik "Generate Laporan" untuk
                    melihat hasilnya.
                  </p>
                </CardContent>
              </Card>
            )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
