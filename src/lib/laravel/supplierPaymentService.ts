import api from '@/lib/api'
import type { SupplierPayment } from '@/lib/types'

export interface SupplierPaymentInput {
  purchase_order_id: number
  amount_paid: number
  payment_date: string // 'YYYY-MM-DD'
  payment_method: string
}

/**
 * Mencatat pembayaran baru ke supplier untuk sebuah PO.
 * Backend akan otomatis mengupdate sisa hutang pada PO.
 */
export const createSupplierPayment = async (
  paymentData: SupplierPaymentInput
): Promise<SupplierPayment> => {
  try {
    const response = await api.post('/api/supplier-payments', paymentData)
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: createSupplierPayment :: ', error)
    throw error
  }
}

/**
 * Mengambil riwayat pembayaran untuk satu PO.
 */
export const listPaymentsForPo = async (
  purchaseOrderId: number
): Promise<SupplierPayment[]> => {
  try {
    const response = await api.get('/api/supplier-payments', {
      params: { purchase_order_id: purchaseOrderId },
    })
    return response.data
  } catch (error) {
    console.error(
      `Laravel API Error :: listPaymentsForPo (PO ID: ${purchaseOrderId}) :: `,
      error
    )
    throw error
  }
}
