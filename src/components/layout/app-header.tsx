"use client";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Building } from "lucide-react";

export default function AppHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6 shadow-sm">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="h-8 w-8 md:h-7 md:w-7" />
        <Link href="/dashboard" className="flex items-center gap-2">
          <Building className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold font-headline">BranchWise</span>
        </Link>
      </div>
      {/* Branch selector and User Profile removed from here */}
    </header>
  );
}
