import type { Branch } from './types' // Kita bisa gunakan lagi tipe data ini untuk sementara
import {
  ID,
  databases,
  BRANCHES_COLLECTION_ID,
  DATABASE_ID,
  Query,
  Permission,
  Role,
} from './config'

export interface BranchInput extends Omit<Branch, 'id'> {}

export const listBranches = async (): Promise<Branch[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      BRANCHES_COLLECTION_ID,
      [
        Query.orderAsc('name'), // Pastikan Anda sudah membuat Index untuk atribut 'name'
      ]
    )

    // Map data dari format Appwrite ($id, dll) ke format tipe Branch kita
    return response.documents.map((doc) => ({
      id: doc.$id,
      name: doc.name,
      invoiceName: doc.invoiceName,
      currency: doc.currency,
      taxRate: doc.taxRate,
      address: doc.address,
      phoneNumber: doc.phoneNumber,
      transactionDeletionPassword: doc.transactionDeletionPassword,
      defaultReportPeriod: doc.defaultReportPeriod,
      printerPort: doc.printerPort,
    }))
  } catch (error) {
    console.error('Appwrite Error :: listBranches :: ', error)
    throw error
  }
}

// Mengambil satu data cabang berdasarkan ID-nya
export const getBranchById = async (
  branchId: string
): Promise<Branch | null> => {
  try {
    const doc = await databases.getDocument(
      DATABASE_ID,
      BRANCHES_COLLECTION_ID,
      branchId
    )

    return {
      id: doc.$id,
      name: doc.name,
      invoiceName: doc.invoiceName,
      currency: doc.currency,
      taxRate: doc.taxRate,
      address: doc.address,
      phoneNumber: doc.phoneNumber,
      transactionDeletionPassword: doc.transactionDeletionPassword,
      defaultReportPeriod: doc.defaultReportPeriod,
      printerPort: doc.printerPort,
    }
  } catch (error) {
    console.error('Appwrite Error :: getBranchById :: ', error)
    // Jika dokumen tidak ditemukan, Appwrite akan error, kita kembalikan null
    return null
  }
}

export const createBranch = async (
  branchData: Omit<Branch, 'id'>
): Promise<Branch> => {
  try {
    const newDoc = await databases.createDocument(
      DATABASE_ID,
      BRANCHES_COLLECTION_ID,
      ID.unique(), // Biarkan Appwrite membuat ID yang unik dan aman
      branchData
    )

    return {
      id: newDoc.$id,
      name: newDoc.name,
      invoiceName: newDoc.invoiceName,
      currency: newDoc.currency,
      taxRate: newDoc.taxRate,
      address: newDoc.address,
      phoneNumber: newDoc.phoneNumber,
      transactionDeletionPassword: newDoc.transactionDeletionPassword,
      defaultReportPeriod: newDoc.defaultReportPeriod,
      printerPort: newDoc.printerPort,
    }
  } catch (error) {
    console.error('Appwrite Error :: createBranch :: ', error)
    throw error
  }
}

// --- FUNGSI UPDATE ---
/**
 * Memperbarui dokumen cabang yang ada.
 * @param {string} branchId - ID dari cabang yang akan diperbarui.
 * @param {Partial<Omit<Branch, 'id'>>} dataToUpdate - Objek berisi data yang ingin diperbarui.
 * @returns {Promise<Branch>} Objek Branch yang sudah diperbarui.
 */
export const updateBranch = async (
  branchId: string,
  dataToUpdate: Partial<Omit<Branch, 'id'>>
): Promise<Branch> => {
  try {
    const updatedDoc = await databases.updateDocument(
      DATABASE_ID,
      BRANCHES_COLLECTION_ID,
      branchId,
      dataToUpdate
    )
    return {
      id: updatedDoc.$id,
      name: updatedDoc.name,
      invoiceName: updatedDoc.invoiceName,
      currency: updatedDoc.currency,
      taxRate: updatedDoc.taxRate,
      address: updatedDoc.address,
      phoneNumber: updatedDoc.phoneNumber,
      transactionDeletionPassword: updatedDoc.transactionDeletionPassword,
      defaultReportPeriod: updatedDoc.defaultReportPeriod,
      printerPort: updatedDoc.printerPort,
    }
  } catch (error) {
    console.error(`Appwrite Error :: updateBranch (ID: ${branchId}) :: `, error)
    throw error
  }
}

// --- FUNGSI DELETE ---
/**
 * Menghapus dokumen cabang dari database.
 * @param {string} branchId - ID dari cabang yang akan dihapus.
 * @returns {Promise<void>} Promise kosong yang selesai saat penghapusan berhasil.
 */
export const deleteBranch = async (branchId: string): Promise<void> => {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      BRANCHES_COLLECTION_ID,
      branchId
    )
  } catch (error) {
    console.error(`Appwrite Error :: deleteBranch (ID: ${branchId}) :: `, error)
    throw error
  }
}
