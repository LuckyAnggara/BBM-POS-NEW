'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  MinusCircle,
  PlusCircle,
  Eye,
  Users,
  Activity,
} from 'lucide-react'
import { formatDateIntl, formatCurrency } from '@/lib/helper'
import { cn } from '@/lib/utils'
import type { Shift, Sale, PaymentMethod } from '@/lib/types'

// Mock data for testing
const mockShift: Shift = {
  id: 1,
  user_id: 1,
  user_name: 'Admin User',
  branch_id: 1,
  start_shift: '2024-01-15T08:00:00Z',
  end_shift: '2024-01-15T17:00:00Z',
  starting_balance: 100000,
  ending_balance: 289500,
  actual_balance: 289500,
  total_sales: 189500,
  total_cash_payments: 150000,
  total_card_payments: 25000,
  total_bank_payments: 14500,
  total_qris_payments: 0,
  total_credit_payments: 0,
  total_other_payments: 0,
  discount_amount: 5000,
  status: 'closed',
  cash_difference: 0,
  created_at: '2024-01-15T08:00:00Z',
  updated_at: '2024-01-15T17:00:00Z',
}

const mockTransactions: Sale[] = [
  {
    id: 1,
    transaction_number: 'TXN-001',
    payment_method: 'cash',
    customer_name: 'John Doe',
    amount_paid: 50000,
    change_given: 0,
    total_amount: 50000,
    status: 'completed',
    created_at: '2024-01-15T09:15:00Z',
    updated_at: '2024-01-15T09:15:00Z',
    notes: '',
    branch_id: 1,
    user_id: 1,
    shift_id: 1,
    customer_id: 1,
    user_name: 'Admin User',
    subtotal: 50000,
    total_discount_amount: 0,
    tax_amount: 0,
    shipping_cost: 0,
    total_cogs: 30000,
    payment_status: 'paid',
    items_discount_amount: 0,
    voucher_code: null,
    voucher_discount_amount: 0,
    is_credit_sale: false,
    credit_due_date: null,
    outstanding_amount: 0,
    bank_transaction_ref: null,
    bank_name: null,
    returned_at: null,
    returned_reason: null,
    returned_by_user_id: null,
  },
  {
    id: 2,
    transaction_number: 'TXN-002',
    payment_method: 'card',
    customer_name: 'Jane Smith',
    amount_paid: 75000,
    change_given: 0,
    total_amount: 75000,
    status: 'completed',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    notes: '',
    branch_id: 1,
    user_id: 1,
    shift_id: 1,
    customer_id: 2,
    user_name: 'Admin User',
    subtotal: 75000,
    total_discount_amount: 0,
    tax_amount: 0,
    shipping_cost: 0,
    total_cogs: 45000,
    payment_status: 'paid',
    items_discount_amount: 0,
    voucher_code: null,
    voucher_discount_amount: 0,
    is_credit_sale: false,
    credit_due_date: null,
    outstanding_amount: 0,
    bank_transaction_ref: 'CARD123456',
    bank_name: 'BCA',
    returned_at: null,
    returned_reason: null,
    returned_by_user_id: null,
  },
  {
    id: 3,
    transaction_number: 'TXN-003',
    payment_method: 'transfer',
    customer_name: 'Walk-in Customer',
    amount_paid: 64500,
    change_given: 0,
    total_amount: 64500,
    status: 'completed',
    created_at: '2024-01-15T14:45:00Z',
    updated_at: '2024-01-15T14:45:00Z',
    notes: '',
    branch_id: 1,
    user_id: 1,
    shift_id: 1,
    customer_id: null,
    user_name: 'Admin User',
    subtotal: 64500,
    total_discount_amount: 0,
    tax_amount: 0,
    shipping_cost: 0,
    total_cogs: 38700,
    payment_status: 'paid',
    items_discount_amount: 0,
    voucher_code: null,
    voucher_discount_amount: 0,
    is_credit_sale: false,
    credit_due_date: null,
    outstanding_amount: 0,
    bank_transaction_ref: 'TRF789012',
    bank_name: 'Mandiri',
    returned_at: null,
    returned_reason: null,
    returned_by_user_id: null,
  },
]

