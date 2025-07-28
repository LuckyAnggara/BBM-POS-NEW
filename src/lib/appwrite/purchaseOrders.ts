// src/lib/appwrite/purchaseOrders.ts

import {
  databases,
  ID,
  Query,
  functions,
  DATABASE_ID,
  PURCHASE_ORDERS_COLLECTION_ID,
  PURCHASE_ORDER_ITEMS_COLLECTION_ID, // ID Koleksi Baru
  SUPPLIER_PAYMENTS_COLLECTION_ID, // ID Koleksi Baru
  INVENTORY_ITEMS_COLLECTION_ID,
  PURCHASE_ORDER_FUNCTION_ID,
  // RECEIVE_PO_ITEMS_FUNCTION_ID, // ID Fungsi yang Diperbarui
  // RECORD_SUPPLIER_PAYMENT_FUNCTION_ID, // ID Fungsi Baru
} from './config'

import { addStockMutation } from './stockMutations' // Pastikan fungsi ini ada

// --- Definisi Tipe Data (Tetap sama) ---
export type PurchaseOrderStatus =
  | 'draft'
  | 'ordered'
  | 'partially_received'
  | 'fully_received'
  | 'cancelled'
export type PurchaseOrderPaymentStatus =
  | 'unpaid'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
export type PurchaseOrderPaymentTerms = 'cash' | 'credit'

export interface PurchaseOrderItemDocument {
  $id: string
  poId: string
  branchId: string
  productId: string
  productName: string
  orderedQuantity: number
  receivedQuantity: number
  purchasePrice: number
  totalPrice: number
}

export interface SupplierPaymentDocument {
  $id: string
  poId: string
  branchId: string
  supplierId: string
  paymentDate: string // ISO String
  amountPaid: number
  paymentMethod: 'cash' | 'transfer' | 'card' | 'other'
  notes?: string
  recordedByUserId: string
}

export interface PurchaseOrder {
  $id: string
  poNumber: string
  branchId: string
  supplierId: string
  supplierName: string
  orderDate: string
  status: PurchaseOrderStatus
  subtotal: number
  totalAmount: number
  outstandingPOAmount: number
  paymentStatusOnPO: PurchaseOrderPaymentStatus
  createdById: string
  $createdAt: string
  $updatedAt: string
  items: PurchaseOrderItemDocument[]
  payments: SupplierPaymentDocument[]
  expectedDeliveryDate?: string
  notes?: string
  paymentTermsOnPO?: PurchaseOrderPaymentTerms
  supplierInvoiceNumber?: string
  paymentDueDateOnPO?: string
  taxDiscountAmount: number
  shippingCostCharged: number
  otherCosts: number
  isCreditPurchase?: boolean
}

export type PurchaseOrderInput = Omit<
  PurchaseOrder,
  | '$id'
  | '$createdAt'
  | '$updatedAt'
  | 'poNumber'
  | 'subtotal'
  | 'totalAmount'
  | 'outstandingPOAmount'
  | 'paymentStatusOnPO'
  | 'items'
  | 'payments'
> & {
  items: Omit<
    PurchaseOrderItemDocument,
    '$id' | 'poId' | 'branchId' | 'receivedQuantity' | 'totalPrice'
  >[]
}

export interface ReceivedItemData {
  purchaseOrderItemId: string
  productId: string
  quantityReceivedNow: number
  productName: string // Diperlukan untuk mutasi stok
}

export type PurchaseOrderViewModel = PurchaseOrder // Kita bisa gunakan tipe PurchaseOrder yang sudah ada karena sudah lengkap

// Parameter untuk fungsi getPurchaseOrders
export interface GetPurchaseOrdersParams {
  branchId: string
  options?: {
    page?: number
    limit?: number
    startDate?: string | Date
    endDate?: string | Date
    searchTerm?: string
    status?: PurchaseOrderStatus
  }
}

