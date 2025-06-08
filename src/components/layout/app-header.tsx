"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useBranch } from "@/contexts/branch-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, UserCircle, PanelLeft } from "lucide-react";

export default function AppHeader() {
  const { branches, selectedBranch, setSelectedBranch } = useBranch();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6 shadow-sm">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="h-8 w-8 md:h-7 md:w-7" /> {/* Use SidebarTrigger directly and pass className */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <Building className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold font-headline">BranchWise</span>
        </Link>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="min-w-[150px] sm:min-w-[200px]">
          {selectedBranch && branches.length > 0 && (
            <Select
              value={selectedBranch.id}
              onValueChange={(branchId) => {
                const branch = branches.find(b => b.id === branchId);
                if (branch) setSelectedBranch(branch);
              }}
            >
              <SelectTrigger className="h-9 text-sm rounded-md">
                <SelectValue placeholder="Select Branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id} className="text-sm">
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
          <UserCircle className="h-5 w-5" />
          <span className="sr-only">User Profile</span>
        </Button>
      </div>
    </header>
  );
}
