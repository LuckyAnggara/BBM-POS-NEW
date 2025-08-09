import api from '@/lib/api'
import type { PurchaseOrder, PurchaseOrderInput } from '@/lib/types'

// Tipe untuk hasil paginasi dari Laravel
interface PaginatedPurchaseOrders {
  data: PurchaseOrder[]
  total: number
  current_page: number
  // ...
}

interface ListPurchaseOrdersParams {
  branchId: number
  page?: number
  limit?: number
  searchTerm?: string
  status?: string
}

/**
 * Mengambil daftar PO dengan paginasi dan filter.
 */
export const listPurchaseOrders = async (
  params: ListPurchaseOrdersParams
): Promise<PaginatedPurchaseOrders> => {
  try {
    const response = await api.get('/api/purchase-orders', {
      params: {
        branch_id: params.branchId,
        page: params.page,
        limit: params.limit,
        search: params.searchTerm,
        status: params.status,
      },
    })
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: listPurchaseOrders :: ', error)
    throw error
  }
}

/**
 * Mengambil detail lengkap satu PO (termasuk item-itemnya).
 */
export const getPurchaseOrderById = async (
  id: number
): Promise<PurchaseOrder | null> => {
  try {
    const response = await api.get(`/api/purchase-orders/${id}`)
    return response.data
  } catch (error) {
    console.error(
      `Laravel API Error :: getPurchaseOrderById (ID: ${id}) :: `,
      error
    )
    return null
  }
}

/**
 * Membuat Purchase Order baru.
 */
export const createPurchaseOrder = async (
  poData: PurchaseOrderInput
): Promise<PurchaseOrder> => {
  try {
    const response = await api.post('/api/purchase-orders', poData)
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: createPurchaseOrder :: ', error)
    throw error
  }
}

/**
 * Menerima barang dari sebuah PO.
 * Ini akan mengubah status PO dan menambah stok produk.
 */
export const receivePurchaseOrder = async (
  id: number
): Promise<{ message: string }> => {
  try {
    const response = await api.post(`/api/purchase-orders/${id}/receive`)
    return response.data
  } catch (error) {
    console.error(
      `Laravel API Error :: receivePurchaseOrder (ID: ${id}) :: `,
      error
    )
    throw error
  }
}

/**
 * Membatalkan Purchase Order (hanya jika statusnya 'pending').
 */
export const cancelPurchaseOrder = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/purchase-orders/${id}`)
  } catch (error) {
    console.error(
      `Laravel API Error :: cancelPurchaseOrder (ID: ${id}) :: `,
      error
    )
    throw error
  }
}
