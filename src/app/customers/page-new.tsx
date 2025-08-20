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
  Users,
  Mail,
  Phone,
  MapPin,
  Trophy,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ITEMS_PER_PAGE_OPTIONS, type Customer } from '@/lib/types'
import {
  listCustomers,
  deleteCustomer,
  getTopCustomers,
  type TopCustomersResponse,
} from '@/lib/laravel/customers'
import { formatDateIntl, formatCurrency } from '@/lib/helper'

export default function CustomersPage() {
  const { selectedBranch } = useBranches()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
    null
  )
  const [topCustomers, setTopCustomers] = useState<TopCustomersResponse | null>(
    null
  )
  const [loadingTopCustomers, setLoadingTopCustomers] = useState(true)

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

  const loadCustomers = useCallback(
    async (page = 1, limit = itemsPerPage, searchTerm = '') => {
      if (!selectedBranch) return

      setLoadingCustomers(true)
      try {
        const response = await listCustomers({
          branchId: selectedBranch.id,
          page,
          limit,
          searchTerm,
        })

        setCustomers(response.data)
        setTotalItems(response.total)
        setCurrentPage(response.current_page)
      } catch (error) {
        console.error('Error loading customers:', error)
        toast.error('Gagal memuat data pelanggan')
      } finally {
        setLoadingCustomers(false)
      }
    },
    [selectedBranch, itemsPerPage]
  )

  const loadTopCustomers = useCallback(async () => {
    if (!selectedBranch) return

    setLoadingTopCustomers(true)
    try {
      const response = await getTopCustomers(selectedBranch.id, 5, 12)
      setTopCustomers(response)
    } catch (error) {
      console.error('Error loading top customers:', error)
    } finally {
      setLoadingTopCustomers(false)
    }
  }, [selectedBranch])

  // Load customers when dependencies change
  useEffect(() => {
    if (selectedBranch) {
      loadCustomers(1, itemsPerPage, debouncedSearchTerm)
      setCurrentPage(1)
    }
  }, [selectedBranch, itemsPerPage, debouncedSearchTerm, loadCustomers])

  // Load top customers on mount
  useEffect(() => {
    if (selectedBranch) {
      loadTopCustomers()
    }
  }, [selectedBranch, loadTopCustomers])

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    loadCustomers(newPage, itemsPerPage, debouncedSearchTerm)
  }

  const handleDeleteCustomer = async () => {
    if (!customerToDelete || !selectedBranch) return

    try {
      await deleteCustomer(customerToDelete.id)
      toast.success('Pelanggan berhasil dihapus')

      // Reload customers and top customers
      loadCustomers(currentPage, itemsPerPage, debouncedSearchTerm)
      loadTopCustomers()

      setCustomerToDelete(null)
    } catch (error) {
      console.error('Error deleting customer:', error)
      toast.error('Gagal menghapus pelanggan')
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
          <Users className='h-16 w-16 text-primary animate-pulse mb-4' />
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
            <Users className='h-7 w-7 text-primary' />
            <div className='flex-1'>
              <h1 className='text-xl md:text-2xl font-semibold font-headline'>
                Manajemen Pelanggan
              </h1>
              <p className='text-sm text-muted-foreground'>
                Kelola data pelanggan dan lihat statistik pembelian
              </p>
            </div>
            <Button asChild>
              <Link href='/customers/add'>
                <PlusCircle className='h-4 w-4 mr-2' />
                Tambah Pelanggan
              </Link>
            </Button>
          </div>

          {/* Top Customers Stats */}
          <div className='grid gap-6 md:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle className='text-base font-semibold flex items-center gap-2'>
                  <Trophy className='h-5 w-5 text-amber-500' />
                  Pelanggan Paling Sering Belanja
                </CardTitle>
                <CardDescription className='text-xs'>
                  5 pelanggan dengan frekuensi belanja tertinggi
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTopCustomers ? (
                  <LoadingSkeleton />
                ) : (
                  <div className='space-y-3'>
                    {topCustomers?.most_frequent?.length ? (
                      topCustomers.most_frequent.map((customer, index) => (
                        <div
                          key={customer.id}
                          className='flex items-center justify-between'
                        >
                          <div className='flex items-center gap-3'>
                            <div className='flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold'>
                              {index + 1}
                            </div>
                            <div>
                              <p className='font-medium'>{customer.name}</p>
                              <p className='text-xs text-muted-foreground'>
                                {customer.total_purchases} transaksi
                              </p>
                            </div>
                          </div>
                          <Button variant='ghost' size='sm' asChild>
                            <Link href={`/customers/${customer.id}`}>
                              <LucideEye className='h-4 w-4' />
                            </Link>
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className='text-sm text-muted-foreground text-center py-4'>
                        Belum ada data pelanggan
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
                  Pelanggan Paling Banyak Belanja
                </CardTitle>
                <CardDescription className='text-xs'>
                  5 pelanggan dengan nilai belanja tertinggi
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTopCustomers ? (
                  <LoadingSkeleton />
                ) : (
                  <div className='space-y-3'>
                    {topCustomers?.highest_spending?.length ? (
                      topCustomers.highest_spending.map((customer, index) => (
                        <div
                          key={customer.id}
                          className='flex items-center justify-between'
                        >
                          <div className='flex items-center gap-3'>
                            <div className='flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 text-sm font-semibold'>
                              {index + 1}
                            </div>
                            <div>
                              <p className='font-medium'>{customer.name}</p>
                              <p className='text-xs text-muted-foreground'>
                                {formatCurrency(customer.total_spent)}
                              </p>
                            </div>
                          </div>
                          <Button variant='ghost' size='sm' asChild>
                            <Link href={`/customers/${customer.id}`}>
                              <LucideEye className='h-4 w-4' />
                            </Link>
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className='text-sm text-muted-foreground text-center py-4'>
                        Belum ada data pelanggan
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base font-semibold'>
                Daftar Pelanggan
              </CardTitle>
              <CardDescription className='text-xs'>
                Semua pelanggan yang terdaftar di cabang ini
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex flex-col sm:flex-row gap-4 mb-6'>
                <div className='flex-1'>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                    <Input
                      type='text'
                      placeholder='Cari nama, email, atau telepon...'
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

              {/* Customers Table */}
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pelanggan</TableHead>
                      <TableHead>Kontak</TableHead>
                      <TableHead>Bergabung</TableHead>
                      <TableHead>Alamat</TableHead>
                      <TableHead className='text-right'>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingCustomers ? (
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
                            <Skeleton className='h-4 w-36' />
                          </TableCell>
                          <TableCell>
                            <Skeleton className='h-8 w-20 ml-auto' />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : customers.length > 0 ? (
                      customers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div className='flex items-center space-x-3'>
                              <div className='w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center'>
                                <Users className='h-5 w-5 text-primary' />
                              </div>
                              <div>
                                <p className='font-medium'>{customer.name}</p>
                                <p className='text-xs text-muted-foreground'>
                                  ID: {customer.id}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='space-y-1'>
                              {customer.email && (
                                <div className='flex items-center gap-1 text-xs'>
                                  <Mail className='h-3 w-3' />
                                  <span>{customer.email}</span>
                                </div>
                              )}
                              {customer.phone && (
                                <div className='flex items-center gap-1 text-xs'>
                                  <Phone className='h-3 w-3' />
                                  <span>{customer.phone}</span>
                                </div>
                              )}
                              {!customer.email && !customer.phone && (
                                <span className='text-xs text-muted-foreground'>
                                  Tidak ada kontak
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className='text-sm'>
                              {formatDateIntl(customer.created_at)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {customer.address ? (
                              <div className='flex items-start gap-1 text-xs'>
                                <MapPin className='h-3 w-3 mt-0.5 flex-shrink-0' />
                                <span className='line-clamp-2'>
                                  {customer.address}
                                </span>
                              </div>
                            ) : (
                              <span className='text-xs text-muted-foreground'>
                                Tidak ada alamat
                              </span>
                            )}
                          </TableCell>
                          <TableCell className='text-right'>
                            <div className='flex items-center gap-1 justify-end'>
                              <Button variant='ghost' size='sm' asChild>
                                <Link href={`/customers/${customer.id}`}>
                                  <LucideEye className='h-4 w-4' />
                                </Link>
                              </Button>
                              <Button variant='ghost' size='sm' asChild>
                                <Link href={`/customers/${customer.id}/edit`}>
                                  <FilePenLine className='h-4 w-4' />
                                </Link>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() =>
                                      setCustomerToDelete(customer)
                                    }
                                  >
                                    <Trash2 className='h-4 w-4' />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Hapus Pelanggan
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Apakah Anda yakin ingin menghapus
                                      pelanggan <strong>{customer.name}</strong>
                                      ? Tindakan ini tidak dapat dibatalkan.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={handleDeleteCustomer}
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
                            <Users className='h-12 w-12 text-gray-400' />
                            <p className='text-sm text-muted-foreground'>
                              {searchTerm
                                ? 'Tidak ada pelanggan yang ditemukan'
                                : 'Belum ada pelanggan yang terdaftar'}
                            </p>
                            {!searchTerm && (
                              <Button asChild>
                                <Link href='/customers/add'>
                                  <PlusCircle className='h-4 w-4 mr-2' />
                                  Tambah Pelanggan Pertama
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
                      {totalItems} pelanggan
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
