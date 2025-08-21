'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useBranches } from '@/contexts/branch-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PlusCircle,
  Search,
  FilePenLine,
  Trash2,
  ChevronLeft,
  ChevronRight,
  LucideEye,
  Building2,
  Mail,
  Phone,
  MapPin,
  Trophy,
  Star,
  CreditCard,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  ITEMS_PER_PAGE_OPTIONS,
  type Supplier,
  type TopSuppliersResponse,
} from '@/lib/types'
import {
  listSuppliers,
  deleteSupplier,
  getTopSuppliers,
} from '@/lib/laravel/suppliers'
import { formatDateIntl, formatCurrency } from '@/lib/helper'

export default function SuppliersPage() {
  const { selectedBranch } = useBranches()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(
    null
  )
  const [topSuppliers, setTopSuppliers] = useState<TopSuppliersResponse | null>(
    null
  )
  const [loadingTopSuppliers, setLoadingTopSuppliers] = useState(true)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_OPTIONS[1])
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const hasNextPage = currentPage < totalPages
  const hasPreviousPage = currentPage > 1

  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const loadSuppliers = useCallback(
    async (page = 1, limit = itemsPerPage, searchTerm = '') => {
      if (!selectedBranch) return

      setLoadingSuppliers(true)
      try {
        const response = await listSuppliers({
          branchId: selectedBranch.id,
          page,
          limit,
          searchTerm,
        })

        setSuppliers(response.data)
        setTotalItems(response.total)
        setCurrentPage(response.current_page)
      } catch (error) {
        console.error('Error loading suppliers:', error)
        toast.error('Gagal memuat data pemasok')
      } finally {
        setLoadingSuppliers(false)
      }
    },
    [selectedBranch, itemsPerPage]
  )

  const loadTopSuppliers = useCallback(async () => {
    if (!selectedBranch) return

    setLoadingTopSuppliers(true)
    try {
      const response = await getTopSuppliers(selectedBranch.id, 5, 12)
      setTopSuppliers(response)
    } catch (error) {
      console.error('Error loading top suppliers:', error)
    } finally {
      setLoadingTopSuppliers(false)
    }
  }, [selectedBranch])

  // Load suppliers when dependencies change
  useEffect(() => {
    if (selectedBranch) {
      loadSuppliers(1, itemsPerPage, debouncedSearchTerm)
      setCurrentPage(1)
    }
  }, [selectedBranch, itemsPerPage, debouncedSearchTerm, loadSuppliers])

  // Load top suppliers on mount
  useEffect(() => {
    if (selectedBranch) {
      loadTopSuppliers()
    }
  }, [selectedBranch, loadTopSuppliers])

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    loadSuppliers(newPage, itemsPerPage, debouncedSearchTerm)
  }

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete || !selectedBranch) return

    try {
      await deleteSupplier(supplierToDelete.id)
      toast.success('Pemasok berhasil dihapus')

      // Reload suppliers and top suppliers
      loadSuppliers(currentPage, itemsPerPage, debouncedSearchTerm)
      loadTopSuppliers()

      setSupplierToDelete(null)
    } catch (error) {
      console.error('Error deleting supplier:', error)
      toast.error('Gagal menghapus pemasok')
    }
  }

  const LoadingSkeleton = () => (
    <div className='space-y-3'>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className='flex items-center space-x-4'>
          <Skeleton className='h-12 w-12 rounded-full' />
          <div className='space-y-2'>
            <Skeleton className='h-4 w-[200px]' />
            <Skeleton className='h-4 w-[150px]' />
          </div>
        </div>
      ))}
    </div>
  )

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

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-6'>
          {/* Header */}
          <div className='flex items-center gap-3'>
            <Building2 className='h-7 w-7 text-primary' />
            <div className='flex-1'>
              <h1 className='text-xl md:text-2xl font-semibold font-headline'>
                Manajemen Pemasok
              </h1>
              <p className='text-sm text-muted-foreground'>
                Kelola data pemasok dan lihat statistik pembelian
              </p>
            </div>
            <Button asChild>
              <Link href='/suppliers/add'>
                <PlusCircle className='h-4 w-4 mr-2' />
                Tambah Pemasok
              </Link>
            </Button>
          </div>

          {/* Top Suppliers Stats */}
          <div className='grid gap-6 md:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle className='text-base font-semibold flex items-center gap-2'>
                  <Trophy className='h-5 w-5 text-amber-500' />
                  Pemasok Paling Sering Diorder
                </CardTitle>
                <CardDescription className='text-xs'>
                  5 pemasok dengan frekuensi order tertinggi
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTopSuppliers ? (
                  <LoadingSkeleton />
                ) : (
                  <div className='space-y-3'>
                    {topSuppliers?.most_frequent?.length ? (
                      topSuppliers.most_frequent.map((supplier, index) => (
                        <div
                          key={supplier.id}
                          className='flex items-center justify-between'
                        >
                          <div className='flex items-center gap-3'>
                            <div className='flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold'>
                              {index + 1}
                            </div>
                            <div>
                              <p className='font-medium'>{supplier.name}</p>
                              <p className='text-xs text-muted-foreground'>
                                {supplier.total_purchases} order
                              </p>
                            </div>
                          </div>
                          <Button variant='ghost' size='sm' asChild>
                            <Link href={`/suppliers/${supplier.id}`}>
                              <LucideEye className='h-4 w-4' />
                            </Link>
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className='text-sm text-muted-foreground text-center py-4'>
                        Belum ada data pemasok
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-base font-semibold flex items-center gap-2'>
                  <Star className='h-5 w-5 text-green-500' />
                  Pemasok Nilai Pembelian Tertinggi
                </CardTitle>
                <CardDescription className='text-xs'>
                  5 pemasok dengan nilai pembelian tertinggi
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTopSuppliers ? (
                  <LoadingSkeleton />
                ) : (
                  <div className='space-y-3'>
                    {topSuppliers?.highest_spending?.length ? (
                      topSuppliers.highest_spending.map((supplier, index) => (
                        <div
                          key={supplier.id}
                          className='flex items-center justify-between'
                        >
                          <div className='flex items-center gap-3'>
                            <div className='flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 text-sm font-semibold'>
                              {index + 1}
                            </div>
                            <div>
                              <p className='font-medium'>{supplier.name}</p>
                              <p className='text-xs text-muted-foreground'>
                                {formatCurrency(supplier.total_spent)}
                              </p>
                            </div>
                          </div>
                          <Button variant='ghost' size='sm' asChild>
                            <Link href={`/suppliers/${supplier.id}`}>
                              <LucideEye className='h-4 w-4' />
                            </Link>
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className='text-sm text-muted-foreground text-center py-4'>
                        Belum ada data pemasok
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Outstanding Payments Card */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base font-semibold flex items-center gap-2'>
                <CreditCard className='h-5 w-5 text-red-500' />
                Hutang ke Pemasok
              </CardTitle>
              <CardDescription className='text-xs'>
                Ringkasan hutang yang belum dibayar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid gap-4 md:grid-cols-3'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-red-100 rounded-full'>
                    <TrendingUp className='h-4 w-4 text-red-600' />
                  </div>
                  <div>
                    <p className='text-sm font-medium'>Total Hutang</p>
                    <p className='text-xs text-muted-foreground'>
                      Rp 0 {/* TODO: Calculate from backend */}
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-amber-100 rounded-full'>
                    <Building2 className='h-4 w-4 text-amber-600' />
                  </div>
                  <div>
                    <p className='text-sm font-medium'>Pemasok dgn Hutang</p>
                    <p className='text-xs text-muted-foreground'>
                      0 pemasok {/* TODO: Calculate from backend */}
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-blue-100 rounded-full'>
                    <CreditCard className='h-4 w-4 text-blue-600' />
                  </div>
                  <div>
                    <p className='text-sm font-medium'>Rata-rata Hutang</p>
                    <p className='text-xs text-muted-foreground'>
                      Rp 0 {/* TODO: Calculate from backend */}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base font-semibold'>
                Daftar Pemasok
              </CardTitle>
              <CardDescription className='text-xs'>
                Semua pemasok yang terdaftar di cabang ini
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex flex-col sm:flex-row gap-4 mb-6'>
                <div className='flex-1'>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                    <Input
                      type='text'
                      placeholder='Cari nama, kontak, atau email...'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className='pl-10'
                    />
                  </div>
                </div>
                <div className='flex gap-2'>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => setItemsPerPage(Number(value))}
                  >
                    <SelectTrigger className='w-32'>
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
              </div>

              {/* Suppliers Table */}
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pemasok</TableHead>
                      <TableHead>Kontak</TableHead>
                      <TableHead>Terdaftar</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className='text-right'>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingSuppliers ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div className='flex items-center space-x-3'>
                              <Skeleton className='h-10 w-10 rounded-full' />
                              <div className='space-y-2'>
                                <Skeleton className='h-4 w-32' />
                                <Skeleton className='h-3 w-24' />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Skeleton className='h-4 w-28' />
                          </TableCell>
                          <TableCell>
                            <Skeleton className='h-4 w-20' />
                          </TableCell>
                          <TableCell>
                            <Skeleton className='h-4 w-16' />
                          </TableCell>
                          <TableCell>
                            <Skeleton className='h-8 w-20 ml-auto' />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : suppliers.length > 0 ? (
                      suppliers.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell>
                            <div className='flex items-center space-x-3'>
                              <div className='w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center'>
                                <Building2 className='h-5 w-5 text-primary' />
                              </div>
                              <div>
                                <p className='font-medium'>{supplier.name}</p>
                                <p className='text-xs text-muted-foreground'>
                                  {supplier.contact_person ||
                                    'Tidak ada kontak person'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='space-y-1'>
                              {supplier.email && (
                                <div className='flex items-center gap-1 text-xs'>
                                  <Mail className='h-3 w-3' />
                                  <span>{supplier.email}</span>
                                </div>
                              )}
                              {supplier.phone && (
                                <div className='flex items-center gap-1 text-xs'>
                                  <Phone className='h-3 w-3' />
                                  <span>{supplier.phone}</span>
                                </div>
                              )}
                              {!supplier.email && !supplier.phone && (
                                <span className='text-xs text-muted-foreground'>
                                  Tidak ada kontak
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className='text-sm'>
                              {formatDateIntl(supplier.created_at)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                supplier.is_active !== false
                                  ? 'default'
                                  : 'secondary'
                              }
                              className='text-xs'
                            >
                              {supplier.is_active !== false
                                ? 'Aktif'
                                : 'Nonaktif'}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-right'>
                            <div className='flex items-center gap-1 justify-end'>
                              <Button variant='ghost' size='sm' asChild>
                                <Link href={`/suppliers/${supplier.id}`}>
                                  <LucideEye className='h-4 w-4' />
                                </Link>
                              </Button>
                              <Button variant='ghost' size='sm' asChild>
                                <Link href={`/suppliers/${supplier.id}/edit`}>
                                  <FilePenLine className='h-4 w-4' />
                                </Link>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() =>
                                      setSupplierToDelete(supplier)
                                    }
                                  >
                                    <Trash2 className='h-4 w-4' />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Hapus Pemasok
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Apakah Anda yakin ingin menghapus pemasok{' '}
                                      <strong>{supplier.name}</strong>? Tindakan
                                      ini tidak dapat dibatalkan.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={handleDeleteSupplier}
                                    >
                                      Hapus
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className='text-center py-8'>
                          <div className='flex flex-col items-center gap-2'>
                            <Building2 className='h-12 w-12 text-gray-400' />
                            <p className='text-sm text-muted-foreground'>
                              {searchTerm
                                ? 'Tidak ada pemasok yang ditemukan'
                                : 'Belum ada pemasok yang terdaftar'}
                            </p>
                            {!searchTerm && (
                              <Button asChild>
                                <Link href='/suppliers/add'>
                                  <PlusCircle className='h-4 w-4 mr-2' />
                                  Tambah Pemasok Pertama
                                </Link>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <>
                  <Separator className='my-4' />
                  <div className='flex items-center justify-between'>
                    <div className='text-sm text-muted-foreground'>
                      Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{' '}
                      {Math.min(currentPage * itemsPerPage, totalItems)} dari{' '}
                      {totalItems} pemasok
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={!hasPreviousPage}
                      >
                        <ChevronLeft className='h-4 w-4' />
                      </Button>
                      <span className='text-sm'>
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={!hasNextPage}
                      >
                        <ChevronRight className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
