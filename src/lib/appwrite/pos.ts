// src/lib/appwrite/pos.ts

import {
  databases,
  ID,
  Query,
  functions,
  DATABASE_ID,
  POS_SHIFTS_COLLECTION_ID,
  POS_TRANSACTIONS_COLLECTION_ID,
  INVENTORY_ITEMS_COLLECTION_ID,
  CUSTOMERS_COLLECTION_ID,
} from './config'
import type { Customer } from './customers'
import type { InventoryItem } from './inventory'
import { addStockMutation } from './stockMutations'

// --- Definisi Tipe Data ---

export interface POSShift {
  id: string // dari $id
  branchId: string
  userId: string
  userName: string
  startShift: string // ISO String
  endShift?: string // ISO String
  startingBalance: number
  totalSales: number
  totalCashPayments: number
  totalOtherPayments: number
  status: 'active' | 'ended'
}

export type TransactionItem = {
  itemId: string
  name: string
  quantity: number
  price: number // Harga jual per item
  total: number
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'qris' | 'credit'

export interface POSTransaction {
  id: string // dari $id
  status: 'processing' | 'completed' | 'failed'
  transactionNumber: string
  branchId: string
  shiftId: string
  userId: string
  userName: string
  taxAmount: number // Jika ada pajak, bisa ditambahkan
  discountAmount: number // Jika ada diskon, bisa ditambahkan
  items: TransactionItem[] // Disimpan sebagai JSON string
  subtotal: number
  discount: number
  totalAmount: number
  totalCost: number // Total biaya sebelum pajak
  shippingCost: number // Jika ada biaya pengiriman
  paymentMethod: PaymentMethod
  voucherCode?: string // Jika ada kode voucher
  voucherDiscountAmount?: number // Jika ada diskon dari voucher
  totalDiscountAmount?: number // Total diskon (diskon + voucher)
  amountPaid: number
  changeGiven?: number // Jumlah kembalian yang diberikan
  paymentTerms?: string // Jika ada syarat pembayaran khusus
  customerId?: string
  bankTransactionRef?: string // Jika pembayaran melalui transfer bank
  bankName?: string // Jika pembayaran melalui transfer bank
  customerName?: string
  createdAt: string // dari $createdAt
}

// --- Peringatan Kritis Mengenai Transaksi ---

/**
 * ===================================================================================
 * !! PERINGATAN KRITIS: ANDA HARUS MENGGUNAKAN APPWRITE FUNCTIONS UNTUK INI !!
 * ===================================================================================
 *
 * Fungsi `createPOSTransaction` adalah operasi paling kritikal di aplikasi Anda.
 * Di Firebase, ini dilindungi oleh `runTransaction`.
 *
 * Operasi ini harus:
 * 1. Membuat dokumen transaksi.
 * 2. Mengurangi stok untuk SETIAP item yang terjual.
 * 3. (Opsional) Membuat catatan mutasi stok untuk SETIAP item.
 * 4. (Opsional) Memperbarui data pelanggan (total belanja, dll).
 * 5. Memperbarui total penjualan di dokumen shift yang aktif.
 *
 * Melakukan ini semua dari klien (browser) sangatlah BERISIKO. Jika koneksi gagal
 * setelah mengurangi stok item pertama, data Anda akan RUSAK permanen.
 *
 * SOLUSI YANG BENAR:
 * Buat satu Appwrite Function (misal: 'processSale'). Kirim seluruh data keranjang belanja
 * ke fungsi ini. Biarkan server Appwrite yang menjalankan 5 langkah di atas secara aman.
 * Jika ada kegagalan, Anda bisa menangani error di server tanpa merusak data.
 *
 * Kode di bawah ini adalah representasi client-side dan TIDAK DIREKOMENDASIKAN UNTUK PRODUKSI.
 * ===================================================================================
 */

// --- Fungsi Manajemen Shift ---

export async function getActiveShift(
  branchId: string,
  userId: string
): Promise<POSShift | null> {
  if (!branchId || !userId) return null
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      POS_SHIFTS_COLLECTION_ID,
      [
        Query.equal('branchId', branchId),
        Query.equal('userId', userId),
        Query.equal('status', 'active'),
        Query.limit(1),
      ]
    )
    if (response.total > 0) {
      const doc = response.documents[0]
      return doc as unknown as POSShift
    }
    return null
  } catch (error) {
    console.error('Error getting active shift:', error)
    return null
  }
}

export async function startShift(
  branchId: string,
  userId: string,
  startingBalance: number
): Promise<POSShift | { error: string }> {
  try {
    const existingShift = await getActiveShift(branchId, userId)
    if (existingShift) {
      return { error: 'Anda sudah memiliki shift yang aktif.' }
    }

    const dataToSave = {
      branchId,
      userId,
      startingBalance,
      startShift: new Date().toISOString(),
      totalSales: 0,
      totalCashPayments: 0,
      totalOtherPayments: 0,
      totalBankPayments: 0,
      TotalCardPayments: 0,
      TotalQrisPayments: 0,
      status: 'active' as const,
    }

    const document = await databases.createDocument(
      DATABASE_ID,
      POS_SHIFTS_COLLECTION_ID,
      ID.unique(),
      dataToSave
    )
    return document as unknown as POSShift
  } catch (error: any) {
    console.error('Error starting shift:', error)
    return { error: error.message || 'Gagal memulai shift.' }
  }
}

