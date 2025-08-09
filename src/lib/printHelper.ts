// Definisikan tipe data untuk transaksi agar kode lebih aman dan mudah dibaca

import { Branch, Sale, SaleDetail } from './types'
import { toast } from 'sonner'

export interface TransactionItem {
  name: string
  quantity: number
  price: number
  total: number
}

export interface TransactionData {
  branchName: string
  branchAddress: string
  branchPhone: string
  invoiceNumber: string
  transactionDate: string
  cashierName: string
  customerName?: string // Tanda tanya (?) berarti opsional
  items: TransactionItem[]
  subtotal: number
  taxAmount: number
  totalAmount: number
  paymentMethod: string
  amountPaid: number
  changeGiven: number
}

type PrinterType = '58mm' | 'dot-matrix'

export const handlePrint = async ({
  printerType,
  branch,
  transaction,
}: {
  printerType: PrinterType
  branch: Branch
  transaction: Sale
}) => {
  const testData = {
    printMode: printerType === '58mm' ? '58mm' : 'dot-matrix',
    data: {
      branchName: branch.name || 'null',
      branchAddress: branch.address || 'null',
      branchPhone: branch.phone || 'null',
      invoiceNumber: transaction.transaction_number || 'null',
      transactionDate: transaction.created_at.toString(),
      cashierName: transaction.user_name || 'Kasir 01',
      customerName: transaction.customer?.name || 'Pelanggan Umum',
      items: (transaction.sale_details ?? []).map((item) => ({
        name: item.product_name,
        quantity: item.quantity,
        price: item.price_at_sale,
        total: item.subtotal,
      })),
      subtotal: transaction.subtotal,
      taxAmount: transaction.tax_amount,
      totalAmount: transaction.total_amount,
      paymentMethod: transaction.payment_method,
      amountPaid: transaction.amount_paid,
      changeGiven: transaction.change_given,
    },
  }
  const port = branch.printer_port || '3000'
  const url = `http://localhost:${port}/print` // Endpoint yang benar

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return 'Data berhasil dikirim untuk dicetak!'
  } catch (error) {
    throw new Error('Gagal mengirim data untuk dicetak.')
  } finally {
  }
}
