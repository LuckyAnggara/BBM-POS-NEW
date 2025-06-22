import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { POSTransaction } from '@/lib/appwrite/pos'

interface PaymentDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  totalAmount: number
  onSubmit: (data: {
    paymentMethod: POSTransaction['paymentMethod']
    amountPaid: number
  }) => void
}

export const PaymentDialog = ({
  isOpen,
  onOpenChange,
  totalAmount,
  onSubmit,
}: PaymentDialogProps) => {
  const [paymentMethod, setPaymentMethod] =
    useState<POSTransaction['paymentMethod']>('cash')
  const [amountPaid, setAmountPaid] = useState(0)

  const change = useMemo(
    () => amountPaid - totalAmount,
    [amountPaid, totalAmount]
  )
  const canSubmit = amountPaid >= totalAmount

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({ paymentMethod, amountPaid })
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setAmountPaid(0)
      setPaymentMethod('cash')
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pembayaran</DialogTitle>
          <DialogDescription>
            Total Belanja:{' '}
            <strong>
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
              }).format(totalAmount)}
            </strong>
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4'>
          <div>
            <Label>Metode Pembayaran</Label>
            <RadioGroup
              defaultValue='cash'
              className='grid grid-cols-2 gap-4 mt-2'
              onValueChange={(v) => setPaymentMethod(v as any)}
            >
              <div>
                <RadioGroupItem
                  value='cash'
                  id='cash'
                  className='peer sr-only'
                />
                <Label
                  htmlFor='cash'
                  className='flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary'
                >
                  Cash
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value='qris'
                  id='qris'
                  className='peer sr-only'
                />
                <Label
                  htmlFor='qris'
                  className='flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary'
                >
                  QRIS
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div>
            <Label htmlFor='amountPaid'>Jumlah Dibayar (Rp)</Label>
            <Input
              id='amountPaid'
              type='number'
              value={amountPaid}
              onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
            />
          </div>
          {change >= 0 && (
            <div className='text-right font-semibold'>
              Kembalian:{' '}
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
              }).format(change)}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => handleOpenChange(false)}
          >
            Batal
          </Button>
          <Button type='button' onClick={handleSubmit} disabled={!canSubmit}>
            Konfirmasi Pembayaran
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
