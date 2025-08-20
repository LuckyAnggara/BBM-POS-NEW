'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/auth-context'
import { useBranches } from '@/contexts/branch-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product, ProductInput, Category } from '@/lib/types'
import { getProductById, updateProduct } from '@/lib/laravel/product'
import { listCategories } from '@/lib/laravel/category'
import {
  Building,
  Package,
  ArrowLeft,
  Edit3,
  Save,
  X,
  ImageIcon,
  DollarSign,
  Package2,
  Tag,
} from 'lucide-react'

const itemFormSchema = z.object({
  name: z.string().min(3, { message: 'Nama produk minimal 3 karakter.' }),
  sku: z.string().optional(),
  category_id: z.number().min(1, { message: 'Kategori harus dipilih.' }),
  quantity: z.coerce.number().min(0, { message: 'Stok tidak boleh negatif.' }),
  price: z.coerce
    .number()
    .min(0, { message: 'Harga jual tidak boleh negatif.' }),
  cost_price: z.coerce
    .number()
    .min(0, { message: 'Harga pokok tidak boleh negatif.' }),
  image_url: z
    .string()
    .url({ message: 'URL gambar tidak valid.' })
    .optional()
    .or(z.literal('')),
  image_hint: z.string().optional(),
})
type ItemFormValues = z.infer<typeof itemFormSchema>

