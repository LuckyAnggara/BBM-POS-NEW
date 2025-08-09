import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
