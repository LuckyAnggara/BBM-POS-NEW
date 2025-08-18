'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/auth-context'
import { useBranches } from '@/contexts/branch-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, UserPlus } from 'lucide-react'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { type EmployeeInput, createEmployee } from '@/lib/laravel/employee'

const employeeFormSchema = z.object({
  name: z.string().min(2, { message: 'Nama minimal 2 karakter.' }),
  email: z
    .string()
    .email({ message: 'Format email tidak valid.' })
    .optional()
    .or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  position: z.string().min(2, { message: 'Posisi minimal 2 karakter.' }),
  is_sales: z.boolean().default(false),
  employment_type: z.enum(['full_time', 'part_time', 'contract'], {
    required_error: 'Pilih jenis kepegawaian.',
  }),
  daily_salary: z.number().min(0, { message: 'Gaji harian harus positif.' }),
  monthly_salary: z.number().min(0, { message: 'Gaji bulanan harus positif.' }),
  daily_meal_allowance: z
    .number()
    .min(0, { message: 'Uang makan harian harus positif.' }),
  monthly_meal_allowance: z
    .number()
    .min(0, { message: 'Uang makan bulanan harus positif.' }),
  bonus: z.number().min(0, { message: 'Bonus harus positif.' }),
  hire_date: z.string().min(1, { message: 'Tanggal masuk wajib diisi.' }),
  status: z.enum(['active', 'inactive', 'terminated']).default('active'),
  notes: z.string().optional(),
})

type EmployeeFormValues = z.infer<typeof employeeFormSchema>

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Karyawan Tetap' },
  { value: 'part_time', label: 'Paruh Waktu' },
  { value: 'contract', label: 'Kontrak' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Tidak Aktif' },
  { value: 'terminated', label: 'Berhenti' },
]

