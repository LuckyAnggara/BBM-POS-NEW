
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      // Allow access to login and register pages explicitly
      if (pathname !== "/login" && pathname !== "/register") {
        router.push("/login");
      }
    }
  }, [currentUser, loadingAuth, router, pathname]);

  if (loadingAuth) {
    return <div className="flex h-screen w-full items-center justify-center">Memuat sesi pengguna...</div>;
  }

  if (!currentUser && pathname !== "/login" && pathname !== "/register") {
    // This case should ideally be caught by the useEffect, but as a fallback
    return <div className="flex h-screen w-full items-center justify-center">Mengarahkan ke halaman login...</div>;
  }

  // If user is logged in, or if on login/register page (handled by those pages' logic for logged-in users)
  return <>{children}</>;
}
