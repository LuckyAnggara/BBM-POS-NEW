"use client";

import type { ReactNode } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
} from "@/components/ui/sidebar";
import AppHeader from "@/components/layout/app-header";
import AppSidebarNav from "@/components/layout/app-sidebar-nav";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex h-screen pt-16">
          <Sidebar className="bg-card border-r hidden md:flex"> {/* Hidden on mobile, flex on md and up */}
            <SidebarContent className="p-0"> {/* Remove default padding if AppSidebarNav handles it */}
              <AppSidebarNav />
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <main className="w-full h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
              {children}
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
