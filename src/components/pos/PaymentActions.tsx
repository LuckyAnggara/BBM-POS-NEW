import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PaymentMethod } from '@/lib/types'

interface PaymentActionsProps {
  selectedPaymentMethod: PaymentMethod
  setSelectedPaymentMethod: (method: PaymentMethod) => void
  handleCompleteSale: () => void
  cartIsEmpty: boolean
}

export default function PaymentActions({
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  handleCompleteSale,
  cartIsEmpty,
}: PaymentActionsProps) {
  return (
    <div className='mt-4 p-4 bg-card rounded-lg shadow'>
      <div className='grid grid-cols-2 gap-4'>
        <Select
          value={selectedPaymentMethod}
          onValueChange={(value: PaymentMethod) =>
            setSelectedPaymentMethod(value)
          }
          disabled={cartIsEmpty}
        >
          <SelectTrigger>
            <SelectValue placeholder='Metode Bayar' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='cash'>Tunai</SelectItem>
            <SelectItem value='transfer'>Bank/Transfer</SelectItem>
            <SelectItem value='credit'>Kredit</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={handleCompleteSale}
          disabled={cartIsEmpty}
          size='lg'
          className='font-bold'
        >
          Bayar
        </Button>
      </div>
    </div>
  )
}
