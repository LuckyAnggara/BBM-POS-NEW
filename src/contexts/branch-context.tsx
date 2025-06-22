// src/contexts/branch-context.tsx

'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react'
import { useAuth } from './auth-context'
// Ganti impor ke fungsi Appwrite yang baru
import { listBranches, getBranchById } from '@/lib/appwrite/branches'
// Pastikan path ke tipe data Branch sudah benar
import type { Branch } from '@/lib/appwrite/types'

interface BranchContextType {
  branches: Branch[]
  selectedBranch: Branch | null
  setSelectedBranchId: (branchId: string | null) => void
  loadingBranches: boolean
  refreshBranches: () => void
}

const BranchContext = createContext<BranchContextType | undefined>(undefined)

export const BranchProvider = ({ children }: { children: ReactNode }) => {
  const { userData, loadingAuth: authLoading } = useAuth() // Ambil status loadingBranches dari auth
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [loadingBranches, setLoadingBranches] = useState(true)

  const fetchAndSetBranches = useCallback(async () => {
    if (!userData) return // Jangan lakukan apa-apa jika tidak ada data user

    setLoadingBranches(true)
    try {
      const fetchedBranches = await listBranches() // Panggil fungsi Appwrite
      setBranches(fetchedBranches)

      if (fetchedBranches.length > 0) {
        const storedBranchId = localStorage.getItem('selectedBranchId')
        const userBranchId = userData?.branchId

        let branchIdToSelect: string | null = null

        // Prioritas 1: Branch yang tersimpan di localStorage (jika masih valid)
        if (
          storedBranchId &&
          fetchedBranches.some((b) => b.id === storedBranchId)
        ) {
          branchIdToSelect = storedBranchId
        }
        // Prioritas 2: Branch bawaan dari data user
        else if (
          userBranchId &&
          fetchedBranches.some((b) => b.id === userBranchId)
        ) {
          branchIdToSelect = userBranchId
        }
        // Prioritas 3: Branch pertama dari daftar
        else {
          branchIdToSelect = fetchedBranches[0].id
        }

        if (branchIdToSelect) {
          const branchDetails = await getBranchById(branchIdToSelect)
          setSelectedBranch(branchDetails)
          localStorage.setItem('selectedBranchId', branchIdToSelect)
        }
      } else {
        // Jika tidak ada cabang sama sekali
        setSelectedBranch(null)
        localStorage.removeItem('selectedBranchId')
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error)
      setBranches([]) // Kosongkan jika ada error
    } finally {
      setLoadingBranches(false)
    }
  }, [userData]) // useCallback bergantung pada userData

  useEffect(() => {
    // Hanya fetch jika proses auth selesai dan ada data user
    if (!authLoading && userData) {
      fetchAndSetBranches()
    } else if (!authLoading && !userData) {
      // Jika proses auth selesai tapi tidak ada user, hentikan loadingBranches
      setLoadingBranches(false)
    }
  }, [userData, authLoading, fetchAndSetBranches])

  const setSelectedBranchId = (branchId: string | null) => {
    if (branchId) {
      const branch = branches.find((b) => b.id === branchId)
      if (branch) {
        console.log('Selected branch:', branch)
        localStorage.setItem('selectedBranchId', branch.id)
        setSelectedBranch(branch)
      }
    } else {
      setSelectedBranch(null)
      localStorage.removeItem('selectedBranchId')
    }
  }

  const refreshBranches = () => {
    fetchAndSetBranches()
  }

  const value = {
    branches,
    selectedBranch,
    setSelectedBranch,
    setSelectedBranchId,
    loadingBranches,
    refreshBranches,
  }

  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  )
}

export const useBranch = () => {
  const context = useContext(BranchContext)
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider')
  }
  return context
}
