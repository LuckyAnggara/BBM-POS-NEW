// src/lib/appwrite/expenses.ts

import {
  databases,
  ID,
  Query,
  DATABASE_ID,
  EXPENSES_COLLECTION_ID,
} from './config'

// --- Definisi Tipe Data untuk Appwrite ---

export interface Expense {
  id: string // Akan dipetakan dari $id
  branchId: string
  description: string
  amount: number
  date: string // ISO 8601 String
  category: 'operational' | 'marketing' | 'lainnya'
  createdBy: string // User ID
  createdByName: string // User Name
  createdAt: string // ISO String, dari $createdAt
}

// Tipe ini digunakan saat membuat pengeluaran baru
export type ExpenseInput = Omit<Expense, 'id' | 'createdAt'>

// --- Fungsi untuk Manajemen Pengeluaran ---

export async function addExpense(
  expenseData: Omit<ExpenseInput, 'date' | 'createdAt'>
): Promise<Expense | { error: string }> {
  if (!expenseData.branchId) return { error: 'ID Cabang diperlukan.' }
  if (!expenseData.description.trim())
    return { error: 'Deskripsi tidak boleh kosong.' }
  if (expenseData.amount <= 0)
    return { error: 'Jumlah harus lebih besar dari nol.' }
  if (!expenseData.createdBy)
    return { error: 'Informasi pengguna pembuat diperlukan.' }

  try {
    const dataToSave = {
      ...expenseData,
      date: new Date().toISOString(), // Simpan tanggal saat ini dalam format ISO
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
      date: document.date,
      category: document.category,
      createdBy: document.createdBy,
      createdByName: document.createdByName,
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
    startDate: Date
    endDate: Date
  }
): Promise<Expense[]> {
  if (!branchId) return []

  try {
    // Pastikan 'date' di-index di Appwrite Console agar bisa di-query
    const queries: string[] = [
      Query.equal('branchId', branchId),
      Query.greaterThanEqual('date', filters.startDate.toISOString()),
      Query.lessThanEqual('date', filters.endDate.toISOString()),
      Query.orderDesc('date'),
    ]

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
      amount: doc.amount,
      date: doc.date,
      category: doc.category,
      createdBy: doc.createdBy,
      createdByName: doc.createdByName,
      createdAt: doc.$createdAt,
    }))
  } catch (error: any) {
    console.error('Error fetching expenses:', error)
    return []
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
