import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { UserPlus, XCircle } from 'lucide-react'

import type { CartItem } from './pos-container'
import type { Customer } from '@/lib/appwrite/customers'

interface CartPanelProps {
  cartItems: CartItem[]
  customer: Customer | null
  subtotal: number
  onUpdateQuantity: (itemId: string, newQuantity: number) => void
  onClearCart: () => void
  onSelectCustomerClick: () => void
  onPaymentClick: () => void
  disabled: boolean
}

export const CartPanel = ({
  cartItems,
  customer,
  subtotal,
  onUpdateQuantity,
  onClearCart,
  onSelectCustomerClick,
  onPaymentClick,
}: CartPanelProps) => {
  return (
    <Card className='h-full flex flex-col'>
      <CardHeader>
        <CardTitle>Keranjang</CardTitle>
      </CardHeader>
      <CardContent className='flex-grow overflow-hidden flex flex-col space-y-4'>
        {/* Customer Section */}
        <div className='border rounded-lg p-3'>
          <div className='flex justify-between items-center'>
            <div>
              <p className='text-sm font-semibold'>
                {customer?.name || 'Pelanggan Umum'}
              </p>
              <p className='text-xs text-muted-foreground'>
                {customer?.phone || 'Tidak ada data'}
              </p>
            </div>
            <Button size='icon' variant='ghost' onClick={onSelectCustomerClick}>
              <UserPlus className='h-5 w-5' />
            </Button>
          </div>
        </div>

        {/* Cart Items Section */}
        <Separator />
        <ScrollArea className='flex-grow'>
          {cartItems.length > 0 ? (
            <div className='space-y-2 pr-4'>
              {cartItems.map((item) => (
                <div key={item.itemId} className='flex items-center space-x-2'>
                  <Input
                    type='number'
                    value={item.quantity}
                    onChange={(e) =>
                      onUpdateQuantity(
                        item.itemId,
                        parseInt(e.target.value, 10) || 0
                      )
                    }
                    className='w-16 h-8'
                  />
                  <div className='flex-grow'>
                    <p className='text-sm font-medium'>{item.name}</p>
                    <p className='text-xs text-muted-foreground'>
                      {new Intl.NumberFormat('id-ID').format(item.price)}
                    </p>
                  </div>
                  <p className='text-sm font-semibold'>
                    {new Intl.NumberFormat('id-ID').format(
                      item.price * item.quantity
                    )}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className='flex items-center justify-center h-full'>
              <p className='text-muted-foreground'>Keranjang kosong</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className='flex-col space-y-4'>
        <div className='w-full flex justify-between font-bold text-lg'>
          <span>Total</span>
          <span>
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
            }).format(subtotal)}
          </span>
        </div>
        <div className='w-full grid grid-cols-2 gap-2'>
          <Button
            variant='outline'
            className='w-full'
            onClick={onClearCart}
            disabled={cartItems.length === 0}
          >
            <XCircle className='mr-2 h-4 w-4' /> Batal
          </Button>
          <Button
            className='w-full'
            onClick={onPaymentClick}
            disabled={cartItems.length === 0}
          >
            Bayar
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
