import api from '@/lib/api'
import type {
  PaymentStatus,
  PurchaseOrder,
  PurchaseOrderInput,
  PurchaseOrderPaymentStatus,
  PurchaseOrderStatus,
  ReceivedItemData,
} from '@/lib/types'

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
  id: string
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

/**
 * [MODIFIKASI] Menerima barang dari sebuah PO (parsial atau penuh).
 * @param {number} id - ID dari Purchase Order.
 * @param {ReceivedItemData[]} items - Array item yang diterima.
 * @returns {Promise<{ message: string }>} Pesan sukses dari backend.
 */
export const receivePurchaseOrderItems = async (
  id: number,
  items: ReceivedItemData[]
): Promise<{ message: string }> => {
  try {
    const response = await api.post(`/api/purchase-orders/${id}/receive`, {
      items,
    })
    return response.data
  } catch (error) {
    console.error(
      `Laravel API Error :: receivePurchaseOrderItems (ID: ${id}) :: `,
      error
    )
    throw error
  }
}

/**
 * [BARU] Memperbarui status sebuah Purchase Order.
 * @param {number} id - ID dari Purchase Order.
 * @param {'pending' | 'cancelled'} status - Status baru untuk PO.
 * @returns {Promise<PurchaseOrder>} Objek PO yang telah diperbarui.
 */
export const updatePurchaseOrderStatus = async (
  id: number,
  status: PurchaseOrderStatus
): Promise<PurchaseOrder> => {
  try {
    const response = await api.put(`/api/purchase-orders/${id}/status`, {
      status,
    })
    return response.data
  } catch (error) {
    console.error(
      `Laravel API Error :: updatePurchaseOrderStatus (ID: ${id}) :: `,
      error
    )
    throw error
  }
}

// [MODIFIKASI] Ganti nama fungsi 'cancel' menjadi 'delete' agar lebih sesuai dengan method HTTP
/**
 * Menghapus/Membatalkan Purchase Order (hanya jika statusnya 'draft').
 */
export const deletePurchaseOrder = async (id: number): Promise<void> => {
  try {
    // Controller destroy method akan menangani logika status
    await api.delete(`/api/purchase-orders/${id}`)
  } catch (error) {
    console.error(
      `Laravel API Error :: deletePurchaseOrder (ID: ${id}) :: `,
      error
    )
    throw error
  }
}
