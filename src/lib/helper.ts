import { isValid, parseISO, format } from 'date-fns'
import { useBranch } from '@/contexts/branch-context'

export const formatDate = (isoString?: string): string => {
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

export const formatDateTwo = (
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

export const formatCurrency = (amount: number) => {
  const { selectedBranch } = useBranch()
  return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString('id-ID')}`
}
