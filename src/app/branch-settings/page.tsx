'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import { useAuth } from '@/contexts/auth-context'
import { useBranches } from '@/contexts/branch-context'
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
import { toast } from 'sonner'
// Migrated to Laravel branch service (replace previous Appwrite import)
import { updateBranch } from '@/lib/laravel/branches'
import { Skeleton } from '@/components/ui/skeleton'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Settings, AlertTriangle, Printer, Wrench } from 'lucide-react'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const branchSettingsFormSchema = z.object({
  name: z.string().min(3, { message: 'Nama cabang minimal 3 karakter.' }),
  invoiceName: z.string().optional(),
  invoicePrefix: z.string().max(10).optional(),
  currency: z
    .string()
    .min(3, { message: 'Mata uang minimal 3 karakter.' })
    .max(5, { message: 'Mata uang maksimal 5 karakter.' }),
  taxRate: z.coerce
    .number()
    .min(0, { message: 'Tarif pajak tidak boleh negatif.' })
    .max(100, { message: 'Tarif pajak tidak boleh > 100.' }),
  taxInclusive: z.boolean().default(false),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  defaultReportPeriod: z.enum(['thisMonth', 'thisWeek', 'today']),
  printerPort: z.coerce.number().optional(),
  timezone: z.string().min(3).optional(),
  locale: z.string().min(2).max(10).optional(),
  numberFormat: z.enum(['dot-decimal', 'comma-decimal']).default('dot-decimal'),
  receiptFooter: z.string().max(300).optional(),
  lowStockThreshold: z.coerce.number().min(0).max(999999).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
})

type BranchSettingsFormValues = z.infer<typeof branchSettingsFormSchema>

