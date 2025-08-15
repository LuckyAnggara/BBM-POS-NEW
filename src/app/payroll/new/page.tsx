'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/auth-context'
import { useBranches } from '@/contexts/branch-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
  Save,
  DollarSign,
  Users,
  Calculator,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import {
  type PayrollInput,
  type PayrollEmployeeInput,
  createPayroll,
  getEmployeesForPayroll,
} from '@/lib/laravel/payroll'
import { type Employee } from '@/lib/laravel/employee'
import { formatCurrency } from '@/lib/helper'

const payrollFormSchema = z.object({
  title: z.string().min(2, { message: 'Judul minimal 2 karakter.' }),
  description: z.string().optional(),
  payment_type: z.enum(['daily', 'monthly'], {
    required_error: 'Pilih jenis pembayaran.',
  }),
  payment_date: z
    .string()
    .min(1, { message: 'Tanggal pembayaran wajib diisi.' }),
  period_start: z
    .string()
    .min(1, { message: 'Tanggal mulai periode wajib diisi.' }),
  period_end: z
    .string()
    .min(1, { message: 'Tanggal akhir periode wajib diisi.' }),
  notes: z.string().optional(),
})

type PayrollFormValues = z.infer<typeof payrollFormSchema>

interface EmployeePayrollData extends Employee {
  selected: boolean
  base_salary: number
  meal_allowance: number
  bonus: number
  overtime_amount: number
  loan_deduction: number
  other_deduction: number
  total_amount: number
  notes: string
}

const PAYMENT_TYPE_OPTIONS = [
  { value: 'daily', label: 'Harian' },
  { value: 'monthly', label: 'Bulanan' },
]

