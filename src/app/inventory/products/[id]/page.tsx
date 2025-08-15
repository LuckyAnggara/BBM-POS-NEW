'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import {
  Package,
  BarChart3,
  History,
  ArrowLeft,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import api from '@/lib/api'
import { formatCurrency, formatDateIntl } from '@/lib/helper'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

interface Product {
  id: number
  sku: string
  name: string
  category_id: number
  category?: {
    id: number
    name: string
  }
  price: number
  cost: number
  stock: number
  unit: string
  description?: string
  created_at: string
  updated_at: string
}

interface ProductTransaction {
  id: number
  type: 'sale' | 'purchase'
  date: string
  quantity: number
  unit_price: number
  total: number
  customer?: string
  supplier?: string
  invoice_number?: string
  notes?: string
}

interface ProductInsights {
  total_sold: number
  total_purchased: number
  revenue: number
  profit: number
  average_sale_price: number
  sales_trend: {
    month: string
    sales: number
    revenue: number
  }[]
  best_selling_days: {
    day_name: string
    total_sold: number
  }[]
  low_stock_alert: boolean
}

interface StockMutation {
  id: number
  type: 'in' | 'out' | 'adjustment'
  quantity: number
  reference_type?: string
  reference_id?: number
  notes?: string
  created_at: string
  created_by?: {
    name: string
  }
}

