// src/lib/appwrite/users.ts

import { databases, Query, DATABASE_ID, USERS_COLLECTION_ID } from './config'

// --- Definisi Tipe Data ---

export type UserRole = 'owner' | 'manager' | 'cashier' | 'staff'

export interface UserProfile {
  id: string // HARUS sama dengan Appwrite Auth User ID ($id)
  name: string
  email: string
  role: UserRole
  branchId?: string // ID cabang tempat pengguna ditugaskan
  branchName?: string // Denormalisasi nama cabang
  isActive: boolean
  createdAt: string // dari $createdAt
}

// Tipe untuk membuat profil pengguna baru.
// id, name, dan email biasanya didapat dari objek Appwrite Account.
export type UserProfileInput = Omit<UserProfile, 'id' | 'createdAt'>

// --- Fungsi Manajemen Profil Pengguna ---

/**
 * Membuat dokumen profil untuk pengguna baru.
 * Fungsi ini harus dipanggil setelah pengguna berhasil dibuat di Appwrite Authentication.
 * @param userId - ID dari Appwrite Account ($id). Ini akan digunakan sebagai ID dokumen.
 * @param profileData - Data profil pengguna.
 */
export async function createUserProfile(
  userId: string,
  profileData: Omit<UserProfileInput, 'isActive'>
): Promise<UserProfile | { error: string }> {
  if (!userId) return { error: 'User ID dari layanan otentikasi diperlukan.' }

  try {
    const dataToSave = {
      ...profileData,
      isActive: true, // Pengguna baru selalu aktif secara default
    }

    // Kita menggunakan `userId` dari Appwrite Auth sebagai ID dokumen di sini.
    // Ini menciptakan hubungan 1-ke-1 yang kuat antara data auth dan data profil.
    const document = await databases.createDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId,
      dataToSave
    )

    // Memetakan kembali properti untuk konsistensi, terutama $id ke id
    return {
      id: document.$id,
      name: document.name,
      email: document.email,
      role: document.role,
      branchId: document.branchId,
      branchName: document.branchName,
      isActive: document.isActive,
      createdAt: document.$createdAt,
    }
  } catch (error: any) {
    console.error('Error creating user profile:', error)
    // Error 409 berarti dokumen dengan ID tersebut sudah ada
    if (error.code === 409) {
      return { error: 'Profil untuk pengguna ini sudah ada.' }
    }
    return { error: error.message || 'Gagal membuat profil pengguna.' }
  }
}

/**
 * Mengambil profil pengguna dari koleksi 'users'.
 * @param userId - ID pengguna, sama dengan Appwrite Auth User ID.
 */
export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  if (!userId) return null
  try {
    const document = await databases.getDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId
    )
    return {
      id: document.$id,
      name: document.name,
      email: document.email,
      role: document.role,
      branchId: document.branchId,
      branchName: document.branchName,
      isActive: document.isActive,
      createdAt: document.$createdAt,
    }
  } catch (error: any) {
    // Error 404 (Not Found) adalah normal jika profil belum dibuat, jadi kita kembalikan null.
    if (error.code !== 404) {
      console.error(`Error fetching user profile for ${userId}:`, error)
    }
    return null
  }
}

/**
 * Mengambil semua pengguna yang terdaftar di sebuah cabang.
 * @param branchId - ID cabang yang ingin dicari.
 */
export async function getUsersByBranch(
  branchId: string
): Promise<UserProfile[]> {
  if (!branchId) return []
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('branchId', branchId), Query.orderAsc('name')]
    )

    return response.documents.map((doc) => ({
      id: doc.$id,
      name: doc.name,
      email: doc.email,
      role: doc.role,
      branchId: doc.branchId,
      branchName: doc.branchName,
      isActive: doc.isActive,
      createdAt: doc.$createdAt,
    }))
  } catch (error: any) {
    console.error(`Error fetching users for branch ${branchId}:`, error)
    return []
  }
}

/**
 * Memperbarui data profil pengguna.
 * @param userId - ID pengguna yang akan diperbarui.
 * @param updates - Data yang ingin diperbarui.
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfileInput>
): Promise<void | { error: string }> {
  if (!userId) return { error: 'ID Pengguna tidak valid.' }
  try {
    await databases.updateDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId,
      updates
    )
  } catch (error: any) {
    console.error('Error updating user profile:', error)
    return { error: 'Gagal memperbarui profil pengguna.' }
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    // Query ini tidak memiliki filter branchId, jadi akan mengambil semua pengguna
    const response = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [
        Query.orderAsc('name'), // Urutkan berdasarkan nama
      ]
    )

    return response.documents.map((doc) => ({
      id: doc.$id,
      name: doc.name,
      email: doc.email,
      role: doc.role,
      branchId: doc.branchId,
      branchName: doc.branchName,
      isActive: doc.isActive,
      createdAt: doc.$createdAt,
    }))
  } catch (error: any) {
    console.error(`Error fetching all users:`, error)
    return []
  }
}