export default function NewEmployeePage() {
  const router = useRouter()
  const { userData } = useAuth()
  const { selectedBranch, isLoadingBranches } = useBranches()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      position: '',
      is_sales: false,
      employment_type: 'full_time',
      daily_salary: 0,
      monthly_salary: 0,
      daily_meal_allowance: 0,
      monthly_meal_allowance: 0,
      bonus: 0,
      hire_date: new Date().toISOString().split('T')[0],
      status: 'active',
      notes: '',
    },
  })

  const onSubmit: SubmitHandler<EmployeeFormValues> = async (values) => {
    if (!selectedBranch) {
      toast.error('Error', { description: 'Cabang tidak valid.' })
      return
    }

    setIsSubmitting(true)

    const employeeData: EmployeeInput = {
      ...values,
      branch_id: selectedBranch.id,
      email: values.email || undefined,
      phone: values.phone || undefined,
      address: values.address || undefined,
      notes: values.notes || undefined,
    }

    try {
      const result = await createEmployee(employeeData)
      toast.success('Pegawai Berhasil Ditambahkan', {
        description: `${result.name} telah ditambahkan ke sistem.`,
      })
      router.push('/employees')
    } catch (error: any) {
      console.error('Gagal menambah pegawai:', error)

      let errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'

      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
        const firstErrorKey = Object.keys(validationErrors)[0]
        errorMessage = validationErrors[firstErrorKey][0]
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }

      toast.error('Gagal Menambah Pegawai', {
        description: errorMessage,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingBranches && !selectedBranch) {
    return (
      <MainLayout>
        <div className='flex h-full items-center justify-center'>
          Memuat data cabang...
        </div>
      </MainLayout>
    )
  }

  if (!selectedBranch && userData?.role === 'admin') {
    return (
      <MainLayout>
        <div className='p-4 text-center'>
          Silakan pilih cabang dari sidebar untuk menambah pegawai.
        </div>
      </MainLayout>
    )
  }

  if (!selectedBranch && userData?.role === 'cashier') {
    return (
      <MainLayout>
        <div className='p-4 text-center text-destructive'>
          Anda tidak terhubung ke cabang. Hubungi admin.
        </div>
      </MainLayout>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-4'>
          <div className='flex items-center gap-3'>
            <Button
              variant='outline'
              size='icon'
              className='h-9 w-9'
              onClick={() => router.back()}
            >
              <ArrowLeft className='h-4 w-4' />
            </Button>
            <h1 className='text-xl md:text-2xl font-semibold font-headline'>
              Tambah Pegawai Baru
            </h1>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle className='text-lg flex items-center gap-2'>
                  <UserPlus className='h-5 w-5' />
                  Informasi Dasar
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='name' className='text-sm'>
                      Nama Lengkap *
                    </Label>
                    <Input
                      id='name'
                      {...form.register('name')}
                      className='text-sm'
                      placeholder='Masukkan nama lengkap'
                    />
                    {form.formState.errors.name && (
                      <p className='text-xs text-destructive'>
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='email' className='text-sm'>
                      Email
                    </Label>
                    <Input
                      id='email'
                      type='email'
                      {...form.register('email')}
                      className='text-sm'
                      placeholder='email@example.com'
                    />
                    {form.formState.errors.email && (
                      <p className='text-xs text-destructive'>
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='phone' className='text-sm'>
                      Nomor Telepon
                    </Label>
                    <Input
                      id='phone'
                      {...form.register('phone')}
                      className='text-sm'
                      placeholder='08xxxxxxxxxx'
                    />
                    {form.formState.errors.phone && (
                      <p className='text-xs text-destructive'>
                        {form.formState.errors.phone.message}
                      </p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='position' className='text-sm'>
                      Posisi/Jabatan *
                    </Label>
                    <Input
                      id='position'
                      {...form.register('position')}
                      className='text-sm'
                      placeholder='Kasir, Manager, dll'
                    />
                    {form.formState.errors.position && (
                      <p className='text-xs text-destructive'>
                        {form.formState.errors.position.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className='space-y-3'>
                  <div className='flex items-center space-x-2'>
                    <Checkbox id='is_sales' {...form.register('is_sales')} />
                    <Label htmlFor='is_sales' className='text-sm'>
                      Sales (Apakah pegawai ini bertugas sebagai sales?)
                    </Label>
                  </div>
                  {form.formState.errors.is_sales && (
                    <p className='text-xs text-destructive'>
                      {form.formState.errors.is_sales.message}
                    </p>
                  )}
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='address' className='text-sm'>
                    Alamat
                  </Label>
                  <Textarea
                    id='address'
                    {...form.register('address')}
                    className='text-sm'
                    placeholder='Alamat lengkap'
                    rows={3}
                  />
                  {form.formState.errors.address && (
                    <p className='text-xs text-destructive'>
                      {form.formState.errors.address.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-lg'>Informasi Kepegawaian</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='employment_type' className='text-sm'>
                      Jenis Kepegawaian *
                    </Label>
                    <Controller
                      name='employment_type'
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className='text-sm'>
                            <SelectValue placeholder='Pilih jenis kepegawaian' />
                          </SelectTrigger>
                          <SelectContent>
                            {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                                className='text-sm'
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.employment_type && (
                      <p className='text-xs text-destructive'>
                        {form.formState.errors.employment_type.message}
                      </p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='status' className='text-sm'>
                      Status *
                    </Label>
                    <Controller
                      name='status'
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className='text-sm'>
                            <SelectValue placeholder='Pilih status' />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                                className='text-sm'
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.status && (
                      <p className='text-xs text-destructive'>
                        {form.formState.errors.status.message}
                      </p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='daily_salary' className='text-sm'>
                      Gaji Harian (Rp) *
                    </Label>
                    <Input
                      id='daily_salary'
                      type='number'
                      min='0'
                      step='1000'
                      {...form.register('daily_salary', {
                        valueAsNumber: true,
                      })}
                      className='text-sm'
                      placeholder='0'
                    />
                    {form.formState.errors.daily_salary && (
                      <p className='text-xs text-destructive'>
                        {form.formState.errors.daily_salary.message}
                      </p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='monthly_salary' className='text-sm'>
                      Gaji Bulanan (Rp) *
                    </Label>
                    <Input
                      id='monthly_salary'
                      type='number'
                      min='0'
                      step='10000'
                      {...form.register('monthly_salary', {
                        valueAsNumber: true,
                      })}
                      className='text-sm'
                      placeholder='0'
                    />
                    {form.formState.errors.monthly_salary && (
                      <p className='text-xs text-destructive'>
                        {form.formState.errors.monthly_salary.message}
                      </p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='daily_meal_allowance' className='text-sm'>
                      Uang Makan Harian (Rp)
                    </Label>
                    <Input
                      id='daily_meal_allowance'
                      type='number'
                      min='0'
                      step='1000'
                      {...form.register('daily_meal_allowance', {
                        valueAsNumber: true,
                      })}
                      className='text-sm'
                      placeholder='0'
                    />
                    {form.formState.errors.daily_meal_allowance && (
                      <p className='text-xs text-destructive'>
                        {form.formState.errors.daily_meal_allowance.message}
                      </p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='monthly_meal_allowance' className='text-sm'>
                      Uang Makan Bulanan (Rp)
                    </Label>
                    <Input
                      id='monthly_meal_allowance'
                      type='number'
                      min='0'
                      step='10000'
                      {...form.register('monthly_meal_allowance', {
                        valueAsNumber: true,
                      })}
                      className='text-sm'
                      placeholder='0'
                    />
                    {form.formState.errors.monthly_meal_allowance && (
                      <p className='text-xs text-destructive'>
                        {form.formState.errors.monthly_meal_allowance.message}
                      </p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='bonus' className='text-sm'>
                      Bonus (Rp)
                    </Label>
                    <Input
                      id='bonus'
                      type='number'
                      min='0'
                      step='10000'
                      {...form.register('bonus', {
                        valueAsNumber: true,
                      })}
                      className='text-sm'
                      placeholder='0'
                    />
                    {form.formState.errors.bonus && (
                      <p className='text-xs text-destructive'>
                        {form.formState.errors.bonus.message}
                      </p>
                    )}
                  </div>

                  <div className='space-y-2 md:col-span-2'>
                    <Label htmlFor='hire_date' className='text-sm'>
                      Tanggal Masuk *
                    </Label>
                    <Input
                      id='hire_date'
                      type='date'
                      {...form.register('hire_date')}
                      className='text-sm'
                    />
                    {form.formState.errors.hire_date && (
                      <p className='text-xs text-destructive'>
                        {form.formState.errors.hire_date.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='notes' className='text-sm'>
                    Catatan
                  </Label>
                  <Textarea
                    id='notes'
                    {...form.register('notes')}
                    className='text-sm'
                    placeholder='Catatan tambahan tentang pegawai'
                    rows={3}
                  />
                  {form.formState.errors.notes && (
                    <p className='text-xs text-destructive'>
                      {form.formState.errors.notes.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className='flex justify-end gap-3'>
              <Button
                type='button'
                variant='outline'
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting ? (
                  <>Menyimpan...</>
                ) : (
                  <>
                    <Save className='mr-2 h-4 w-4' />
                    Simpan Pegawai
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
