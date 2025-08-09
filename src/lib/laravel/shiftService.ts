import api from '@/lib/api'
import type { Shift, ShiftEnding, ShiftInput } from '@/lib/types'

/**
 * Memulai shift baru untuk user yang sedang login.
 * @param {ShiftInput} data - Data modal awal dan ID cabang.
 * @returns {Promise<Shift>} Objek shift yang baru dibuat.
 */
export const startShift = async (data: ShiftInput): Promise<Shift> => {
  try {
    // Endpoint ini akan kita buat di Laravel
    const response = await api.post('/api/shifts/start', data)
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: startShift :: ', error)
    throw error
  }
}

/**
 * Mengakhiri shift yang sedang aktif untuk user yang login.
 * Backend akan otomatis menghitung semua total penjualan.
 * @returns {Promise<Shift>} Objek shift yang sudah ditutup dan diupdate.
 */
export const endShift = async (payload: ShiftEnding): Promise<Shift> => {
  try {
    // Endpoint ini juga akan kita buat
    const response = await api.post('/api/shifts/end', payload)
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: endShift :: ', error)
    throw error
  }
}

/**
 * Mendapatkan data shift yang sedang aktif untuk user yang login.
 * @returns {Promise<Shift | null>} Objek shift jika ada, jika tidak null.
 */
export const getActiveShift = async (): Promise<Shift | null> => {
  try {
    const response = await api.get('/api/shifts/active')
    return response.data
  } catch (error: any) {
    // Error 404 berarti tidak ada shift aktif, ini normal
    if (error.response?.status === 404) {
      return null
    }
    console.error('Laravel API Error :: getActiveShift :: ', error)
    throw error
  }
}

/**
 * Mengambil riwayat shift yang sudah ditutup.
 * @returns {Promise<any>} Data paginasi dari shift.
 */

export const listShiftHistory = async (params: {
  branchId: number
  page?: number
  limit?: number
  searchTerm?: string
  startDate?: Date
  endDate?: Date
}): Promise<any> => {
  try {
    const response = await api.get('/api/shifts', {
      params: {
        branch_id: params.branchId,
        page: params.page,
        limit: params.limit,
        search: params.searchTerm,
        start_date: params.startDate,
        end_date: params.endDate,
      },
    })
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: listShiftHistory :: ', error)
    throw error
  }
}
