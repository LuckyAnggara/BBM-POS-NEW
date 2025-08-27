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

      router.push('/dashboard') // Arahkan ke dashboard setelah login
    } catch (error: any) {
      let description =
        'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.'
      if (error.response) {
        switch (error.response.status) {
          case 422: // user_unauthorized / general_unauthorized
            description =
              'Kombinasi email dan password salah. Mohon periksa kembali.'
            break
          case 429: // rate_limit_exceeded
            description =
              'Terlalu banyak percobaan login. Silakan tunggu beberapa saat.'
            break
          default:
            description = error.response.message // Gunakan pesan default dari Appwrite jika ada
            break
        }
      }

      throw new Error(description)
    } finally {
      setIsLoading(false)
    }
  }

  // Fungsi Register
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
