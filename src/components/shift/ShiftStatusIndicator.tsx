'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useShiftUnloadWarning } from '@/hooks/useShiftUnloadWarning'
import { useShiftAwareNavigation } from '@/hooks/useShiftAwareNavigation'
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react'

/**
 * Komponen demo untuk menunjukkan cara penggunaan shift warning system.
 * Komponen ini bisa digunakan di dashboard atau halaman lain yang perlu menampilkan status shift.
 */
export function ShiftStatusIndicator() {
  const { activeShift, refreshActiveShift } = useShiftUnloadWarning()
  const navigation = useShiftAwareNavigation()

  const handleTestNavigation = () => {
    // Contoh navigasi yang akan menampilkan warning jika ada shift aktif
    navigation.push('/dashboard')
  }

  return (
    <Card className='w-full max-w-md'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <Clock className='h-5 w-5' />
          Status Shift
        </CardTitle>
        <CardDescription>
          Monitor status shift aktif dan warning system
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {activeShift ? (
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium'>Status:</span>
              <Badge
                variant={
                  activeShift.status === 'open' ? 'destructive' : 'secondary'
                }
                className={activeShift.status === 'open' ? 'animate-pulse' : ''}
              >
                {activeShift.status === 'open' ? (
                  <>
                    <AlertTriangle className='h-3 w-3 mr-1' />
                    Aktif
                  </>
                ) : (
                  <>
                    <CheckCircle className='h-3 w-3 mr-1' />
                    Ditutup
                  </>
                )}
              </Badge>
            </div>

            <div className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span className='text-gray-600'>Kasir:</span>
                <span className='font-medium'>
                  {activeShift.user_name || 'Unknown'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600'>Mulai:</span>
                <span className='font-medium'>
                  {activeShift.start_shift
                    ? new Date(activeShift.start_shift).toLocaleTimeString(
                        'id-ID',
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )
                    : 'N/A'}
                </span>
              </div>
            </div>

            {activeShift.status === 'open' && (
              <div className='p-3 bg-orange-50 dark:bg-orange-900/20 rounded-md border border-orange-200 dark:border-orange-800'>
                <div className='flex items-start gap-2'>
                  <AlertTriangle className='h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0' />
                  <div className='text-sm'>
                    <p className='font-medium text-orange-800 dark:text-orange-200'>
                      Shift Aktif
                    </p>
                    <p className='text-orange-700 dark:text-orange-300'>
                      Warning akan muncul jika Anda mencoba meninggalkan
                      halaman.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className='text-center py-4'>
            <CheckCircle className='h-8 w-8 text-green-500 mx-auto mb-2' />
            <p className='text-sm text-gray-600'>Tidak ada shift aktif</p>
          </div>
        )}

        <div className='space-y-2'>
          <Button
            onClick={refreshActiveShift}
            variant='outline'
            size='sm'
            className='w-full'
          >
            Refresh Status
          </Button>

          <Button
            onClick={handleTestNavigation}
            variant='secondary'
            size='sm'
            className='w-full'
          >
            Test Navigation Warning
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