export default function EditInventoryPage() {
  const router = useRouter()
  const params = useParams()
  const itemId = Number(params.id)

  const { selectedBranch } = useBranches()
  const [item, setItem] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingItem, setLoadingItem] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(true)

  const itemForm = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: '',
      sku: '',
      category_id: 0,
      quantity: 0,
      price: 0,
      cost_price: 0,
      image_url: '',
      image_hint: '',
    },
  })

  useEffect(() => {
    async function loadData() {
      if (!selectedBranch || !itemId) {
        setLoadingItem(false)
        setLoadingCategories(false)
        return
      }

      setLoadingItem(true)
      setLoadingCategories(true)

      const [fetchedItem, fetchedCategories] = await Promise.all([
        getProductById(itemId),
        listCategories(selectedBranch.id),
      ])

      if (fetchedItem) {
        setItem(fetchedItem)
        itemForm.reset({
          name: fetchedItem.name,
          sku: fetchedItem.sku || '',
          category_id: fetchedItem.category_id,
          quantity: fetchedItem.quantity,
          price: fetchedItem.price,
          cost_price: fetchedItem.cost_price || 0,
          image_url: fetchedItem.image_url || '',
          image_hint: fetchedItem.image_hint || '',
        })
      } else {
        toast.error('Produk tidak ditemukan', {
          description: 'Produk yang ingin diedit tidak ditemukan.',
        })
        router.push('/inventory')
      }

      setCategories(fetchedCategories)
      setLoadingItem(false)
      setLoadingCategories(false)
    }
    loadData()
  }, [selectedBranch, itemId, router])

  const onSubmit: SubmitHandler<ItemFormValues> = async (values) => {
    if (!selectedBranch || !item) return

    const selectedCategory = categories.find(
      (c) => c.id === Number(values.category_id)
    )
    if (!selectedCategory) {
      toast.error('Kategori Tidak Valid', {
        description: 'Kategori yang dipilih tidak ditemukan.',
      })
      return
    }

    const itemData: ProductInput = {
      name: values.name,
      sku: values.sku?.trim() || '', // SKU can be empty, Appwrite will handle if it's unique
      category_id: values.category_id,
      category_name: selectedCategory.name,
      branch_id: selectedBranch.id, // Ensure branch_id is included
      quantity: Number(values.quantity),
      price: Number(values.price),
      cost_price: Number(values.cost_price),
      image_url: values.image_url || `https://placehold.co/64x64.png`,
      image_hint:
        values.image_hint ||
        values.name.split(' ').slice(0, 2).join(' ').toLowerCase(),
    }

    try {
      const result = await updateProduct(item.id, itemData)

      toast.success('Produk Diperbarui', {
        description: `${result.name} telah diperbarui di inventaris.`,
      })
      router.push(`/inventory/${itemId}`)
    } catch (error: any) {
      console.error('Gagal menambah produk:', error)

      let errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'

      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
        const firstErrorKey = Object.keys(validationErrors)[0]
        errorMessage = validationErrors[firstErrorKey][0]
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }

      toast.error('Gagal Menambah Produk', {
        description: errorMessage,
      })
    }
  }

  if (!selectedBranch) {
    return (
      <MainLayout>
        <div className='flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4'>
          <Building className='h-16 w-16 text-primary animate-pulse mb-4' />
          <h1 className='text-2xl font-semibold font-headline mb-2'>
            Berkah Baja Makmur
          </h1>
          <p className='text-sm text-muted-foreground'>Silakan tunggu...</p>
        </div>
      </MainLayout>
    )
  }

  if (loadingItem || loadingCategories) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className='space-y-6'>
            {/* Header Skeleton */}
            <div className='flex items-center gap-3'>
              <Skeleton className='h-8 w-8' />
              <Skeleton className='h-7 w-7' />
              <div className='flex-1 space-y-2'>
                <Skeleton className='h-6 w-48' />
                <Skeleton className='h-4 w-64' />
              </div>
              <Skeleton className='h-8 w-20' />
            </div>

            {/* Content Skeleton */}
            <div className='grid gap-6 lg:grid-cols-3'>
              <Card className='lg:col-span-1'>
                <CardHeader>
                  <Skeleton className='h-5 w-32' />
                  <Skeleton className='h-4 w-48' />
                </CardHeader>
                <CardContent>
                  <Skeleton className='aspect-square w-full mb-4' />
                  <div className='space-y-2'>
                    <Skeleton className='h-4 w-24' />
                    <Skeleton className='h-5 w-32' />
                  </div>
                </CardContent>
              </Card>

              <Card className='lg:col-span-2'>
                <CardHeader>
                  <Skeleton className='h-5 w-32' />
                  <Skeleton className='h-4 w-48' />
                </CardHeader>
                <CardContent className='space-y-6'>
                  <div className='space-y-4'>
                    <Skeleton className='h-4 w-32' />
                    <Skeleton className='h-10 w-full' />
                    <div className='grid grid-cols-2 gap-4'>
                      <Skeleton className='h-10 w-full' />
                      <Skeleton className='h-10 w-full' />
                    </div>
                  </div>
                  <div className='space-y-4'>
                    <Skeleton className='h-4 w-24' />
                    <div className='grid grid-cols-3 gap-4'>
                      <Skeleton className='h-10 w-full' />
                      <Skeleton className='h-10 w-full' />
                      <Skeleton className='h-10 w-full' />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  if (!item) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className='flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4'>
            <Package className='h-16 w-16 text-muted-foreground' />
            <div>
              <h2 className='text-lg font-semibold mb-2'>
                Produk Tidak Ditemukan
              </h2>
              <p className='text-sm text-muted-foreground mb-4'>
                Produk yang ingin diedit tidak ditemukan atau telah dihapus.
              </p>
              <Button asChild variant='outline'>
                <Link href='/inventory'>
                  <ArrowLeft className='h-4 w-4 mr-2' />
                  Kembali ke Daftar Produk
                </Link>
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
              <Link href={`/inventory/${itemId}`}>
                <ArrowLeft className='h-4 w-4' />
              </Link>
            </Button>
            <Edit3 className='h-7 w-7 text-primary' />
            <div className='flex-1'>
              <h1 className='text-xl md:text-2xl font-semibold font-headline'>
                Edit Produk
              </h1>
              <p className='text-sm text-muted-foreground'>
                {item.name} • SKU: {item.sku || 'Tidak ada'}
              </p>
            </div>
            <Button variant='outline' size='sm' asChild>
              <Link href={`/inventory/${itemId}`}>
                <X className='h-4 w-4 mr-2' />
                Batal
              </Link>
            </Button>
          </div>

          {/* Main Edit Form */}
          <div className='grid gap-6 lg:grid-cols-3'>
            {/* Product Preview */}
            <Card className='lg:col-span-1'>
              <CardHeader>
                <CardTitle className='text-base font-semibold flex items-center gap-2'>
                  <Package className='h-5 w-5 text-primary' />
                  Preview Produk
                </CardTitle>
                <CardDescription className='text-xs'>
                  Pratinjau perubahan produk
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='aspect-square rounded-lg border bg-muted/50 flex items-center justify-center overflow-hidden'>
                  {itemForm.watch('image_url') ? (
                    <img
                      src={itemForm.watch('image_url')}
                      alt={itemForm.watch('name')}
                      className='w-full h-full object-cover'
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        target.parentElement!.innerHTML = `
                          <div class="text-center">
                            <div class="h-16 w-16 text-muted-foreground mx-auto mb-2 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                            </div>
                            <p class="text-sm text-muted-foreground">URL gambar tidak valid</p>
                          </div>
                        `
                      }}
                    />
                  ) : (
                    <div className='text-center'>
                      <Package className='h-16 w-16 text-muted-foreground mx-auto mb-2' />
                      <p className='text-sm text-muted-foreground'>
                        {itemForm.watch('image_hint') ||
                          itemForm.watch('name') ||
                          'Produk'}
                      </p>
                    </div>
                  )}
                </div>
                <div className='space-y-2'>
                  <div>
                    <p className='text-xs text-muted-foreground'>Nama Produk</p>
                    <p className='font-medium'>
                      {itemForm.watch('name') || 'Nama produk'}
                    </p>
                  </div>
                  <div className='grid grid-cols-2 gap-2 text-xs'>
                    <div>
                      <p className='text-muted-foreground'>Stok</p>
                      <p className='font-medium'>
                        {itemForm.watch('quantity') || 0}
                      </p>
                    </div>
                    <div>
                      <p className='text-muted-foreground'>Harga</p>
                      <p className='font-medium'>
                        Rp{' '}
                        {Number(itemForm.watch('price') || 0).toLocaleString(
                          'id-ID'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Edit Form */}
            <Card className='lg:col-span-2'>
              <CardHeader>
                <CardTitle className='text-base font-semibold flex items-center gap-2'>
                  <Edit3 className='h-5 w-5 text-primary' />
                  Form Edit Produk
                </CardTitle>
                <CardDescription className='text-xs'>
                  Ubah informasi produk sesuai kebutuhan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProductForm
                  itemForm={itemForm}
                  categories={categories}
                  loadingCategories={loadingCategories}
                  onSubmit={onSubmit}
                  isSubmitting={itemForm.formState.isSubmitting}
                  isEdit={true}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}

