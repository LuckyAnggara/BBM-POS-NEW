// src/lib/types.ts

// ========================================================================
// Tipe Union & Enum-like
// ========================================================================

export type UserRole = 'admin' | 'cashier'
export type ShiftStatus = 'open' | 'closed'
export type SaleStatus =
  | 'completed'
  | 'returned'
  | 'pending'
  | 'pending_return'
  | 'pending_void'
  | 'voided'
  | 'returned'
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid'
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'qris' | 'credit' // Frontend constraint
export type InvoiceStatus = 'draft' | 'unpaid' | 'partial' | 'paid' | 'overdue'
export type ExtendedInvoiceStatus =
  | 'draft'
  | 'confirmed'
  | 'preparing'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'returned'
export type StockMutationType =
  | 'sale'
  | 'purchase'
  | 'adjustment'
  | 'transfer'
  | 'return'

export type ViewMode = 'card' | 'table'
export const LOCALSTORAGE_POS_VIEW_MODE_KEY = 'branchwise_posViewMode'

export type SaleRequestActionPayload = 'return' | 'void'
export type AdminRequestActionPayload = 'return' | 'void' | 'all'

export type PurchaseOrderStatus =
  | 'draft'
  | 'ordered'
  | 'partially_received'
  | 'fully_received'
  | 'cancelled'
export type PurchaseOrderPaymentStatus =
  | 'unpaid'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
export type PurchaseOrderPaymentTerms = 'cash' | 'credit'
export const PURCHASE_ORDER_PAYMENT_TERMS = ['all', 'cash', 'credit']

// ========================================================================
// Definisi Interface Model Utama (sesuai Model Laravel)
// ========================================================================

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  branch_id: number | string | null
  avatar_url?: string
  created_at: string
  updated_at: string
  branch?: Branch // Relasi
}

