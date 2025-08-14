'use client'
import React, { useEffect, useState } from 'react'
import MainLayout from '@/components/layout/main-layout'
import {
  listStockOpname,
  approveStockOpname,
  rejectStockOpname,
  getStockOpname,
} from '@/lib/laravel/stockOpname'
import { StockOpnameSession, STOCK_OPNAME_PAGE_SIZE_OPTIONS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  ShieldCheck,
  Loader2,
  Check,
  X,
  ClipboardCheck,
  Search,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

function useDebounce<T>(value: T, delay = 400) {
  const [d, setD] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setD(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return d
}

export default function AdminStockOpnameReviewPage() {
  const [sessions, setSessions] = useState<StockOpnameSession[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<StockOpnameSession | null>(null)
  const [reason, setReason] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('SUBMIT')
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState<number>(
    STOCK_OPNAME_PAGE_SIZE_OPTIONS[0]
  )
  const debouncedSearch = useDebounce(search)
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await listStockOpname({
        status: statusFilter as any,
        per_page: pageSize,
      })
      setSessions(
        data.filter(
          (s) =>
            !debouncedSearch ||
            s.code.toLowerCase().includes(debouncedSearch.toLowerCase())
        )
      )
    } catch (e: any) {
      toast.error('Gagal memuat', { description: e.message })
    }
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [statusFilter, pageSize, debouncedSearch])

  const selectSession = async (s: StockOpnameSession) => {
    try {
      const full = await getStockOpname(s.id)
      setSelected(full)
    } catch (e: any) {
      toast.error('Gagal memuat detail', { description: e.message })
    }
  }

  const doApprove = async () => {
    if (!selected) return
    setActionLoading(true)
    try {
      await approveStockOpname(selected.id)
      toast.success('Approved')
      setSelected(null)
      load()
    } catch (e: any) {
      toast.error('Gagal approve', { description: e.message })
    }
    setActionLoading(false)
    setConfirmApprove(false)
  }

  const doReject = async () => {
    if (!selected) return
    if (!reason.trim()) {
      toast.error('Masukkan alasan')
      return
    }
    setActionLoading(true)
    try {
      await rejectStockOpname(selected.id, reason)
      toast.success('Rejected')
      setReason('')
      setSelected(null)
      load()
    } catch (e: any) {
      toast.error('Gagal reject', { description: e.message })
    }
    setActionLoading(false)
    setConfirmReject(false)
  }

  return (
    <>
      <MainLayout>
        <div className='space-y-6'>
          <div className='flex items-center gap-3'>
            <ClipboardCheck className='h-6 w-6 text-primary' />
            <h1 className='text-xl font-semibold'>Review Stock Opname</h1>
          </div>
          <div className='grid md:grid-cols-5 gap-6'>
            <Card className='md:col-span-2'>
              <CardHeader className='py-3'>
                <CardTitle className='text-sm'>Sesi</CardTitle>
                <div className='flex flex-wrap gap-2 items-center'>
                  <Input
                    placeholder='Cari kode...'
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className='h-8 text-xs w-36'
                  />
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v)}
                  >
                    <SelectTrigger className='h-8 w-32 text-xs'>
                      <SelectValue placeholder='Status' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='SUBMIT'>SUBMIT</SelectItem>
                      <SelectItem value='all'>SEMUA</SelectItem>
                      <SelectItem value='DRAFT'>DRAFT</SelectItem>
                      <SelectItem value='APPROVED'>APPROVED</SelectItem>
                      <SelectItem value='REJECTED'>REJECTED</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => setPageSize(Number(v))}
                  >
                    <SelectTrigger className='h-8 w-24 text-xs'>
                      <SelectValue placeholder='Limit' />
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
                    size='sm'
                    className='h-8'
                    variant='outline'
                    onClick={load}
                    disabled={loading}
                  >
                    <Loader2 className='h-3 w-3 mr-1 animate-spin' />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className='p-0'>
                <div className='max-h-[520px] overflow-auto divide-y text-sm'>
                  {loading &&
                    [...Array(6)].map((_, i) => (
                      <div key={i} className='p-3 space-y-2'>
                        <Skeleton className='h-3 w-24' />
                        <Skeleton className='h-3 w-32' />
                      </div>
                    ))}
                  {!loading && sessions.length === 0 && (
                    <div className='p-6 text-center text-xs text-muted-foreground'>
                      Tidak ada sesi.
                    </div>
                  )}
                  {sessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => selectSession(s)}
                      className={`w-full text-left p-3 hover:bg-muted/50 ${
                        selected?.id === s.id ? 'bg-muted/70' : ''
                      }`}
                    >
                      <div className='flex justify-between items-center mb-1'>
                        <span className='font-medium text-xs'>{s.code}</span>
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
                          className='text-[9px]'
                        >
                          {s.status}
                        </Badge>
                      </div>
                      <div className='flex justify-between text-[10px] text-muted-foreground'>
                        <span>{s.total_items} item</span>
                        <span>
                          Diff:{' '}
                          {s.total_positive_adjustment -
                            s.total_negative_adjustment}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className='md:col-span-3'>
              <CardHeader className='py-3 flex flex-row justify-between items-center'>
                <div>
                  <CardTitle className='text-sm'>Detail</CardTitle>
                  <p className='text-[11px] text-muted-foreground'>
                    Approve akan langsung menyesuaikan stok produk.
                  </p>
                </div>
                {selected && selected.status === 'SUBMIT' && (
                  <div className='flex gap-2'>
                    <Button
                      size='sm'
                      variant='default'
                      className='h-8'
                      onClick={() => setConfirmApprove(true)}
                    >
                      <Check className='h-4 w-4 mr-1' />
                      Approve
                    </Button>
                    <Button
                      size='sm'
                      variant='destructive'
                      className='h-8'
                      onClick={() => setConfirmReject(true)}
                    >
                      <X className='h-4 w-4 mr-1' />
                      Reject
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className='space-y-4'>
                {!selected && (
                  <div className='text-xs text-muted-foreground'>
                    Pilih sesi untuk review.
                  </div>
                )}
                {selected && (
                  <>
                    <div className='text-xs grid grid-cols-2 gap-2'>
                      <div>
                        <span className='text-muted-foreground'>Kode:</span>{' '}
                        {selected.code}
                      </div>
                      <div>
                        <span className='text-muted-foreground'>Status:</span>{' '}
                        {selected.status}
                      </div>
                      <div>
                        <span className='text-muted-foreground'>Items:</span>{' '}
                        {selected.total_items}
                      </div>
                      <div>
                        <span className='text-muted-foreground'>Diff:</span>{' '}
                        {selected.total_positive_adjustment -
                          selected.total_negative_adjustment}
                      </div>
                    </div>
                    <div>
                      <p className='text-[11px] mb-1 font-medium'>Items</p>
                      <div className='border rounded overflow-hidden'>
                        <table className='w-full text-[11px]'>
                          <thead className='bg-muted/50'>
                            <tr className='text-left'>
                              <th className='px-2 py-1 font-medium'>Produk</th>
                              <th className='px-2 py-1 font-medium'>System</th>
                              <th className='px-2 py-1 font-medium'>Counted</th>
                              <th className='px-2 py-1 font-medium'>Diff</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selected.items?.map((i) => (
                              <tr key={i.id} className='border-t'>
                                <td className='px-2 py-1'>{i.product_name}</td>
                                <td className='px-2 py-1'>
                                  {i.system_quantity}
                                </td>
                                <td className='px-2 py-1'>
                                  {i.counted_quantity}
                                </td>
                                <td className='px-2 py-1'>{i.difference}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {selected.status === 'SUBMIT' && (
                      <div>
                        <Textarea
                          placeholder='Alasan reject (wajib jika reject)'
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className='text-xs min-h-[60px]'
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
      <ConfirmDialog
        open={confirmApprove}
        onOpenChange={setConfirmApprove}
        title='Approve Sesi?'
        description='Stok produk akan disesuaikan sesuai perbedaan counted vs system.'
        confirmText='Approve'
        loading={actionLoading}
        onConfirm={doApprove}
      />
      <ConfirmDialog
        open={confirmReject}
        onOpenChange={setConfirmReject}
        title='Reject Sesi?'
        description='Sesi akan ditandai REJECTED dan tidak akan mengubah stok.'
        confirmText='Reject'
        variant='destructive'
        loading={actionLoading}
        onConfirm={doReject}
      />
    </>
  )
}