export default function BranchSettingsPage() {
  const { selectedBranch, isLoadingBranches, refreshBranches } = useBranches()
  const { userData, isLoadingUserData } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showTestPrintDialog, setShowTestPrintDialog] = useState(false)

  const branchSettingsForm = useForm<BranchSettingsFormValues>({
    resolver: zodResolver(branchSettingsFormSchema),
    defaultValues: {
      name: '',
      invoiceName: '',
      invoicePrefix: '',
      currency: 'IDR',
      taxRate: 0,
      taxInclusive: false,
      address: '',
      phoneNumber: '',
      defaultReportPeriod: 'thisMonth',
      printerPort: 5000,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: 'id-ID',
      numberFormat: 'dot-decimal',
      receiptFooter: '',
      lowStockThreshold: 0,
      logoUrl: '',
    },
  })

  useEffect(() => {
    if (!isLoadingBranches && selectedBranch) {
      branchSettingsForm.reset({
        name: selectedBranch.name || '',
        invoiceName:
          (selectedBranch as any).invoice_name || selectedBranch.name || '',
        invoicePrefix: (selectedBranch as any).invoice_prefix || '',
        currency: selectedBranch.currency || 'IDR',
        taxRate: (selectedBranch as any).tax_rate || 0,
        taxInclusive: Boolean((selectedBranch as any).tax_inclusive),
        address: selectedBranch.address || '',
        phoneNumber: (selectedBranch as any).phone || '',
        defaultReportPeriod:
          (selectedBranch as any).default_report_period || 'thisMonth',
        printerPort: (selectedBranch as any).printer_port || 9100,
        timezone:
          (selectedBranch as any).timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: (selectedBranch as any).locale || 'id-ID',
        numberFormat: (selectedBranch as any).number_format || 'dot-decimal',
        receiptFooter: (selectedBranch as any).receipt_footer || '',
        lowStockThreshold: (selectedBranch as any).low_stock_threshold || 0,
        logoUrl: (selectedBranch as any).logo_url || '',
      })
    } else if (
      !isLoadingBranches &&
      !selectedBranch &&
      userData?.role !== 'admin'
    ) {
      // If user is not admin and has no branch, they should not be here (unless it's their first time and assigned by admin)
      // For now, let's show a message if they somehow land here without a branch.
    }
  }, [selectedBranch, isLoadingBranches, branchSettingsForm, userData])

  const onSubmitSettings: SubmitHandler<BranchSettingsFormValues> = async (
    values
  ) => {
    if (!selectedBranch) {
      toast.error('error', {
        description: 'Tidak ada cabang yang dipilih.',
      })
      return
    }
    setIsSubmitting(true)
    const updates: any = {
      name: values.name,
      invoiceName: values.invoiceName || values.name,
      invoicePrefix: values.invoicePrefix,
      currency: values.currency,
      taxRate: values.taxRate,
      taxInclusive: values.taxInclusive,
      address: values.address,
      phoneNumber: values.phoneNumber,
      defaultReportPeriod: values.defaultReportPeriod,
      printerPort: values.printerPort,
      timezone: values.timezone,
      locale: values.locale,
      numberFormat: values.numberFormat,
      receiptFooter: values.receiptFooter,
      lowStockThreshold: values.lowStockThreshold,
      logoUrl: values.logoUrl,
    }

    try {
      await updateBranch(String(selectedBranch.id), updates)
      toast.success('Pengaturan Cabang Diperbarui', {
        description: 'Perubahan telah disimpan.',
      })
      refreshBranches() // Refresh branch context to reflect changes
    } catch (error) {
      toast.error('Gagal Memperbarui', {
        description: (error as Error).message,
      })
    }
    setIsSubmitting(false)
  }

  const handleTestPrint = async (printerType: '58mm' | 'dot-matrix') => {
    if (!selectedBranch) {
      toast.error('Tidak ada cabang yang dipilih.')
      return
    }

    const testData = {
      printMode: printerType,
      data: {
        branchName: selectedBranch.name || 'Nama Toko Anda',
        branchAddress: selectedBranch.address || 'Alamat Toko Anda',
        branchPhone: (selectedBranch as any).phone || 'Nomor Telepon Toko',
        invoiceNumber: 'INV-12345678',
        transactionDate: new Date().toLocaleString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        cashierName: userData?.name || 'Kasir 01',
        customerName: 'Nama Pelanggan',
        items: [
          {
            name: 'Kopi Susu',
            quantity: 2,
            price: 18000,
            total: 36000,
          },
          {
            name: 'Donat Coklat',
            quantity: 1,
            price: 8000,
            total: 8000,
          },
        ],
        subtotal: 44000,
        taxAmount: 4400,
        totalAmount: 48400,
        paymentMethod: 'Cash',
        amountPaid: 50000,
        changeGiven: 1600,
      },
    }
    const port = (selectedBranch as any).printer_port || '3000'
    const url = `http://localhost:${port}/print` // Endpoint yang benar
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      toast.success('Print Test Sent', {
        description: `Test print for ${printerType} sent to port ${
          (selectedBranch as any).printer_port || 9100
        }`,
      })
    } catch (error) {
      console.error('Could not connect to the printer app:', error)
      toast.error('Connection Error', {
        description:
          'Could not connect to the printer app. Make sure it is running and the port is correct.',
      })
    }
    setShowTestPrintDialog(false)
  }

  // const isLoading = loadingAuth || loadingUserData || loadingBranches;

  if (isLoadingUserData) {
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
            <div className='grid gap-6 lg:grid-cols-3'>
              <Card className='lg:col-span-2'>
                <CardHeader>
                  <CardTitle className='text-base font-semibold'>
                    Detail Cabang
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Info dasar cabang dan preferensi tampilan.
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
                          htmlFor='invoicePrefixSettings'
                          className='text-xs'
                        >
                          Prefix Nomor Invoice
                        </Label>
                        <Input
                          id='invoicePrefixSettings'
                          {...branchSettingsForm.register('invoicePrefix')}
                          className='h-9 text-sm mt-1'
                          placeholder='Misal: INV'
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor='logoUrlSettings' className='text-xs'>
                          Logo URL
                        </Label>
                        <Input
                          id='logoUrlSettings'
                          {...branchSettingsForm.register('logoUrl')}
                          className='h-9 text-sm mt-1'
                          placeholder='https://...'
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
                            {
                              branchSettingsForm.formState.errors.currency
                                .message
                            }
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
                            {
                              branchSettingsForm.formState.errors.taxRate
                                .message
                            }
                          </p>
                        )}
                      </div>
                      <div className='md:col-span-2 flex items-center gap-2'>
                        <input
                          id='taxInclusive'
                          type='checkbox'
                          className='h-4 w-4'
                          disabled={isSubmitting}
                          {...branchSettingsForm.register('taxInclusive')}
                        />
                        <Label htmlFor='taxInclusive' className='text-xs'>
                          Harga sudah termasuk pajak (Tax Inclusive)
                        </Label>
                      </div>
                      <div className='md:col-span-2'>
                        <Label
                          htmlFor='branchAddressSettings'
                          className='text-xs'
                        >
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
                        <Label
                          htmlFor='printerPortSettings'
                          className='text-xs'
                        >
                          Port Printer
                        </Label>
                        <Input
                          id='printerPortSettings'
                          type='number'
                          {...branchSettingsForm.register('printerPort')}
                          className='h-9 text-sm mt-1'
                          disabled={isSubmitting}
                        />
                        {branchSettingsForm.formState.errors.printerPort && (
                          <p className='text-xs text-destructive mt-1'>
                            {
                              branchSettingsForm.formState.errors.printerPort
                                .message
                            }
                          </p>
                        )}
                      </div>
                      <div>
                        <Label
                          htmlFor='defaultReportPeriod'
                          className='text-xs'
                        >
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
                                <SelectItem
                                  value='thisMonth'
                                  className='text-sm'
                                >
                                  Bulan Ini
                                </SelectItem>
                                <SelectItem
                                  value='thisWeek'
                                  className='text-sm'
                                >
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
                      <div>
                        <Label htmlFor='timezoneSettings' className='text-xs'>
                          Zona Waktu
                        </Label>
                        <Input
                          id='timezoneSettings'
                          {...branchSettingsForm.register('timezone')}
                          className='h-9 text-sm mt-1'
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor='localeSettings' className='text-xs'>
                          Locale
                        </Label>
                        <Input
                          id='localeSettings'
                          {...branchSettingsForm.register('locale')}
                          className='h-9 text-sm mt-1'
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor='numberFormatSettings'
                          className='text-xs'
                        >
                          Format Angka
                        </Label>
                        <Controller
                          name='numberFormat'
                          control={branchSettingsForm.control}
                          render={({ field }) => (
                            <Select
                              disabled={isSubmitting}
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className='h-9 text-sm mt-1'>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  value='dot-decimal'
                                  className='text-sm'
                                >
                                  1.234,56 (Indonesia)
                                </SelectItem>
                                <SelectItem
                                  value='comma-decimal'
                                  className='text-sm'
                                >
                                  1,234.56 (US)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div className='md:col-span-2'>
                        <Label
                          htmlFor='receiptFooterSettings'
                          className='text-xs'
                        >
                          Catatan / Footer Struk
                        </Label>
                        <Textarea
                          id='receiptFooterSettings'
                          {...branchSettingsForm.register('receiptFooter')}
                          className='text-sm mt-1 min-h-[60px]'
                          maxLength={300}
                          disabled={isSubmitting}
                          placeholder='Terima kasih atas kunjungan Anda...'
                        />
                        <p className='text-[10px] text-muted-foreground mt-1'>
                          Maks 300 karakter.
                        </p>
                      </div>
                      <div>
                        <Label
                          htmlFor='lowStockThresholdSettings'
                          className='text-xs'
                        >
                          Ambang Stok Rendah
                        </Label>
                        <Input
                          id='lowStockThresholdSettings'
                          type='number'
                          {...branchSettingsForm.register('lowStockThreshold')}
                          className='h-9 text-sm mt-1'
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className='md:col-span-2 flex gap-2 pt-2'>
                        <Button
                          type='submit'
                          className='text-sm h-9'
                          disabled={
                            isSubmitting ||
                            !branchSettingsForm.formState.isDirty
                          }
                        >
                          {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          className='text-sm h-9'
                          onClick={() => setShowTestPrintDialog(true)}
                        >
                          <Printer className='mr-2 h-4 w-4' />
                          Test Printer
                        </Button>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className='text-base font-semibold flex items-center gap-2'>
                    <Wrench className='h-4 w-4' /> Utilitas Cabang
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Operasi khusus cabang (reset penomoran, test printer, dsb).
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-2 text-xs'>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-8 w-full justify-start'
                    onClick={() => setShowTestPrintDialog(true)}
                    disabled={!selectedBranch}
                  >
                    Test Printer
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-8 w-full justify-start'
                    disabled
                  >
                    Reset Penomoran Invoice (Coming Soon)
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-8 w-full justify-start'
                    disabled
                  >
                    Rebuild Index Stok (Coming Soon)
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-8 w-full justify-start'
                    disabled
                  >
                    Sinkron Ulang Cache (Coming Soon)
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className='p-6 text-center text-muted-foreground'>
                Silakan pilih cabang yang valid untuk melihat atau mengubah
                pengaturannya.
              </CardContent>
            </Card>
          )}
        </div>
        <AlertDialog
          open={showTestPrintDialog}
          onOpenChange={setShowTestPrintDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Test Printer</AlertDialogTitle>
              <AlertDialogDescription>
                Pilih jenis printer untuk melakukan test print.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleTestPrint('58mm')}>
                58mm
              </AlertDialogAction>
              <AlertDialogAction onClick={() => handleTestPrint('dot-matrix')}>
                Dot Matrix
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MainLayout>
    </ProtectedRoute>
  )
}
