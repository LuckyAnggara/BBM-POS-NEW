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
import { formatCurrency } from '@/lib/utils'

interface CashPaymentModalProps {
  show: boolean
  onClose: () => void
  total: number
  cashAmountPaidInput: string
  setCashAmountPaidInput: (value: string) => void
  calculatedChange: number | null
  handleConfirmCashPayment: () => void
  isProcessingSale: boolean
  currencySymbol: string
}

export default function CashPaymentModal({
  show,
  onClose,
  total,
  cashAmountPaidInput,
  setCashAmountPaidInput,
  calculatedChange,
  handleConfirmCashPayment,
  isProcessingSale,
  currencySymbol,
}: CashPaymentModalProps) {
  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pembayaran Tunai</DialogTitle>
          <DialogDescription>
            Total Belanja: {formatCurrency(total, currencySymbol)}
          </DialogDescription>
        </DialogHeader>
        <div className='py-4 space-y-4'>
          <div>
            <Label htmlFor='cash-paid'>Jumlah Dibayar</Label>
            <div className='relative mt-1'>
              <span className='absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground'>
                {currencySymbol}
              </span>
              <Input
                id='cash-paid'
                type='number'
                value={cashAmountPaidInput}
                onChange={(e) => setCashAmountPaidInput(e.target.value)}
                placeholder='0'
                className='pl-8'
              />
            </div>
          </div>
          {calculatedChange !== null && (
            <div className='text-center text-lg'>
              <p>Kembalian:</p>
              <p className='font-bold'>
                {formatCurrency(calculatedChange, currencySymbol)}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={onClose}
            disabled={isProcessingSale}
          >
            Batal
          </Button>
          <Button
            onClick={handleConfirmCashPayment}
            disabled={isProcessingSale || calculatedChange === null}
          >
            {isProcessingSale ? 'Memproses...' : 'Konfirmasi Pembayaran'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
