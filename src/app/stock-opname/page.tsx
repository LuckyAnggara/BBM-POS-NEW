'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plus,
  Loader2,
  ClipboardList,
  RefreshCw,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react'
import {
  listStockOpname,
  createStockOpname,
  exportCsvUrl,
  StockOpnamePaginatedResponse,
} from '@/lib/laravel/stockOpname'
import {
  StockOpnameSession,
  StockOpnameStatus,
  STOCK_OPNAME_PAGE_SIZE_OPTIONS,
} from '@/lib/types'
import { useDebounce } from '@uidotdev/usehooks'
import { toast } from 'sonner'
import Link from 'next/link'

const statusColors: Record<StockOpnameStatus, string> = {
  DRAFT: 'bg-gray-200 text-gray-700',
  SUBMIT: 'bg-amber-200 text-amber-700',
  APPROVED: 'bg-green-200 text-green-700',
  REJECTED: 'bg-red-200 text-red-700',
}

export default function StockOpnameListPage() {
  const router = useRouter()
  const [paginatedData, setPaginatedData] =
    useState<StockOpnamePaginatedResponse>({
      data: [],
      total: 0,
      per_page: STOCK_OPNAME_PAGE_SIZE_OPTIONS[0],
      current_page: 1,
      last_page: 1,
      next_page_url: null,
      prev_page_url: null,
    })
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    STOCK_OPNAME_PAGE_SIZE_OPTIONS[0]
  )
  const debouncedSearch = useDebounce(search, 1000)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listStockOpname({
        status: statusFilter as any,
        per_page: itemsPerPage,
        page: currentPage,
        search: debouncedSearch || undefined,
      })
      setPaginatedData(data)
    } catch (e: any) {
      toast.error('Gagal memuat sesi opname', { description: e.message })
    }
    setLoading(false)
  }, [statusFilter, itemsPerPage, currentPage, debouncedSearch])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, itemsPerPage, debouncedSearch])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const session = await createStockOpname({})
      toast.success('Draft dibuat')
      // Navigate to the detail page
      router.push(`/stock-opname/${session.id}`)
    } catch (e: any) {
      toast.error('Gagal membuat draft', { description: e.message })
    }
    setCreating(false)
  }

  const handleNextPage = () => {
    if (currentPage < paginatedData.last_page) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  return (
    <MainLayout>
      <div className='space-y-4'>
        <div className='flex flex-col sm:flex-row justify-between items-center gap-3'>
          <h1 className='text-xl md:text-2xl font-semibold font-headline'>
            Stock Opname
          </h1>
          <div className='flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end'>
            <div className='relative flex-grow sm:flex-grow-0'>
              <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
              <Input
                type='search'
                placeholder='Cari kode sesi...'
                className='pl-8 w-full sm:w-80 rounded-md h-9 text-xs'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v)}
            >
              <SelectTrigger className='h-9 text-xs rounded-md w-auto sm:w-[120px]'>
                <SelectValue placeholder='Status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Semua</SelectItem>
                <SelectItem value='DRAFT'>Draft</SelectItem>
                <SelectItem value='SUBMIT'>Submit</SelectItem>
                <SelectItem value='APPROVED'>Approved</SelectItem>
                <SelectItem value='REJECTED'>Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={String(itemsPerPage)}
              onValueChange={(v) => setItemsPerPage(Number(v))}
            >
              <SelectTrigger className='h-9 text-xs rounded-md w-auto sm:w-[100px]'>
                <SelectValue placeholder='Tampil' />
              </SelectTrigger>
              <SelectContent>
                {STOCK_OPNAME_PAGE_SIZE_OPTIONS.map((o) => (
                  <SelectItem key={o} value={String(o)}>
                    {o}/hal
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant='outline'
              size='sm'
              className='rounded-md text-xs h-9'
              onClick={load}
              disabled={loading}
            >
              <RefreshCw className='mr-1.5 h-3.5 w-3.5' /> Refresh
            </Button>
            <Button
              size='sm'
              className='rounded-md text-xs h-9'
              onClick={handleCreate}
              disabled={creating}
            >
              <Plus className='mr-1.5 h-3.5 w-3.5' /> Draft
            </Button>
          </div>
        </div>

        <Alert
          variant='default'
          className='bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700/50 dark:text-blue-300 text-xs'
        >
          <Info className='h-4 w-4 !text-blue-600 dark:!text-blue-400' />
          <AlertDescription>
            Stock Opname digunakan untuk mencocokkan jumlah fisik dengan sistem.
            Draft dapat diedit, setelah submit hanya admin yang dapat
            approve/reject.
          </AlertDescription>
        </Alert>
        {loading ? (
          <div className='space-y-2 border rounded-lg shadow-sm p-4'>
            {[...Array(itemsPerPage)].map((_, i) => (
              <Skeleton key={i} className='h-10 w-full' />
            ))}
          </div>
        ) : paginatedData.data.length === 0 && debouncedSearch ? (
          <div className='border rounded-lg shadow-sm overflow-hidden p-10 text-center'>
            <p className='text-sm text-muted-foreground'>
              Tidak ada sesi yang cocok dengan pencarian Anda.
            </p>
          </div>
        ) : paginatedData.data.length === 0 ? (
          <div className='border rounded-lg shadow-sm overflow-hidden p-10 text-center'>
            <p className='text-sm text-muted-foreground'>
              Belum ada sesi stock opname.
            </p>
            <Button
              size='sm'
              className='mt-4 text-xs'
              onClick={handleCreate}
              disabled={creating}
            >
              <Plus className='mr-1.5 h-3.5 w-3.5' /> Buat Sesi Pertama
            </Button>
          </div>
        ) : (
          <>
            <div className='border rounded-lg shadow-sm overflow-hidden'>
              <Table>
                <TableHeader>
                  <TableRow className='text-xs text-left'>
                    <TableHead className='px-3 py-2 font-medium'>
                      Kode
                    </TableHead>
                    <TableHead className='px-3 py-2 font-medium'>
                      Status
                    </TableHead>
                    <TableHead className='px-3 py-2 font-medium'>
                      Items
                    </TableHead>
                    <TableHead className='px-3 py-2 font-medium'>+/-</TableHead>
                    <TableHead className='px-3 py-2 font-medium'>
                      Dibuat
                    </TableHead>
                    <TableHead className='px-3 py-2 font-medium'>
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.data.map((s: StockOpnameSession) => (
                    <TableRow key={s.id} className='hover:bg-muted/30'>
                      <TableCell className='px-3 py-2 font-medium'>
                        <Link
                          href={`/stock-opname/${s.id}`}
                          className='hover:underline'
                        >
                          {s.code}
                        </Link>
                      </TableCell>
                      <TableCell className='px-3 py-2'>
                        <Badge
                          variant={
                            s.status === 'APPROVED'
                              ? 'default'
                              : s.status === 'REJECTED'
                              ? 'destructive'
                              : s.status === 'SUBMIT'
                              ? 'secondary'
                              : 'outline'
                          }
                          className='text-[10px] px-2 py-0.5'
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className='px-3 py-2'>
                        {s.total_items}
                      </TableCell>
                      <TableCell className='px-3 py-2'>
                        {s.total_positive_adjustment -
                          s.total_negative_adjustment}
                      </TableCell>
                      <TableCell className='px-3 py-2'>
                        {new Date(s.created_at).toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className='px-3 py-2'>
                        <div className='flex gap-2'>
                          <Button asChild size='sm' variant='outline'>
                            <a
                              href={exportCsvUrl(s.id)}
                              target='_blank'
                              rel='noopener'
                            >
                              <Download className='h-4 w-4' />
                            </a>
                          </Button>
                          <Button asChild size='sm' variant='secondary'>
                            <Link href={`/stock-opname/${s.id}`}>Detail</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className='flex justify-between items-center pt-2'>
              <Button
                variant='outline'
                size='sm'
                className='text-xs h-8'
                onClick={handlePrevPage}
                disabled={currentPage <= 1 || loading}
              >
                <ChevronLeft className='mr-1 h-4 w-4' /> Sebelumnya
              </Button>
              <span className='text-xs text-muted-foreground'>
                Halaman {currentPage} dari {paginatedData.last_page}
              </span>
              <Button
                variant='outline'
                size='sm'
                className='text-xs h-8'
                onClick={handleNextPage}
                disabled={currentPage >= paginatedData.last_page || loading}
              >
                Berikutnya <ChevronRight className='ml-1 h-4 w-4' />
              </Button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}
