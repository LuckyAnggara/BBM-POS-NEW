"use client";

import type { ReactNode } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarFooter, // Added for structure if needed by AppSidebarNav internal fixed footer
} from "@/components/ui/sidebar";
import AppHeader from "@/components/layout/app-header";
import AppSidebarNav from "@/components/layout/app-sidebar-nav";
import Breadcrumbs from "./breadcrumbs"; // Import Breadcrumbs

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex h-screen pt-16">
          <Sidebar className="bg-card border-r hidden md:flex">
            <AppSidebarNav /> 
          </Sidebar>
          <SidebarInset>
            <main className="w-full h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
              <Breadcrumbs /> {/* Add Breadcrumbs here */}
              {children}
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