export default function NewPayrollPage() {
  const router = useRouter()
  const { userData } = useAuth()
  const { selectedBranch, isLoadingBranches } = useBranches()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [employees, setEmployees] = useState<EmployeePayrollData[]>([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true)
  const [selectAll, setSelectAll] = useState(false)

  const form = useForm<PayrollFormValues>({
    resolver: zodResolver(payrollFormSchema),
    defaultValues: {
      title: '',
      description: '',
      payment_type: 'monthly',
      payment_date: new Date().toISOString().split('T')[0],
      period_start: new Date().toISOString().split('T')[0],
      period_end: new Date().toISOString().split('T')[0],
      notes: '',
    },
  })

  const paymentType = form.watch('payment_type')

  useEffect(() => {
    if (selectedBranch?.id) {
      loadEmployees()
    }
  }, [selectedBranch?.id])

  const loadEmployees = async () => {
    try {
      setIsLoadingEmployees(true)
      const employeesData = await getEmployeesForPayroll(selectedBranch!.id)

      const employeesWithPayrollData: EmployeePayrollData[] = employeesData.map(
        (emp) => ({
          ...emp,
          selected: false,
          base_salary:
            paymentType === 'daily' ? emp.daily_salary : emp.monthly_salary,
          meal_allowance:
            paymentType === 'daily'
              ? emp.daily_meal_allowance
              : emp.monthly_meal_allowance,
          bonus: emp.bonus,
          overtime_amount: 0,
          loan_deduction: emp.active_loan?.monthly_deduction || 0,
          other_deduction: 0,
          total_amount: 0,
          notes: '',
        })
      )

      setEmployees(employeesWithPayrollData)
    } catch (error) {
      toast.error('Error', { description: 'Gagal memuat data pegawai.' })
    } finally {
      setIsLoadingEmployees(false)
    }
  }

  useEffect(() => {
    if (employees.length > 0) {
      updateEmployeeSalaries()
    }
  }, [paymentType])

  const updateEmployeeSalaries = () => {
    setEmployees((prev) =>
      prev.map((emp) => ({
        ...emp,
        base_salary:
          paymentType === 'daily' ? emp.daily_salary : emp.monthly_salary,
        meal_allowance:
          paymentType === 'daily'
            ? emp.daily_meal_allowance
            : emp.monthly_meal_allowance,
      }))
    )
  }

  const calculateTotal = (emp: EmployeePayrollData) => {
    return (
      emp.base_salary +
      emp.meal_allowance +
      emp.bonus +
      emp.overtime_amount -
      emp.loan_deduction -
      emp.other_deduction
    )
  }

  const updateEmployee = (
    id: number,
    field: keyof EmployeePayrollData,
    value: any
  ) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === id) {
          const updated = { ...emp, [field]: value }
          if (field !== 'total_amount') {
            updated.total_amount = calculateTotal(updated)
          }
          return updated
        }
        return emp
      })
    )
  }

  const toggleSelectAll = () => {
    const newSelectAll = !selectAll
    setSelectAll(newSelectAll)
    setEmployees((prev) =>
      prev.map((emp) => ({ ...emp, selected: newSelectAll }))
    )
  }

  const toggleEmployee = (id: number) => {
    updateEmployee(
      id,
      'selected',
      !employees.find((e) => e.id === id)?.selected
    )

    // Update selectAll state
    const updatedEmployees = employees.map((emp) =>
      emp.id === id ? { ...emp, selected: !emp.selected } : emp
    )
    setSelectAll(updatedEmployees.every((emp) => emp.selected))
  }

  const onSubmit: SubmitHandler<PayrollFormValues> = async (values) => {
    if (!selectedBranch) {
      toast.error('Error', { description: 'Cabang tidak valid.' })
      return
    }

    const selectedEmployees = employees.filter((emp) => emp.selected)
    if (selectedEmployees.length === 0) {
      toast.error('Error', { description: 'Pilih minimal satu pegawai.' })
      return
    }

    try {
      setIsSubmitting(true)

      const employeeData: PayrollEmployeeInput[] = selectedEmployees.map(
        (emp) => ({
          employee_id: emp.id,
          base_salary: emp.base_salary,
          meal_allowance: emp.meal_allowance,
          bonus: emp.bonus,
          overtime_amount: emp.overtime_amount,
          loan_deduction: emp.loan_deduction,
          other_deduction: emp.other_deduction,
          notes: emp.notes,
        })
      )

      const payrollData: PayrollInput = {
        branch_id: selectedBranch.id,
        title: values.title,
        description: values.description,
        payment_type: values.payment_type,
        payment_date: values.payment_date,
        period_start: values.period_start,
        period_end: values.period_end,
        employees: employeeData,
        notes: values.notes,
      }

      await createPayroll(payrollData)

      toast.success('Berhasil', {
        description: 'Payroll berhasil dibuat.',
      })

      router.push('/payroll')
    } catch (error: any) {
      toast.error('Error', {
        description: error.response?.data?.message || 'Gagal membuat payroll.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedCount = employees.filter((emp) => emp.selected).length
  const totalAmount = employees
    .filter((emp) => emp.selected)
    .reduce((sum, emp) => sum + emp.total_amount, 0)

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
                  Buat Payroll Baru
                </h1>
              </div>
              <p className='text-sm text-muted-foreground'>
                Buat payroll untuk membayar beberapa pegawai sekaligus
              </p>
            </div>

            {/* Summary Card */}
            {selectedCount > 0 && (
              <div className='bg-white border rounded-lg p-4 min-w-[280px]'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <Calculator className='h-4 w-4 text-green-600' />
                    <span className='text-sm font-medium'>Ringkasan</span>
                  </div>
                  <CheckCircle2 className='h-4 w-4 text-green-600' />
                </div>
                <div className='space-y-1'>
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted-foreground'>
                      Pegawai terpilih:
                    </span>
                    <span className='font-medium'>{selectedCount}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-sm text-muted-foreground'>
                      Total pembayaran:
                    </span>
                    <span className='font-bold text-green-600'>
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            {/* Payroll Information */}
            <div className='bg-white border rounded-lg shadow-sm'>
              <div className='p-6 border-b'>
                <div className='flex items-center gap-2'>
                  <FileText className='h-5 w-5 text-primary' />
                  <h2 className='text-lg font-semibold'>Informasi Payroll</h2>
                </div>
                <p className='text-sm text-muted-foreground mt-1'>
                  Atur detail payroll dan periode pembayaran
                </p>
              </div>
              <div className='p-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                  <div className='space-y-2'>
                    <Label htmlFor='title' className='text-sm font-medium'>
                      Judul Payroll <span className='text-destructive'>*</span>
                    </Label>
                    <Input
                      id='title'
                      {...form.register('title')}
                      className='h-9'
                      placeholder='Contoh: Gaji Bulanan Februari 2024'
                    />
                    {form.formState.errors.title && (
                      <p className='text-xs text-destructive flex items-center gap-1'>
                        <AlertCircle className='h-3 w-3' />
                        {form.formState.errors.title.message}
                      </p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label
                      htmlFor='payment_type'
                      className='text-sm font-medium'
                    >
                      Jenis Pembayaran{' '}
                      <span className='text-destructive'>*</span>
                    </Label>
                    <Controller
                      name='payment_type'
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className='h-9'>
                            <SelectValue placeholder='Pilih jenis pembayaran' />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_TYPE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                <div className='flex items-center gap-2'>
                                  <Clock className='h-3 w-3' />
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.payment_type && (
                      <p className='text-xs text-destructive flex items-center gap-1'>
                        <AlertCircle className='h-3 w-3' />
                        {form.formState.errors.payment_type.message}
                      </p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label
                      htmlFor='payment_date'
                      className='text-sm font-medium'
                    >
                      Tanggal Pembayaran{' '}
                      <span className='text-destructive'>*</span>
                    </Label>
                    <Input
                      id='payment_date'
                      type='date'
                      {...form.register('payment_date')}
                      className='h-9'
                    />
                    {form.formState.errors.payment_date && (
                      <p className='text-xs text-destructive flex items-center gap-1'>
                        <AlertCircle className='h-3 w-3' />
                        {form.formState.errors.payment_date.message}
                      </p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label
                      htmlFor='period_start'
                      className='text-sm font-medium'
                    >
                      Periode Mulai <span className='text-destructive'>*</span>
                    </Label>
                    <Input
                      id='period_start'
                      type='date'
                      {...form.register('period_start')}
                      className='h-9'
                    />
                    {form.formState.errors.period_start && (
                      <p className='text-xs text-destructive flex items-center gap-1'>
                        <AlertCircle className='h-3 w-3' />
                        {form.formState.errors.period_start.message}
                      </p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='period_end' className='text-sm font-medium'>
                      Periode Berakhir{' '}
                      <span className='text-destructive'>*</span>
                    </Label>
                    <Input
                      id='period_end'
                      type='date'
                      {...form.register('period_end')}
                      className='h-9'
                    />
                    {form.formState.errors.period_end && (
                      <p className='text-xs text-destructive flex items-center gap-1'>
                        <AlertCircle className='h-3 w-3' />
                        {form.formState.errors.period_end.message}
                      </p>
                    )}
                  </div>

                  <div className='space-y-2 md:col-span-2 lg:col-span-1'>
                    <Label
                      htmlFor='description'
                      className='text-sm font-medium'
                    >
                      Deskripsi
                    </Label>
                    <Textarea
                      id='description'
                      {...form.register('description')}
                      className='min-h-[36px] resize-none'
                      placeholder='Deskripsi payroll (opsional)'
                      rows={1}
                    />
                  </div>

                  <div className='space-y-2 md:col-span-2 lg:col-span-3'>
                    <Label htmlFor='notes' className='text-sm font-medium'>
                      Catatan
                    </Label>
                    <Textarea
                      id='notes'
                      {...form.register('notes')}
                      className='min-h-[72px] resize-none'
                      placeholder='Catatan tambahan untuk payroll ini'
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Employee Selection */}
            <div className='bg-white border rounded-lg shadow-sm'>
              <div className='p-6 border-b'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Users className='h-5 w-5 text-primary' />
                    <h2 className='text-lg font-semibold'>Pilih Pegawai</h2>
                    {selectedCount > 0 && (
                      <Badge variant='secondary' className='ml-2'>
                        {selectedCount} terpilih
                      </Badge>
                    )}
                  </div>

                  {paymentType && (
                    <Badge variant='outline' className='text-xs'>
                      <Clock className='h-3 w-3 mr-1' />
                      Pembayaran{' '}
                      {
                        PAYMENT_TYPE_OPTIONS.find(
                          (opt) => opt.value === paymentType
                        )?.label
                      }
                    </Badge>
                  )}
                </div>
                <p className='text-sm text-muted-foreground mt-1'>
                  Pilih pegawai yang akan dibayar dan sesuaikan nominal sesuai
                  kebutuhan
                </p>
              </div>

              <div className='p-6'>
                {isLoadingEmployees ? (
                  <div className='space-y-4'>
                    <div className='flex items-center space-x-2'>
                      <Skeleton className='h-4 w-4' />
                      <Skeleton className='h-4 w-32' />
                    </div>
                    <div className='space-y-2'>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className='h-16 w-full' />
                      ))}
                    </div>
                  </div>
                ) : employees.length === 0 ? (
                  <div className='text-center py-12'>
                    <Users className='mx-auto h-12 w-12 text-muted-foreground mb-4' />
                    <h3 className='text-lg font-medium text-muted-foreground mb-2'>
                      Tidak ada pegawai tersedia
                    </h3>
                    <p className='text-sm text-muted-foreground'>
                      Belum ada data pegawai untuk cabang ini.
                    </p>
                  </div>
                ) : (
                  <div className='space-y-4'>
                    {/* Select All */}
                    <div className='flex items-center space-x-3 p-3 bg-muted/30 rounded-lg border'>
                      <Checkbox
                        id='select-all'
                        checked={selectAll}
                        onCheckedChange={toggleSelectAll}
                        className='data-[state=checked]:bg-primary'
                      />
                      <label
                        htmlFor='select-all'
                        className='text-sm font-medium leading-none cursor-pointer flex-1'
                      >
                        Pilih Semua Pegawai ({employees.length})
                      </label>
                      {employees.length > 0 && (
                        <div className='text-xs text-muted-foreground'>
                          Total potensi:{' '}
                          {formatCurrency(
                            employees.reduce(
                              (sum, emp) => sum + calculateTotal(emp),
                              0
                            )
                          )}
                        </div>
                      )}
                    </div>

                    {/* Employee Table */}
                    <div className='border rounded-lg overflow-hidden'>
                      <div className='overflow-x-auto'>
                        <Table>
                          <TableHeader>
                            <TableRow className='bg-muted/50'>
                              <TableHead className='w-12 text-xs'>
                                Pilih
                              </TableHead>
                              <TableHead className='text-xs font-medium'>
                                Pegawai
                              </TableHead>
                              <TableHead className='text-xs font-medium'>
                                Posisi
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
                                Total
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {employees.map((employee) => (
                              <TableRow
                                key={employee.id}
                                className={`hover:bg-muted/50 ${
                                  employee.selected ? 'bg-blue-50/50' : ''
                                }`}
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={employee.selected}
                                    onCheckedChange={() =>
                                      toggleEmployee(employee.id)
                                    }
                                    className='data-[state=checked]:bg-primary'
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className='min-w-0'>
                                    <div className='font-medium text-sm truncate'>
                                      {employee.name}
                                    </div>
                                    <div className='text-xs text-muted-foreground'>
                                      {employee.employee_code}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant='outline' className='text-xs'>
                                    {employee.position}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type='number'
                                    value={employee.base_salary}
                                    onChange={(e) =>
                                      updateEmployee(
                                        employee.id,
                                        'base_salary',
                                        Number(e.target.value)
                                      )
                                    }
                                    className='w-24 h-8 text-xs text-right'
                                    min='0'
                                    disabled={!employee.selected}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type='number'
                                    value={employee.meal_allowance}
                                    onChange={(e) =>
                                      updateEmployee(
                                        employee.id,
                                        'meal_allowance',
                                        Number(e.target.value)
                                      )
                                    }
                                    className='w-24 h-8 text-xs text-right'
                                    min='0'
                                    disabled={!employee.selected}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type='number'
                                    value={employee.bonus}
                                    onChange={(e) =>
                                      updateEmployee(
                                        employee.id,
                                        'bonus',
                                        Number(e.target.value)
                                      )
                                    }
                                    className='w-24 h-8 text-xs text-right'
                                    min='0'
                                    disabled={!employee.selected}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type='number'
                                    value={employee.overtime_amount}
                                    onChange={(e) =>
                                      updateEmployee(
                                        employee.id,
                                        'overtime_amount',
                                        Number(e.target.value)
                                      )
                                    }
                                    className='w-24 h-8 text-xs text-right'
                                    min='0'
                                    disabled={!employee.selected}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type='number'
                                    value={employee.loan_deduction}
                                    onChange={(e) =>
                                      updateEmployee(
                                        employee.id,
                                        'loan_deduction',
                                        Number(e.target.value)
                                      )
                                    }
                                    className='w-24 h-8 text-xs text-right'
                                    min='0'
                                    disabled={!employee.selected}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type='number'
                                    value={employee.other_deduction}
                                    onChange={(e) =>
                                      updateEmployee(
                                        employee.id,
                                        'other_deduction',
                                        Number(e.target.value)
                                      )
                                    }
                                    className='w-24 h-8 text-xs text-right'
                                    min='0'
                                    disabled={!employee.selected}
                                  />
                                </TableCell>
                                <TableCell className='text-right'>
                                  <span
                                    className={`text-sm font-medium ${
                                      employee.selected
                                        ? 'text-green-600'
                                        : 'text-muted-foreground'
                                    }`}
                                  >
                                    {formatCurrency(employee.total_amount)}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Info Alert */}
                    {paymentType && (
                      <div className='flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
                        <Info className='h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0' />
                        <div className='text-xs text-blue-800'>
                          <p className='font-medium mb-1'>Tips Penggunaan:</p>
                          <ul className='space-y-1 text-blue-700'>
                            <li>
                              • Nilai gaji dan tunjangan akan otomatis terisi
                              sesuai jenis pembayaran yang dipilih
                            </li>
                            <li>
                              • Anda dapat mengubah nominal untuk setiap pegawai
                              sesuai kebutuhan
                            </li>
                            <li>
                              • Potongan pinjaman diambil dari data pinjaman
                              aktif pegawai
                            </li>
                            <li>
                              • Pastikan semua data sudah benar sebelum
                              menyimpan payroll
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className='flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t'>
              <div className='text-sm text-muted-foreground'>
                {selectedCount > 0 ? (
                  <span>
                    {selectedCount} pegawai terpilih • Total:{' '}
                    {formatCurrency(totalAmount)}
                  </span>
                ) : (
                  <span>Pilih minimal 1 pegawai untuk melanjutkan</span>
                )}
              </div>

              <div className='flex gap-3'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                  className='h-9'
                >
                  Batal
                </Button>
                <Button
                  type='submit'
                  disabled={isSubmitting || selectedCount === 0}
                  className='h-9 flex items-center gap-2'
                >
                  <Save className='h-4 w-4' />
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Payroll'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
