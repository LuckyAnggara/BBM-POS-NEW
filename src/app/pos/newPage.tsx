'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useBranch } from '@/contexts/branch-context'
import { getActiveShift, endShift, POSShift } from '@/lib/appwrite/pos'
import { useToast } from '@/hooks/use-toast'

import { POSHeader } from '@/components/pos/pos-header'
import { POSContainer } from '@/components/pos/pos-container'
import { StartShiftDialog } from '@/components/pos/start-shift-dialog'
import { Toaster } from '@/components/ui/toaster'
import { Skeleton } from '@/components/ui/skeleton'
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

export default function POSPage() {
  const { currentUser, userData } = useAuth()
  const { selectedBranch } = useBranch()
  const { toast } = useToast()

  const [activeShift, setActiveShift] = useState<POSShift | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStartShiftDialogOpen, setStartShiftDialogOpen] = useState(false)
  const [isEndShiftConfirmOpen, setEndShiftConfirmOpen] = useState(false)

  const checkActiveShift = async () => {
    if (!currentUser?.$id || !selectedBranch?.id) return
    setIsLoading(true)
    const shift = await getActiveShift(selectedBranch.id, currentUser.$id)
    setActiveShift(shift)
    setIsLoading(false)
  }

  useEffect(() => {
    checkActiveShift()
  }, [currentUser, selectedBranch])

  const handleShiftStarted = (newShift: POSShift) => {
    setActiveShift(newShift)
    setStartShiftDialogOpen(false)
  }

  const handleEndShift = async () => {
    if (!activeShift) return
    const result = await endShift(activeShift.id)
    if (result?.error) {
      toast({
        title: 'Gagal',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Sukses', description: 'Shift berhasil diakhiri.' })
      setActiveShift(null)
    }
    setEndShiftConfirmOpen(false)
  }

  if (isLoading) {
    return (
      <div className='p-4 md:p-8 pt-6 space-y-4'>
        <Skeleton className='h-20 w-full' />
        <Skeleton className='h-[70vh] w-full' />
      </div>
    )
  }

  return (
    <div className='flex flex-col h-full p-4 md:p-8 pt-6 space-y-4'>
      <POSHeader
        activeShift={activeShift}
        userName={userData?.name || ''}
        onStartShiftClick={() => setStartShiftDialogOpen(true)}
        onEndShiftClick={() => setEndShiftConfirmOpen(true)}
      />
      <POSContainer
        key={activeShift?.id || 'no-shift'} // Reset state container saat shift berubah
        activeShift={activeShift}
      />

      <StartShiftDialog
        isOpen={isStartShiftDialogOpen}
        onOpenChange={setStartShiftDialogOpen}
        onShiftStarted={handleShiftStarted}
        userId={currentUser?.$id || ''}
        userName={userData?.name || ''}
        branchId={selectedBranch?.id || ''}
      />

      <AlertDialog
        open={isEndShiftConfirmOpen}
        onOpenChange={setEndShiftConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Anda yakin ingin mengakhiri shift?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan mengakhiri sesi penjualan Anda. Pastikan semua
              transaksi sudah selesai.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndShift}>
              Ya, Akhiri Shift
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  )
}
