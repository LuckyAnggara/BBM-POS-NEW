'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useBranches } from '@/contexts/branch-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
} from 'lucide-react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  type CustomerInput,
  type CustomerType,
  type CustomerTier,
  type CreditStatus,
  CUSTOMER_TYPES,
  CUSTOMER_TIERS,
  CREDIT_STATUSES,
} from '@/lib/types'
import { createCustomer } from '@/lib/laravel/customers'

const customerFormSchema = z.object({
  name: z.string().min(2, { message: 'Nama pelanggan minimal 2 karakter.' }),
  email: z
    .string()
    .email({ message: 'Format email tidak valid.' })
    .optional()
    .or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  // Customer Classification
  customer_type: z.enum(['individual', 'business']).default('individual'),
  customer_tier: z
    .enum(['regular', 'silver', 'gold', 'platinum'])
    .default('regular'),
  company_name: z.string().optional(),
  tax_id: z.string().optional(),
  business_type: z.string().optional(),
  // Credit Management
  credit_limit: z.number().min(0).default(0),
  payment_terms_days: z.number().min(0).max(365).default(0),
  credit_status: z.enum(['active', 'suspended', 'blocked']).default('active'),
})

type CustomerFormValues = z.infer<typeof customerFormSchema>

export default function AddCustomerPage() {
  const { selectedBranch } = useBranches()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const customerForm = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
      customer_type: 'individual',
      customer_tier: 'regular',
      company_name: '',
      tax_id: '',
      business_type: '',
      credit_limit: 0,
      payment_terms_days: 0,
      credit_status: 'active',
    },
  })

  const watchCustomerType = customerForm.watch('customer_type')

  const onSubmitCustomer: SubmitHandler<CustomerFormValues> = async (
    values
  ) => {
    if (!selectedBranch) {
      toast.error('Cabang tidak valid.')
      return
    }

    // Validation for business customers
    if (values.customer_type === 'business' && !values.company_name?.trim()) {
      toast.error('Nama perusahaan wajib diisi untuk pelanggan bisnis.')
      return
    }

    const customerData: CustomerInput = {
      ...values,
      branch_id: selectedBranch.id,
      // Convert empty strings to null for optional fields
      email: values.email || null,
      phone: values.phone || null,
      address: values.address || null,
      notes: values.notes || null,
      company_name: values.company_name || null,
      tax_id: values.tax_id || null,
      business_type: values.business_type || null,
      preferences: null,
      is_active: true,
    }

    try {
      setIsSubmitting(true)
      await createCustomer(customerData)
      toast.success('Pelanggan berhasil ditambahkan')
      router.push('/customers')
    } catch (error: any) {
      let errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'

      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
        const firstErrorKey = Object.keys(validationErrors)[0]
        errorMessage = validationErrors[firstErrorKey][0]
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }

      toast.error('Gagal Menambah Pelanggan', {
        description: errorMessage,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!selectedBranch) {
    return (
      <MainLayout>
        <div className='flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4'>
          <Building2 className='h-16 w-16 text-primary animate-pulse mb-4' />
          <h1 className='text-2xl font-semibold font-headline mb-2'>
            Berkah Baja Makmur
          </h1>
          <p className='text-sm text-muted-foreground'>Silakan tunggu...</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-6'>
          {/* Header */}
          <div className='flex items-center gap-3'>
            <User className='h-7 w-7 text-primary' />
            <div className='flex-1'>
              <h1 className='text-xl md:text-2xl font-semibold font-headline'>
                Tambah Pelanggan Baru
              </h1>
              <p className='text-sm text-muted-foreground'>
                Lengkapi informasi pelanggan untuk pencatatan yang lebih baik
              </p>
            </div>
            <Button variant='outline' size='sm' asChild>
              <Link href='/customers'>
                <ArrowLeft className='h-4 w-4 mr-2' />
                Kembali
              </Link>
            </Button>
          </div>

          <form onSubmit={customerForm.handleSubmit(onSubmitCustomer)}>
            <div className='grid gap-6 lg:grid-cols-2'>
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <User className='h-5 w-5' />
                    Informasi Dasar
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Informasi utama pelanggan
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div>
                    <Label htmlFor='name' className='text-xs'>
                      Nama Pelanggan*
                    </Label>
                    <Input
                      id='name'
                      {...customerForm.register('name')}
                      className='h-9 text-xs mt-1'
                      placeholder='Contoh: John Doe'
                    />
                    {customerForm.formState.errors.name && (
                      <p className='text-xs text-destructive mt-1'>
                        {customerForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <Label htmlFor='customer_type' className='text-xs'>
                        Jenis Pelanggan*
                      </Label>
                      <Select
                        name='customer_type'
                        value={customerForm.watch('customer_type')}
                        onValueChange={(value: CustomerType) =>
                          customerForm.setValue('customer_type', value)
                        }
                      >
                        <SelectTrigger className='h-9 text-xs mt-1'>
                          <SelectValue placeholder='Pilih jenis pelanggan' />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CUSTOMER_TYPES).map(
                            ([key, label]) => (
                              <SelectItem
                                key={key}
                                value={key}
                                className='text-xs'
                              >
                                {label}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor='customer_tier' className='text-xs'>
                        Tingkat Pelanggan
                      </Label>
                      <Select
                        name='customer_tier'
                        value={customerForm.watch('customer_tier')}
                        onValueChange={(value: CustomerTier) =>
                          customerForm.setValue('customer_tier', value)
                        }
                      >
                        <SelectTrigger className='h-9 text-xs mt-1'>
                          <SelectValue placeholder='Pilih tingkat' />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CUSTOMER_TIERS).map(
                            ([key, label]) => (
                              <SelectItem
                                key={key}
                                value={key}
                                className='text-xs'
                              >
                                {label}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Business-specific fields */}
                  {watchCustomerType === 'business' && (
                    <div className='space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200'>
                      <div className='flex items-center gap-2'>
                        <Building2 className='h-4 w-4 text-blue-600' />
                        <span className='text-xs font-medium text-blue-800'>
                          Informasi Perusahaan
                        </span>
                      </div>

                      <div>
                        <Label htmlFor='company_name' className='text-xs'>
                          Nama Perusahaan*
                        </Label>
                        <Input
                          id='company_name'
                          {...customerForm.register('company_name')}
                          className='h-9 text-xs mt-1'
                          placeholder='PT. Contoh Perusahaan'
                        />
                      </div>

                      <div className='grid grid-cols-2 gap-4'>
                        <div>
                          <Label htmlFor='tax_id' className='text-xs'>
                            NPWP
                          </Label>
                          <Input
                            id='tax_id'
                            {...customerForm.register('tax_id')}
                            className='h-9 text-xs mt-1'
                            placeholder='01.234.567.8-901.000'
                          />
                        </div>
                        <div>
                          <Label htmlFor='business_type' className='text-xs'>
                            Jenis Usaha
                          </Label>
                          <Input
                            id='business_type'
                            {...customerForm.register('business_type')}
                            className='h-9 text-xs mt-1'
                            placeholder='Trading, Manufacturing, dll'
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor='email' className='text-xs'>
                      Email
                    </Label>
                    <Input
                      id='email'
                      type='email'
                      {...customerForm.register('email')}
                      className='h-9 text-xs mt-1'
                      placeholder='john@example.com'
                    />
                    {customerForm.formState.errors.email && (
                      <p className='text-xs text-destructive mt-1'>
                        {customerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor='phone' className='text-xs'>
                      Nomor Telepon
                    </Label>
                    <Input
                      id='phone'
                      {...customerForm.register('phone')}
                      className='h-9 text-xs mt-1'
                      placeholder='08xxxxxxxxxx'
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <MapPin className='h-5 w-5' />
                    Informasi Kontak
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Detail alamat dan kontak
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div>
                    <Label htmlFor='address' className='text-xs'>
                      Alamat
                    </Label>
                    <Textarea
                      id='address'
                      {...customerForm.register('address')}
                      className='text-xs mt-1 min-h-[80px]'
                      placeholder='Alamat lengkap pelanggan'
                    />
                  </div>

                  <div className='p-4 bg-muted/50 rounded-lg'>
                    <div className='flex items-center gap-2 mb-2'>
                      <Building2 className='h-4 w-4 text-muted-foreground' />
                      <span className='text-xs font-medium'>Cabang</span>
                    </div>
                    <p className='text-sm font-medium'>{selectedBranch.name}</p>
                    <p className='text-xs text-muted-foreground'>
                      Pelanggan akan terdaftar di cabang ini
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Credit Management - Only for business customers */}
            {watchCustomerType === 'business' && (
              <Card className='mt-6'>
                <CardHeader>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <Building2 className='h-5 w-5' />
                    Manajemen Kredit
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Pengaturan kredit dan pembayaran untuk pelanggan bisnis
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <div>
                      <Label htmlFor='credit_limit' className='text-xs'>
                        Limit Kredit (Rp)
                      </Label>
                      <Input
                        id='credit_limit'
                        type='number'
                        min='0'
                        step='1000'
                        {...customerForm.register('credit_limit', {
                          valueAsNumber: true,
                        })}
                        className='h-9 text-xs mt-1'
                        placeholder='10000000'
                      />
                      <p className='text-xs text-muted-foreground mt-1'>
                        Maksimal piutang yang diizinkan
                      </p>
                    </div>

                    <div>
                      <Label htmlFor='payment_terms_days' className='text-xs'>
                        Termin Pembayaran (Hari)
                      </Label>
                      <Input
                        id='payment_terms_days'
                        type='number'
                        min='0'
                        max='365'
                        {...customerForm.register('payment_terms_days', {
                          valueAsNumber: true,
                        })}
                        className='h-9 text-xs mt-1'
                        placeholder='30'
                      />
                      <p className='text-xs text-muted-foreground mt-1'>
                        0 = Cash, 30 = NET 30, dll
                      </p>
                    </div>

                    <div>
                      <Label htmlFor='credit_status' className='text-xs'>
                        Status Kredit
                      </Label>
                      <Select
                        name='credit_status'
                        value={customerForm.watch('credit_status')}
                        onValueChange={(value: CreditStatus) =>
                          customerForm.setValue('credit_status', value)
                        }
                      >
                        <SelectTrigger className='h-9 text-xs mt-1'>
                          <SelectValue placeholder='Pilih status' />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CREDIT_STATUSES).map(
                            ([key, label]) => (
                              <SelectItem
                                key={key}
                                value={key}
                                className='text-xs'
                              >
                                {label}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className='p-4 bg-amber-50 rounded-lg border border-amber-200'>
                    <div className='flex items-start gap-2'>
                      <Building2 className='h-4 w-4 text-amber-600 mt-0.5' />
                      <div>
                        <p className='text-xs font-medium text-amber-800'>
                          Informasi Kredit
                        </p>
                        <p className='text-xs text-amber-700 mt-1'>
                          Pengaturan kredit hanya berlaku untuk pelanggan
                          bisnis. Limit kredit akan mengontrol maksimal piutang
                          yang diizinkan.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            <Card className='mt-6'>
              <CardHeader>
                <CardTitle className='text-base flex items-center gap-2'>
                  <FileText className='h-5 w-5' />
                  Catatan
                </CardTitle>
                <CardDescription className='text-xs'>
                  Informasi tambahan tentang pelanggan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  id='notes'
                  {...customerForm.register('notes')}
                  className='text-xs min-h-[100px]'
                  placeholder='Catatan tambahan tentang pelanggan, seperti preferensi, riwayat khusus, dll.'
                />
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className='flex justify-end gap-3 mt-6'>
              <Button type='button' variant='outline' asChild>
                <Link href='/customers'>Batal</Link>
              </Button>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan Pelanggan'}
              </Button>
            </div>
          </form>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
