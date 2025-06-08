
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signOutUser as firebaseSignOutUser } from '@/lib/firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';

export interface UserData {
  uid: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  branchId: string | null;
  role: 'admin' | 'cashier' | string; // string for flexibility if more roles added
  createdAt: Timestamp | null;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: UserData | null;
  loadingAuth: boolean;
  loadingUserData: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true); // For initial auth state check
  const [loadingUserData, setLoadingUserData] = useState(false); // For fetching user data after auth
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (user, uData) => {
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
        // Allow access to root page for initial redirect logic
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
  
  const value = useMemo(() => ({
    currentUser,
    userData,
    loadingAuth,
    loadingUserData, // This might need more granular control if data fetch is separate
    signOut,
  }), [currentUser, userData, loadingAuth, loadingUserData, signOut]);

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
