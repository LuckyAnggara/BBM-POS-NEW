// src/lib/appwrite/pos.ts

import { getUserDocument } from '../firebase/users'
import {
  databases,
  ID,
  Query,
  functions,
  DATABASE_ID,
  POS_SHIFTS_COLLECTION_ID,
  POS_TRANSACTIONS_COLLECTION_ID,
  POS_TRANSACTION_ITEMS_COLLECTION_ID,
  BRANCHES_COLLECTION_ID,
} from './config'
import {
  TransactionDocument,
  CreateTransactionPayload,
  TransactionViewModel,
  ShiftDocument,
  TransactionItemDocument,
} from './types' // Kita akan mengimpor tipe bersih dari satu file pusat

interface GetTransactionsParams {
  branchId: string
  shiftId?: string
  options?: {
    startDate?: string
    endDate?: string
    limit?: number
    searchTerm?: string
    page?: number
  }
}

// =================================================================
// FUNGSI MAPPER (PRAKTIK TERBAIK)
// Untuk mengubah dokumen mentah dari Appwrite menjadi tipe yang bersih dan aman.
// =================================================================

/**
 * Mengubah dokumen mentah Appwrite menjadi tipe ShiftDocument yang bersih.
 * @param doc Dokumen mentah dari Appwrite
 * @returns Objek dengan tipe ShiftDocument
 */
const mapDocToShiftDocument = (doc: any): ShiftDocument => ({
  $id: doc.$id,
  $createdAt: doc.$createdAt,
  branchId: doc.branchId,
  userId: doc.userId,
  userName: doc.userName,
  startShift: doc.startShift,
  endShift: doc.endShift,
  startingBalance: doc.startingBalance,
  totalSales: doc.totalSales,
  totalCashPayments: doc.totalCashPayments,
  discountAmount: doc.discountAmount,
  totalOtherPayments: doc.totalOtherPayments,
  status: doc.status,
})

const mapDocToTransactionItemDocument = (
  doc: any
): TransactionItemDocument => ({
  $id: doc.$id,
  $createdAt: doc.$createdAt,
  transactionId: doc.transactionId,
  branchId: doc.branchId,
  productId: doc.productId,
  productName: doc.productName,
  sku: doc.sku,
  quantity: doc.quantity,
  priceAtSale: doc.priceAtSale,
  costAtSale: doc.costAtSale,
  discountAmount: doc.discountAmount,
  subtotal: doc.subtotal,
})

/**
 * Mengubah dokumen mentah Appwrite menjadi tipe TransactionDocument yang bersih.
 * @param doc Dokumen mentah dari Appwrite
 * @returns Objek dengan tipe TransactionDocument
 */
const mapDocToTransactionDocument = (doc: any): TransactionDocument => {
  // Parsing item yang disimpan sebagai JSON string dengan aman
  let parsedItems = []
  try {
    if (doc.items && typeof doc.items === 'string') {
      parsedItems = JSON.parse(doc.items)
    } else if (Array.isArray(doc.items)) {
      parsedItems = doc.items // Jika sudah berupa array
    }
  } catch (e) {
    console.error(`Gagal parsing item untuk transaksi ${doc.$id}:`, e)
  }

  return {
    $id: doc.$id,
    $createdAt: doc.$createdAt,
    status: doc.status,
    transactionNumber: doc.transactionNumber,
    branchId: doc.branchId,
    shiftId: doc.shiftId,
    userId: doc.userId,
    customerId: doc.customerId,
    userName: doc.userName,
    customerName: doc.customerName,
    items: parsedItems,
    subtotal: doc.subtotal,
    itemsDiscountAmount: doc.itemsDiscountAmount || 0,
    voucherCode: doc.voucherCode,
    voucherDiscountAmount: doc.voucherDiscountAmount || 0,
    totalDiscountAmount: doc.totalDiscountAmount || 0,
    shippingCost: doc.shippingCost || 0,
    taxAmount: doc.taxAmount || 0,
    totalAmount: doc.totalAmount,
    totalCOGS: doc.totalCOGS || 0,
    // Details
    paymentMethod: doc.paymentMethod,
    paymentStatus: doc.paymentStatus,
    amountPaid: doc.amountPaid,
    changeGiven: doc.changeGiven || 0,
    isCreditSale: doc.isCreditSale || false,
    creditDueDate: doc.creditDueDate,
    outstandingAmount: doc.outstandingAmount || 0,
    bankTransactionRef: doc.bankTransactionRef,
    bankName: doc.bankName,
  }
}

// =================================================================
// FUNGSI MANAJEMEN SHIFT (SUDAH DIPERBAIKI)
// =================================================================

