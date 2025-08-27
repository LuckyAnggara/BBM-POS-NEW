'use client'

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
} from 'react'
import api from '@/lib/api' // Menggunakan API client kita
import { toast } from 'sonner'
import { Branch, Shift } from '@/lib/types'
import { useAuth } from './auth-context'
import { getActiveShift } from '@/lib/laravel/shiftService'
import { usePathname } from 'next/navigation'

// Tipe data untuk Context
interface BranchContextType {
  branches: Branch[]
  activeShiftSummary: Shift | null
  isLoadingBranches: boolean
  isLoadingBranch: boolean
  fetchBranches: () => Promise<void>
  getBranchById: (id: number) => Promise<Branch | null>
  selectedBranch: Branch | null
  createBranch: (data: Omit<Branch, 'id'>) => Promise<void>
  updateBranch: (id: string, data: Partial<Branch>) => Promise<void>
  deleteBranch: (id: number) => Promise<void>
  refreshBranches: () => void
}

const BranchContext = createContext<BranchContextType | undefined>(undefined)

export const BranchProvider = ({ children }: { children: ReactNode }) => {
  const [activeShiftSummary, setActiveShiftSummary] = useState<Shift | null>(
    null
  )
  const pathname = usePathname()
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoadingBranches, setIsLoadingBranches] = useState(true)
  const [isLoadingBranch, setIsLoadingBranch] = useState(false)
  const [loadingActiveShift, setLoadingActiveShift] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const { userData, isLoading: isLoadingUser } = useAuth() // Ambil status loadingBranches dari auth
  // Fungsi untuk mengambil semua data cabang dari backend
  const fetchBranches = useCallback(async () => {
    setIsLoadingBranches(true)
    try {
      const response = await api.get('/api/branches') // Ingat, pakai '/api'
      setBranches(response.data)

      if (userData?.branch_id) {
        const foundBranch = response.data.find(
          (branch: Branch) => branch.id === userData.branch_id
        )
        setSelectedBranch(foundBranch || null)
      }
    } catch (error) {
      toast.error('Failed to load branches.')
    } finally {
      setIsLoadingBranches(false)
    }
  }, [userData])

  const fetchActiveShift = useCallback(async () => {
    if (selectedBranch) {
      setLoadingActiveShift(true)
      try {
        const shift = await getActiveShift()
        setActiveShiftSummary(shift)
      } finally {
        setLoadingActiveShift(false)
      }
    } else {
      setActiveShiftSummary(null)
    }
  }, [selectedBranch, pathname])

  // useEffect untuk fetch branches
  useEffect(() => {
    // Hanya fetch jika proses auth selesai dan ada data user
    setIsLoadingBranches(true)
    if (!isLoadingUser && userData) {
      fetchBranches()
    } else if (!isLoadingUser && !userData) {
      // Jika proses auth selesai tapi tidak ada user, hentikan loadingBranches
      setIsLoadingBranches(false)
    }
  }, [userData, isLoadingUser, fetchBranches])

  // useEffect terpisah untuk fetch active shift ketika selectedBranch berubah
  useEffect(() => {
    fetchActiveShift()
  }, [fetchActiveShift])

  // Fungsi untuk mengambil satu cabang berdasarkan ID
  const getBranchById = async (id: number): Promise<Branch | null> => {
    setIsLoadingBranch(true)
    try {
      const response = await api.get(`/api/branches/${id}`)
      setSelectedBranch(response.data)
      return response.data
    } catch (error) {
      setSelectedBranch(null)
      return null
    } finally {
      setIsLoadingBranch(false)
    }
  }

  // Fungsi untuk membuat cabang baru
  const createBranch = async (data: Omit<Branch, 'id'>) => {
    setIsLoadingBranch(true)
    try {
      await api.post('/api/branches', data)
      toast.success('Branch created successfully!')
      await fetchBranches() // Muat ulang data setelah berhasil
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Failed to create branch.'
      toast.error(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoadingBranch(false)
    }
  }

  // Fungsi untuk memperbarui data cabang
  const updateBranch = async (id: string, data: Partial<Branch>) => {
    setIsLoadingBranches(true)
    try {
      await api.put(`/api/branches/${id}`, data)
      toast.success('Branch updated successfully!')
      await fetchBranches() // Muat ulang data setelah berhasil
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Failed to update branch.'
      toast.error(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoadingBranches(false)
    }
  }

  // Fungsi untuk menghapus cabang
  const deleteBranch = async (id: number) => {
    setIsLoadingBranches(true)
    try {
      await api.delete(`/api/branches/${id}`)
      toast.success('Branch deleted successfully!')
      setBranches((prev) => prev.filter((branch) => branch.id !== id)) // Hapus dari state
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Failed to delete branch.'
      toast.error(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoadingBranches(false)
    }
  }

  const refreshBranches = () => {
    fetchBranches()
  }

  const contextValue = {
    branches,
    activeShiftSummary,
    isLoadingBranches,
    isLoadingBranch,
    selectedBranch,
    fetchBranches,
    refreshBranches,
    getBranchById,
    createBranch,
    updateBranch,
    deleteBranch,
  }

  return (
    <BranchContext.Provider value={contextValue}>
      {children}
    </BranchContext.Provider>
  )
}

// Custom hook untuk menggunakan context
export const useBranches = () => {
  const context = useContext(BranchContext)
  if (context === undefined) {
    throw new Error('useBranches must be used within a BranchProvider')
  }
  return context
}
