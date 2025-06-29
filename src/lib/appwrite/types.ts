import { Timestamp } from 'firebase/firestore'
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'qris' | 'credit'
export type PaymentStatus =
  | 'unpaid'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'returned'
export type TransactionStatus =
  | 'processing'
  | 'completed'
  | 'failed'
  | 'returned'
export type ShiftStatus = 'active' | 'ended'

// export interface TransactionItem {
//   transactionId: string
//   branchId: string
//   productId: string
//   productName: string
//   sku?: string | null
//   quantity: number
//   costAtSale: number
//   priceAtSale?: number
//   discountAmount?: number
//   subtotal: number
// }

export interface TransactionItemDocument {
  $id: string
  $createdAt: string

  // --- Relational IDs ---
  transactionId: string // Kunci untuk join ke TransactionDocument
  branchId: string // Denormalisasi untuk mempermudah query

  // --- Denormalized Product Info ---
  productId: string
  productName: string
  sku?: string

  // --- Financial Details per Item ---
  quantity: number
  priceAtSale: number
  costAtSale: number
  discountAmount: number // Total diskon untuk baris ini (diskon_per_item * kuantitas)
  subtotal: number // (priceAtSale * quantity) - discountAmount
}

export interface CartItem {
  productId: string
  productName: string
  quantity: number
  price: number
  costPrice: number
  originalPrice: number // Harga asli sebelum diskon item
  discountAmount: number // Diskon nominal per item
  itemDiscountType?: 'nominal' | 'percentage'
  itemDiscountValue?: number
  subtotal: number
}

interface PaymentDetails {
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  amountPaid: number
  changeGiven: number
  bankTransactionRef?: string
  bankName?: string
}

interface CreditDetails {
  isCreditSale: boolean
  creditDueDate?: string // ISO Date String
  outstandingAmount: number
}

export interface TransactionDocument extends PaymentDetails, CreditDetails {
  // --- Core Fields dari Appwrite ---
  $id: string
  $createdAt: string

  // --- Core Transaction Fields ---
  status: TransactionStatus
  transactionNumber: string

  // --- Relational IDs ---
  branchId: string
  shiftId: string
  // userId: string
  userIda: string
  customerId?: string
  notes?: string

  // --- Denormalized Data (untuk efisiensi query) ---
  userName: string
  customerName?: string

  // --- Transaction Items (Array, bukan JSON string lagi di level aplikasi) ---
  items: TransactionItemDocument[]

  // --- Financial Summary ---
  subtotal: number // Total dari (originalPrice * quantity)
  itemsDiscountAmount: number // Total diskon dari semua item
  voucherCode?: string
  voucherDiscountAmount: number
  totalDiscountAmount: number // Gabungan dari itemsDiscount + voucherDiscount
  shippingCost: number
  taxAmount: number
  totalAmount: number // Final amount yang harus dibayar
  totalCOGS: number // Total dari (costPrice * quantity) untuk hitung laba
}

export interface ShiftDocument {
  $id: string
  $createdAt: string
  branchId: string
  userId: string
  userName: string
  startShift: string // ISO String
  endShift?: string // ISO String
  startingBalance: number
  totalSales: number
  totalCashPayments: number
  discountAmount: number
  totalOtherPayments: number
  status: ShiftStatus
}

export type CreateTransactionPayload = Pick<
  TransactionDocument,
  | 'branchId'
  | 'shiftId'
  // | 'userId'
  | 'userIda'
  | 'userName'
  | 'subtotal'
  | 'totalDiscountAmount'
  | 'taxAmount'
  | 'shippingCost'
  | 'totalAmount'
  | 'totalCOGS'
  | 'paymentMethod'
  | 'amountPaid'
> & {
  items: CartItem[] // Mengirim detail item dari keranjang belanja
} & Partial<
    // Field Opsional
    Pick<
      TransactionDocument,
      | 'customerId'
      | 'customerName'
      | 'notes'
      | 'voucherCode'
      | 'itemsDiscountAmount'
      | 'voucherDiscountAmount'
      | 'isCreditSale'
      | 'changeGiven'
      | 'paymentStatus'
      | 'bankName'
      | 'bankTransactionRef'
      | 'creditDueDate'
      | 'outstandingAmount'
    >
  >

export interface TransactionViewModel
  extends Omit<TransactionDocument, 'branchId' | 'customerId' | 'userId'> {
  // ID diganti dengan objek untuk kemudahan display di UI
  branch: { id: string; name: string }
  user: { id: string; name: string }
  customer?: { id?: string; name: string; phone?: string }
  items: TransactionItemDocument[]
}

export interface InvoicePrintPayloadItem {
  name: string
  quantity: number
  price: number // Harga jual per item (setelah diskon item)
  total: number // Subtotal untuk baris item ini
  originalPrice?: number // Harga sebelum diskon item
  discountAmount?: number // Jumlah diskon per item
}

export interface InvoicePrintPayload {
  branchName: string
  branchAddress: string
  branchPhone: string
  invoiceNumber: string
  transactionDate: string
  cashierName: string
  customerName: string
  items: InvoicePrintPayloadItem[]
  subtotal: number
  taxAmount: number
  shippingCost: number
  totalItemDiscount: number
  voucherDiscount: number
  overallTotalDiscount: number
  totalAmount: number
  paymentMethod: string
  amountPaid: number
  changeGiven: number
  notes: string
}

export interface UserData {
  id: string // Ini adalah $id dari Appwrite
  name: string
  email: string
  role: 'admin' | 'cashier' | string
  branchId?: string // Tanda tanya (?) menandakan ini opsional
  avatarUrl?: string
  localPrinterUrl?: string
}
export type ReportPeriodPreset = 'thisMonth' | 'thisWeek' | 'today'

export interface Branch {
  id: string // Ini adalah $id dari Appwrite
  name: string
  invoiceName: string
  currency?: string | null // Currency can be null if not set
  taxRate: number | 10
  address: string
  phoneNumber: string
  transactionDeletionPassword?: string
  defaultReportPeriod?: ReportPeriodPreset // Added field
}

// Tipe data untuk dokumen di koleksi 'inventoryItems' akan kita tambahkan di sini nanti
export interface InventoryItem {
  id: string
  branchId: string
  name: string
  sku?: string
  stock: number
  quantity: number
  purchasePrice: number
  sellingPrice: number
  price: number
  costPrice: number
  category?: string
  supplierId?: string
  imageUrl?: string
  lowStockThreshold: number
}

export const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]
