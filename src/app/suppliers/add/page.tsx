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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  Globe,
  Building,
  Star,
} from 'lucide-react'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { type SupplierInput } from '@/lib/types'
import { createSupplier } from '@/lib/laravel/suppliers'

const supplierFormSchema = z.object({
  name: z.string().min(2, { message: 'Nama pemasok minimal 2 karakter.' }),
  contact_person: z.string().optional(),
  email: z
    .string()
    .email({ message: 'Format email tidak valid.' })
    .optional()
    .or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  // Extended fields
  company_type: z.enum(['individual', 'company']).optional(),
  tax_id: z.string().optional(),
  credit_limit: z.coerce.number().optional(),
  payment_terms: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_account_name: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  industry: z.string().optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  is_active: z.boolean().default(true),
})

type SupplierFormValues = z.infer<typeof supplierFormSchema>

export default function AddSupplierPage() {
  const { selectedBranch } = useBranches()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supplierForm = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
      company_type: 'company',
      tax_id: '',
      credit_limit: 0,
      payment_terms: '',
      bank_name: '',
      bank_account_number: '',
      bank_account_name: '',
      website: '',
      industry: '',
      rating: 5,
      is_active: true,
    },
  })

  const onSubmitSupplier: SubmitHandler<SupplierFormValues> = async (
    values
  ) => {
    if (!selectedBranch) {
      toast.error('Cabang tidak valid.')
      return
    }

    const supplierData: SupplierInput = {
      ...values,
      branch_id: selectedBranch.id,
      // Convert empty strings to null for optional fields
      email: values.email || null,
      contact_person: values.contact_person || null,
      phone: values.phone || null,
      address: values.address || null,
      notes: values.notes || null,
      tax_id: values.tax_id || null,
      credit_limit: values.credit_limit || null,
      payment_terms: values.payment_terms || null,
      bank_name: values.bank_name || null,
      bank_account_number: values.bank_account_number || null,
      bank_account_name: values.bank_account_name || null,
      website: values.website || null,
      industry: values.industry || null,
      rating: values.rating || null,
      company_type: values.company_type || null,
    }

    try {
      setIsSubmitting(true)
      await createSupplier(supplierData)
      toast.success('Pemasok berhasil ditambahkan')
      router.push('/suppliers')
    } catch (error: any) {
      let errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'

      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
        const firstErrorKey = Object.keys(validationErrors)[0]
        errorMessage = validationErrors[firstErrorKey][0]
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }

      toast.error('Gagal Menambah Pemasok', {
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
            <Building2 className='h-7 w-7 text-primary' />
            <div className='flex-1'>
              <h1 className='text-xl md:text-2xl font-semibold font-headline'>
                Tambah Pemasok Baru
              </h1>
              <p className='text-sm text-muted-foreground'>
                Lengkapi informasi pemasok untuk manajemen yang lebih baik
              </p>
            </div>
            <Button variant='outline' size='sm' asChild>
              <Link href='/suppliers'>
                <ArrowLeft className='h-4 w-4 mr-2' />
                Kembali
              </Link>
            </Button>
          </div>

          <form onSubmit={supplierForm.handleSubmit(onSubmitSupplier)}>
            <div className='grid gap-6 lg:grid-cols-2'>
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <User className='h-5 w-5' />
                    Informasi Dasar
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Informasi utama pemasok
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div>
                    <Label htmlFor='name' className='text-xs'>
                      Nama Pemasok*
                    </Label>
                    <Input
                      id='name'
                      {...supplierForm.register('name')}
                      className='h-9 text-xs mt-1'
                      placeholder='Contoh: PT Pemasok Jaya'
                    />
                    {supplierForm.formState.errors.name && (
                      <p className='text-xs text-destructive mt-1'>
                        {supplierForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor='company_type' className='text-xs'>
                      Jenis Usaha
                    </Label>
                    <Controller
                      name='company_type'
                      control={supplierForm.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className='h-9 text-xs mt-1'>
                            <SelectValue placeholder='Pilih jenis usaha' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='company' className='text-xs'>
                              Perusahaan
                            </SelectItem>
                            <SelectItem value='individual' className='text-xs'>
                              Perorangan
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor='contact_person' className='text-xs'>
                      Kontak Person
                    </Label>
                    <Input
                      id='contact_person'
                      {...supplierForm.register('contact_person')}
                      className='h-9 text-xs mt-1'
                      placeholder='Nama kontak utama'
                    />
                  </div>

                  <div>
                    <Label htmlFor='industry' className='text-xs'>
                      Industri
                    </Label>
                    <Input
                      id='industry'
                      {...supplierForm.register('industry')}
                      className='h-9 text-xs mt-1'
                      placeholder='Contoh: Manufaktur, Perdagangan, dll'
                    />
                  </div>

                  <div>
                    <Label htmlFor='rating' className='text-xs'>
                      Rating Pemasok (1-5)
                    </Label>
                    <Controller
                      name='rating'
                      control={supplierForm.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={(value) =>
                            field.onChange(Number(value))
                          }
                          value={field.value?.toString()}
                        >
                          <SelectTrigger className='h-9 text-xs mt-1'>
                            <SelectValue placeholder='Pilih rating' />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <SelectItem
                                key={rating}
                                value={rating.toString()}
                                className='text-xs'
                              >
                                <div className='flex items-center gap-2'>
                                  <div className='flex'>
                                    {Array.from({ length: rating }).map(
                                      (_, i) => (
                                        <Star
                                          key={i}
                                          className='h-3 w-3 fill-yellow-400 text-yellow-400'
                                        />
                                      )
                                    )}
                                  </div>
                                  <span>{rating} Bintang</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <Mail className='h-5 w-5' />
                    Informasi Kontak
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Detail kontak dan alamat
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div>
                    <Label htmlFor='email' className='text-xs'>
                      Email
                    </Label>
                    <Input
                      id='email'
                      type='email'
                      {...supplierForm.register('email')}
                      className='h-9 text-xs mt-1'
                      placeholder='kontak@pemasok.com'
                    />
                    {supplierForm.formState.errors.email && (
                      <p className='text-xs text-destructive mt-1'>
                        {supplierForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor='phone' className='text-xs'>
                      Telepon
                    </Label>
                    <Input
                      id='phone'
                      {...supplierForm.register('phone')}
                      className='h-9 text-xs mt-1'
                      placeholder='08xxxxxxxxxx'
                    />
                  </div>

                  <div>
                    <Label htmlFor='website' className='text-xs'>
                      Website
                    </Label>
                    <Input
                      id='website'
                      type='url'
                      {...supplierForm.register('website')}
                      className='h-9 text-xs mt-1'
                      placeholder='https://www.pemasok.com'
                    />
                    {supplierForm.formState.errors.website && (
                      <p className='text-xs text-destructive mt-1'>
                        {supplierForm.formState.errors.website.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor='address' className='text-xs'>
                      Alamat
                    </Label>
                    <Textarea
                      id='address'
                      {...supplierForm.register('address')}
                      className='text-xs mt-1 min-h-[80px]'
                      placeholder='Alamat lengkap pemasok'
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Financial Information */}
              <Card>
                <CardHeader>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <CreditCard className='h-5 w-5' />
                    Informasi Keuangan
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Detail pembayaran dan kredit
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div>
                    <Label htmlFor='tax_id' className='text-xs'>
                      NPWP / Tax ID
                    </Label>
                    <Input
                      id='tax_id'
                      {...supplierForm.register('tax_id')}
                      className='h-9 text-xs mt-1'
                      placeholder='00.000.000.0-000.000'
                    />
                  </div>

                  <div>
                    <Label htmlFor='payment_terms' className='text-xs'>
                      Termin Pembayaran
                    </Label>
                    <Input
                      id='payment_terms'
                      {...supplierForm.register('payment_terms')}
                      className='h-9 text-xs mt-1'
                      placeholder='Contoh: NET 30, COD, dll'
                    />
                  </div>

                  <div>
                    <Label htmlFor='credit_limit' className='text-xs'>
                      Limit Kredit (Rp)
                    </Label>
                    <Input
                      id='credit_limit'
                      type='number'
                      {...supplierForm.register('credit_limit')}
                      className='h-9 text-xs mt-1'
                      placeholder='0'
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Bank Information */}
              <Card>
                <CardHeader>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <Building className='h-5 w-5' />
                    Informasi Bank
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Detail rekening bank untuk pembayaran
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div>
                    <Label htmlFor='bank_name' className='text-xs'>
                      Nama Bank
                    </Label>
                    <Input
                      id='bank_name'
                      {...supplierForm.register('bank_name')}
                      className='h-9 text-xs mt-1'
                      placeholder='Contoh: Bank BCA'
                    />
                  </div>

                  <div>
                    <Label htmlFor='bank_account_number' className='text-xs'>
                      Nomor Rekening
                    </Label>
                    <Input
                      id='bank_account_number'
                      {...supplierForm.register('bank_account_number')}
                      className='h-9 text-xs mt-1'
                      placeholder='1234567890'
                    />
                  </div>

                  <div>
                    <Label htmlFor='bank_account_name' className='text-xs'>
                      Nama Pemilik Rekening
                    </Label>
                    <Input
                      id='bank_account_name'
                      {...supplierForm.register('bank_account_name')}
                      className='h-9 text-xs mt-1'
                      placeholder='Nama sesuai rekening'
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notes */}
            <Card className='mt-6'>
              <CardHeader>
                <CardTitle className='text-base flex items-center gap-2'>
                  <FileText className='h-5 w-5' />
                  Catatan
                </CardTitle>
                <CardDescription className='text-xs'>
                  Informasi tambahan tentang pemasok
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  id='notes'
                  {...supplierForm.register('notes')}
                  className='text-xs min-h-[100px]'
                  placeholder='Catatan tambahan tentang pemasok, seperti spesialisasi produk, keunggulan, dll.'
                />
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className='flex justify-end gap-3 mt-6'>
              <Button type='button' variant='outline' asChild>
                <Link href='/suppliers'>Batal</Link>
              </Button>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan Pemasok'}
              </Button>
            </div>
          </form>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