// --- Fungsi addPurchaseOrder & getPurchaseOrderById (Tetap Sama) ---
// ... (Kode untuk addPurchaseOrder dan getPurchaseOrderById tidak berubah dari versi sebelumnya) ...
export async function addPurchaseOrder(
  poData: PurchaseOrderInput,
  supplierName: string
): Promise<PurchaseOrder | { error: string }> {
  if (!poData.branchId || !poData.supplierId || !poData.createdById) {
    return { error: 'Data cabang, pemasok, dan pengguna diperlukan.' }
  }
  if (poData.items.length === 0) {
    return { error: 'Pesanan pembelian harus memiliki setidaknya satu item.' }
  }

  try {
    const poNumber = `PO-${Date.now().toString().slice(-6)}`
    const subtotal = poData.items.reduce(
      (sum, item) => sum + item.orderedQuantity * item.purchasePrice,
      0
    )

    const taxDiscountAmount = poData.taxDiscountAmount || 0
    const shippingCostCharged = poData.shippingCostCharged || 0
    const otherCosts = poData.otherCosts || 0
    const totalAmount =
      subtotal - taxDiscountAmount + shippingCostCharged + otherCosts
    const isCredit = poData.paymentTermsOnPO === 'credit'

    const poToSave = {
      ...poData,
      poNumber,
      supplierName,
      subtotal,
      totalAmount,
      taxDiscountAmount,
      shippingCostCharged,
      otherCosts,
      status: 'draft' as PurchaseOrderStatus,
      isCreditPurchase: isCredit,
      outstandingPOAmount: totalAmount,
      paymentStatusOnPO:
        totalAmount > 0 ? 'unpaid' : ('paid' as PurchaseOrderPaymentStatus),
    }

    delete (poToSave as any).items

    const poDocument = await databases.createDocument(
      DATABASE_ID,
      PURCHASE_ORDERS_COLLECTION_ID,
      ID.unique(),
      poToSave
    )

    const itemDocuments: PurchaseOrderItemDocument[] = []
    for (const item of poData.items) {
      const itemTotalPrice = item.orderedQuantity * item.purchasePrice
      const itemDoc = await databases.createDocument(
        DATABASE_ID,
        PURCHASE_ORDER_ITEMS_COLLECTION_ID,
        ID.unique(),
        {
          poId: poDocument.$id,
          branchId: poData.branchId,
          productId: item.productId,
          productName: item.productName,
          orderedQuantity: item.orderedQuantity,
          receivedQuantity: 0,
          purchasePrice: item.purchasePrice,
          totalPrice: itemTotalPrice,
        }
      )
      itemDocuments.push(itemDoc as any)
    }

    return {
      ...(poDocument as any),
      items: itemDocuments,
      payments: [],
    }
  } catch (error: any) {
    console.error('Error adding purchase order:', error)
    return { error: error.message || 'Gagal menambah pesanan pembelian.' }
  }
}

export async function recordPaymentToSupplier(
  poId: string,
  paymentDetails: Omit<
    SupplierPaymentDocument,
    '$id' | 'poId' | 'branchId' | 'supplierId'
  >
): Promise<void | { error: string }> {
  if (!poId || !paymentDetails.amountPaid) {
    return { error: 'ID PO dan jumlah pembayaran diperlukan.' }
  }

  try {
    const poDoc = await databases.getDocument(
      DATABASE_ID,
      PURCHASE_ORDERS_COLLECTION_ID,
      poId
    )

    await databases.createDocument(
      DATABASE_ID,
      SUPPLIER_PAYMENTS_COLLECTION_ID,
      ID.unique(),
      {
        poId,
        branchId: poDoc.branchId,
        supplierId: poDoc.supplierId,
        amountPaid: paymentDetails.amountPaid,
        paymentDate: paymentDetails.paymentDate,
        paymentMethod: paymentDetails.paymentMethod,
        notes: paymentDetails.notes,
        recordedByUserId: paymentDetails.recordedByUserId,
      }
    )

    const newOutstandingAmount =
      poDoc.outstandingPOAmount - paymentDetails.amountPaid
    const newPaymentStatus =
      newOutstandingAmount <= 0.01 ? 'paid' : 'partially_paid'

    await databases.updateDocument(
      DATABASE_ID,
      PURCHASE_ORDERS_COLLECTION_ID,
      poId,
      {
        outstandingPOAmount:
          newOutstandingAmount < 0 ? 0 : newOutstandingAmount,
        paymentStatusOnPO: newPaymentStatus,
      }
    )
  } catch (error: any) {
    console.error('Error recording payment on client:', error)
    return { error: error.message || 'Gagal merekam pembayaran.' }
  }
}

