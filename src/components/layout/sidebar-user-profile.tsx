"use client";

import { useBranch } from "@/contexts/branch-context";
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

export default function SidebarUserProfile() {
  const { branches, selectedBranch, setSelectedBranch } = useBranch();

  return (
    <div className="p-3 space-y-2 border-t border-sidebar-border">
      {selectedBranch && branches.length > 0 && (
        <Select
          value={selectedBranch.id}
          onValueChange={(branchId) => {
            const branch = branches.find(b => b.id === branchId);
            if (branch) setSelectedBranch(branch);
          }}
        >
          <SelectTrigger className="h-9 text-xs rounded-md w-full justify-between bg-sidebar-accent hover:bg-sidebar-accent/90 text-sidebar-accent-foreground">
            <SelectValue placeholder="Select Branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map(branch => (
              <SelectItem key={branch.id} value={branch.id} className="text-xs">
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-start h-auto px-2 py-1.5 text-left rounded-md hover:bg-sidebar-accent">
            <div className="flex items-center gap-2 w-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" data-ai-hint="person avatar" />
                <AvatarFallback>BW</AvatarFallback>
              </Avatar>
              <div className="flex-grow">
                <p className="text-xs font-medium text-sidebar-foreground leading-tight truncate">Admin User</p>
                <p className="text-xs text-sidebar-foreground/70 leading-tight truncate">admin@branchwise.co</p>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/50 ml-auto shrink-0" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="w-56 mb-1 bg-popover text-popover-foreground">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-xs font-medium leading-none text-foreground">Admin User</p>
              <p className="text-xs leading-none text-muted-foreground">admin@branchwise.co</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-xs cursor-pointer">
            <User className="mr-2 h-3.5 w-3.5" />
            <span>Account</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs cursor-pointer">
            <Settings className="mr-2 h-3.5 w-3.5" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-xs cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
            <LogOut className="mr-2 h-3.5 w-3.5" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
