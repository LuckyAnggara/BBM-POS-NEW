import api from '@/lib/api' // Menggunakan API client axios kita
import { BankAccount, BankAccountInput } from '../types'

// --- Definisi Tipe Data ---

// Tipe untuk input, hilangkan properti yang dibuat otomatis

// --- Fungsi Manajemen Rekening Bank ---

/**
 * Mengambil daftar rekening bank.
 * @param {number} [branchId] - Opsional, filter berdasarkan ID cabang.
 * @returns {Promise<BankAccount[]>} Array berisi data rekening bank.
 */
export const listBankAccounts = async (
  branchId?: number
): Promise<BankAccount[]> => {
  try {
    const params = branchId ? { branch_id: branchId } : {}
    const response = await api.get('/api/bank-accounts', { params })
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: listBankAccounts :: ', error)
    throw error
  }
}

/**
 * Menambahkan rekening bank baru.
 * Logika untuk menangani 'is_default' sudah ada di backend.
 * @param {BankAccountInput} accountData - Data rekening yang akan dibuat.
 * @returns {Promise<BankAccount>} Objek rekening yang baru dibuat.
 */
export const createBankAccount = async (
  accountData: BankAccountInput
): Promise<BankAccount> => {
  try {
    const response = await api.post('/api/bank-accounts', accountData)
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: createBankAccount :: ', error)
    throw error
  }
}

/**
 * Memperbarui data rekening bank.
 * @param {number} accountId - ID rekening yang akan diperbarui.
 * @param {Partial<BankAccountInput>} updates - Data yang ingin diperbarui.
 * @returns {Promise<BankAccount>} Objek rekening yang sudah diperbarui.
 */
export const updateBankAccount = async (
  accountId: number,
  updates: Partial<BankAccountInput>
): Promise<BankAccount> => {
  try {
    const response = await api.put(`/api/bank-accounts/${accountId}`, updates)
    return response.data
  } catch (error) {
    console.error(
      `Laravel API Error :: updateBankAccount (ID: ${accountId}) :: `,
      error
    )
    throw error
  }
}

/**
 * Menghapus rekening bank.
 * @param {number} accountId - ID rekening yang akan dihapus.
 * @returns {Promise<void>} Selesai saat penghapusan berhasil.
 */
export const deleteBankAccount = async (accountId: number): Promise<void> => {
  try {
    await api.delete(`/api/bank-accounts/${accountId}`)
  } catch (error) {
    console.error(
      `Laravel API Error :: deleteBankAccount (ID: ${accountId}) :: `,
      error
    )
    throw error
  }
}
