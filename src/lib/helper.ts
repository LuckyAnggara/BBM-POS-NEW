import { isValid, parseISO, format } from 'date-fns'
import { useBranches } from '@/contexts/branch-context'

import moment from 'moment'
import 'moment/locale/id'

export const formatDateIntl = (isoString?: string): string => {
  // Jika string tidak ada atau kosong, kembalikan 'N/A'
  if (!isoString) {
    return 'N/A'
  }

  const date = parseISO(isoString)

  // Periksa apakah tanggalnya valid setelah di-parse
  if (!isValid(date)) {
    return 'Tanggal Tidak Valid'
  }

  return format(date, 'dd-MM-yyyy')
}

// Format tanggal dengan moment.js dan bahasa dinamis dari selectedBranch.intl
export const formatDateIntlIntl = (
  dateInput: string | Date | undefined
): string => {
  const intl: string = 'id'
  if (!dateInput) return 'N/A'
  try {
    // Set locale, fallback ke 'id' jika ID
    const locale = intl.toLowerCase() === 'id' ? 'id' : intl.toLowerCase()
    const m = moment(dateInput).locale(locale)
    // Format: 01 Januari 2025
    return m.format('DD MMMM YYYY')
  } catch (error) {
    console.error('Invalid date format:', dateInput, error)
    return 'Invalid Date'
  }
}

export const formatDateIntlTwo = (
  dateInput: string | Date | undefined,
  includeTime = false
) => {
  if (!dateInput) return 'N/A'
  try {
    const date = new Date(dateInput)
    return format(date, includeTime ? 'dd MMM yyyy, HH:mm' : 'dd MMM yyyy')
  } catch (error) {
    console.error('Invalid date format:', dateInput, error)
    return 'Invalid Date'
  }
}

export const formatCurrency = (amount: number): string => {
  const currency: string = 'IDR'

  if (isNaN(amount)) return `${currency} 0`

  const hasDecimal = amount % 1 !== 0

  const formattedAmount = Math.floor(amount).toLocaleString('id-ID', {
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: 2,
  })

  return `${currency} ${formattedAmount}`
}
