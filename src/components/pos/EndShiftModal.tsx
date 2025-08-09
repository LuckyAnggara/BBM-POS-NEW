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
import type { PaymentMethod } from '@/lib/types'

interface EndShiftModalProps {
  show: boolean
  onClose: () => void
  isEndingShift: boolean
  endShiftCalculations: {
    expectedCash: number
    totalSalesByPaymentMethod: Record<PaymentMethod, number>
    totalSales: number
  } | null
  actualCashAtEndInput: string
  setActualCashAtEndInput: (value: string) => void
  handleEndShiftConfirm: () => void
  currencySymbol: string
}

export default function EndShiftModal({
  show,
  onClose,
  isEndingShift,
  endShiftCalculations,
  actualCashAtEndInput,
  setActualCashAtEndInput,
  handleEndShiftConfirm,
  currencySymbol,
}: EndShiftModalProps) {
  if (!endShiftCalculations) return null

  const difference =
    parseFloat(actualCashAtEndInput || '0') - endShiftCalculations.expectedCash

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Konfirmasi Akhiri Shift</DialogTitle>
          <DialogDescription>
            Harap hitung kas fisik Anda dan masukkan jumlahnya di bawah ini.
          </DialogDescription>
        </DialogHeader>
        <div className='py-4 space-y-4'>
          <div className='p-4 bg-muted rounded-lg'>
            <h4 className='font-semibold mb-2'>Ringkasan Penjualan</h4>
            <div className='space-y-1 text-sm'>
              {Object.entries(
                endShiftCalculations.totalSalesByPaymentMethod
              ).map(([method, total]) => (
                <div key={method} className='flex justify-between'>
                  <span>Penjualan {method}</span>
                  <span>{formatCurrency(total, currencySymbol)}</span>
                </div>
              ))}
              <div className='flex justify-between font-bold pt-2 border-t'>
                <span>Total Penjualan</span>
                <span>
                  {formatCurrency(
                    endShiftCalculations.totalSales,
                    currencySymbol
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className='p-4 border rounded-lg'>
            <h4 className='font-semibold mb-2'>Perhitungan Kas</h4>
            <div className='space-y-1 text-sm'>
              <div className='flex justify-between'>
                <span>Kas Seharusnya</span>
                <span>
                  {formatCurrency(
                    endShiftCalculations.expectedCash,
                    currencySymbol
                  )}
                </span>
              </div>
              <div>
                <Label htmlFor='actual-cash'>Kas Aktual di Laci</Label>
                <div className='relative mt-1'>
                  <span className='absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground'>
                    {currencySymbol}
                  </span>
                  <Input
                    id='actual-cash'
                    type='number'
                    value={actualCashAtEndInput}
                    onChange={(e) => setActualCashAtEndInput(e.target.value)}
                    placeholder='0'
                    className='pl-8'
                  />
                </div>
              </div>
              <div
                className={`flex justify-between font-bold pt-2 ${
                  difference !== 0 ? 'text-red-500' : ''
                }`}
              >
                <span>Selisih</span>
                <span>{formatCurrency(difference, currencySymbol)}</span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={onClose} disabled={isEndingShift}>
            Batal
          </Button>
          <Button onClick={handleEndShiftConfirm} disabled={isEndingShift}>
            {isEndingShift ? 'Memproses...' : 'Konfirmasi & Akhiri Shift'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
