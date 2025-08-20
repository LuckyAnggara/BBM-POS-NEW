'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

// Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Icons
import {
  ArrowLeft,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  History,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingCart,
  DollarSign,
  User,
  Edit3,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
  CreditCard,
  Package,
} from 'lucide-react'

// Charts
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

// Types and Utils
import { Customer, Sale, ITEMS_PER_PAGE_OPTIONS } from '@/lib/types'
import {
  getCustomerById,
  getCustomerAnalytics,
  getCustomerSales,
  type CustomerAnalytics,
  type CustomerSalesResponse,
} from '@/lib/laravel/customers'
import { formatCurrency, formatDateIntl } from '@/lib/helper'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

// Pagination interface
interface PaginationInfo {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const customerId = params.id as string

  // State
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Sales pagination and filters
  const [salesPagination, setSalesPagination] = useState<PaginationInfo>({
    total: 0,
    per_page: 20,
    current_page: 1,
    last_page: 1,
  })
  const [salesPage, setSalesPage] = useState(1)
  const [salesLimit, setSalesLimit] = useState(10)
  const [salesStartDate, setSalesStartDate] = useState('')
  const [salesEndDate, setSalesEndDate] = useState('')

  // Analytics filters
  const [analyticsMonths, setAnalyticsMonths] = useState(12)

  // Fetch functions
  const fetchCustomerDetails = async () => {
    try {
      const response = await getCustomerById(customerId)
      setCustomer(response)
    } catch (error: unknown) {
      console.error('Error fetching customer details:', error)
      toast.error('Gagal memuat detail pelanggan')
    }
  }

  const fetchAnalytics = async (months = 12) => {
    try {
      const response = await getCustomerAnalytics(Number(customerId), months)
      setAnalytics(response)
    } catch (error: unknown) {
      console.error('Error fetching analytics:', error)
      toast.error('Gagal memuat analytics pelanggan')
    }
  }

  const fetchSales = async (
    page = 1,
    limit = 20,
    startDate = '',
    endDate = ''
  ) => {
    try {
      const response = await getCustomerSales(
        Number(customerId),
        page,
        limit,
        startDate || undefined,
        endDate || undefined
      )

      setSales(response.data)
      setSalesPagination({
        total: response.total,
        per_page: response.per_page,
        current_page: response.current_page,
        last_page: response.last_page,
      })
    } catch (error: unknown) {
      console.error('Error fetching sales:', error)
      toast.error('Gagal memuat riwayat penjualan')
    }
  }

  // Initial data fetch
  useEffect(() => {
    if (customerId) {
      Promise.all([
        fetchCustomerDetails(),
        fetchAnalytics(analyticsMonths),
        fetchSales(salesPage, salesLimit, salesStartDate, salesEndDate),
      ]).finally(() => setLoading(false))
    }
  }, [customerId])

  // Refetch on filter changes
  useEffect(() => {
    if (customerId) {
      fetchSales(1, salesLimit, salesStartDate, salesEndDate)
      setSalesPage(1)
    }
  }, [salesLimit, salesStartDate, salesEndDate])

  useEffect(() => {
    if (customerId) {
      fetchAnalytics(analyticsMonths)
    }
  }, [analyticsMonths])

  // Event handlers
  const handleSalesPageChange = (newPage: number) => {
    setSalesPage(newPage)
    fetchSales(newPage, salesLimit, salesStartDate, salesEndDate)
  }

  // Chart data processing
  const chartData = useMemo(() => {
    if (!analytics?.monthly_spending) return []
    return analytics.monthly_spending.map((item) => ({
      month: item.month,
      spending: item.total_spent,
      orders: item.total_orders,
    }))
  }, [analytics])

  const topProductsChart = useMemo(() => {
    if (!analytics?.top_products) return []
    return analytics.top_products.slice(0, 5).map((item, index) => ({
      name: item.product_name,
      value: item.quantity_purchased,
      fill: COLORS[index % COLORS.length],
    }))
  }, [analytics])

