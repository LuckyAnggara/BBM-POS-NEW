'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useShiftUnloadWarning } from './useShiftUnloadWarning'

/**
 * Hook yang menyediakan navigasi dengan built-in shift warning.
 * Gunakan hook ini sebagai pengganti useRouter() untuk navigasi yang aman.
 */
export function useShiftAwareNavigation() {
  const router = useRouter()
  const { showWarning } = useShiftUnloadWarning()

  const navigate = useCallback(
    async (path: string) => {
      const shouldProceed = await showWarning(() => {
        router.push(path)
      })

      // Jika user memilih untuk tetap melanjutkan navigasi
      if (shouldProceed) {
        router.push(path)
      }
    },
    [router, showWarning]
  )

  const replace = useCallback(
    async (path: string) => {
      const shouldProceed = await showWarning(() => {
        router.replace(path)
      })

      if (shouldProceed) {
        router.replace(path)
      }
    },
    [router, showWarning]
  )

  const back = useCallback(async () => {
    const shouldProceed = await showWarning(() => {
      router.back()
    })

    if (shouldProceed) {
      router.back()
    }
  }, [router, showWarning])

  const refresh = useCallback(() => {
    const wasWarningShown = showWarning(() => {
      router.refresh()
    })

    if (!wasWarningShown) {
      router.refresh()
    }
  }, [router, showWarning])

  return {
    push: navigate,
    replace,
    back,
    refresh,
    // Expose original router untuk kasus khusus
    router,
  }
}