export async function updatePaymentToSupplier(
  poId: string,
  paymentId: string,
  paymentUpdateDetails: Partial<
    Omit<SupplierPaymentDocument, '$id' | 'poId' | 'branchId' | 'supplierId'>
  >
): Promise<void | { error: string }> {
  if (!poId || !paymentId || !paymentUpdateDetails.amountPaid) {
    return { error: 'ID PO, ID Pembayaran, dan jumlah pembayaran diperlukan.' }
  }

  try {
    const poDoc = await databases.getDocument(
      DATABASE_ID,
      PURCHASE_ORDERS_COLLECTION_ID,
      poId
    )
    const paymentDoc = await databases.getDocument(
      DATABASE_ID,
      SUPPLIER_PAYMENTS_COLLECTION_ID,
      paymentId
    )

    const originalAmount = paymentDoc.amountPaid
    const newAmount = paymentUpdateDetails.amountPaid
    const difference = newAmount - originalAmount

    await databases.updateDocument(
      DATABASE_ID,
      SUPPLIER_PAYMENTS_COLLECTION_ID,
      paymentId,
      paymentUpdateDetails
    )

    const newOutstandingAmount = poDoc.outstandingPOAmount - difference
    const newPaymentStatus =
      newOutstandingAmount <= 0.01 ? 'paid' : 'partially_paid'

    await databases.updateDocument(
      DATABASE_ID,
      PURCHASE_ORDERS_COLLECTION_ID,
      poId,
      {
        outstandingPOAmount:
          newOutstandingAmount < 0 ? 0 : newOutstandingAmount,
        paymentStatusOnPO: newPaymentStatus,
      }
    )
  } catch (error: any) {
    console.error('Error updating payment on client:', error)
    return { error: error.message || 'Gagal memperbarui pembayaran.' }
  }
}

export async function deletePaymentToSupplier(
  poId: string,
  paymentId: string
): Promise<void | { error: string }> {
  if (!poId || !paymentId) {
    return { error: 'ID PO dan ID Pembayaran diperlukan.' }
  }

  try {
    const poDoc = await databases.getDocument(
      DATABASE_ID,
      PURCHASE_ORDERS_COLLECTION_ID,
      poId
    )
    const paymentDoc = await databases.getDocument(
      DATABASE_ID,
      SUPPLIER_PAYMENTS_COLLECTION_ID,
      paymentId
    )

    const deletedAmount = paymentDoc.amountPaid

    await databases.deleteDocument(
      DATABASE_ID,
      SUPPLIER_PAYMENTS_COLLECTION_ID,
      paymentId
    )

    const newOutstandingAmount = poDoc.outstandingPOAmount + deletedAmount
    const newPaymentStatus =
      newOutstandingAmount >= poDoc.totalAmount ? 'unpaid' : 'partially_paid'

    await databases.updateDocument(
      DATABASE_ID,
      PURCHASE_ORDERS_COLLECTION_ID,
      poId,
      {
        outstandingPOAmount: newOutstandingAmount,
        paymentStatusOnPO: newPaymentStatus,
      }
    )
  } catch (error: any) {
    console.error('Error deleting payment on client:', error)
    return { error: error.message || 'Gagal menghapus pembayaran.' }
  }
}

/**
 * Memperbarui status Purchase Order (misalnya, dari 'draft' ke 'ordered' atau 'cancelled').
 * Hanya diizinkan jika status saat ini adalah 'draft'.
 * @param {string} poId - ID dari Purchase Order yang akan diperbarui.
 * @param {'ordered' | 'cancelled'} newStatus - Status baru untuk PO.
 * @returns {Promise<PurchaseOrder | { error: string }>} - Dokumen PO yang diperbarui atau objek error.
 */
