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

// Format tanggal dengan moment.js dan bahasa dinamis dari selectedBranch.locale
export const formatDateIntlIntl = (
  dateInput: string | Date | undefined,
  branchLocale?: string
): string => {
  const locale = branchLocale || 'id-ID'
  if (!dateInput) return 'N/A'
  try {
    // Set locale, fallback ke 'id' jika ID
    const momentLocale = locale.toLowerCase().includes('id')
      ? 'id'
      : locale.toLowerCase().split('-')[0]
    const m = moment(dateInput).locale(momentLocale)
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

export const formatCurrency = (
  amount: number,
  currency?: string,
  numberFormat?: string
): string => {
  const currencyCode = currency || 'IDR'

  if (isNaN(amount)) return `${currencyCode} 0`

  const hasDecimal = amount % 1 !== 0

  // Handle different number formats
  let formattedAmount: string
  if (numberFormat === 'comma-decimal') {
    // European format: 1.234,56
    formattedAmount = Math.floor(amount).toLocaleString('de-DE', {
      minimumFractionDigits: hasDecimal ? 2 : 0,
      maximumFractionDigits: 2,
    })
  } else {
    // Default dot-decimal format: 1,234.56
    formattedAmount = Math.floor(amount).toLocaleString('id-ID', {
      minimumFractionDigits: hasDecimal ? 2 : 0,
      maximumFractionDigits: 2,
    })
  }

  return `${currencyCode} ${formattedAmount}`
}

// Helper untuk mendapatkan timezone dari branch settings
export const getBranchTimezone = (branchTimezone?: string): string => {
  return branchTimezone || 'Asia/Jakarta'
}

// Helper untuk format tanggal dengan timezone branch
export const formatDateWithTimezone = (
  dateInput: string | Date | undefined,
  branchTimezone?: string,
  includeTime = false
): string => {
  if (!dateInput) return 'N/A'
  try {
    const timezone = getBranchTimezone(branchTimezone)
    const date = new Date(dateInput)
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      ...(includeTime && {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }
    return date.toLocaleDateString('id-ID', options)
  } catch (error) {
    console.error('Invalid date format:', dateInput, error)
    return 'Invalid Date'
  }
}
