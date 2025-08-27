'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import MainLayout from '@/components/layout/main-layout'
import { useBranches } from '@/contexts/branch-context'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DollarSign,
  TrendingUp,
  Activity,
  Info,
  Archive as ArchiveIcon,
} from 'lucide-react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/auth-context'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
// Replaced Appwrite services with Laravel endpoints
import { getDashboardSummary } from '@/lib/laravel/dashboard'
import {
  startOfMonth,
  endOfMonth,
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getActiveShift } from '@/lib/laravel/shiftService' // TODO: migrate to Laravel shift endpoint later
import { Shift } from '@/lib/types'
import { formatCurrency } from '@/lib/helper'

interface DashboardStats {
  grossRevenueBeforeReturns: number
  netRevenue: number
  totalExpenses: number
  netTransactionCount: number
  revenueChangePercentage: string
  expenseChangePercentage: string
  transactionChangePercentage: string
}

interface InventorySummary {
  totalUniqueProducts: number
  lowStockItemsCount: number
}

interface ChartDataPoint {
  name: string
  total: number
}

const LOW_STOCK_THRESHOLD = 5

const chartConfig = {
  penjualan: {
    label: 'Penjualan',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig

type RangePreset = 'today' | 'thisWeek' | 'thisMonth'

export default function DashboardPage() {
  const { selectedBranch, activeShiftSummary } = useBranches()
  const { currentUser, userData, isLoading, isLoadingUserData } = useAuth()

  const [selectedRangePreset, setSelectedRangePreset] =
    useState<RangePreset>('thisMonth')
  const [currentDisplayRange, setCurrentDisplayRange] = useState<{
    start: Date
    end: Date
  } | null>(null)

  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null
  )
  const [inventorySummary, setInventorySummary] =
    useState<InventorySummary | null>(null)

  const [loadingShift, setLoadingShift] = useState(true)
  const [chartSalesData, setChartSalesData] = useState<ChartDataPoint[]>([])
  const [chartProfitData, setChartProfitData] = useState<ChartDataPoint[]>([])
  const [topProducts, setTopProducts] = useState<
    {
      product_id: number
      product_name: string
      qty: number
      total_sales: number
    }[]
  >([])

  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingInventorySummary, setLoadingInventorySummary] = useState(true)
  const [loadingActiveShift, setLoadingActiveShift] = useState(true)
  const [loadingChartSales, setLoadingChartSales] = useState(true)

  // Polling interval (ms) for refreshing active shift info
  const SHIFT_POLL_INTERVAL = 60_000

  const isCashierWithoutBranch =
    !isLoading &&
    !isLoadingUserData &&
    userData?.role === 'cashier' &&
    !userData.branch_id

  const dashboardTitle = useMemo(() => {
    if (isCashierWithoutBranch) {
      return 'Dashboard - Belum Ada Cabang'
    }
    if (userData?.role === 'admin' && !selectedBranch) {
      return 'Dashboard (Pilih Cabang)'
    }
    return `Dashboard ${selectedBranch ? `- ${selectedBranch.name}` : ''}`
  }, [isCashierWithoutBranch, userData, selectedBranch])

  const formatYAxisTick = (value: number) => {
    const currency = selectedBranch?.currency || 'Rp'
    if (Math.abs(value) >= 1000000000) {
      return `${currency}${(value / 1000000000)
        .toFixed(1)
        .replace(/\.0$/, '')} M`
    }
    if (Math.abs(value) >= 1000000) {
      return `${currency}${(value / 1000000).toFixed(1).replace(/\.0$/, '')} jt`
    }
    if (Math.abs(value) >= 1000) {
      return `${currency}${(value / 1000).toFixed(0)} rb`
    }
    return `${currency}${value}`
  }

  useEffect(() => {
    const now = new Date()
    let start: Date
    let end: Date

    switch (selectedRangePreset) {
      case 'today':
        start = startOfDay(now)
        end = endOfDay(now)
        break
      case 'thisWeek':
        start = startOfWeek(now, { weekStartsOn: 1 })
        end = endOfWeek(now, { weekStartsOn: 1 })
        break
      case 'thisMonth':
      default:
        start = startOfMonth(now)
        end = endOfMonth(now)
        break
    }
    setCurrentDisplayRange({ start, end })
  }, [selectedRangePreset])

  const fetchDashboardData = useCallback(async () => {
    if (!selectedBranch || !currentDisplayRange || isCashierWithoutBranch) {
      setDashboardStats(null)
      setChartSalesData([])
      setChartProfitData([])
      setTopProducts([])
      setInventorySummary(null)
      setLoadingStats(false)
      setLoadingChartSales(false)
      setLoadingInventorySummary(false)
      return
    }
    setLoadingStats(true)
    setLoadingChartSales(true)
    setLoadingInventorySummary(true)
    setSelectedRangePreset(selectedBranch.default_report_period)

    try {
      const { start, end } = currentDisplayRange
      const summary = await getDashboardSummary({
        branch_id: selectedBranch.id,
        start_date: start.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
      })
      setDashboardStats({
        grossRevenueBeforeReturns: summary.gross_revenue_before_returns,
        netRevenue: summary.net_revenue,
        totalExpenses: summary.total_expenses,
        netTransactionCount: summary.net_transaction_count,
        revenueChangePercentage: 'N/A',
        expenseChangePercentage: 'N/A',
        transactionChangePercentage: 'N/A',
      })
      setChartSalesData(
        summary.daily_sales.map((d) => ({
          name: format(new Date(d.date), 'd MMM', { locale: localeID }),
          total: d.total,
        }))
      )
      setChartProfitData(
        summary.daily_profit.map((d) => ({
          name: format(new Date(d.date), 'd MMM', { locale: localeID }),
          total: d.profit,
        }))
      )
      setTopProducts(summary.top_products)
      setInventorySummary({
        totalUniqueProducts: summary.inventory.total_unique_products,
        lowStockItemsCount: summary.inventory.low_stock_items_count,
      })
    } catch (e) {
      console.error('Error loading dashboard summary', e)
    } finally {
      setLoadingStats(false)
      setLoadingChartSales(false)
      setLoadingInventorySummary(false)
    }
  }, [selectedBranch, currentDisplayRange, isCashierWithoutBranch])

  useEffect(() => {
    if (currentDisplayRange && (selectedBranch || isCashierWithoutBranch)) {
      fetchDashboardData()
    } else if (!selectedBranch && !isCashierWithoutBranch) {
      setDashboardStats(null)
      setInventorySummary(null)
      // setActiveShiftSummary(null)
      setChartSalesData([])
      setLoadingStats(false)
      setLoadingInventorySummary(false)
      setLoadingActiveShift(false)
      setLoadingChartSales(false)
    }
  }, [
    fetchDashboardData,
    selectedBranch,
    currentDisplayRange,
    isCashierWithoutBranch,
  ])

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-4'>
          <div className='flex flex-col sm:flex-row justify-between items-center gap-3 '>
            <h1 className='text-xl md:text-2xl font-semibold font-headline'>
              {dashboardTitle}
            </h1>
            {!isCashierWithoutBranch && (
              <div className='flex items-center gap-2'>
                <Select
                  value={selectedRangePreset}
                  onValueChange={(value) =>
                    setSelectedRangePreset(value as RangePreset)
                  }
                >
                  <SelectTrigger className='w-[180px] h-9 text-xs rounded-md '>
                    <SelectValue placeholder='Pilih Periode' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='today' className='text-xs'>
                      Hari Ini
                    </SelectItem>
                    <SelectItem value='thisWeek' className='text-xs'>
                      Minggu Ini
                    </SelectItem>
                    <SelectItem value='thisMonth' className='text-xs'>
                      Bulan Ini
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {currentDisplayRange && !isCashierWithoutBranch && (
            <p className='text-sm text-muted-foreground -mt-2 mb-4'>
              Periode:{' '}
              {format(currentDisplayRange.start, 'dd MMM yyyy', {
                locale: localeID,
              })}{' '}
              -{' '}
              {format(currentDisplayRange.end, 'dd MMM yyyy', {
                locale: localeID,
              })}
            </p>
          )}

          {isCashierWithoutBranch && (
            <Alert
              variant='default'
              className='bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700/50 dark:text-yellow-300'
            >
              <Info className='h-4 w-4 !text-yellow-600 dark:!text-yellow-400' />
              <AlertTitle className='font-semibold text-yellow-700 dark:text-yellow-200'>
                Perhatian untuk Kasir
              </AlertTitle>
              <AlertDescription className='text-yellow-700 dark:text-yellow-400'>
                Akun Anda belum terhubung dengan cabang manapun. Mohon hubungi
                Administrator untuk menetapkan cabang Anda agar dapat mengakses
                semua fitur.
              </AlertDescription>
            </Alert>
          )}

          {!isCashierWithoutBranch && (
            <>
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-xs font-medium'>
                      Pendapatan Kotor
                    </CardTitle>
                    <ArchiveIcon className='h-4 w-4 text-muted-foreground' />
                  </CardHeader>
                  <CardContent>
                    {loadingStats ? (
                      <Skeleton className='h-7 w-3/4' />
                    ) : (
                      <div className='text-lg font-bold'>
                        {formatCurrency(
                          dashboardStats?.grossRevenueBeforeReturns ?? 0
                        )}
                      </div>
                    )}
                    {loadingStats ? (
                      <Skeleton className='h-4 w-1/2 mt-1' />
                    ) : (
                      <p className='text-xs text-muted-foreground'>
                        Total penjualan sebelum retur
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-xs font-medium'>
                      Pendapatan Bersih
                    </CardTitle>
                    <DollarSign className='h-4 w-4 text-muted-foreground' />
                  </CardHeader>
                  <CardContent>
                    {loadingStats ? (
                      <Skeleton className='h-7 w-3/4' />
                    ) : (
                      <div className='text-lg font-bold'>
                        {formatCurrency(dashboardStats?.netRevenue ?? 0)}
                      </div>
                    )}
                    {loadingStats ? (
                      <Skeleton className='h-4 w-1/2 mt-1' />
                    ) : (
                      <p className='text-xs text-muted-foreground'>
                        {dashboardStats?.revenueChangePercentage} dari periode
                        lalu
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-xs font-medium'>
                      Total Pengeluaran
                    </CardTitle>
                    <Activity className='h-4 w-4 text-muted-foreground' />
                  </CardHeader>
                  <CardContent>
                    {loadingStats ? (
                      <Skeleton className='h-7 w-3/4' />
                    ) : (
                      <div className='text-lg font-bold'>
                        {formatCurrency(dashboardStats?.totalExpenses ?? 0)}
                      </div>
                    )}
                    {loadingStats ? (
                      <Skeleton className='h-4 w-1/2 mt-1' />
                    ) : (
                      <p className='text-xs text-muted-foreground'>
                        {dashboardStats?.expenseChangePercentage} dari periode
                        lalu
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-xs font-medium'>
                      Transaksi Selesai
                    </CardTitle>
                    <TrendingUp className='h-4 w-4 text-muted-foreground' />
                  </CardHeader>
                  <CardContent>
                    {loadingStats ? (
                      <Skeleton className='h-7 w-1/2' />
                    ) : (
                      <div className='text-lg font-bold'>
                        {dashboardStats?.netTransactionCount ?? 0}
                      </div>
                    )}
                    {loadingStats ? (
                      <Skeleton className='h-4 w-1/2 mt-1' />
                    ) : (
                      <p className='text-xs text-muted-foreground'>
                        {dashboardStats?.transactionChangePercentage} dari
                        periode lalu
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {activeShiftSummary && (
                <Card className='bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700/40'>
                  <CardHeader className='pb-2 pt-3 px-4'>
                    <CardTitle className='text-sm font-semibold text-blue-700 dark:text-blue-300'>
                      Informasi Kas Shift Saat Ini
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5 px-4 pb-3 text-xs'>
                    <div>
                      <p className='text-blue-600 dark:text-blue-400'>
                        Modal Awal:
                      </p>
                      <p className='font-medium text-blue-700 dark:text-blue-200'>
                        {formatCurrency(activeShiftSummary.starting_balance)}
                      </p>
                    </div>
                    <div>
                      <p className='text-blue-600 dark:text-blue-400'>
                        Kas Seharusnya:
                      </p>
                      <p className='font-medium text-blue-700 dark:text-blue-200'>
                        {formatCurrency(activeShiftSummary.actual_balance || 0)}
                      </p>
                    </div>
                    {/*<div>
                        <p className='text-blue-600 dark:text-blue-400'>
                          Total Tunai (Shift):
                        </p>
                        <p className='font-medium text-blue-700 dark:text-blue-200'>
                          {formatCurrency(
                            activeShiftSummary.totalCashSalesShift
                          )}
                        </p>
                      </div>
                      <div>
                        <p className='text-blue-600 dark:text-blue-400'>
                          Total Kartu (Shift):
                        </p>
                        <p className='font-medium text-blue-700 dark:text-blue-200'>
                          {formatCurrency(
                            activeShiftSummary.totalCardSalesShift
                          )}
                        </p>
                      </div> */}
                    {/* <div>
                        <p className='text-blue-600 dark:text-blue-400'>
                          Total Transfer (Shift):
                        </p>
                        <p className='font-medium text-blue-700 dark:text-blue-200'>
                          {formatCurrency(
                            activeShiftSummary.totalTransferSalesShift
                          )}
                        </p>
                      </div> */}
                  </CardContent>
                </Card>
              )}

              <div className='grid gap-4 lg:grid-cols-2'>
                <Card className='lg:col-span-2'>
                  <CardHeader>
                    <CardTitle className='text-base font-semibold'>
                      Tren Penjualan (Omset)
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      Total penjualan bersih harian untuk periode terpilih.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='h-[350px] sm:h-[400px] pl-0 pr-4 pb-6'>
                    {loadingChartSales ? (
                      <Skeleton className='h-full w-full' />
                    ) : chartSalesData.length > 0 ? (
                      <ChartContainer
                        config={chartConfig}
                        className='w-full h-full'
                      >
                        <BarChart
                          accessibilityLayer
                          data={chartSalesData}
                          margin={{ top: 5, right: 5, left: 15, bottom: 5 }}
                        >
                          <CartesianGrid
                            vertical={false}
                            strokeDasharray='3 3'
                          />
                          <XAxis
                            dataKey='name'
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            className='text-xs sm:text-sm'
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={formatYAxisTick}
                            className='text-xs sm:text-sm'
                            width={70}
                          />
                          <RechartsTooltip
                            cursor={{ fill: 'hsl(var(--muted))' }}
                            content={
                              <ChartTooltipContent
                                formatter={(value, name, props) => (
                                  <div className='flex flex-col'>
                                    <span className='text-xs text-muted-foreground'>
                                      {props.payload.name}
                                    </span>
                                    <span className='font-bold'>
                                      {formatCurrency(value as number)}
                                    </span>
                                  </div>
                                )}
                                indicator='dot'
                              />
                            }
                          />
                          <Bar
                            dataKey='total'
                            fill='var(--color-penjualan)'
                            radius={4}
                          />
                        </BarChart>
                      </ChartContainer>
                    ) : (
                      <div className='flex items-center justify-center h-full'>
                        <p className='text-sm text-muted-foreground'>
                          Tidak ada data penjualan untuk periode ini.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className='lg:col-span-2'>
                  <CardHeader>
                    <CardTitle className='text-base font-semibold'>
                      Tren Laba / Rugi Harian
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      Laba (positif) atau rugi (negatif) bersih per hari.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='h-[300px] sm:h-[340px] pl-0 pr-4 pb-6'>
                    {loadingChartSales ? (
                      <Skeleton className='h-full w-full' />
                    ) : chartProfitData.length > 0 ? (
                      <ChartContainer
                        config={chartConfig}
                        className='w-full h-full'
                      >
                        <BarChart
                          data={chartProfitData}
                          margin={{ top: 5, right: 5, left: 15, bottom: 5 }}
                        >
                          <CartesianGrid
                            vertical={false}
                            strokeDasharray='3 3'
                          />
                          <XAxis
                            dataKey='name'
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            className='text-xs sm:text-sm'
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={formatYAxisTick}
                            className='text-xs sm:text-sm'
                            width={70}
                          />
                          <RechartsTooltip
                            cursor={{ fill: 'hsl(var(--muted))' }}
                            content={
                              <ChartTooltipContent
                                formatter={(value, name, props) => (
                                  <div className='flex flex-col'>
                                    <span className='text-xs text-muted-foreground'>
                                      {props.payload.name}
                                    </span>
                                    <span className='font-bold'>
                                      {formatCurrency(value as number)}
                                    </span>
                                  </div>
                                )}
                                indicator='dot'
                              />
                            }
                          />
                          <Bar
                            dataKey='total'
                            fill='var(--color-penjualan)'
                            radius={4}
                          />
                        </BarChart>
                      </ChartContainer>
                    ) : (
                      <div className='flex items-center justify-center h-full'>
                        <p className='text-sm text-muted-foreground'>
                          Tidak ada data laba/rugi untuk periode ini.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className='lg:col-span-2'>
                  <CardHeader>
                    <CardTitle className='text-base font-semibold'>
                      Status Inventaris & Produk Terlaris
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      Snapshot inventaris saat ini & 10 produk paling laris di
                      periode.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='grid grid-cols-2 gap-3'>
                      <div className='p-2.5 bg-muted/20 rounded-md'>
                        <h3 className='font-medium text-xs'>
                          Stok Hampir Habis (&lt; {LOW_STOCK_THRESHOLD})
                        </h3>
                        {loadingInventorySummary ? (
                          <Skeleton className='h-5 w-16' />
                        ) : (
                          <p className='text-base font-bold text-destructive'>
                            {inventorySummary?.lowStockItemsCount ?? 0} item
                          </p>
                        )}
                      </div>
                      <div className='p-2.5 bg-muted/20 rounded-md'>
                        <h3 className='font-medium text-xs'>
                          Total Produk Unik
                        </h3>
                        {loadingInventorySummary ? (
                          <Skeleton className='h-5 w-20' />
                        ) : (
                          <p className='text-base font-bold text-primary'>
                            {inventorySummary?.totalUniqueProducts ?? 0}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className='text-xs font-semibold mb-2'>Top Produk</h4>
                      {loadingStats ? (
                        <Skeleton className='h-24 w-full' />
                      ) : topProducts.length > 0 ? (
                        <ul className='divide-y border rounded-md overflow-hidden'>
                          {topProducts.map((p, idx) => (
                            <li
                              key={p.product_id}
                              className='flex items-center justify-between text-xs px-2 py-1.5'
                            >
                              <span className='truncate'>
                                {idx + 1}. {p.product_name}
                              </span>
                              <span className='font-medium'>{p.qty}x</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className='text-xs text-muted-foreground'>
                          Tidak ada data penjualan produk.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