// Tipe data ini cocok dengan model BankAccount di Laravel
export interface BankAccount {
  bankName: string
  accountNumber: number
  accountHolderName: number
  id: number
  branch_id: number | string | null
  bank_name: string
  is_active: boolean
  account_number: string
  account_holder_name: string // Disesuaikan dari kode Anda sebelumnya
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Branch {
  id: number
  name: string
  invoice_name: string
  invoice_prefix: string | null
  locale: string | null
  logo_url: string | null
  number_format: string | null
  receipt_footer: string | null
  timezone: string | null
  address: string | null
  phone: string | null
  tax_rate: number
  tax_inclusive: boolean | false
  minimum_stock: number | 0
  currency: string
  created_at: string
  updated_at: string
  transaction_deletion_password: string | null
  default_report_period: 'thisMonth'
  printer_port: string
  intl: string
}

// ================= Stock Opname =================
export type StockOpnameStatus = 'DRAFT' | 'SUBMIT' | 'APPROVED' | 'REJECTED'

export interface StockOpnameSession {
  id: number
  branch_id: number
  created_by: number
  submitted_by: number | null
  approved_by: number | null
  status: StockOpnameStatus
  code: string
  notes: string | null
  admin_notes: string | null
  total_items: number
  total_positive_adjustment: number
  total_negative_adjustment: number
  submitted_at: string | null
  approved_at: string | null
  rejected_at: string | null
  created_at: string
  updated_at: string
  items?: StockOpnameItem[]
}

export interface StockOpnameItem {
  id: number
  session_id: number
  product_id: number
  branch_id: number
  product_name: string
  system_quantity: number
  counted_quantity: number
  difference: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  name: string
  description: string | null
  branch_id: number | string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: number
  name: string
  sku: string | null
  barcode?: string | null
  quantity: number
  stock?: number
  cost_price: number
  price: number
  branch_id: number | string | null
  category_id: number
  category_name: string | null
  image_url: string | null | undefined
  image_hint: string | null | undefined
  created_at: string
  updated_at: string
  category?: Category // Relasi
}

// Customer types & tiers
export type CustomerType = 'individual' | 'business'
export type CustomerTier = 'regular' | 'silver' | 'gold' | 'platinum'
export type CreditStatus = 'active' | 'suspended' | 'blocked'

export interface Customer {
  id: number
  name: string
  email: string | null
  phone: string | null
  address: string | null
  branch_id: number | string | null
  notes: string | null
  // Customer Classification
  customer_type: CustomerType
  customer_tier: CustomerTier
  company_name: string | null
  tax_id: string | null
  business_type: string | null
  // Credit Management
  credit_limit: number
  payment_terms_days: number
  credit_status: CreditStatus
  // Loyalty & Analytics
  loyalty_points: number
  total_spent: number
  total_transactions: number
  last_purchase_date: string | null
  // Preferences
  preferences: Record<string, any> | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Relations
  branch?: Branch
}

export interface Supplier {
  id: number
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  branch_id: number
  notes: string | null
  // Extended fields for comprehensive supplier management
  company_type: 'individual' | 'company' | null
  tax_id: string | null // NPWP/Tax ID
  credit_limit: number | null
  payment_terms: string | null // e.g., "NET 30", "COD", etc.
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  website: string | null
  industry: string | null
  rating: number | null // 1-5 rating
  is_active: boolean
  created_at: string
  updated_at: string
  // Optional analytics for when loaded from API
  analytics?: {
    total_orders: number
    total_amount: number
    outstanding_amount: number
    last_order_date: string | null
    average_order_value: number
    payment_reliability: number
  }
}

export interface Shift {
  id: number
  status: ShiftStatus
  start_shift: string
  end_shift: string | null
  starting_balance: number
  ending_balance: number | null
  actual_balance: number | null
  total_sales: number
  total_cash_payments: number
  total_bank_payments: number
  total_credit_payments: number
  total_card_payments: number
  total_qris_payments: number
  discount_amount: number
  branch_id: number | string | null
  cash_difference: number | null // Selisih kas antara saldo awal dan akhir
  user_id: number | null
  user_name: string
  created_at: string
  updated_at: string
}

export interface Sale {
  id: number
  transaction_number: string
  status: SaleStatus
  subtotal: number
  total_discount_amount: number
  shipping_cost: number
  total_cogs: number
  tax_amount: number
  total_amount: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  amount_paid: number
  change_given: number
  branch_id: number | string | null
  user_id: number | null
  customer_id: number | null
  user_name: string
  customer_name: string | null
  created_at: string
  updated_at: string
  sale_details?: SaleDetail[] // Relasi
  customer?: Customer // Relasi
  user?: User // Relasi
  voucher_code?: string | null
  voucher_discount_amount?: number | null
  is_credit_sale: boolean
  credit_due_date?: string | null
  outstanding_amount?: number | null
  bank_transaction_ref?: string | null
  bank_name?: string | null
  notes?: string | null
  returned_reason?: string | null
  returned_at?: string | null
  returned_by_user_id?: number | null
  returned_by_user_name?: string | null
  // Payments history
  customer_payments?: CustomerPayment[]
}

export interface SaleDetail {
  id: number
  sale_id: number
  product_id: number | null
  product_name: string
  quantity: number
  price_at_sale: number
  cost_at_sale: number
  discount_amount: number
  subtotal: number
  created_at: string
  updated_at: string
  product?: Product // Relasi
}

export interface CustomerPayment {
  id: number
  sale_id: number
  branch_id: number | null
  customer_id: number | null
  payment_date: string
  amount_paid: number
  payment_method: PaymentMethod
  notes: string | null
  recorded_by_user_id: number
  created_at: string
  updated_at: string
}

export interface PurchaseOrder {
  id: number
  po_number: string
  status: PurchaseOrderStatus // 'pending', 'completed', 'canceled'
  payment_status: PaymentStatus
  payment_due_date: string | null
  expected_delivery_date: string | null
  payment_terms: PurchaseOrderPaymentTerms
  subtotal: number
  total_amount: number
  outstanding_amount: number
  order_date: string
  other_costs: number
  notes: string | null
  is_credit: boolean
  supplier_id: number
  supplier_name: string
  supplier_invoice_number: string | null
  tax_discount_amount: number
  tax_amount: number
  shipping_cost_charged: number
  branch_id: number
  user_id: number
  payments: SupplierPayment[]
  created_at: string
  updated_at: string
  purchase_order_details?: PurchaseOrderDetail[] // Relasi
  supplier?: Supplier // Relasi
  user?: User
}

export interface PurchaseOrderDetail {
  id: number
  purchase_order_id: number
  product_id: number
  product_name: string
  ordered_quantity: number
  received_quantity: number
  purchase_price: number
  total_price: number
  created_at: string
  updated_at: string
}

export interface Expense {
  id: number
  category: string
  description: string | null
  amount: number
  branch_id: number | string | null
  user_id: number | null
  created_at: string
  updated_at: string
}

export interface BankAccount {
  id: number
  branch_id: number | string | null
  bank_name: string
  account_number: string
  account_holder_name: string
  is_active: boolean
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface StockMutation {
  id: number
  product_id: number
  product_name: string
  quantity_change: number // Positif untuk masuk, negatif untuk keluar
  stock_before: number
  stock_after: number
  type: StockMutationType
  description: string | null
  reference_type: string | null // e.g., 'App\\Models\\Sale'
  reference_id: number | null // e.g., 123
  user_id: number | null
  user_name: string
  created_at: string
  updated_at: string
}

export interface SupplierPayment {
  id: number
  purchase_order_id: number
  branch_id: number
  supplier_id: number
  payment_date: string
  amount_paid: number
  notes: string | null
  payment_method: PaymentMethod
  recorded_by_user_id: number
  created_at: string
  updated_at: string
}

export const EXPENSE_CATEGORIES = [
  'Sewa',
  'Gaji',
  'Utilitas',
  'Perlengkapan',
  'Pemasaran',
  'Transportasi',
  'Perbaikan',
  'Lain-lain',
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

// ========================================================================
// Tipe Data untuk Input & Payload (Form, Request API)
// ========================================================================

export type UserInput = Omit<
  User,
  'id' | 'created_at' | 'updated_at' | 'branch'
> & { password?: string; password_confirmation?: string }
export type BranchInput = Omit<Branch, 'id' | 'created_at' | 'updated_at'>
export type BankAccountInput = Omit<
  BankAccount,
  'id' | 'created_at' | 'updated_at'
>
export type ProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at'>

// Tipe ini digunakan saat membuat kategori baru.
export type CategoryInput = Omit<Category, 'id' | 'created_at' | 'updated_at'>

export type CustomerInput = Omit<
  Customer,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'loyalty_points'
  | 'total_spent'
  | 'total_transactions'
  | 'last_purchase_date'
  | 'branch'
>

export type ShiftInput = {
  starting_balance: number
  branch_id: number
}

export type ShiftEnding = {
  ending_balance: number
  branch_id: number
  actual_balance: number
  total_sales: number
  total_cash_payments: number
  total_bank_payments: number
  total_credit_payments: number
  total_card_payments: number
  total_qris_payments: number
}
// ... tambahkan tipe input lain sesuai kebutuhan

// Tipe data untuk item di dalam keranjang belanja (POS)
export interface CartItem {
  product_id: number
  quantity: number
  product_name: string
  price: number
  discount: number
  cost_price: number
  original_price: number // Harga asli sebelum diskon item
  discount_amount: number // Diskon nominal per item
  item_discount_type?: 'nominal' | 'percentage'
  item_discount_value?: number
  subtotal: number
  // tambahkan properti lain jika ada diskon per item, dll.
}

export interface CreateSalePayload {
  shift_id: number
  payment_method: PaymentMethod // 'cash', 'credit', 'card', dll.
  amount_paid?: number // Untuk kredit, ini bisa dianggap sebagai DP (Down Payment)
  items: CartItem[]
  change_given?: number
  tax_amount?: number
  shipping_cost?: number
  voucher_discount_amount?: number
  // -- Field Opsional untuk Kredit --
  is_credit_sale?: boolean // Kirim `true` jika ini penjualan kredit
  credit_due_date?: string // Opsional, tanggal jatuh tempo (format: 'YYYY-MM-DD')
  outstanding_amount?: number
  customer_id?: number
  sales_id?: number // ID employee yang berperan sebagai sales
  notes?: string
}

export interface SaleActionParams {
  id: number
  action_type: SaleRequestActionPayload
  reason: string
}

// Tipe untuk membuat PO baru
export interface PurchaseOrderItemInput {
  product_id: string
  quantity: number
  cost: number
}

export interface ReceivedItemData {
  purchase_order_detail_id: number
  quantity_received: number
}

export type PurchaseOrderInput = {
  supplier_id: number
  branch_id: number
  order_date: string // YYYY-MM-DD
  expected_delivery_date?: string | null
  payment_due_date?: string | null
  notes?: string
  payment_terms: 'cash' | 'credit'
  is_credit: boolean
  supplier_invoice_number?: string
  tax_discount_amount?: number
  tax_amount?: number
  shipping_cost_charged?: number
  other_costs?: number
  items: PurchaseOrderItemInput[]
  status?: string
}

export type SupplierInput = Omit<Supplier, 'id' | 'created_at' | 'updated_at'>

export type SupplierPaymentInput = Omit<
  SupplierPayment,
  'id' | 'branch_id' | 'supplier_id' | 'created_at' | 'updated_at'
>

export type SupplierPaymentEditInput = Omit<
  SupplierPayment,
  'branch_id' | 'supplier_id' | 'created_at' | 'updated_at'
>

// Supplier Analytics Types
export interface SupplierAnalytics {
  total_purchase_orders: number
  total_amount_purchased: number
  total_outstanding_amount: number
  average_order_value: number
  last_order_date: string | null
  payment_reliability_score: number // 0-100
  most_frequent: Supplier[]
  highest_spending: Supplier[]
}

export interface TopSuppliersResponse {
  most_frequent: Array<
    Supplier & {
      total_purchases: number
      total_spent: number
    }
  >
  highest_spending: Array<
    Supplier & {
      total_purchases: number
      total_spent: number
    }
  >
}

// Purchase Order with supplier details for history
export interface SupplierPurchaseOrder {
  id: number
  po_number: string
  order_date: string
  status: string
  payment_status: string
  total_amount: number
  outstanding_amount: number
  items_count: number
}

// Supplier detail with full analytics
export interface SupplierDetail extends Supplier {
  analytics: {
    total_orders: number
    total_amount: number
    outstanding_amount: number
    average_order_value: number
    last_order_date: string | null
    payment_reliability: number
  }
  recent_orders: SupplierPurchaseOrder[]
  outstanding_payments: SupplierPurchaseOrder[]
}

// ========================================================================
// Invoice Module Types
// ========================================================================

export interface Invoice {
  id: number
  invoice_number: string
  transaction_number?: string
  customer_id: number
  customer_name: string
  sales_agent_id?: number
  sales_agent_name?: string
  branch_id: number | string | null
  subtotal: number
  total_discount_amount?: number
  tax_amount: number
  shipping_cost: number
  total_amount: number
  amount_paid: number
  outstanding_amount: number
  status: InvoiceStatus
  payment_method?: PaymentMethod
  payment_status?: PaymentStatus
  change_given?: number
  credit_due_date?: string
  is_credit_sale?: boolean
  due_date: string
  created_at: string
  updated_at: string
  items?: InvoiceItem[]
  customer?: Customer
  sales_agent?: User
  user?: User
  branch?: Branch
  notes?: string
  customer_payments?: CustomerPayment[]
}

export interface InvoiceItem {
  id: number
  invoice_id?: number
  product_id: number
  product_name: string
  quantity: number
  price: number
  price_at_sale?: number
  cost_at_sale?: number
  discount_amount?: number
  discount_percentage?: number
  subtotal?: number
  total: number
  sku?: string
}

export interface CreateInvoicePayload {
  customer_id: number
  sales_agent_id?: number
  due_date: string
  items: InvoiceItemInput[]
  notes?: string
  shipping_cost?: number
  tax_amount?: number
  invoice_discount_type?: 'percentage' | 'amount'
  invoice_discount_value?: number
  down_payment_amount?: number
  down_payment_method?: 'cash' | 'transfer'
  down_payment_notes?: string
}

export interface InvoiceItemInput {
  product_id: number
  quantity: number
  price: number
  discount_percentage?: number
  discount_amount?: number
}

export interface UpdateInvoiceStatusPayload {
  status: InvoiceStatus
  payment_amount?: number
  notes?: string
}

export interface ListInvoicesParams {
  branchId?: string | number
  page?: number
  limit?: number
  searchTerm?: string
  status?: InvoiceStatus | 'all'
  startDate?: string
  endDate?: string
  customerId?: number
  salesAgentId?: number
}

export interface PaginatedInvoices {
  data: Invoice[]
  total: number
  current_page: number
  last_page: number
  per_page: number
}

// export interface PurchaseOrderInput {
//   supplier_id: number
//   branch_id: number
//   order_date: string // 'YYYY-MM-DD'
//   notes?: string
//   items: PurchaseOrderItemInput[]
// }

export const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]
export const STOCK_OPNAME_PAGE_SIZE_OPTIONS = [10, 25, 50]
export const ADMIN_REQUEST_SALES_STATUS = ['return', 'void', 'all']

// Customer Classification Constants
export const CUSTOMER_TYPES = {
  individual: 'Individual/Personal',
  business: 'Business/Corporate',
} as const

export const CUSTOMER_TIERS = {
  regular: 'Regular',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
} as const

export const CREDIT_STATUSES = {
  active: 'Active',
  suspended: 'Suspended',
  blocked: 'Blocked',
} as const

export const TIER_COLORS = {
  regular: 'bg-gray-100 text-gray-800',
  silver: 'bg-slate-100 text-slate-800',
  gold: 'bg-yellow-100 text-yellow-800',
  platinum: 'bg-purple-100 text-purple-800',
} as const
