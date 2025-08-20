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
  Package,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  History,
  AlertTriangle,
  ShoppingCart,
  Truck,
  Edit3,
  Calendar,
  Clock,
  DollarSign,
  Target,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
} from 'lucide-react'

// Chart components
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

// Contexts and hooks
import { useAuth } from '@/contexts/auth-context'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

// Utils and API
import api from '@/lib/api'
import { formatCurrency } from '@/lib/helper'

// Types
import {
  Product,
  ProductTransaction,
  ProductTransactionResponse,
  ProductInsight,
  StockMutation,
  StockMutationResponse,
  ITEMS_PER_PAGE_OPTIONS,
} from '@/lib/types'

export default function ProductDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { userData } = useAuth()
  const productId = params.id as string

  // State
  const [product, setProduct] = useState<Product | null>(null)
  const [transactions, setTransactions] = useState<ProductTransaction[]>([])
  const [insights, setInsights] = useState<ProductInsight | null>(null)
  const [mutations, setMutations] = useState<StockMutation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Pagination states
  const [transactionPage, setTransactionPage] = useState(1)
  const [transactionLimit, setTransactionLimit] = useState(
    ITEMS_PER_PAGE_OPTIONS[1]
  )
  const [mutationPage, setMutationPage] = useState(1)
  const [mutationLimit, setMutationLimit] = useState(ITEMS_PER_PAGE_OPTIONS[1])

  // Filter states
  const [transactionType, setTransactionType] = useState('all')
  const [mutationType, setMutationType] = useState('all')
  const [transactionStartDate, setTransactionStartDate] = useState('')
  const [transactionEndDate, setTransactionEndDate] = useState('')
  const [mutationStartDate, setMutationStartDate] = useState('')
  const [mutationEndDate, setMutationEndDate] = useState('')
  const [insightMonths, setInsightMonths] = useState(12)
  const [insightStartDate, setInsightStartDate] = useState('')
  const [insightEndDate, setInsightEndDate] = useState('')

  // Pagination info
  const [transactionPagination, setTransactionPagination] = useState({
    total: 0,
    per_page: 20,
    current_page: 1,
    last_page: 1,
  })
  const [mutationPagination, setMutationPagination] = useState({
    total: 0,
    per_page: 20,
    current_page: 1,
    last_page: 1,
  })

  // Fetch functions
  const fetchProductDetails = async () => {
    try {
      const response = await api.get(`/api/products/${productId}/details`)
      setProduct(response.data)
    } catch (error: any) {
      console.error('Error fetching product details:', error)
      toast.error('Gagal memuat detail produk')
    }
  }

  const fetchTransactions = async (
    page = 1,
    limit = 20,
    type = 'all',
    startDate = '',
    endDate = ''
  ) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(type !== 'all' && { type }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      })

      const response = await api.get(
        `/api/products/${productId}/transactions?${params}`
      )
      const data: ProductTransactionResponse = response.data

      setTransactions(data.data)
      setTransactionPagination({
        total: data.total,
        per_page: data.per_page,
        current_page: data.current_page,
        last_page: data.last_page,
      })
    } catch (error: any) {
      console.error('Error fetching transactions:', error)
      toast.error('Gagal memuat riwayat transaksi')
    }
  }

  const fetchInsights = async (months = 12, startDate = '', endDate = '') => {
    try {
      const params = new URLSearchParams({
        months: months.toString(),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      })

      const response = await api.get(
        `/api/products/${productId}/insights?${params}`
      )
      setInsights(response.data)
    } catch (error: any) {
      console.error('Error fetching insights:', error)
      toast.error('Gagal memuat analitik produk')
    }
  }

  const fetchMutations = async (
    page = 1,
    limit = 20,
    type = 'all',
    startDate = '',
    endDate = ''
  ) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(type !== 'all' && { type }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      })

      const response = await api.get(
        `/api/products/${productId}/mutations?${params}`
      )
      const data: StockMutationResponse = response.data

      setMutations(data.data)
      setMutationPagination({
        total: data.total,
        per_page: data.per_page,
        current_page: data.current_page,
        last_page: data.last_page,
      })
    } catch (error: any) {
      console.error('Error fetching mutations:', error)
      toast.error('Gagal memuat mutasi stok')
    }
  }

  // Effect hooks
  useEffect(() => {
    if (productId) {
      setLoading(true)
      Promise.all([
        fetchProductDetails(),
        fetchTransactions(
          transactionPage,
          transactionLimit,
          transactionType,
          transactionStartDate,
          transactionEndDate
        ),
        fetchInsights(insightMonths, insightStartDate, insightEndDate),
        fetchMutations(
          mutationPage,
          mutationLimit,
          mutationType,
          mutationStartDate,
          mutationEndDate
        ),
      ]).finally(() => setLoading(false))
    }
  }, [productId])

  // Refetch on filter changes
  useEffect(() => {
    if (productId) {
      fetchTransactions(
        1,
        transactionLimit,
        transactionType,
        transactionStartDate,
        transactionEndDate
      )
      setTransactionPage(1)
    }
  }, [
    transactionLimit,
    transactionType,
    transactionStartDate,
    transactionEndDate,
  ])

  useEffect(() => {
    if (productId) {
      fetchMutations(
        1,
        mutationLimit,
        mutationType,
        mutationStartDate,
        mutationEndDate
      )
      setMutationPage(1)
    }
  }, [mutationLimit, mutationType, mutationStartDate, mutationEndDate])

  useEffect(() => {
    if (productId) {
      fetchInsights(insightMonths, insightStartDate, insightEndDate)
    }
  }, [insightMonths, insightStartDate, insightEndDate])

  // Computed values
  const profitMargin = useMemo(() => {
    if (!product || product.price <= 0) return 0
    return ((product.price - product.cost_price) / product.price) * 100
  }, [product])

  const stockStatus = useMemo(() => {
    if (!product) return { status: 'unknown', color: 'gray' }

    if (product.quantity === 0) {
      return { status: 'Habis', color: 'red' }
    } else if (product.quantity <= 5) {
      return { status: 'Rendah', color: 'yellow' }
    } else if (product.quantity <= 20) {
      return { status: 'Sedang', color: 'blue' }
    } else {
      return { status: 'Tinggi', color: 'green' }
    }
  }, [product])

  const chartData = useMemo(() => {
    if (!insights?.sales_trend) return []
    return insights.sales_trend.map((item) => ({
      period: `${item.month}/${item.year}`,
      sales: item.quantity_sold,
      revenue: item.revenue / 1000, // Convert to thousands
      transactions: item.transaction_count,
    }))
  }, [insights])

  // Event handlers
  const handleTransactionPageChange = (newPage: number) => {
    setTransactionPage(newPage)
    fetchTransactions(
      newPage,
      transactionLimit,
      transactionType,
      transactionStartDate,
      transactionEndDate
    )
  }

  const handleMutationPageChange = (newPage: number) => {
    setMutationPage(newPage)
    fetchMutations(
      newPage,
      mutationLimit,
      mutationType,
      mutationStartDate,
      mutationEndDate
    )
  }

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <ShoppingCart className='h-4 w-4 text-green-600' />
      case 'purchase':
        return <Truck className='h-4 w-4 text-blue-600' />
      default:
        return <Activity className='h-4 w-4 text-gray-600' />
    }
  }

  const getMutationTypeIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <TrendingDown className='h-4 w-4 text-red-600' />
      case 'purchase':
        return <TrendingUp className='h-4 w-4 text-green-600' />
      case 'adjustment':
        return <Edit3 className='h-4 w-4 text-blue-600' />
      default:
        return <Activity className='h-4 w-4 text-gray-600' />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Pagination component
  const PaginationControls = ({
    currentPage,
    lastPage,
    onPageChange,
    total,
    perPage,
  }: {
    currentPage: number
    lastPage: number
    onPageChange: (page: number) => void
    total: number
    perPage: number
  }) => (
    <div className='flex items-center justify-between px-2'>
      <div className='text-sm text-muted-foreground'>
        Menampilkan {(currentPage - 1) * perPage + 1} -{' '}
        {Math.min(currentPage * perPage, total)} dari {total} data
      </div>
      <div className='flex items-center space-x-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className='h-4 w-4' />
        </Button>
        <span className='text-sm font-medium'>
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

  // Product not found
  if (!product) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className='p-4 text-center'>
            <Package className='mx-auto h-12 w-12 text-gray-400 mb-4' />
            <h2 className='text-lg font-semibold mb-2'>
              Produk Tidak Ditemukan
            </h2>
            <p className='text-sm text-muted-foreground mb-4'>
              Produk yang Anda cari tidak ditemukan atau telah dihapus.
            </p>
            <Button asChild variant='outline'>
              <Link href='/inventory/products'>Kembali ke Daftar Produk</Link>
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
              <Link href='/inventory'>
                <ArrowLeft className='h-4 w-4' />
              </Link>
            </Button>
            <Package className='h-7 w-7 text-primary' />
            <div className='flex-1'>
              <h1 className='text-xl md:text-2xl font-semibold font-headline'>
                {product.name}
              </h1>
              <p className='text-sm text-muted-foreground'>
                SKU: {product.sku || 'Tidak ada'} •{' '}
                {product.category?.name ||
                  product.category_name ||
                  'Tanpa Kategori'}
              </p>
            </div>
            <Button variant='outline' size='sm' asChild>
              <Link href={`/inventory/${productId}/edit`}>
                <Edit3 className='h-4 w-4 mr-2' />
                Edit
              </Link>
            </Button>
          </div>

          {/* Product Overview Card */}
          <Card>
            <CardContent className='p-6'>
              <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
                {/* Product Image */}
                <div className='lg:col-span-1'>
                  <div className='aspect-square rounded-lg border bg-muted/50 flex items-center justify-center overflow-hidden'>
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      <div className='text-center'>
                        <Package className='h-16 w-16 text-muted-foreground mx-auto mb-2' />
                        <p className='text-sm text-muted-foreground'>
                          {product.image_hint || 'Tidak ada gambar'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Stats */}
                <div className='lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4'>
                  <div className='text-center p-4 bg-muted/30 rounded-lg'>
                    <Package className='h-8 w-8 text-blue-500 mx-auto mb-2' />
                    <p className='text-xs text-muted-foreground mb-1'>
                      Stok Saat Ini
                    </p>
                    <p className='text-2xl font-bold'>{product.quantity}</p>
                    <Badge
                      variant={
                        stockStatus.color === 'red'
                          ? 'destructive'
                          : stockStatus.color === 'yellow'
                          ? 'secondary'
                          : 'default'
                      }
                      className='text-xs mt-1'
                    >
                      {stockStatus.status}
                    </Badge>
                  </div>

                  <div className='text-center p-4 bg-muted/30 rounded-lg'>
                    <DollarSign className='h-8 w-8 text-green-500 mx-auto mb-2' />
                    <p className='text-xs text-muted-foreground mb-1'>
                      Harga Jual
                    </p>
                    <p className='text-2xl font-bold'>
                      {formatCurrency(product.price)}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      Cost: {formatCurrency(product.cost_price)}
                    </p>
                  </div>

                  <div className='text-center p-4 bg-muted/30 rounded-lg'>
                    <Target className='h-8 w-8 text-purple-500 mx-auto mb-2' />
                    <p className='text-xs text-muted-foreground mb-1'>
                      Margin Profit
                    </p>
                    <p className='text-2xl font-bold'>
                      {profitMargin.toFixed(1)}%
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {formatCurrency(product.price - product.cost_price)}
                    </p>
                  </div>

                  <div className='text-center p-4 bg-muted/30 rounded-lg'>
                    <Activity className='h-8 w-8 text-orange-500 mx-auto mb-2' />
                    <p className='text-xs text-muted-foreground mb-1'>
                      Total Terjual
                    </p>
                    <p className='text-2xl font-bold'>
                      {insights?.statistics.total_sales || 0}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {formatCurrency(insights?.statistics.total_revenue || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='space-y-6'
          >
            <TabsList className='grid w-full grid-cols-4'>
              <TabsTrigger value='overview' className='text-xs'>
                Overview
              </TabsTrigger>
              <TabsTrigger value='transactions' className='text-xs'>
                Transaksi
              </TabsTrigger>
              <TabsTrigger value='analytics' className='text-xs'>
                Analitik
              </TabsTrigger>
              <TabsTrigger value='mutations' className='text-xs'>
                Mutasi Stok
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value='overview' className='space-y-6'>
              <div className='grid gap-6 lg:grid-cols-2'>
                <Card>
                  <CardHeader>
                    <CardTitle className='text-base font-semibold'>
                      Informasi Produk
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      Detail lengkap dan spesifikasi produk
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='grid grid-cols-2 gap-4 text-sm'>
                      <div>
                        <p className='text-muted-foreground'>Nama Produk</p>
                        <p className='font-medium'>{product.name}</p>
                      </div>
                      <div>
                        <p className='text-muted-foreground'>SKU</p>
                        <p className='font-medium'>
                          {product.sku || 'Tidak ada'}
                        </p>
                      </div>
                      <div>
                        <p className='text-muted-foreground'>Kategori</p>
                        <p className='font-medium'>
                          {product.category?.name ||
                            product.category_name ||
                            'Tanpa Kategori'}
                        </p>
                      </div>
                      <div>
                        <p className='text-muted-foreground'>Dibuat</p>
                        <p className='font-medium'>
                          {formatDate(product.created_at)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className='text-base font-semibold'>
                      Ringkasan Performa
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      Statistik penjualan dan performa terkini
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    {insights?.statistics.best_selling_day && (
                      <div className='p-3 bg-muted/50 rounded-lg'>
                        <p className='text-sm font-medium mb-1'>
                          Hari Terlaris
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {new Date(
                            insights.statistics.best_selling_day.date
                          ).toLocaleDateString('id-ID')}{' '}
                          -{insights.statistics.best_selling_day.quantity_sold}{' '}
                          unit terjual
                        </p>
                      </div>
                    )}

                    <div className='grid grid-cols-2 gap-4 text-sm'>
                      <div>
                        <p className='text-muted-foreground'>
                          Rata-rata Harga Jual
                        </p>
                        <p className='font-medium'>
                          {formatCurrency(
                            insights?.statistics.average_price || 0
                          )}
                        </p>
                      </div>
                      <div>
                        <p className='text-muted-foreground'>Update Terakhir</p>
                        <p className='font-medium'>
                          {formatDate(product.updated_at)}
                        </p>
                      </div>
                    </div>

                    {product.quantity <= 5 && (
                      <div className='flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
                        <AlertTriangle className='h-4 w-4 text-yellow-600' />
                        <p className='text-sm text-yellow-800'>
                          Stok produk ini sudah rendah! Pertimbangkan untuk
                          melakukan restok.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value='transactions' className='space-y-6'>
              <Card>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='text-base font-semibold'>
                        Riwayat Transaksi
                      </CardTitle>
                      <CardDescription className='text-xs'>
                        Daftar semua transaksi penjualan dan pembelian
                      </CardDescription>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Select
                        value={transactionLimit.toString()}
                        onValueChange={(value) =>
                          setTransactionLimit(Number(value))
                        }
                      >
                        <SelectTrigger className='w-20'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option.toString()}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                    <Select
                      value={transactionType}
                      onValueChange={setTransactionType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Tipe Transaksi' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all'>Semua Tipe</SelectItem>
                        <SelectItem value='sale'>Penjualan</SelectItem>
                        <SelectItem value='purchase'>Pembelian</SelectItem>
                      </SelectContent>
                    </Select>

                    <div>
                      <Label htmlFor='trans-start-date' className='text-xs'>
                        Dari Tanggal
                      </Label>
                      <Input
                        id='trans-start-date'
                        type='date'
                        value={transactionStartDate}
                        onChange={(e) =>
                          setTransactionStartDate(e.target.value)
                        }
                        className='text-xs'
                      />
                    </div>

                    <div>
                      <Label htmlFor='trans-end-date' className='text-xs'>
                        Sampai Tanggal
                      </Label>
                      <Input
                        id='trans-end-date'
                        type='date'
                        value={transactionEndDate}
                        onChange={(e) => setTransactionEndDate(e.target.value)}
                        className='text-xs'
                      />
                    </div>

                    <Button
                      variant='outline'
                      onClick={() => {
                        setTransactionStartDate('')
                        setTransactionEndDate('')
                        setTransactionType('all')
                      }}
                    >
                      Reset Filter
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className='text-center py-8'>
                      <History className='mx-auto h-12 w-12 text-gray-400 mb-4' />
                      <p className='text-sm text-muted-foreground'>
                        Tidak ada transaksi ditemukan
                      </p>
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      {transactions.map((transaction) => (
                        <div
                          key={`${transaction.type}-${transaction.transaction_id}`}
                          className='flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors'
                        >
                          <div className='flex items-center gap-3'>
                            {getTransactionTypeIcon(transaction.type)}
                            <div>
                              <p className='font-medium text-sm'>
                                {transaction.reference}
                              </p>
                              <p className='text-xs text-muted-foreground'>
                                {transaction.type_label} •{' '}
                                {formatDate(transaction.created_at)}
                              </p>
                              <p className='text-xs text-muted-foreground'>
                                oleh {transaction.user_name}
                              </p>
                            </div>
                          </div>
                          <div className='text-right'>
                            <p className='font-medium text-sm'>
                              {transaction.quantity} unit ×{' '}
                              {formatCurrency(transaction.price)}
                            </p>
                            <p className='text-sm font-semibold'>
                              {formatCurrency(transaction.total)}
                            </p>
                          </div>
                        </div>
                      ))}

                      <Separator />
                      <PaginationControls
                        currentPage={transactionPagination.current_page}
                        lastPage={transactionPagination.last_page}
                        onPageChange={handleTransactionPageChange}
                        total={transactionPagination.total}
                        perPage={transactionPagination.per_page}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value='analytics' className='space-y-6'>
              <Card>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='text-base font-semibold'>
                        Analitik Penjualan
                      </CardTitle>
                      <CardDescription className='text-xs'>
                        Trend dan statistik penjualan produk
                      </CardDescription>
                    </div>
                  </div>

                  {/* Date filters for analytics */}
                  <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                    <Select
                      value={insightMonths.toString()}
                      onValueChange={(value) => setInsightMonths(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Periode' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='3'>3 Bulan Terakhir</SelectItem>
                        <SelectItem value='6'>6 Bulan Terakhir</SelectItem>
                        <SelectItem value='12'>12 Bulan Terakhir</SelectItem>
                        <SelectItem value='24'>24 Bulan Terakhir</SelectItem>
                      </SelectContent>
                    </Select>

                    <div>
                      <Label htmlFor='insight-start-date' className='text-xs'>
                        Dari Tanggal (Opsional)
                      </Label>
                      <Input
                        id='insight-start-date'
                        type='date'
                        value={insightStartDate}
                        onChange={(e) => setInsightStartDate(e.target.value)}
                        className='text-xs'
                      />
                    </div>

                    <div>
                      <Label htmlFor='insight-end-date' className='text-xs'>
                        Sampai Tanggal (Opsional)
                      </Label>
                      <Input
                        id='insight-end-date'
                        type='date'
                        value={insightEndDate}
                        onChange={(e) => setInsightEndDate(e.target.value)}
                        className='text-xs'
                      />
                    </div>

                    <Button
                      variant='outline'
                      onClick={() => {
                        setInsightStartDate('')
                        setInsightEndDate('')
                        setInsightMonths(12)
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <div className='space-y-6'>
                      {/* Sales Trend Chart */}
                      <div>
                        <h4 className='text-sm font-medium mb-4'>
                          Trend Penjualan (Kuantitas)
                        </h4>
                        <ResponsiveContainer width='100%' height={300}>
                          <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray='3 3' />
                            <XAxis dataKey='period' className='text-xs' />
                            <YAxis className='text-xs' />
                            <Tooltip
                              labelFormatter={(label) => `Periode: ${label}`}
                              formatter={(value, name) => [
                                name === 'sales'
                                  ? `${value} unit`
                                  : `${formatCurrency(Number(value) * 1000)}`,
                                name === 'sales' ? 'Terjual' : 'Revenue (rb)',
                              ]}
                            />
                            <Area
                              type='monotone'
                              dataKey='sales'
                              stroke='#8884d8'
                              fill='#8884d8'
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Revenue Chart */}
                      <div>
                        <h4 className='text-sm font-medium mb-4'>
                          Trend Revenue (dalam ribuan)
                        </h4>
                        <ResponsiveContainer width='100%' height={300}>
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray='3 3' />
                            <XAxis dataKey='period' className='text-xs' />
                            <YAxis className='text-xs' />
                            <Tooltip
                              labelFormatter={(label) => `Periode: ${label}`}
                              formatter={(value) => [
                                `${formatCurrency(Number(value) * 1000)}`,
                                'Revenue',
                              ]}
                            />
                            <Bar dataKey='revenue' fill='#82ca9d' />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className='text-center py-8'>
                      <BarChart3 className='mx-auto h-12 w-12 text-gray-400 mb-4' />
                      <p className='text-sm text-muted-foreground'>
                        Tidak ada data untuk ditampilkan
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Mutations Tab */}
            <TabsContent value='mutations' className='space-y-6'>
              <Card>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='text-base font-semibold'>
                        Mutasi Stok
                      </CardTitle>
                      <CardDescription className='text-xs'>
                        Riwayat perubahan stok produk
                      </CardDescription>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Select
                        value={mutationLimit.toString()}
                        onValueChange={(value) =>
                          setMutationLimit(Number(value))
                        }
                      >
                        <SelectTrigger className='w-20'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option.toString()}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                    <Select
                      value={mutationType}
                      onValueChange={setMutationType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Tipe Mutasi' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all'>Semua Tipe</SelectItem>
                        <SelectItem value='sale'>Penjualan</SelectItem>
                        <SelectItem value='purchase'>Pembelian</SelectItem>
                        <SelectItem value='adjustment'>Penyesuaian</SelectItem>
                      </SelectContent>
                    </Select>

                    <div>
                      <Label htmlFor='mut-start-date' className='text-xs'>
                        Dari Tanggal
                      </Label>
                      <Input
                        id='mut-start-date'
                        type='date'
                        value={mutationStartDate}
                        onChange={(e) => setMutationStartDate(e.target.value)}
                        className='text-xs'
                      />
                    </div>

                    <div>
                      <Label htmlFor='mut-end-date' className='text-xs'>
                        Sampai Tanggal
                      </Label>
                      <Input
                        id='mut-end-date'
                        type='date'
                        value={mutationEndDate}
                        onChange={(e) => setMutationEndDate(e.target.value)}
                        className='text-xs'
                      />
                    </div>

                    <Button
                      variant='outline'
                      onClick={() => {
                        setMutationStartDate('')
                        setMutationEndDate('')
                        setMutationType('all')
                      }}
                    >
                      Reset Filter
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {mutations.length === 0 ? (
                    <div className='text-center py-8'>
                      <Activity className='mx-auto h-12 w-12 text-gray-400 mb-4' />
                      <p className='text-sm text-muted-foreground'>
                        Tidak ada mutasi stok ditemukan
                      </p>
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      {mutations.map((mutation) => (
                        <div
                          key={mutation.id}
                          className='flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors'
                        >
                          <div className='flex items-center gap-3'>
                            {getMutationTypeIcon(mutation.type)}
                            <div>
                              <div className='flex items-center gap-2'>
                                <p className='font-medium text-sm capitalize'>
                                  {mutation.type}
                                </p>
                                <Badge
                                  variant={
                                    mutation.quantity_change >= 0
                                      ? 'default'
                                      : 'secondary'
                                  }
                                >
                                  {mutation.quantity_change >= 0 ? '+' : ''}
                                  {mutation.quantity_change}
                                </Badge>
                              </div>
                              <p className='text-xs text-muted-foreground'>
                                {formatDate(mutation.created_at)} •{' '}
                                {mutation.user_name}
                              </p>
                              {mutation.description && (
                                <p className='text-xs text-muted-foreground'>
                                  {mutation.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className='text-right text-sm'>
                            <p>
                              Sebelum:{' '}
                              <span className='font-medium'>
                                {mutation.stock_before}
                              </span>
                            </p>
                            <p>
                              Sesudah:{' '}
                              <span className='font-medium'>
                                {mutation.stock_after}
                              </span>
                            </p>
                          </div>
                        </div>
                      ))}

                      <Separator />
                      <PaginationControls
                        currentPage={mutationPagination.current_page}
                        lastPage={mutationPagination.last_page}
                        onPageChange={handleMutationPageChange}
                        total={mutationPagination.total}
                        perPage={mutationPagination.per_page}
                      />
                    </div>
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
