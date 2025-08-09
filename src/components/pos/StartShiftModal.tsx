import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'

interface StartShiftModalProps {
  show: boolean
  onClose: () => void
  initialCashInput: string
  setInitialCashInput: (value: string) => void
  handleStartShift: () => void
  currencySymbol: string
}

export default function StartShiftModal({
  show,
  onClose,
  initialCashInput,
  setInitialCashInput,
  handleStartShift,
  currencySymbol,
}: StartShiftModalProps) {
  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mulai Shift Baru</DialogTitle>
        </DialogHeader>
        <div className='py-4'>
          <Label htmlFor='initial-cash'>Modal Awal Kas</Label>
          <div className='relative mt-2'>
            <span className='absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground'>
              {currencySymbol}
            </span>
            <Input
              id='initial-cash'
              type='number'
              value={initialCashInput}
              onChange={(e) => setInitialCashInput(e.target.value)}
              placeholder='0'
              className='pl-8'
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleStartShift}>Mulai Shift</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
