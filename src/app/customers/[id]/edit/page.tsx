'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import type { Customer, CustomerInput } from '@/lib/types'
import { getCustomerById, updateCustomer } from '@/lib/laravel/customers'
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
  Edit3,
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

export default function EditCustomerPage() {
  const router = useRouter()
  const params = useParams()
  const customerId = params.id as string
  const { selectedBranch } = useBranches()

  // State
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

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

  // Fetch customer data
  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await getCustomerById(customerId)
        setCustomer(response)

        // Populate form with existing data
        customerForm.reset({
          name: response.name || '',
          email: response.email || '',
          phone: response.phone || '',
          address: response.address || '',
          notes: response.notes || '',
        })
      } catch (error: unknown) {
        console.error('Error fetching customer:', error)
        toast.error('Gagal memuat data pelanggan')
        router.push('/customers')
      } finally {
        setLoading(false)
      }
    }

    if (customerId) {
      fetchCustomer()
    }
  }, [customerId, customerForm, router])

  const onSubmit: SubmitHandler<CustomerFormValues> = async (values) => {
    if (!selectedBranch) {
      toast.error('Cabang Tidak Dipilih', {
        description: 'Silakan pilih cabang terlebih dahulu.',
      })
      return
    }

    if (!customer) {
      toast.error('Data pelanggan tidak ditemukan')
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
      const result = await updateCustomer(customer.id, customerData)

      toast.success('Pelanggan Diperbarui', {
        description: `Data ${result.name} telah berhasil diperbarui.`,
      })
      router.push(`/customers/${customerId}`)
    } catch (error: unknown) {
      console.error('Gagal memperbarui pelanggan:', error)

      let errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'

      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as any
        if (apiError.response?.data?.errors) {
          const validationErrors = apiError.response.data.errors
          const firstErrorKey = Object.keys(validationErrors)[0]
          errorMessage = validationErrors[firstErrorKey][0]
        } else if (apiError.response?.data?.message) {
          errorMessage = apiError.response.data.message
        }
      }

      toast.error('Gagal Memperbarui Pelanggan', {
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

  // Loading state
  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className='space-y-6'>
            {/* Header Skeleton */}
            <div className='flex items-center gap-3'>
              <Skeleton className='h-8 w-8' />
              <Skeleton className='h-7 w-7' />
              <div className='flex-1'>
                <Skeleton className='h-8 w-64 mb-2' />
                <Skeleton className='h-4 w-96' />
              </div>
              <Skeleton className='h-8 w-20' />
            </div>

            {/* Form Skeleton */}
            <div className='grid gap-6 lg:grid-cols-3'>
              <Card className='lg:col-span-1'>
                <CardHeader>
                  <Skeleton className='h-6 w-32' />
                  <Skeleton className='h-4 w-48' />
                </CardHeader>
                <CardContent>
                  <Skeleton className='h-32 w-full mb-4' />
                  <div className='space-y-3'>
                    <Skeleton className='h-4 w-full' />
                    <Skeleton className='h-4 w-3/4' />
                    <Skeleton className='h-4 w-2/3' />
                  </div>
                </CardContent>
              </Card>

              <Card className='lg:col-span-2'>
                <CardHeader>
                  <Skeleton className='h-6 w-40' />
                  <Skeleton className='h-4 w-64' />
                </CardHeader>
                <CardContent>
                  <div className='space-y-6'>
                    <Skeleton className='h-32 w-full' />
                    <Skeleton className='h-32 w-full' />
                    <Skeleton className='h-32 w-full' />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  // Customer not found
  if (!customer) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className='flex flex-col items-center justify-center min-h-[60vh] p-4'>
            <Users className='h-16 w-16 text-gray-400 mb-4' />
            <h2 className='text-xl font-semibold mb-2'>
              Pelanggan Tidak Ditemukan
            </h2>
            <p className='text-sm text-muted-foreground mb-6 text-center'>
              Pelanggan yang Anda cari tidak ditemukan atau telah dihapus.
            </p>
            <div className='flex gap-3'>
              <Button variant='outline' asChild>
                <Link href='/customers'>Kembali ke Daftar</Link>
              </Button>
              <Button asChild>
                <Link href='/customers/add'>Tambah Pelanggan Baru</Link>
              </Button>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-6'>
          {/* Header */}
          <div className='flex items-center gap-3'>
            <Button variant='outline' size='sm' asChild>
              <Link href={`/customers/${customerId}`}>
                <ArrowLeft className='h-4 w-4' />
              </Link>
            </Button>
            <Edit3 className='h-7 w-7 text-primary' />
            <div className='flex-1'>
              <h1 className='text-xl md:text-2xl font-semibold font-headline'>
                Edit Pelanggan
              </h1>
              <p className='text-sm text-muted-foreground'>
                Perbarui informasi pelanggan {customer.name}
              </p>
            </div>
            <Button variant='outline' size='sm' asChild>
              <Link href={`/customers/${customerId}`}>
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
                  Pratinjau perubahan informasi pelanggan
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex items-center justify-center w-full h-32 bg-muted/50 rounded-lg border border-dashed'>
                  <div className='text-center'>
                    <User className='h-12 w-12 text-muted-foreground mx-auto mb-2' />
                    <p className='text-sm text-muted-foreground'>
                      {customerForm.watch('name') || customer.name}
                    </p>
                  </div>
                </div>

                <div className='space-y-3'>
                  <div>
                    <p className='text-xs text-muted-foreground'>
                      Nama Lengkap
                    </p>
                    <p className='font-medium'>
                      {customerForm.watch('name') || customer.name}
                    </p>
                  </div>

                  <div className='grid grid-cols-1 gap-3'>
                    {(customerForm.watch('email') || customer.email) && (
                      <div>
                        <p className='text-xs text-muted-foreground flex items-center gap-1'>
                          <Mail className='h-3 w-3' />
                          Email
                        </p>
                        <p className='text-sm break-all'>
                          {customerForm.watch('email') || customer.email}
                        </p>
                      </div>
                    )}

                    {(customerForm.watch('phone') || customer.phone) && (
                      <div>
                        <p className='text-xs text-muted-foreground flex items-center gap-1'>
                          <Phone className='h-3 w-3' />
                          Telepon
                        </p>
                        <p className='text-sm'>
                          {customerForm.watch('phone') || customer.phone}
                        </p>
                      </div>
                    )}

                    {(customerForm.watch('address') || customer.address) && (
                      <div>
                        <p className='text-xs text-muted-foreground flex items-center gap-1'>
                          <MapPin className='h-3 w-3' />
                          Alamat
                        </p>
                        <p className='text-sm'>
                          {customerForm.watch('address') || customer.address}
                        </p>
                      </div>
                    )}

                    {(customerForm.watch('notes') || customer.notes) && (
                      <div>
                        <p className='text-xs text-muted-foreground flex items-center gap-1'>
                          <FileText className='h-3 w-3' />
                          Catatan
                        </p>
                        <p className='text-sm italic'>
                          {customerForm.watch('notes') || customer.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Info Card */}
                <div className='pt-4 border-t'>
                  <p className='text-xs text-muted-foreground mb-2'>
                    Informasi Pelanggan
                  </p>
                  <div className='space-y-2'>
                    <div className='flex justify-between text-xs'>
                      <span className='text-muted-foreground'>ID:</span>
                      <span className='font-medium'>{customer.id}</span>
                    </div>
                    <div className='flex justify-between text-xs'>
                      <span className='text-muted-foreground'>Bergabung:</span>
                      <span className='font-medium'>
                        {new Date(customer.created_at).toLocaleDateString(
                          'id-ID'
                        )}
                      </span>
                    </div>
                    {customer.updated_at !== customer.created_at && (
                      <div className='flex justify-between text-xs'>
                        <span className='text-muted-foreground'>
                          Diperbarui:
                        </span>
                        <span className='font-medium'>
                          {new Date(customer.updated_at).toLocaleDateString(
                            'id-ID'
                          )}
                        </span>
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
                  <Edit3 className='h-5 w-5 text-primary' />
                  Edit Informasi Pelanggan
                </CardTitle>
                <CardDescription className='text-xs'>
                  Perbarui detail informasi pelanggan
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
                      onClick={() => router.push(`/customers/${customerId}`)}
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
                          Simpan Perubahan
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
