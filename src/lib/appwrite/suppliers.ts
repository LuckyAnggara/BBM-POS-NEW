// src/lib/appwrite/suppliers.ts

import {
  databases,
  ID,
  Query,
  DATABASE_ID,
  SUPPLIERS_COLLECTION_ID,
} from './config'

// --- Definisi Tipe Data untuk Appwrite ---

export interface Supplier {
  id: string // Akan dipetakan dari $id
  name: string
  phone?: string
  email?: string
  address?: string
  branchId: string
  createdAt: string // ISO String, dari $createdAt
}

// Tipe ini digunakan saat membuat supplier baru.
export type SupplierInput = Omit<Supplier, 'id' | 'createdAt'>

// --- Fungsi untuk Manajemen Supplier ---

export async function addSupplier(
  supplierData: SupplierInput
): Promise<Supplier | { error: string }> {
  if (!supplierData.name.trim())
    return { error: 'Nama supplier tidak boleh kosong.' }
  if (!supplierData.branchId) return { error: 'ID Cabang diperlukan.' }

  try {
    const document = await databases.createDocument(
      DATABASE_ID,
      SUPPLIERS_COLLECTION_ID,
      ID.unique(),
      supplierData
    )

    return {
      id: document.$id,
      name: document.name,
      phone: document.phone,
      email: document.email,
      address: document.address,
      branchId: document.branchId,
      createdAt: document.$createdAt,
    }
  } catch (error: any) {
    console.error('Error adding supplier:', error)
    if (error.code === 409) {
      return { error: 'Supplier dengan nama atau nomor telepon ini sudah ada.' }
    }
    return { error: error.message || 'Gagal menambah supplier.' }
  }
}

export async function getSuppliers(
  branchId: string,
  options: {
    limit?: number
    searchTerm?: string
    cursorAfter?: string // Appwrite uses string ID for cursor
  } = {}
): Promise<{ suppliers: Supplier[]; lastDocId?: string; hasMore: boolean }> {
  if (!branchId) return { suppliers: [], hasMore: false }

  try {
    let queries: string[] = [Query.equal('branchId', branchId)]

    // Sama seperti customers, search hanya pada satu atribut (contoh: name)
    // Buat index di Appwrite Console untuk atribut 'name' di koleksi suppliers.
    if (options.searchTerm) {
      queries.push(Query.search('name', options.searchTerm))
    } else {
      queries.push(Query.orderDesc('$createdAt')) // Urutkan berdasarkan yang terbaru
    }

    if (options.limit && options.limit > 0) {
      queries.push(Query.limit(options.limit + 1))
    }
    if (options.cursorAfter) {
      queries.push(Query.cursorAfter(options.cursorAfter))
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      SUPPLIERS_COLLECTION_ID,
      queries
    )

    let documents = response.documents
    let hasMore = false

    if (options.limit && documents.length > options.limit) {
      hasMore = true
      documents.pop()
    }

    const suppliers: Supplier[] = documents.map((doc) => ({
      id: doc.$id,
      createdAt: doc.$createdAt,
      name: doc.name,
      phone: doc.phone,
      email: doc.email,
      address: doc.address,
      branchId: doc.branchId,
    }))

    const lastDocId =
      suppliers.length > 0 ? suppliers[suppliers.length - 1].id : undefined

    return { suppliers, lastDocId, hasMore }
  } catch (error: any) {
    console.error('Error fetching suppliers:', error)
    return { suppliers: [], hasMore: false }
  }
}

export async function getSupplierById(
  supplierId: string
): Promise<Supplier | null> {
  if (!supplierId) return null
  try {
    const document = await databases.getDocument(
      DATABASE_ID,
      SUPPLIERS_COLLECTION_ID,
      supplierId
    )
    return {
      id: document.$id,
      createdAt: document.$createdAt,
      name: document.name,
      phone: document.phone,
      email: document.email,
      address: document.address,
      branchId: document.branchId,
    }
  } catch (error: any) {
    if (error.code !== 404) {
      console.error(`Error fetching supplier by ID ${supplierId}:`, error)
    }
    return null
  }
}

export async function updateSupplier(
  supplierId: string,
  updates: Partial<SupplierInput>
): Promise<void | { error: string }> {
  if (!supplierId) return { error: 'ID Supplier tidak valid.' }

  try {
    await databases.updateDocument(
      DATABASE_ID,
      SUPPLIERS_COLLECTION_ID,
      supplierId,
      updates
    )
  } catch (error: any) {
    console.error('Error updating supplier:', error)
    return { error: error.message || 'Gagal memperbarui data supplier.' }
  }
}

export async function deleteSupplier(
  supplierId: string
): Promise<void | { error: string }> {
  if (!supplierId) return { error: 'ID Supplier tidak valid.' }

  try {
    // Di aplikasi nyata, Anda harus memastikan supplier ini tidak terkait
    // dengan Purchase Order (PO) apa pun sebelum menghapusnya.
    // Ini bisa dilakukan di sisi klien atau via Appwrite Function.
    await databases.deleteDocument(
      DATABASE_ID,
      SUPPLIERS_COLLECTION_ID,
      supplierId
    )
  } catch (error: any) {
    console.error('Error deleting supplier:', error)
    return { error: error.message || 'Gagal menghapus supplier.' }
  }
}