// Reusable ProductForm component (copied from add/page.tsx)
interface ProductFormProps {
  itemForm: ReturnType<typeof useForm<ItemFormValues>>
  categories: Category[]
  loadingCategories: boolean
  onSubmit: SubmitHandler<ItemFormValues>
  isSubmitting: boolean
  isEdit: boolean
}

const ProductForm: React.FC<ProductFormProps> = ({
  itemForm,
  categories,
  loadingCategories,
  onSubmit,
  isSubmitting,
  isEdit,
}) => {
  const {
    control,
    register,
    formState: { errors },
  } = itemForm

  return (
    <form onSubmit={itemForm.handleSubmit(onSubmit)} className='space-y-6'>
      {/* Basic Information Section */}
      <div className='space-y-4'>
        <div className='flex items-center gap-2'>
          <Tag className='h-4 w-4 text-primary' />
          <h3 className='font-semibold text-sm'>Informasi Dasar</h3>
        </div>
        <Separator />

        <div className='grid gap-4'>
          <div>
            <Label htmlFor='itemName' className='text-sm font-medium'>
              Nama Produk*
            </Label>
            <Input
              id='itemName'
              {...register('name')}
              className='mt-1'
              placeholder='Masukkan nama produk'
            />
            {errors.name && (
              <p className='text-xs text-destructive mt-1'>
                {errors.name.message}
              </p>
            )}
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <Label htmlFor='itemSku' className='text-sm font-medium'>
                SKU (Stock Keeping Unit)
              </Label>
              <Input
                id='itemSku'
                {...register('sku')}
                className='mt-1'
                placeholder='Otomatis jika kosong'
              />
              <p className='text-xs text-muted-foreground mt-1'>
                Biarkan kosong untuk generate otomatis
              </p>
            </div>

            <div>
              <Label htmlFor='itemCategory' className='text-sm font-medium'>
                Kategori*
              </Label>
              <Controller
                name='category_id'
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={String(field.value)}
                    disabled={loadingCategories}
                  >
                    <SelectTrigger className='mt-1'>
                      <SelectValue
                        placeholder={
                          loadingCategories
                            ? 'Memuat kategori...'
                            : categories.length === 0
                            ? 'Tidak ada kategori'
                            : 'Pilih kategori'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 && !loadingCategories ? (
                        <div className='p-3 text-sm text-muted-foreground text-center'>
                          Belum ada kategori.
                          <br />
                          Tambah kategori melalui menu Kelola Kategori.
                        </div>
                      ) : (
                        categories.map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>
                            {cat.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category_id && (
                <p className='text-xs text-destructive mt-1'>
                  {errors.category_id.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stock and Pricing Section */}
      <div className='space-y-4'>
        <div className='flex items-center gap-2'>
          <DollarSign className='h-4 w-4 text-primary' />
          <h3 className='font-semibold text-sm'>Stok & Harga</h3>
        </div>
        <Separator />

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div>
            <Label htmlFor='itemQuantity' className='text-sm font-medium'>
              Stok Tersedia*
            </Label>
            <Input
              id='itemQuantity'
              type='number'
              {...register('quantity')}
              className='mt-1'
              placeholder='0'
              min='0'
            />
            {errors.quantity && (
              <p className='text-xs text-destructive mt-1'>
                {errors.quantity.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor='itemPrice' className='text-sm font-medium'>
              Harga Jual*
            </Label>
            <div className='relative mt-1'>
              <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground'>
                Rp
              </span>
              <Input
                id='itemPrice'
                type='number'
                {...register('price')}
                className='pl-10'
                placeholder='0'
                min='0'
              />
            </div>
            {errors.price && (
              <p className='text-xs text-destructive mt-1'>
                {errors.price.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor='itemCostPrice' className='text-sm font-medium'>
              Harga Pokok
            </Label>
            <div className='relative mt-1'>
              <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground'>
                Rp
              </span>
              <Input
                id='itemCostPrice'
                type='number'
                {...register('cost_price')}
                className='pl-10'
                placeholder='0'
                min='0'
              />
            </div>
            {errors.cost_price && (
              <p className='text-xs text-destructive mt-1'>
                {errors.cost_price.message}
              </p>
            )}
            <p className='text-xs text-muted-foreground mt-1'>
              Untuk kalkulasi profit margin
            </p>
          </div>
        </div>
      </div>

      {/* Image Section */}
      <div className='space-y-4'>
        <div className='flex items-center gap-2'>
          <ImageIcon className='h-4 w-4 text-primary' />
          <h3 className='font-semibold text-sm'>Gambar Produk</h3>
        </div>
        <Separator />

        <div className='grid gap-4'>
          <div>
            <Label htmlFor='itemImageUrl' className='text-sm font-medium'>
              URL Gambar
            </Label>
            <Input
              id='itemImageUrl'
              {...register('image_url')}
              placeholder='https://example.com/image.jpg'
              className='mt-1'
            />
            {errors.image_url && (
              <p className='text-xs text-destructive mt-1'>
                {errors.image_url.message}
              </p>
            )}
            <p className='text-xs text-muted-foreground mt-1'>
              Link gambar produk (opsional)
            </p>
          </div>

          <div>
            <Label htmlFor='itemImageHint' className='text-sm font-medium'>
              Petunjuk Gambar
            </Label>
            <Input
              id='itemImageHint'
              {...register('image_hint')}
              placeholder='Contoh: coffee beans, laptop gaming'
              className='mt-1'
            />
            <p className='text-xs text-muted-foreground mt-1'>
              Deskripsi singkat untuk placeholder (maksimal 2 kata)
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
          onClick={() => window.history.back()}
          disabled={isSubmitting}
        >
          <X className='h-4 w-4 mr-2' />
          Batal
        </Button>
        <Button
          type='submit'
          className='order-1 sm:order-2 flex-1'
          disabled={isSubmitting || categories.length === 0}
        >
          {isSubmitting ? (
            <>
              <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2' />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className='h-4 w-4 mr-2' />
              {isEdit ? 'Simpan Perubahan' : 'Tambah Produk'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
