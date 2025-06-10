
"use client";

import React from "react"; 
import Link from "next/link"; // Added Link
import { useBranch } from "@/contexts/branch-context";
import { useAuth } from "@/contexts/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, ChevronsUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function SidebarUserProfile() {
  const { branches, selectedBranch, setSelectedBranch, loadingBranches } = useBranch();
  const { currentUser, userData, signOut, loadingAuth, loadingUserData } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  const isLoading = loadingAuth || loadingUserData || loadingBranches;

  const userDisplayName = userData?.name || currentUser?.displayName || "Pengguna";
  const userDisplayRole = userData?.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : (isLoading ? "" : "N/A");
  const userAvatar = userData?.avatarUrl || currentUser?.photoURL || `https://placehold.co/40x40.png?text=${userDisplayName?.substring(0,1) || 'BW'}`;


  const assignedBranchName = React.useMemo(() => {
    if (isLoading || !userData || loadingBranches) return null;
    if (userData.role === 'admin') return null; 
    if (!userData.branchId) return "Belum ada cabang";
    const foundBranch = branches.find(b => b.id === userData.branchId);
    return foundBranch?.name || "ID Cabang tidak valid";
  }, [isLoading, userData, branches, loadingBranches]);


  return (
    <div className="p-3 space-y-2 border-t border-sidebar-border">
      {isLoading ? (
        <Skeleton className="h-9 w-full rounded-md" />
      ) : userData?.role === 'admin' ? (
        branches.length > 0 && (
          <Select
            value={selectedBranch?.id || ""}
            onValueChange={(branchId) => {
              const branch = branches.find(b => b.id === branchId);
              if (branch) setSelectedBranch(branch);
              else if (branchId === "") setSelectedBranch(null); 
            }}
            disabled={loadingBranches || (!selectedBranch && branches.length === 0)}
          >
            <SelectTrigger className="h-9 text-xs rounded-md w-full justify-between bg-sidebar-accent hover:bg-sidebar-accent/90 text-sidebar-accent-foreground">
              <SelectValue placeholder={loadingBranches ? "Memuat cabang..." : "Pilih Cabang"} />
            </SelectTrigger>
            <SelectContent>
              {branches.map(branch => (
                <SelectItem key={branch.id} value={branch.id} className="text-xs">
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      ) : (
        <div className="h-9 px-3 py-2 text-xs rounded-md w-full bg-sidebar-accent/50 text-sidebar-foreground/80 text-left truncate flex items-center">
          {loadingBranches ? <Skeleton className="h-4 w-24" /> : (assignedBranchName || "Memuat...")}
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-start h-auto px-2 py-1.5 text-left rounded-md hover:bg-sidebar-accent">
            <div className="flex items-center gap-2 w-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userAvatar} alt="User Avatar" data-ai-hint="person avatar" />
                <AvatarFallback>
                  {userDisplayName?.substring(0, 2).toUpperCase() || "BW"}
                </AvatarFallback>
              </Avatar>
              {isLoading ? ( 
                <div className="flex-grow space-y-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ) : (
                <div className="flex-grow">
                  <p className="text-xs font-medium text-sidebar-foreground leading-tight truncate">{userDisplayName}</p>
                  <p className="text-xs text-sidebar-foreground/70 leading-tight truncate">{userDisplayRole}</p>
                </div>
              )}
              <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/50 ml-auto shrink-0" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="w-56 mb-1 bg-popover text-popover-foreground">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-xs font-medium leading-none text-foreground">{userDisplayName}</p>
              <p className="text-xs leading-none text-muted-foreground">{userData?.email || currentUser?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-xs cursor-pointer" asChild>
            <Link href="/account">
              <User className="mr-2 h-3.5 w-3.5" />
              <span>Akun Saya</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs cursor-pointer" disabled>
            <Settings className="mr-2 h-3.5 w-3.5" />
            <span>Pengaturan (Segera)</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-xs cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            <span>Keluar</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