export async function endShift(
  shiftId: string
): Promise<{ error: string } | void> {
  if (!shiftId) return { error: 'ID Shift tidak valid.' }

  // INI JUGA SEBAIKNYA MENJADI APPWRITE FUNCTION
  // Untuk memastikan perhitungan total akurat sebelum menutup shift.
  try {
    const shift = await databases.getDocument(
      DATABASE_ID,
      POS_SHIFTS_COLLECTION_ID,
      shiftId
    )
    if (shift.status !== 'active')
      return { error: 'Shift ini sudah tidak aktif.' }

    // Di Appwrite Function, Anda akan menghitung ulang totalSales dari
    // koleksi transaksi untuk memastikan akurasi sebelum menutup.
    // Di sini kita hanya akan memperbarui statusnya.

    await databases.updateDocument(
      DATABASE_ID,
      POS_SHIFTS_COLLECTION_ID,
      shiftId,
      {
        status: 'ended',
        endShift: new Date().toISOString(),
      }
    )
  } catch (error: any) {
    console.error('Error ending shift:', error)
    return { error: error.message || 'Gagal mengakhiri shift.' }
  }
}

// --- Fungsi Transaksi Penjualan Versi Client Side ---

// export async function createPOSTransaction(
//   transactionData: Omit<
//     POSTransaction,
//     'id' | 'createdAt' | 'transactionNumber' | 'change'
//   >
// ): Promise<POSTransaction | { error: string }> {
//   // --- AWAL DARI LOGIKA YANG HARUS PINDAH KE APPWRITE FUNCTION ---
//   try {
//     if (!transactionData.shiftId)
//       return { error: 'Shift tidak aktif. Tidak bisa melakukan transaksi.' }

//     const transactionNumber = `TRX-${Date.now()}`
//     const change = transactionData.amountPaid - transactionData.total

//     // Langkah yang lebih aman: Buat dokumen transaksi utama terlebih dahulu untuk mendapatkan ID
//     const preTransactionDoc = await databases.createDocument(
//       DATABASE_ID,
//       POS_TRANSACTIONS_COLLECTION_ID,
//       ID.unique(),
//       {
//         ...transactionData,
//         items: JSON.stringify(transactionData.items),
//         transactionNumber,
//         change,
//         status: 'processing', // Status sementara
//       }
//     )
//     const transactionId = preTransactionDoc.$id

//     // 1. Update stok untuk setiap item
//     for (const item of transactionData.items) {
//       const inventoryDoc = await databases.getDocument(
//         DATABASE_ID,
//         INVENTORY_ITEMS_COLLECTION_ID,
//         item.itemId
//       )
//       const currentQuantity = inventoryDoc.quantity as number

//       if (currentQuantity < item.quantity) {
//         // Hapus transaksi yang gagal dibuat
//         await databases.deleteDocument(
//           DATABASE_ID,
//           POS_TRANSACTIONS_COLLECTION_ID,
//           transactionId
//         )
//         throw new Error(
//           `Stok untuk ${item.name} tidak mencukupi (sisa ${currentQuantity}).`
//         )
//       }

//       const newQuantity = currentQuantity - item.quantity
//       await databases.updateDocument(
//         DATABASE_ID,
//         INVENTORY_ITEMS_COLLECTION_ID,
//         item.itemId,
//         {
//           quantity: newQuantity,
//         }
//       )

//       // Panggil fungsi 'addStockMutation'
//       await addStockMutation({
//         itemId: item.itemId,
//         itemName: item.name,
//         branchId: transactionData.branchId,
//         change: -item.quantity, // Negatif karena barang keluar
//         previousQuantity: currentQuantity,
//         newQuantity: newQuantity,
//         type: 'SALE',
//         description: `Penjualan via POS - Transaksi #${transactionNumber}`,
//         relatedTransactionId: transactionId,
//         userId: transactionData.userId,
//         userName: transactionData.userName,
//       })
//     }

//     // 2. Update data pelanggan (jika ada)
//     if (transactionData.customerId) {
//       // ... (logika update pelanggan tetap sama)
//       const customerDoc = await databases.getDocument(
//         DATABASE_ID,
//         CUSTOMERS_COLLECTION_ID,
//         transactionData.customerId
//       )
//       const updatedData = {
//         totalTransactions: (customerDoc.totalTransactions || 0) + 1,
//         totalSpent: (customerDoc.totalSpent || 0) + transactionData.total,
//         lastTransactionDate: new Date().toISOString(),
//       }
//       await databases.updateDocument(
//         DATABASE_ID,
//         CUSTOMERS_COLLECTION_ID,
//         transactionData.customerId,
//         updatedData
//       )
//     }

