'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/auth-context'
import { useBranch } from '@/contexts/branch-context'
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
import type {
  InventoryItem,
  InventoryItemInput,
  InventoryCategory,
} from '@/lib/appwrite/inventory'
import {
  getInventoryItem,
  updateInventoryItem,
  getInventoryCategories,
} from '@/lib/appwrite/inventory'

const itemFormSchema = z.object({
  name: z.string().min(3, { message: 'Nama produk minimal 3 karakter.' }),
  sku: z.string().optional(),
  categoryId: z.string().min(1, { message: 'Kategori harus dipilih.' }),
  quantity: z.coerce.number().min(0, { message: 'Stok tidak boleh negatif.' }),
  price: z.coerce
    .number()
    .min(0, { message: 'Harga jual tidak boleh negatif.' }),
  costPrice: z.coerce
    .number()
    .min(0, { message: 'Harga pokok tidak boleh negatif.' }),
  imageUrl: z
    .string()
    .url({ message: 'URL gambar tidak valid.' })
    .optional()
    .or(z.literal('')),
  imageHint: z.string().optional(),
})
type ItemFormValues = z.infer<typeof itemFormSchema>

export default function EditInventoryPage() {
  const router = useRouter()
  const params = useParams()
  const itemId = params.id as string

  const { selectedBranch } = useBranch()
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [loadingItem, setLoadingItem] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(true)

  const itemForm = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: '',
      sku: '',
      categoryId: '',
      quantity: 0,
      price: 0,
      costPrice: 0,
      imageUrl: '',
      imageHint: '',
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
        getInventoryItem(itemId),
        getInventoryCategories(selectedBranch.id),
      ])

      if (fetchedItem) {
        setItem(fetchedItem)
        itemForm.reset({
          name: fetchedItem.name,
          sku: fetchedItem.sku || '',
          categoryId: fetchedItem.categoryId,
          quantity: fetchedItem.quantity,
          price: fetchedItem.price,
          costPrice: fetchedItem.costPrice || 0,
          imageUrl: fetchedItem.imageUrl || '',
          imageHint: fetchedItem.imageHint || '',
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

    const selectedCategory = categories.find((c) => c.id === values.categoryId)
    if (!selectedCategory) {
      toast.error('Kategori Tidak Valid', {
        description: 'Kategori yang dipilih tidak ditemukan.',
      })
      return
    }

    const itemData: InventoryItemInput = {
      name: values.name,
      sku: values.sku?.trim() || '', // SKU can be empty, Appwrite will handle if it's unique
      categoryId: values.categoryId,
      branchId: selectedBranch.id, // Ensure branchId is included
      quantity: Number(values.quantity),
      price: Number(values.price),
      costPrice: Number(values.costPrice),
      imageUrl: values.imageUrl || `https://placehold.co/64x64.png`,
      imageHint:
        values.imageHint ||
        values.name.split(' ').slice(0, 2).join(' ').toLowerCase(),
    }

    const result = await updateInventoryItem(
      item.id,
      itemData,
      selectedCategory.name
    )

    if (result && 'error' in result) {
      toast.error('Gagal Memperbarui Produk', {
        description: result.error,
      })
    } else {
      toast.success('Produk Diperbarui', {
        description: `${values.name} telah diperbarui di inventaris.`,
      })
      router.push('/inventory')
    }
  }

  if (!selectedBranch) {
    return (
      <MainLayout>
        <div className='p-4 text-center'>
          Pilih cabang untuk mengedit produk.
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
  categories: InventoryCategory[]
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
          name='categoryId'
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
                    <SelectItem key={cat.id} value={cat.id} className='text-xs'>
                      {cat.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        />
        {errors.categoryId && (
          <p className='text-xs text-destructive mt-1'>
            {errors.categoryId.message}
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
            {...register('costPrice')}
            className='h-9 text-xs'
            placeholder='0'
          />
          {errors.costPrice && (
            <p className='text-xs text-destructive mt-1'>
              {errors.costPrice.message}
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
          {...register('imageUrl')}
          placeholder='https://...'
          className='h-9 text-xs'
        />
        {errors.imageUrl && (
          <p className='text-xs text-destructive mt-1'>
            {errors.imageUrl.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor='itemImageHint' className='text-xs'>
          Petunjuk Gambar (Opsional, maks 2 kata untuk placeholder)
        </Label>
        <Input
          id='itemImageHint'
          {...register('imageHint')}
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
