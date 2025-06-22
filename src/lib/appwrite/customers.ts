// src/lib/appwrite/customers.ts

import {
  databases,
  ID,
  Query,
  DATABASE_ID,
  CUSTOMERS_COLLECTION_ID,
} from './config'

// --- Definisi Tipe Data untuk Appwrite ---

// Appwrite menggunakan ISO 8601 string untuk tanggal.
// Atribut sistem Appwrite: $id, $createdAt, $updatedAt.

export interface Customer {
  id: string // Akan dipetakan dari $id
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  branchId: string
  createdAt: string // ISO String, dari $createdAt
}

// Tipe ini digunakan saat membuat pelanggan baru.
export type CustomerInput = Omit<Customer, 'id' | 'createdAt'>

// --- Fungsi untuk Manajemen Pelanggan ---

export async function addCustomer(
  customerData: CustomerInput
): Promise<Customer | { error: string }> {
  if (!customerData.name.trim())
    return { error: 'Nama pelanggan tidak boleh kosong.' }
  if (!customerData.branchId) return { error: 'ID Cabang diperlukan.' }

  try {
    // Menambahkan nilai default untuk field yang baru dibuat
    const dataToSave = {
      ...customerData,
    }

    const document = await databases.createDocument(
      DATABASE_ID,
      CUSTOMERS_COLLECTION_ID,
      ID.unique(),
      dataToSave
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
    console.error('Error adding customer:', error)
    // Menangani error duplikasi kunci (jika Anda membuat index unik pada nomor telepon)
    if (error.code === 409) {
      return { error: 'Pelanggan dengan nomor telepon ini sudah ada.' }
    }
    return { error: error.message || 'Gagal menambah pelanggan.' }
  }
}

export async function getCustomers(
  branchId: string,
  options: {
    limit?: number
    searchTerm?: string
    cursorAfter?: string // Appwrite uses string ID for cursor
  } = {}
): Promise<{ customers: Customer[]; lastDocId?: string; hasMore: boolean }> {
  if (!branchId) return { customers: [], hasMore: false }

  try {
    let queries: string[] = [Query.equal('branchId', branchId)]

    // PENTING: Appwrite Query.search() hanya bisa menargetkan satu atribut yang di-index.
    // Di sini kita memilih untuk mencari berdasarkan 'name'. Jika Anda ingin mencari
    // berdasarkan 'name' ATAU 'phone', Anda perlu membuat atribut gabungan di koleksi Anda,
    // misalnya 'searchIndex' yang berisi "nama pelanggan 123456789", lalu buat index di situ.
    if (options.searchTerm) {
      queries.push(Query.search('name', options.searchTerm))
    } else {
      queries.push(Query.orderDesc('$createdAt')) // Urutkan berdasarkan yang terbaru jika tidak ada pencarian
    }

    if (options.limit && options.limit > 0) {
      queries.push(Query.limit(options.limit + 1)) // Ambil satu ekstra untuk cek `hasMore`
    }
    if (options.cursorAfter) {
      queries.push(Query.cursorAfter(options.cursorAfter))
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      CUSTOMERS_COLLECTION_ID,
      queries
    )

    let documents = response.documents
    let hasMore = false

    if (options.limit && documents.length > options.limit) {
      hasMore = true
      documents.pop() // Hapus item ekstra
    }

    const customers: Customer[] = documents.map((doc) => ({
      id: doc.$id,
      createdAt: doc.$createdAt,
      name: doc.name,
      phone: doc.phone,
      email: doc.email,
      address: doc.address,
      branchId: doc.branchId,
    }))

    const lastDocId =
      customers.length > 0 ? customers[customers.length - 1].id : undefined

    return { customers, lastDocId, hasMore }
  } catch (error: any) {
    console.error('Error fetching customers:', error)
    return { customers: [], hasMore: false }
  }
}

export async function getCustomerById(
  customerId: string
): Promise<Customer | null> {
  if (!customerId) return null
  try {
    const document = await databases.getDocument(
      DATABASE_ID,
      CUSTOMERS_COLLECTION_ID,
      customerId
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
    // Appwrite melempar error 404 jika tidak ditemukan
    if (error.code !== 404) {
      console.error(`Error fetching customer by ID ${customerId}:`, error)
    }
    return null
  }
}

export async function updateCustomer(
  customerId: string,
  updates: Partial<CustomerInput>
): Promise<void | { error: string }> {
  if (!customerId) return { error: 'ID Pelanggan tidak valid.' }

  try {
    await databases.updateDocument(
      DATABASE_ID,
      CUSTOMERS_COLLECTION_ID,
      customerId,
      updates
    )
  } catch (error: any) {
    console.error('Error updating customer:', error)
    return { error: error.message || 'Gagal memperbarui data pelanggan.' }
  }
}

export async function deleteCustomer(
  customerId: string
): Promise<void | { error: string }> {
  if (!customerId) return { error: 'ID Pelanggan tidak valid.' }

  try {
    // Catatan: Di Appwrite, Anda mungkin perlu menggunakan Appwrite Function untuk
    // mengecek apakah pelanggan ini terkait dengan transaksi sebelum menghapusnya.
    // Jika tidak ada dependensi, penghapusan langsung aman.
    await databases.deleteDocument(
      DATABASE_ID,
      CUSTOMERS_COLLECTION_ID,
      customerId
    )
  } catch (error: any) {
    console.error('Error deleting customer:', error)
    return { error: error.message || 'Gagal menghapus pelanggan.' }
  }
}
