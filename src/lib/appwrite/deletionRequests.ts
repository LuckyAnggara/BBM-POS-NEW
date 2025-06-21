// src/lib/appwrite/deletionRequests.ts

import {
  databases,
  ID,
  Query,
  DATABASE_ID,
  DELETION_REQUESTS_COLLECTION_ID,
} from './config'

// --- Definisi Tipe Data ---

export type DeletionRequestStatus = 'pending' | 'approved' | 'rejected'

export interface DeletionRequest {
  id: string // dari $id
  userId: string
  userName: string // Denormalisasi untuk kemudahan admin
  userEmail: string // Denormalisasi untuk kemudahan admin
  reason: string
  status: DeletionRequestStatus
  requestedAt: string // dari $createdAt
  processedAt?: string // ISO String, diisi saat diproses
  processedBy?: string // Admin User ID
}

export type DeletionRequestInput = Omit<
  DeletionRequest,
  'id' | 'requestedAt' | 'processedAt' | 'processedBy' | 'status'
>

// --- Fungsi untuk Pengguna ---

export async function requestAccountDeletion(
  requestData: DeletionRequestInput
): Promise<DeletionRequest | { error: string }> {
  try {
    // Cek apakah pengguna sudah punya permintaan yang pending
    const existingRequest = await databases.listDocuments(
      DATABASE_ID,
      DELETION_REQUESTS_COLLECTION_ID,
      [
        Query.equal('userId', requestData.userId),
        Query.equal('status', 'pending'),
      ]
    )

    if (existingRequest.total > 0) {
      return {
        error:
          'Anda sudah memiliki permintaan penghapusan akun yang sedang diproses.',
      }
    }

    const dataToSave = {
      ...requestData,
      status: 'pending' as const,
    }

    const document = await databases.createDocument(
      DATABASE_ID,
      DELETION_REQUESTS_COLLECTION_ID,
      ID.unique(),
      dataToSave
    )

    return document as unknown as DeletionRequest
  } catch (error: any) {
    console.error('Error requesting account deletion:', error)
    return {
      error: error.message || 'Gagal mengirim permintaan penghapusan akun.',
    }
  }
}

// --- Fungsi untuk Admin ---

export async function getDeletionRequests(
  status: DeletionRequestStatus
): Promise<DeletionRequest[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      DELETION_REQUESTS_COLLECTION_ID,
      [Query.equal('status', status), Query.orderDesc('$createdAt')]
    )
    return response.documents as unknown as DeletionRequest[]
  } catch (error: any) {
    console.error(`Error fetching ${status} deletion requests:`, error)
    return []
  }
}

/**
 * PENTING: Proses Penghapusan Sebenarnya HARUS Menggunakan Appwrite Function
 * --------------------------------------------------------------------------
 * Saat admin menyetujui (`approve`) permintaan, proses penghapusan semua data pengguna
 * adalah operasi yang destruktif dan kompleks. Ini TIDAK BOLEH dilakukan dari klien.
 *
 * Alur Kerja yang Direkomendasikan:
 * 1. Admin memanggil `processDeletionRequest` dengan status 'approved'.
 * 2. Fungsi ini hanya memperbarui status dokumen permintaan.
 * 3. Anda harus mengatur Appwrite Function (misalnya, 'deleteUserData') yang terpicu
 * saat sebuah dokumen di koleksi `deletionRequests` statusnya berubah menjadi 'approved'.
 * (Ini bisa menggunakan webhook atau pemicu event Appwrite).
 * 4. Appwrite Function 'deleteUserData' kemudian akan:
 * a. Mengambil userId dari dokumen permintaan.
 * b. Menghapus semua dokumen yang terkait dengan userId tersebut dari SEMUA koleksi lain
 * (transaksi, pelanggan, shift, inventaris, dll.).
 * c. Terakhir, menghapus pengguna dari layanan Appwrite Authentication (`users.delete(userId)`).
 */
export async function processDeletionRequest(
  requestId: string,
  adminUserId: string,
  status: 'approved' | 'rejected'
): Promise<void | { error: string }> {
  if (!requestId || !adminUserId)
    return { error: 'ID Permintaan dan ID Admin diperlukan.' }
  try {
    const updates = {
      status,
      processedBy: adminUserId,
      processedAt: new Date().toISOString(),
    }

    await databases.updateDocument(
      DATABASE_ID,
      DELETION_REQUESTS_COLLECTION_ID,
      requestId,
      updates
    )

    // Jika disetujui, pemicu untuk Appwrite Function akan berjalan di sini.
    if (status === 'approved') {
      console.log(
        `Deletion request ${requestId} approved. Triggering backend function to delete user data.`
      )
      // Di sini Anda akan memanggil Appwrite Function, misal:
      // await functions.createExecution('functionId-deleteUserData', JSON.stringify({ requestId }));
    }
  } catch (error: any) {
    console.error('Error processing deletion request:', error)
    return { error: error.message || 'Gagal memproses permintaan.' }
  }
}
