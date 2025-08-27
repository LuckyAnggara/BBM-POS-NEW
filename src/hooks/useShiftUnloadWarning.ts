import { useCallback, useEffect, useRef, useState } from 'react'
import { Shift } from '@/lib/types'
import { getActiveShift } from '@/lib/laravel/shiftService'

/**
 * Hook yang menangani warning ketika user mencoba meninggalkan halaman
 * saat ada shift aktif. Mengembalikan state dan functions untuk mengelola dialog.
 */
export function useShiftUnloadWarning() {
  const [activeShiftSummary, setActiveShiftSummary] = useState<Shift | null>(
    null
  )
  const [showWarningDialog, setShowWarningDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<
    (() => void) | null
  >(null)
  const isNavigatingRef = useRef(false)
  const pendingPromiseRef = useRef<{
    resolve: (value: boolean) => void
    reject: (reason: any) => void
  } | null>(null)

  const fetchActiveShift = useCallback(async () => {
    try {
      const shift = await getActiveShift()
      setActiveShiftSummary(shift)
    } catch (error) {
      console.error('Failed to fetch active shift:', error)
      setActiveShiftSummary(null)
    }
  }, [])

  useEffect(() => {
    fetchActiveShift()
    // Refresh active shift data setiap 30 detik
    const interval = setInterval(fetchActiveShift, 30000)
    return () => clearInterval(interval)
  }, [fetchActiveShift])

  // Function untuk menangani konfirmasi keluar
  const handleConfirmLeave = useCallback(() => {
    isNavigatingRef.current = true
    setShowWarningDialog(false)

    if (pendingPromiseRef.current) {
      pendingPromiseRef.current.resolve(true)
      pendingPromiseRef.current = null
    }

    if (pendingNavigation) {
      pendingNavigation()
      setPendingNavigation(null)
    }
  }, [pendingNavigation])

  // Function untuk membatalkan keluar
  const handleCancelLeave = useCallback(() => {
    setShowWarningDialog(false)

    if (pendingPromiseRef.current) {
      pendingPromiseRef.current.resolve(false)
      pendingPromiseRef.current = null
    }

    setPendingNavigation(null)
  }, [])

  // Function untuk menampilkan dialog warning dengan Promise
  const showWarning = useCallback(
    async (navigationCallback?: () => void): Promise<boolean> => {
      if (activeShiftSummary?.status === 'open') {
        return new Promise((resolve, reject) => {
          pendingPromiseRef.current = { resolve, reject }
          setShowWarningDialog(true)

          if (navigationCallback) {
            setPendingNavigation(() => navigationCallback)
          }
        })
      }
      return true // No warning needed, allow navigation
    },
    [activeShiftSummary]
  )

  // Function legacy untuk backward compatibility
  const showWarningSync = useCallback(
    (navigationCallback?: () => void) => {
      if (activeShiftSummary?.status === 'open') {
        setShowWarningDialog(true)
        if (navigationCallback) {
          setPendingNavigation(() => navigationCallback)
        }
        return true // Indicates warning was shown
      }
      return false // No warning needed
    },
    [activeShiftSummary]
  )

  useEffect(() => {
    // Handler untuk event saat pengguna mencoba menutup tab, refresh, atau navigasi keluar situs
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Cek apakah ada shift aktif DAN pengguna tidak sedang dalam proses navigasi internal yang sudah dikonfirmasi
      if (activeShiftSummary?.status === 'open' && !isNavigatingRef.current) {
        // Mencegah browser langsung menutup halaman
        e.preventDefault()
        // Memberi sinyal ke browser untuk menampilkan dialog konfirmasi bawaan
        e.returnValue =
          'Masih ada shift aktif yang belum ditutup. Yakin ingin keluar?'
        return e.returnValue
      }
      return undefined // Izinkan keluar tanpa peringatan jika tidak ada shift aktif
    }

    // Handler ini lebih untuk logging atau cleanup di beberapa browser mobile
    const handlePageHide = (e: PageTransitionEvent) => {
      if (
        activeShiftSummary?.status === 'open' &&
        !e.persisted &&
        !isNavigatingRef.current
      ) {
        // Anda bisa mengirim beacon/log ke server di sini jika perlu
        console.warn('User meninggalkan halaman dengan shift aktif')
      }
    }

    // Tambahkan event listener HANYA jika ada shift yang sedang aktif
    if (activeShiftSummary?.status == 'open') {
      window.addEventListener('beforeunload', handleBeforeUnload)
      window.addEventListener('pagehide', handlePageHide)
    }

    // Fungsi cleanup: hapus event listener saat komponen unmount atau saat status shift berubah
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [activeShiftSummary]) // Efek ini akan berjalan kembali jika status shift berubah

  return {
    activeShift: activeShiftSummary,
    showWarningDialog,
    showWarning, // Promise-based version
    showWarningSync, // Legacy sync version
    handleConfirmLeave,
    handleCancelLeave,
    refreshActiveShift: fetchActiveShift,
  }
}