export async function updatePurchaseOrderStatus({
  poId,
  newStatus,
}: {
  poId: string
  newStatus: PurchaseOrderStatus
}): Promise<PurchaseOrder | { error: string }> {
  if (!poId || !newStatus) {
    return { error: 'ID Pesanan Pembelian dan status baru diperlukan.' }
  }

  if (newStatus !== 'ordered' && newStatus !== 'cancelled') {
    return {
      error:
        'Status baru tidak valid. Hanya "ordered" atau "cancelled" yang diizinkan.',
    }
  }

  try {
    // 1. Ambil dokumen PO saat ini untuk verifikasi
    const poDoc = await databases.getDocument(
      DATABASE_ID,
      PURCHASE_ORDERS_COLLECTION_ID,
      poId
    )

    // 2. Periksa apakah status saat ini adalah 'draft'
    if (poDoc.status !== 'draft') {
      return {
        error: `Hanya pesanan dengan status "draft" yang dapat diubah. Status saat ini: ${poDoc.status}.`,
      }
    }

    // 3. Lakukan pembaruan status
    const updatedDoc = await databases.updateDocument(
      DATABASE_ID,
      PURCHASE_ORDERS_COLLECTION_ID,
      poId,
      {
        status: newStatus,
      }
    )

    return {
      $id: updatedDoc.$id,
      status: updatedDoc.status,
      poNumber: updatedDoc.poNumber,
      branchId: updatedDoc.branchId,
      supplierId: updatedDoc.supplierId,
      supplierName: updatedDoc.supplierName,
      orderDate: updatedDoc.orderDate,
      subtotal: updatedDoc.subtotal,
      totalAmount: updatedDoc.totalAmount,
      outstandingPOAmount: updatedDoc.outstandingPOAmount,
      paymentStatusOnPO: updatedDoc.paymentStatusOnPO,
      createdById: updatedDoc.createdById,
      $createdAt: updatedDoc.$createdAt,
      $updatedAt: updatedDoc.$updatedAt,
      items: updatedDoc.items,
      payments: updatedDoc.payments,
      expectedDeliveryDate: updatedDoc.expectedDeliveryDate,
      notes: updatedDoc.notes,
      paymentTermsOnPO: updatedDoc.paymentTermsOnPO,
      supplierInvoiceNumber: updatedDoc.supplierInvoiceNumber,
      paymentDueDateOnPO: updatedDoc.paymentDueDateOnPO,
      taxDiscountAmount: updatedDoc.taxDiscountAmount,
      shippingCostCharged: updatedDoc.shippingCostCharged,
      otherCosts: updatedDoc.otherCosts,
      isCreditPurchase: updatedDoc.isCreditPurchase,
    }
  } catch (error: any) {
    console.error('Error updating purchase order status:', error)
    return {
      error: error.message || 'Gagal memperbarui status pesanan pembelian.',
    }
  }
}

export async function receivePurchaseOrderItems({
  poId,
  poBranchId,
  poNumber,
  itemsReceived,
  receivedByUserId,
  receivedByUserName,
}: {
  poId: string
  poBranchId: string
  poNumber: string
  itemsReceived: ReceivedItemData[]
  receivedByUserId: string
  receivedByUserName: string
}): Promise<{ success: boolean } | { error: string }> {
  if (
    !poId ||
    !poBranchId ||
    !poNumber ||
    !receivedByUserId ||
    itemsReceived.length === 0
  ) {
    return { error: 'Informasi PO, item, dan pengguna diperlukan.' }
  }

  try {
    // Membuat payload untuk dikirim ke Appwrite Function
    const payload = JSON.stringify({
      action: 'receiveItems',
      poId,
      poBranchId,
      poNumber,
      itemsReceived,
      receivedByUserId,
      receivedByUserName,
    })

    // Memanggil Appwrite Function
    const result = await functions.createExecution(
      PURCHASE_ORDER_FUNCTION_ID, // ID Fungsi yang Anda buat
      payload,
      false // `false` untuk eksekusi sinkron
    )

    if (result.status === 'failed') {
      // Jika eksekusi fungsi gagal, coba parsing respons error
      try {
        const response = JSON.parse(result.responseBody)
        throw new Error(response.message || 'Eksekusi fungsi gagal.')
      } catch (e: any) {
        return { error: e.message }
      }
    }
    // Jika semua berhasil
    return { success: true }
  } catch (error: any) {
    console.error('Error calling receivePurchaseOrderItems function:', error)
    return {
      error:
        error.message ||
        'Gagal memanggil fungsi untuk memproses penerimaan barang.',
    }
  }
}

// --- FUNGSI BARU UNTUK MENGAMBIL DATA PURCHASE ORDER ---

/**
 * Mengambil daftar Purchase Order dengan paginasi, filter, dan pencarian.
 * Mengembalikan data 'dangkal' (tanpa items/payments) untuk performa daftar.
 * @param {GetPurchaseOrdersParams} params - Parameter untuk query.
 * @returns {Promise<{total: number, documents: PurchaseOrder[]}>} - Total dokumen dan daftar dokumen PO.
 */
