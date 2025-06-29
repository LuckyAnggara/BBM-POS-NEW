import React from 'react'
import { Button } from '@/components/ui/button'
import {
  LogOut,
  PlayCircle,
  StopCircle,
  History as HistoryIcon,
  Info,
  DollarSign,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { POSShift } from '@/lib/appwrite/pos'

interface PosHeaderProps {
  selectedBranchName: string | undefined
  activeShift: POSShift | null
  isEndingShift: boolean
  onShowStartShiftModal: () => void
  onPrepareEndShift: () => void
  onShowAllTransactions: () => void
  onShowCashInfo: () => void
  isUserAndBranchSelected: boolean
}

export function PosHeader({
  selectedBranchName,
  activeShift,
  isEndingShift,
  onShowStartShiftModal,
  onPrepareEndShift,
  onShowAllTransactions,
  onShowCashInfo,
  isUserAndBranchSelected,
}: PosHeaderProps) {
  const router = useRouter()

  return (
    <header className='grid grid-cols-3 items-center justify-between p-3 border-b bg-card shadow-sm sticky top-0 z-10 gap-3'>
      <div className='flex items-center gap-2 col-span-1'>
        <DollarSign className='h-6 w-6 text-primary' />
        <h1 className='text-lg font-semibold font-headline'>
          POS{' '}
          {selectedBranchName ? `- ${selectedBranchName}` : '(Pilih Cabang)'}
        </h1>
      </div>

      {activeShift ? (
        <div className='col-span-1 text-center'>
          <p className='text-green-600 font-medium flex items-center justify-center text-sm'>
            <PlayCircle className='h-4 w-4 mr-1.5' /> Shift Aktif
          </p>
        </div>
      ) : (
        <div className='col-span-1 text-center'>
          <Button
            variant='default'
            size='sm'
            className='text-xs h-8'
            onClick={onShowStartShiftModal}
            disabled={!isUserAndBranchSelected}
          >
            <PlayCircle className='mr-1.5 h-3.5 w-3.5' /> Mulai Shift
          </Button>
        </div>
      )}

      <div className='col-span-1 flex justify-end items-center gap-2'>
        {activeShift && (
          <>
            <Button
              variant='outline'
              size='sm'
              className='h-8 text-xs'
              onClick={onShowAllTransactions}
            >
              <HistoryIcon className='mr-1.5 h-3.5 w-3.5' /> Riwayat Shift Ini
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='h-8 text-xs'
              onClick={onShowCashInfo}
            >
              <Info className='mr-1.5 h-3.5 w-3.5' /> Info Kas Shift
            </Button>
            <Button
              variant='destructive'
              size='sm'
              className='text-xs h-8'
              onClick={onPrepareEndShift}
              disabled={isEndingShift}
            >
              {isEndingShift ? (
                'Memproses...'
              ) : (
                <>
                  <StopCircle className='mr-1.5 h-3.5 w-3.5' /> Akhiri Shift
                </>
              )}
            </Button>
          </>
        )}
        <Button
          variant='outline'
          size='sm'
          className='h-8 text-xs'
          onClick={() => router.push('/dashboard')}
        >
          <LogOut className='mr-1.5 h-3.5 w-3.5' /> Keluar
          <span className='sr-only'>Keluar dari Mode POS</span>
        </Button>
      </div>
    </header>
  )
}
