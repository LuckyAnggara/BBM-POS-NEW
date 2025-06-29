// src/lib/appwrite/expenses.ts

import {
  databases,
  ID,
  Query,
  DATABASE_ID,
  USERS_COLLECTION_ID, // Import USERS_COLLECTION_ID to fetch user details
  EXPENSES_COLLECTION_ID,
} from './config'

// --- Definisi Tipe Data untuk Appwrite ---
export const EXPENSE_CATEGORIES = [
  'Sewa',
  'Gaji',
  'Utilitas',
  'Perlengkapan',
  'Pemasaran',
  'Transportasi',
  'Perbaikan',
  'Lain-lain',
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export interface Expense {
  id: string // Akan dipetakan dari $id
  branchId: string
  description: string
  userId?: string
  userName?: string // Tambahkan userName untuk denormalisasi
  amount: number
  date: string // Menggunakan string ISO 8601 untuk konsistensi dengan Appwrite
  category: string
  createdAt: string // Tambahkan createdAt
}

// Tipe ini digunakan saat membuat pengeluaran baru
export type ExpenseInput = Omit<Expense, 'id' | 'createdAt'>

// --- Fungsi untuk Manajemen Pengeluaran ---

export async function addExpense(
  expenseData: ExpenseInput
): Promise<Expense | { error: string }> {
  if (!expenseData.branchId) return { error: 'ID Cabang diperlukan.' }
  if (!expenseData.description.trim())
    return { error: 'Deskripsi tidak boleh kosong.' }
  if (expenseData.amount <= 0)
    return { error: 'Jumlah harus lebih besar dari nol.' }

  try {
    const dataToSave = {
      ...expenseData,
      // Pastikan date sudah dalam format ISO string saat disimpan
      date: expenseData.date.toISOString(), // Simpan tanggal dari form dalam format ISO
    }

    const document = await databases.createDocument(
      DATABASE_ID,
      EXPENSES_COLLECTION_ID,
      ID.unique(),
      dataToSave
    )

    return {
      id: document.$id,
      branchId: document.branchId,
      description: document.description,
      amount: document.amount,
      date: document.date, // date dari Appwrite sudah ISO string
      category: document.category,
      userId: document.userId,
      userName: document.userName,
      createdAt: document.$createdAt,
    }
  } catch (error: any) {
    console.error('Error adding expense:', error)
    return { error: error.message || 'Gagal menambah data pengeluaran.' }
  }
}

export async function getExpenses(
  branchId: string,
  filters: {
    categories?: string[] | undefined
    startDate: Date
    endDate: Date
  }
): Promise<Expense[]> {
  if (!branchId) return []

  // Import endOfDay dari date-fns untuk menyesuaikan endDate
  const { endOfDay } = await import('date-fns')

  try {
    // Sesuaikan endDate agar mencakup seluruh hari terakhir yang dipilih
    const adjustedEndDate = endOfDay(filters.endDate)

    const queries: string[] = [
      Query.equal('branchId', branchId),
      Query.greaterThanEqual('date', filters.startDate.toISOString()), // startDate tetap awal hari
      Query.lessThanEqual('date', adjustedEndDate.toISOString()), // endDate disesuaikan ke akhir hari
      Query.orderDesc('date'),
    ]
    if (filters.categories && filters.categories.length > 0) {
      // Appwrite's Query.equal mendukung array, berfungsi seperti 'IN' di SQL
      queries.push(Query.equal('category', filters.categories))
    }

    // Appwrite listDocuments mengambil hingga 5000 dokumen dalam satu panggilan jika limit tidak disetel.
    // Jika Anda butuh lebih, implementasikan paginasi.
    const response = await databases.listDocuments(
      DATABASE_ID,
      EXPENSES_COLLECTION_ID,
      queries
    )

    return response.documents.map((doc) => ({
      id: doc.$id,
      branchId: doc.branchId,
      description: doc.description,
      userId: doc.userId,
      userName: doc.userName,
      amount: doc.amount,
      date: doc.date,
      category: doc.category,
      createdAt: doc.$createdAt,
    }))
  } catch (error: any) {
    console.error('Error fetching expenses:', error)
    return []
  }
}

export async function updateExpense(
  expenseId: string,
  updates: Partial<
    // Hapus createdBy dan createdByName dari Omit karena sudah tidak ada di ExpenseInput
    Omit<ExpenseInput, 'branchId' | 'userId' | 'userName' | 'createdAt'>
  >
): Promise<void | { error: string }> {
  if (!expenseId) return { error: 'ID Pengeluaran tidak valid.' }
  try {
    const dataToUpdate = { ...updates }
    // Jika tanggal diupdate, konversi ke ISO string
    if (updates.date && updates.date instanceof Date) {
      ;(dataToUpdate as any).date = updates.date.toISOString()
    }

    await databases.updateDocument(
      DATABASE_ID,
      EXPENSES_COLLECTION_ID,
      expenseId,
      dataToUpdate
    )
  } catch (error: any) {
    console.error('Error updating expense:', error)
    return { error: 'Gagal memperbarui pengeluaran.' }
  }
}

export async function deleteExpense(
  expenseId: string
): Promise<void | { error: string }> {
  if (!expenseId) return { error: 'ID Pengeluaran tidak valid.' }

  try {
    await databases.deleteDocument(
      DATABASE_ID,
      EXPENSES_COLLECTION_ID,
      expenseId
    )
  } catch (error: any) {
    console.error('Error deleting expense:', error)
    return { error: error.message || 'Gagal menghapus data pengeluaran.' }
  }
}
