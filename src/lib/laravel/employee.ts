import api from '@/lib/api'

export interface Employee {
  id: number
  branch_id: number
  employee_code: string
  name: string
  email?: string
  phone?: string
  address?: string
  position: string
  is_sales: boolean
  employment_type: 'full_time' | 'part_time' | 'contract'
  daily_salary: number
  monthly_salary: number
  daily_meal_allowance: number
  monthly_meal_allowance: number
  bonus: number
  hire_date: string
  termination_date?: string
  status: 'active' | 'inactive' | 'terminated'
  notes?: string
  created_at: string
  updated_at: string
  branch?: {
    id: number
    name: string
  }
  active_loan?: {
    id: number
    amount: number
    remaining_amount: number
    monthly_deduction: number
  }
  total_savings?: number
}

export type EmployeeInput = Omit<
  Employee,
  'id' | 'created_at' | 'updated_at' | 'employee_code' | 'branch'
>

interface PaginatedEmployees {
  data: Employee[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface ListEmployeesParams {
  branchId: number
  page?: number
  limit?: number
  search?: string
  status?: 'active' | 'inactive' | 'terminated'
}

/**
 * Mengambil daftar pegawai dengan paginasi dan filter.
 */
export const listEmployees = async (
  params: ListEmployeesParams
): Promise<PaginatedEmployees> => {
  try {
    const response = await api.get('/api/employees', {
      params: {
        branch_id: params.branchId,
        page: params.page,
        limit: params.limit,
        search: params.search,
        status: params.status,
      },
    })
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: listEmployees :: ', error)
    throw error
  }
}

/**
 * Membuat pegawai baru.
 */
export const createEmployee = async (
  employeeData: EmployeeInput
): Promise<Employee> => {
  try {
    const response = await api.post('/api/employees', employeeData)
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: createEmployee :: ', error)
    throw error
  }
}

/**
 * Mengambil detail pegawai berdasarkan ID.
 */
export const getEmployeeById = async (
  employeeId: number
): Promise<Employee> => {
  try {
    const response = await api.get(`/api/employees/${employeeId}`)
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: getEmployeeById :: ', error)
    throw error
  }
}

/**
 * Memperbarui data pegawai.
 */
export const updateEmployee = async (
  employeeId: number,
  employeeData: Partial<EmployeeInput>
): Promise<Employee> => {
  try {
    const response = await api.put(`/api/employees/${employeeId}`, employeeData)
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: updateEmployee :: ', error)
    throw error
  }
}

/**
 * Menghapus pegawai.
 */
export const deleteEmployee = async (employeeId: number): Promise<void> => {
  try {
    await api.delete(`/api/employees/${employeeId}`)
  } catch (error) {
    console.error('Laravel API Error :: deleteEmployee :: ', error)
    throw error
  }
}
