'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  FileText,
  Download,
  DollarSign,
  Users,
  Calendar,
  Eye,
  Clock,
  TrendingUp,
  Minus,
  Plus,
  CalendarDays,
  Info,
  FilePenLine,
  Printer,
} from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { getPayroll, type Payroll } from '@/lib/laravel/payroll'
import { formatCurrency } from '@/lib/helper'
import { format } from 'date-fns'

const STATUS_LABELS = {
  paid: 'Terbayar',
  pending: 'Menunggu',
  cancelled: 'Dibatalkan',
}

const STATUS_COLORS = {
  paid: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

const PAYMENT_TYPE_LABELS = {
  daily: 'Harian',
  monthly: 'Bulanan',
}

export default function PayrollDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [payroll, setPayroll] = useState<Payroll | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPayroll()
  }, [params.payrollId])

  const loadPayroll = async () => {
    try {
      setIsLoading(true)
      const data = await getPayroll(Number(params.payrollId))
      setPayroll(data)
    } catch (error) {
      toast.error('Error', { description: 'Gagal memuat data payroll.' })
      router.back()
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy')
  }

  const handleViewPayslip = (employeeId: number) => {
    router.push(`/payroll/${params.payrollId}/payslip/${employeeId}`)
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className='space-y-6'>
            <div className='flex items-center gap-3'>
              <Skeleton className='h-8 w-8' />
              <Skeleton className='h-8 w-48' />
            </div>
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className='h-24 w-full' />
              ))}
            </div>
            <Skeleton className='h-96 w-full' />
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  if (!payroll) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className='flex flex-col items-center justify-center min-h-[400px] text-center'>
            <DollarSign className='h-12 w-12 text-muted-foreground mb-4' />
            <h3 className='text-lg font-medium text-muted-foreground mb-2'>
              Payroll Tidak Ditemukan
            </h3>
            <p className='text-sm text-muted-foreground mb-4'>
              Data payroll yang Anda cari tidak dapat ditemukan.
            </p>
            <Button onClick={() => router.back()} variant='outline'>
              <ArrowLeft className='h-4 w-4 mr-2' />
              Kembali
            </Button>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  const totalEmployees = payroll.details?.length || 0
  const totalSalary =
    payroll.details?.reduce((sum, detail) => sum + detail.base_salary, 0) || 0
  const totalAllowances =
    payroll.details?.reduce(
      (sum, detail) =>
        sum + detail.meal_allowance + detail.bonus + detail.overtime_amount,
      0
    ) || 0
  const totalDeductions =
    payroll.details?.reduce(
      (sum, detail) => sum + detail.loan_deduction + detail.other_deduction,
      0
    ) || 0

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-6'>
          {/* Header */}
          <div className='flex flex-col sm:flex-row justify-between items-start gap-4'>
            <div className='space-y-1'>
              <div className='flex items-center gap-3'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => router.back()}
                  className='h-8 w-8 p-0'
                >
                  <ArrowLeft className='h-4 w-4' />
                  <span className='sr-only'>Kembali</span>
                </Button>
                <h1 className='text-xl md:text-2xl font-semibold font-headline'>
                  Detail Payroll
                </h1>
                <Badge className={`ml-2 ${STATUS_COLORS[payroll.status]}`}>
                  {STATUS_LABELS[payroll.status]}
                </Badge>
              </div>
              <p className='text-sm text-muted-foreground'>
                {payroll.payroll_code || `PAY-${payroll.id}`} • {payroll.title}
              </p>
            </div>

            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => router.push(`/payroll/${params.payrollId}/edit`)}
                className='h-9'
              >
                <FilePenLine className='h-4 w-4 mr-2' />
                Edit
              </Button>
              <Button variant='outline' size='sm' className='h-9'>
                <Printer className='h-4 w-4 mr-2' />
                Print
              </Button>
              <Button variant='outline' size='sm' className='h-9'>
                <Download className='h-4 w-4 mr-2' />
                Export
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <div className='bg-white border rounded-lg p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-gray-600'>
                    Total Payroll
                  </p>
                  <p className='text-2xl font-bold text-primary'>
                    {formatCurrency(payroll.total_amount)}
                  </p>
                </div>
                <DollarSign className='h-8 w-8 text-primary' />
              </div>
            </div>

            <div className='bg-white border rounded-lg p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-gray-600'>
                    Total Pegawai
                  </p>
                  <p className='text-2xl font-bold'>{totalEmployees}</p>
                  <p className='text-xs text-muted-foreground'>
                    Pegawai dibayar
                  </p>
                </div>
                <Users className='h-8 w-8 text-blue-600' />
              </div>
            </div>

            <div className='bg-white border rounded-lg p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-gray-600'>
                    Total Tunjangan
                  </p>
                  <p className='text-2xl font-bold text-green-600'>
                    {formatCurrency(totalAllowances)}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    Bonus + Lembur + Uang Makan
                  </p>
                </div>
                <Plus className='h-8 w-8 text-green-600' />
              </div>
            </div>

            <div className='bg-white border rounded-lg p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-gray-600'>
                    Total Potongan
                  </p>
                  <p className='text-2xl font-bold text-red-600'>
                    {formatCurrency(totalDeductions)}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    Pinjaman + Lainnya
                  </p>
                </div>
                <Minus className='h-8 w-8 text-red-600' />
              </div>
            </div>
          </div>

          {/* Payroll Information */}
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            <div className='lg:col-span-2 bg-white border rounded-lg shadow-sm'>
              <div className='p-6 border-b'>
                <div className='flex items-center gap-2'>
                  <FileText className='h-5 w-5 text-primary' />
                  <h2 className='text-lg font-semibold'>Informasi Payroll</h2>
                </div>
                <p className='text-sm text-muted-foreground mt-1'>
                  Detail lengkap periode dan pembayaran payroll
                </p>
              </div>
              <div className='p-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div className='space-y-1'>
                    <label className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
                      Kode Payroll
                    </label>
                    <p className='text-sm font-medium'>
                      {payroll.payroll_code || `PAY-${payroll.id}`}
                    </p>
                  </div>

                  <div className='space-y-1'>
                    <label className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
                      Jenis Pembayaran
                    </label>
                    <div className='flex items-center gap-2'>
                      <Clock className='h-3 w-3 text-muted-foreground' />
                      <p className='text-sm'>
                        {PAYMENT_TYPE_LABELS[payroll.payment_type]}
                      </p>
                    </div>
                  </div>

                  <div className='space-y-1'>
                    <label className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
                      Periode Payroll
                    </label>
                    <div className='flex items-center gap-2'>
                      <CalendarDays className='h-3 w-3 text-muted-foreground' />
                      <p className='text-sm'>
                        {formatDate(payroll.period_start)} -{' '}
                        {formatDate(payroll.period_end)}
                      </p>
                    </div>
                  </div>

                  <div className='space-y-1'>
                    <label className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
                      Tanggal Pembayaran
                    </label>
                    <div className='flex items-center gap-2'>
                      <Calendar className='h-3 w-3 text-muted-foreground' />
                      <p className='text-sm'>
                        {formatDate(payroll.payment_date)}
                      </p>
                    </div>
                  </div>

                  {payroll.description && (
                    <div className='md:col-span-2 space-y-1'>
                      <label className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
                        Deskripsi
                      </label>
                      <p className='text-sm bg-muted/30 p-3 rounded-lg border'>
                        {payroll.description}
                      </p>
                    </div>
                  )}

                  {payroll.notes && (
                    <div className='md:col-span-2 space-y-1'>
                      <label className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
                        Catatan
                      </label>
                      <p className='text-sm bg-muted/30 p-3 rounded-lg border'>
                        {payroll.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Summary Card */}
            <div className='bg-white border rounded-lg shadow-sm'>
              <div className='p-6 border-b'>
                <div className='flex items-center gap-2'>
                  <TrendingUp className='h-5 w-5 text-primary' />
                  <h2 className='text-lg font-semibold'>Ringkasan Keuangan</h2>
                </div>
                <p className='text-sm text-muted-foreground mt-1'>
                  Breakdown pembayaran payroll
                </p>
              </div>
              <div className='p-6'>
                <div className='space-y-4'>
                  <div className='flex justify-between items-center py-2 border-b border-muted'>
                    <span className='text-sm text-muted-foreground'>
                      Gaji Pokok
                    </span>
                    <span className='font-medium'>
                      {formatCurrency(totalSalary)}
                    </span>
                  </div>

                  <div className='space-y-2'>
                    <p className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
                      Tunjangan
                    </p>
                    <div className='space-y-1 pl-2 border-l-2 border-green-200'>
                      <div className='flex justify-between text-sm'>
                        <span className='text-muted-foreground'>
                          Uang Makan
                        </span>
                        <span className='text-green-600'>
                          {formatCurrency(
                            payroll.details?.reduce(
                              (sum, detail) => sum + detail.meal_allowance,
                              0
                            ) || 0
                          )}
                        </span>
                      </div>
                      <div className='flex justify-between text-sm'>
                        <span className='text-muted-foreground'>Bonus</span>
                        <span className='text-green-600'>
                          {formatCurrency(
                            payroll.details?.reduce(
                              (sum, detail) => sum + detail.bonus,
                              0
                            ) || 0
                          )}
                        </span>
                      </div>
                      <div className='flex justify-between text-sm'>
                        <span className='text-muted-foreground'>Lembur</span>
                        <span className='text-green-600'>
                          {formatCurrency(
                            payroll.details?.reduce(
                              (sum, detail) => sum + detail.overtime_amount,
                              0
                            ) || 0
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <p className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
                      Potongan
                    </p>
                    <div className='space-y-1 pl-2 border-l-2 border-red-200'>
                      <div className='flex justify-between text-sm'>
                        <span className='text-muted-foreground'>Pinjaman</span>
                        <span className='text-red-600'>
                          {formatCurrency(
                            payroll.details?.reduce(
                              (sum, detail) => sum + detail.loan_deduction,
                              0
                            ) || 0
                          )}
                        </span>
                      </div>
                      <div className='flex justify-between text-sm'>
                        <span className='text-muted-foreground'>Lainnya</span>
                        <span className='text-red-600'>
                          {formatCurrency(
                            payroll.details?.reduce(
                              (sum, detail) => sum + detail.other_deduction,
                              0
                            ) || 0
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className='flex justify-between items-center py-2'>
                    <span className='text-base font-semibold'>
                      Total Bersih
                    </span>
                    <span className='text-lg font-bold text-primary'>
                      {formatCurrency(payroll.total_amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Employee Details */}
          <div className='bg-white border rounded-lg shadow-sm'>
            <div className='p-6 border-b'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Users className='h-5 w-5 text-primary' />
                  <h2 className='text-lg font-semibold'>Detail Pegawai</h2>
                  <Badge variant='secondary'>{totalEmployees} pegawai</Badge>
                </div>

                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <Info className='h-4 w-4' />
                  <span>
                    Klik tombol payslip untuk melihat detail pembayaran
                  </span>
                </div>
              </div>
            </div>

            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/50'>
                    <TableHead className='text-xs font-medium'>
                      Pegawai
                    </TableHead>
                    <TableHead className='text-right text-xs font-medium'>
                      Gaji Pokok
                    </TableHead>
                    <TableHead className='text-right text-xs font-medium'>
                      Uang Makan
                    </TableHead>
                    <TableHead className='text-right text-xs font-medium'>
                      Bonus
                    </TableHead>
                    <TableHead className='text-right text-xs font-medium'>
                      Lembur
                    </TableHead>
                    <TableHead className='text-right text-xs font-medium'>
                      Pot. Pinjaman
                    </TableHead>
                    <TableHead className='text-right text-xs font-medium'>
                      Pot. Lainnya
                    </TableHead>
                    <TableHead className='text-right text-xs font-medium'>
                      Total Bersih
                    </TableHead>
                    <TableHead className='text-center text-xs font-medium w-24'>
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payroll.details?.map((detail) => (
                    <TableRow key={detail.id} className='hover:bg-muted/50'>
                      <TableCell>
                        <div className='min-w-0'>
                          <div className='font-medium text-sm'>
                            {detail.employee?.name}
                          </div>
                          <div className='text-xs text-muted-foreground'>
                            {detail.employee?.employee_code} •{' '}
                            {detail.employee?.position}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className='text-right text-xs'>
                        {formatCurrency(detail.base_salary)}
                      </TableCell>
                      <TableCell className='text-right text-xs text-green-600'>
                        {formatCurrency(detail.meal_allowance)}
                      </TableCell>
                      <TableCell className='text-right text-xs text-green-600'>
                        {formatCurrency(detail.bonus)}
                      </TableCell>
                      <TableCell className='text-right text-xs text-green-600'>
                        {formatCurrency(detail.overtime_amount)}
                      </TableCell>
                      <TableCell className='text-right text-xs text-red-600'>
                        {formatCurrency(detail.loan_deduction)}
                      </TableCell>
                      <TableCell className='text-right text-xs text-red-600'>
                        {formatCurrency(detail.other_deduction)}
                      </TableCell>
                      <TableCell className='text-right text-xs font-medium'>
                        {formatCurrency(detail.total_amount)}
                      </TableCell>
                      <TableCell className='text-center'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleViewPayslip(detail.employee_id)}
                          className='h-7 text-xs'
                        >
                          <Eye className='h-3 w-3 mr-1' />
                          Payslip
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
