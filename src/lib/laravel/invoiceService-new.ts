import api from '@/lib/api'
import type {
  Invoice,
  CreateInvoicePayload,
  UpdateInvoiceStatusPayload,
  ListInvoicesParams,
  PaginatedInvoices,
  InvoiceStatus,
} from '@/lib/types'

/**
 * Create a new invoice for credit transactions
 * @param {CreateInvoicePayload} payload - Invoice data
 * @returns {Promise<Invoice>} Created invoice object
 */
export const createInvoice = async (
  payload: CreateInvoicePayload
): Promise<Invoice> => {
  try {
    const response = await api.post('/api/invoices', payload)
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: createInvoice :: ', error)
    throw error
  }
}

/**
 * Get list of invoices with filtering and pagination
 * @param {ListInvoicesParams} params - Filter and pagination parameters
 * @returns {Promise<PaginatedInvoices>} Paginated invoices list
 */
export const listInvoices = async (
  params: ListInvoicesParams = {}
): Promise<PaginatedInvoices> => {
  try {
    const response = await api.get('/api/invoices', { params })
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: listInvoices :: ', error)
    throw error
  }
}

/**
 * Get single invoice by ID
 * @param {number} id - Invoice ID
 * @returns {Promise<Invoice | null>} Invoice object or null if not found
 */
export const getInvoiceById = async (id: number): Promise<Invoice | null> => {
  try {
    const response = await api.get(`/api/invoices/${id}`)
    return response.data
  } catch (error) {
    console.error(`Laravel API Error :: getInvoiceById (ID: ${id}) :: `, error)
    return null
  }
}

/**
 * Update invoice status and handle payments
 * @param {number} id - Invoice ID
 * @param {UpdateInvoiceStatusPayload} payload - Status update data
 * @returns {Promise<Invoice>} Updated invoice object
 */
export const updateInvoiceStatus = async (
  id: number,
  payload: UpdateInvoiceStatusPayload
): Promise<Invoice> => {
  try {
    const response = await api.patch(`/api/invoices/${id}/status`, payload)
    return response.data
  } catch (error) {
    console.error(
      `Laravel API Error :: updateInvoiceStatus (ID: ${id}) :: `,
      error
    )
    throw error
  }
}

/**
 * Update invoice details
 * @param {number} id - Invoice ID
 * @param {Partial<CreateInvoicePayload>} payload - Invoice update data
 * @returns {Promise<Invoice>} Updated invoice object
 */
export const updateInvoice = async (
  id: number,
  payload: Partial<CreateInvoicePayload>
): Promise<Invoice> => {
  try {
    const response = await api.put(`/api/invoices/${id}`, payload)
    return response.data
  } catch (error) {
    console.error(`Laravel API Error :: updateInvoice (ID: ${id}) :: `, error)
    throw error
  }
}

/**
 * Delete invoice (only if status is draft)
 * @param {number} id - Invoice ID
 * @returns {Promise<void>}
 */
export const deleteInvoice = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/invoices/${id}`)
  } catch (error) {
    console.error(`Laravel API Error :: deleteInvoice (ID: ${id}) :: `, error)
    throw error
  }
}

/**
 * Generate and download invoice PDF
 * @param {number} id - Invoice ID
 * @returns {Promise<Blob>} PDF blob for download
 */
export const downloadInvoicePDF = async (id: number): Promise<Blob> => {
  try {
    const response = await api.get(`/api/invoices/${id}/pdf`, {
      responseType: 'blob',
    })
    return response.data
  } catch (error) {
    console.error(
      `Laravel API Error :: downloadInvoicePDF (ID: ${id}) :: `,
      error
    )
    throw error
  }
}

/**
 * Mark invoice as overdue (automatic background process or manual trigger)
 * @param {number} id - Invoice ID
 * @returns {Promise<Invoice>} Updated invoice object
 */
export const markInvoiceOverdue = async (id: number): Promise<Invoice> => {
  try {
    const response = await api.post(`/api/invoices/${id}/mark-overdue`)
    return response.data
  } catch (error) {
    console.error(
      `Laravel API Error :: markInvoiceOverdue (ID: ${id}) :: `,
      error
    )
    throw error
  }
}

/**
 * Get invoice summary statistics
 * @param {string | number} branchId - Branch ID
 * @returns {Promise<InvoiceSummary>} Invoice statistics
 */
export interface InvoiceSummary {
  total_invoices: number
  total_amount: number
  total_outstanding: number
  total_paid: number
  paid_count: number
  unpaid_count: number
  partial_count: number
  overdue_count: number
  overdue_amount: number
  by_status: Record<InvoiceStatus, number>
}

export const getInvoiceSummary = async (
  branchId: string | number
): Promise<InvoiceSummary> => {
  try {
    const response = await api.get(`/api/invoices/summary`, {
      params: { branch_id: branchId },
    })
    return response.data
  } catch (error) {
    console.error('Laravel API Error :: getInvoiceSummary :: ', error)
    throw error
  }
}

/**
 * Auto-generate invoice number
 * @param {string | number} branchId - Branch ID
 * @returns {Promise<string>} Generated invoice number
 */
export const generateInvoiceNumber = async (
  branchId: string | number
): Promise<string> => {
  try {
    const response = await api.post('/api/invoices/generate-number', {
      branch_id: branchId,
    })
    return response.data.invoice_number
  } catch (error) {
    console.error('Laravel API Error :: generateInvoiceNumber :: ', error)
    throw error
  }
}
