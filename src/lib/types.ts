// src/lib/types.ts

// ========================================================================
// Tipe Union & Enum-like
// ========================================================================

export type UserRole = 'admin' | 'cashier'
export type ShiftStatus = 'open' | 'closed'
export type SaleStatus = 'completed' | 'returned' | 'pending' // Sesuaikan dengan logika bisnis Anda
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid'
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'qris' | 'credit' // Frontend constraint
export type StockMutationType =
  | 'sale'
  | 'purchase'
  | 'adjustment'
  | 'transfer'
  | 'return'

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
  address: string | null
  phone: string | null
  tax_rate: number
  currency: string
  created_at: string
  updated_at: string
  transaction_deletion_password: string | null
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
  quantity: number
  cost_price: number
  price: number
  branch_id: number | string | null
  category_id: number | null
  category_name: string | null
  image_url: string | null | undefined
  image_hint: string | null | undefined
  created_at: string
  updated_at: string
  category?: Category // Relasi
}

export interface Customer {
  id: number
  name: string
  email: string | null
  phone: string | null
  address: string | null
  branch_id: number | string | null
  notes: string | null
  created_at: string
  updated_at: string
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
  created_at: string
  updated_at: string
}

export interface Shift {
  id: number
  status: ShiftStatus
  start_shift: string
  end_shift: string | null
  starting_balance: number
  total_sales: number
  total_cash_payments: number
  // Tambahkan total pembayaran lain jika perlu
  branch_id: number | string | null
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

export interface PurchaseOrder {
  id: number
  po_number: string
  status: string // 'pending', 'completed', 'canceled'
  payment_status: PaymentStatus
  subtotal: number
  total_amount: number
  outstanding_amount: number
  order_date: string
  supplier_id: number
  supplier_name: string
  branch_id: number
  user_id: number | null
  created_at: string
  updated_at: string
  purchase_order_details?: PurchaseOrderDetail[] // Relasi
  supplier?: Supplier // Relasi
}

export interface PurchaseOrderDetail {
  id: number
  purchase_order_id: number
  product_id: number
  product_name: string
  ordered_quantity: number
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
  payment_method: PaymentMethod
  recorded_by_user_id: number
  created_at: string
  updated_at: string
}

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

// ... tambahkan tipe input lain sesuai kebutuhan

// Tipe data untuk item di dalam keranjang belanja (POS)
export interface CartItem {
  product_id: number
  quantity: number
  // tambahkan properti lain jika ada diskon per item, dll.
}

// Tipe data payload untuk membuat transaksi penjualan baru
export interface CreateSalePayload {
  user_id: number
  branch_id: number
  customer_id?: number
  payment_method: PaymentMethod
  amount_paid: number
  notes?: string
  items: CartItem[]
}
