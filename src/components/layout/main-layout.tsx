
"use client";

import type { ReactNode } from "react";
import {
  SidebarProvider,
  Sidebar,
  
} from "@/components/ui/sidebar";
import AppHeader from "@/components/layout/app-header";
import AppSidebarNav from "@/components/layout/app-sidebar-nav";
import Breadcrumbs from "./breadcrumbs";

export default function MainLayout({ 
  children,
  focusMode = false 
}: { 
  children: ReactNode,
  focusMode?: boolean 
}) {
  if (focusMode) {
    return (
      <div className="min-h-screen bg-background w-full"> {/* Added w-full */}
        {/* SidebarProvider is still needed for potential nested components that might use useSidebar, even if sidebar is not visible */}
        <SidebarProvider defaultOpen={false}> 
          <main className="w-full h-screen overflow-y-auto">
            {children}
          </main>
        </SidebarProvider>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen w-full"> {/* Added w-full */}
        {/* <AppHeader /> */}
        <div className="flex h-screen w-full"> {/* Added w-full */}
          <Sidebar className="bg-card border-r hidden md:flex bg-sidebar-accent">
            <AppSidebarNav /> 
          </Sidebar>
          {/* 
            SidebarInset is removed and main content takes full width after sidebar.
            The main content padding and Breadcrumbs are now part of the page itself if needed.
          */}
          <main className="flex-1 w-full h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
         <Breadcrumbs />
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

