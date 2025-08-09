import api from '@/lib/api'
import { Customer, CustomerInput } from '../types'

// Tipe untuk hasil paginasi dari Laravel
interface PaginatedCustomers {
  data: Customer[]
  total: number
  current_page: number
  last_page: number
  // ... properti paginasi lainnya
}

interface ListCustomersParams {
  branchId: number
  page?: number
  limit?: number
  searchTerm?: string
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
