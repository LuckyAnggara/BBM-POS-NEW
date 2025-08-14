import api from '@/lib/api'

export interface YearStatusRow {
  year: string
  closing: number
  opening: number
  closing_value?: number
  opening_value?: number
}

export interface BranchStatusRow {
  branch_id: number
  branch_name: string
  total_products: number
  closing_count: number
  closing_done: boolean
  closing_value: number
  opening_count: number
  opening_done: boolean
  opening_value: number
}

export async function fetchInventoryYearStatus() {
  const { data } = await api.get('/api/inventory/year-status')
  // data.data is an object keyed by year
  const entries = Object.entries<any>(data.data || {})
  return entries.map(([year, v]) => ({
    year,
    closing: v.closing,
    opening: v.opening,
    closing_value: v.closing_value,
    opening_value: v.opening_value,
  }))
}

export async function closeInventoryYear(
  params: { year?: number; force?: boolean } = {}
) {
  const { data } = await api.post('/api/inventory/close-year', params)
  return data
}

export async function openInventoryYear(year: number) {
  const { data } = await api.post('/api/inventory/open-year', { year })
  return data
}

export async function fetchBranchStatus(year: number) {
  const { data } = await api.get('/api/inventory/branch-status', {
    params: { year },
  })
  return data.data as BranchStatusRow[]
}

export async function closeInventoryYearBranch(
  year: number,
  branch_id: number,
  force = false
) {
  const { data } = await api.post('/api/inventory/close-year-branch', {
    year,
    branch_id,
    force,
  })
  return data
}

export async function openInventoryYearBranch(year: number, branch_id: number) {
  const { data } = await api.post('/api/inventory/open-year-branch', {
    year,
    branch_id,
  })
  return data
}

export interface SnapshotDetailRow {
  product_id: number
  product_name: string
  branch_id: number | null
  quantity: number
  cost_price: number
  value_amount: number
}

export async function fetchClosingDetail(
  year: number,
  params: { branch_id?: number; type?: string } = {}
) {
  const { data } = await api.get(`/api/inventory/closing-detail/${year}`, {
    params,
  })
  return data.data as SnapshotDetailRow[]
}

export async function exportClosingCsv(
  year: number,
  params: { branch_id?: number; type?: string } = {}
) {
  const response = await api.get(`/api/inventory/closing-export/${year}`, {
    params,
    responseType: 'blob',
  })
  return response.data as Blob
}
