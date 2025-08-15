import api from '@/lib/api'
import type { Employee } from './employee'

export interface PayrollDetail {
  id: number
  payroll_id: number
  employee_id: number
  base_salary: number
  meal_allowance: number
  bonus: number
  overtime_amount: number
  loan_deduction: number
  other_deduction: number
  total_amount: number
  notes?: string
  employee?: Employee
}

export interface Payroll {
  id: number
  branch_id: number
  payroll_code: string
  title: string
  description?: string
  payment_type: 'daily' | 'monthly'
  payment_date: string
  period_start: string
  period_end: string
  total_amount: number
  notes?: string
  status: 'paid' | 'pending' | 'cancelled'
  created_at: string
  updated_at: string
  branch?: {
    id: number
    name: string
  }
  details?: PayrollDetail[]
}

export interface PayrollEmployeeInput {
  employee_id: number
  base_salary: number
  meal_allowance?: number
  bonus?: number
  overtime_amount?: number
  loan_deduction?: number
  other_deduction?: number
  notes?: string
}

export interface PayrollInput {
  branch_id: number
  title: string
  description?: string
  payment_type: 'daily' | 'monthly'
  payment_date: string
  period_start: string
  period_end: string
  employees: PayrollEmployeeInput[]
  notes?: string
}

export interface PayslipSummary {
  total_gaji: number
  total_uang_makan: number
  total_bonus: number
  total_potongan: number
  total_pinjaman: number
  sisa_pinjaman: number
  total_tabungan: number
  total_diterima: number
}

export interface EmployeePayslip {
  employee: Employee & {
    department?: string
    email?: string
    phone?: string
  }
  payroll: {
    id: number
    title: string
    payment_type: 'daily' | 'monthly'
    payment_date: string
    period_start: string
    period_end: string
    notes?: string
  }
  payroll_detail: {
    base_salary: number
    meal_allowance: number
    bonus: number
    overtime_amount: number
    loan_deduction: number
    other_deduction: number
    total_amount: number
    notes?: string
  }
  branch: {
    name: string
    address?: string
    phone?: string
    email?: string
  }
}

interface PaginatedPayrolls {
  data: Payroll[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface ListPayrollsParams {
  branchId: number
  page?: number
  limit?: number
  paymentType?: 'daily' | 'monthly' | 'all'
  startDate?: string
  endDate?: string
}

/**
 * Mengambil daftar payroll dengan paginasi dan filter.
 */
export const listPayrolls = async (
  params: ListPayrollsParams
): Promise<PaginatedPayrolls> => {
  try {
    const response = await api.get('/api/payrolls', {
      params: {
        branch_id: params.branchId,
        page: params.page,
        limit: params.limit,
        payment_type: params.paymentType,
        start_date: params.startDate,
        end_date: params.endDate,
      },
    })
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: listPayrolls :: ', error)
    throw error
  }
}

/**
 * Membuat payroll baru (batch).
 */
export const createPayroll = async (
  payrollData: PayrollInput
): Promise<Payroll> => {
  try {
    const response = await api.post('/api/payrolls', payrollData)
    return response.data.data
  } catch (error) {
    console.error('Laravel API Error :: createPayroll :: ', error)
    throw error
  }
}

/**
 * Mengambil detail payroll berdasarkan ID.
 */
export const getPayroll = async (payrollId: number): Promise<Payroll> => {
  try {
    const response = await api.get(`/api/payrolls/${payrollId}`)
    return response.data.data
  } catch (error) {
    console.error('Laravel API Error :: getPayroll :: ', error)
    throw error
  }
}

/**
 * Memperbarui data payroll.
 */
export const updatePayroll = async (
  payrollId: number,
  payrollData: Partial<Omit<PayrollInput, 'employees'>>
): Promise<Payroll> => {
  try {
    const response = await api.put(`/api/payrolls/${payrollId}`, payrollData)
    return response.data.data
  } catch (error) {
    console.error('Laravel API Error :: updatePayroll :: ', error)
    throw error
  }
}

/**
 * Menghapus payroll.
 */
export const deletePayroll = async (payrollId: number): Promise<void> => {
  try {
    await api.delete(`/api/payrolls/${payrollId}`)
  } catch (error) {
    console.error('Laravel API Error :: deletePayroll :: ', error)
    throw error
  }
}

/**
 * Mengambil daftar pegawai untuk payroll.
 */
export const getEmployeesForPayroll = async (
  branchId: number
): Promise<Employee[]> => {
  try {
    const response = await api.get('/api/employees-for-payroll', {
      params: { branch_id: branchId },
    })
    return response.data.data
  } catch (error) {
    console.error('Laravel API Error :: getEmployeesForPayroll :: ', error)
    throw error
  }
}

/**
 * Mengambil slip gaji pegawai.
 */
export const getEmployeePayslip = async (
  payrollId: number,
  employeeId: number
): Promise<EmployeePayslip> => {
  try {
    const response = await api.get(
      `/api/payroll/${payrollId}/employee/${employeeId}/payslip`
    )
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: getEmployeePayslip :: ', error)
    throw error
  }
}
