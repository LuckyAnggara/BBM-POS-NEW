
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
  const [selectedBranch, setSelectedBranchState] = useState<Branch | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const { userData, loadingAuth, loadingUserData } = useAuth(); // Get user data and loading states

  const fetchBranches = async () => {
    setLoadingBranches(true);
    const fetchedBranches = await fetchBranchesFromDB();
    setBranches(fetchedBranches);
    // Initial default selection logic for admin or if userData is not yet ready
    // This might be overridden by the useEffect below once userData is loaded
    if (fetchedBranches.length > 0) {
        if (!selectedBranch || !fetchedBranches.find(b => b.id === selectedBranch.id)) {
             // If no branch is selected, or the current selected one is not in the new list,
             // and if the user is not a cashier (or userData isn't loaded yet), default to first.
             // Cashier selection will be handled by the useEffect reacting to userData.
            if (!userData || userData.role !== 'cashier') {
                 setSelectedBranchState(fetchedBranches[0]);
            }
        } else {
            // Refresh data of currently selected branch if it still exists
            const updatedSelected = fetchedBranches.find(b => b.id === selectedBranch.id);
            if (updatedSelected) {
                setSelectedBranchState(updatedSelected);
            }
        }
    } else {
      setSelectedBranchState(null);
    }
    setLoadingBranches(false);
  };

  useEffect(() => {
    fetchBranches();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initial fetch of all branches

  useEffect(() => {
    // This effect ensures the correct branch is selected based on user role and assignment
    // once all necessary data (branches, userData) is loaded.
    if (loadingBranches || loadingAuth || loadingUserData) {
      return; // Wait for all data to load
    }

    if (userData?.role === 'cashier' && userData.branchId) {
      const assignedBranch = branches.find(b => b.id === userData.branchId);
      if (assignedBranch) {
        if (selectedBranch?.id !== assignedBranch.id) {
          setSelectedBranchState(assignedBranch);
        }
      } else {
        console.error(
          `Cashier ${userData.uid} is assigned to branch ${userData.branchId}, but this branch was not found. Setting selected branch to null.`
        );
        setSelectedBranchState(null);
      }
    } else if (userData?.role === 'admin') {
      // For admin, if no branch is selected or the selected one is invalid,
      // and there are branches available, default to the first one.
      // Otherwise, their manual selection (via SidebarUserProfile) is respected.
      const currentSelectedIsValid = selectedBranch && branches.find(b => b.id === selectedBranch.id);
      if ((!selectedBranch || !currentSelectedIsValid) && branches.length > 0) {
        setSelectedBranchState(branches[0]);
      } else if (branches.length === 0) {
        setSelectedBranchState(null);
      }
    } else if (!userData) {
        // No user logged in, or role is not admin/cashier, or cashier without branchId
        // If not admin and not a cashier with an assigned branch, and a branch is somehow selected, clear it.
        // Or, if admin had a selection but logged out, it should clear.
        // However, if admin is the role, the above block handles it.
        // This mainly handles logout or unassigned roles.
         if (selectedBranch !== null && userData?.role !== 'admin') { // Clear if not admin and something is selected
            // This might be too aggressive if an admin has a branch selected then logs out
            // The existing logic in fetchBranches might already handle setting to branches[0] or null
            // Let's primarily ensure cashier logic is tight.
         }
         // If no branches, selectedBranch should be null.
         if(branches.length === 0) {
            setSelectedBranchState(null);
         } else if (!selectedBranch && userData?.role !== 'cashier' && branches.length > 0) {
            // If nothing is selected (e.g. first load as admin), select the first.
            // This condition might overlap with the admin block, ensure it's complementary.
            // The admin block already handles setting branches[0] if nothing is selected and branches exist.
         }
    }
  // Add selectedBranch to dependency array to re-evaluate if it changes externally,
  // but primarily this reacts to branches and userData loading/changing.
  }, [branches, userData, loadingBranches, loadingAuth, loadingUserData, selectedBranch]);


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
  }), [branches, selectedBranch, loadingBranches]); // Removed fetchBranches from here, as it's stable.

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
