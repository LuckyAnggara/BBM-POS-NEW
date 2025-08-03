import api from '@/lib/api'
import type { Product } from '@/lib/types'

// Tipe untuk input, hilangkan properti yang dibuat otomatis
export type ProductInput = Omit<
  Product,
  'id' | 'created_at' | 'updated_at' | 'category'
>

// Tipe untuk hasil paginasi dari Laravel
interface PaginatedProducts {
  data: Product[]
  total: number
  current_page: number
  last_page: number
  per_page: number
  // ... properti paginasi lainnya dari Laravel
}

interface ListProductsParams {
  branchId: number
  page?: number
  limit?: number
  searchTerm?: string
  categoryId?: number
}

/**
 * Mengambil daftar produk dengan paginasi dan filter.
 * @param {ListProductsParams} params - Parameter untuk filter dan paginasi.
 * @returns {Promise<PaginatedProducts>} Objek berisi data produk dan info paginasi.
 */
export const listProducts = async (
  params: ListProductsParams
): Promise<PaginatedProducts> => {
  try {
    const response = await api.get('/api/products', {
      params: {
        branch_id: params.branchId,
        page: params.page,
        limit: params.limit,
        search: params.searchTerm,
        category_id: params.categoryId,
      },
    })
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: listProducts :: ', error)
    throw error
  }
}

/**
 * Mengambil satu data produk berdasarkan ID.
 * @param {number} id - ID produk.
 * @returns {Promise<Product | null>}
 */
export const getProductById = async (id: number): Promise<Product | null> => {
  try {
    const response = await api.get(`/api/products/${id}`)
    return response.data
  } catch (error) {
    console.error(`Laravel API Error :: getProductById (ID: ${id}) :: `, error)
    return null
  }
}

/**
 * Membuat produk baru.
 * @param {ProductInput} productData - Data produk.
 * @returns {Promise<Product>}
 */
export const createProduct = async (
  productData: ProductInput
): Promise<Product> => {
  try {
    const response = await api.post('/api/products', productData)
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: createProduct :: ', error)
    throw error
  }
}

/**
 * Memperbarui produk. Stok tidak bisa diubah dari sini.
 * @param {number} id - ID produk.
 * @param {Partial<Omit<ProductInput, 'quantity'>>} updates - Data yang akan diubah.
 * @returns {Promise<Product>}
 */
export const updateProduct = async (
  id: number,
  updates: Partial<Omit<ProductInput, 'quantity'>>
): Promise<Product> => {
  try {
    const response = await api.put(`/api/products/${id}`, updates)
    return response.data
  } catch (error) {
    console.error(`Laravel API Error :: updateProduct (ID: ${id}) :: `, error)
    throw error
  }
}

/**
 * Menghapus produk.
 * @param {number} id - ID produk.
 * @returns {Promise<void>}
 */
export const deleteProduct = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/products/${id}`)
  } catch (error) {
    console.error(`Laravel API Error :: deleteProduct (ID: ${id}) :: `, error)
    throw error
  }
}
