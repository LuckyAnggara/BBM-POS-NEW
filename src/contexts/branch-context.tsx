
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { getBranches as fetchBranchesFromDB } from '@/lib/firebase/branches'; // Updated import
import { useAuth } from './auth-context'; // Import useAuth

export type ReportPeriodPreset = "thisMonth" | "thisWeek" | "today";

export interface Branch {
  id: string;
  name: string;
  currency?: string;
  taxRate?: number;
  invoiceName?: string;
  address?: string;
  phoneNumber?: string;
  transactionDeletionPassword?: string;
  defaultReportPeriod?: ReportPeriodPreset; // Added field
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
  const [selectedBranchState, setSelectedBranchStateInternal] = useState<Branch | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const { userData, loadingAuth, loadingUserData } = useAuth(); 

  const fetchBranches = async () => {
    setLoadingBranches(true);
    const fetchedBranches = await fetchBranchesFromDB();
    setBranches(fetchedBranches);
    setLoadingBranches(false);
    // Initial selection logic is now primarily handled in the useEffect below
    // to ensure it runs after userData is also available.
  };

  useEffect(() => {
    fetchBranches();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    if (loadingBranches || loadingAuth || loadingUserData) {
      return; 
    }

    let newSelectedBranch: Branch | null = null;

    if (userData?.role === 'cashier' && userData.branchId) {
      const assignedBranch = branches.find(b => b.id === userData.branchId);
      if (assignedBranch) {
        newSelectedBranch = assignedBranch;
      } else {
        console.error(
          `Cashier ${userData.uid} is assigned to branch ${userData.branchId}, but this branch was not found. Setting selected branch to null.`
        );
        newSelectedBranch = null;
      }
    } else if (userData?.role === 'admin') {
      // If admin and a branch is currently selected, try to keep it if it's still valid
      const currentSelectedIsValid = selectedBranchState && branches.find(b => b.id === selectedBranchState.id);
      if (currentSelectedIsValid) {
        newSelectedBranch = selectedBranchState; // Keep current selection
      } else if (branches.length > 0) {
        newSelectedBranch = branches[0]; // Default to first branch if current is invalid or none selected
      } else {
        newSelectedBranch = null; // No branches available
      }
    } else { // No user, or unassigned role
      newSelectedBranch = null;
    }

    // Only update if the determined newSelectedBranch is different from the current selectedBranchState
    if (selectedBranchState?.id !== newSelectedBranch?.id) {
      setSelectedBranchStateInternal(newSelectedBranch);
    }
    
  // Removed `selectedBranchState` from dependencies to prevent loops.
  // This effect determines the selected branch based on other states.
  }, [branches, userData, loadingBranches, loadingAuth, loadingUserData]);


  const setSelectedBranch = (branch: Branch | null) => {
    // This function is for manual selection by admin, allow it to override
    setSelectedBranchStateInternal(branch);
  };

  const value = useMemo(() => ({
    branches,
    selectedBranch: selectedBranchState,
    setSelectedBranch,
    loadingBranches,
    refreshBranches: fetchBranches,
  }), [branches, selectedBranchState, loadingBranches]); // fetchBranches is stable

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
