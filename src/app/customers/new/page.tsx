'use client'

import React from 'react'
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
import { Separator } from '@/components/ui/separator'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import type { CustomerInput } from '@/lib/types'
import { createCustomer } from '@/lib/laravel/customers'
import {
  ArrowLeft,
  Users,
  Save,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
} from 'lucide-react'

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
})

type CustomerFormValues = z.infer<typeof customerFormSchema>

export default function AddCustomerPage() {
  const router = useRouter()
  const { selectedBranch } = useBranches()

  const customerForm = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
    },
  })

  const onSubmit: SubmitHandler<CustomerFormValues> = async (values) => {
    if (!selectedBranch) {
      toast.error('Cabang Tidak Dipilih', {
        description: 'Silakan pilih cabang terlebih dahulu.',
      })
      return
    }

    const customerData: CustomerInput = {
      name: values.name,
      email: values.email?.trim() || null,
      phone: values.phone?.trim() || null,
      address: values.address?.trim() || null,
      notes: values.notes?.trim() || null,
      branch_id: selectedBranch.id,
    }

    try {
      const result = await createCustomer(customerData)

      toast.success('Pelanggan Ditambahkan', {
        description: `${result.name} telah ditambahkan ke daftar pelanggan.`,
      })
      router.push('/customers')
    } catch (error: any) {
      console.error('Gagal menambah pelanggan:', error)

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
    }
  }

  if (!selectedBranch) {
    return (
      <MainLayout>
        <div className='flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4'>
          <Users className='h-16 w-16 text-primary animate-pulse mb-4' />
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
            <Button variant='ghost' size='sm' asChild>
              <Link href='/customers'>
                <ArrowLeft className='h-4 w-4' />
              </Link>
            </Button>
            <Users className='h-7 w-7 text-primary' />
            <div className='flex-1'>
              <h1 className='text-xl md:text-2xl font-semibold font-headline'>
                Tambah Pelanggan Baru
              </h1>
              <p className='text-sm text-muted-foreground'>
                Tambahkan informasi pelanggan untuk memudahkan transaksi
              </p>
            </div>
            <Button variant='outline' size='sm' asChild>
              <Link href='/customers'>
                <X className='h-4 w-4 mr-2' />
                Batal
              </Link>
            </Button>
          </div>

          {/* Main Form */}
          <div className='grid gap-6 lg:grid-cols-3'>
            {/* Customer Preview */}
            <Card className='lg:col-span-1'>
              <CardHeader>
                <CardTitle className='text-base font-semibold flex items-center gap-2'>
                  <User className='h-5 w-5 text-primary' />
                  Preview Pelanggan
                </CardTitle>
                <CardDescription className='text-xs'>
                  Pratinjau informasi pelanggan
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex items-center justify-center w-full h-32 bg-muted/50 rounded-lg border border-dashed'>
                  <div className='text-center'>
                    <User className='h-12 w-12 text-muted-foreground mx-auto mb-2' />
                    <p className='text-sm text-muted-foreground'>
                      {customerForm.watch('name') || 'Nama Pelanggan'}
                    </p>
                  </div>
                </div>

                <div className='space-y-3'>
                  <div>
                    <p className='text-xs text-muted-foreground'>
                      Nama Lengkap
                    </p>
                    <p className='font-medium'>
                      {customerForm.watch('name') || 'Belum diisi'}
                    </p>
                  </div>

                  <div className='grid grid-cols-1 gap-3'>
                    {customerForm.watch('email') && (
                      <div>
                        <p className='text-xs text-muted-foreground flex items-center gap-1'>
                          <Mail className='h-3 w-3' />
                          Email
                        </p>
                        <p className='text-sm break-all'>
                          {customerForm.watch('email')}
                        </p>
                      </div>
                    )}

                    {customerForm.watch('phone') && (
                      <div>
                        <p className='text-xs text-muted-foreground flex items-center gap-1'>
                          <Phone className='h-3 w-3' />
                          Telepon
                        </p>
                        <p className='text-sm'>{customerForm.watch('phone')}</p>
                      </div>
                    )}

                    {customerForm.watch('address') && (
                      <div>
                        <p className='text-xs text-muted-foreground flex items-center gap-1'>
                          <MapPin className='h-3 w-3' />
                          Alamat
                        </p>
                        <p className='text-sm'>
                          {customerForm.watch('address')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form Card */}
            <Card className='lg:col-span-2'>
              <CardHeader>
                <CardTitle className='text-base font-semibold flex items-center gap-2'>
                  <Users className='h-5 w-5 text-primary' />
                  Informasi Pelanggan
                </CardTitle>
                <CardDescription className='text-xs'>
                  Masukkan detail informasi pelanggan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={customerForm.handleSubmit(onSubmit)}
                  className='space-y-6'
                >
                  {/* Basic Information */}
                  <div className='space-y-4'>
                    <div className='flex items-center gap-2'>
                      <User className='h-4 w-4 text-primary' />
                      <h3 className='font-semibold text-sm'>Informasi Dasar</h3>
                    </div>
                    <Separator />

                    <div>
                      <Label
                        htmlFor='customerName'
                        className='text-sm font-medium'
                      >
                        Nama Lengkap*
                      </Label>
                      <Input
                        id='customerName'
                        {...customerForm.register('name')}
                        className='mt-1'
                        placeholder='Masukkan nama lengkap pelanggan'
                      />
                      {customerForm.formState.errors.name && (
                        <p className='text-xs text-destructive mt-1'>
                          {customerForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className='space-y-4'>
                    <div className='flex items-center gap-2'>
                      <Phone className='h-4 w-4 text-primary' />
                      <h3 className='font-semibold text-sm'>
                        Informasi Kontak
                      </h3>
                    </div>
                    <Separator />

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <div>
                        <Label
                          htmlFor='customerEmail'
                          className='text-sm font-medium'
                        >
                          Email
                        </Label>
                        <Input
                          id='customerEmail'
                          type='email'
                          {...customerForm.register('email')}
                          className='mt-1'
                          placeholder='customer@example.com'
                        />
                        {customerForm.formState.errors.email && (
                          <p className='text-xs text-destructive mt-1'>
                            {customerForm.formState.errors.email.message}
                          </p>
                        )}
                        <p className='text-xs text-muted-foreground mt-1'>
                          Opsional - untuk notifikasi dan promo
                        </p>
                      </div>

                      <div>
                        <Label
                          htmlFor='customerPhone'
                          className='text-sm font-medium'
                        >
                          Nomor Telepon
                        </Label>
                        <Input
                          id='customerPhone'
                          {...customerForm.register('phone')}
                          className='mt-1'
                          placeholder='08xx xxxx xxxx'
                        />
                        <p className='text-xs text-muted-foreground mt-1'>
                          Opsional - untuk komunikasi
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Address & Notes */}
                  <div className='space-y-4'>
                    <div className='flex items-center gap-2'>
                      <MapPin className='h-4 w-4 text-primary' />
                      <h3 className='font-semibold text-sm'>
                        Alamat & Catatan
                      </h3>
                    </div>
                    <Separator />

                    <div className='space-y-4'>
                      <div>
                        <Label
                          htmlFor='customerAddress'
                          className='text-sm font-medium'
                        >
                          Alamat
                        </Label>
                        <Textarea
                          id='customerAddress'
                          {...customerForm.register('address')}
                          className='mt-1'
                          placeholder='Alamat lengkap pelanggan...'
                          rows={3}
                        />
                        <p className='text-xs text-muted-foreground mt-1'>
                          Opsional - untuk pengiriman atau kunjungan
                        </p>
                      </div>

                      <div>
                        <Label
                          htmlFor='customerNotes'
                          className='text-sm font-medium'
                        >
                          Catatan
                        </Label>
                        <Textarea
                          id='customerNotes'
                          {...customerForm.register('notes')}
                          className='mt-1'
                          placeholder='Catatan khusus tentang pelanggan...'
                          rows={2}
                        />
                        <p className='text-xs text-muted-foreground mt-1'>
                          Opsional - preferensi, status VIP, dll
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className='flex flex-col sm:flex-row gap-3 pt-6'>
                    <Button
                      type='button'
                      variant='outline'
                      className='order-2 sm:order-1'
                      onClick={() => router.push('/customers')}
                      disabled={customerForm.formState.isSubmitting}
                    >
                      <X className='h-4 w-4 mr-2' />
                      Batal
                    </Button>
                    <Button
                      type='submit'
                      className='order-1 sm:order-2 flex-1'
                      disabled={customerForm.formState.isSubmitting}
                    >
                      {customerForm.formState.isSubmitting ? (
                        <>
                          <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2' />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <Save className='h-4 w-4 mr-2' />
                          Tambah Pelanggan
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
