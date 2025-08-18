import api from '@/lib/api'

export interface SalesReportParams {
  start_date: string
  end_date: string
  branch_id: string | number
}

export interface SalesEmployeeReportRow {
  employee_id: number
  sales_name: string
  employee_code: string
  branch_name: string
  total_transactions: number
  total_sales: number
  total_cogs: number
  total_profit: number
  avg_transaction_value: number
}

export interface SalesReportSummary {
  total_sales_employees: number
  total_sales_amount: number
  total_profit: number
  total_transactions: number
  avg_sales_per_employee: number
}

export interface SalesReportResponse {
  sales_data: SalesEmployeeReportRow[]
  summary: SalesReportSummary
  top_sales: SalesEmployeeReportRow | null
  period: { start_date: string; end_date: string }
}

export async function fetchSalesReport(
  params: SalesReportParams
): Promise<SalesReportResponse> {
  const { data } = await api.get('/api/sales-report', { params })
  return data
}
