import { useEffect, useRef } from 'react'
import { Shift } from '@/lib/types'

/**
 * Adds beforeunload + pagehide listeners that warn user if an active shift exists.
 * Browsers show a generic dialog; returning a string triggers it.
 */
export function useShiftUnloadWarning(activeShift: Shift | null | undefined) {
  const shiftRef = useRef<Shift | null | undefined>(activeShift)

  useEffect(() => {
    shiftRef.current = activeShift
  }, [activeShift])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (shiftRef.current) {
        e.preventDefault()
        e.returnValue = 'Masih ada shift aktif yang belum ditutup.'
        return 'Masih ada shift aktif yang belum ditutup.'
      }
      return undefined
    }
    const pageHideHandler = (e: PageTransitionEvent) => {
      if (shiftRef.current && !e.persisted) {
        // No-op; kept for potential future logging or beacon.
      }
    }
    window.addEventListener('beforeunload', handler)
    window.addEventListener('pagehide', pageHideHandler)
    return () => {
      window.removeEventListener('beforeunload', handler)
      window.removeEventListener('pagehide', pageHideHandler)
    }
  }, [])
}
