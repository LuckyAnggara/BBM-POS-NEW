'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
import type { Product, ProductInput, Category } from '@/lib/types'
import { getProductById, updateProduct } from '@/lib/laravel/product'
import { listCategories } from '@/lib/laravel/category'
import { Building } from 'lucide-react'

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
      category_id: '',
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
      <MainLayout>
        <div className='space-y-4 p-4'>
          <Skeleton className='h-10 w-48' />
          <Skeleton className='h-96 w-full' />
        </div>
      </MainLayout>
    )
  }

  if (!item) {
    return (
      <MainLayout>
        <div className='p-4 text-center text-destructive'>
          Produk tidak ditemukan atau terjadi kesalahan.
        </div>
      </MainLayout>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-4 p-4'>
          <h1 className='text-xl md:text-2xl font-semibold font-headline'>
            Edit Produk: {item.name}
          </h1>
          <ProductForm
            itemForm={itemForm}
            categories={categories}
            loadingCategories={loadingCategories}
            onSubmit={onSubmit}
            isSubmitting={itemForm.formState.isSubmitting}
            isEdit={true}
          />
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
          <p className='text-xs text-destructive mt-1'>{errors.name.message}</p>
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
              value={String(field.value)}
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
          <Label htmlFor='itemCostPrice' className='text-xs'>
            Harga Pokok (Rp)
          </Label>
          <Input
            id='itemCostPrice'
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
        <Label htmlFor='itemImageUrl' className='text-xs'>
          URL Gambar (Opsional)
        </Label>
        <Input
          id='itemImageUrl'
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
        <Label htmlFor='itemImageHint' className='text-xs'>
          Petunjuk Gambar (Opsional, maks 2 kata untuk placeholder)
        </Label>
        <Input
          id='itemImageHint'
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
  )
}