export default function ShiftDetailPage() {
  const params = useParams()
  const router = useRouter()
  const shiftId = params.shiftId as string

  const [shift, setShift] = useState<Shift | null>(null)
  const [transactions, setTransactions] = useState<Sale[]>([])
  const [loadingShift, setLoadingShift] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(true)

  useEffect(() => {
    // Simulate loading with mock data
    setTimeout(() => {
      setShift(mockShift)
      setLoadingShift(false)
    }, 1000)

    setTimeout(() => {
      setTransactions(mockTransactions)
      setLoadingTransactions(false)
    }, 1500)
  }, [])

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open':
        return 'default'
      case 'closed':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'cash':
        return '💵'
      case 'card':
        return '💳'
      case 'transfer':
        return '🏦'
      case 'qris':
        return '📱'
      case 'credit':
        return '📄'
      default:
        return '💰'
    }
  }

  const formatAmount = (amount: number) => {
    const currency = 'IDR'
    const hasDecimal = amount % 1 !== 0
    const formatted = Math.floor(amount).toLocaleString('id-ID', {
      minimumFractionDigits: hasDecimal ? 2 : 0,
      maximumFractionDigits: 2,
    })
    return `${currency} ${formatted}`
  }

  // Group transactions by payment method
  const transactionsByPayment = transactions.reduce((acc, transaction) => {
    const method = transaction.payment_method
    if (!acc[method]) {
      acc[method] = []
    }
    acc[method].push(transaction)
    return acc
  }, {} as Record<PaymentMethod, Sale[]>)

  // Calculate totals
  const totalsByPayment = Object.entries(transactionsByPayment).reduce(
    (acc, [method, txs]) => {
      acc[method as PaymentMethod] = txs.reduce(
        (sum, tx) => sum + Number(tx.total_amount),
        0
      )
      return acc
    },
    {} as Record<PaymentMethod, number>
  )

  if (loadingShift) {
    return (
      <div className='container mx-auto p-4'>
        <div className='space-y-4'>
          <Skeleton className='h-8 w-1/4' />
          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-1/2' />
            </CardHeader>
            <CardContent>
              <Skeleton className='h-40 w-full' />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-1/3' />
            </CardHeader>
            <CardContent>
              <Skeleton className='h-20 w-full' />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!shift) {
    return (
      <div className='container mx-auto p-4'>
        <div className='p-4 text-center'>Shift tidak ditemukan.</div>
      </div>
    )
  }

  return (
    <div className='container mx-auto p-4'>
      <div className='space-y-4'>
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
          <div>
            <div className='flex items-center gap-2 mb-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => router.back()}
                className='text-xs h-8'
              >
                <ArrowLeft className='mr-1.5 h-3.5 w-3.5' />
                Kembali
              </Button>
              <Badge variant={getStatusBadgeVariant(shift.status)}>
                {shift.status === 'open' ? 'Aktif' : 'Ditutup'}
              </Badge>
            </div>
            <h1 className='text-xl md:text-2xl font-semibold font-headline'>
              Detail Shift #{shift.id}
            </h1>
            <div className='flex flex-row space-x-2 text-sm text-muted-foreground'>
              <span className='flex items-center'>
                <Calendar className='mr-1 h-3.5 w-3.5' />
                {formatDateIntl(shift.start_shift)}
              </span>
              {shift.end_shift && (
                <span className='flex items-center'>
                  <Clock className='mr-1 h-3.5 w-3.5' />
                  Ditutup: {formatDateIntl(shift.end_shift)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
          {/* Main Content */}
          <Card className='lg:col-span-2'>
            <CardHeader>
              <CardTitle className='text-base font-semibold flex items-center'>
                <Activity className='mr-2 h-4 w-4' />
                Ringkasan Keuangan Shift
              </CardTitle>
              <CardDescription className='text-xs'>
                Detail arus kas dan transaksi selama shift berlangsung
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
                <div className='p-3 bg-blue-50 rounded-lg'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-xs text-blue-600 font-medium'>
                        Modal Awal
                      </p>
                      <p className='text-lg font-bold text-blue-700'>
                        {formatAmount(shift.starting_balance)}
                      </p>
                    </div>
                    <DollarSign className='h-8 w-8 text-blue-500' />
                  </div>
                </div>

                <div className='p-3 bg-green-50 rounded-lg'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-xs text-green-600 font-medium'>
                        Total Penjualan
                      </p>
                      <p className='text-lg font-bold text-green-700'>
                        {formatAmount(shift.total_sales)}
                      </p>
                    </div>
                    <TrendingUp className='h-8 w-8 text-green-500' />
                  </div>
                </div>

                <div className='p-3 bg-purple-50 rounded-lg'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-xs text-purple-600 font-medium'>
                        Kas Seharusnya
                      </p>
                      <p className='text-lg font-bold text-purple-700'>
                        {formatAmount(Number(shift.ending_balance))}
                      </p>
                    </div>
                    <div className='h-8 w-8 text-purple-500'>💰</div>
                  </div>
                </div>

                <div className='p-3 bg-orange-50 rounded-lg'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-xs text-orange-600 font-medium'>
                        Kas Aktual
                      </p>
                      <p className='text-lg font-bold text-orange-700'>
                        {formatAmount(Number(shift.actual_balance))}
                      </p>
                    </div>
                    <div className='h-8 w-8 text-orange-500'>🏪</div>
                  </div>
                </div>
              </div>

              <Separator className='my-4' />

              {/* Cash Difference */}
              <div className='flex justify-between items-center p-4 rounded-lg bg-gray-50'>
                <div className='flex items-center gap-2'>
                  {shift.cash_difference && shift.cash_difference < 0 ? (
                    <MinusCircle className='h-5 w-5 text-red-500' />
                  ) : shift.cash_difference && shift.cash_difference > 0 ? (
                    <PlusCircle className='h-5 w-5 text-green-500' />
                  ) : (
                    <div className='h-5 w-5 rounded-full bg-gray-400' />
                  )}
                  <span className='font-medium'>Selisih Kas:</span>
                </div>
                <span
                  className={cn(
                    'font-bold text-lg',
                    shift.cash_difference && shift.cash_difference < 0
                      ? 'text-red-600'
                      : shift.cash_difference && shift.cash_difference > 0
                      ? 'text-green-600'
                      : 'text-gray-600'
                  )}
                >
                  {formatAmount(Number(shift.cash_difference))}
                  {shift.cash_difference !== undefined &&
                    shift.cash_difference !== 0 && (
                      <span className='ml-2 text-sm font-normal'>
                        (
                        {Number(shift.cash_difference) < 0 ? 'Kurang' : 'Lebih'}
                        )
                      </span>
                    )}
                </span>
              </div>

              <Separator className='my-4' />

              {/* Payment Method Breakdown */}
              <div>
                <h3 className='font-semibold mb-3 flex items-center'>
                  <Users className='mr-2 h-4 w-4' />
                  Breakdown Metode Pembayaran
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                  <div className='flex justify-between p-2 bg-yellow-50 rounded'>
                    <span className='flex items-center gap-2'>
                      💵 <span className='font-medium'>Tunai</span>
                    </span>
                    <span className='font-semibold'>
                      {formatAmount(shift.total_cash_payments)}
                    </span>
                  </div>
                  <div className='flex justify-between p-2 bg-blue-50 rounded'>
                    <span className='flex items-center gap-2'>
                      💳 <span className='font-medium'>Kartu</span>
                    </span>
                    <span className='font-semibold'>
                      {formatAmount(shift.total_card_payments)}
                    </span>
                  </div>
                  <div className='flex justify-between p-2 bg-green-50 rounded'>
                    <span className='flex items-center gap-2'>
                      🏦 <span className='font-medium'>Transfer</span>
                    </span>
                    <span className='font-semibold'>
                      {formatAmount(shift.total_bank_payments)}
                    </span>
                  </div>
                  <div className='flex justify-between p-2 bg-purple-50 rounded'>
                    <span className='flex items-center gap-2'>
                      📱 <span className='font-medium'>QRIS</span>
                    </span>
                    <span className='font-semibold'>
                      {formatAmount(shift.total_qris_payments)}
                    </span>
                  </div>
                  <div className='flex justify-between p-2 bg-red-50 rounded md:col-span-2'>
                    <span className='flex items-center gap-2'>
                      📄 <span className='font-medium'>Kredit</span>
                    </span>
                    <span className='font-semibold'>
                      {formatAmount(shift.total_credit_payments)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className='lg:col-span-1 space-y-4'>
            <Card>
              <CardHeader className='pb-3'>
                <CardTitle className='text-base font-semibold flex items-center'>
                  <Eye className='mr-2 h-4 w-4' />
                  Informasi Shift
                </CardTitle>
              </CardHeader>
              <CardContent className='text-sm space-y-3'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Operator:</span>
                  <span className='font-medium'>
                    {shift.user_name || 'N/A'}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Cabang:</span>
                  <span className='font-medium'>Toko Pusat</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Mulai:</span>
                  <span className='font-medium'>
                    {formatDateIntl(shift.start_shift)}
                  </span>
                </div>
                {shift.end_shift && (
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Selesai:</span>
                    <span className='font-medium'>
                      {formatDateIntl(shift.end_shift)}
                    </span>
                  </div>
                )}
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Status:</span>
                  <Badge variant={getStatusBadgeVariant(shift.status)}>
                    {shift.status === 'open' ? 'Aktif' : 'Ditutup'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-3'>
                <CardTitle className='text-base font-semibold'>
                  Statistik Transaksi
                </CardTitle>
              </CardHeader>
              <CardContent className='text-sm space-y-3'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>
                    Total Transaksi:
                  </span>
                  <span className='font-semibold'>{transactions.length}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>
                    Transaksi Sukses:
                  </span>
                  <span className='font-semibold text-green-600'>
                    {
                      transactions.filter((t) => t.status === 'completed')
                        .length
                    }
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Total Diskon:</span>
                  <span className='font-semibold'>
                    {formatAmount(shift.discount_amount || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle className='text-base font-semibold'>
              Daftar Transaksi ({transactions.length})
            </CardTitle>
            <CardDescription className='text-xs'>
              Semua transaksi yang terjadi selama shift ini
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTransactions ? (
              <div className='space-y-2'>
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className='h-12 w-full' />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <p className='text-sm text-muted-foreground text-center py-8'>
                Tidak ada transaksi dalam shift ini.
              </p>
            ) : (
              <ScrollArea className='h-[400px]'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-xs'>No. Transaksi</TableHead>
                      <TableHead className='text-xs'>Waktu</TableHead>
                      <TableHead className='text-xs'>Metode</TableHead>
                      <TableHead className='text-xs'>Pelanggan</TableHead>
                      <TableHead className='text-xs text-right'>
                        Dibayar
                      </TableHead>
                      <TableHead className='text-xs text-right'>
                        Kembalian
                      </TableHead>
                      <TableHead className='text-xs text-right'>
                        Total
                      </TableHead>
                      <TableHead className='text-xs text-center'>
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className='text-xs py-2 font-medium'>
                          {transaction.transaction_number}
                        </TableCell>
                        <TableCell className='text-xs py-2'>
                          {formatDateIntl(transaction.created_at)}
                        </TableCell>
                        <TableCell className='text-xs py-2'>
                          <div className='flex items-center gap-1'>
                            <span>
                              {getPaymentMethodIcon(transaction.payment_method)}
                            </span>
                            <span className='capitalize'>
                              {transaction.payment_method}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className='text-xs py-2'>
                          {transaction.customer_name || 'Walk-in Customer'}
                        </TableCell>
                        <TableCell className='text-xs text-right py-2'>
                          {formatAmount(transaction.amount_paid)}
                        </TableCell>
                        <TableCell className='text-xs text-right py-2'>
                          {formatAmount(transaction.change_given || 0)}
                        </TableCell>
                        <TableCell className='text-xs text-right py-2 font-medium'>
                          {formatAmount(transaction.total_amount)}
                        </TableCell>
                        <TableCell className='text-xs text-center py-2'>
                          <Badge
                            variant={
                              transaction.status === 'completed'
                                ? 'default'
                                : 'destructive'
                            }
                          >
                            {transaction.status === 'completed'
                              ? 'Sukses'
                              : 'Gagal'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
