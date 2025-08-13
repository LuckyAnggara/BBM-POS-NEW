import api from '@/lib/api'

export interface StockMutationReportItem {
  productId: string
  productName: string
  sku?: string
  categoryName?: string
  initialStock: number
  stockInFromPO: number
  stockSold: number
  stockReturned: number
  finalStockCalculated: number
  currentLiveStock: number
}

export interface GenerateStockMutationReportParams {
  branch_id: number
  end_date: string // yyyy-MM-dd
}

export async function generateStockMutationReport(
  params: GenerateStockMutationReportParams
) {
  const { data } = await api.post(
    '/api/stock-mutation-reports/generate',
    params
  )
  return data
}

export async function getStockMutationReport(
  params: GenerateStockMutationReportParams
) {
  const { data } = await api.get('/api/stock-mutation-reports', { params })
  return data
}

export async function getLiveStockMutationReport(branch_id: number) {
  const { data } = await api.get('/api/stock-mutation-reports/live', {
    params: { branch_id },
  })
  return data
}
