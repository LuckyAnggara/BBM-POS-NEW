'use client'

import { useState, useEffect } from 'react'
import { useBranch } from '@/contexts/branch-context'
import { useDebounce } from '@uidotdev/usehooks'

import { getInventoryItems, InventoryItem } from '@/lib/appwrite/inventory'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'

interface ProductGridProps {
  onAddToCart: (product: InventoryItem) => void
  disabled: boolean // <-- Tambahkan ini
}

const ProductCard = ({
  product,
  onAddToCart,
  disabled,
}: {
  product: InventoryItem
  onAddToCart: (p: InventoryItem) => void
  disabled: boolean
}) => (
  <div
    className={`border rounded-lg p-3 flex flex-col transition-colors ${
      !disabled
        ? 'cursor-pointer hover:bg-muted/50'
        : 'cursor-not-allowed bg-muted/20'
    }`}
    onClick={() => !disabled && onAddToCart(product)} // Hanya panggil jika tidak disabled
  >
    <div className='flex-grow'>
      <p className='font-semibold text-sm'>{product.name}</p>
      <p className='text-xs text-muted-foreground'>
        {new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
        }).format(product.price)}
      </p>
    </div>
    <p
      className={`text-xs font-bold ${
        product.quantity > 0 ? 'text-green-600' : 'text-red-600'
      }`}
    >
      Stok: {product.quantity}
    </p>
  </div>
)

export const ProductGrid = ({
  onAddToCart,
  disabled,
}: {
  onAddToCart: (product: InventoryItem) => void
  disabled: boolean
}) => {
  const { selectedBranch } = useBranch()
  const [products, setProducts] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  useEffect(() => {
    const fetchProducts = async () => {
      if (!selectedBranch?.id) return
      setIsLoading(true)
      const result = await getInventoryItems(selectedBranch.id, {
        limit: 50, // Ambil lebih banyak untuk scrolling
        searchTerm: debouncedSearchTerm,
      })
      setProducts(result.items)
      setIsLoading(false)
    }
    fetchProducts()
  }, [selectedBranch?.id, debouncedSearchTerm])

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader>
        <CardTitle>Pilih Produk</CardTitle>
        <Input
          placeholder='Cari produk...'
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled}
        />
      </CardHeader>
      <CardContent className='flex-grow overflow-hidden'>
        <ScrollArea className='h-full'>
          {/* ... JSX loading tetap sama ... */}
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pr-4'>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                disabled={disabled}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
