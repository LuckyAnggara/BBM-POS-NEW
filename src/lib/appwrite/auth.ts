// src/lib/appwrite/auth.ts

import { account } from './config'
import { ID } from 'appwrite'
import type { Models } from 'appwrite'

// Tipe data untuk argumen registrasi agar lebih jelas
interface RegisterParams {
  email: string
  password?: string // Password is required for email/password, optional for OAuth
  name: string
}

// 1. FUNGSI REGISTRASI
// SEBELUM (Firebase): createUserWithEmailAndPassword(auth, email, password);
// SESUDAH (Appwrite):
export const registerWithEmail = async ({
  email,
  password,
  name,
}: RegisterParams): Promise<Models.User<Models.Preferences>> => {
  try {
    if (!password) {
      throw new Error('Password is required for email registration.')
    }
    // Argumen pertama adalah userId, kita gunakan ID.unique() agar Appwrite membuatnya
    const newUser = await account.create(ID.unique(), email, password, name)
    return newUser
  } catch (error) {
    console.error('Appwrite Error :: registerWithEmail :: ', error)
    throw error // Lemparkan error agar bisa ditangkap di UI
  }
}

// 2. FUNGSI LOGIN
// SEBELUM (Firebase): signInWithEmailAndPassword(auth, email, password);
// SESUDAH (Appwrite):
export const loginWithEmail = async (
  email: string,
  password: string
): Promise<Models.Session> => {
  try {
    const session = await account.createEmailPasswordSession(email, password)
    return session
  } catch (error) {
    console.error('Appwrite Error :: loginWithEmail :: ', error)
    throw error
  }
}

// 3. FUNGSI LOGOUT
// SEBELUM (Firebase): signOut(auth);
// SESUDAH (Appwrite):
export const logoutUser = async (): Promise<void> => {
  try {
    await account.deleteSession('current')
  } catch (error) {
    console.error('Appwrite Error :: logoutUser :: ', error)
    throw error
  }
}

// 4. FUNGSI MENDAPATKAN USER SAAT INI
// SEBELUM (Firebase): onAuthStateChanged(auth, callback);
// SESUDAH (Appwrite):
export const getCurrentUser =
  async (): Promise<Models.User<Models.Preferences> | null> => {
    try {
      return await account.get()
    } catch (error) {
      // Error "401" berarti tidak ada sesi/session, ini normal jika user belum login.
      // Jadi kita tidak perlu log error ini ke konsol.
      return null
    }
  }
