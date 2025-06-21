'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import { useAuth } from '@/contexts/auth-context'
import { useBranch, type ReportPeriodPreset } from '@/contexts/branch-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { updateBranch, type BranchInput } from '@/lib/firebase/branches'
import { Skeleton } from '@/components/ui/skeleton'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Settings, AlertTriangle } from 'lucide-react'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'

const branchSettingsFormSchema = z.object({
  name: z.string().min(3, { message: 'Nama cabang minimal 3 karakter.' }),
  invoiceName: z.string().optional(),
  currency: z
    .string()
    .min(3, { message: 'Mata uang minimal 3 karakter.' })
    .max(5, { message: 'Mata uang maksimal 5 karakter.' }),
  taxRate: z.coerce
    .number()
    .min(0, { message: 'Tarif pajak tidak boleh negatif.' })
    .max(100, { message: 'Tarif pajak tidak boleh > 100.' }),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  defaultReportPeriod: z.enum(['thisMonth', 'thisWeek', 'today']),
})

type BranchSettingsFormValues = z.infer<typeof branchSettingsFormSchema>

export default function BranchSettingsPage() {
  const { selectedBranch, loadingBranches, refreshBranches } = useBranch()
  const { userData, loadingAuth, loadingUserData } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const branchSettingsForm = useForm<BranchSettingsFormValues>({
    resolver: zodResolver(branchSettingsFormSchema),
    defaultValues: {
      name: '',
      invoiceName: '',
      currency: 'IDR',
      taxRate: 0,
      address: '',
      phoneNumber: '',
      defaultReportPeriod: 'thisMonth',
    },
  })

  useEffect(() => {
    if (!loadingBranches && selectedBranch) {
      branchSettingsForm.reset({
        name: selectedBranch.name || '',
        invoiceName: selectedBranch.invoiceName || selectedBranch.name || '',
        currency: selectedBranch.currency || 'IDR',
        taxRate: selectedBranch.taxRate || 0,
        address: selectedBranch.address || '',
        phoneNumber: selectedBranch.phoneNumber || '',
        defaultReportPeriod: selectedBranch.defaultReportPeriod || 'thisMonth',
      })
    } else if (
      !loadingBranches &&
      !selectedBranch &&
      userData?.role !== 'admin'
    ) {
      // If user is not admin and has no branch, they should not be here (unless it's their first time and assigned by admin)
      // For now, let's show a message if they somehow land here without a branch.
    }
  }, [selectedBranch, loadingBranches, branchSettingsForm, userData])

  const onSubmitSettings: SubmitHandler<BranchSettingsFormValues> = async (
    values
  ) => {
    if (!selectedBranch) {
      toast({
        title: 'Error',
        description: 'Tidak ada cabang yang dipilih.',
        variant: 'destructive',
      })
      return
    }
    setIsSubmitting(true)
    const updates: Partial<BranchInput> = {
      name: values.name,
      invoiceName: values.invoiceName || values.name,
      currency: values.currency,
      taxRate: values.taxRate,
      address: values.address,
      phoneNumber: values.phoneNumber,
      defaultReportPeriod: values.defaultReportPeriod,
    }

    const result = await updateBranch(selectedBranch.id, updates)
    if (result && 'error' in result) {
      toast({
        title: 'Gagal Memperbarui',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Pengaturan Cabang Diperbarui',
        description: 'Perubahan telah disimpan.',
      })
      await refreshBranches() // Refresh branch context to reflect changes
    }
    setIsSubmitting(false)
  }

  // const isLoading = loadingAuth || loadingUserData || loadingBranches;

  if (loadingUserData) {
    return (
      <MainLayout>
        <div className='space-y-6'>
          <div className='flex items-center gap-3'>
            {' '}
            <Settings className='h-7 w-7 text-primary' />{' '}
            <Skeleton className='h-7 w-1/3' />{' '}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-1/4' />
            </CardHeader>
            <CardContent className='space-y-4'>
              <Skeleton className='h-9 w-full' />
              <Skeleton className='h-9 w-full' />
              <Skeleton className='h-20 w-full' />
              <Skeleton className='h-9 w-1/4 mt-2' />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    )
  }

  if (!selectedBranch && userData?.role !== 'admin') {
    return (
      <MainLayout>
        <div className='p-4 text-center'>
          <AlertTriangle className='mx-auto h-12 w-12 text-yellow-500 mb-4' />
          <h2 className='text-lg font-semibold mb-2'>
            Cabang Belum Ditentukan
          </h2>
          <p className='text-sm text-muted-foreground mb-4'>
            Anda belum terhubung ke cabang manapun atau cabang Anda belum
            dipilih. Jika Anda adalah admin, silakan pilih cabang dari sidebar.
            Jika Anda kasir, hubungi admin Anda.
          </p>
          <Button asChild variant='outline'>
            <Link href='/dashboard'>Kembali ke Dashboard</Link>
          </Button>
        </div>
      </MainLayout>
    )
  }

  if (!selectedBranch && userData?.role === 'admin') {
    return (
      <MainLayout>
        <div className='p-4 text-center'>
          <AlertTriangle className='mx-auto h-12 w-12 text-yellow-500 mb-4' />
          <h2 className='text-lg font-semibold mb-2'>Pilih Cabang</h2>
          <p className='text-sm text-muted-foreground mb-4'>
            Silakan pilih cabang dari sidebar untuk melihat atau mengubah
            pengaturannya.
          </p>
          <Button asChild variant='outline'>
            <Link href='/dashboard'>Kembali ke Dashboard</Link>
          </Button>
        </div>
      </MainLayout>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-6'>
          <div className='flex items-center gap-3'>
            <Settings className='h-7 w-7 text-primary' />
            <h1 className='text-xl md:text-2xl font-semibold font-headline'>
              Pengaturan Cabang: {selectedBranch?.name || 'Tidak Dipilih'}
            </h1>
          </div>

          {selectedBranch ? (
            <Card>
              <CardHeader>
                <CardTitle className='text-base font-semibold'>
                  Detail Cabang
                </CardTitle>
                <CardDescription className='text-xs'>
                  Perbarui informasi dasar dan preferensi untuk cabang ini.
                  Password hapus transaksi hanya bisa diubah oleh Admin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={branchSettingsForm.handleSubmit(onSubmitSettings)}
                  className='space-y-4'
                >
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <Label htmlFor='branchNameSettings' className='text-xs'>
                        Nama Cabang Utama*
                      </Label>
                      <Input
                        id='branchNameSettings'
                        {...branchSettingsForm.register('name')}
                        className='h-9 text-sm mt-1'
                        disabled={isSubmitting}
                      />
                      {branchSettingsForm.formState.errors.name && (
                        <p className='text-xs text-destructive mt-1'>
                          {branchSettingsForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label
                        htmlFor='branchInvoiceNameSettings'
                        className='text-xs'
                      >
                        Nama di Invoice (Opsional)
                      </Label>
                      <Input
                        id='branchInvoiceNameSettings'
                        {...branchSettingsForm.register('invoiceName')}
                        className='h-9 text-sm mt-1'
                        placeholder='Sama seperti nama cabang jika kosong'
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor='branchCurrencySettings'
                        className='text-xs'
                      >
                        Mata Uang*
                      </Label>
                      <Input
                        id='branchCurrencySettings'
                        {...branchSettingsForm.register('currency')}
                        className='h-9 text-sm mt-1'
                        disabled={isSubmitting}
                      />
                      {branchSettingsForm.formState.errors.currency && (
                        <p className='text-xs text-destructive mt-1'>
                          {branchSettingsForm.formState.errors.currency.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label
                        htmlFor='branchTaxRateSettings'
                        className='text-xs'
                      >
                        Tarif Pajak (%)*
                      </Label>
                      <Input
                        id='branchTaxRateSettings'
                        type='number'
                        {...branchSettingsForm.register('taxRate')}
                        className='h-9 text-sm mt-1'
                        disabled={isSubmitting}
                      />
                      {branchSettingsForm.formState.errors.taxRate && (
                        <p className='text-xs text-destructive mt-1'>
                          {branchSettingsForm.formState.errors.taxRate.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor='branchAddressSettings' className='text-xs'>
                      Alamat
                    </Label>
                    <Textarea
                      id='branchAddressSettings'
                      {...branchSettingsForm.register('address')}
                      className='text-sm mt-1 min-h-[60px]'
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor='branchPhoneNumberSettings'
                      className='text-xs'
                    >
                      Nomor Telepon
                    </Label>
                    <Input
                      id='branchPhoneNumberSettings'
                      {...branchSettingsForm.register('phoneNumber')}
                      className='h-9 text-sm mt-1'
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor='defaultReportPeriod' className='text-xs'>
                      Periode Laporan Default*
                    </Label>
                    <Controller
                      name='defaultReportPeriod'
                      control={branchSettingsForm.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className='h-9 text-sm mt-1'>
                            <SelectValue placeholder='Pilih periode default' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='thisMonth' className='text-sm'>
                              Bulan Ini
                            </SelectItem>
                            <SelectItem value='thisWeek' className='text-sm'>
                              Minggu Ini
                            </SelectItem>
                            <SelectItem value='today' className='text-sm'>
                              Hari Ini
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {branchSettingsForm.formState.errors
                      .defaultReportPeriod && (
                      <p className='text-xs text-destructive mt-1'>
                        {
                          branchSettingsForm.formState.errors
                            .defaultReportPeriod.message
                        }
                      </p>
                    )}
                  </div>
                  <Button
                    type='submit'
                    className='text-sm h-9'
                    disabled={
                      isSubmitting || !branchSettingsForm.formState.isDirty
                    }
                  >
                    {isSubmitting
                      ? 'Menyimpan...'
                      : 'Simpan Perubahan Pengaturan'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className='p-6 text-center text-muted-foreground'>
                Silakan pilih cabang yang valid untuk melihat atau mengubah
                pengaturannya.
              </CardContent>
            </Card>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
