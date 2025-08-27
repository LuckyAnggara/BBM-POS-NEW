'use client'

import type { Branch, Invoice, InvoiceItem } from '@/lib/types'
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
interface ExtendedInvoiceItem extends InvoiceItem {
  discount?: number
  name?: string
  product?: {
    name?: string
  }
}

interface ExtendedInvoice extends Invoice {
  tax_rate?: number
  invoice_type?: string
  type?: 'purchase' | 'sale' | 'invoice'
  items?: ExtendedInvoiceItem[]
  invoice_date?: string
  payment_method?: string
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
  const signerName = transaction.user?.name || 'Manager Proyek'
  const signerPosition = transaction.user?.role || 'Manager'

  return (
    <Card className='w-full max-w-4xl mx-auto my-4 shadow-lg print:shadow-none print:border-none print:my-0'>
      <CardHeader className='p-6 border-b print:border-b-2'>
        {/* Header with invoice title */}
        <div className='w-full bg-red-100 mb-4 py-2 text-center'>
          <h1 className='text-xl font-bold uppercase'>{invoiceType}</h1>
        </div>

        {/* Company info and logo */}
        <div className='flex flex-col sm:flex-row justify-between items-start gap-4'>
          <div>
            <h2 className='font-bold text-lg'>
              {branch.invoice_name || branch.name}
            </h2>
            <p className='text-sm'>{branch.address || 'Alamat perusahaan'}</p>
            <p className='text-sm'>Telp: {branch.phone || '000-000-000'}</p>
            <p className='text-sm'>
              Email: {branch.email || 'email@perusahaan.com'}
            </p>
            {branch.branch_name && (
              <p className='text-sm'>Cabang: {branch.branch_name}</p>
            )}
          </div>

          <div className='w-32 h-32 relative flex-shrink-0'>
            {branch.logo ? (
              <Image
                src={branch.logo}
                alt='Logo Perusahaan'
                fill
                className='object-contain'
              />
            ) : (
              <div className='w-full h-full flex items-center justify-center border border-dashed'>
                <span className='text-muted-foreground text-sm text-center'>
                  Logo Perusahaan
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className='p-6'>
        {/* Invoice details */}
        <div className='grid grid-cols-2 gap-4 mb-6'>
          <div>
            <table className='text-sm w-full'>
              <tbody>
                <tr>
                  <td className='py-1 font-medium'>Nomor Invoice:</td>
                  <td className='py-1'>{invoiceNumber}</td>
                </tr>
                <tr>
                  <td className='py-1 font-medium'>Tanggal Invoice:</td>
                  <td className='py-1'>{formatDateIntl(invoiceDate)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <p className='font-medium mb-1'>Kepada Yth</p>
            <p className='font-medium'>{recipientName}</p>
            <p className='text-sm'>{recipientAddress}</p>
            <p className='text-sm'>Telp: {recipientPhone}</p>
            <p className='text-sm'>Email: {recipientEmail}</p>
          </div>
        </div>

        {/* Invoice items */}
        <div>
          <p className='font-medium mb-2'>Rincian Biaya:</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-[50%]'>Deskripsi</TableHead>
                <TableHead className='text-center'>Jumlah</TableHead>
                <TableHead className='text-right'>Harga</TableHead>
                <TableHead className='text-right'>Diskon</TableHead>
                <TableHead className='text-right'>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transaction.items && transaction.items.length > 0 ? (
                transaction.items.map((item, index) => {
                  const itemTotal = (item.quantity || 0) * (item.price || 0)
                  const discountAmount = item.discount || 0
                  const afterDiscount = itemTotal - discountAmount

                  return (
                    <TableRow key={index}>
                      <TableCell>
                        {item.name ||
                          item.product?.name ||
                          'Item Tidak Bernama'}
                      </TableCell>
                      <TableCell className='text-center'>
                        {item.quantity || 1}
                      </TableCell>
                      <TableCell className='text-right'>
                        {formatCurrency(item.price || 0)}
                      </TableCell>
                      <TableCell className='text-right'>
                        {discountAmount > 0
                          ? formatCurrency(discountAmount)
                          : '-'}
                      </TableCell>
                      <TableCell className='text-right'>
                        {formatCurrency(afterDiscount)}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className='text-center'>
                    Tidak ada item
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Totals */}
        <div className='flex justify-end mt-6'>
          <div className='w-1/2'>
            <div className='flex justify-between py-2'>
              <span>Subtotal:</span>
              <span className='font-medium'>{formatCurrency(subtotal)}</span>
            </div>
            <div className='flex justify-between py-2 border-b'>
              <span>Pajak {taxRate}%:</span>
              <span className='font-medium'>{formatCurrency(taxAmount)}</span>
            </div>
            <div className='flex justify-between py-2 font-bold'>
              <span>Total Biaya:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Payment information */}
        <div className='mt-6'>
          <p className='font-medium'>
            Metode Pembayaran: {transaction.payment_method || 'Transfer Bank'}
          </p>
          <p className='text-sm'>
            Nomor Rekening: {branch.account_number || '2007-2001-0201-2000'} (
            {branch.bank || 'Bank ABC'}, a.n.{' '}
            {branch.account_name || branch.name})
          </p>
        </div>

        {/* Notes */}
        <div className='mt-4'>
          <p className='font-medium'>Notes:</p>
          <ul className='text-sm list-disc pl-5'>
            <li>Harga sudah termasuk pajak sesuai ketentuan yang berlaku.</li>
            <li>
              Pembayaran harus dilakukan maksimal 5 hari setelah menerima
              invoice
            </li>
            <li>Lakukan konfirmasi pembayaran kepada kontak tertera.</li>
          </ul>
        </div>

        {/* Signature */}
        <div className='mt-8'>
          <p>Hormat Kami,</p>
          <div className='h-20'></div>
          <p className='font-medium'>{signerName}</p>
          <p className='text-sm'>
            {signerPosition} {branch.name}
          </p>
          <p className='text-sm'>(Nama Terang)</p>
        </div>
      </CardContent>
    </Card>
  )
}
