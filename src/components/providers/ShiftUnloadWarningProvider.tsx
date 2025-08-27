'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useShiftUnloadWarning } from '@/hooks/useShiftUnloadWarning'
import { ShiftWarningDialog } from '@/components/dialogs/ShiftWarningDialog'

/**
 * Komponen yang menangani warning shift aktif ketika user meninggalkan halaman.
 * Komponen ini harus ditempatkan di level tinggi aplikasi (misalnya di layout).
 */
export function ShiftUnloadWarningProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const {
    activeShift,
    showWarningDialog,
    handleConfirmLeave,
    handleCancelLeave,
    showWarning,
  } = useShiftUnloadWarning()

  // Remove global link interception - only handle manual calls
  // useEffect(() => {
  //   // Global link interception removed to prevent dialog on every navigation
  // }, [])

  return (
    <>
      {children}
      <ShiftWarningDialog
        open={showWarningDialog}
        onOpenChange={() => {}} // Controlled by hook
        shift={activeShift}
        onConfirmLeave={handleConfirmLeave}
        onCancelLeave={handleCancelLeave}
      />
    </>
  )
}
