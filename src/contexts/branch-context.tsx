
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { getBranches as fetchBranchesFromDB } from '@/lib/firebase/branches'; // Updated import

export interface Branch {
  id: string;
  name: string;
  currency?: string;
  taxRate?: number; 
  invoiceName?: string;
  address?: string;
  phoneNumber?: string;
  transactionDeletionPassword?: string; 
}

interface BranchContextType {
  branches: Branch[];
  selectedBranch: Branch | null;
  setSelectedBranch: (branch: Branch | null) => void; 
  loadingBranches: boolean;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranchState] = useState<Branch | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(true);

  const fetchBranches = async () => {
    setLoadingBranches(true);
    const fetchedBranches = await fetchBranchesFromDB();
    setBranches(fetchedBranches);
    if (fetchedBranches.length > 0 && !selectedBranch) {
      const currentSelectedStillExists = selectedBranch && fetchedBranches.find(b => b.id === selectedBranch.id);
      if (!currentSelectedStillExists) {
        setSelectedBranchState(fetchedBranches[0]);
      } else if (currentSelectedStillExists) {
        setSelectedBranchState(currentSelectedStillExists);
      }
    } else if (fetchedBranches.length === 0) {
      setSelectedBranchState(null);
    }
    setLoadingBranches(false);
  };

  useEffect(() => {
    fetchBranches();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const setSelectedBranch = (branch: Branch | null) => {
    setSelectedBranchState(branch);
  };
  
  const value = useMemo(() => ({
    branches,
    selectedBranch,
    setSelectedBranch,
    loadingBranches,
    refreshBranches: fetchBranches,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [branches, selectedBranch, loadingBranches]);

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

    