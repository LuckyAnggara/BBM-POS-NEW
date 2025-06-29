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

export const formatCurrency = (amount: number) => {
  const { selectedBranch } = useBranch()
  return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString('id-ID')}`
}
