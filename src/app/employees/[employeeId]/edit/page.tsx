'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
import { ArrowLeft, Save, User } from 'lucide-react'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import {
  type Employee,
  type EmployeeInput,
  getEmployeeById,
  updateEmployee,
} from '@/lib/laravel/employee'

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
  employment_type: z.enum(['full_time', 'part_time', 'contract'], {
    required_error: 'Pilih jenis kepegawaian.',
  }),
  daily_salary: z.number().min(0, { message: 'Gaji harian harus positif.' }),
  monthly_salary: z.number().min(0, { message: 'Gaji bulanan harus positif.' }),
  hire_date: z.string().min(1, { message: 'Tanggal masuk wajib diisi.' }),
  termination_date: z.string().optional(),
  status: z.enum(['active', 'inactive', 'terminated']),
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

export default function EditEmployeePage() {
  const router = useRouter()
  const params = useParams()
  const employeeId = Number(params.employeeId)
  const { userData } = useAuth()
  const { selectedBranch, isLoadingBranches } = useBranches()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [employee, setEmployee] = useState<Employee | null>(null)

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
  })

  useEffect(() => {
    const loadEmployee = async () => {
      if (!employeeId || isNaN(employeeId)) {
        toast.error('ID pegawai tidak valid')
        router.push('/employees')
        return
      }

      try {
        setIsLoading(true)
        const employeeData = await getEmployeeById(employeeId)
        setEmployee(employeeData)

        // Set form values
        form.reset({
          name: employeeData.name,
          email: employeeData.email || '',
          phone: employeeData.phone || '',
          address: employeeData.address || '',
          position: employeeData.position,
          employment_type: employeeData.employment_type,
          daily_salary: employeeData.daily_salary,
          monthly_salary: employeeData.monthly_salary,
          hire_date: employeeData.hire_date,
          termination_date: employeeData.termination_date || '',
          status: employeeData.status,
          notes: employeeData.notes || '',
        })
      } catch (error) {
        console.error('Error loading employee:', error)
        toast.error('Gagal memuat data pegawai')
        router.push('/employees')
      } finally {
        setIsLoading(false)
      }
    }

    loadEmployee()
  }, [employeeId, form, router])

  const onSubmit: SubmitHandler<EmployeeFormValues> = async (values) => {
    if (!selectedBranch || !employee) {
      toast.error('Error', { description: 'Data tidak lengkap.' })
      return
    }

    setIsSubmitting(true)

    const employeeData: Partial<EmployeeInput> = {
      ...values,
      email: values.email || undefined,
      phone: values.phone || undefined,
      address: values.address || undefined,
      termination_date: values.termination_date || undefined,
      notes: values.notes || undefined,
    }

    try {
      const result = await updateEmployee(employeeId, employeeData)
      toast.success('Pegawai Berhasil Diperbarui', {
        description: `Data ${result.name} telah diperbarui.`,
      })
      router.push('/employees')
    } catch (error: any) {
      console.error('Gagal memperbarui pegawai:', error)

      let errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'

      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
        const firstErrorKey = Object.keys(validationErrors)[0]
        errorMessage = validationErrors[firstErrorKey][0]
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }

      toast.error('Gagal Memperbarui Pegawai', {
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
          Silakan pilih cabang dari sidebar untuk mengedit pegawai.
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

  if (isLoading) {
    return (
      <MainLayout>
        <div className='space-y-4'>
          <div className='flex items-center gap-3'>
            <Skeleton className='h-9 w-9' />
            <Skeleton className='h-8 w-64' />
          </div>
          <div className='space-y-6'>
            <Skeleton className='h-48 w-full' />
            <Skeleton className='h-48 w-full' />
          </div>
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
              Edit Pegawai: {employee?.name}
            </h1>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle className='text-lg flex items-center gap-2'>
                  <User className='h-5 w-5' />
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
                          value={field.value}
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
                          value={field.value}
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

                  <div className='space-y-2'>
                    <Label htmlFor='termination_date' className='text-sm'>
                      Tanggal Berhenti
                    </Label>
                    <Input
                      id='termination_date'
                      type='date'
                      {...form.register('termination_date')}
                      className='text-sm'
                    />
                    {form.formState.errors.termination_date && (
                      <p className='text-xs text-destructive'>
                        {form.formState.errors.termination_date.message}
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
                    Simpan Perubahan
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
