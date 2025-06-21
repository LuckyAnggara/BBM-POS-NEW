// src/lib/appwrite/purchaseOrders.ts

import {
  databases,
  ID,
  Query,
  DATABASE_ID,
  PURCHASE_ORDERS_COLLECTION_ID,
  INVENTORY_ITEMS_COLLECTION_ID,
  STOCK_MUTATIONS_COLLECTION_ID,
} from './config'
import type { InventoryItem } from './inventory' // Mengimpor tipe dari file lain
import { addStockMutation } from './stockMutations'

// --- Definisi Tipe Data ---

export interface POItem {
  itemId: string
  itemName: string
  quantity: number
  costPrice: number
  totalCost: number
}

export type POStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'

export interface PurchaseOrder {
  id: string // dari $id
  poNumber: string
  branchId: string
  supplierId: string
  supplierName: string
  poDate: string // ISO String
  items: POItem[] // Akan disimpan sebagai JSON string di Appwrite
  totalAmount: number
  status: POStatus
  createdBy: string // User ID
  createdByName: string
  notes?: string
  createdAt: string // dari $createdAt
}

export type PurchaseOrderInput = Omit<
  PurchaseOrder,
  'id' | 'createdAt' | 'poNumber'
>

// --- Fungsi Manajemen Purchase Order (PO) ---

/**
 * PENTING: Perbedaan Penanganan Transaksi
 * -----------------------------------------
 * Di Firebase, Anda menggunakan `runTransaction` untuk memastikan beberapa operasi (misalnya, membuat PO
 * dan memperbarui stok) berhasil atau gagal bersamaan (atomik).
 *
 * Appwrite tidak memiliki API `transaction` di sisi klien. Cara yang BENAR dan AMAN untuk
 * melakukan operasi atomik di Appwrite adalah dengan menggunakan APPWRITE FUNCTIONS.
 *
 * Logika di bawah ini (createPurchaseOrder dan markPOAsCompleted) dijalankan secara sekuensial
 * di sisi klien. Ini BERISIKO di lingkungan produksi. Jika salah satu langkah gagal
 * (misalnya, setelah memperbarui stok item pertama, koneksi terputus), data Anda akan menjadi tidak konsisten.
 *
 * REKOMENDASI: Pindahkan logika di dalam fungsi-fungsi ini ke Appwrite Function (misalnya, fungsi Node.js)
 * dan panggil fungsi tersebut dari klien Anda dengan satu panggilan API.
 */

export async function createPurchaseOrder(
  poData: Omit<PurchaseOrderInput, 'status' | 'totalAmount' | 'poDate'>
): Promise<PurchaseOrder | { error: string }> {
  if (!poData.branchId || !poData.supplierId || !poData.createdBy) {
    return { error: 'Data cabang, supplier, dan pengguna diperlukan.' }
  }
  if (poData.items.length === 0) {
    return { error: 'Purchase Order harus memiliki setidaknya satu item.' }
  }

  // --- AWAL LOGIKA YANG SEHARUSNYA MENJADI APPWRITE FUNCTION ---

  try {
    const totalAmount = poData.items.reduce(
      (sum, item) => sum + item.totalCost,
      0
    )
    const poNumber = `PO-${Date.now()}`

    const dataToSave = {
      ...poData,
      // Appwrite tidak bisa menyimpan objek array secara langsung, kita simpan sebagai JSON string
      items: JSON.stringify(poData.items),
      totalAmount,
      poNumber,
      status: 'PENDING' as POStatus,
      poDate: new Date().toISOString(),
    }

    const document = await databases.createDocument(
      DATABASE_ID,
      PURCHASE_ORDERS_COLLECTION_ID,
      ID.unique(),
      dataToSave
    )

    // Memetakan kembali `items` dari string ke objek array untuk dikembalikan ke UI
    const createdPO: PurchaseOrder = {
      ...poData,
      id: document.$id,
      items: poData.items, // Menggunakan data asli sebelum di-stringify
      totalAmount: document.totalAmount,
      poNumber: document.poNumber,
      status: document.status,
      poDate: document.poDate,
      createdAt: document.$createdAt,
    }

    return createdPO
  } catch (error: any) {
    console.error('Error creating purchase order:', error)
    return { error: error.message || 'Gagal membuat purchase order.' }
  }
  // --- AKHIR LOGIKA YANG SEHARUSNYA MENJADI APPWRITE FUNCTION ---
}

