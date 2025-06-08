
"use client"; // Needs to be a client component to use hooks

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function HomePage() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth) {
      if (currentUser) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [currentUser, loadingAuth, router]);

  // Display a loading indicator while auth state is being determined
  if (loadingAuth) {
    return <div className="flex h-screen items-center justify-center">Memuat aplikasi...</div>;
  }
  
  // Fallback content, though user should be redirected quickly.
  return <div className="flex h-screen items-center justify-center">Mengarahkan...</div>;
}
