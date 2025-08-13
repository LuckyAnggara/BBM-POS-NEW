import api from '@/lib/api'

export type ReportType = 'sales_summary' | 'income_statement' | 'balance_sheet'

export interface GenerateReportParams {
  branch_id: number
  report_type: ReportType
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
}

export const generateReport = async (params: GenerateReportParams) => {
  const res = await api.post('/api/reports/generate', params)
  return res.data as { id: number; data: any }
}

export const getReport = async (params: GenerateReportParams) => {
  const res = await api.get('/api/reports', { params })
  return res.data as { id: number; data: any }
}