export async function getPurchaseOrders({
  branchId,
  options = {},
}: GetPurchaseOrdersParams): Promise<{
  total: number
  documents: PurchaseOrder[]
}> {
  try {
    const limit = options.limit || 25
    const page = options.page || 1
    const offset = (page - 1) * limit

    // Kumpulan query dasar
    const baseQueries = [
      Query.equal('branchId', branchId),
      Query.orderDesc('$createdAt'),
    ]

    // Filter berdasarkan status jika ada
    if (options.status) {
      baseQueries.push(Query.equal('status', options.status))
    }

    // Filter berdasarkan rentang tanggal
    if (options.startDate && options.endDate) {
      const startDate = new Date(options.startDate)
      const endDate = new Date(options.endDate)
      baseQueries.push(
        Query.greaterThanEqual('orderDate', startDate.toISOString())
      )
      baseQueries.push(Query.lessThanEqual('orderDate', endDate.toISOString()))
    }

    // Logika pencarian untuk poNumber dan supplierName
    if (options.searchTerm) {
      const searchTerm = options.searchTerm
      const [poNumberResults, supplierNameResults] = await Promise.all([
        // Cari berdasarkan poNumber (cocok persis)
        databases.listDocuments(DATABASE_ID, PURCHASE_ORDERS_COLLECTION_ID, [
          Query.equal('branchId', branchId),
          Query.equal('poNumber', searchTerm),
        ]),
        // Cari berdasarkan nama supplier (diawali dengan..)
        databases.listDocuments(DATABASE_ID, PURCHASE_ORDERS_COLLECTION_ID, [
          Query.equal('branchId', branchId),
          Query.search('supplierName', searchTerm), // `search` lebih fleksibel
        ]),
      ])

      const allIds = [
        ...poNumberResults.documents.map((doc) => doc.$id),
        ...supplierNameResults.documents.map((doc) => doc.$id),
      ]
      const uniqueIds = [...new Set(allIds)]

      if (uniqueIds.length === 0) {
        return { total: 0, documents: [] } // Tidak ada hasil, kembalikan kosong
      }

      baseQueries.push(Query.equal('$id', uniqueIds))
    }

    // Query akhir untuk mengambil data dengan paginasi
    const dataQueries = [
      ...baseQueries,
      Query.limit(limit),
      Query.offset(offset),
    ]

    // Jalankan query untuk data dan total secara paralel
    const [response, totalResponse] = await Promise.all([
      databases.listDocuments(
        DATABASE_ID,
        PURCHASE_ORDERS_COLLECTION_ID,
        dataQueries
      ),
      // Untuk mendapatkan total, kita gunakan baseQueries tanpa limit/offset
      databases.listDocuments(
        DATABASE_ID,
        PURCHASE_ORDERS_COLLECTION_ID,
        baseQueries
      ),
    ])

    return {
      total: totalResponse.total,
      documents: response.documents as unknown as Omit<
        PurchaseOrder,
        'items' | 'payments'
      >[],
    }
  } catch (error: any) {
    console.error('Error fetching purchase orders:', error)
    return { total: 0, documents: [] }
  }
}

/**
 * Mengambil satu Purchase Order secara lengkap (termasuk items dan payments).
 * Mengembalikan sebuah ViewModel yang siap untuk ditampilkan di UI detail.
 * @param {string} purchaseOrderId - ID dari dokumen Purchase Order.
 * @returns {Promise<PurchaseOrderViewModel | null>} - Objek PO yang lengkap.
 */
export async function getPurchaseOrderById(
  purchaseOrderId: string
): Promise<PurchaseOrderViewModel | null> {
  if (!purchaseOrderId) return null

  try {
    // Jalankan semua query yang dibutuhkan secara paralel untuk efisiensi
    const [poDoc, itemsResponse, paymentsResponse] = await Promise.all([
      // 1. Ambil dokumen PO utama
      databases.getDocument(
        DATABASE_ID,
        PURCHASE_ORDERS_COLLECTION_ID,
        purchaseOrderId
      ),
      // 2. Ambil semua item yang terkait
      databases.listDocuments(
        DATABASE_ID,
        PURCHASE_ORDER_ITEMS_COLLECTION_ID,
        [Query.equal('poId', purchaseOrderId), Query.limit(200)] // Limit yang cukup besar
      ),
      // 3. Ambil semua pembayaran yang terkait
      databases.listDocuments(DATABASE_ID, SUPPLIER_PAYMENTS_COLLECTION_ID, [
        Query.equal('poId', purchaseOrderId),
        Query.limit(100),
      ]),
    ])

    if (!poDoc) return null

    // Gabungkan semua hasil menjadi satu objek ViewModel
    const viewModel: PurchaseOrderViewModel = {
      ...(poDoc as any), // Spread semua properti dari dokumen PO utama
      items: itemsResponse.documents as unknown as PurchaseOrderItemDocument[], // Tambahkan array items
      payments:
        paymentsResponse.documents as unknown as SupplierPaymentDocument[], // Tambahkan array payments
    }

    return viewModel
  } catch (error) {
    console.error(
      `Error fetching PO ViewModel by ID ${purchaseOrderId}:`,
      error
    )
    return null
  }
}
