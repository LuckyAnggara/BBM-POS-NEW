// FIREBASE CODE
// 'use client'

// import type { ReactNode } from 'react';
// import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'; // Added useCallback
// import type { User as FirebaseUser } from 'firebase/auth';
// import { onAuthStateChanged as firebaseOnAuthStateChanged, signOutUser as firebaseSignOutUser } from '@/lib/firebase/auth';
// import { Timestamp } from 'firebase/firestore';
// import { usePathname, useRouter } from 'next/navigation';
// import { getUserDocument } from "@/lib/firebase/users";
// import { auth } from '@/lib/firebase/config'; // For direct access to auth object

// export interface UserData {
//   uid: string;
//   name: string;
//   email: string;
//   avatarUrl: string | null;
//   branchId: string | null;
//   role: 'admin' | 'cashier' | string;
//   localPrinterUrl?: string | null; // Added for local printer URL
//   createdAt: Timestamp | null;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export function AuthProvider({ children }: { children: ReactNode }) {
//   const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
//   const [userData, setUserData] = useState<UserData | null>(null);
//   const [loadingAuth, setLoadingAuth] = useState(true);
//   const [loadingUserData, setLoadingUserData] = useState(false);
//   const router = useRouter();
//   const pathname = usePathname();

//   useEffect(() => {
//     const unsubscribe = firebaseOnAuthStateChanged((user, uData) => {
//       setCurrentUser(user);
//       setUserData(uData);
//       setLoadingAuth(false);
//     });
//     return () => unsubscribe();
//   }, []);

//   useEffect(() => {
//     if (!loadingAuth) {
//       if (currentUser && (pathname === '/login' || pathname === '/register')) {
//         router.push('/dashboard');
//       } else if (!currentUser && pathname !== '/login' && pathname !== '/register' && !pathname.startsWith('/_next')) {
//          if (pathname !== '/') {
//           router.push('/login');
//         }
//       }
//     }
//   }, [currentUser, loadingAuth, pathname, router]);

//   const signOut = async () => {
//     await firebaseSignOutUser();
//     setCurrentUser(null);
//     setUserData(null);
//     router.push('/login');
//   };

//   const refreshAuthContextState = useCallback(async () => {
//     const firebaseAuthUser = auth.currentUser;
//     if (firebaseAuthUser) {
//       setLoadingAuth(true);
//       setLoadingUserData(true);
//       try {
//         await firebaseAuthUser.reload();
//         const freshUserFromAuth = auth.currentUser;
//         if (freshUserFromAuth) {
//           const uData = await getUserDocument(freshUserFromAuth.uid);
//           setCurrentUser(freshUserFromAuth);
//           setUserData(uData);
//         } else {
//           setCurrentUser(null);
//           setUserData(null);
//         }
//       } catch (err) {
//         console.error("Error refreshing auth context state:", err);
//       } finally {
//         setLoadingAuth(false);
//         setLoadingUserData(false);
//       }
//     } else {
//       setCurrentUser(null);
//       setUserData(null);
//       setLoadingAuth(false);
//       setLoadingUserData(false);
//     }
//   }, []);

//   const value = useMemo(() => ({
//     currentUser,
//     userData,
//     loadingAuth,
//     loadingUserData,
//     signOut,
//     refreshAuthContextState,
//   }), [currentUser, userData, loadingAuth, loadingUserData, signOut, refreshAuthContextState]);

//   return (
//     <AuthContext.Provider value={value}>
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth(): AuthContextType {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// }

// APPWRITE CODE

'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import type { Models } from 'appwrite' // <-- GANTI: Impor tipe data dari Appwrite

// --- BAGIAN YANG BERUBAH ---
// Impor fungsi-fungsi dari file auth.ts Appwrite yang baru
import {
  loginWithEmail as appwriteLogin,
  registerWithEmail as appwriteRegister,
  logoutUser as appwriteLogout,
  getCurrentUser as appwriteGetCurrentUser,
} from '@/lib/appwrite/auth' // <-- GANTI: Path ke file Appwrite

// Impor fungsi untuk membuat/mendapatkan data user dari koleksi 'users'
import {
  getUserProfile,
  createUserProfile,
  UserRole,
} from '@/lib/appwrite/users' // <-- GANTI: Kita akan buat file ini setelah ini

// --- AKHIR BAGIAN YANG BERUBAH ---

import { UserData } from '@/lib/appwrite/types'

interface AuthContextType {
  currentUser: Models.User<Models.Preferences> | null
  userData: UserData | null
  loadingAuth: boolean
  loadingUserData: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] =
    useState<Models.User<Models.Preferences> | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [loadingUserData, setLoadingUserData] = useState(true)

  useEffect(() => {
    const checkUserStatus = async () => {
      setLoadingAuth(true)
      setLoadingUserData(true)
      try {
        // --- BAGIAN YANG BERUBAH ---
        // Logika onAuthStateChanged diganti dengan panggilan langsung
        const user = await appwriteGetCurrentUser()
        if (user) {
          setCurrentUser(user)
          // Ambil data tambahan dari koleksi 'users'
          const dbUserData = await getUserProfile(user.$id)
          setUserData(dbUserData || null)
          console.log('User data fetched:', dbUserData)
        } else {
          setCurrentUser(null)
          setUserData(null)
        }
        // --- AKHIR BAGIAN YANG BERUBAH ---
      } catch (error) {
        console.error('Failed to check user status:', error)
        setCurrentUser(null)
        setUserData(null)
      } finally {
        setLoadingAuth(false)
        setLoadingUserData(false)
      }
    }

    checkUserStatus()
  }, [])

  // --- BAGIAN YANG BERUBAH (SELURUH FUNGSI DI BAWAH INI) ---

  const login = async (email: string, password: string) => {
    setLoadingAuth(true)
    try {
      await appwriteLogin(email, password)
      const user = await appwriteGetCurrentUser()
      if (user) {
        setCurrentUser(user)
        const dbUserData = await getUserProfile(user.$id)
        setUserData(dbUserData || null)
      }
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    } finally {
      setLoadingAuth(false)
    }
  }

  const register = async (name: string, email: string, password: string) => {
    setLoadingAuth(true)
    try {
      const newUser = await appwriteRegister({ name, email, password })

      // Setelah user dibuat di Appwrite Auth, buat dokumen di koleksi 'users'
      // Import or define UserRole type and use it here
      // import type { UserRole } from '@/lib/appwrite/types'
      const userDocumentData = {
        name,
        email,
        role: 'cashier' as UserRole, // Default role, explicitly typed
        branchId: '', // Default branchId
      }
      await createUserProfile(newUser.$id, userDocumentData)

      // Langsung login setelah registrasi berhasil
      await login(email, password)
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    } finally {
      setLoadingAuth(false)
    }
  }

  const signOut = async () => {
    setLoadingAuth(true)
    try {
      await appwriteLogout()
      setCurrentUser(null)
      setUserData(null)
    } catch (error) {
      console.error('Logout failed:', error)
      throw error
    } finally {
      setLoadingAuth(false)
    }
  }

  // --- AKHIR BAGIAN YANG BERUBAH ---

  const value = {
    currentUser,
    userData,
    loadingAuth,
    loadingUserData,
    login,
    register,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
