'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarIcon, TrendingUp, Users, Award } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useBranches } from '@/contexts/branch-context'
import {
  fetchSalesReport,
  type SalesReportResponse,
} from '@/lib/services/sales-report'

// Local interfaces removed in favor of shared service types

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function SalesReportPage() {
  const { selectedBranch, branches } = useBranches()
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [reportData, setReportData] = useState<SalesReportResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [periodMode, setPeriodMode] = useState<
    'this_month' | 'last_month' | 'custom'
  >('this_month')

  // Set default dates based on period mode
  useEffect(() => {
    const today = new Date()
    if (periodMode === 'this_month') {
      setStartDate(new Date(today.getFullYear(), today.getMonth(), 1))
      setEndDate(new Date(today.getFullYear(), today.getMonth() + 1, 0))
    } else if (periodMode === 'last_month') {
      setStartDate(new Date(today.getFullYear(), today.getMonth() - 1, 1))
      setEndDate(new Date(today.getFullYear(), today.getMonth(), 0))
    }
  }, [periodMode])

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
      return
    }
    if (!validateFilters()) return

    setLoading(true)
    setReportData(null)

    try {
      const apiStart = format(startDate!, 'yyyy-MM-dd')
      const apiEnd = format(endDate!, 'yyyy-MM-dd')

      const branchId: string | number =
        typeof selectedBranch.id === 'string' && selectedBranch.id === 'all'
          ? 'all'
          : selectedBranch.id

      const data = await fetchSalesReport({
        start_date: apiStart,
        end_date: apiEnd,
        branch_id: branchId,
      })

      setReportData(data)

      if (!data.sales_data || data.sales_data.length === 0) {
        toast.info('Tidak Ada Data Sales', {
          description:
            'Tidak ada data penjualan dari sales ditemukan untuk periode yang dipilih.',
        })
      } else {
        toast.success('Laporan Berhasil Dibuat', {
          description: `Ditemukan ${
            data.sales_data.length
          } sales dengan total penjualan ${formatCurrency(
            data.summary.total_sales_amount
          )}.`,
        })
      }
    } catch (error: any) {
      console.error('Error generating sales report:', error)
      toast.error('Gagal Membuat Laporan', {
        description: 'Terjadi kesalahan saat mengambil data sales.',
      })
    } finally {
      setLoading(false)
    }
  }

  const topPerformerCard = useMemo(() => {
    if (!reportData?.top_sales) return null

    const topSales = reportData.top_sales
    return (
      <Card className='shadow-sm border-l-4 border-l-green-500'>
        <CardHeader className='p-4'>
          <CardTitle className='text-base font-semibold flex items-center gap-2'>
            <Award className='h-4 w-4 text-yellow-500' />
            Top Performer
          </CardTitle>
          <CardDescription className='text-xs'>
            Sales terbaik periode ini
          </CardDescription>
        </CardHeader>
        <CardContent className='p-4 pt-0'>
          <div className='space-y-2'>
            <div className='flex justify-between items-center'>
              <span className='text-sm font-medium'>{topSales.sales_name}</span>
              <Badge variant='secondary'>{topSales.employee_code}</Badge>
            </div>
            <div className='text-xs text-muted-foreground'>
              {topSales.branch_name}
            </div>
            <div className='grid grid-cols-2 gap-3 mt-3'>
              <div className='text-center'>
                <div className='text-lg font-bold text-green-600'>
                  {formatCurrency(topSales.total_sales)}
                </div>
                <div className='text-xs text-muted-foreground'>
                  Total Penjualan
                </div>
              </div>
              <div className='text-center'>
                <div className='text-lg font-bold'>
                  {topSales.total_transactions}
                </div>
                <div className='text-xs text-muted-foreground'>Transaksi</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }, [reportData])

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-6'>
          <div className='flex flex-col sm:flex-row justify-between items-start gap-3'>
            <div>
              <h1 className='text-xl md:text-2xl font-semibold font-headline'>
                Laporan Sales Agent{' '}
                {selectedBranch ? `- ${selectedBranch.name}` : ''}
              </h1>
              <p className='text-sm text-muted-foreground mt-1'>
                Laporan performa penjualan per sales employee
              </p>
            </div>
          </div>

          <Card className='shadow-sm'>
            <CardHeader className='p-4'>
              <CardTitle className='text-base font-semibold'>
                Filter Laporan
              </CardTitle>
              <CardDescription className='text-xs'>
                Pilih periode dan filter untuk membuat laporan sales agent.
              </CardDescription>
            </CardHeader>
            <CardContent className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end p-4 pt-0'>
              <div>
                <label
                  htmlFor='periodMode'
                  className='block text-xs font-medium mb-1'
                >
                  Periode
                </label>
                <Select
                  value={periodMode}
                  onValueChange={(value: any) => setPeriodMode(value)}
                >
                  <SelectTrigger className='rounded-md text-xs h-9'>
                    <SelectValue placeholder='Pilih periode' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='this_month'>Bulan Ini</SelectItem>
                    <SelectItem value='last_month'>Bulan Lalu</SelectItem>
                    <SelectItem value='custom'>Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className='block text-xs font-medium mb-1'>
                  Tanggal Mulai
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      className={cn(
                        'justify-start text-left font-normal rounded-md text-xs h-9',
                        !startDate && 'text-muted-foreground'
                      )}
                      disabled={periodMode !== 'custom'}
                    >
                      <CalendarIcon className='mr-2 h-3 w-3' />
                      {startDate ? (
                        format(startDate, 'dd MMM yyyy', { locale: id })
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
                      disabled={(date) => (endDate ? date > endDate : false)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className='block text-xs font-medium mb-1'>
                  Tanggal Akhir
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      className={cn(
                        'justify-start text-left font-normal rounded-md text-xs h-9',
                        !endDate && 'text-muted-foreground'
                      )}
                      disabled={periodMode !== 'custom'}
                    >
                      <CalendarIcon className='mr-2 h-3 w-3' />
                      {endDate ? (
                        format(endDate, 'dd MMM yyyy', { locale: id })
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

              <div className='sm:col-span-2 lg:col-span-1'>
                <Button
                  size='sm'
                  className='w-full rounded-md text-xs h-9'
                  onClick={handleGenerateReport}
                  disabled={loading || !selectedBranch}
                  data-testid='generate-report-button'
                >
                  {loading ? 'Memuat...' : 'Buat Laporan'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading && (
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
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
            </div>
          )}

          {reportData && !loading && (
            <>
              {/* Summary Cards */}
              <div
                className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'
                data-testid='sales-summary-cards'
              >
                <Card
                  className='shadow-sm'
                  data-testid='summary-total-sales-employees'
                >
                  <CardContent className='p-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Total Sales
                        </p>
                        <p className='text-lg font-bold'>
                          {reportData.summary.total_sales_employees}
                        </p>
                      </div>
                      <Users className='h-5 w-5 text-blue-500' />
                    </div>
                  </CardContent>
                </Card>

                <Card className='shadow-sm' data-testid='summary-total-amount'>
                  <CardContent className='p-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Total Penjualan
                        </p>
                        <p className='text-lg font-bold text-green-600'>
                          {formatCurrency(
                            reportData.summary.total_sales_amount
                          )}
                        </p>
                      </div>
                      <TrendingUp className='h-5 w-5 text-green-500' />
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className='shadow-sm'
                  data-testid='summary-total-transactions'
                >
                  <CardContent className='p-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Total Transaksi
                        </p>
                        <p className='text-lg font-bold'>
                          {reportData.summary.total_transactions}
                        </p>
                      </div>
                      <TrendingUp className='h-5 w-5 text-orange-500' />
                    </div>
                  </CardContent>
                </Card>

                <Card className='shadow-sm' data-testid='summary-avg-per-sales'>
                  <CardContent className='p-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Rata-rata per Sales
                        </p>
                        <p className='text-lg font-bold'>
                          {formatCurrency(
                            reportData.summary.avg_sales_per_employee
                          )}
                        </p>
                      </div>
                      <Award className='h-5 w-5 text-purple-500' />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Performer */}
              {reportData.top_sales && (
                <div data-testid='top-performer-card'>{topPerformerCard}</div>
              )}

              {/* Sales Data Table */}
              <Card className='shadow-sm'>
                <CardHeader className='p-4'>
                  <CardTitle className='text-base font-semibold'>
                    Performance Sales - {reportData.period.start_date} s/d{' '}
                    {reportData.period.end_date}
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Urutan berdasarkan total penjualan tertinggi
                  </CardDescription>
                </CardHeader>
                <CardContent className='p-4 pt-0'>
                  {reportData.sales_data.length > 0 ? (
                    <div className='space-y-3'>
                      {reportData.sales_data.map((sales, index) => (
                        <div
                          key={sales.employee_id}
                          className='flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors'
                          data-testid={`sales-row-${index + 1}`}
                        >
                          <div className='flex items-center gap-3'>
                            <div className='w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium'>
                              {index + 1}
                            </div>
                            <div>
                              <div className='font-medium text-sm'>
                                {sales.sales_name}
                              </div>
                              <div className='text-xs text-muted-foreground'>
                                {sales.employee_code} • {sales.branch_name}
                              </div>
                            </div>
                          </div>
                          <div className='text-right'>
                            <div className='font-bold text-green-600'>
                              {formatCurrency(sales.total_sales)}
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              {sales.total_transactions} transaksi
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              Profit: {formatCurrency(sales.total_profit)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className='text-center py-8'
                      data-testid='empty-sales-data'
                    >
                      <p className='text-sm text-muted-foreground'>
                        Tidak ada data sales untuk periode yang dipilih.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {!reportData && !loading && (
            <Card className='shadow-sm' data-testid='report-placeholder'>
              <CardContent className='p-10 text-center'>
                <p className='text-sm text-muted-foreground'>
                  Pilih periode dan klik "Buat Laporan" untuk melihat
                  performance sales.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
