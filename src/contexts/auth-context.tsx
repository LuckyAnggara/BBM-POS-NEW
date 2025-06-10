
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'; // Added useCallback
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged as firebaseOnAuthStateChanged, signOutUser as firebaseSignOutUser } from '@/lib/firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';
import { getUserDocument } from "@/lib/firebase/users";
import { auth } from '@/lib/firebase/config'; // For direct access to auth object

export interface UserData {
  uid: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  branchId: string | null;
  role: 'admin' | 'cashier' | string;
  localPrinterUrl?: string | null; // Added for local printer URL
  createdAt: Timestamp | null;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: UserData | null;
  loadingAuth: boolean;
  loadingUserData: boolean;
  signOut: () => Promise<void>;
  refreshAuthContextState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = firebaseOnAuthStateChanged((user, uData) => {
      setCurrentUser(user);
      setUserData(uData);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loadingAuth) {
      if (currentUser && (pathname === '/login' || pathname === '/register')) {
        router.push('/dashboard');
      } else if (!currentUser && pathname !== '/login' && pathname !== '/register' && !pathname.startsWith('/_next')) {
         if (pathname !== '/') {
          router.push('/login');
        }
      }
    }
  }, [currentUser, loadingAuth, pathname, router]);

  const signOut = async () => {
    await firebaseSignOutUser();
    setCurrentUser(null);
    setUserData(null);
    router.push('/login');
  };

  const refreshAuthContextState = useCallback(async () => {
    const firebaseAuthUser = auth.currentUser;
    if (firebaseAuthUser) {
      setLoadingAuth(true);
      setLoadingUserData(true);
      try {
        await firebaseAuthUser.reload();
        const freshUserFromAuth = auth.currentUser;
        if (freshUserFromAuth) {
          const uData = await getUserDocument(freshUserFromAuth.uid);
          setCurrentUser(freshUserFromAuth);
          setUserData(uData);
        } else {
          setCurrentUser(null);
          setUserData(null);
        }
      } catch (err) {
        console.error("Error refreshing auth context state:", err);
      } finally {
        setLoadingAuth(false);
        setLoadingUserData(false);
      }
    } else {
      setCurrentUser(null);
      setUserData(null);
      setLoadingAuth(false);
      setLoadingUserData(false);
    }
  }, []);

  const value = useMemo(() => ({
    currentUser,
    userData,
    loadingAuth,
    loadingUserData,
    signOut,
    refreshAuthContextState,
  }), [currentUser, userData, loadingAuth, loadingUserData, signOut, refreshAuthContextState]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
