
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { getBranches as fetchBranchesFromDB } from '@/lib/firebase/firestore'; // Import Firestore function

export interface Branch {
  id: string;
  name: string;
}

interface BranchContextType {
  branches: Branch[];
  selectedBranch: Branch | null;
  setSelectedBranch: (branch: Branch | null) => void; // Allow null to deselect
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
      // Auto-select first branch if none is selected yet
      // Or re-select if current selectedBranch is no longer in fetchedBranches
      const currentSelectedStillExists = selectedBranch && fetchedBranches.find(b => b.id === selectedBranch.id);
      if (!currentSelectedStillExists) {
        setSelectedBranchState(fetchedBranches[0]);
      }
    } else if (fetchedBranches.length === 0) {
      setSelectedBranchState(null);
    }
    setLoadingBranches(false);
  };

  useEffect(() => {
    fetchBranches();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Fetch on initial mount

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
