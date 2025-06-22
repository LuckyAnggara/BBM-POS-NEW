// src/lib/appwrite/inventory.ts

import {
  databases,
  ID,
  Query,
  DATABASE_ID,
  INVENTORY_ITEMS_COLLECTION_ID,
  INVENTORY_CATEGORIES_COLLECTION_ID,
} from './config'

// --- Definisi Tipe Data untuk Appwrite ---

// Catatan: Appwrite menggunakan ISO 8601 string untuk tanggal, bukan objek Timestamp.
// Atribut seperti id, createdAt, updatedAt diganti dengan atribut sistem Appwrite: $id, $createdAt, $updatedAt.

export interface InventoryCategory {
  id: string // Akan dipetakan dari $id
  name: string
  branchId: string
  createdAt: string // ISO String, dari $createdAt
}

// Tipe ini digunakan saat membuat kategori baru.
export type InventoryCategoryInput = Omit<InventoryCategory, 'id' | 'createdAt'>

export interface InventoryItem {
  id: string // Akan dipetakan dari $id
  name: string
  sku?: string
  categoryId: string
  categoryName?: string
  branchId: string
  quantity: number
  price: number
  costPrice: number
  imageUrl?: string
  imageHint?: string
  createdAt: string // ISO String, dari $createdAt
  updatedAt: string // ISO String, dari $updatedAt
}

// Tipe ini digunakan saat membuat item baru.
export type InventoryItemInput = Omit<
  InventoryItem,
  'id' | 'createdAt' | 'updatedAt' | 'categoryName'
>

// --- Fungsi untuk Kategori Inventaris ---

export async function addInventoryCategory(
  categoryData: InventoryCategoryInput
): Promise<InventoryCategory | { error: string }> {
  if (!categoryData.name.trim())
    return { error: 'Nama kategori tidak boleh kosong.' }
  if (!categoryData.branchId)
    return { error: 'ID Cabang diperlukan untuk kategori.' }
  try {
    const document = await databases.createDocument(
      DATABASE_ID,
      INVENTORY_CATEGORIES_COLLECTION_ID,
      ID.unique(),
      categoryData
    )
    return {
      id: document.$id,
      name: document.name,
      branchId: document.branchId,
      createdAt: document.$createdAt,
    }
  } catch (error: any) {
    console.error('Error adding inventory category:', error)
    return { error: error.message || 'Gagal menambah kategori.' }
  }
}

export async function getInventoryCategories(
  branchId: string
): Promise<InventoryCategory[]> {
  if (!branchId) return []
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      INVENTORY_CATEGORIES_COLLECTION_ID,
      [Query.equal('branchId', branchId), Query.orderAsc('name')]
    )
    return response.documents.map((doc) => ({
      id: doc.$id,
      name: doc.name,
      branchId: doc.branchId,
      createdAt: doc.$createdAt,
    }))
  } catch (error: any) {
    console.error('Error fetching inventory categories:', error)
    return []
  }
}

export async function deleteInventoryCategory(
  categoryId: string
): Promise<void | { error: string }> {
  if (!categoryId) return { error: 'ID Kategori tidak valid.' }
  try {
    const itemsResponse = await databases.listDocuments(
      DATABASE_ID,
      INVENTORY_ITEMS_COLLECTION_ID,
      [Query.equal('categoryId', categoryId), Query.limit(1)]
    )
    if (itemsResponse.total > 0) {
      return {
        error: `Kategori ini masih digunakan oleh ${itemsResponse.total} produk. Hapus atau ubah produk tersebut terlebih dahulu.`,
      }
    }
    await databases.deleteDocument(
      DATABASE_ID,
      INVENTORY_CATEGORIES_COLLECTION_ID,
      categoryId
    )
  } catch (error: any) {
    console.error('Error deleting inventory category:', error)
    return { error: error.message || 'Gagal menghapus kategori.' }
  }
}

// --- Fungsi untuk Item Inventaris ---

