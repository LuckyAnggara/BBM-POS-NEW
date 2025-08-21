import api from '@/lib/api'
import type { Supplier, SupplierInput, TopSuppliersResponse } from '@/lib/types' // Asumsi tipe ini sudah ada di types.ts
// Tipe untuk input, hilangkan properti yang dibuat otomatis

// Tipe untuk hasil paginasi dari Laravel
interface PaginatedSuppliers {
  data: Supplier[]
  total: number
  current_page: number
  last_page: number
  // ... properti paginasi lainnya
}

interface ListSuppliersParams {
  branchId: number
  page?: number
  limit?: number
  searchTerm?: string
}

/**
 * Mengambil daftar supplier dengan paginasi dan filter.
 * @param {ListSuppliersParams} params - Parameter untuk filter dan paginasi.
 * @returns {Promise<PaginatedSuppliers>} Objek berisi data supplier dan info paginasi.
 */
export const listSuppliers = async (
  params: ListSuppliersParams
): Promise<PaginatedSuppliers> => {
  try {
    const response = await api.get('/api/suppliers', {
      params: {
        branch_id: params.branchId,
        page: params.page,
        limit: params.limit,
        search: params.searchTerm,
      },
    })
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: listSuppliers :: ', error)
    throw error
  }
}

/**
 * Mengambil satu data supplier berdasarkan ID-nya.
 * @param {number} id - ID supplier.
 * @returns {Promise<Supplier | null>}
 */
export const getSupplierById = async (id: number): Promise<Supplier | null> => {
  try {
    const response = await api.get(`/api/suppliers/${id}`)
    return response.data
  } catch (error) {
    console.error(`Laravel API Error :: getSupplierById (ID: ${id}) :: `, error)
    return null
  }
}

/**
 * Mengambil satu data supplier berdasarkan ID-nya (alias untuk konsistensi).
 * @param {string} id - ID supplier.
 * @returns {Promise<Supplier>}
 */
export const getSupplier = async (id: string): Promise<Supplier> => {
  try {
    const response = await api.get(`/api/suppliers/${id}`)
    return response.data
  } catch (error) {
    console.error(`Laravel API Error :: getSupplier (ID: ${id}) :: `, error)
    throw error
  }
}

/**
 * Membuat supplier baru.
 * @param {SupplierInput} supplierData - Data supplier.
 * @returns {Promise<Supplier>}
 */
export const createSupplier = async (
  supplierData: SupplierInput
): Promise<Supplier> => {
  try {
    const response = await api.post('/api/suppliers', supplierData)
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: createSupplier :: ', error)
    throw error
  }
}

/**
 * Memperbarui data supplier.
 * @param {number} id - ID supplier.
 * @param {Partial<SupplierInput>} updates - Data yang akan diubah.
 * @returns {Promise<Supplier>}
 */
export const updateSupplier = async (
  id: number,
  updates: Partial<SupplierInput>
): Promise<Supplier> => {
  try {
    const response = await api.put(`/api/suppliers/${id}`, updates)
    return response.data
  } catch (error) {
    console.error(`Laravel API Error :: updateSupplier (ID: ${id}) :: `, error)
    throw error
  }
}

/**
 * Menghapus supplier.
 * @param {number} id - ID supplier.
 * @returns {Promise<void>}
 */
export const deleteSupplier = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/suppliers/${id}`)
  } catch (error) {
    console.error(`Laravel API Error :: deleteSupplier (ID: ${id}) :: `, error)
    throw error
  }
}

/**
 * Mengambil supplier teratas berdasarkan kriteria tertentu.
 * @param {number} branchId - ID cabang.
 * @param {number} limit - Jumlah supplier yang akan diambil.
 * @param {number} months - Periode dalam bulan untuk analisis.
 * @returns {Promise<TopSuppliersResponse>}
 */
export const getTopSuppliers = async (
  branchId: number,
  limit: number = 5,
  months: number = 12
): Promise<TopSuppliersResponse> => {
  try {
    const response = await api.get('/api/suppliers/top-suppliers', {
      params: {
        branch_id: branchId,
        limit,
        months,
      },
    })
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: getTopSuppliers :: ', error)
    throw error
  }
}

/**
 * Mengambil statistik supplier untuk dashboard.
 * @param {number} branchId - ID cabang.
 * @returns {Promise<any>}
 */
export const getSupplierStats = async (branchId: number): Promise<any> => {
  try {
    const response = await api.get('/api/suppliers-stats', {
      params: {
        branch_id: branchId,
      },
    })
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: getSupplierStats :: ', error)
    throw error
  }
}