export async function getActiveShift(
  userId: string,
  branchId: string
): Promise<ShiftDocument | null> {
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
    console.log('Shift ditemukan:', response)

    if (response.documents.length > 0) {
      // Gunakan fungsi mapper untuk konsistensi dan keamanan tipe
      return mapDocToShiftDocument(response.documents[0])
    }
    return null
  } catch (error) {
    console.error('Error getting active shift:', error)
    return null
  }
}

export async function startShift(
  userId: string,
  branchId: string,
  userName: string,
  startingBalance: number
): Promise<ShiftDocument | { error: string }> {
  try {
    const existingShift = await getActiveShift(userId, branchId)
    if (existingShift) {
      return { error: 'Anda sudah memiliki shift yang aktif.' }
    }

    const dataToSave = {
      branchId,
      userId,
      userName,
      startingBalance,
      startShift: new Date().toISOString(),
      totalSales: 0,
      totalCashPayments: 0,
      totalOtherPayments: 0,
      discountAmount: 0,
      status: 'active' as const,
    }

    const document = await databases.createDocument(
      DATABASE_ID,
      POS_SHIFTS_COLLECTION_ID,
      ID.unique(),
      dataToSave
    )
    // Gunakan mapper untuk memastikan tipe keluaran benar
    return mapDocToShiftDocument(document)
  } catch (error: any) {
    console.error('Error starting shift:', error)
    return { error: error.message || 'Gagal memulai shift.' }
  }
}

