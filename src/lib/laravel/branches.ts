import api from '../api'
import { Branch } from '../types'

// Tipe data untuk input, Omit 'id' dan 'created_at'/'updated_at'
export type BranchInput = Omit<Branch, 'id' | 'created_at' | 'updated_at'>

/**
 * Mengambil daftar semua cabang dari backend Laravel.
 * Mendukung paginasi jika backend mengembalikannya.
 * @returns {Promise<Branch[]>} Array berisi data cabang.
 */
export const listBranches = async (): Promise<Branch[]> => {
  try {
    // Backend Laravel kita yang di-paginate mengembalikan data di dalam object `data`
    const response = await api.get('/api/branches')

    // Jika backend mengembalikan data paginasi, ambil dari response.data.data
    // Jika tidak, langsung dari response.data
    return response.data.data || response.data
  } catch (error) {
    console.error('Laravel API Error :: listBranches :: ', error)
    throw error
  }
}

/**
 * Mengambil satu data cabang berdasarkan ID-nya.
 * @param {number} branchId - ID dari cabang.
 * @returns {Promise<Branch | null>} Objek Branch atau null jika tidak ditemukan.
 */
export const getBranchById = async (
  branchId: number
): Promise<Branch | null> => {
  try {
    const response = await api.get(`/api/branches/${branchId}`)
    return response.data
  } catch (error) {
    console.error(
      `Laravel API Error :: getBranchById (ID: ${branchId}) :: `,
      error
    )
    return null
  }
}

/**
 * Membuat data cabang baru.
 * @param {BranchInput} branchData - Data cabang yang akan dibuat.
 * @returns {Promise<Branch>} Objek Branch yang baru saja dibuat.
 */
export const createBranch = async (
  branchData: BranchInput
): Promise<Branch> => {
  try {
    const response = await api.post('/api/branches', branchData)
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: createBranch :: ', error)
    throw error
  }
}

/**
 * Memperbarui data cabang yang ada.
 * @param {number} branchId - ID dari cabang yang akan diperbarui.
 * @param {Partial<BranchInput>} dataToUpdate - Data yang ingin diperbarui.
 * @returns {Promise<Branch>} Objek Branch yang sudah diperbarui.
 */
export const updateBranch = async (
  branchId: string,
  dataToUpdate: Partial<BranchInput>
): Promise<Branch> => {
  try {
    const response = await api.put(`/api/branches/${branchId}`, dataToUpdate)
    return response.data
  } catch (error) {
    console.error(
      `Laravel API Error :: updateBranch (ID: ${branchId}) :: `,
      error
    )
    throw error
  }
}

/**
 * Menghapus data cabang.
 * @param {string} branchId - ID dari cabang yang akan dihapus.
 * @returns {Promise<void>} Selesai saat penghapusan berhasil.
 */
export const deleteBranch = async (branchId: string): Promise<void> => {
  try {
    // Endpoint `destroy` di Laravel akan mengembalikan status 204 No Content
    await api.delete(`/api/branches/${branchId}`)
  } catch (error) {
    console.error(
      `Laravel API Error :: deleteBranch (ID: ${branchId}) :: `,
      error
    )
    throw error
  }
}
