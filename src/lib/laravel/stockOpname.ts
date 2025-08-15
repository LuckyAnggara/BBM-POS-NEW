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

export interface StockOpnamePaginatedResponse {
  data: StockOpnameSession[]
  total: number
  per_page: number
  current_page: number
  last_page: number
  next_page_url: string | null
  prev_page_url: string | null
}

export const listStockOpname = async (options?: {
  status?: StockOpnameStatus | 'all'
  per_page?: number
  page?: number
  search?: string
}): Promise<StockOpnamePaginatedResponse> => {
  const { status, per_page, page, search } = options || {}
  const params: any = {}
  if (status && status !== 'all') params.status = status
  if (per_page) params.per_page = per_page
  if (page) params.page = page
  if (search) params.search = search
  const res = await api.get('/api/stock-opname', { params })
  return res.data
}

// Admin review functions - untuk melihat semua stock opname dari semua branch
export const listStockOpnameForReview = async (options?: {
  status?: StockOpnameStatus | 'all'
  per_page?: number
  page?: number
  search?: string
  branch_id?: number | string | 'all'
  start_date?: string
  end_date?: string
}): Promise<StockOpnamePaginatedResponse> => {
  const { status, per_page, page, search, branch_id, start_date, end_date } =
    options || {}
  const params: any = {}
  if (status && status !== 'all') params.status = status
  if (per_page) params.per_page = per_page
  if (page) params.page = page
  if (search) params.search = search
  if (branch_id && branch_id !== 'all') params.branch_id = branch_id
  if (start_date) params.start_date = start_date
  if (end_date) params.end_date = end_date

  // Admin endpoint yang bisa melihat semua branch
  const res = await api.get('/api/admin/stock-opname-review', { params })
  return res.data
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

// Admin specific functions - untuk approve/reject melalui admin panel
export const adminApproveStockOpname = async (
  id: number
): Promise<StockOpnameSession> => {
  const res = await api.post(`/api/admin/stock-opname-review/${id}/approve`)
  return res.data
}

export const adminRejectStockOpname = async (
  id: number,
  admin_notes: string
): Promise<StockOpnameSession> => {
  const res = await api.post(`/api/admin/stock-opname-review/${id}/reject`, {
    admin_notes,
  })
  return res.data
}

export const getStockOpnameForReview = async (
  id: number
): Promise<StockOpnameSession> => {
  const res = await api.get(`/api/admin/stock-opname-review/${id}`)
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
