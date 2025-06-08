
"use client";

import type { ReactNode } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarFooter,
} from "@/components/ui/sidebar";
import AppHeader from "@/components/layout/app-header";
import AppSidebarNav from "@/components/layout/app-sidebar-nav";
import Breadcrumbs from "./breadcrumbs";
import ProtectedRoute from "../auth/ProtectedRoute"; // Ensure this path is correct

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    // ProtectedRoute is now applied at each page level directly
    // So it's not needed here if all pages using MainLayout are individually protected
    <SidebarProvider defaultOpen>
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex h-screen pt-16">
          <Sidebar className="bg-card border-r hidden md:flex">
            <AppSidebarNav /> 
          </Sidebar>
          <SidebarInset>
            <main className="w-full h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
              <Breadcrumbs />
              {children}
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
