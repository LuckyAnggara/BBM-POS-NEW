'use client'
import React, { useEffect, useState } from 'react'
import MainLayout from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Plus,
  Loader2,
  ClipboardList,
  RefreshCw,
  Filter,
  Download,
} from 'lucide-react'
import {
  listStockOpname,
  createStockOpname,
  exportCsvUrl,
} from '@/lib/laravel/stockOpname'
import {
  StockOpnameSession,
  StockOpnameStatus,
  STOCK_OPNAME_PAGE_SIZE_OPTIONS,
} from '@/lib/types'
// local simple debounce hook
function useDebounce<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}
import { toast } from 'sonner'
import Link from 'next/link'

const statusColors: Record<StockOpnameStatus, string> = {
  DRAFT: 'bg-gray-200 text-gray-700',
  SUBMIT: 'bg-amber-200 text-amber-700',
  APPROVED: 'bg-green-200 text-green-700',
  REJECTED: 'bg-red-200 text-red-700',
}

export default function StockOpnameListPage() {
  const [sessions, setSessions] = useState<StockOpnameSession[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState<number>(
    STOCK_OPNAME_PAGE_SIZE_OPTIONS[0]
  )
  const debouncedSearch = useDebounce(search, 500)

  const load = async () => {
    setLoading(true)
    try {
      const data = await listStockOpname({
        status: statusFilter as any,
        per_page: pageSize,
      })
      setSessions(data)
    } catch (e: any) {
      toast.error('Gagal memuat sesi opname', { description: e.message })
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [statusFilter, pageSize])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const session = await createStockOpname({})
      toast.success('Draft dibuat')
      load()
    } catch (e: any) {
      toast.error('Gagal membuat draft', { description: e.message })
    }
    setCreating(false)
  }

  const filtered = sessions.filter(
    (s) =>
      !debouncedSearch ||
      s.code.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  return (
    <MainLayout>
      <div className='space-y-6'>
        <div className='flex items-center gap-3'>
          <ClipboardList className='h-6 w-6 text-primary' />
          <h1 className='text-xl font-semibold'>Stock Opname</h1>
        </div>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between py-4'>
            <CardTitle className='text-base'>Daftar Sesi</CardTitle>
            <div className='flex gap-2'>
              <Input
                placeholder='Cari kode...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='h-8 w-48 text-sm'
              />
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v)}
              >
                <SelectTrigger className='h-8 w-36 text-sm'>
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
                value={String(pageSize)}
                onValueChange={(v) => setPageSize(Number(v))}
              >
                <SelectTrigger className='h-8 w-28 text-sm'>
                  <SelectValue placeholder='Per Hal' />
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
                onClick={load}
                disabled={loading}
              >
                <RefreshCw className='h-4 w-4' />
              </Button>
              <Button size='sm' onClick={handleCreate} disabled={creating}>
                <Plus className='h-4 w-4 mr-1' />
                Draft
              </Button>
            </div>
          </CardHeader>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead className='bg-muted/50'>
                  <tr className='text-xs text-left'>
                    <th className='px-3 py-2 font-medium'>Kode</th>
                    <th className='px-3 py-2 font-medium'>Status</th>
                    <th className='px-3 py-2 font-medium'>Items</th>
                    <th className='px-3 py-2 font-medium'>+/-</th>
                    <th className='px-3 py-2 font-medium'>Dibuat</th>
                    <th className='px-3 py-2 font-medium'>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading &&
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className='border-t'>
                        <td className='px-3 py-2'>
                          <Skeleton className='h-4 w-24' />
                        </td>
                        <td className='px-3 py-2'>
                          <Skeleton className='h-4 w-16' />
                        </td>
                        <td className='px-3 py-2'>
                          <Skeleton className='h-4 w-10' />
                        </td>
                        <td className='px-3 py-2'>
                          <Skeleton className='h-4 w-10' />
                        </td>
                        <td className='px-3 py-2'>
                          <Skeleton className='h-4 w-32' />
                        </td>
                        <td className='px-3 py-2'>
                          <Skeleton className='h-7 w-24' />
                        </td>
                      </tr>
                    ))}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className='px-3 py-10 text-center'>
                        <div className='flex flex-col items-center gap-2 text-muted-foreground'>
                          <ClipboardList className='h-6 w-6 opacity-40' />
                          <div className='text-sm font-medium'>
                            Belum ada sesi
                          </div>
                          <div className='text-[11px]'>
                            Buat draft baru untuk memulai stock opname.
                          </div>
                          <Button
                            size='sm'
                            onClick={handleCreate}
                            disabled={creating}
                          >
                            Buat Draft
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {filtered.map((s) => (
                    <tr key={s.id} className='border-t hover:bg-muted/30'>
                      <td className='px-3 py-2 font-medium'>
                        <Link
                          href={`/stock-opname/${s.id}`}
                          className='hover:underline'
                        >
                          {s.code}
                        </Link>
                      </td>
                      <td className='px-3 py-2'>
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
                      </td>
                      <td className='px-3 py-2'>{s.total_items}</td>
                      <td className='px-3 py-2'>
                        {s.total_positive_adjustment -
                          s.total_negative_adjustment}
                      </td>
                      <td className='px-3 py-2'>
                        {new Date(s.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className='px-3 py-2'>
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
