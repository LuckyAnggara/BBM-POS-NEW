import api from '@/lib/api'

export interface ClientStockMovementRow {
  id: string
  branchId: number
  productId: string
  productName: string
  sku?: string
  mutationTime: string
  type: string
  quantityChange: number
  stockBeforeMutation: number
  stockAfterMutation: number
  createdAt: string
  notes?: string
  referenceId?: number | string | null
  referenceType?: string | null
}

export interface StockMovementLiveResponse {
  branch_id: number
  product_id: number
  start_date: string
  end_date: string
  data: ClientStockMovementRow[]
  initial_stock: number
  current_stock: number
}

export async function getLiveStockMovement(params: {
  branch_id: number
  product_id: number
  start_date: string
  end_date: string
}): Promise<StockMovementLiveResponse> {
  const { data } = await api.get('/api/stock-movement-reports/live', {
    params,
  })
  return data
}

export async function getCachedStockMovement(params: {
  branch_id: number
  product_id: number
  start_date: string
  end_date: string
}) {
  const { data } = await api.get('/api/stock-movement-reports', { params })
  return data
}

export async function generateStockMovement(params: {
  branch_id: number
  product_id: number
  start_date: string
  end_date: string
}) {
  const { data } = await api.post(
    '/api/stock-movement-reports/generate',
    params
  )
  return data
}
