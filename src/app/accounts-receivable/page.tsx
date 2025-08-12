'use client'

import React, { useState, useEffect, useCallback } from 'react'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/auth-context'
import { useBranches } from '@/contexts/branch-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  PlusCircle,
  Search,
  Eye,
  DollarSign,
  CalendarIcon,
  Filter,
  FilterX,
  Info,
} from 'lucide-react'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import type { Sale, PaymentStatus } from '@/lib/types'
import {
  listReceivables,
  createCustomerPayment,
  updateCustomerPayment,
  getSaleById,
  type CreateCustomerPaymentPayload,
} from '@/lib/laravel/saleService'
import Link from 'next/link'
import { format, isBefore, startOfDay } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'

const paymentFormSchema = z.object({
  paymentDate: z.date({ required_error: 'Tanggal pembayaran harus diisi.' }),
  amountPaid: z.coerce
    .number()
    .positive({ message: 'Jumlah bayar harus lebih dari 0.' }),
  paymentMethod: z.enum(['cash', 'transfer', 'card', 'other'], {
    required_error: 'Metode pembayaran harus dipilih.',
  }),
  notes: z.string().optional(),
})

type PaymentFormValues = z.infer<typeof paymentFormSchema>

export default function AccountsReceivablePage() {
  const { currentUser } = useAuth()
  const { selectedBranch } = useBranches()
  const { toast } = useToast()

  const [receivables, setReceivables] = useState<Sale[]>([])
  const [filteredReceivables, setFilteredReceivables] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Sale | null>(
    null
  )
  const [editingPaymentIdx, setEditingPaymentIdx] = useState<number | null>(
    null
  )

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    PaymentStatus | 'all' | 'overdue'
  >('all')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [limit, setLimit] = useState<number>(50)

  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      paymentDate: new Date(),
      amountPaid: 0,
      paymentMethod: 'cash',
      notes: '',
    },
  })

  const fetchReceivables = useCallback(async () => {
    if (!selectedBranch) {
      setReceivables([])
      setFilteredReceivables([])
      setLoading(false)
      return
    }
    setLoading(true)
    const res = await listReceivables({
      branchId: selectedBranch.id,
      limit,
      page: 1,
      status: 'all',
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
    })
    setReceivables(res.data)
    setLoading(false)
  }, [selectedBranch, startDate, endDate, limit])

  useEffect(() => {
    fetchReceivables()
  }, [fetchReceivables])

  useEffect(() => {
    let filtered = receivables
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        filtered = filtered.filter((r) => {
          if (!r.credit_due_date) return false
          const due = new Date(r.credit_due_date)
          return (
            isBefore(due, startOfDay(new Date())) &&
            r.payment_status !== 'paid' &&
            r.status !== 'returned'
          )
        })
      } else {
        filtered = filtered.filter((r) => r.payment_status === statusFilter)
      }
    }
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.transaction_number.toLowerCase().includes(lowerSearchTerm) ||
          (r.customer_name || '').toLowerCase().includes(lowerSearchTerm)
      )
    }
    setFilteredReceivables(filtered)
  }, [receivables, statusFilter, searchTerm])

  const handleOpenPaymentDialog = async (transaction: Sale) => {
    // Fetch latest sale including payments
    const full = await getSaleById(transaction.id)
    setSelectedTransaction(full || transaction)
    paymentForm.reset({
      paymentDate: new Date(),
      amountPaid:
        (full?.outstanding_amount ?? transaction.outstanding_amount) || 0,
      paymentMethod: 'cash',
      notes: '',
    })
    setIsPaymentDialogOpen(true)
    setEditingPaymentIdx(null)
  }

  const onSubmitPayment: SubmitHandler<PaymentFormValues> = async (values) => {
    if (!selectedTransaction || !currentUser) {
      toast({
        title: 'Error',
        description: 'Transaksi atau pengguna tidak valid.',
        variant: 'destructive',
      })
      return
    }
    if (
      values.amountPaid >
      ((selectedTransaction.outstanding_amount as number) || 0)
    ) {
      toast({
        title: 'Jumlah Tidak Valid',
        description: 'Jumlah bayar melebihi sisa tagihan.',
        variant: 'destructive',
      })
      paymentForm.setError('amountPaid', {
        type: 'manual',
        message: 'Jumlah bayar melebihi sisa tagihan.',
      })
      return
    }

    try {
      if (
        editingPaymentIdx !== null &&
        selectedTransaction?.customer_payments
      ) {
        const payment = selectedTransaction.customer_payments[editingPaymentIdx]
        await updateCustomerPayment(payment.id, {
          payment_date: values.paymentDate.toISOString().slice(0, 10),
          amount_paid: values.amountPaid,
          payment_method:
            values.paymentMethod === 'other'
              ? 'cash'
              : (values.paymentMethod as any),
          notes: values.notes,
        })
        toast({ title: 'Pembayaran diperbarui' })
      } else {
        const payload: CreateCustomerPaymentPayload = {
          sale_id: selectedTransaction.id,
          payment_date: values.paymentDate.toISOString().slice(0, 10), // YYYY-MM-DD
          amount_paid: values.amountPaid,
          payment_method:
            values.paymentMethod === 'other'
              ? 'cash'
              : (values.paymentMethod as any),
          notes: values.notes,
        }
        await createCustomerPayment(payload)
        toast({
          title: 'Pembayaran Dicatat',
          description: `Pembayaran untuk transaksi ${selectedTransaction.transaction_number} berhasil dicatat.`,
        })
      }
      setIsPaymentDialogOpen(false)
      await fetchReceivables()
    } catch (e: any) {
      toast({
        title: 'Gagal Mencatat Pembayaran',
        description: e?.response?.data?.message || 'Terjadi kesalahan.',
        variant: 'destructive',
      })
    }
  }

  const formatDateIntl = (dateStr?: string, includeTime = false) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return format(date, includeTime ? 'dd MMM yyyy, HH:mm' : 'dd MMM yyyy')
  }

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'N/A'
    return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString(
      'id-ID'
    )}`
  }

  const getStatusBadge = (
    status: PaymentStatus | undefined,
    dueDate?: string | null
  ) => {
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' =
      'secondary'
    let text = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'N/A'

    if (status === 'paid') {
      variant = 'default'
      text = 'Lunas'
    } else if (status === 'unpaid') {
      variant = 'destructive'
      text = 'Belum Lunas'
    } else if (status === 'partially_paid') {
      variant = 'outline'
      text = 'Lunas Sebagian'
    } else if (status === 'returned') {
      variant = 'secondary'
      text = 'Diretur'
    }

    if (
      dueDate &&
      (status === 'unpaid' || status === 'partially_paid') &&
      isBefore(new Date(dueDate), startOfDay(new Date()))
    ) {
      variant = 'destructive'
      text = 'Jatuh Tempo'
    }
    return (
      <Badge
        variant={variant}
        className={cn(
          variant === 'default' && 'bg-green-600 hover:bg-green-700 text-white',
          variant === 'outline' && 'border-yellow-500 text-yellow-600'
        )}
      >
        {text}
      </Badge>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-4'>
          <div className='flex flex-col sm:flex-row justify-between items-center gap-3'>
            <h1 className='text-xl md:text-2xl font-semibold font-headline'>
              Piutang Usaha {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
          </div>

          <Card>
            <CardHeader className='p-3 pb-2'>
              <CardTitle className='text-base'>Filter Piutang</CardTitle>
            </CardHeader>
            <CardContent className='p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 items-end'>
              <div>
                <Label htmlFor='searchTermAR' className='text-xs'>
                  Cari Invoice/Pelanggan
                </Label>
                <Input
                  id='searchTermAR'
                  type='search'
                  placeholder='Ketik untuk mencari...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='h-8 text-xs mt-0.5'
                  disabled={!selectedBranch || loading}
                />
              </div>
              <div>
                <Label className='text-xs'>Tanggal Awal</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      className='h-8 text-xs mt-0.5 w-full'
                    >
                      <CalendarIcon className='mr-1.5 h-3.5 w-3.5' />
                      {startDate
                        ? format(startDate, 'dd MMM yyyy')
                        : 'Pilih tanggal'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0'>
                    <Calendar
                      mode='single'
                      selected={startDate ?? undefined}
                      onSelect={(d) => setStartDate(d ?? null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className='text-xs'>Tanggal Akhir</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      className='h-8 text-xs mt-0.5 w-full'
                    >
                      <CalendarIcon className='mr-1.5 h-3.5 w-3.5' />
                      {endDate
                        ? format(endDate, 'dd MMM yyyy')
                        : 'Pilih tanggal'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0'>
                    <Calendar
                      mode='single'
                      selected={endDate ?? undefined}
                      onSelect={(d) => setEndDate(d ?? null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor='statusFilter' className='text-xs'>
                  Status Pembayaran
                </Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as PaymentStatus | 'all')
                  }
                  disabled={!selectedBranch || loading}
                >
                  <SelectTrigger className='h-8 text-xs mt-0.5'>
                    <SelectValue placeholder='Semua Status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all' className='text-xs'>
                      Semua Status
                    </SelectItem>
                    <SelectItem value='unpaid' className='text-xs'>
                      Belum Lunas
                    </SelectItem>
                    <SelectItem value='partially_paid' className='text-xs'>
                      Lunas Sebagian
                    </SelectItem>
                    <SelectItem value='paid' className='text-xs'>
                      Lunas
                    </SelectItem>
                    <SelectItem value='overdue' className='text-xs'>
                      Jatuh Tempo
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className='text-xs'>Baris per Halaman</Label>
                <Select
                  value={String(limit)}
                  onValueChange={(v) => setLimit(parseInt(v))}
                >
                  <SelectTrigger className='h-8 text-xs mt-0.5'>
                    <SelectValue placeholder='Per halaman' />
                  </SelectTrigger>
                  <SelectContent>
                    {[25, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)} className='text-xs'>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setStartDate(null)
                  setEndDate(null)
                }}
                variant='outline'
                size='sm'
                className='h-8 text-xs'
              >
                <FilterX className='mr-1.5 h-3.5 w-3.5' /> Reset Filter
              </Button>
            </CardContent>
          </Card>

          {loading ? (
            <div className='space-y-2 border rounded-lg shadow-sm p-4'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
            </div>
          ) : !selectedBranch ? (
            <div className='border rounded-lg shadow-sm overflow-hidden p-10 text-center'>
              <p className='text-sm text-muted-foreground'>
                Pilih cabang untuk mengelola piutang.
              </p>
            </div>
          ) : filteredReceivables.length === 0 ? (
            <div className='border rounded-lg shadow-sm overflow-hidden p-10 text-center'>
              <p className='text-sm text-muted-foreground'>
                {receivables.length === 0
                  ? 'Belum ada data piutang untuk cabang ini.'
                  : 'Tidak ada piutang yang cocok dengan filter Anda.'}
              </p>
            </div>
          ) : (
            <div className='border rounded-lg shadow-sm overflow-hidden'>
              <Table>
                <TableCaption className='text-xs'>
                  Daftar piutang usaha untuk{' '}
                  {selectedBranch?.name || 'cabang terpilih'}.
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-xs'>No. Invoice</TableHead>
                    <TableHead className='text-xs hidden sm:table-cell'>
                      Pelanggan
                    </TableHead>
                    <TableHead className='text-xs'>Tgl Transaksi</TableHead>
                    <TableHead className='text-xs hidden md:table-cell'>
                      Jatuh Tempo
                    </TableHead>
                    <TableHead className='text-xs text-right'>
                      Total Tagihan
                    </TableHead>
                    <TableHead className='text-xs text-right'>
                      Sisa Tagihan
                    </TableHead>
                    <TableHead className='text-xs text-center'>
                      Status
                    </TableHead>
                    <TableHead className='text-center text-xs'>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceivables.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className='py-2 text-xs font-medium'>
                        {tx.transaction_number}
                      </TableCell>
                      <TableCell className='py-2 text-xs hidden sm:table-cell'>
                        {tx.customer_name || '-'}
                      </TableCell>
                      <TableCell className='py-2 text-xs'>
                        {formatDateIntl(tx.created_at)}
                      </TableCell>
                      <TableCell className='py-2 text-xs hidden md:table-cell'>
                        {tx.credit_due_date
                          ? formatDateIntl(tx.credit_due_date)
                          : '-'}
                      </TableCell>
                      <TableCell className='text-right py-2 text-xs'>
                        {formatCurrency(tx.total_amount)}
                      </TableCell>
                      <TableCell className='text-right py-2 text-xs font-semibold'>
                        {formatCurrency(tx.outstanding_amount || 0)}
                      </TableCell>
                      <TableCell className='text-center py-2 text-xs'>
                        {getStatusBadge(
                          tx.payment_status as any,
                          tx.credit_due_date
                        )}
                      </TableCell>
                      <TableCell className='text-center py-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-7 text-xs mr-1'
                          onClick={() => handleOpenPaymentDialog(tx)}
                          disabled={
                            tx.payment_status === 'paid' ||
                            tx.status === 'returned'
                          }
                        >
                          <DollarSign className='mr-1 h-3 w-3' /> Bayar
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-7 w-7'
                          asChild
                        >
                          <Link
                            href={`/invoice/${tx.id}/print`}
                            target='_blank'
                          >
                            <svg
                              xmlns='http://www.w3.org/2000/svg'
                              viewBox='0 0 24 24'
                              className='h-3.5 w-3.5 fill-current'
                            >
                              <path d='M19 8H5c-1.654 0-3 1.346-3 3v3h4v4h12v-4h4v-3c0-1.654-1.346-3-3-3zM16 18H8v-4h8v4zm3-8c.552 0 1 .449 1 1v1h-2v-2h1zM18 3H6v4h12V3z' />
                            </svg>
                            <span className='sr-only'>Cetak Invoice</span>
                          </Link>
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-7 text-xs'
                          asChild
                        >
                          <Link href={`/sales/${tx.id}`}>Detail</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <Dialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
        >
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle className='text-base'>
                Catat Pembayaran Piutang
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Invoice: {selectedTransaction?.transaction_number} <br />
                Pelanggan: {selectedTransaction?.customer_name || '-'} <br />
                Sisa Tagihan:{' '}
                <span className='font-semibold'>
                  {formatCurrency(selectedTransaction?.outstanding_amount || 0)}
                </span>
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={paymentForm.handleSubmit(onSubmitPayment)}
              className='space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-1'
            >
              <div>
                <Label htmlFor='paymentDate' className='text-xs'>
                  Tanggal Pembayaran*
                </Label>
                <Controller
                  name='paymentDate'
                  control={paymentForm.control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={'outline'}
                          className='w-full justify-start text-left font-normal h-9 text-xs mt-1'
                        >
                          <CalendarIcon className='mr-1.5 h-3.5 w-3.5' />
                          {field.value ? (
                            format(field.value, 'dd MMM yyyy')
                          ) : (
                            <span>Pilih tanggal</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className='w-auto p-0'>
                        <Calendar
                          mode='single'
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          disabled={(date) => date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {paymentForm.formState.errors.paymentDate && (
                  <p className='text-xs text-destructive mt-1'>
                    {paymentForm.formState.errors.paymentDate.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='amountPaid' className='text-xs'>
                  Jumlah Dibayar* ({selectedBranch?.currency || 'Rp'})
                </Label>
                <Input
                  id='amountPaid'
                  type='number'
                  {...paymentForm.register('amountPaid')}
                  className='h-9 text-xs mt-1'
                  placeholder='0'
                />
                {paymentForm.formState.errors.amountPaid && (
                  <p className='text-xs text-destructive mt-1'>
                    {paymentForm.formState.errors.amountPaid.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='paymentMethod' className='text-xs'>
                  Metode Pembayaran*
                </Label>
                <Controller
                  name='paymentMethod'
                  control={paymentForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className='h-9 text-xs mt-1'>
                        <SelectValue placeholder='Pilih metode' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='cash' className='text-xs'>
                          Tunai
                        </SelectItem>
                        <SelectItem value='transfer' className='text-xs'>
                          Transfer Bank
                        </SelectItem>
                        <SelectItem value='card' className='text-xs'>
                          Kartu Debit/Kredit
                        </SelectItem>
                        <SelectItem value='other' className='text-xs'>
                          Lainnya
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {paymentForm.formState.errors.paymentMethod && (
                  <p className='text-xs text-destructive mt-1'>
                    {paymentForm.formState.errors.paymentMethod.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='notes' className='text-xs'>
                  Catatan (Opsional)
                </Label>
                <Textarea
                  id='notes'
                  {...paymentForm.register('notes')}
                  className='text-xs mt-1 min-h-[60px]'
                  placeholder='Catatan tambahan...'
                />
              </div>
              <DialogFooter className='pt-3'>
                <DialogClose asChild>
                  <Button
                    type='button'
                    variant='outline'
                    className='text-xs h-8'
                  >
                    Batal
                  </Button>
                </DialogClose>
                <Button
                  type='submit'
                  className='text-xs h-8'
                  disabled={paymentForm.formState.isSubmitting}
                >
                  {paymentForm.formState.isSubmitting
                    ? 'Menyimpan...'
                    : 'Simpan Pembayaran'}
                </Button>
              </DialogFooter>
            </form>
            {selectedTransaction &&
              selectedTransaction.customer_payments &&
              selectedTransaction.customer_payments.length > 0 && (
                <div className='mt-4 pt-3 border-t'>
                  <h4 className='text-sm font-medium mb-1.5'>
                    Riwayat Pembayaran Invoice Ini:
                  </h4>
                  <ScrollArea className='h-32'>
                    <ul className='space-y-1.5 text-xs'>
                      {selectedTransaction.customer_payments.map((pmt, idx) => (
                        <li key={idx} className='p-1.5 bg-muted/50 rounded-md'>
                          <p>
                            <strong>Tgl:</strong>{' '}
                            {formatDateIntl(pmt.payment_date, true)} -{' '}
                            <strong>{formatCurrency(pmt.amount_paid)}</strong> (
                            {pmt.payment_method})
                          </p>
                          {pmt.notes && (
                            <p className='text-muted-foreground italic text-[0.7rem]'>
                              Catatan: {pmt.notes}
                            </p>
                          )}
                          <div className='mt-1'>
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-7 text-xs'
                              onClick={() => {
                                setEditingPaymentIdx(idx)
                                paymentForm.reset({
                                  paymentDate: new Date(pmt.payment_date),
                                  amountPaid: pmt.amount_paid,
                                  paymentMethod:
                                    (pmt.payment_method as any) ?? 'cash',
                                  notes: pmt.notes ?? '',
                                })
                              }}
                            >
                              Edit
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  )
}
