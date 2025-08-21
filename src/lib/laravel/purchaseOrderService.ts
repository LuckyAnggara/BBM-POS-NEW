import api from '@/lib/api'
import type {
  PurchaseOrderInput,
  PurchaseOrderStatus,
  ReceivedItemData,
} from '@/lib/types'

// Tipe untuk hasil paginasi dari Laravel
interface PaginatedPurchaseOrders<T = any> {
  data: T[]
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

// ===================== Accounts Payable (AP) helper types + mappers =====================
export type AP_Payment = {
  id: number
  paymentDate: string
  amountPaid: number
  paymentMethod: string
  notes: string | null
}

export type AP_PurchaseOrder = {
  id: number
  poNumber: string
  supplierName: string | null
  supplierId: number
  branchId: number
  orderDate: string
  totalAmount: number
  outstandingPOAmount: number
  paymentStatusOnPO: 'unpaid' | 'partially_paid' | 'paid'
  paymentDueDateOnPO?: string | null
  payments?: AP_Payment[]
}

const mapPurchaseOrderDtoToAP = (dto: any): AP_PurchaseOrder => {
  return {
    id: dto.id,
    poNumber: dto.po_number,
    supplierName: dto.supplier_name ?? null,
    supplierId: dto.supplier_id,
    branchId: dto.branch_id,
    orderDate: dto.order_date,
    totalAmount: Number(dto.total_amount || 0),
    outstandingPOAmount: Number(dto.outstanding_amount || 0),
    paymentStatusOnPO: (dto.payment_status as any) ?? 'unpaid',
    paymentDueDateOnPO: dto.payment_due_date ?? null,
    payments: Array.isArray(dto.payments)
      ? dto.payments.map((p: any) => ({
          id: p.id,
          paymentDate: p.payment_date,
          amountPaid: Number(p.amount_paid || 0),
          paymentMethod: p.payment_method,
          notes: p.notes ?? null,
        }))
      : undefined,
  }
}

// List only outstanding POs by branch (has_outstanding=true)
export const listOutstandingPurchaseOrdersByBranch = async (
  branchId: number,
  opts?: {
    limit?: number
    searchTerm?: string
    paymentStatus?: 'unpaid' | 'partially_paid' | 'paid'
  }
): Promise<{
  data: AP_PurchaseOrder[]
  total: number
  current_page: number
}> => {
  try {
    const response = await api.get('/api/purchase-orders', {
      params: {
        branch_id: branchId,
        has_outstanding: true,
        limit: opts?.limit ?? 10,
        search: opts?.searchTerm,
        payment_status: opts?.paymentStatus,
      },
    })
    const raw = response.data as PaginatedPurchaseOrders<any>
    return {
      data: (raw.data || []).map(mapPurchaseOrderDtoToAP),
      total: raw.total,
      current_page: raw.current_page,
    }
  } catch (error) {
    console.error(
      'Laravel API Error :: listOutstandingPurchaseOrdersByBranch :: ',
      error
    )
    throw error
  }
}

export const getPurchaseOrderDetailAP = async (
  id: number
): Promise<AP_PurchaseOrder | null> => {
  try {
    const response = await api.get(`/api/purchase-orders/${id}`)
    return mapPurchaseOrderDtoToAP(response.data)
  } catch (error) {
    console.error('Laravel API Error :: getPurchaseOrderDetailAP :: ', error)
    return null
  }
}

// Record supplier payment for a PO
export type RecordSupplierPaymentInput = {
  purchase_order_id: number
  branch_id: number
  supplier_id: number
  payment_date: string
  amount_paid: number
  payment_method: string
  notes?: string | null
  recorded_by_user_id?: number | string
}

export const recordSupplierPayment = async (
  payload: RecordSupplierPaymentInput
): Promise<any> => {
  try {
    const response = await api.post('/api/supplier-payments', payload)
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: recordSupplierPayment :: ', error)
    throw error
  }
}

// Update supplier payment
export type UpdateSupplierPaymentInput = {
  payment_date?: string
  amount_paid?: number
  payment_method?: string
  notes?: string | null
}

export const updateSupplierPayment = async (
  id: number,
  payload: UpdateSupplierPaymentInput
): Promise<any> => {
  try {
    const response = await api.put(`/api/supplier-payments/${id}`, payload)
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: updateSupplierPayment :: ', error)
    throw error
  }
}

/**
 * Mengambil detail lengkap satu PO (termasuk item-itemnya).
 */
export const getPurchaseOrderById = async (id: string): Promise<any | null> => {
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
): Promise<any> => {
  try {
    // Debug log (hapus jika sudah stabil)
    if (process.env.NODE_ENV !== 'production') {
      console.debug('Submitting PO payload:', poData)
    }
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
): Promise<any> => {
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
