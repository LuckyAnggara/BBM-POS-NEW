import api from '../api'
import {
  StockOpnameSession,
  StockOpnameItem,
  StockOpnameStatus,
} from '../types'

export interface CreateStockOpnamePayload {
  notes?: string
}
export interface AddItemPayload {
  product_id: number
  counted_quantity: number
  notes?: string
}

export const listStockOpname = async (options?: {
  status?: StockOpnameStatus | 'all'
  per_page?: number
  page?: number
}): Promise<StockOpnameSession[]> => {
  const { status, per_page, page } = options || {}
  const params: any = {}
  if (status && status !== 'all') params.status = status
  if (per_page) params.per_page = per_page
  if (page) params.page = page
  const res = await api.get('/api/stock-opname', { params })
  return res.data.data || res.data
}

export const createStockOpname = async (
  payload: CreateStockOpnamePayload
): Promise<StockOpnameSession> => {
  const res = await api.post('/api/stock-opname', payload)
  return res.data
}

export const getStockOpname = async (
  id: number
): Promise<StockOpnameSession> => {
  const res = await api.get(`/api/stock-opname/${id}`)
  return res.data
}

export const updateStockOpname = async (
  id: number,
  payload: Partial<CreateStockOpnamePayload>
): Promise<StockOpnameSession> => {
  const res = await api.put(`/api/stock-opname/${id}`, payload)
  return res.data
}

export const addItem = async (
  sessionId: number,
  payload: AddItemPayload
): Promise<StockOpnameItem> => {
  const res = await api.post(`/api/stock-opname/${sessionId}/items`, payload)
  return res.data
}

export const removeItem = async (
  sessionId: number,
  itemId: number
): Promise<void> => {
  await api.delete(`/api/stock-opname/${sessionId}/items/${itemId}`)
}

export const submitStockOpname = async (
  id: number
): Promise<StockOpnameSession> => {
  const res = await api.post(`/api/stock-opname/${id}/submit`)
  return res.data
}

export const approveStockOpname = async (
  id: number
): Promise<StockOpnameSession> => {
  const res = await api.post(`/api/stock-opname/${id}/approve`)
  return res.data
}

export const rejectStockOpname = async (
  id: number,
  admin_notes: string
): Promise<StockOpnameSession> => {
  const res = await api.post(`/api/stock-opname/${id}/reject`, { admin_notes })
  return res.data
}

export const importCsv = async (id: number, file: File): Promise<any> => {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post(`/api/stock-opname/${id}/import`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export const exportCsvUrl = (id: number): string =>
  `/api/stock-opname/${id}/export`
