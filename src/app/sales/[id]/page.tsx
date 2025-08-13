'use client'
import React, { useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import MainLayout from '@/components/layout/main-layout'
import { useParams } from 'next/navigation'
import {
  getSaleById,
  updateCustomerPayment,
  createCustomerPayment,
  deleteCustomerPayment,
} from '@/lib/laravel/saleService'
import type { PaymentMethod, Sale } from '@/lib/types'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle as DialogModalTitle,
  DialogDescription as DialogModalDescription,
  DialogFooter as DialogModalFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'
import {
  DollarSign,
  CalendarIcon,
  Hash,
  User,
  Printer,
  Edit,
  Trash2,
  FileText,
  CheckCircle,
  Loader2Icon,
} from 'lucide-react'
import Link from 'next/link'

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>()
  const [sale, setSale] = useState<Sale | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isPaymentLoading, setIsPaymentLoading] = useState(false)
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null)
  const [paymentDate, setPaymentDate] = useState<Date>(new Date())
  const [paymentAmount, setPaymentAmount] = useState<string>('0')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paymentNotes, setPaymentNotes] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      const data = await getSaleById(Number(params.id))
      setSale(data)
    }
    load()
  }, [params.id])

  const outstanding = sale?.outstanding_amount || 0
  const total = sale?.total_amount || 0
  const paid = Math.max(0, total - outstanding)

  const openCreatePayment = () => {
    setEditingPaymentId(null)
    setPaymentDate(new Date())
    setPaymentAmount(String(outstanding || 0))
    setPaymentMethod('cash')
    setPaymentNotes('')
    setIsPaymentModalOpen(true)
  }

  const openEditPayment = (
    p: NonNullable<Sale['customer_payments']>[number]
  ) => {
    setEditingPaymentId(p.id)
    setPaymentDate(new Date(p.payment_date))
    setPaymentAmount(String(p.amount_paid))
    setPaymentMethod(p.payment_method as PaymentMethod)
    setPaymentNotes(p.notes || '')
    setIsPaymentModalOpen(true)
  }

  const handleSubmitPayment = async () => {
    if (!sale) return
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Jumlah harus lebih dari 0')
      return
    }
    try {
      setIsPaymentLoading(true)
      if (editingPaymentId) {
        await updateCustomerPayment(editingPaymentId, {
          payment_date: paymentDate.toISOString().slice(0, 10),
          amount_paid: amount,
          payment_method: paymentMethod,
          notes: paymentNotes,
        })
        toast.success('Pembayaran diperbarui')
      } else {
        await createCustomerPayment({
          sale_id: sale.id,
          payment_date: paymentDate.toISOString().slice(0, 10),
          amount_paid: amount,
          payment_method: paymentMethod,
          notes: paymentNotes,
        })
        toast.success('Pembayaran dicatat')
      }
      setIsPaymentModalOpen(false)
      const refreshed = await getSaleById(sale.id)
      setSale(refreshed)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal menyimpan pembayaran')
    } finally {
      setIsPaymentLoading(false)
    }
  }

  const handleDeletePayment = async (id: number) => {
    if (!sale) return
    try {
      await deleteCustomerPayment(id)
      toast.success('Pembayaran dihapus')
      const refreshed = await getSaleById(sale.id)
      setSale(refreshed)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal menghapus pembayaran')
    }
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h1 className='text-xl md:text-2xl font-semibold'>
              Detail Penjualan: {sale?.transaction_number}
            </h1>
            <div className='flex gap-2'>
              <Button variant='outline' asChild>
                <Link href='/sales-history'>Kembali ke Daftar</Link>
              </Button>
              <Button variant='secondary' asChild>
                <Link href={`/invoice/${sale?.id}/print`} target='_blank'>
                  <Printer className='h-4 w-4 mr-1' /> Cetak Invoice
                </Link>
              </Button>
            </div>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
            <Card className='lg:col-span-2'>
              <CardHeader>
                <CardTitle>Item Pesanan</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Produk</TableHead>
                      <TableHead className='text-right'>Qty</TableHead>
                      <TableHead className='text-right'>Harga</TableHead>
                      <TableHead className='text-right'>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sale?.sale_details?.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.product_name}</TableCell>
                        <TableCell className='text-right'>
                          {d.quantity}
                        </TableCell>
                        <TableCell className='text-right'>
                          {d.price_at_sale?.toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className='text-right'>
                          {d.subtotal?.toLocaleString('id-ID')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className='flex justify-end mt-4 text-sm'>
                  <div className='space-y-1 w-64'>
                    <div className='flex justify-between'>
                      <span>Subtotal Item:</span>
                      <span>{sale?.subtotal?.toLocaleString('id-ID')}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span>Pajak:</span>
                      <span>{sale?.tax_amount?.toLocaleString('id-ID')}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span>Diskon/Voucher:</span>
                      <span>
                        {(sale?.total_discount_amount || 0).toLocaleString(
                          'id-ID'
                        )}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span>Ongkos Kirim:</span>
                      <span>
                        {(sale?.shipping_cost || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className='flex justify-between font-semibold pt-1 border-t'>
                      <span>Total Pesanan:</span>
                      <span>{sale?.total_amount?.toLocaleString('id-ID')}</span>
                    </div>
                    <div className='flex justify-between text-red-600'>
                      <span>Sisa Piutang:</span>
                      <span>
                        {(sale?.outstanding_amount || 0).toLocaleString(
                          'id-ID'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informasi Umum</CardTitle>
                <CardDescription>
                  <div className='grid grid-cols-1 gap-1 mt-2 text-sm'>
                    <div className='flex justify-between'>
                      <span>No. Invoice</span>
                      <span className='font-medium'>
                        #{sale?.transaction_number}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span>Tanggal</span>
                      <span>
                        {sale
                          ? format(
                              new Date(sale.created_at),
                              'dd MMM yyyy, HH:mm'
                            )
                          : '-'}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span>Pelanggan</span>
                      <span className='font-medium'>
                        {sale?.customer_name || '-'}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span>Status</span>
                      <span>
                        <Badge
                          variant={
                            sale?.payment_status === 'paid'
                              ? 'default'
                              : sale?.payment_status === 'partially_paid'
                              ? 'outline'
                              : 'destructive'
                          }
                        >
                          {sale?.payment_status}
                        </Badge>
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span>Dibayar</span>
                      <span>{paid.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className='w-full text-xs h-8'
                  onClick={openCreatePayment}
                  disabled={
                    sale?.payment_status === 'paid' ||
                    sale?.status === 'returned'
                  }
                >
                  <DollarSign className='h-4 w-4 mr-2' /> Catat Pembayaran dari
                  Pelanggan
                </Button>
              </CardContent>
              <CardFooter>
                <div className='w-full'>
                  <h4 className='text-sm font-medium mb-2'>
                    Riwayat Pembayaran
                  </h4>
                  {sale?.customer_payments &&
                  sale.customer_payments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Metode</TableHead>
                          <TableHead className='text-right'>Jumlah</TableHead>
                          <TableHead>Catatan</TableHead>
                          <TableHead className='text-center'>Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sale?.customer_payments?.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>
                              {format(new Date(p.payment_date), 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell>{p.payment_method}</TableCell>
                            <TableCell className='text-right'>
                              {p.amount_paid.toLocaleString('id-ID')}
                            </TableCell>
                            <TableCell>{p.notes || '-'}</TableCell>
                            <TableCell className='text-center'>
                              <div className='flex items-center justify-center gap-1'>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='h-7 w-7'
                                  onClick={() => openEditPayment(p)}
                                >
                                  <Edit className='h-4 w-4 text-blue-600' />
                                </Button>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='h-7 w-7'
                                  onClick={() => handleDeletePayment(p.id)}
                                >
                                  <Trash2 className='h-4 w-4 text-red-600' />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className='text-xs text-muted-foreground'>
                      Belum ada pembayaran.
                    </div>
                  )}
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Payment Modal */}
          <Dialog
            open={isPaymentModalOpen}
            onOpenChange={setIsPaymentModalOpen}
          >
            <DialogContent className='sm:max-w-md'>
              <DialogHeader>
                <DialogModalTitle className='text-base'>
                  {editingPaymentId ? 'Edit Pembayaran' : 'Catat Pembayaran'}
                </DialogModalTitle>
                <DialogModalDescription className='text-xs'>
                  No. Invoice: <strong>#{sale?.transaction_number}</strong>
                </DialogModalDescription>
              </DialogHeader>

              <div className='space-y-3'>
                <div>
                  <Label className='text-xs'>Tanggal Pembayaran</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant='outline'
                        className='h-9 text-xs w-full mt-1'
                      >
                        <CalendarIcon className='mr-1.5 h-3.5 w-3.5' />
                        {format(paymentDate, 'dd MMM yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-auto p-0'>
                      <Calendar
                        mode='single'
                        selected={paymentDate}
                        onSelect={(d) => d && setPaymentDate(d)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className='text-xs'>Jumlah Dibayar</Label>
                  <Input
                    type='number'
                    className='h-9 text-xs mt-1'
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label className='text-xs'>Metode Pembayaran</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                  >
                    <SelectTrigger className='h-9 text-xs mt-1'>
                      <SelectValue placeholder='Pilih metode' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='cash' className='text-xs'>
                        Tunai
                      </SelectItem>
                      <SelectItem value='transfer' className='text-xs'>
                        Transfer
                      </SelectItem>
                      <SelectItem value='card' className='text-xs'>
                        Kartu
                      </SelectItem>
                      <SelectItem value='qris' className='text-xs'>
                        QRIS
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className='text-xs'>Catatan</Label>
                  <Input
                    className='h-9 text-xs mt-1'
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder='Opsional'
                  />
                </div>
              </div>

              <DialogModalFooter className='pt-3'>
                <DialogClose asChild>
                  <Button variant='outline' className='h-8 text-xs'>
                    Batal
                  </Button>
                </DialogClose>

                {!isPaymentLoading ? (
                  <Button className='h-8 text-xs' onClick={handleSubmitPayment}>
                    Simpan
                  </Button>
                ) : (
                  <Button size='sm' disabled>
                    <Loader2Icon className='animate-spin' />
                    Please wait
                  </Button>
                )}
              </DialogModalFooter>
            </DialogContent>
          </Dialog>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
