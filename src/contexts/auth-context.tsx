'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api' // Import api client kita
import { toast } from 'sonner'
import { User } from '@/lib/types'

interface AuthContextType {
  userData: User | null
  currentUser: User | null
  token: string | null
  login: (credentials: any) => Promise<void>
  logout: () => void
  isLoading: boolean
  isLoadingUserData: boolean
  register: (data: any) => Promise<void>
  // SaaS specific methods
  registerTenant: (data: any) => Promise<void>
  getCurrentTenant: () => Promise<any>
  isSuperAdmin: () => boolean
  isTenantAdmin: () => boolean
  isBranchUser: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userData, setUserData] = useState<User | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUserData, setIsLoadingUserData] = useState(true)
  const router = useRouter()

  // Cek status login saat komponen pertama kali dimuat
  useEffect(() => {
    const checkUserStatus = async () => {
      const storedToken = localStorage.getItem('authToken')
      if (storedToken) {
        setIsLoadingUserData(true)
        setToken(storedToken)
        try {
          // Ambil data user dari backend menggunakan token yang tersimpan
          const response = await api.get('/api/user')
          setUserData(response.data)
          setCurrentUser(response.data)
        } catch (error) {
          // Jika token tidak valid, hapus
          localStorage.removeItem('authToken')
          setToken(null)
          setUserData(null)
          setCurrentUser(null)
        } finally {
          setIsLoadingUserData(false)
        }
      } else {
        // Tidak ada token, langsung set loading ke false
        setIsLoadingUserData(false)
      }
    }
    checkUserStatus()
  }, [])

  // Helper functions for user types
  const isSuperAdmin = () => {
    return currentUser?.user_type === 'super_admin'
  }

  const isTenantAdmin = () => {
    return currentUser?.user_type === 'tenant_admin'
  }

  const isBranchUser = () => {
    return currentUser?.user_type === 'branch_user'
  }

  // Fungsi Login
  const login = async (credentials: any) => {
    try {
      setIsLoading(true)

      // 1. Panggil endpoint /sanctum/csrf-cookie
      await api.get('/sanctum/csrf-cookie')
      // 2. Kirim request login
      const response = await api.post('/api/login', credentials)

      // 3. Simpan token dan data user
      const { token: authToken, user: userData } = response.data

      localStorage.setItem('authToken', authToken)
      setToken(authToken)
      setUserData(userData)
      setCurrentUser(userData)

      // Redirect based on user type
      if (userData.user_type === 'super_admin') {
        router.push('/saas-admin/dashboard')
      } else {
        router.push('/dashboard')
      }
    } catch (error: any) {
      console.error('Login failed:', error)
      const errorMessage =
        error.response?.data?.message ||
        'Login failed. Please check your credentials.'
      toast.error(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Fungsi Register (legacy - for branch users)
  const register = async (data: any) => {
    try {
      // Asumsi pendaftaran default ke branch pertama
      const registrationData = { ...data, branch_id: 1 }

      const response = await api.post('/register', registrationData)

      const { token: authToken, user: userData } = response.data

      localStorage.setItem('authToken', authToken)
      setToken(authToken)
      setUserData(userData)

      toast.success('Registration successful!')
      router.push('/dashboard') // Arahkan ke dashboard
    } catch (error: any) {
      console.error('Registration failed:', error)
      const errorMessage =
        error.response?.data?.message ||
        'Registration failed. Please try again.'
      toast.error(errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Fungsi Register Tenant (SaaS)
  const registerTenant = async (data: any) => {
    try {
      setIsLoading(true)

      const response = await api.post('/api/tenant/register', data)

      if (response.data) {
        toast.success('Tenant registered successfully!', {
          description: 'You can now login with your admin credentials'
        })
        
        // Don't auto-login, redirect to login page
        router.push('/login?tenant_registered=true')
      }
    } catch (error: any) {
      console.error('Tenant registration failed:', error)
      const errorMessage =
        error.response?.data?.message ||
        'Tenant registration failed. Please try again.'
      
      // If there are validation errors, return them for the form to handle
      if (error.response?.data?.errors) {
        throw { message: errorMessage, errors: error.response.data.errors }
      }
      
      toast.error(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Get current tenant information
  const getCurrentTenant = async () => {
    try {
      const response = await api.get('/api/tenant/current')
      return response.data
    } catch (error: any) {
      console.error('Failed to get tenant info:', error)
      throw error
    }
  }

  // Fungsi Logout
  const logout = async () => {
    try {
      await api.post('/api/logout')
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      // Bersihkan state dan localStorage apapun hasilnya
      localStorage.removeItem('authToken')
      setToken(null)
      setUserData(null)
      setCurrentUser(null)
      router.push('/login')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        userData,
        currentUser,
        isLoadingUserData,
        token,
        login,
        logout,
        register,
        registerTenant,
        getCurrentTenant,
        isSuperAdmin,
        isTenantAdmin,
        isBranchUser,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
