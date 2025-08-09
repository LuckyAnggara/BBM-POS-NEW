import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatCurrency } from '@/lib/utils'
import type { CartItem } from '@/lib/types'

interface ItemDiscountModalProps {
  show: boolean
  onClose: () => void
  selectedItem: CartItem | null
  discountType: 'nominal' | 'percentage'
  setDiscountType: (type: 'nominal' | 'percentage') => void
  discountValue: string
  setDiscountValue: (value: string) => void
  handleConfirmItemDiscount: () => void
  handleRemoveCurrentItemDiscount: () => void
  currencySymbol: string
  previewDiscountedPrice: number
  previewActualDiscountAmount: number
}

export default function ItemDiscountModal({
  show,
  onClose,
  selectedItem,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  handleConfirmItemDiscount,
  handleRemoveCurrentItemDiscount,
  currencySymbol,
  previewDiscountedPrice,
  previewActualDiscountAmount,
}: ItemDiscountModalProps) {
  if (!selectedItem) return null

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Diskon untuk {selectedItem.product_name}</DialogTitle>
          <DialogDescription>
            Harga Asli:{' '}
            {formatCurrency(selectedItem.original_price, currencySymbol)}
          </DialogDescription>
        </DialogHeader>
        <div className='py-4 space-y-4'>
          <div>
            <Label>Tipe Diskon</Label>
            <ToggleGroup
              type='single'
              value={discountType}
              onValueChange={(value: 'nominal' | 'percentage') =>
                value && setDiscountType(value)
              }
              className='mt-1'
            >
              <ToggleGroupItem value='nominal'>Nominal</ToggleGroupItem>
              <ToggleGroupItem value='percentage'>Persen (%)</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div>
            <Label htmlFor='discount-value'>Jumlah Diskon</Label>
            <div className='relative mt-1'>
              {discountType === 'nominal' && (
                <span className='absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground'>
                  {currencySymbol}
                </span>
              )}
              <Input
                id='discount-value'
                type='number'
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder='0'
                className={discountType === 'nominal' ? 'pl-8' : ''}
              />
              {discountType === 'percentage' && (
                <span className='absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground'>
                  %
                </span>
              )}
            </div>
          </div>
          <div className='p-4 bg-muted rounded-lg text-sm'>
            <p>
              Potongan:{' '}
              <span className='font-medium'>
                {formatCurrency(previewActualDiscountAmount, currencySymbol)}
              </span>
            </p>
            <p>
              Harga Baru:{' '}
              <span className='font-medium'>
                {formatCurrency(previewDiscountedPrice, currencySymbol)}
              </span>
            </p>
          </div>
        </div>
        <DialogFooter className='justify-between'>
          <Button
            variant='destructive'
            onClick={handleRemoveCurrentItemDiscount}
          >
            Hapus Diskon
          </Button>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={onClose}>
              Batal
            </Button>
            <Button onClick={handleConfirmItemDiscount}>Simpan Diskon</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
