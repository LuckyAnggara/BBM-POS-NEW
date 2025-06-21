import { Timestamp } from 'firebase/firestore'

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
  currency: string
  taxRate: number
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
  purchasePrice: number
  sellingPrice: number
  category?: string
  supplierId?: string
  imageUrl?: string
  lowStockThreshold: number
}
