'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useBranches } from '@/contexts/branch-context'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  Globe,
  Building,
  Star,
  Edit3,
  TrendingUp,
  Package,
  AlertTriangle,
  Calendar,
  DollarSign,
  ShoppingCart,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { type Supplier, type PurchaseOrder } from '@/lib/types'
import { getSupplier } from '@/lib/laravel/suppliers'
import { formatCurrency } from '@/lib/utils'
import { formatDateIntl } from '@/lib/helper'

export default function SupplierDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { selectedBranch } = useBranches()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [recentOrders, setRecentOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)

  const supplierId = params.id as string

  useEffect(() => {
    const fetchSupplierData = async () => {
      if (!selectedBranch || !supplierId) return

      try {
        setLoading(true)
        const supplierData = await getSupplier(supplierId)
        setSupplier(supplierData)

        // In a real app, you would fetch recent orders here
        // setRecentOrders(await getSupplierOrders(supplierId))
      } catch (error: any) {
        console.error('Error fetching supplier:', error)
        toast.error('Gagal memuat data pemasok')
        router.push('/suppliers')
      } finally {
        setLoading(false)
      }
    }

    fetchSupplierData()
  }, [selectedBranch, supplierId, router])

  if (!selectedBranch) {
    return (
      <MainLayout>
        <div className='flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4'>
          <Building2 className='h-16 w-16 text-primary animate-pulse mb-4' />
          <h1 className='text-2xl font-semibold font-headline mb-2'>
            Berkah Baja Makmur
          </h1>
          <p className='text-sm text-muted-foreground'>Silakan tunggu...</p>
        </div>
      </MainLayout>
    )
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className='flex items-center justify-center min-h-[400px]'>
            <div className='text-center'>
              <Building2 className='h-8 w-8 text-primary animate-pulse mx-auto mb-4' />
              <p className='text-sm text-muted-foreground'>
                Memuat data pemasok...
              </p>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  if (!supplier) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className='flex items-center justify-center min-h-[400px]'>
            <div className='text-center'>
              <AlertTriangle className='h-8 w-8 text-destructive mx-auto mb-4' />
              <p className='text-sm text-muted-foreground'>
                Pemasok tidak ditemukan
              </p>
              <Button variant='outline' size='sm' className='mt-4' asChild>
                <Link href='/suppliers'>Kembali ke Daftar Pemasok</Link>
              </Button>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  const analytics = supplier.analytics || {
    total_orders: 0,
    total_amount: 0,
    outstanding_amount: 0,
    last_order_date: null,
    average_order_value: 0,
    payment_reliability: 0,
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-6'>
          {/* Header */}
          <div className='flex items-center gap-3'>
            <Building2 className='h-7 w-7 text-primary' />
            <div className='flex-1'>
              <div className='flex items-center gap-3 mb-1'>
                <h1 className='text-xl md:text-2xl font-semibold font-headline'>
                  {supplier.name}
                </h1>
                <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                  {supplier.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
                {supplier.company_type && (
                  <Badge variant='outline'>
                    {supplier.company_type === 'company'
                      ? 'Perusahaan'
                      : 'Perorangan'}
                  </Badge>
                )}
              </div>
              <p className='text-sm text-muted-foreground'>
                Detail informasi dan analitik pemasok
              </p>
            </div>
            <div className='flex gap-2'>
              <Button variant='outline' size='sm' asChild>
                <Link href={`/suppliers/${supplier.id}/edit`}>
                  <Edit3 className='h-4 w-4 mr-2' />
                  Edit
                </Link>
              </Button>
              <Button variant='outline' size='sm' asChild>
                <Link href='/suppliers'>
                  <ArrowLeft className='h-4 w-4 mr-2' />
                  Kembali
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <Card>
              <CardContent className='p-4'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg'>
                    <ShoppingCart className='h-5 w-5 text-blue-600 dark:text-blue-400' />
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>
                      Total Pesanan
                    </p>
                    <p className='text-lg font-semibold'>
                      {analytics.total_orders}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className='p-4'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-green-100 dark:bg-green-900/30 rounded-lg'>
                    <DollarSign className='h-5 w-5 text-green-600 dark:text-green-400' />
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>
                      Total Transaksi
                    </p>
                    <p className='text-lg font-semibold'>
                      {formatCurrency(analytics.total_amount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className='p-4'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg'>
                    <AlertTriangle className='h-5 w-5 text-orange-600 dark:text-orange-400' />
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>
                      Saldo Terutang
                    </p>
                    <p className='text-lg font-semibold'>
                      {formatCurrency(analytics.outstanding_amount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className='p-4'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg'>
                    <TrendingUp className='h-5 w-5 text-purple-600 dark:text-purple-400' />
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>
                      Rata-rata Order
                    </p>
                    <p className='text-lg font-semibold'>
                      {formatCurrency(analytics.average_order_value)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className='grid gap-6 lg:grid-cols-2'>
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className='text-base flex items-center gap-2'>
                  <User className='h-5 w-5' />
                  Informasi Dasar
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid gap-4'>
                  <div>
                    <p className='text-xs text-muted-foreground'>
                      Nama Pemasok
                    </p>
                    <p className='text-sm font-medium'>{supplier.name}</p>
                  </div>

                  {supplier.contact_person && (
                    <div>
                      <p className='text-xs text-muted-foreground'>
                        Kontak Person
                      </p>
                      <p className='text-sm'>{supplier.contact_person}</p>
                    </div>
                  )}

                  {supplier.industry && (
                    <div>
                      <p className='text-xs text-muted-foreground'>Industri</p>
                      <p className='text-sm'>{supplier.industry}</p>
                    </div>
                  )}

                  {supplier.rating && (
                    <div>
                      <p className='text-xs text-muted-foreground'>Rating</p>
                      <div className='flex items-center gap-2'>
                        <div className='flex'>
                          {Array.from({ length: supplier.rating }).map(
                            (_, i) => (
                              <Star
                                key={i}
                                className='h-4 w-4 fill-yellow-400 text-yellow-400'
                              />
                            )
                          )}
                        </div>
                        <span className='text-sm'>{supplier.rating}/5</span>
                      </div>
                    </div>
                  )}

                  {analytics.last_order_date && (
                    <div>
                      <p className='text-xs text-muted-foreground'>
                        Pesanan Terakhir
                      </p>
                      <p className='text-sm'>
                        {formatDateIntl(analytics.last_order_date)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className='text-base flex items-center gap-2'>
                  <Mail className='h-5 w-5' />
                  Informasi Kontak
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid gap-4'>
                  {supplier.email && (
                    <div className='flex items-center gap-3'>
                      <Mail className='h-4 w-4 text-muted-foreground' />
                      <div>
                        <p className='text-xs text-muted-foreground'>Email</p>
                        <p className='text-sm'>{supplier.email}</p>
                      </div>
                    </div>
                  )}

                  {supplier.phone && (
                    <div className='flex items-center gap-3'>
                      <Phone className='h-4 w-4 text-muted-foreground' />
                      <div>
                        <p className='text-xs text-muted-foreground'>Telepon</p>
                        <p className='text-sm'>{supplier.phone}</p>
                      </div>
                    </div>
                  )}

                  {supplier.website && (
                    <div className='flex items-center gap-3'>
                      <Globe className='h-4 w-4 text-muted-foreground' />
                      <div>
                        <p className='text-xs text-muted-foreground'>Website</p>
                        <a
                          href={supplier.website}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-sm text-primary hover:underline'
                        >
                          {supplier.website}
                        </a>
                      </div>
                    </div>
                  )}

                  {supplier.address && (
                    <div className='flex items-start gap-3'>
                      <MapPin className='h-4 w-4 text-muted-foreground mt-0.5' />
                      <div>
                        <p className='text-xs text-muted-foreground'>Alamat</p>
                        <p className='text-sm'>{supplier.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle className='text-base flex items-center gap-2'>
                  <CreditCard className='h-5 w-5' />
                  Informasi Keuangan
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid gap-4'>
                  {supplier.tax_id && (
                    <div>
                      <p className='text-xs text-muted-foreground'>
                        NPWP / Tax ID
                      </p>
                      <p className='text-sm font-mono'>{supplier.tax_id}</p>
                    </div>
                  )}

                  {supplier.payment_terms && (
                    <div>
                      <p className='text-xs text-muted-foreground'>
                        Termin Pembayaran
                      </p>
                      <p className='text-sm'>{supplier.payment_terms}</p>
                    </div>
                  )}

                  {supplier.credit_limit && (
                    <div>
                      <p className='text-xs text-muted-foreground'>
                        Limit Kredit
                      </p>
                      <p className='text-sm'>
                        {formatCurrency(supplier.credit_limit)}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className='text-xs text-muted-foreground'>
                      Reliabilitas Pembayaran
                    </p>
                    <div className='flex items-center gap-2'>
                      <div className='flex-1 bg-muted rounded-full h-2'>
                        <div
                          className='bg-primary rounded-full h-2 transition-all'
                          style={{ width: `${analytics.payment_reliability}%` }}
                        />
                      </div>
                      <span className='text-sm'>
                        {analytics.payment_reliability.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bank Information */}
            <Card>
              <CardHeader>
                <CardTitle className='text-base flex items-center gap-2'>
                  <Building className='h-5 w-5' />
                  Informasi Bank
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                {supplier.bank_name ||
                supplier.bank_account_number ||
                supplier.bank_account_name ? (
                  <div className='grid gap-4'>
                    {supplier.bank_name && (
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Nama Bank
                        </p>
                        <p className='text-sm'>{supplier.bank_name}</p>
                      </div>
                    )}

                    {supplier.bank_account_number && (
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Nomor Rekening
                        </p>
                        <p className='text-sm font-mono'>
                          {supplier.bank_account_number}
                        </p>
                      </div>
                    )}

                    {supplier.bank_account_name && (
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Nama Pemilik Rekening
                        </p>
                        <p className='text-sm'>{supplier.bank_account_name}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className='text-sm text-muted-foreground'>
                    Informasi bank belum tersedia
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {supplier.notes && (
            <Card>
              <CardHeader>
                <CardTitle className='text-base flex items-center gap-2'>
                  <FileText className='h-5 w-5' />
                  Catatan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-muted-foreground'>
                  {supplier.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Recent Orders - Placeholder for future implementation */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base flex items-center gap-2'>
                <Clock className='h-5 w-5' />
                Pesanan Terbaru
              </CardTitle>
              <CardDescription className='text-xs'>
                5 pesanan terakhir dari pemasok ini
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='text-center py-8'>
                <Package className='h-8 w-8 text-muted-foreground mx-auto mb-4' />
                <p className='text-sm text-muted-foreground'>
                  Fitur riwayat pesanan akan segera tersedia
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
