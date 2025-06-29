// src/lib/appwrite/stockMutations.ts

import {
  databases,
  ID,
  Query,
  DATABASE_ID,
  STOCK_MUTATIONS_COLLECTION_ID,
} from './config'

// --- Definisi Tipe Data ---

export type StockMutationType =
  | 'INITIAL_STOCK'
  | 'SALE'
  | 'PURCHASE_RECEIPT'
  | 'SALE_RETURN'
  | 'PURCHASE_RETURN'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'TRANSACTION_DELETED_SALE_RESTOCK'

export interface StockMutation {
  $id: string // dari $id
  $createdAt: string // dari $createdAt
  branchId: string
  itemId: string
  itemName: string // Denormalisasi untuk mempermudah tampilan laporan
  change: number // Jumlah perubahan (+ atau -)
  previousQuantity: number // Kuantitas sebelum mutasi
  newQuantity: number // Kuantitas setelah mutasi
  type: StockMutationType
  description: string
  relatedTransactionId?: string // ID transaksi POS atau PO
  userId: string
  userName: string
}

// Tipe untuk membuat mutasi baru.
export type StockMutationInput = Omit<StockMutation, 'id' | 'createdAt'>

// --- Fungsi Manajemen Mutasi Stok ---

export async function addStockMutation(
  mutationData: StockMutationInput
): Promise<StockMutation | { error: string }> {
  if (!mutationData.itemId || !mutationData.branchId) {
    return { error: 'ID Item dan Cabang diperlukan.' }
  }

  try {
    const document = await databases.createDocument(
      DATABASE_ID,
      STOCK_MUTATIONS_COLLECTION_ID,
      ID.unique(),
      mutationData
    )

    return {
      ...mutationData, // Mengembalikan data input karena sudah lengkap
    }
  } catch (error: any) {
    console.error('Error adding stock mutation:', error)
    return { error: error.message || 'Gagal mencatat mutasi stok.' }
  }
}

export async function getStockMutations(
  branchId: string,
  filters: {
    itemId?: string
    startDate: Date
    endDate: Date
  }
): Promise<StockMutation[]> {
  if (!branchId) return []

  try {
    // Pastikan atribut yang di-query di-index di Appwrite Console
    const queries: string[] = [
      Query.equal('branchId', branchId),
      Query.greaterThanEqual('$createdAt', filters.startDate.toISOString()),
      Query.lessThanEqual('$createdAt', filters.endDate.toISOString()),
      Query.orderDesc('$createdAt'),
    ]

    if (filters.itemId) {
      queries.push(Query.equal('itemId', filters.itemId))
    }

    // Perlu paginasi jika hasil bisa sangat banyak
    const response = await databases.listDocuments(
      DATABASE_ID,
      STOCK_MUTATIONS_COLLECTION_ID,
      queries
    )

    return response.documents.map((doc) => ({
      $id: doc.$id,
      $createdAt: doc.$createdAt,
      branchId: doc.branchId,
      itemId: doc.itemId,
      itemName: doc.itemName,
      change: doc.change,
      previousQuantity: doc.previousQuantity,
      newQuantity: doc.newQuantity,
      type: doc.type,
      description: doc.description,
      relatedTransactionId: doc.relatedTransactionId,
      userId: doc.userId,
      userName: doc.userName,
    }))
  } catch (error: any) {
    console.error('Error fetching stock mutations:', error)
    return []
  }
}

export async function checkIfInitialStockExists(
  itemId: string
): Promise<boolean> {
  if (!itemId) return false

  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      STOCK_MUTATIONS_COLLECTION_ID,
      [
        Query.equal('itemId', itemId),
        Query.equal('type', 'initial_stock'),
        Query.limit(1), // Kita hanya butuh 1 hasil untuk konfirmasi, jadi limit 1 lebih efisien.
      ]
    )

    // Jika total dokumen yang ditemukan lebih dari 0, berarti stok awal sudah ada.
    return response.total > 0
  } catch (error: any) {
    console.error('Error checking for initial stock:', error)
    // Jika terjadi error, kita anggap saja belum ada untuk mencegah blokir.
    // Atau Anda bisa melempar error di sini tergantung kebutuhan.
    return false
  }
}
