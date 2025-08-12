import api from '@/lib/api'
import type { Expense } from '@/lib/types' // Asumsi tipe ini dari types.ts

// Tipe untuk input, hilangkan properti yang dibuat otomatis oleh backend
export type ExpenseInput = Omit<
  Expense,
  'id' | 'created_at' | 'updated_at' | 'user_id'
>

// Tipe untuk hasil paginasi dari Laravel
interface PaginatedExpenses {
  data: Expense[]
  total: number
  current_page: number
  // ... properti paginasi lainnya
}

interface ListExpensesParams {
  branchId: number
  page?: number
  limit?: number
  category?: string
  categories?: string[]
  search?: string
  startDate?: string // Format 'YYYY-MM-DD'
  endDate?: string // Format 'YYYY-MM-DD'
}

/**
 * Mengambil daftar pengeluaran dengan paginasi dan filter.
 * @param {ListExpensesParams} params - Parameter untuk filter dan paginasi.
 * @returns {Promise<PaginatedExpenses>}
 */
export const listExpenses = async (
  params: ListExpensesParams
): Promise<PaginatedExpenses> => {
  try {
    const response = await api.get('/api/expenses', {
      params: {
        branch_id: params.branchId,
        page: params.page,
        limit: params.limit,
        category: params.category,
        categories: params.categories,
        search: params.search,
        start_date: params.startDate,
        end_date: params.endDate,
      },
    })
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: listExpenses :: ', error)
    throw error
  }
}

/**
 * Membuat data pengeluaran baru.
 * @param {ExpenseInput} expenseData - Data pengeluaran.
 * @returns {Promise<Expense>}
 */
export const createExpense = async (
  expenseData: ExpenseInput
): Promise<Expense> => {
  try {
    const response = await api.post('/api/expenses', expenseData)
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: createExpense :: ', error)
    throw error
  }
}

/**
 * Memperbarui data pengeluaran.
 * @param {number} id - ID pengeluaran.
 * @param {Partial<ExpenseInput>} updates - Data yang akan diubah.
 * @returns {Promise<Expense>}
 */
export const updateExpense = async (
  id: number,
  updates: Partial<ExpenseInput>
): Promise<Expense> => {
  try {
    const response = await api.put(`/api/expenses/${id}`, updates)
    return response.data
  } catch (error) {
    console.error(`Laravel API Error :: updateExpense (ID: ${id}) :: `, error)
    throw error
  }
}

/**
 * Menghapus data pengeluaran.
 * @param {number} id - ID pengeluaran.
 * @returns {Promise<void>}
 */
export const deleteExpense = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/expenses/${id}`)
  } catch (error) {
    console.error(`Laravel API Error :: deleteExpense (ID: ${id}) :: `, error)
    throw error
  }
}