  // Pagination component
  const PaginationControls = ({
    currentPage,
    lastPage,
    total,
    perPage,
    onPageChange,
  }: {
    currentPage: number
    lastPage: number
    total: number
    perPage: number
    onPageChange: (page: number) => void
  }) => (
    <div className='flex items-center justify-between'>
      <div className='text-sm text-muted-foreground'>
        Menampilkan {(currentPage - 1) * perPage + 1} -{' '}
        {Math.min(currentPage * perPage, total)} dari {total} transaksi
      </div>
      <div className='flex items-center gap-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className='h-4 w-4' />
        </Button>
        <span className='text-sm'>
          {currentPage} / {lastPage}
        </span>
        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= lastPage}
        >
          <ChevronRight className='h-4 w-4' />
        </Button>
      </div>
    </div>
  )

  // Loading state
  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className='space-y-6'>
            <div className='flex items-center gap-3'>
              <Skeleton className='h-8 w-8' />
              <Skeleton className='h-8 w-1/3' />
            </div>
            <div className='grid gap-6'>
              <Card>
                <CardHeader>
                  <Skeleton className='h-6 w-1/4' />
                  <Skeleton className='h-4 w-1/2' />
                </CardHeader>
                <CardContent>
                  <Skeleton className='h-40 w-full' />
                </CardContent>
              </Card>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  // Not found state
  if (!customer) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className='p-4 text-center'>
            <Users className='mx-auto h-12 w-12 text-gray-400 mb-4' />
            <h2 className='text-lg font-semibold mb-2'>
              Pelanggan Tidak Ditemukan
            </h2>
            <p className='text-sm text-muted-foreground mb-4'>
              Pelanggan yang Anda cari tidak ditemukan atau telah dihapus.
            </p>
            <Button asChild variant='outline'>
              <Link href='/customers'>Kembali ke Daftar Pelanggan</Link>
            </Button>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-6'>
          {/* Header */}
          <div className='flex items-center gap-3'>
            <Button variant='outline' size='sm' asChild>
              <Link href='/customers'>
                <ArrowLeft className='h-4 w-4' />
              </Link>
            </Button>
            <Users className='h-7 w-7 text-primary' />
            <div className='flex-1'>
              <h1 className='text-xl md:text-2xl font-semibold font-headline'>
                {customer.name}
              </h1>
              <p className='text-sm text-muted-foreground'>
                ID: {customer.id} • Bergabung{' '}
                {formatDateIntl(customer.created_at)}
              </p>
            </div>
            <Button variant='outline' size='sm' asChild>
              <Link href={`/customers/${customerId}/edit`}>
                <Edit3 className='h-4 w-4 mr-2' />
                Edit
              </Link>
            </Button>
          </div>

          {/* Customer Overview Card */}
          <Card>
            <CardContent className='p-6'>
              <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
                {/* Customer Avatar */}
                <div className='lg:col-span-1'>
                  <div className='aspect-square rounded-lg border bg-muted/50 flex items-center justify-center'>
                    <div className='text-center'>
                      <User className='h-16 w-16 text-muted-foreground mx-auto mb-2' />
                      <p className='text-sm text-muted-foreground'>
                        {customer.name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className='lg:col-span-2 space-y-4'>
                  <div>
                    <h3 className='font-semibold mb-3'>Informasi Kontak</h3>
                    <div className='space-y-3'>
                      {customer.email && (
                        <div className='flex items-center gap-2'>
                          <Mail className='h-4 w-4 text-muted-foreground' />
                          <span className='text-sm'>{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className='flex items-center gap-2'>
                          <Phone className='h-4 w-4 text-muted-foreground' />
                          <span className='text-sm'>{customer.phone}</span>
                        </div>
                      )}
                      {customer.address && (
                        <div className='flex items-start gap-2'>
                          <MapPin className='h-4 w-4 text-muted-foreground mt-0.5' />
                          <span className='text-sm'>{customer.address}</span>
                        </div>
                      )}
                      {customer.notes && (
                        <div className='flex items-start gap-2'>
                          <FileText className='h-4 w-4 text-muted-foreground mt-0.5' />
                          <span className='text-sm italic'>
                            {customer.notes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className='lg:col-span-1 space-y-3'>
                  <h3 className='font-semibold'>Statistik Cepat</h3>
                  <div className='space-y-3'>
                    <div className='text-center p-3 bg-muted/50 rounded-lg'>
                      <p className='text-2xl font-bold text-primary'>
                        {analytics?.total_purchases || 0}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        Total Pembelian
                      </p>
                    </div>
                    <div className='text-center p-3 bg-muted/50 rounded-lg'>
                      <p className='text-2xl font-bold text-green-600'>
                        {formatCurrency(analytics?.total_spent || 0)}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        Total Belanja
                      </p>
                    </div>
                    <div className='text-center p-3 bg-muted/50 rounded-lg'>
                      <p className='text-2xl font-bold text-orange-600'>
                        {formatCurrency(analytics?.average_order_value || 0)}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        Rata-rata Order
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs Content */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='space-y-6'
          >
            <TabsList className='grid w-full grid-cols-3'>
              <TabsTrigger value='overview' className='text-xs'>
                Overview
              </TabsTrigger>
              <TabsTrigger value='analytics' className='text-xs'>
                Analitik
              </TabsTrigger>
              <TabsTrigger value='history' className='text-xs'>
                Riwayat Transaksi
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value='overview' className='space-y-6'>
              <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                <Card>
                  <CardContent className='p-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Total Pembelian
                        </p>
                        <p className='text-lg font-semibold'>
                          {analytics?.total_purchases || 0}
                        </p>
                      </div>
                      <ShoppingCart className='h-8 w-8 text-blue-500' />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className='p-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Total Belanja
                        </p>
                        <p className='text-lg font-semibold'>
                          {formatCurrency(analytics?.total_spent || 0)}
                        </p>
                      </div>
                      <DollarSign className='h-8 w-8 text-green-500' />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className='p-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Rata-rata Order
                        </p>
                        <p className='text-lg font-semibold'>
                          {formatCurrency(analytics?.average_order_value || 0)}
                        </p>
                      </div>
                      <BarChart3 className='h-8 w-8 text-purple-500' />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className='p-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Frekuensi Belanja
                        </p>
                        <p className='text-lg font-semibold'>
                          {analytics?.purchase_frequency?.toFixed(1) || 0}/bulan
                        </p>
                      </div>
                      <Activity className='h-8 w-8 text-orange-500' />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Customer Behavior */}
              <div className='grid gap-6 md:grid-cols-2'>
                <Card>
                  <CardHeader>
                    <CardTitle className='text-base font-semibold'>
                      Informasi Tambahan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='flex justify-between items-center'>
                      <span className='text-sm'>Pembelian Pertama</span>
                      <span className='text-sm font-medium'>
                        {analytics?.first_purchase_date
                          ? formatDateIntl(analytics.first_purchase_date)
                          : 'Belum ada'}
                      </span>
                    </div>
                    <div className='flex justify-between items-center'>
                      <span className='text-sm'>Pembelian Terakhir</span>
                      <span className='text-sm font-medium'>
                        {analytics?.last_purchase_date
                          ? formatDateIntl(analytics.last_purchase_date)
                          : 'Belum ada'}
                      </span>
                    </div>
                    <div className='flex justify-between items-center'>
                      <span className='text-sm'>Metode Pembayaran Favorit</span>
                      <Badge variant='outline'>
                        {analytics?.favorite_payment_method || 'Belum ada'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className='text-base font-semibold'>
                      Produk Favorit
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      Top 3 produk yang paling sering dibeli
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics?.top_products &&
                    analytics.top_products.length > 0 ? (
                      <div className='space-y-3'>
                        {analytics.top_products
                          .slice(0, 3)
                          .map((product, index) => (
                            <div
                              key={index}
                              className='flex items-center justify-between'
                            >
                              <div className='flex-1'>
                                <p className='text-sm font-medium'>
                                  {product.product_name}
                                </p>
                                <p className='text-xs text-muted-foreground'>
                                  {product.quantity_purchased} unit
                                </p>
                              </div>
                              <div className='text-right'>
                                <p className='text-sm font-medium'>
                                  {formatCurrency(product.total_spent)}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className='text-center py-4'>
                        <Package className='mx-auto h-8 w-8 text-gray-400 mb-2' />
                        <p className='text-sm text-muted-foreground'>
                          Belum ada produk favorit
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value='analytics' className='space-y-6'>
              {/* Analytics Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className='text-base font-semibold flex items-center gap-2'>
                    <BarChart3 className='h-5 w-5 text-primary' />
                    Analitik Pelanggan
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Analisis perilaku dan pola pembelian pelanggan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='flex items-center gap-4'>
                    <div className='flex items-center gap-2'>
                      <Label htmlFor='analyticsMonths' className='text-sm'>
                        Periode
                      </Label>
                      <Select
                        value={analyticsMonths.toString()}
                        onValueChange={(value) =>
                          setAnalyticsMonths(Number(value))
                        }
                      >
                        <SelectTrigger className='w-32'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='3'>3 Bulan</SelectItem>
                          <SelectItem value='6'>6 Bulan</SelectItem>
                          <SelectItem value='12'>12 Bulan</SelectItem>
                          <SelectItem value='24'>24 Bulan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Charts Grid */}
              <div className='grid gap-6'>
                {/* Spending Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-base font-semibold'>
                      Trend Pengeluaran Bulanan
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      Grafik pengeluaran pelanggan dalam {analyticsMonths} bulan
                      terakhir
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {chartData.length > 0 ? (
                      <div className='h-80'>
                        <ResponsiveContainer width='100%' height='100%'>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray='3 3' />
                            <XAxis dataKey='month' className='text-xs' />
                            <YAxis className='text-xs' />
                            <Tooltip
                              labelFormatter={(value) => `Bulan: ${value}`}
                              formatter={(value, name) => [
                                name === 'spending'
                                  ? formatCurrency(Number(value))
                                  : `${value} transaksi`,
                                name === 'spending'
                                  ? 'Pengeluaran'
                                  : 'Jumlah Order',
                              ]}
                            />
                            <Line
                              type='monotone'
                              dataKey='spending'
                              stroke='#3b82f6'
                              strokeWidth={2}
                            />
                            <Line
                              type='monotone'
                              dataKey='orders'
                              stroke='#10b981'
                              strokeWidth={2}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className='text-center py-8'>
                        <BarChart3 className='mx-auto h-12 w-12 text-gray-400 mb-4' />
                        <p className='text-sm text-muted-foreground'>
                          Belum ada data analitik
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Product Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-base font-semibold'>
                      Distribusi Produk Favorit
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      5 produk yang paling sering dibeli
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topProductsChart.length > 0 ? (
                      <div className='h-80'>
                        <ResponsiveContainer width='100%' height='100%'>
                          <PieChart>
                            <Pie
                              data={topProductsChart}
                              cx='50%'
                              cy='50%'
                              labelLine={false}
                              label={({ name, value }) => `${name}: ${value}`}
                              outerRadius={80}
                              fill='#8884d8'
                              dataKey='value'
                            >
                              {topProductsChart.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className='text-center py-8'>
                        <Package className='mx-auto h-12 w-12 text-gray-400 mb-4' />
                        <p className='text-sm text-muted-foreground'>
                          Belum ada data produk
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value='history' className='space-y-6'>
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className='text-base font-semibold flex items-center gap-2'>
                    <Filter className='h-5 w-5 text-primary' />
                    Filter Riwayat Transaksi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                    <div>
                      <Label htmlFor='salesLimit' className='text-sm'>
                        Tampilkan
                      </Label>
                      <Select
                        value={salesLimit.toString()}
                        onValueChange={(value) => setSalesLimit(Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option.toString()}>
                              {option} item
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor='salesStartDate' className='text-sm'>
                        Tanggal Mulai
                      </Label>
                      <Input
                        id='salesStartDate'
                        type='date'
                        value={salesStartDate}
                        onChange={(e) => setSalesStartDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor='salesEndDate' className='text-sm'>
                        Tanggal Akhir
                      </Label>
                      <Input
                        id='salesEndDate'
                        type='date'
                        value={salesEndDate}
                        onChange={(e) => setSalesEndDate(e.target.value)}
                      />
                    </div>

                    <div className='flex items-end'>
                      <Button
                        variant='outline'
                        onClick={() => {
                          setSalesStartDate('')
                          setSalesEndDate('')
                        }}
                        className='w-full'
                      >
                        Reset Filter
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sales History */}
              <Card>
                <CardHeader>
                  <CardTitle className='text-base font-semibold'>
                    Riwayat Transaksi
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Semua transaksi pembelian pelanggan
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {sales.length === 0 ? (
                    <div className='text-center py-8'>
                      <History className='mx-auto h-12 w-12 text-gray-400 mb-4' />
                      <p className='text-sm text-muted-foreground'>
                        Belum ada riwayat transaksi
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className='space-y-3'>
                        {sales.map((sale) => (
                          <div
                            key={sale.id}
                            className='border rounded-lg p-4 hover:bg-muted/50 transition-colors'
                          >
                            <div className='flex items-center justify-between mb-3'>
                              <div className='flex items-center gap-3'>
                                <Badge
                                  variant={
                                    sale.status === 'completed'
                                      ? 'default'
                                      : sale.status === 'returned'
                                      ? 'destructive'
                                      : 'secondary'
                                  }
                                >
                                  {sale.status === 'completed'
                                    ? 'Selesai'
                                    : sale.status === 'returned'
                                    ? 'Dikembalikan'
                                    : sale.status}
                                </Badge>
                                <span className='text-sm font-medium'>
                                  #{sale.transaction_number}
                                </span>
                              </div>
                              <div className='text-right'>
                                <p className='font-semibold'>
                                  {formatCurrency(sale.total_amount)}
                                </p>
                                <p className='text-xs text-muted-foreground'>
                                  {formatDateIntl(sale.created_at)}
                                </p>
                              </div>
                            </div>

                            <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                              <div>
                                <p className='text-xs text-muted-foreground'>
                                  Metode Bayar
                                </p>
                                <div className='flex items-center gap-1'>
                                  <CreditCard className='h-3 w-3' />
                                  <span className='capitalize'>
                                    {sale.payment_method}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <p className='text-xs text-muted-foreground'>
                                  Status Bayar
                                </p>
                                <Badge
                                  variant={
                                    sale.payment_status === 'paid'
                                      ? 'default'
                                      : sale.payment_status === 'partially_paid'
                                      ? 'secondary'
                                      : 'destructive'
                                  }
                                  className='text-xs'
                                >
                                  {sale.payment_status === 'paid'
                                    ? 'Lunas'
                                    : sale.payment_status === 'partially_paid'
                                    ? 'Sebagian'
                                    : 'Belum Bayar'}
                                </Badge>
                              </div>
                              <div>
                                <p className='text-xs text-muted-foreground'>
                                  Kasir
                                </p>
                                <p>{sale.user_name || 'Tidak diketahui'}</p>
                              </div>
                              <div>
                                <p className='text-xs text-muted-foreground'>
                                  Jumlah Item
                                </p>
                                <p>{sale.sale_details?.length || 0} item</p>
                              </div>
                            </div>

                            {sale.notes && (
                              <div className='mt-3 pt-3 border-t'>
                                <p className='text-xs text-muted-foreground'>
                                  Catatan:
                                </p>
                                <p className='text-sm italic'>{sale.notes}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <Separator />

                      <PaginationControls
                        currentPage={salesPagination.current_page}
                        lastPage={salesPagination.last_page}
                        total={salesPagination.total}
                        perPage={salesPagination.per_page}
                        onPageChange={handleSalesPageChange}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
