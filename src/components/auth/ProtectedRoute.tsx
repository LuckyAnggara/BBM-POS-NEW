
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Building } from "lucide-react";

const loadingMessagesProtected = [
  "Memverifikasi sesi Anda...",
  "Memastikan keamanan...",
  "Mengakses data terproteksi...",
  "Mohon tunggu sebentar...",
];

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessagesProtected.length);
    }, 2000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      if (pathname !== "/login" && pathname !== "/register") {
        router.push("/login");
      }
    }
  }, [currentUser, loadingAuth, router, pathname]);

  if (loadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Building className="h-16 w-16 text-primary animate-pulse mb-4" />
        <h1 className="text-2xl font-semibold font-headline mb-2">Berkah Baja Makmur</h1>
        <p className="text-sm text-muted-foreground transition-opacity duration-500">
          {loadingMessagesProtected[currentMessageIndex]}
        </p>
      </div>
    );
  }

  if (!currentUser && pathname !== "/login" && pathname !== "/register") {
    // This case should ideally be caught by the useEffect, but as a fallback
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Building className="h-16 w-16 text-primary animate-pulse mb-4" />
        <h1 className="text-2xl font-semibold font-headline mb-2">Berkah Baja Makmur</h1>
        <p className="text-sm text-muted-foreground">Mengarahkan ke halaman login...</p>
      </div>
    );
  }

  return <>{children}</>;
}
