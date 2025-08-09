import api from '@/lib/api'
import type {
  Sale,
  CreateSalePayload,
  SaleRequestActionPayload,
  SaleActionParams,
} from '@/lib/types' // Asumsi tipe ini dari types.ts

// Tipe untuk hasil paginasi dari Laravel
interface PaginatedSales {
  data: Sale[]
  total: number
  current_page: number
}

interface ListSalesParams {
  branchId?: string | undefined
  page?: number
  limit?: number
  searchTerm?: string
  startDate?: string
  endDate?: string
  shiftId?: string
  status?: string
}

interface ListSalesRequestParams {
  branchId: number
  page?: number
  limit?: number
  searchTerm?: string
  startDate?: string
  endDate?: string
  shiftId?: string
  status: SaleRequestActionPayload
}

/**
 * Membuat transaksi POS baru.
 * Logika update stok, pembuatan detail, dan mutasi sudah ditangani backend dalam satu transaksi DB.
 * @param {CreateSalePayload} payload - Data transaksi dari kasir.
 * @returns {Promise<Sale>} Objek sale yang berhasil dibuat.
 */
export const createSale = async (payload: CreateSalePayload): Promise<Sale> => {
  try {
    // Kita akan gunakan satu endpoint khusus untuk ini
    const response = await api.post('/api/pos/transactions', payload)
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: createSale :: ', error)
    throw error
  }
}

/**
 * Mengambil daftar riwayat penjualan dengan paginasi dan filter.
 * @param {ListSalesParams} params - Parameter untuk filter.
 * @returns {Promise<PaginatedSales>}
 */
export const listSales = async (
  params: ListSalesParams
): Promise<PaginatedSales> => {
  try {
    const response = await api.get('/api/sales', {
      params: {
        branch_id: params.branchId,
        page: params.page,
        limit: params.limit,
        search: params.searchTerm,
        start_date: params.startDate,
        end_date: params.endDate,
        shift_id: params.shiftId,
      },
    })
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: listSales :: ', error)
    throw error
  }
}

/**
 * Mengambil daftar riwayat penjualan request untuk retur dan hapus dengan paginasi dan filter.
 * @param {ListSalesParams} params - Parameter untuk filter.
 * @returns {Promise<PaginatedSales>}
 */
export const listSalesRequest = async (
  params: ListSalesParams
): Promise<PaginatedSales> => {
  try {
    const response = await api.get('/api/sales-list-request', {
      params: {
        branch_id: params.branchId,
        page: params.page,
        limit: params.limit,
        search: params.searchTerm,
        status: params.status,
        start_date: params.startDate,
        end_date: params.endDate,
      },
    })
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: listSales :: ', error)
    throw error
  }
}

/**
 * Mengambil detail lengkap dari satu transaksi.
 * @param {number} id - ID dari transaksi penjualan.
 * @returns {Promise<Sale | null>}
 */
export const getSaleById = async (id: number): Promise<Sale | null> => {
  try {
    const response = await api.get(`/api/sales/${id}`)
    return response.data
  } catch (error) {
    console.error(`Laravel API Error :: getSaleById (ID: ${id}) :: `, error)
    return null
  }
}

export const requestSaleAction = async (
  params: SaleActionParams
): Promise<Sale> => {
  try {
    const response = await api.post(
      `/api/sales/${params.id}/request-action`,
      params
    )
    return response.data
  } catch (error) {
    console.error(
      `Laravel API Error :: requestSaleAction (ID: ${params.id}) :: `,
      error
    )
    throw error
  }
}

export const approveSaleAction = async (id: number): Promise<Sale> => {
  try {
    const response = await api.post(`/api/sales/${id}/approve-action`)
    return response.data
  } catch (error) {
    console.error(
      `Laravel API Error :: approveSaleAction (ID: ${id}) :: `,
      error
    )
    throw error
  }
}

export const rejectSaleAction = async (id: number): Promise<Sale> => {
  try {
    const response = await api.post(`/api/sales/${id}/reject-action`)
    return response.data
  } catch (error) {
    console.error(
      `Laravel API Error :: rejectSaleAction (ID: ${id}) :: `,
      error
    )
    throw error
  }
}
