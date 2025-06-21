
"use client";

import {  type ReactNode } from "react";

// import AppHeader from "@/components/layout/app-header";
// import AppSidebarNav from "@/components/layout/app-sidebar-nav";
// import Breadcrumbs from "./breadcrumbs";

import { AppSidebar } from "@/components/layout/app-sidebar"
import { ChartAreaInteractive } from "@/components/layout/chart-area-interactive"
import { DataTable } from "@/components/layout/data-table"
import { SectionCards } from "@/components/layout/section-cards"
import { SiteHeader } from "@/components/layout/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"


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
          <main className="flex flex-1 flex-col">
            {children}
          </main>
        </SidebarProvider>
      </div>
    );
  }

  return (
     <SidebarProvider

    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Props" />
        
         <main className="flex-1 w-full h-full p-4 sm:p-6 lg:p-8">
         {/* <Breadcrumbs /> */}
            {children}
          </main>
         </SidebarInset>
    </SidebarProvider>
   
  );
}

