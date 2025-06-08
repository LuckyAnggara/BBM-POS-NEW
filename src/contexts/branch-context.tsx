"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo } from 'react';

export interface Branch {
  id: string;
  name: string;
}

interface BranchContextType {
  branches: Branch[];
  selectedBranch: Branch | null;
  setSelectedBranch: (branch: Branch) => void;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

const initialBranches: Branch[] = [
  { id: "branch1", name: "Main Street Branch" },
  { id: "branch2", name: "Downtown Branch" },
  { id: "branch3", name: "Westside Branch" },
];

export function BranchProvider({ children }: { children: ReactNode }) {
  const [selectedBranch, setSelectedBranchState] = useState<Branch | null>(initialBranches[0] || null);

  // Ensure setSelectedBranch is stable and updates state correctly
  const setSelectedBranch = (branch: Branch) => {
    setSelectedBranchState(branch);
  };
  
  const value = useMemo(() => ({
    branches: initialBranches,
    selectedBranch,
    setSelectedBranch,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [selectedBranch, initialBranches]); // branches is constant but included for completeness

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch(): BranchContextType {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
}
