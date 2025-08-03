import api from '@/lib/api'
import type { Category } from '@/lib/types' // Asumsi tipe ini sudah ada di types.ts

// Tipe untuk input, hilangkan properti yang dibuat otomatis
export type CategoryInput = Omit<Category, 'id' | 'created_at' | 'updated_at'>

/**
 * Mengambil daftar kategori untuk sebuah cabang.
 * @param {number} branchId - ID dari cabang.
 * @returns {Promise<Category[]>} Array berisi data kategori.
 */
export const listCategories = async (branchId: number): Promise<Category[]> => {
  try {
    const response = await api.get('/api/categories', {
      params: { branch_id: branchId },
    })
    return response.data.data || response.data
  } catch (error) {
    console.error('Laravel API Error :: listCategories :: ', error)
    throw error
  }
}

/**
 * Membuat kategori baru.
 * @param {CategoryInput} categoryData - Data kategori yang akan dibuat.
 * @returns {Promise<Category>} Objek kategori yang baru dibuat.
 */
export const createCategory = async (
  categoryData: CategoryInput
): Promise<Category> => {
  try {
    const response = await api.post('/api/categories', categoryData)
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: createCategory :: ', error)
    throw error
  }
}

/**
 * Memperbarui data kategori.
 * @param {number} id - ID kategori yang akan diperbarui.
 * @param {Partial<CategoryInput>} updates - Data yang ingin diperbarui.
 * @returns {Promise<Category>} Objek kategori yang sudah diperbarui.
 */
export const updateCategory = async (
  id: number,
  updates: Partial<CategoryInput>
): Promise<Category> => {
  try {
    const response = await api.put(`/api/categories/${id}`, updates)
    return response.data
  } catch (error) {
    console.error(`Laravel API Error :: updateCategory (ID: ${id}) :: `, error)
    throw error
  }
}

/**
 * Menghapus kategori.
 * Backend akan mencegah penghapusan jika kategori masih digunakan.
 * @param {number} id - ID kategori yang akan dihapus.
 * @returns {Promise<void>}
 */
export const deleteCategory = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/categories/${id}`)
  } catch (error) {
    console.error(`Laravel API Error :: deleteCategory (ID: ${id}) :: `, error)
    throw error
  }
}
