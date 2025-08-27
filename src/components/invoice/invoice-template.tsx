'use client'

import type { Branch, Invoice, InvoiceItem, Customer, User } from '@/lib/types'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { format, parseISO, isValid } from 'date-fns'
import { id } from 'date-fns/locale'
import Image from 'next/image'

// Extend types to include the properties we need
// Extended interfaces for additional fields
interface ExtendedInvoiceItem extends InvoiceItem {
  name?: string
  product?: {
    name?: string
  }
  discount?: number
  tax_amount?: number
  tax_percentage?: number
}

interface ExtendedInvoice extends Omit<Invoice, 'payment_method'> {
  items: ExtendedInvoiceItem[]
  type?: string
  invoice_type?: string
  invoice_date?: string
  tax_rate?: number
  signature_name?: string
  signature_position?: string
  payment_method?: string
  payment_note?: string
}

interface ExtendedBranch extends Partial<Branch> {
  logo?: string
  invoice_name?: string
  branch_name?: string
  email?: string
  account_number?: string
  bank?: string
  account_name?: string
}

interface InvoiceTemplateProps {
  transaction: ExtendedInvoice
  branch: ExtendedBranch
}

export default function InvoiceTemplate({
  transaction,
  branch,
}: InvoiceTemplateProps) {
  // Format dates from ISO string
  const formatDateIntl = (isoString?: string) => {
    if (!isoString) return 'N/A'
    const date = parseISO(isoString)
    if (!isValid(date)) return 'Tanggal tidak valid'
    return format(date, 'dd MMMM yyyy', { locale: id })
  }

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return `${branch.currency || 'Rp'}0`
    return `${branch.currency || 'Rp'}${amount.toLocaleString('id-ID')}`
  }

  // Calculate subtotal, tax, and total
  const subtotal =
    transaction.items?.reduce((sum, item) => {
      const itemTotal = (item.quantity || 0) * (item.price || 0)
      const discountAmount = item.discount || 0
      return sum + itemTotal - discountAmount
    }, 0) || 0

  const taxRate = transaction.tax_rate || 10 // Default to 10% if not specified
  const taxAmount = (subtotal * taxRate) / 100
  const totalAmount = subtotal + taxAmount

  // Get invoice number and date
  const invoiceNumber =
    transaction.invoice_number || transaction.id?.toString() || 'N/A'
  const invoiceDate = transaction.invoice_date || transaction.created_at

  // Invoice recipient
  const recipientName = transaction.customer?.name || 'PT. ABC Creative'
  const recipientAddress =
    transaction.customer?.address ||
    'Jl. Jendral Permata No. 123, Jakarta, Indonesia'
  const recipientPhone = transaction.customer?.phone || '0987-654-321'
  const recipientEmail = transaction.customer?.email || 'mail@abccreative.co.id'

  const invoiceType =
    transaction.type === 'purchase'
      ? 'INVOICE PEMBELIAN'
      : transaction.invoice_type || 'INVOICE TAGIHAN PROYEK'

  // Responsible person (signature)
  const signerName =
    transaction.signature_name || transaction.user?.name || 'Manager Proyek'
  const signerPosition =
    transaction.signature_position || transaction.user?.role || 'Manager'

  return (
    <div className='w-full max-w-5xl mx-auto bg-white'>
      {/* Invoice Header */}
      <div className='bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 print:bg-blue-800 print:text-white'>
        <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6'>
          <div className='flex-1'>
            <h1 className='text-3xl font-bold mb-2'>{invoiceType}</h1>
            <div className='text-blue-100'>
              <p className='text-lg'>{branch.invoice_name || branch.name}</p>
              <p className='text-sm'>{branch.address || 'Alamat perusahaan'}</p>
              <p className='text-sm'>Telp: {branch.phone || '000-000-000'}</p>
              <p className='text-sm'>
                Email: {branch.email || 'email@perusahaan.com'}
              </p>
            </div>
          </div>

          <div className='flex-shrink-0'>
            <div className='w-24 h-24 lg:w-32 lg:h-32 relative'>
              {branch.logo ? (
                <Image
                  src={branch.logo}
                  alt='Logo Perusahaan'
                  fill
                  className='object-contain'
                />
              ) : (
                <div className='w-full h-full flex items-center justify-center border-2 border-blue-200 rounded-lg bg-white/10'>
                  <span className='text-blue-100 text-xs text-center font-medium'>
                    LOGO
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Info Section */}
      <div className='p-8 border-b-2 border-gray-200'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          {/* Left Column - Invoice Details */}
          <div className='space-y-4'>
            <div>
              <h3 className='text-lg font-semibold text-gray-800 mb-3'>
                Detail Invoice
              </h3>
              <div className='bg-gray-50 p-4 rounded-lg space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-gray-600 font-medium'>
                    Nomor Invoice:
                  </span>
                  <span className='font-bold text-blue-800'>
                    {invoiceNumber}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600 font-medium'>
                    Tanggal Invoice:
                  </span>
                  <span className='font-semibold'>
                    {formatDateIntl(invoiceDate)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600 font-medium'>Status:</span>
                  <span className='inline-flex px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full'>
                    {transaction.status ||
                      transaction.invoice_status ||
                      'Draft'}
                  </span>
                </div>
                {transaction.credit_due_date && (
                  <div className='flex justify-between'>
                    <span className='text-gray-600 font-medium'>
                      Jatuh Tempo:
                    </span>
                    <span className='font-semibold text-red-600'>
                      {formatDateIntl(transaction.credit_due_date)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Customer Details */}
          <div className='space-y-4'>
            <div>
              <h3 className='text-lg font-semibold text-gray-800 mb-3'>
                Kepada Yth.
              </h3>
              <div className='bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500'>
                <h4 className='font-bold text-lg text-gray-800 mb-2'>
                  {recipientName}
                </h4>
                <div className='space-y-1 text-gray-600'>
                  <p>{recipientAddress}</p>
                  <p>📞 {recipientPhone}</p>
                  <p>✉️ {recipientEmail}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Items */}
      <div className='p-8'>
        <h3 className='text-xl font-semibold text-gray-800 mb-6'>
          Rincian Layanan/Produk
        </h3>
        <div className='overflow-x-auto'>
          <Table className='w-full'>
            <TableHeader>
              <TableRow className='bg-gray-100'>
                <TableHead className='font-bold text-gray-800 py-4'>
                  Deskripsi
                </TableHead>
                <TableHead className='font-bold text-gray-800 text-center py-4'>
                  Qty
                </TableHead>
                <TableHead className='font-bold text-gray-800 text-right py-4'>
                  Harga Satuan
                </TableHead>
                <TableHead className='font-bold text-gray-800 text-right py-4'>
                  Diskon
                </TableHead>
                <TableHead className='font-bold text-gray-800 text-right py-4'>
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transaction.items && transaction.items.length > 0 ? (
                transaction.items.map((item, index) => {
                  const itemTotal = (item.quantity || 0) * (item.price || 0)
                  const discountAmount = item.discount || 0
                  const afterDiscount = itemTotal - discountAmount

                  return (
                    <TableRow key={index} className='border-b hover:bg-gray-50'>
                      <TableCell className='py-4'>
                        <div>
                          <p className='font-medium text-gray-800'>
                            {item.name ||
                              item.product?.name ||
                              'Item Tidak Bernama'}
                          </p>
                          {item.description && (
                            <p className='text-sm text-gray-500 mt-1'>
                              {item.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className='text-center py-4 font-medium'>
                        {item.quantity || 1}
                      </TableCell>
                      <TableCell className='text-right py-4 font-medium'>
                        {formatCurrency(item.price || 0)}
                      </TableCell>
                      <TableCell className='text-right py-4'>
                        {discountAmount > 0 ? (
                          <span className='text-red-600 font-medium'>
                            -{formatCurrency(discountAmount)}
                          </span>
                        ) : (
                          <span className='text-gray-400'>-</span>
                        )}
                      </TableCell>
                      <TableCell className='text-right py-4 font-bold text-blue-800'>
                        {formatCurrency(afterDiscount)}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className='text-center py-8 text-gray-500'
                  >
                    Tidak ada item dalam invoice ini
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Section */}
        <div className='flex justify-end mt-8'>
          <div className='w-full lg:w-96'>
            <div className='bg-gray-50 p-6 rounded-lg border'>
              <h4 className='font-semibold text-gray-800 mb-4'>
                Ringkasan Pembayaran
              </h4>
              <div className='space-y-3'>
                <div className='flex justify-between text-gray-600'>
                  <span>Subtotal:</span>
                  <span className='font-medium'>
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className='flex justify-between text-gray-600'>
                  <span>Pajak ({taxRate}%):</span>
                  <span className='font-medium'>
                    {formatCurrency(taxAmount)}
                  </span>
                </div>
                <Separator />
                <div className='flex justify-between text-lg font-bold text-gray-800'>
                  <span>Total Biaya:</span>
                  <span className='text-blue-800'>
                    {formatCurrency(totalAmount)}
                  </span>
                </div>

                {/* Payment Status */}
                <div className='mt-4 p-3 bg-blue-50 rounded border-l-4 border-blue-500'>
                  <div className='flex justify-between text-sm'>
                    <span className='text-gray-600'>Dibayar:</span>
                    <span className='font-medium'>
                      {formatCurrency(transaction.amount_paid || 0)}
                    </span>
                  </div>
                  <div className='flex justify-between text-sm mt-1'>
                    <span className='text-gray-600'>Sisa:</span>
                    <span className='font-bold text-red-600'>
                      {formatCurrency(
                        transaction.outstanding_amount || totalAmount
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Information & Notes */}
      <div className='p-8 bg-gray-50 border-t-2 border-gray-200'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          {/* Payment Info */}
          <div>
            <h4 className='font-semibold text-gray-800 mb-4'>
              Informasi Pembayaran
            </h4>
            <div className='bg-white p-4 rounded-lg border space-y-2'>
              <p className='text-sm'>
                <span className='font-medium'>Metode:</span>{' '}
                {transaction.payment_method || 'Transfer Bank'}
              </p>
              <p className='text-sm'>
                <span className='font-medium'>Bank:</span>{' '}
                {branch.bank || 'Bank ABC'}
              </p>
              <p className='text-sm'>
                <span className='font-medium'>No. Rekening:</span>{' '}
                {branch.account_number || '2007-2001-0201-2000'}
              </p>
              <p className='text-sm'>
                <span className='font-medium'>Atas Nama:</span>{' '}
                {branch.account_name || branch.name}
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h4 className='font-semibold text-gray-800 mb-4'>
              Catatan Penting
            </h4>
            <div className='bg-white p-4 rounded-lg border'>
              <ul className='text-sm space-y-2 text-gray-600'>
                <li className='flex items-start'>
                  <span className='text-blue-500 mr-2'>•</span>
                  Harga sudah termasuk pajak sesuai ketentuan yang berlaku
                </li>
                <li className='flex items-start'>
                  <span className='text-blue-500 mr-2'>•</span>
                  Pembayaran dilakukan maksimal 7 hari setelah invoice diterima
                </li>
                <li className='flex items-start'>
                  <span className='text-blue-500 mr-2'>•</span>
                  Konfirmasi pembayaran ke nomor yang tertera
                </li>
                <li className='flex items-start'>
                  <span className='text-blue-500 mr-2'>•</span>
                  Invoice ini sah tanpa tanda tangan basah
                </li>
              </ul>
              {transaction.notes && (
                <div className='mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded'>
                  <p className='text-sm font-medium text-gray-800'>
                    Catatan Khusus:
                  </p>
                  <p className='text-sm text-gray-600 mt-1'>
                    {transaction.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Signature */}
      <div className='p-8 border-t'>
        <div className='flex flex-col lg:flex-row justify-between items-start lg:items-end'>
          <div className='mb-6 lg:mb-0'>
            <p className='text-gray-600 text-sm'>
              Invoice ini dibuat secara elektronik dan telah diverifikasi sistem
            </p>
            <p className='text-gray-500 text-xs mt-1'>
              Dicetak pada:{' '}
              {format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: id })}
            </p>
          </div>

          <div className='text-center lg:text-right'>
            <p className='text-gray-600 mb-4'>Hormat Kami,</p>
            <div className='w-48 h-16 border-b-2 border-dashed border-gray-300 mb-2'></div>
            <p className='font-bold text-gray-800'>{signerName}</p>
            <p className='text-sm text-gray-600'>{signerPosition}</p>
            <p className='text-sm text-gray-600'>{branch.name}</p>
            <p className='text-xs text-gray-500 mt-1'>
              (Tanda Tangan & Stempel)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
