import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  Grid,
  HistoryIcon,
  Info,
  List,
  Loader2,
  LogOut,
  PlayCircle,
  PlayCircleIcon,
  StopCircle,
} from 'lucide-react'
import type { ViewMode, Shift, Branch } from '@/lib/types'
import { User } from 'firebase/auth'

interface PosHeaderProps {
  selectedBranch: Branch
  currentUser: User
  loadingShift: boolean
  isEndingShift: boolean
  activeShift: Shift | null
  prepareEndShiftCalculations: () => void
  setShowStartShiftModal: (show: boolean) => void
  setShowAllShiftTransactionsDialog: (show: boolean) => void
  setShowShiftCashDetailsDialog: (show: boolean) => void
}

export default function PosHeader({
  activeShift,
  selectedBranch,
  currentUser,
  loadingShift,
  isEndingShift,
  prepareEndShiftCalculations,
  setShowStartShiftModal,
  setShowAllShiftTransactionsDialog,
  setShowShiftCashDetailsDialog,
}: PosHeaderProps) {
  const router = useRouter()
  return (
    <header className='grid grid-cols-3 items-center justify-between p-3 border-b bg-card shadow-sm sticky top-0 z-10 gap-3'>
      <div className='flex items-center gap-2 col-span-1'>
        <DollarSign className='h-6 w-6 text-primary' />
        <h1 className='text-lg font-semibold font-headline'>
          {loadingShift ? (
            // Tampilkan div dengan ikon spinner dan teks saat loading
            <div className='flex items-center text-muted-foreground text-sm'>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              <span>Sedang memuat data shift...</span>
            </div>
          ) : (
            // Tampilkan teks POS dan nama cabang jika tidak loading
            <>
              {'POS '}
              {selectedBranch ? `- ${selectedBranch.name}` : '(Pilih Cabang)'}
            </>
          )}
        </h1>
      </div>

      {activeShift ? (
        <div className='col-span-1 text-center'>
          <p className='text-green-600 font-medium flex items-center justify-center text-sm'>
            <PlayCircleIcon className='h-4 w-4 mr-1.5' /> SHIFT AKTIF
          </p>
        </div>
      ) : (
        <div className='col-span-1 text-center'>
          <Button
            variant='default'
            size='sm'
            className='text-xs h-8'
            onClick={() => setShowStartShiftModal(true)}
            disabled={!selectedBranch || !currentUser}
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
              onClick={() => setShowAllShiftTransactionsDialog(true)}
            >
              <HistoryIcon className='mr-1.5 h-3.5 w-3.5' /> Riwayat Shift Ini
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='h-8 text-xs'
              onClick={() => setShowShiftCashDetailsDialog(true)}
            >
              <Info className='mr-1.5 h-3.5 w-3.5' /> Info Kas Shift
            </Button>
            <Button
              variant='destructive'
              size='sm'
              className='text-xs h-8'
              onClick={prepareEndShiftCalculations}
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

    // <div className='flex items-center justify-between mb-4 gap-4 bg-card p-2 rounded-lg shadow'>
    //   <div className='flex-1'>
    //     <Input
    //       placeholder='Cari produk (nama atau SKU)...'
    //       value={searchTerm}
    //       onChange={(e) => setSearchTerm(e.target.value)}
    //       className='max-w-sm'
    //       disabled={!activeShift}
    //     />
    //   </div>
    //   <div className='flex items-center gap-2'>
    //     <div className='hidden md:block'>
    //       <Button
    //         variant={viewMode === 'card' ? 'secondary' : 'ghost'}
    //         size='icon'
    //         onClick={() => handleSetViewMode('card')}
    //         disabled={!activeShift}
    //         aria-label='Tampilan Kartu'
    //       >
    //         <Grid className='h-4 w-4' />
    //       </Button>
    //       <Button
    //         variant={viewMode === 'table' ? 'secondary' : 'ghost'}
    //         size='icon'
    //         onClick={() => handleSetViewMode('table')}
    //         disabled={!activeShift}
    //         aria-label='Tampilan Tabel'
    //       >
    //         <List className='h-4 w-4' />
    //       </Button>
    //     </div>
    //     {activeShift ? (
    //       <Button variant='destructive' onClick={prepareEndShiftCalculations}>
    //         Akhiri Shift
    //       </Button>
    //     ) : (
    //       <Button onClick={() => setShowStartShiftModal(true)}>
    //         Mulai Shift
    //       </Button>
    //     )}
    //   </div>
    // </div>
  )
}
