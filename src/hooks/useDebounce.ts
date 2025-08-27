import { useState, useEffect } from 'react'

/**
 * Hook untuk melakukan debounce pada value
 * @param value - Value yang akan di-debounce
 * @param delay - Delay dalam milliseconds (default: 300ms)
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set debounced value setelah delay
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cleanup function yang akan dipanggil setiap value atau delay berubah
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