export async function endShift(
  shiftId: string
): Promise<{ error: string } | void> {
  // Peringatan: Logika ini sebaiknya ada di dalam Appwrite Function
  // untuk menghitung ulang semua total sebelum menutup shift demi akurasi.
  if (!shiftId) return { error: 'ID Shift tidak valid.' }
  try {
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

// =================================================================
// FUNGSI TRANSAKSI (SUDAH DIPERBAIKI)
// =================================================================

/**
 * ===================================================================================
 * !! PERINGATAN KRITIS: ANDA HARUS MENGGUNAKAN APPWRITE FUNCTIONS UNTUK INI !!
 * ===================================================================================
 * Fungsi ini sekarang berfungsi sebagai pembungkus (wrapper) yang aman untuk memanggil
 * Appwrite Function. Semua logika berat (update stok, dll) terjadi di server.
 * Ini adalah arsitektur yang BENAR dan direkomendasikan.
 * ===================================================================================
 */
export async function createPOSTransaction(
  payload: CreateTransactionPayload
): Promise<TransactionDocument | { error: string }> {
  // Ganti 'YOUR_FUNCTION_ID' dengan ID fungsi yang Anda deploy di Appwrite
  const CREATE_POS_FUNCTION_ID = '685fd6e3000a011a253e' // Ganti dengan ID Function Anda

  try {
    const result = await functions.createExecution(
      CREATE_POS_FUNCTION_ID,
      JSON.stringify(payload), // Kirim payload yang sudah bersih
      false, // false = sinkron (menunggu hasil)
      '/',
      'POST'
    )

    if (result.status === 'completed') {
      const response = JSON.parse(result.responseBody)
      if (response.ok) {
        // Fungsi backend berhasil dan mengembalikan data transaksi
        // Kita gunakan mapper untuk memastikan data yang kembali ke UI bersih
        return mapDocToTransactionDocument(response.data)
      } else {
        // Error logis dari dalam fungsi (misal: stok tidak cukup)
        return { error: response.msg || 'Fungsi backend mengembalikan error.' }
      }
    } else {
      // Error pada eksekusi fungsi itu sendiri (misal: timeout, crash)
      return {
        error: `Eksekusi fungsi gagal: ${result.status}. Error: ${result.responseBody}`,
      }
    }
  } catch (e: any) {
    console.error('Gagal memanggil fungsi transaksi POS:', e)
    return { error: e.message || 'Gagal menghubungi server.' }
  }
}

// =================================================================
// FUNGSI PENGAMBILAN DATA (SUDAH DIPERBAIKI)
// =================================================================

export async function getTransactions({
  branchId,
  shiftId,
  options = {}, // Beri nilai default agar tidak error jika options tidak dikirim
}: GetTransactionsParams): Promise<{
  total: number
  documents: TransactionDocument[]
}> {
  // Mengembalikan total juga untuk paginasi

  try {
    const limit = options.limit || 25
    const page = options.page || 1
    const offset = (page - 1) * limit

    // Kumpulan query dasar yang selalu berlaku
    const baseQueries = [
      Query.equal('branchId', branchId),
      Query.orderDesc('$createdAt'),
    ]

    if (shiftId) {
      baseQueries.push(Query.equal('shiftId', shiftId))
    }

    if (options.startDate && options.endDate) {
      const startDate = new Date(options.startDate)
      const endDate = new Date(options.endDate)

      baseQueries.push(
        Query.greaterThanEqual('$createdAt', startDate.toISOString())
      )
      baseQueries.push(Query.lessThanEqual('$createdAt', endDate.toISOString()))
    }

    // --- LOGIKA PENCARIAN BARU ---
    if (options.searchTerm) {
      // Jalankan dua query pencarian secara paralel untuk efisiensi
      const [customerNameResults, transactionNumberResults] = await Promise.all(
        [
          databases.listDocuments(DATABASE_ID, POS_TRANSACTIONS_COLLECTION_ID, [
            Query.equal('branchId', branchId), // Selalu scope dengan branch
            Query.startsWith('customerName', options.searchTerm), // Gunakan startsWith untuk pencarian nama
            Query.limit(100), // Batasi hasil pencarian awal
          ]),
          databases.listDocuments(DATABASE_ID, POS_TRANSACTIONS_COLLECTION_ID, [
            Query.equal('branchId', branchId),
            Query.equal('transactionNumber', options.searchTerm), // Gunakan equal untuk no. transaksi
            Query.limit(100),
          ]),
        ]
      )

      // Gabungkan ID dari kedua hasil dan hilangkan duplikat
      const allIds = [
        ...customerNameResults.documents.map((doc) => doc.$id),
        ...transactionNumberResults.documents.map((doc) => doc.$id),
      ]
      const uniqueIds = [...new Set(allIds)]

      if (uniqueIds.length === 0) {
        // Jika tidak ada hasil sama sekali, kembalikan array kosong
        return { total: 0, documents: [] }
      }

      // Tambahkan filter berdasarkan ID unik yang ditemukan
      baseQueries.push(Query.equal('$id', uniqueIds))
    }

    // --- Query Final untuk mendapatkan data dan total ---
    const finalQueries = [
      ...baseQueries,
      Query.limit(limit),
      Query.offset(offset),
    ]

    // Kita perlu 2 query: satu untuk data (dengan limit/offset), satu untuk total (tanpa limit/offset)
    const [response, totalResponse] = await Promise.all([
      databases.listDocuments(
        DATABASE_ID,
        POS_TRANSACTIONS_COLLECTION_ID,
        finalQueries
      ),
      databases.listDocuments(
        DATABASE_ID,
        POS_TRANSACTIONS_COLLECTION_ID,
        baseQueries
      ),
    ])

    return {
      total: totalResponse.total,
      documents: response.documents.map(mapDocToTransactionDocument),
    }
  } catch (error: any) {
    console.error('Error fetching transactions:', error)
    return { total: 0, documents: [] }
  }
}

export async function getTransactionById(
  transactionId: string
): Promise<TransactionViewModel | null> {
  try {
    // Langkah 1: Ambil dokumen "kepala" transaksi
    const transactionDoc = await databases.getDocument(
      DATABASE_ID,
      POS_TRANSACTIONS_COLLECTION_ID,
      transactionId
    )

    if (!transactionDoc) return null

    const [itemsResponse, branchData] = await Promise.all([
      // Query untuk mengambil semua item terkait
      databases.listDocuments(
        DATABASE_ID,
        POS_TRANSACTION_ITEMS_COLLECTION_ID,
        [Query.equal('transactionId', transactionId), Query.limit(100)]
      ),
      // Query untuk mengambil data cabang
      databases.getDocument(
        DATABASE_ID,
        BRANCHES_COLLECTION_ID,
        transactionDoc.branchId
      ),
    ])
    // Gabungkan hasilnya menjadi satu objek ViewModel yang siap ditampilkan
    const transactionViewModel: TransactionViewModel = {
      ...mapDocToTransactionDocument(transactionDoc), // Gunakan mapper untuk data kepala
      items: itemsResponse.documents.map(mapDocToTransactionItemDocument), // Gunakan mapper untuk setiap item
      // >> PROPERTI YANG HILANG SEKARANG DITAMBAHKAN DI SINI <<
      branch: {
        id: branchData.$id,
        name: branchData.name,
      },
      user: {
        id: transactionDoc.userId,
        name: transactionDoc.userName,
      },
      customer: {
        name: transactionDoc.customerName,
      },
    }

    return transactionViewModel
  } catch (error) {
    console.error(`Error fetching transaction by ID ${transactionId}:`, error)
    return null
  }
}
