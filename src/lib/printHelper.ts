// Definisikan tipe data untuk transaksi agar kode lebih aman dan mudah dibaca

import { Branch, TransactionViewModel } from './appwrite/types'
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
  transaction: TransactionViewModel
}) => {
  const testData = {
    printMode: printerType === '58mm' ? '58mm' : 'dot-matrix',
    data: {
      branchName: branch.name || 'null',
      branchAddress: branch.address || 'null',
      branchPhone: branch.phoneNumber || 'null',
      invoiceNumber: transaction.transactionNumber || 'null',
      transactionDate: transaction.$createdAt.toString(),
      cashierName: transaction.user.name || 'Kasir 01',
      customerName: transaction.customer?.name || 'Pelanggan Umum',
      items: transaction.items.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        price: item.priceAtSale,
        total: item.subtotal,
      })),
      subtotal: transaction.subtotal,
      taxAmount: transaction.taxAmount,
      totalAmount: transaction.totalAmount,
      paymentMethod: transaction.paymentMethod,
      amountPaid: transaction.amountPaid,
      changeGiven: transaction.changeGiven,
    },
  }
  const port = branch.printerPort || '3000'
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
