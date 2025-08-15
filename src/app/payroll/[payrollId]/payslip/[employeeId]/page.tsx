'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Download, Printer, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { getEmployeePayslip, type EmployeePayslip } from '@/lib/laravel/payroll'

export default function PayslipPage() {
  const params = useParams()
  const router = useRouter()
  const [payslipData, setPayslipData] = useState<EmployeePayslip | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPayslip()
  }, [params.payrollId, params.employeeId])

  const loadPayslip = async () => {
    try {
      setIsLoading(true)
      const data = await getEmployeePayslip(
        Number(params.payrollId),
        Number(params.employeeId)
      )
      setPayslipData(data)
    } catch (error) {
      toast.error('Error', { description: 'Gagal memuat data payslip.' })
      router.back()
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateString))
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // Implement PDF download functionality
    toast.info('Info', {
      description: 'Fitur download PDF akan segera tersedia.',
    })
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className='container mx-auto px-4 py-6 max-w-4xl'>
            <div className='text-center py-8'>Memuat data payslip...</div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  if (!payslipData) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className='container mx-auto px-4 py-6 max-w-4xl'>
            <div className='text-center py-8'>
              <p>Data payslip tidak ditemukan.</p>
              <Button onClick={() => router.back()} className='mt-4'>
                Kembali
              </Button>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  const { employee, payroll, payroll_detail, branch } = payslipData

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='container mx-auto px-4 py-6 max-w-4xl'>
          {/* Header Controls - Hidden in print */}
          <div className='flex items-center justify-between mb-6 print:hidden'>
            <div className='flex items-center gap-4'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => router.back()}
                className='flex items-center gap-2'
              >
                <ArrowLeft className='h-4 w-4' />
                Kembali
              </Button>
              <div className='flex items-center gap-2'>
                <FileText className='h-5 w-5 text-primary' />
                <h1 className='text-2xl font-bold'>Slip Gaji</h1>
              </div>
            </div>

            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleDownload}
                className='flex items-center gap-2'
              >
                <Download className='h-4 w-4' />
                Download
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={handlePrint}
                className='flex items-center gap-2'
              >
                <Printer className='h-4 w-4' />
                Cetak
              </Button>
            </div>
          </div>

          {/* Payslip Content */}
          <div className='bg-white print:shadow-none'>
            <Card className='print:shadow-none print:border-0'>
              <CardHeader className='text-center border-b'>
                <div className='space-y-2'>
                  <h1 className='text-2xl font-bold text-gray-800'>
                    {branch.name}
                  </h1>
                  {branch.address && (
                    <p className='text-sm text-gray-600'>{branch.address}</p>
                  )}
                  {(branch.phone || branch.email) && (
                    <p className='text-sm text-gray-600'>
                      {[branch.phone, branch.email].filter(Boolean).join(' | ')}
                    </p>
                  )}
                  <h2 className='text-xl font-semibold text-primary mt-4'>
                    SLIP GAJI
                  </h2>
                </div>
              </CardHeader>

              <CardContent className='space-y-6 p-6'>
                {/* Employee Information */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div className='space-y-3'>
                    <h3 className='font-semibold text-gray-800 border-b pb-2'>
                      INFORMASI PEGAWAI
                    </h3>
                    <div className='space-y-2 text-sm'>
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Nama:</span>
                        <span className='font-medium'>{employee.name}</span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Kode Pegawai:</span>
                        <span className='font-medium'>
                          {employee.employee_code}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Posisi:</span>
                        <span className='font-medium'>{employee.position}</span>
                      </div>
                      {employee.department && (
                        <div className='flex justify-between'>
                          <span className='text-gray-600'>Departemen:</span>
                          <span className='font-medium'>
                            {employee.department}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className='space-y-3'>
                    <h3 className='font-semibold text-gray-800 border-b pb-2'>
                      INFORMASI PAYROLL
                    </h3>
                    <div className='space-y-2 text-sm'>
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Judul:</span>
                        <span className='font-medium'>{payroll.title}</span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Jenis:</span>
                        <span className='font-medium'>
                          {payroll.payment_type === 'daily'
                            ? 'Harian'
                            : 'Bulanan'}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Periode:</span>
                        <span className='font-medium'>
                          {formatDate(payroll.period_start)} -{' '}
                          {formatDate(payroll.period_end)}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Tanggal Bayar:</span>
                        <span className='font-medium'>
                          {formatDate(payroll.payment_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Salary Details */}
                <div className='space-y-4'>
                  <h3 className='font-semibold text-gray-800 border-b pb-2'>
                    RINCIAN GAJI
                  </h3>

                  {/* Income Section */}
                  <div className='bg-green-50 p-4 rounded-lg'>
                    <h4 className='font-medium text-green-800 mb-3'>
                      PENDAPATAN
                    </h4>
                    <div className='space-y-2 text-sm'>
                      <div className='flex justify-between'>
                        <span>Gaji Pokok:</span>
                        <span className='font-medium'>
                          {formatCurrency(payroll_detail.base_salary)}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span>Uang Makan:</span>
                        <span className='font-medium'>
                          {formatCurrency(payroll_detail.meal_allowance)}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span>Bonus:</span>
                        <span className='font-medium'>
                          {formatCurrency(payroll_detail.bonus)}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span>Lembur:</span>
                        <span className='font-medium'>
                          {formatCurrency(payroll_detail.overtime_amount)}
                        </span>
                      </div>
                      <div className='border-t pt-2 flex justify-between font-medium'>
                        <span>Total Pendapatan:</span>
                        <span className='text-green-700'>
                          {formatCurrency(
                            payroll_detail.base_salary +
                              payroll_detail.meal_allowance +
                              payroll_detail.bonus +
                              payroll_detail.overtime_amount
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Deduction Section */}
                  <div className='bg-red-50 p-4 rounded-lg'>
                    <h4 className='font-medium text-red-800 mb-3'>POTONGAN</h4>
                    <div className='space-y-2 text-sm'>
                      <div className='flex justify-between'>
                        <span>Potongan Pinjaman:</span>
                        <span className='font-medium'>
                          {formatCurrency(payroll_detail.loan_deduction)}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span>Potongan Lainnya:</span>
                        <span className='font-medium'>
                          {formatCurrency(payroll_detail.other_deduction)}
                        </span>
                      </div>
                      <div className='border-t pt-2 flex justify-between font-medium'>
                        <span>Total Potongan:</span>
                        <span className='text-red-700'>
                          {formatCurrency(
                            payroll_detail.loan_deduction +
                              payroll_detail.other_deduction
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Net Salary */}
                  <div className='bg-blue-50 p-4 rounded-lg border-2 border-blue-200'>
                    <div className='flex justify-between items-center'>
                      <span className='text-lg font-semibold text-blue-800'>
                        GAJI BERSIH:
                      </span>
                      <span className='text-2xl font-bold text-blue-800'>
                        {formatCurrency(payroll_detail.total_amount)}
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  {(payroll_detail.notes || payroll.notes) && (
                    <div className='space-y-3'>
                      <h4 className='font-medium text-gray-800'>CATATAN</h4>
                      {payroll_detail.notes && (
                        <div className='text-sm text-gray-600 bg-gray-50 p-3 rounded'>
                          <strong>Catatan Pegawai:</strong>{' '}
                          {payroll_detail.notes}
                        </div>
                      )}
                      {payroll.notes && (
                        <div className='text-sm text-gray-600 bg-gray-50 p-3 rounded'>
                          <strong>Catatan Payroll:</strong> {payroll.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className='mt-8 pt-6 border-t text-center'>
                  <p className='text-xs text-gray-500'>
                    Slip gaji ini dicetak pada{' '}
                    {formatDate(new Date().toISOString())}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Print styles */}
        <style jsx global>{`
          @media print {
            .print\\:hidden {
              display: none !important;
            }
            .print\\:shadow-none {
              box-shadow: none !important;
            }
            .print\\:border-0 {
              border: 0 !important;
            }
            body {
              font-size: 12px;
            }
            .container {
              max-width: none !important;
              padding: 0 !important;
            }
          }
        `}</style>
      </MainLayout>
    </ProtectedRoute>
  )
}
