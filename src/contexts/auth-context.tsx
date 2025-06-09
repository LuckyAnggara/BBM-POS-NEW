
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signOutUser as firebaseSignOutUser } from '@/lib/firebase/auth'; // auth.ts imports from users.ts now
import { Timestamp } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';
// getUserDocument will now be imported from users.ts by auth.ts

export interface UserData {
  uid: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  branchId: string | null;
  role: 'admin' | 'cashier' | string; 
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
  const [loadingAuth, setLoadingAuth] = useState(true); 
  const [loadingUserData, setLoadingUserData] = useState(false); 
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
    loadingUserData, 
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

    