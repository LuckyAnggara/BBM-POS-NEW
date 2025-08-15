'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Package, Search, Eye } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/helper'

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

export default function ProductsPage() {
  const router = useRouter()
  const { userData } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/products')
      setProducts(response.data.data || [])
    } catch (error: any) {
      console.error('Error fetching products:', error)
      toast.error('Gagal memuat daftar produk')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <MainLayout>
        <div className='space-y-6'>
          <div className='flex items-center gap-3'>
            <Skeleton className='h-8 w-8' />
            <Skeleton className='h-8 w-1/3' />
          </div>
          <div className='grid gap-4'>
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className='p-4'>
                  <Skeleton className='h-24 w-full' />
                </CardContent>
              </Card>
            ))}
          </div>
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
            <Package className='h-7 w-7 text-primary' />
            <h1 className='text-xl md:text-2xl font-semibold font-headline'>
              Daftar Produk
            </h1>
          </div>

          {/* Search */}
          <div className='flex items-center gap-4'>
            <div className='relative flex-1 max-w-md'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Cari produk, SKU, atau kategori...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10'
              />
            </div>
            <div className='text-sm text-muted-foreground'>
              {filteredProducts.length} dari {products.length} produk
            </div>
          </div>

          {/* Products List */}
          {filteredProducts.length === 0 ? (
            <Card>
              <CardContent className='p-8 text-center'>
                <Package className='mx-auto h-12 w-12 text-gray-400 mb-4' />
                <h3 className='text-lg font-semibold mb-2'>
                  {searchTerm ? 'Produk tidak ditemukan' : 'Belum ada produk'}
                </h3>
                <p className='text-sm text-muted-foreground'>
                  {searchTerm
                    ? 'Coba ubah kata kunci pencarian Anda'
                    : 'Mulai tambahkan produk untuk mengelola inventaris Anda'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className='grid gap-4'>
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className='hover:shadow-md transition-shadow'
                >
                  <CardContent className='p-6'>
                    <div className='flex items-center justify-between'>
                      <div className='flex-1'>
                        <div className='flex items-center gap-3 mb-2'>
                          <h3 className='text-lg font-semibold'>
                            {product.name}
                          </h3>
                          <Badge variant='outline'>{product.sku}</Badge>
                          {product.category && (
                            <Badge variant='secondary' className='text-xs'>
                              {product.category.name}
                            </Badge>
                          )}
                        </div>

                        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                          <div>
                            <p className='text-muted-foreground'>Harga Jual</p>
                            <p className='font-medium'>
                              {formatCurrency(product.price)}
                            </p>
                          </div>
                          <div>
                            <p className='text-muted-foreground'>Harga Beli</p>
                            <p className='font-medium'>
                              {formatCurrency(product.cost)}
                            </p>
                          </div>
                          <div>
                            <p className='text-muted-foreground'>Stok</p>
                            <div className='flex items-center gap-2'>
                              <span className='font-medium'>
                                {product.stock}
                              </span>
                              <span className='text-xs text-muted-foreground'>
                                {product.unit}
                              </span>
                              {product.stock < 10 && (
                                <Badge
                                  variant='destructive'
                                  className='text-xs'
                                >
                                  Stok Rendah
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className='text-muted-foreground'>Profit</p>
                            <p className='font-medium text-green-600'>
                              {(
                                ((product.price - product.cost) /
                                  product.price) *
                                100
                              ).toFixed(1)}
                              %
                            </p>
                          </div>
                        </div>

                        {product.description && (
                          <p className='text-sm text-muted-foreground mt-2 line-clamp-2'>
                            {product.description}
                          </p>
                        )}
                      </div>

                      <div className='ml-6'>
                        <Button asChild>
                          <Link href={`/inventory/products/${product.id}`}>
                            <Eye className='h-4 w-4 mr-2' />
                            Detail
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
