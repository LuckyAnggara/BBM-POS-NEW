import api from '@/lib/api'
import type { SupplierPayment, SupplierPaymentInput } from '@/lib/types'

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

/**
 * [BARU] Memperbarui data pembayaran yang sudah ada.
 * @param {number} id - ID dari record pembayaran.
 * @param {Partial<SupplierPaymentInput>} updates - Data yang ingin diperbarui.
 * @returns {Promise<SupplierPayment>} Objek pembayaran yang sudah diupdate.
 */
export const updateSupplierPayment = async (
  id: number,
  updates: Partial<SupplierPaymentInput>
): Promise<SupplierPayment> => {
  try {
    const response = await api.put(`/api/supplier-payments/${id}`, updates)
    return response.data
  } catch (error) {
    console.error(
      `Laravel API Error :: updateSupplierPayment (ID: ${id}) :: `,
      error
    )
    throw error
  }
}

/**
 * [BARU] Menghapus data pembayaran.
 * @param {number} id - ID dari record pembayaran.
 * @returns {Promise<void>}
 */
export const deleteSupplierPayment = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/supplier-payments/${id}`)
  } catch (error) {
    console.error(
      `Laravel API Error :: deleteSupplierPayment (ID: ${id}) :: `,
      error
    )
    throw error
  }
}
