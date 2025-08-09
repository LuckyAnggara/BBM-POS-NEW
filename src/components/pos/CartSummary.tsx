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
import { Input } from '@/components/ui/input'
import { Trash2, Tag } from 'lucide-react'
import type { CartItem } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

interface CartSummaryProps {
  cartItems: CartItem[]
  handleUpdateCartQuantity: (productId: number, newQuantity: number) => void
  handleRemoveFromCart: (productId: number) => void
  handleOpenItemDiscountDialog: (item: CartItem) => void
  subtotalAfterItemDiscounts: number
  tax: number
  shippingCost: number
  total: number
  currencySymbol: string
}

export default function CartSummary({
  cartItems,
  handleUpdateCartQuantity,
  handleRemoveFromCart,
  handleOpenItemDiscountDialog,
  subtotalAfterItemDiscounts,
  tax,
  shippingCost,
  total,
  currencySymbol,
}: CartSummaryProps) {
  return (
    <Card className='flex flex-col h-full'>
      <CardHeader>
        <CardTitle>Keranjang</CardTitle>
      </CardHeader>
      <CardContent className='flex-grow p-0'>
        <ScrollArea className='h-[calc(100vh-450px)]'>
          {cartItems.length === 0 ? (
            <div className='flex items-center justify-center h-full'>
              <p className='text-muted-foreground'>Keranjang kosong</p>
            </div>
          ) : (
            <div className='divide-y'>
              {cartItems.map((item) => (
                <div key={item.product_id} className='p-4 flex gap-4'>
                  <div className='flex-grow'>
                    <p className='font-medium'>{item.product_name}</p>
                    <p className='text-sm text-muted-foreground'>
                      {formatCurrency(item.price, currencySymbol)}
                      {item.discount_amount > 0 && (
                        <Badge variant='secondary' className='ml-2'>
                          -
                          {formatCurrency(item.discount_amount, currencySymbol)}
                        </Badge>
                      )}
                    </p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Input
                      type='number'
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateCartQuantity(
                          item.product_id,
                          parseInt(e.target.value, 10) || 1
                        )
                      }
                      className='w-16 h-8 text-center'
                      min={1}
                    />
                    <Button
                      variant='outline'
                      size='icon'
                      className='h-8 w-8'
                      onClick={() => handleOpenItemDiscountDialog(item)}
                    >
                      <Tag className='h-4 w-4' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 text-red-500'
                      onClick={() => handleRemoveFromCart(item.product_id)}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className='flex-col items-stretch gap-2 pt-4 border-t'>
        <div className='flex justify-between'>
          <p>Subtotal</p>
          <p>{formatCurrency(subtotalAfterItemDiscounts, currencySymbol)}</p>
        </div>
        <div className='flex justify-between'>
          <p>Pajak</p>
          <p>{formatCurrency(tax, currencySymbol)}</p>
        </div>
        <div className='flex justify-between'>
          <p>Ongkir</p>
          <p>{formatCurrency(shippingCost, currencySymbol)}</p>
        </div>
        <div className='flex justify-between font-bold text-lg'>
          <p>Total</p>
          <p>{formatCurrency(total, currencySymbol)}</p>
        </div>
      </CardFooter>
    </Card>
  )
}
