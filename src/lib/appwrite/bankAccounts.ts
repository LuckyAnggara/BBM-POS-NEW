// src/lib/appwrite/bankAccounts.ts

import {
  databases,
  ID,
  Query,
  DATABASE_ID,
  BANK_ACCOUNTS_COLLECTION_ID,
} from './config'
import type { Models } from 'node-appwrite'

// --- Definisi Tipe Data ---

export interface BankAccount {
  id: string // dari $id
  branchId: string | null // Bisa null untuk rekening global
  bankName: string
  isActive: boolean
  accountNumber: string
  accountHolderName: string
  isDefault: boolean
  createdAt: string // dari $createdAt
}

export type BankAccountInput = Omit<BankAccount, 'id' | 'createdAt'>

// --- Fungsi Helper untuk Pemetaan Data ---
function mapDocumentToBankAccount(doc: Models.Document): BankAccount {
  return {
    id: doc.$id,
    branchId: doc.branchId,
    bankName: doc.bankName,
    isActive: doc.isActive,
    accountNumber: doc.accountNumber,
    accountHolderName: doc.accountHolderName,
    isDefault: doc.isDefault,
    createdAt: doc.$createdAt,
  }
}

// --- Fungsi Manajemen Rekening Bank ---

export async function addBankAccount(
  accountData: BankAccountInput
): Promise<BankAccount | { error: string }> {
  if (
    !accountData.bankName ||
    !accountData.accountNumber ||
    !accountData.accountHolderName
  ) {
    return { error: 'Nama bank, nomor rekening, dan nama pemilik wajib diisi.' }
  }

  try {
    // Jika rekening baru diatur sebagai default, nonaktifkan default lainnya
    if (accountData.isDefault && accountData.branchId) {
      const existingDefaults = await databases.listDocuments(
        DATABASE_ID,
        BANK_ACCOUNTS_COLLECTION_ID,
        [
          Query.equal('branchId', accountData.branchId),
          Query.equal('isDefault', true),
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

    const document = await databases.createDocument(
      DATABASE_ID,
      BANK_ACCOUNTS_COLLECTION_ID,
      ID.unique(),
      {
        ...accountData,
        branchId: accountData.branchId || null,
        isDefault: false, // Pastikan null jika tidak ada
      }
    )

    return mapDocumentToBankAccount(document)
  } catch (error: any) {
    console.error('Error adding bank account:', error)
    return { error: error.message || 'Gagal menambah rekening bank.' }
  }
}

export async function getBankAccounts(
  branchId?: string
): Promise<BankAccount[]> {
  try {
    // Mulai dengan query untuk pengurutan data, yang selalu ada.
    const queries = [Query.orderDesc('isDefault'), Query.orderAsc('bankName')]

    // Selanjutnya, tambahkan logika filter berdasarkan kondisi branchId.
    if (branchId) {
      // JIKA branchId ADA:
      // Kita butuh rekening untuk cabang ini ATAU rekening global.
      // Di sini kita aman menggunakan Query.or() karena ada dua kondisi.
      queries.unshift(
        // .unshift() menambahkan elemen ke awal array
        Query.or([Query.equal('branchId', branchId), Query.isNull('branchId')])
      )
    } else {
      // JIKA branchId TIDAK ADA:
      // Kita hanya butuh rekening global. Tidak perlu Query.or().
      queries.unshift(Query.isNull('branchId'))
    }

    // Panggil listDocuments dengan array query yang sudah dibangun secara dinamis.
    const response = await databases.listDocuments(
      DATABASE_ID,
      BANK_ACCOUNTS_COLLECTION_ID,
      queries
    )

    return response.documents.map(mapDocumentToBankAccount)
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
    // Logika untuk memastikan hanya ada satu default (sama seperti 'add')
    if (updates.isDefault && updates.branchId) {
      const existingDefaults = await databases.listDocuments(
        DATABASE_ID,
        BANK_ACCOUNTS_COLLECTION_ID,
        [
          Query.equal('branchId', updates.branchId),
          Query.equal('isDefault', true),
          Query.notEqual('$id', accountId),
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
    return mapDocumentToBankAccount(document)
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