export default function ProductDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { userData } = useAuth()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [transactions, setTransactions] = useState<ProductTransaction[]>([])
  const [insights, setInsights] = useState<ProductInsights | null>(null)
  const [mutations, setMutations] = useState<StockMutation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('detail')

  // Fetch product details
  const fetchProductDetails = async () => {
    try {
      const response = await api.get(`/api/products/${productId}/details`)
      setProduct(response.data.data)
    } catch (error: any) {
      console.error('Error fetching product details:', error)
      toast.error('Gagal memuat detail produk')
    }
  }

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      const response = await api.get(`/api/products/${productId}/transactions`)
      setTransactions(response.data.data)
    } catch (error: any) {
      console.error('Error fetching transactions:', error)
      toast.error('Gagal memuat riwayat transaksi')
    }
  }

  // Fetch insights
  const fetchInsights = async () => {
    try {
      const response = await api.get(`/api/products/${productId}/insights`)
      setInsights(response.data.data)
    } catch (error: any) {
      console.error('Error fetching insights:', error)
      toast.error('Gagal memuat analitik produk')
    }
  }

  // Fetch mutations
  const fetchMutations = async () => {
    try {
      const response = await api.get(`/api/products/${productId}/mutations`)
      setMutations(response.data.data)
    } catch (error: any) {
      console.error('Error fetching mutations:', error)
      toast.error('Gagal memuat mutasi stok')
    }
  }

  useEffect(() => {
    if (productId) {
      Promise.all([
        fetchProductDetails(),
        fetchTransactions(),
        fetchInsights(),
        fetchMutations(),
      ]).finally(() => setLoading(false))
    }
  }, [productId])

  const profitMargin = useMemo(() => {
    if (!product) return 0
    return product.price > 0
      ? ((product.price - product.cost) / product.price) * 100
      : 0
  }, [product])

  const chartData = useMemo(() => {
    if (!insights?.sales_trend) return []
    return insights.sales_trend.map((item) => ({
      month: item.month,
      sales: item.sales,
      revenue: item.revenue / 1000, // Convert to thousands for better chart display
    }))
  }, [insights])

  if (loading) {
    return (
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
    )
  }

  if (!product) {
    return (
      <MainLayout>
        <div className='p-4 text-center'>
          <Package className='mx-auto h-12 w-12 text-gray-400 mb-4' />
          <h2 className='text-lg font-semibold mb-2'>Produk Tidak Ditemukan</h2>
          <p className='text-sm text-muted-foreground mb-4'>
            Produk yang Anda cari tidak ditemukan atau telah dihapus.
          </p>
          <Button asChild variant='outline'>
            <Link href='/inventory/products'>Kembali ke Daftar Produk</Link>
          </Button>
        </div>
      </MainLayout>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-6'>
          {/* Header */}
          <div className='flex items-center gap-3'>
            <Button variant='ghost' size='sm' asChild>
              <Link href='/inventory/products'>
                <ArrowLeft className='h-4 w-4' />
              </Link>
            </Button>
            <Package className='h-7 w-7 text-primary' />
            <div>
              <h1 className='text-xl md:text-2xl font-semibold font-headline'>
                {product.name}
              </h1>
              <p className='text-sm text-muted-foreground'>
                SKU: {product.sku} •{' '}
                {product.category?.name || 'Tanpa Kategori'}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            <Card>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-xs text-muted-foreground'>
                      Stok Saat Ini
                    </p>
                    <p className='text-lg font-semibold'>
                      {product.stock} {product.unit}
                    </p>
                  </div>
                  <Package className='h-8 w-8 text-blue-500' />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-xs text-muted-foreground'>Harga Jual</p>
                    <p className='text-lg font-semibold'>
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                  <TrendingUp className='h-8 w-8 text-green-500' />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-xs text-muted-foreground'>
                      Margin Profit
                    </p>
                    <p className='text-lg font-semibold'>
                      {profitMargin.toFixed(1)}%
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
                      Total Terjual
                    </p>
                    <p className='text-lg font-semibold'>
                      {insights?.total_sold || 0} {product.unit}
                    </p>
                  </div>
                  <Activity className='h-8 w-8 text-orange-500' />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs Content */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='space-y-6'
          >
            <TabsList className='grid w-full grid-cols-4'>
              <TabsTrigger value='detail' className='text-xs'>
                Detail Produk
              </TabsTrigger>
              <TabsTrigger value='history' className='text-xs'>
                Riwayat Transaksi
              </TabsTrigger>
              <TabsTrigger value='insights' className='text-xs'>
                Analitik
              </TabsTrigger>
              <TabsTrigger value='mutations' className='text-xs'>
                Mutasi Stok
              </TabsTrigger>
            </TabsList>

            {/* Detail Tab */}
            <TabsContent value='detail' className='space-y-6'>
              <div className='grid gap-6 lg:grid-cols-2'>
                <Card>
                  <CardHeader>
                    <CardTitle className='text-base font-semibold'>
                      Informasi Dasar
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      Detail utama produk dan spesifikasi
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <p className='text-xs text-muted-foreground'>SKU</p>
                        <p className='text-sm font-medium'>{product.sku}</p>
                      </div>
                      <div>
                        <p className='text-xs text-muted-foreground'>Unit</p>
                        <p className='text-sm font-medium'>{product.unit}</p>
                      </div>
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Harga Beli
                        </p>
                        <p className='text-sm font-medium'>
                          {formatCurrency(product.cost)}
                        </p>
                      </div>
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Harga Jual
                        </p>
                        <p className='text-sm font-medium'>
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                    </div>
                    {product.description && (
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Deskripsi
                        </p>
                        <p className='text-sm'>{product.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className='text-base font-semibold'>
                      Status Stok
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      Informasi ketersediaan dan alert
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm'>Stok Tersedia</span>
                      <Badge
                        variant={
                          product.stock > 10
                            ? 'default'
                            : product.stock > 0
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {product.stock} {product.unit}
                      </Badge>
                    </div>
                    {insights?.low_stock_alert && (
                      <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-3'>
                        <p className='text-xs text-yellow-800'>
                          ⚠️ Stok rendah! Pertimbangkan untuk melakukan
                          pembelian ulang.
                        </p>
                      </div>
                    )}
                    <div className='space-y-2'>
                      <p className='text-xs text-muted-foreground'>Dibuat</p>
                      <p className='text-sm'>
                        {formatDateIntl(product.created_at)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value='history' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle className='text-base font-semibold'>
                    Riwayat Transaksi
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Semua transaksi pembelian dan penjualan produk ini
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className='text-center py-8'>
                      <History className='mx-auto h-12 w-12 text-gray-400 mb-4' />
                      <p className='text-sm text-muted-foreground'>
                        Belum ada transaksi
                      </p>
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      {transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className='border rounded-lg p-4'
                        >
                          <div className='flex items-center justify-between mb-2'>
                            <div className='flex items-center gap-2'>
                              <Badge
                                variant={
                                  transaction.type === 'sale'
                                    ? 'default'
                                    : 'secondary'
                                }
                              >
                                {transaction.type === 'sale'
                                  ? 'Penjualan'
                                  : 'Pembelian'}
                              </Badge>
                              <span className='text-sm font-medium'>
                                {transaction.invoice_number}
                              </span>
                            </div>
                            <span className='text-xs text-muted-foreground'>
                              {formatDateIntl(transaction.date)}
                            </span>
                          </div>
                          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                            <div>
                              <p className='text-xs text-muted-foreground'>
                                Jumlah
                              </p>
                              <p>
                                {transaction.quantity} {product.unit}
                              </p>
                            </div>
                            <div>
                              <p className='text-xs text-muted-foreground'>
                                Harga Satuan
                              </p>
                              <p>{formatCurrency(transaction.unit_price)}</p>
                            </div>
                            <div>
                              <p className='text-xs text-muted-foreground'>
                                Total
                              </p>
                              <p className='font-medium'>
                                {formatCurrency(transaction.total)}
                              </p>
                            </div>
                            <div>
                              <p className='text-xs text-muted-foreground'>
                                {transaction.type === 'sale'
                                  ? 'Pelanggan'
                                  : 'Supplier'}
                              </p>
                              <p>
                                {transaction.customer ||
                                  transaction.supplier ||
                                  '-'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value='insights' className='space-y-6'>
              <div className='grid gap-6'>
                {/* Analytics Cards */}
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <Card>
                    <CardContent className='p-4'>
                      <div className='flex items-center justify-between'>
                        <div>
                          <p className='text-xs text-muted-foreground'>
                            Total Revenue
                          </p>
                          <p className='text-lg font-semibold'>
                            {formatCurrency(insights?.revenue || 0)}
                          </p>
                        </div>
                        <TrendingUp className='h-8 w-8 text-green-500' />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className='p-4'>
                      <div className='flex items-center justify-between'>
                        <div>
                          <p className='text-xs text-muted-foreground'>
                            Total Profit
                          </p>
                          <p className='text-lg font-semibold'>
                            {formatCurrency(insights?.profit || 0)}
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
                            Harga Rata-rata
                          </p>
                          <p className='text-lg font-semibold'>
                            {formatCurrency(insights?.average_sale_price || 0)}
                          </p>
                        </div>
                        <Activity className='h-8 w-8 text-orange-500' />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sales Trend Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-base font-semibold'>
                      Trend Penjualan
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      Grafik penjualan dan revenue dalam 6 bulan terakhir
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
                                name === 'sales'
                                  ? `${value} unit`
                                  : `${formatCurrency(value * 1000)}`,
                                name === 'sales' ? 'Terjual' : 'Revenue',
                              ]}
                            />
                            <Line
                              type='monotone'
                              dataKey='sales'
                              stroke='#3b82f6'
                              strokeWidth={2}
                            />
                            <Line
                              type='monotone'
                              dataKey='revenue'
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
                          Belum ada data penjualan
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Best Selling Days */}
                {insights?.best_selling_days &&
                  insights.best_selling_days.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className='text-base font-semibold'>
                          Hari Terlaris
                        </CardTitle>
                        <CardDescription className='text-xs'>
                          Hari dalam seminggu dengan penjualan terbanyak
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className='space-y-2'>
                          {insights.best_selling_days.map((day, index) => (
                            <div
                              key={day.day_name}
                              className='flex items-center justify-between'
                            >
                              <span className='text-sm'>{day.day_name}</span>
                              <Badge variant='outline'>
                                {day.total_sold} {product.unit}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
              </div>
            </TabsContent>

            {/* Mutations Tab */}
            <TabsContent value='mutations' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle className='text-base font-semibold'>
                    Mutasi Stok
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Riwayat perubahan stok produk (masuk, keluar, penyesuaian)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {mutations.length === 0 ? (
                    <div className='text-center py-8'>
                      <Activity className='mx-auto h-12 w-12 text-gray-400 mb-4' />
                      <p className='text-sm text-muted-foreground'>
                        Belum ada mutasi stok
                      </p>
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      {mutations.map((mutation) => (
                        <div
                          key={mutation.id}
                          className='border rounded-lg p-4'
                        >
                          <div className='flex items-center justify-between mb-2'>
                            <div className='flex items-center gap-2'>
                              <Badge
                                variant={
                                  mutation.type === 'in'
                                    ? 'default'
                                    : mutation.type === 'out'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                              >
                                {mutation.type === 'in'
                                  ? 'Masuk'
                                  : mutation.type === 'out'
                                  ? 'Keluar'
                                  : 'Penyesuaian'}
                              </Badge>
                              <span className='text-sm font-medium'>
                                {mutation.type === 'in'
                                  ? '+'
                                  : mutation.type === 'out'
                                  ? '-'
                                  : ''}
                                {mutation.quantity} {product.unit}
                              </span>
                            </div>
                            <span className='text-xs text-muted-foreground'>
                              {formatDateIntl(mutation.created_at)}
                            </span>
                          </div>
                          <div className='text-sm space-y-1'>
                            {mutation.reference_type && (
                              <p className='text-xs text-muted-foreground'>
                                Referensi: {mutation.reference_type} #
                                {mutation.reference_id}
                              </p>
                            )}
                            {mutation.notes && (
                              <p className='text-xs'>
                                Catatan: {mutation.notes}
                              </p>
                            )}
                            {mutation.created_by && (
                              <p className='text-xs text-muted-foreground'>
                                Oleh: {mutation.created_by.name}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
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