export async function addInventoryItem(
  itemData: InventoryItemInput,
  categoryName: string,
  userId?: string,
  userName?: string
): Promise<InventoryItem | { error: string }> {
  if (!itemData.name.trim()) return { error: 'Nama produk tidak boleh kosong.' }
  if (!itemData.branchId) return { error: 'ID Cabang diperlukan.' }
  if (!itemData.categoryId) return { error: 'Kategori produk diperlukan.' }

  try {
    const skuToSave =
      itemData.sku?.trim() || `AUTOSKU-${ID.unique().substring(0, 8)}`
    const dataToSave = {
      ...itemData,
      sku: skuToSave,
      categoryName,
      costPrice: itemData.costPrice || 0,
      imageUrl: itemData.imageUrl || `https://placehold.co/64x64.png`,
      imageHint:
        itemData.imageHint ||
        itemData.name.split(' ').slice(0, 2).join(' ').toLowerCase(),
    }

    const document = await databases.createDocument(
      DATABASE_ID,
      INVENTORY_ITEMS_COLLECTION_ID,
      ID.unique(),
      dataToSave
    )

    // TODO: Migrasikan addStockMutation dan panggil di sini
    // if (itemData.quantity > 0) {
    //   ... panggil addStockMutation versi Appwrite
    // }

    return {
      id: document.$id,
      ...dataToSave,
      createdAt: document.$createdAt,
      updatedAt: document.$updatedAt,
    }
  } catch (error: any) {
    console.error('Error adding inventory item:', error)
    return { error: error.message || 'Gagal menambah produk.' }
  }
}

export async function getInventoryItems(
  branchId: string,
  options: {
    limit?: number
    searchTerm?: string
    page?: number // Menggantikan cursor, default ke halaman 1
  } = {}
): Promise<{
  items: InventoryItem[]
  total: number // Menggantikan docId dan hasMore
}> {
  if (!branchId) return { items: [], total: 0 }

  // Set nilai default jika tidak disediakan
  const limit = options.limit || 25
  const page = options.page || 1

  try {
    let queries: string[] = [Query.equal('branchId', branchId)]

    // Logika pencarian tetap sama
    if (options.searchTerm) {
      queries.push(Query.search('name', options.searchTerm))
    } else {
      // Urutkan berdasarkan nama secara konsisten
      queries.push(Query.orderAsc('name'))
    }

    // [DIUBAH] Menggunakan limit langsung, tanpa +1
    queries.push(Query.limit(limit))

    // [DIUBAH] Menambahkan offset berdasarkan halaman
    if (page > 1) {
      const offset = (page - 1) * limit
      queries.push(Query.offset(offset))
    }

    // [DIHAPUS] Semua logika cursorBefore dan cursorAfter dihapus

    const response = await databases.listDocuments(
      DATABASE_ID,
      INVENTORY_ITEMS_COLLECTION_ID,
      queries
    )

    // [DIHAPUS] Logika untuk hasMore dan reverse dokumen tidak diperlukan lagi

    const items: InventoryItem[] = response.documents.map((doc) => ({
      id: doc.$id,
      createdAt: doc.$createdAt,
      updatedAt: doc.$updatedAt,
      name: doc.name,
      sku: doc.sku,
      categoryId: doc.categoryId,
      categoryName: doc.categoryName,
      branchId: doc.branchId,
      quantity: doc.quantity,
      price: doc.price,
      costPrice: doc.costPrice,
      imageUrl: doc.imageUrl,
      imageHint: doc.imageHint,
    }))

    // [DIUBAH] Mengembalikan items dan total dari response Appwrite
    return { items, total: response.total }
  } catch (error: any) {
    console.error('Error fetching inventory items:', error)
    return { items: [], total: 0 }
  }
}
export async function updateInventoryItem(
  itemId: string,
  updates: Partial<Omit<InventoryItemInput, 'branchId'>>,
  newCategoryName?: string
): Promise<void | { error: string }> {
  if (!itemId) return { error: 'ID Produk tidak valid.' }

  if (updates.quantity !== undefined) {
    return {
      error:
        'Pembaruan stok langsung tidak diizinkan melalui fungsi ini. Gunakan fungsi penyesuaian stok.',
    }
  }

  try {
    const dataToUpdate: any = { ...updates }

    if (newCategoryName && updates.categoryId) {
      dataToUpdate.categoryName = newCategoryName
    }

    await databases.updateDocument(
      DATABASE_ID,
      INVENTORY_ITEMS_COLLECTION_ID,
      itemId,
      dataToUpdate
    )
  } catch (error: any) {
    console.error('Error updating inventory item:', error)
    return { error: error.message || 'Gagal memperbarui produk.' }
  }
}

export async function deleteInventoryItem(
  itemId: string
): Promise<void | { error: string }> {
  if (!itemId) return { error: 'ID Produk tidak valid.' }
  try {
    // Di Appwrite, relasi/dependensi dicek di level aplikasi atau dengan Appwrite Functions.
    // Tidak ada cara query langsung di sini untuk mengecek dependensi sebelum hapus seperti di Firebase Rules.
    await databases.deleteDocument(
      DATABASE_ID,
      INVENTORY_ITEMS_COLLECTION_ID,
      itemId
    )
  } catch (error: any) {
    console.error('Error deleting inventory item:', error)
    return { error: error.message || 'Gagal menghapus produk.' }
  }
}
