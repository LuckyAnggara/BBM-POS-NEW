// src/components/pos/dialogs/EndShiftDialog.tsx

import React, { useState, useEffect } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { POSShift, PaymentMethod } from '@/lib/appwrite/pos'
import { toast } from 'sonner'
import { useBranch } from '@/contexts/branch-context'

interface EndShiftDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onConfirm: (actualCash: number) => void
  isEndingShift: boolean
  activeShift: POSShift | null
  calculations: {
    expectedCash: number
    totalSalesByPaymentMethod: Record<PaymentMethod, number>
  } | null
}

export function EndShiftDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  isEndingShift,
  activeShift,
  calculations,
}: EndShiftDialogProps) {
  const [actualCashInput, setActualCashInput] = useState('')
  const [cashDifference, setCashDifference] = useState<number | null>(null)
  const { selectedBranch } = useBranch()

  useEffect(() => {
    if (!isOpen) {
      setActualCashInput('')
      setCashDifference(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (calculations) {
      const actualCash = parseFloat(actualCashInput)
      if (!isNaN(actualCash) && actualCash >= 0) {
        setCashDifference(actualCash - calculations.expectedCash)
      } else {
        setCashDifference(null)
      }
    }
  }, [actualCashInput, calculations])

  const handleConfirmClick = () => {
    const actualCash = parseFloat(actualCashInput)
    if (isNaN(actualCash) || actualCash < 0) {
      toast.error('Input Tidak Valid', {
        description: 'Kas aktual di laci tidak valid.',
      })
      return
    }
    onConfirm(actualCash)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className='sm:max-w-md'>
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi Akhiri Shift</AlertDialogTitle>
          <AlertDialogDescription className='text-xs'>
            {activeShift && calculations && (
              <div className='mt-2 p-2 border rounded-md bg-muted/50 text-xs space-y-1'>
                <p>
                  Modal Awal: {selectedBranch?.currency}
                  {activeShift.startingBalance.toLocaleString('id-ID')}
                </p>
                <p>
                  Total Penjualan Tunai: {selectedBranch?.currency}
                  {calculations.totalSalesByPaymentMethod.cash.toLocaleString(
                    'id-ID'
                  )}
                </p>
                <p>
                  Estimasi Kas Seharusnya: {selectedBranch?.currency}
                  <span className='font-semibold'>
                    {calculations.expectedCash.toLocaleString('id-ID')}
                  </span>
                </p>
              </div>
            )}
            <div className='mt-3'>
              <Label htmlFor='actualCashAtEndInput' className='text-xs'>
                Kas Aktual di Laci ({selectedBranch?.currency})
              </Label>
              <Input
                id='actualCashAtEndInput'
                type='number'
                value={actualCashInput}
                onChange={(e) => setActualCashInput(e.target.value)}
                placeholder='Hitung dan masukkan kas aktual'
                className='h-9 text-sm mt-1'
              />
            </div>
            {cashDifference !== null && (
              <p className='mt-2 font-medium text-xs'>
                Selisih Kas:{' '}
                <span
                  className={cn(
                    cashDifference < 0 ? 'text-destructive' : 'text-green-600'
                  )}
                >
                  {selectedBranch?.currency}
                  {cashDifference.toLocaleString('id-ID')}
                  {cashDifference === 0 && ' (Sesuai)'}
                  {cashDifference > 0 && ' (Lebih)'}
                  {cashDifference < 0 && ' (Kurang)'}
                </span>
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} className='text-xs h-8'>
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            className='text-xs h-8 bg-destructive hover:bg-destructive/90'
            onClick={handleConfirmClick}
            disabled={
              isEndingShift || !actualCashInput.trim() || actualCashInput === ''
            }
          >
            {isEndingShift ? 'Memproses...' : 'Ya, Akhiri Shift'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
