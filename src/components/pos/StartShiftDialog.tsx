import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useBranch } from '@/contexts/branch-context'

interface StartShiftDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onConfirm: (initialCash: number) => void
}

export function StartShiftDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: StartShiftDialogProps) {
  const [cashValue, setCashValue] = useState('')
  const { selectedBranch } = useBranch()
  // Reset input when dialog is closed
  useEffect(() => {
    if (!isOpen) {
      setCashValue('')
    }
  }, [isOpen])

  const handleConfirm = () => {
    const cash = parseFloat(cashValue)
    if (isNaN(cash) || cash < 0) {
      toast.error('Input Tidak Valid', {
        description: 'Modal awal kas harus berupa angka yang valid.',
      })
      return
    }
    onConfirm(cash)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-xs'>
        <DialogHeader>
          <DialogTitle className='text-base'>Mulai Shift Baru</DialogTitle>
          <DialogDescription className='text-xs'>
            Masukkan jumlah modal awal di laci kas.
          </DialogDescription>
        </DialogHeader>
        <div className='py-2 space-y-2'>
          <Label htmlFor='initialCashInput' className='text-xs'>
            Modal Awal Kas ({selectedBranch.currency})
          </Label>
          <Input
            id='initialCashInput'
            type='number'
            value={cashValue}
            onChange={(e) => setCashValue(e.target.value)}
            placeholder='Contoh: 500000'
            className='h-9 text-sm'
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type='button' variant='outline' className='text-xs h-8'>
              Batal
            </Button>
          </DialogClose>
          <Button onClick={handleConfirm} className='text-xs h-8'>
            Mulai Shift
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
