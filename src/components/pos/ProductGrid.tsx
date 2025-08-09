import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Product, CartItem } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

interface ProductGridProps {
  items: Product[]
  loadingItems: boolean
  handleAddToCart: (product: Product) => void
  viewMode: 'card' | 'table'
  currencySymbol: string
}

const ProductCard = ({
  product,
  handleAddToCart,
  currencySymbol,
}: {
  product: Product
  handleAddToCart: (product: Product) => void
  currencySymbol: string
}) => (
  <Card
    className='flex flex-col justify-between cursor-pointer hover:shadow-lg transition-shadow'
    onClick={() => handleAddToCart(product)}
  >
    <CardHeader>
      <CardTitle className='text-base'>{product.name}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className='text-sm text-muted-foreground'>Stok: {product.quantity}</p>
    </CardContent>
    <CardFooter>
      <p className='font-semibold'>
        {formatCurrency(product.price, currencySymbol)}
      </p>
    </CardFooter>
  </Card>
)

const ProductRow = ({
  product,
  handleAddToCart,
  currencySymbol,
}: {
  product: Product
  handleAddToCart: (product: Product) => void
  currencySymbol: string
}) => (
  <TableRow
    onClick={() => handleAddToCart(product)}
    className='cursor-pointer hover:bg-muted/50'
  >
    <TableCell>{product.name}</TableCell>
    <TableCell>{product.sku}</TableCell>
    <TableCell className='text-right'>{product.quantity}</TableCell>
    <TableCell className='text-right font-medium'>
      {formatCurrency(product.price, currencySymbol)}
    </TableCell>
  </TableRow>
)

export default function ProductGrid({
  items,
  loadingItems,
  handleAddToCart,
  viewMode,
  currencySymbol,
}: ProductGridProps) {
  if (loadingItems) {
    return (
      <div className='flex justify-center items-center h-full'>
        <p>Memuat produk...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className='flex justify-center items-center h-full'>
        <p>Tidak ada produk yang ditemukan.</p>
      </div>
    )
  }

  return (
    <Card className='h-full'>
      <CardContent className='p-0'>
        <ScrollArea className='h-[calc(100vh-220px)]'>
          {viewMode === 'card' ? (
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4'>
              {items.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  handleAddToCart={handleAddToCart}
                  currencySymbol={currencySymbol}
                />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className='text-right'>Stok</TableHead>
                  <TableHead className='text-right'>Harga</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    handleAddToCart={handleAddToCart}
                    currencySymbol={currencySymbol}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
