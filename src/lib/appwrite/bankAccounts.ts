// src/lib/appwrite/bankAccounts.ts

import {
  databases,
  ID,
  Query,
  DATABASE_ID,
  BANK_ACCOUNTS_COLLECTION_ID,
} from './config'

// --- Definisi Tipe Data ---

export interface BankAccount {
  id: string // dari $id
  branchId: string
  bankName: string
  isActive: boolean // Menandai apakah rekening ini aktif
  accountNumber: string
  accountHolderName: string
  isDefault: boolean // Menandai sebagai rekening utama
  createdAt: string // dari $createdAt
}

// Tipe untuk membuat atau memperbarui rekening
export type BankAccountInput = Omit<BankAccount, 'id' | 'createdAt'>

// --- Fungsi Manajemen Rekening Bank ---

export async function addBankAccount(
  accountData: BankAccountInput
): Promise<BankAccount | { error: string }> {
  if (
    !accountData.branchId ||
    !accountData.bankName ||
    !accountData.accountNumber ||
    !accountData.accountHolderName
  ) {
    return { error: 'Semua field wajib diisi.' }
  }

  try {
    // Jika ini diatur sebagai default, pastikan tidak ada default lain
    if (accountData.isDefault) {
      const existingDefaults = await databases.listDocuments(
        DATABASE_ID,
        BANK_ACCOUNTS_COLLECTION_ID,
        [
          Query.equal('branchId', accountData.branchId),
          Query.equal('isDefault', true),
        ]
      )
      // Nonaktifkan status default pada rekening lain
      for (const doc of existingDefaults.documents) {
        await databases.updateDocument(
          DATABASE_ID,
          BANK_ACCOUNTS_COLLECTION_ID,
          doc.$id,
          { isDefault: false }
        )
      }
    }

    const document = await databases.createDocument(
      DATABASE_ID,
      BANK_ACCOUNTS_COLLECTION_ID,
      ID.unique(),
      accountData
    )

    return document as unknown as BankAccount
  } catch (error: any) {
    console.error('Error adding bank account:', error)
    return { error: error.message || 'Gagal menambah rekening bank.' }
  }
}

export async function getBankAccounts(
  branchId?: string
): Promise<BankAccount[]> {
  if (!branchId) return []
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      BANK_ACCOUNTS_COLLECTION_ID,
      [
        Query.equal('branchId', branchId),
        Query.orderDesc('isDefault'), // Tampilkan yang default di atas
        Query.orderAsc('bankName'),
      ]
    )
    return response.documents as unknown as BankAccount[]
  } catch (error: any) {
    console.error('Error fetching bank accounts:', error)
    return []
  }
}

export async function updateBankAccount(
  accountId: string,
  updates: Partial<BankAccountInput>
): Promise<BankAccount | { error: string }> {
  if (!accountId) return { error: 'ID Rekening tidak valid.' }

  try {
    // Logika untuk memastikan hanya ada satu default, sama seperti pada 'addBankAccount'
    if (updates.isDefault) {
      const accountToUpdate = await databases.getDocument(
        DATABASE_ID,
        BANK_ACCOUNTS_COLLECTION_ID,
        accountId
      )
      const branchId = accountToUpdate.branchId

      const existingDefaults = await databases.listDocuments(
        DATABASE_ID,
        BANK_ACCOUNTS_COLLECTION_ID,
        [
          Query.equal('branchId', branchId),
          Query.equal('isDefault', true),
          Query.notEqual('$id', accountId), // Kecualikan dokumen saat ini
        ]
      )
      for (const doc of existingDefaults.documents) {
        await databases.updateDocument(
          DATABASE_ID,
          BANK_ACCOUNTS_COLLECTION_ID,
          doc.$id,
          { isDefault: false }
        )
      }
    }

    const document = await databases.updateDocument(
      DATABASE_ID,
      BANK_ACCOUNTS_COLLECTION_ID,
      accountId,
      updates
    )
    return document as unknown as BankAccount
  } catch (error: any) {
    console.error('Error updating bank account:', error)
    return { error: error.message || 'Gagal memperbarui rekening.' }
  }
}

export async function deleteBankAccount(
  accountId: string
): Promise<void | { error: string }> {
  if (!accountId) return { error: 'ID Rekening tidak valid.' }
  try {
    // Di aplikasi nyata, Anda mungkin perlu memeriksa apakah rekening ini
    // masih tertaut dengan data lain sebelum menghapusnya.
    await databases.deleteDocument(
      DATABASE_ID,
      BANK_ACCOUNTS_COLLECTION_ID,
      accountId
    )
  } catch (error: any) {
    console.error('Error deleting bank account:', error)
    return { error: error.message || 'Gagal menghapus rekening bank.' }
  }
}