export async function getPurchaseOrders(
  branchId: string,
  filters: {
    status?: POStatus
    startDate?: Date
    endDate?: Date
  }
): Promise<PurchaseOrder[]> {
  if (!branchId) return []
  try {
    const queries = [Query.equal('branchId', branchId)]

    if (filters.status) {
      queries.push(Query.equal('status', filters.status))
    }
    if (filters.startDate) {
      queries.push(
        Query.greaterThanEqual('poDate', filters.startDate.toISOString())
      )
    }
    if (filters.endDate) {
      // Tambahkan 1 hari ke endDate untuk mencakup semua transaksi di hari itu
      const adjustedEndDate = new Date(filters.endDate)
      adjustedEndDate.setDate(adjustedEndDate.getDate() + 1)
      queries.push(Query.lessThan('poDate', adjustedEndDate.toISOString()))
    }

    queries.push(Query.orderDesc('poDate'))

    const response = await databases.listDocuments(
      DATABASE_ID,
      PURCHASE_ORDERS_COLLECTION_ID,
      queries
    )

    return response.documents.map((doc) => ({
      id: doc.$id,
      poNumber: doc.poNumber,
      branchId: doc.branchId,
      supplierId: doc.supplierId,
      supplierName: doc.supplierName,
      poDate: doc.poDate,
      items: JSON.parse(doc.items),
      totalAmount: doc.totalAmount,
      status: doc.status,
      createdBy: doc.createdBy,
      createdByName: doc.createdByName,
      notes: doc.notes,
      createdAt: doc.$createdAt,
    })) as PurchaseOrder[]
  } catch (error: any) {
    console.error('Error fetching purchase orders:', error)
    return []
  }
}

export async function getPurchaseOrderById(
  poId: string
): Promise<PurchaseOrder | null> {
  if (!poId) return null
  try {
    const doc = await databases.getDocument(
      DATABASE_ID,
      PURCHASE_ORDERS_COLLECTION_ID,
      poId
    )
    return {
      id: doc.$id,
      poNumber: doc.poNumber,
      branchId: doc.branchId,
      supplierId: doc.supplierId,
      supplierName: doc.supplierName,
      poDate: doc.poDate,
      items: JSON.parse(doc.items),
      totalAmount: doc.totalAmount,
      status: doc.status,
      createdBy: doc.createdBy,
      createdByName: doc.createdByName,
      notes: doc.notes,
      createdAt: doc.$createdAt,
    } as PurchaseOrder
  } catch (error: any) {
    console.error(`Error fetching PO ${poId}:`, error)
    return null
  }
}

export async function markPOAsCompleted(
  poId: string,
  userId: string,
  userName: string
): Promise<void | { error: string }> {
  if (!poId || !userId || !userName)
    return { error: 'ID PO dan informasi pengguna diperlukan.' }

  // --- AWAL LOGIKA YANG SEHARUSNYA MENJADI APPWRITE FUNCTION ---
  try {
    const po = await getPurchaseOrderById(poId)
    if (!po) return { error: 'Purchase Order tidak ditemukan.' }
    if (po.status !== 'PENDING')
      return { error: `PO sudah dalam status ${po.status}` }

    // 1. Update stok untuk setiap item dalam PO
    for (const item of po.items) {
      // Ambil kuantitas item saat ini
      const inventoryItemDoc = await databases.getDocument(
        DATABASE_ID,
        INVENTORY_ITEMS_COLLECTION_ID,
        item.itemId
      )
      const currentQuantity = inventoryItemDoc.quantity || 0
      const newQuantity = currentQuantity + item.quantity

      // Update kuantitas item inventaris
      await databases.updateDocument(
        DATABASE_ID,
        INVENTORY_ITEMS_COLLECTION_ID,
        item.itemId,
        {
          quantity: newQuantity,
        }
      )

      // 2. (Opsional tapi direkomendasikan) Buat catatan mutasi stok
      // TODO: Migrasikan `addStockMutation` dan panggil di sini
      await addStockMutation({
        itemId: item.itemId,
        itemName: item.itemName, // Denormalisasi nama item
        branchId: po.branchId,
        change: item.quantity, // Positif karena barang masuk
        previousQuantity: currentQuantity,
        newQuantity: newQuantity,
        type: 'PURCHASE_RECEIPT',
        description: `Penerimaan barang dari PO #${po.poNumber}`,
        relatedTransactionId: po.id,
        userId: userId,
        userName: userName,
      })
    }

    // 3. Update status PO menjadi 'COMPLETED'
    await databases.updateDocument(
      DATABASE_ID,
      PURCHASE_ORDERS_COLLECTION_ID,
      poId,
      {
        status: 'COMPLETED',
      }
    )
  } catch (error: any) {
    console.error('Error completing PO:', error)
    // Di sini risikonya: jika error terjadi di tengah-tengah loop, sebagian stok mungkin sudah diperbarui.
    return {
      error: `Gagal menyelesaikan PO. Sebagian data mungkin tidak konsisten. Error: ${error.message}`,
    }
  }
  // --- AKHIR LOGIKA YANG SEHARUSNYA MENJADI APPWRITE FUNCTION ---
}

export async function cancelPurchaseOrder(
  poId: string
): Promise<void | { error: string }> {
  if (!poId) return { error: 'ID PO tidak valid.' }
  try {
    const po = await getPurchaseOrderById(poId)
    if (!po) return { error: 'Purchase Order tidak ditemukan.' }
    if (po.status !== 'PENDING')
      return { error: 'Hanya PO yang pending yang bisa dibatalkan.' }

    await databases.updateDocument(
      DATABASE_ID,
      PURCHASE_ORDERS_COLLECTION_ID,
      poId,
      {
        status: 'CANCELLED',
      }
    )
  } catch (error: any) {
    console.error('Error cancelling PO:', error)
    return { error: 'Gagal membatalkan PO.' }
  }
}
