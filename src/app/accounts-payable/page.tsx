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
import { Eye, DollarSign, CalendarIcon, FilterX } from 'lucide-react'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { format, isBefore, startOfDay } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle as CardTtl,
} from '@/components/ui/card'
import { formatCurrency, formatDateIntlTwo } from '@/lib/helper'

// Laravel service imports
import {
  listOutstandingPurchaseOrdersByBranch,
  getPurchaseOrderDetailAP,
  recordSupplierPayment,
  updateSupplierPayment,
  type AP_PurchaseOrder,
  type RecordSupplierPaymentInput,
} from '@/lib/laravel/purchaseOrderService'

const paymentToSupplierFormSchema = z.object({
  paymentDate: z.date({ required_error: 'Tanggal pembayaran harus diisi.' }),
  amountPaid: z.coerce
    .number()
    .positive({ message: 'Jumlah bayar harus lebih dari 0.' }),
  paymentMethod: z.enum(['cash', 'transfer', 'card', 'other'], {
    required_error: 'Metode pembayaran harus dipilih.',
  }),
  notes: z.string().optional(),
})

type PaymentToSupplierFormValues = z.infer<typeof paymentToSupplierFormSchema>

export default function AccountsPayablePage() {
  const { currentUser } = useAuth()
  const { selectedBranch } = useBranches()

  const [payables, setPayables] = useState<AP_PurchaseOrder[]>([])
  const [filteredPayables, setFilteredPayables] = useState<AP_PurchaseOrder[]>(
    []
  )
  const [loading, setLoading] = useState(true)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [selectedPO, setSelectedPO] = useState<AP_PurchaseOrder | null>(null)
  const [editingPaymentIdx, setEditingPaymentIdx] = useState<number | null>(
    null
  )
  const [limit, setLimit] = useState(10) // Default limit for pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'all'
  >('all')

  const paymentForm = useForm<PaymentToSupplierFormValues>({
    resolver: zodResolver(paymentToSupplierFormSchema),
    defaultValues: {
      paymentDate: new Date(),
      amountPaid: 0,
      paymentMethod: 'transfer',
      notes: '',
    },
  })

  const fetchPayables = useCallback(async () => {
    if (!selectedBranch) {
      setPayables([])
      setFilteredPayables([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await listOutstandingPurchaseOrdersByBranch(
        selectedBranch.id,
        {
          limit,
          searchTerm,
          paymentStatus:
            statusFilter === 'all' || statusFilter === 'overdue'
              ? undefined
              : statusFilter,
        }
      )
      setPayables(res.data)
      setFilteredPayables(res.data)
    } catch (e) {
      toast.error('Gagal memuat utang usaha')
    } finally {
      setLoading(false)
    }
  }, [selectedBranch, limit, searchTerm, statusFilter])

  useEffect(() => {
    fetchPayables()
  }, [fetchPayables])

  const handleOpenPaymentDialog = async (po: AP_PurchaseOrder) => {
    // Fetch detailed PO to include payments
    const detail = await getPurchaseOrderDetailAP(po.id)
    setSelectedPO(detail || po)
    setEditingPaymentIdx(null)
    paymentForm.reset({
      paymentDate: new Date(),
      amountPaid: po.outstandingPOAmount || 0,
      paymentMethod: 'transfer',
      notes: '',
    })
    setIsPaymentDialogOpen(true)
  }

  const handleEditPayment = (idx: number) => {
    if (!selectedPO?.payments) return
    const p = selectedPO.payments[idx]
    setEditingPaymentIdx(idx)
    paymentForm.reset({
      paymentDate: new Date(p.paymentDate),
      amountPaid: p.amountPaid,
      paymentMethod: (p.paymentMethod as any) || 'transfer',
      notes: p.notes || '',
    })
  }

  // Client-side filtering for 'overdue' and extra search matching
  useEffect(() => {
    let filtered = payables
    if (statusFilter !== 'all') {
      filtered = filtered.filter(
        (p) =>
          p.paymentStatusOnPO === statusFilter ||
          (statusFilter === 'overdue' &&
            p.paymentDueDateOnPO &&
            isBefore(new Date(p.paymentDueDateOnPO), startOfDay(new Date())) &&
            p.paymentStatusOnPO !== 'paid')
      )
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          (p.poNumber || '').toLowerCase().includes(lower) ||
          (p.supplierName || '').toLowerCase().includes(lower)
      )
    }
    setFilteredPayables(filtered)
  }, [payables, statusFilter, searchTerm])

  const onSubmitPayment: SubmitHandler<PaymentToSupplierFormValues> = async (
    values
  ) => {
    if (!selectedPO || !currentUser || !selectedBranch) {
      toast.error('Ada kesalahan', {
        description: 'PO, cabang, atau pengguna tidak valid.',
      })
      return
    }
    if (
      editingPaymentIdx === null &&
      values.amountPaid > (selectedPO.outstandingPOAmount || 0)
    ) {
      toast.error('Jumlah tidak valid', {
        description: 'Jumlah bayar melebihi sisa tagihan.',
      })
      paymentForm.setError('amountPaid', {
        type: 'manual',
        message: 'Jumlah bayar melebihi sisa tagihan.',
      })
      return
    }

    try {
      if (editingPaymentIdx !== null && selectedPO?.payments) {
        const paymentAny = (selectedPO as any).payments[editingPaymentIdx]
        const paymentId = paymentAny?.id
        if (!paymentId) {
          toast.error('Tidak dapat mengedit pembayaran ini')
          return
        }
        await updateSupplierPayment(paymentId, {
          payment_date: values.paymentDate.toISOString().slice(0, 10),
          amount_paid: values.amountPaid,
          payment_method: values.paymentMethod,
          notes: values.notes || null,
        })
        toast.success('Pembayaran berhasil diperbarui')
      } else {
        const payload: RecordSupplierPaymentInput = {
          purchase_order_id: selectedPO.id,
          branch_id: selectedBranch.id,
          supplier_id: selectedPO.supplierId,
          payment_date: values.paymentDate.toISOString().slice(0, 10),
          amount_paid: values.amountPaid,
          payment_method: values.paymentMethod,
          notes: values.notes || null,
          recorded_by_user_id:
            (currentUser as any)?.id || (currentUser as any)?.$id,
        }
        await recordSupplierPayment(payload)
        toast.success('Pembayaran berhasil dicatat')
      }
      setIsPaymentDialogOpen(false)
      await fetchPayables()
    } catch (err: any) {
      let message = 'Terjadi kesalahan pada server.'
      if (err.response?.data?.message) message = err.response.data.message
      toast.error('Gagal Mencatat Pembayaran', { description: message })
    }
  }

  const getStatusBadge = (
    status: 'unpaid' | 'partially_paid' | 'paid' | undefined,
    dueDateString?: string | null
  ) => {
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' =
      'secondary'
    let text = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'N/A'

    if (status === 'paid') {
      variant = 'default'
      text = 'Lunas'
    } else if (status === 'unpaid') {
      variant = 'destructive'
      text = 'Belum Bayar'
    } else if (status === 'partially_paid') {
      variant = 'outline'
      text = 'Bayar Sebagian'
    }

    const dueDate = dueDateString ? new Date(dueDateString) : undefined
    if (
      dueDate &&
      (status === 'unpaid' || status === 'partially_paid') &&
      isBefore(dueDate, startOfDay(new Date()))
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
              Utang Usaha {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
          </div>

          <Card>
            <CardHeader className='p-3 pb-2'>
              <CardTtl className='text-base'>Filter Utang</CardTtl>
            </CardHeader>
            <CardContent className='p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end'>
              <div>
                <Label htmlFor='searchTermAP' className='text-xs'>
                  Cari PO/Pemasok
                </Label>
                <Input
                  id='searchTermAP'
                  type='search'
                  placeholder='Ketik untuk mencari...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='h-8 text-xs mt-0.5'
                  disabled={!selectedBranch || loading}
                />
              </div>
              <div>
                <Label htmlFor='statusFilterAP' className='text-xs'>
                  Status Pembayaran
                </Label>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as any)}
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
                      Belum Bayar
                    </SelectItem>
                    <SelectItem value='partially_paid' className='text-xs'>
                      Bayar Sebagian
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
              <Button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
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
                Pilih cabang untuk mengelola utang usaha.
              </p>
            </div>
          ) : filteredPayables.length === 0 ? (
            <div className='border rounded-lg shadow-sm overflow-hidden p-10 text-center'>
              <p className='text-sm text-muted-foreground'>
                Tidak ada utang yang cocok dengan filter Anda.
              </p>
            </div>
          ) : (
            <div className='border rounded-lg shadow-sm overflow-hidden'>
              <Table>
                <TableCaption className='text-xs'>
                  Daftar utang usaha untuk{' '}
                  {selectedBranch?.name || 'cabang terpilih'}.
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-xs'>No. PO</TableHead>
                    <TableHead className='text-xs hidden sm:table-cell'>
                      Pemasok
                    </TableHead>
                    <TableHead className='text-xs hidden md:table-cell'>
                      Tgl. PO
                    </TableHead>
                    <TableHead className='text-xs'>Jatuh Tempo</TableHead>
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
                  {filteredPayables.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className='py-2 text-xs font-medium'>
                        {po.poNumber}
                      </TableCell>
                      <TableCell className='py-2 text-xs hidden sm:table-cell'>
                        {po.supplierName || '-'}
                      </TableCell>
                      <TableCell className='py-2 text-xs hidden md:table-cell'>
                        {formatDateIntlTwo(po.orderDate)}
                      </TableCell>
                      <TableCell className='py-2 text-xs'>
                        {po.paymentDueDateOnPO
                          ? formatDateIntlTwo(po.paymentDueDateOnPO)
                          : '-'}
                      </TableCell>
                      <TableCell className='text-right py-2 text-xs'>
                        {formatCurrency(po.totalAmount)}
                      </TableCell>
                      <TableCell className='text-right py-2 text-xs font-semibold'>
                        {formatCurrency(po.outstandingPOAmount)}
                      </TableCell>
                      <TableCell className='text-center py-2 text-xs'>
                        {getStatusBadge(
                          po.paymentStatusOnPO,
                          po.paymentDueDateOnPO
                        )}
                      </TableCell>
                      <TableCell className='text-center py-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-7 text-xs mr-1'
                          onClick={() => handleOpenPaymentDialog(po)}
                          disabled={po.paymentStatusOnPO === 'paid'}
                        >
                          <DollarSign className='mr-1 h-3 w-3' /> Bayar
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-7 w-7'
                          asChild
                        >
                          <Link href={`/purchase-orders/${po.id}`}>
                            <Eye className='h-3.5 w-3.5' />
                            <span className='sr-only'>Lihat PO</span>
                          </Link>
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
                Catat Pembayaran Utang
              </DialogTitle>
              <DialogDescription className='text-xs'>
                PO: {selectedPO?.poNumber} <br />
                Pemasok: {selectedPO?.supplierName || '-'} <br />
                Sisa Tagihan:{' '}
                <span className='font-semibold'>
                  {formatCurrency(selectedPO?.outstandingPOAmount || 0)}
                </span>
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={paymentForm.handleSubmit(onSubmitPayment)}
              className='space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-1'
            >
              <div>
                <Label htmlFor='paymentDateAP' className='text-xs'>
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
                <Label htmlFor='amountPaidAP' className='text-xs'>
                  Jumlah Dibayar* ({selectedBranch?.currency || 'Rp'})
                </Label>
                <Input
                  id='amountPaidAP'
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
                <Label htmlFor='paymentMethodAP' className='text-xs'>
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
                          Kartu
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
                <Label htmlFor='notesAP' className='text-xs'>
                  Catatan (Opsional)
                </Label>
                <Textarea
                  id='notesAP'
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
            {selectedPO &&
              selectedPO.payments &&
              selectedPO.payments.length > 0 && (
                <div className='mt-4 pt-3 border-t'>
                  <h4 className='text-sm font-medium mb-1.5'>
                    Riwayat Pembayaran PO Ini:
                  </h4>
                  <ScrollArea className='h-32'>
                    <ul className='space-y-1.5 text-xs'>
                      {selectedPO.payments.map((pmt, idx) => (
                        <li
                          key={idx}
                          className='p-1.5 bg-muted/50 rounded-md flex items-center justify-between gap-2'
                        >
                          <div>
                            <p>
                              <strong>Tgl:</strong>{' '}
                              {formatDateIntlTwo(pmt.paymentDate, true)} -{' '}
                              <strong>{formatCurrency(pmt.amountPaid)}</strong>{' '}
                              ({pmt.paymentMethod})
                            </p>
                            {pmt.notes && (
                              <p className='text-muted-foreground italic text-[0.7rem]'>
                                Catatan: {pmt.notes}
                              </p>
                            )}
                          </div>
                          <Button
                            variant='outline'
                            size='sm'
                            className='h-7 text-xs'
                            onClick={() => handleEditPayment(idx)}
                          >
                            Edit
                          </Button>
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
