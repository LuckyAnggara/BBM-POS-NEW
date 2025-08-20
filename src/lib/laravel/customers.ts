import api from '@/lib/api'
import { Customer, CustomerInput, Sale, ITEMS_PER_PAGE_OPTIONS } from '../types'

// Tipe untuk hasil paginasi dari Laravel
interface PaginatedCustomers {
  data: Customer[]
  total: number
  current_page: number
  last_page: number
  per_page: number
  // ... properti paginasi lainnya
}

interface ListCustomersParams {
  branchId: number
  page?: number
  limit?: number
  searchTerm?: string
}

// Tipe untuk analytics customer
export interface CustomerAnalytics {
  total_purchases: number
  total_spent: number
  average_order_value: number
  last_purchase_date: string | null
  first_purchase_date: string | null
  purchase_frequency: number
  favorite_payment_method: string | null
  monthly_spending: {
    month: string
    total_spent: number
    total_orders: number
  }[]
  top_products: {
    product_name: string
    quantity_purchased: number
    total_spent: number
  }[]
}

// Tipe untuk pagination sales
export interface CustomerSalesResponse {
  data: Sale[]
  total: number
  current_page: number
  last_page: number
  per_page: number
}

// Tipe untuk top customers
export interface TopCustomer {
  id: number
  name: string
  email: string | null
  phone: string | null
  total_purchases: number
  total_spent: number
  last_purchase_date: string | null
  purchase_frequency: number
}

export interface TopCustomersResponse {
  most_frequent: TopCustomer[]
  highest_spending: TopCustomer[]
}

/**
 * Mengambil daftar pelanggan dengan paginasi dan filter.
 * @param {ListCustomersParams} params - Parameter untuk filter dan paginasi.
 * @returns {Promise<PaginatedCustomers>} Objek berisi data pelanggan dan info paginasi.
 */
export const listCustomers = async (
  params: ListCustomersParams
): Promise<PaginatedCustomers> => {
  try {
    const response = await api.get('/api/customers', {
      params: {
        branch_id: params.branchId,
        page: params.page,
        limit: params.limit,
        search: params.searchTerm,
      },
    })
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: listCustomers :: ', error)
    throw error
  }
}

/**
 * Mengambil satu data pelanggan berdasarkan ID-nya.
 * @param {number} id - ID pelanggan.
 * @returns {Promise<Customer | null>}
 */
export const getCustomerById = async (id: string): Promise<Customer | null> => {
  try {
    const response = await api.get(`/api/customers/${id}`)
    return response.data
  } catch (error) {
    console.error(`Laravel API Error :: getCustomerById (ID: ${id}) :: `, error)
    return null
  }
}

/**
 * Membuat pelanggan baru.
 * @param {CustomerInput} customerData - Data pelanggan.
 * @returns {Promise<Customer>}
 */
export const createCustomer = async (
  customerData: CustomerInput
): Promise<Customer> => {
  try {
    const response = await api.post('/api/customers', customerData)
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: createCustomer :: ', error)
    throw error
  }
}

/**
 * Memperbarui data pelanggan.
 * @param {number} id - ID pelanggan.
 * @param {Partial<CustomerInput>} updates - Data yang akan diubah.
 * @returns {Promise<Customer>}
 */
export const updateCustomer = async (
  id: number,
  updates: Partial<CustomerInput>
): Promise<Customer> => {
  try {
    const response = await api.put(`/api/customers/${id}`, updates)
    return response.data
  } catch (error) {
    console.error(`Laravel API Error :: updateCustomer (ID: ${id}) :: `, error)
    throw error
  }
}

/**
 * Menghapus pelanggan.
 * @param {number} id - ID pelanggan.
 * @returns {Promise<void>}
 */
export const deleteCustomer = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/customers/${id}`)
  } catch (error) {
    console.error(`Laravel API Error :: deleteCustomer (ID: ${id}) :: `, error)
    throw error
  }
}

/**
 * Mengambil analytics customer berdasarkan ID.
 * @param {number} customerId - ID pelanggan.
 * @param {number} months - Jumlah bulan untuk analitik (default 12).
 * @returns {Promise<CustomerAnalytics>}
 */
export const getCustomerAnalytics = async (
  customerId: number,
  months = 12
): Promise<CustomerAnalytics> => {
  try {
    const response = await api.get(`/api/customers/${customerId}/analytics`, {
      params: { months },
    })
    return response.data
  } catch (error) {
    console.error(
      `Laravel API Error :: getCustomerAnalytics (ID: ${customerId}) :: `,
      error
    )
    throw error
  }
}

/**
 * Mengambil history penjualan customer dengan pagination.
 * @param {number} customerId - ID pelanggan.
 * @param {number} page - Halaman (default 1).
 * @param {number} limit - Jumlah item per halaman.
 * @param {string} startDate - Tanggal mulai filter (opsional).
 * @param {string} endDate - Tanggal akhir filter (opsional).
 * @returns {Promise<CustomerSalesResponse>}
 */
export const getCustomerSales = async (
  customerId: number,
  page = 1,
  limit = ITEMS_PER_PAGE_OPTIONS[1],
  startDate?: string,
  endDate?: string
): Promise<CustomerSalesResponse> => {
  try {
    const params: Record<string, string | number> = { page, limit }
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate

    const response = await api.get(`/api/customers/${customerId}/sales`, {
      params,
    })
    return response.data
  } catch (error) {
    console.error(
      `Laravel API Error :: getCustomerSales (ID: ${customerId}) :: `,
      error
    )
    throw error
  }
}

/**
 * Mengambil daftar top customers (paling sering & paling banyak belanja).
 * @param {number} branchId - ID cabang.
 * @param {number} limit - Jumlah customer teratas (default 10).
 * @param {number} months - Periode bulan (default 12).
 * @returns {Promise<TopCustomersResponse>}
 */
export const getTopCustomers = async (
  branchId: number,
  limit = 10,
  months = 12
): Promise<TopCustomersResponse> => {
  try {
    const response = await api.get('/api/customers/top-customers', {
      params: { branch_id: branchId, limit, months },
    })
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: getTopCustomers :: ', error)
    throw error
  }
}
