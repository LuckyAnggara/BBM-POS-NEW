import api from '@/lib/api'

export interface DashboardSummaryResponse {
  branch_id: number
  start_date: string
  end_date: string
  gross_revenue_before_returns: number
  net_revenue: number
  gross_profit: number
  total_expenses: number
  net_transaction_count: number
  daily_sales: { date: string; total: number }[]
  daily_profit: { date: string; profit: number }[]
  top_products: {
    product_id: number
    product_name: string
    qty: number
    total_sales: number
  }[]
  inventory: {
    total_unique_products: number
    low_stock_items_count: number
    low_stock_threshold: number
  }
}

export async function getDashboardSummary(params: {
  branch_id: number
  start_date?: string
  end_date?: string
}): Promise<DashboardSummaryResponse> {
  const { data } = await api.get('/api/dashboard/summary', { params })
  return data
}