//     // 3. Update total di dokumen shift
//     // ... (logika update shift tetap sama)
//     const shiftDoc = await databases.getDocument(
//       DATABASE_ID,
//       POS_SHIFTS_COLLECTION_ID,
//       transactionData.shiftId
//     )
//     const shiftUpdate: Partial<POSShift> = {
//       totalSales: (shiftDoc.totalSales || 0) + transactionData.total,
//     }
//     if (transactionData.paymentMethod === 'cash') {
//       shiftUpdate.totalCashPayments =
//         (shiftDoc.totalCashPayments || 0) + transactionData.total
//     } else {
//       shiftUpdate.totalOtherPayments =
//         (shiftDoc.totalOtherPayments || 0) + transactionData.total
//     }
//     await databases.updateDocument(
//       DATABASE_ID,
//       POS_SHIFTS_COLLECTION_ID,
//       transactionData.shiftId,
//       shiftUpdate
//     )

//     // 4. Update status transaksi yang sudah final
//     const finalDoc = await databases.updateDocument(
//       DATABASE_ID,
//       POS_TRANSACTIONS_COLLECTION_ID,
//       transactionId,
//       {
//         status: 'completed', // Ubah status dari processing ke completed
//       }
//     )

//     return {
//       ...transactionData,
//       id: finalDoc.$id,
//       transactionNumber: finalDoc.transactionNumber,
//       change: finalDoc.change,
//       createdAt: finalDoc.$createdAt,
//     }
//   } catch (error: any) {
//     console.error('CRITICAL: POS Transaction failed:', error)
//     return {
//       error: `Transaksi Gagal: ${error.message}. Periksa data stok dan shift secara manual.`,
//     }
//   }
// }

// --- Fungsi Pengambilan Data - Transaksi ---

export async function getTransactions(
  branchId: string,
  shiftId?: string
): Promise<POSTransaction[]> {
  try {
    const queries = [Query.equal('branchId', branchId)]

    if (shiftId) {
      queries.push(Query.equal('shiftId', shiftId))
    }

    queries.push(Query.orderDesc('$createdAt'))

    const response = await databases.listDocuments(
      DATABASE_ID,
      POS_TRANSACTIONS_COLLECTION_ID,
      queries
    )

    return response.documents.map((doc) => ({
      id: doc.$id,
      transactionNumber: doc.transactionNumber,
      branchId: doc.branchId,
      shiftId: doc.shiftId,
      userId: doc.userId,
      userName: doc.userName,
      items: JSON.parse(doc.items),
      subtotal: doc.subtotal,
      discount: doc.discount,
      total: doc.total,
      paymentMethod: doc.paymentMethod,
      amountPaid: doc.amountPaid,
      change: doc.change,
      customerId: doc.customerId,
      customerName: doc.customerName,
      createdAt: doc.$createdAt,
    })) as POSTransaction[]
  } catch (error: any) {
    console.error('Error fetching transactions:', error)
    return []
  }
}

export async function getTransactionById(
  transactionId: string
): Promise<POSTransaction | null> {
  try {
    const doc = await databases.getDocument(
      DATABASE_ID,
      POS_TRANSACTIONS_COLLECTION_ID,
      transactionId
    )
    return {
      id: doc.$id,
      transactionNumber: doc.transactionNumber,
      branchId: doc.branchId,
      shiftId: doc.shiftId,
      userId: doc.userId,
      userName: doc.userName,
      items: JSON.parse(doc.items),
      subtotal: doc.subtotal,
      discount: doc.discount,
      total: doc.total,
      paymentMethod: doc.paymentMethod,
      amountPaid: doc.amountPaid,
      change: doc.change,
      customerId: doc.customerId,
      customerName: doc.customerName,
      createdAt: doc.$createdAt,
    } as POSTransaction
  } catch (error) {
    console.error('Error fetching transaction by ID:', error)
    return null
  }
}

// --- Fungsi Transaksi Penjualan Versi Cloud Function Side ---

export async function createPOSTransaction(
  transactionData: Omit<
    POSTransaction,
    'id' | 'createdAt' | 'transactionNumber' | 'change'
  >
): Promise<POSTransaction | { error: string }> {
  // Ganti 'YOUR_FUNCTION_ID' dengan ID fungsi yang Anda dapatkan dari Appwrite Console
  const FUNCTION_ID = '6855fe8e0013d45e6f0d' // atau ID uniknya

  try {
    const result = await functions.createExecution(
      FUNCTION_ID,
      JSON.stringify(transactionData), // Kirim data sebagai string JSON
      false, // async false, tunggu hasilnya
      '/', // path
      'POST' // method
    )

    if (result.status === 'completed') {
      const response = JSON.parse(result.responseBody)
      if (response.ok) {
        // Sukses, kembalikan data transaksi yang telah dibuat
        return response.data as POSTransaction
      } else {
        // Error dari logika di dalam fungsi
        return { error: response.msg || 'Fungsi backend mengembalikan error.' }
      }
    } else {
      // Error pada eksekusi fungsi itu sendiri
      return {
        error: `Eksekusi fungsi gagal dengan status: ${result.status}. Error: ${result.responseBody}`,
      }
    }
  } catch (e: any) {
    console.error('Gagal memanggil fungsi transaksi POS:', e)
    return { error: e.message || 'Gagal menghubungi server.' }
  }
}
