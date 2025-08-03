import api from '@/lib/api' // Menggunakan API client axios kita
import { User, UserInput, UserRole } from '../types'

export const listUsers = async (params?: {
  branch_id?: number
}): Promise<User[]> => {
  try {
    const response = await api.get('/api/users', { params })
    // Jika backend mengembalikan data paginasi, ambil dari response.data.data
    // Jika tidak, langsung dari response.data
    return response.data.data || response.data
  } catch (error) {
    console.error('Laravel API Error :: listUsers :: ', error)
    throw error
  }
}

export const getUserById = async (userId: number): Promise<User | null> => {
  try {
    const response = await api.get(`/api/users/${userId}`)
    return response.data
  } catch (error) {
    console.error(`Laravel API Error :: getUserById (ID: ${userId}) :: `, error)
    return null
  }
}

export const createUser = async (
  userData: UserInput & { password_confirmation: string }
): Promise<User> => {
  try {
    const response = await api.post('/api/users', userData)
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: createUser :: ', error)
    throw error
  }
}

export const updateUser = async (
  userId: number,
  dataToUpdate: Partial<UserInput>
): Promise<User> => {
  try {
    const response = await api.put(`/api/users/${userId}`, dataToUpdate)
    return response.data
  } catch (error) {
    console.error(`Laravel API Error :: updateUser (ID: ${userId}) :: `, error)
    throw error
  }
}

export const deleteUser = async (userId: number): Promise<void> => {
  try {
    await api.delete(`/api/users/${userId}`)
  } catch (error) {
    console.error(`Laravel API Error :: deleteUser (ID: ${userId}) :: `, error)
    throw error
  }
}
