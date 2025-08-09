'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import type { ProductInput, Category } from '@/lib/types'
import { listCategories } from '@/lib/laravel/category'
import { createProduct } from '@/lib/laravel/product'
import Link from 'next/link'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { ArrowLeft } from 'lucide-react'

const itemFormSchema = z.object({
  name: z.string().min(3, { message: 'Nama produk minimal 3 karakter.' }),
  sku: z.string().optional(),
  category_id: z.string().min(1, { message: 'Kategori harus dipilih.' }),
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

export default function AddInventoryPage() {
  const router = useRouter()
  const { selectedBranch } = useBranches()
  const [categories, setCategories] = React.useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = React.useState(true)

  const itemForm = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: '',
      sku: '',
      category_id: '',
      quantity: 0,
      price: 0,
      cost_price: 0,
      image_url: '',
      image_hint: '',
    },
  })

  useEffect(() => {
    async function loadCategories() {
      if (selectedBranch) {
        setLoadingCategories(true)
        const fetchedCategories = await listCategories(selectedBranch.id)
        setCategories(fetchedCategories)
        setLoadingCategories(false)
      } else {
        setCategories([])
        setLoadingCategories(false)
      }
    }
    loadCategories()
  }, [selectedBranch])

  const onSubmit: SubmitHandler<ItemFormValues> = async (values) => {
    // --- Validasi awal di sisi frontend (ini sudah bagus) ---
    if (!selectedBranch) {
      toast.error('Error', { description: 'Cabang tidak valid.' })
      return
    }

    const selectedCategory = categories.find(
      (c) => c.id === Number(values.category_id)
    )
    if (!selectedCategory) {
      toast.error('Kategori Tidak Valid', {
        description: 'Kategori yang dipilih tidak ditemukan.',
      })
      return
    }

    let skuToSave = values.sku?.trim()
    if (!skuToSave) {
      skuToSave = `AUTOSKU-${Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase()}`
    }

    const itemData: ProductInput = {
      name: values.name,
      sku: skuToSave,
      category_id: Number(values.category_id),
      category_name: selectedCategory.name,
      branch_id: selectedBranch.id,
      quantity: Number(values.quantity),
      price: Number(values.price),
      cost_price: Number(values.cost_price),
      image_url: values.image_url || `https://placehold.co/64x64.png`,
      image_hint:
        values.image_hint ||
        values.name.split(' ').slice(0, 2).join(' ').toLowerCase(),
    }

    try {
      const newProduct = await createProduct(itemData)

      toast.success('Produk Ditambahkan', {
        description: `${newProduct.name} telah ditambahkan ke inventaris.`,
      })

      router.push('/inventory')
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
        <div className='p-4 text-center'>
          <DotLottieReact
            src='https://lottie.host/96bad188-a804-40d5-9255-23a0c1ddb95c/BB6E5jfzrQ.lottie'
            loop
            autoplay
          />
        </div>
      </MainLayout>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-4'>
          <div className='flex flex-col sm:flex-row justify-between items-center gap-3'>
            <h1 className='text-xl md:text-2xl font-semibold font-headline'>
              Tambah Produk Cabang{' '}
              {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            <Button asChild variant='outline' className='mt-4'>
              <Link href='/inventory'>
                {' '}
                <ArrowLeft className='mr-1.5 h-3.5 w-3.5' />
                Kembali ke Daftar Produk
              </Link>
            </Button>
          </div>

          <ProductForm
            itemForm={itemForm}
            categories={categories}
            loadingCategories={loadingCategories}
            onSubmit={onSubmit}
            isSubmitting={itemForm.formState.isSubmitting}
            isEdit={false}
          />
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}

// Reusable ProductForm component (moved from original page.tsx)
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
    <div className='space-y-4'>
      <form
        onSubmit={itemForm.handleSubmit(onSubmit)}
        className='space-y-3 p-3 border rounded-lg shadow-sm'
      >
        <div>
          <Label htmlFor='itemName' className='text-xs'>
            Nama Produk*
          </Label>
          <Input id='itemName' {...register('name')} className='h-9 text-xs' />
          {errors.name && (
            <p className='text-xs text-destructive mt-1'>
              {errors.name.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor='itemSku' className='text-xs'>
            SKU (Opsional, otomatis jika kosong)
          </Label>
          <Input id='itemSku' {...register('sku')} className='h-9 text-xs' />
        </div>
        <div>
          <Label htmlFor='itemCategory' className='text-xs'>
            Kategori*
          </Label>
          <Controller
            name='category_id'
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={loadingCategories}
              >
                <SelectTrigger className='h-9 text-xs'>
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
                    <div className='p-2 text-xs text-muted-foreground'>
                      Belum ada kategori. Tambah dulu via 'Kelola Kategori'.
                    </div>
                  ) : (
                    categories.map((cat) => (
                      <SelectItem
                        key={cat.id}
                        value={String(cat.id)}
                        className='text-xs'
                      >
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
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
          <div>
            <Label htmlFor='itemQuantity' className='text-xs'>
              Stok*
            </Label>
            <Input
              id='itemQuantity'
              type='number'
              {...register('quantity')}
              className='h-9 text-xs'
            />
            {errors.quantity && (
              <p className='text-xs text-destructive mt-1'>
                {errors.quantity.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor='itemPrice' className='text-xs'>
              Harga Jual (Rp)*
            </Label>
            <Input
              id='itemPrice'
              type='number'
              {...register('price')}
              className='h-9 text-xs'
            />
            {errors.price && (
              <p className='text-xs text-destructive mt-1'>
                {errors.price.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor='itemcost_price' className='text-xs'>
              Harga Pokok (Rp)
            </Label>
            <Input
              id='itemcost_price'
              type='number'
              {...register('cost_price')}
              className='h-9 text-xs'
              placeholder='0'
            />
            {errors.cost_price && (
              <p className='text-xs text-destructive mt-1'>
                {errors.cost_price.message}
              </p>
            )}
          </div>
        </div>
        <div>
          <Label htmlFor='itemimage_url' className='text-xs'>
            URL Gambar (Opsional)
          </Label>
          <Input
            id='itemimage_url'
            {...register('image_url')}
            placeholder='https://...'
            className='h-9 text-xs'
          />
          {errors.image_url && (
            <p className='text-xs text-destructive mt-1'>
              {errors.image_url.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor='itemimage_hint' className='text-xs'>
            Petunjuk Gambar (Opsional, maks 2 kata untuk placeholder)
          </Label>
          <Input
            id='itemimage_hint'
            {...register('image_hint')}
            placeholder='Contoh: coffee beans'
            className='h-9 text-xs'
          />
        </div>
        <div className='flex justify-end pt-3'>
          <Button
            type='button'
            variant='outline'
            className='text-xs h-8'
            onClick={() => itemForm.reset()}
          >
            Batal
          </Button>
          <Button
            type='submit'
            className='text-xs h-8 ml-2'
            disabled={isSubmitting || categories.length === 0}
          >
            {isSubmitting
              ? 'Menyimpan...'
              : isEdit
              ? 'Simpan Perubahan'
              : 'Tambah Produk'}
          </Button>
        </div>
      </form>
    </div>
  )
}
