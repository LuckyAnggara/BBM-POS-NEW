'use client'

import React from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Clock, AlertTriangle, Users, DollarSign } from 'lucide-react'
import { Shift } from '@/lib/types'
import { formatDateIntlTwo, formatCurrency } from '@/lib/helper'

interface ShiftWarningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift: Shift | null
  onConfirmLeave: () => void
  onCancelLeave: () => void
}

export function ShiftWarningDialog({
  open,
  onOpenChange,
  shift,
  onConfirmLeave,
  onCancelLeave,
}: ShiftWarningDialogProps) {
  if (!shift) return null

  const shiftDuration = shift.start_shift
    ? Math.floor(
        (new Date().getTime() - new Date(shift.start_shift).getTime()) /
          (1000 * 60)
      )
    : 0

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className='sm:max-w-[500px] animate-in fade-in-0 zoom-in-95 duration-300'>
        <AlertDialogHeader className='space-y-4'>
          <div className='flex items-center gap-3'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20'>
              <AlertTriangle className='h-6 w-6 text-orange-600 dark:text-orange-400' />
            </div>
            <div>
              <AlertDialogTitle className='text-xl font-bold text-gray-900 dark:text-gray-100'>
                Shift Masih Aktif!
              </AlertDialogTitle>
              <Badge variant='destructive' className='mt-1 animate-pulse'>
                Status: Aktif
              </Badge>
            </div>
          </div>

          <AlertDialogDescription asChild>
            <div className='space-y-4 text-sm text-gray-600 dark:text-gray-300'>
              <p className='text-base'>
                Anda memiliki shift yang masih aktif. Pastikan untuk menutup
                shift sebelum meninggalkan aplikasi untuk menjaga keamanan data
                transaksi.
              </p>

              <div className='rounded-lg border bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3'>
                <h4 className='font-medium text-gray-900 dark:text-gray-100'>
                  Detail Shift Aktif:
                </h4>

                <div className='grid grid-cols-2 gap-4 text-sm'>
                  <div className='flex items-center gap-2'>
                    <Clock className='h-4 w-4 text-blue-500' />
                    <div>
                      <p className='font-medium'>Mulai Shift</p>
                      <p className='text-gray-500'>
                        {shift.start_shift
                          ? formatDateIntlTwo(shift.start_shift, true)
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <Users className='h-4 w-4 text-green-500' />
                    <div>
                      <p className='font-medium'>Kasir</p>
                      <p className='text-gray-500'>
                        {shift.user_name || 'Unknown'}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <DollarSign className='h-4 w-4 text-yellow-500' />
                    <div>
                      <p className='font-medium'>Modal Awal</p>
                      <p className='text-gray-500'>
                        {formatCurrency(shift.starting_balance || 0)}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <Clock className='h-4 w-4 text-purple-500' />
                    <div>
                      <p className='font-medium'>Durasi</p>
                      <p className='text-gray-500'>
                        {shiftDuration > 60
                          ? `${Math.floor(shiftDuration / 60)}j ${
                              shiftDuration % 60
                            }m`
                          : `${shiftDuration}m`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className='rounded-lg border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/20 p-3'>
                <div className='flex items-start gap-2'>
                  <AlertTriangle className='h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0' />
                  <div className='text-sm'>
                    <p className='font-medium text-orange-800 dark:text-orange-200'>
                      Penting untuk Keamanan Data
                    </p>
                    <p className='text-orange-700 dark:text-orange-300 mt-1'>
                      Menutup shift memastikan semua transaksi tercatat dengan
                      benar dan laporan keuangan akurat.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className='gap-2 sm:gap-2'>
          <AlertDialogCancel
            onClick={onCancelLeave}
            className='bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
          >
            Tutup Shift Dulu
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmLeave}
            className='bg-orange-600 hover:bg-orange-700 text-white'
          >
            Tetap Keluar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
