"use client";

import { useBranch } from "@/contexts/branch-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronsUpDown } from "lucide-react";

export default function SidebarUserProfile() {
  const { branches, selectedBranch, setSelectedBranch } = useBranch();

  return (
    <div className="p-3 space-y-2">
      {selectedBranch && branches.length > 0 && (
        <Select
          value={selectedBranch.id}
          onValueChange={(branchId) => {
            const branch = branches.find(b => b.id === branchId);
            if (branch) setSelectedBranch(branch);
          }}
        >
          <SelectTrigger className="h-9 text-xs rounded-md w-full justify-between">
            <SelectValue placeholder="Select Branch" />
            {/* Icon moved inside SelectTrigger by default in ShadCN */}
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
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" data-ai-hint="person avatar" />
          <AvatarFallback>BW</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xs font-medium text-foreground leading-tight">Admin User</p>
          <p className="text-xs text-muted-foreground leading-tight">admin@branchwise.co</p>
        </div>
      </div>
    </div>
  );
}
