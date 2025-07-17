'use client'

import type { Branch, TransactionViewModel } from '@/lib/appwrite/types'
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
import { format, parseISO, isValid } from 'date-fns' // Impor dari date-fns

interface InvoiceTemplateProps {
  transaction: TransactionViewModel
  branch: Branch
}

export default function InvoiceTemplate({
  transaction,
  branch,
}: InvoiceTemplateProps) {
  // PERBAIKAN #1: Menggunakan date-fns untuk memformat ISO string dari Appwrite
  const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A'
    const date = parseISO(isoString)
    if (!isValid(date)) return 'Tanggal tidak valid'
    // Format contoh: 30 Jun 2025, 10:50
    return format(date, 'dd MMM yyyy, HH:mm')
  }

  const formatCurrency = (amount: number) => {
    return `${branch.currency || 'Rp'}${amount.toLocaleString('id-ID')}`
  }

  const cashierName = `Kasir: ${transaction.user.name || 'N/A'}`

  return (
    <Card className='w-full max-w-4xl mx-auto my-4 shadow-lg print:shadow-none print:border-none print:my-0'>
      <CardHeader className='p-4 sm:p-6 border-b print:border-b-2'>
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center'>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold text-primary'>
              {branch.invoiceName || branch.name}
            </h1>
            {branch.address && (
              <p className='text-xs text-muted-foreground'>{branch.address}</p>
            )}
            {branch.phoneNumber && (
              <p className='text-xs text-muted-foreground'>
                Telp: {branch.phoneNumber}
              </p>
            )}
          </div>
          <div className='mt-2 sm:mt-0 text-left sm:text-right'>
            <h2 className='text-lg sm:text-xl font-semibold'>INVOICE</h2>
            <p className='text-xs text-muted-foreground'>
              No: {transaction.transactionNumber}
            </p>
            <p className='text-xs text-muted-foreground'>
              {/* Menggunakan fungsi format tanggal yang sudah diperbaiki */}
              Tanggal: {formatDate(transaction.$createdAt)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className='p-4 sm:p-6'>
        <div className='mb-4 text-xs'>
          <div className='grid grid-cols-2 gap-x-2'>
            <div>
              <p>{cashierName}</p>
              {transaction.customerName && (
                <p>Pelanggan: {transaction.customerName}</p>
              )}
            </div>
            <div className='text-right'>
              <p>
                Metode Pembayaran:{' '}
                <span className='capitalize'>{transaction.paymentMethod}</span>
              </p>
            </div>
          </div>
        </div>

        <Table className='text-xs'>
          <TableHeader>
            <TableRow>
              <TableHead className='px-2 py-1.5'>Nama Produk</TableHead>
              <TableHead className='text-center px-2 py-1.5'>Jml</TableHead>
              <TableHead className='text-right px-2 py-1.5'>
                Harga Satuan
              </TableHead>
              <TableHead className='text-right px-2 py-1.5'>Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transaction.items.map((item) => {
              {
                item
              }
              // PERBAIKAN #2: Logika untuk menampilkan detail harga & diskon per item
              const hasItemDiscount = item.discountAmount > 0
              // Rekonstruksi harga asli per unit jika ada diskon
              const originalPricePerUnit = item
              const discountPerUnit = hasItemDiscount ? item.discountAmount : 0

              return (
                <TableRow key={item.productId}>
                  <TableCell className='font-medium px-2 py-1'>
                    {item.productName}
                    {/* Tampilkan detail diskon HANYA jika ada */}
                    {hasItemDiscount && (
                      <div className='text-[0.7rem] text-muted-foreground pl-2'>
                        <span className='line-through'>
                          {formatCurrency(originalPricePerUnit)}
                        </span>
                        <span className='ml-1 text-red-600'>
                          (-{formatCurrency(discountPerUnit)})
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className='text-center px-2 py-1'>
                    {item.quantity}
                  </TableCell>
                  <TableCell className='text-right px-2 py-1'>
                    {formatCurrency(item.priceAtSale)}
                  </TableCell>
                  <TableCell className='text-right px-2 py-1'>
                    {formatCurrency(item.subtotal)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        <Separator className='my-3 sm:my-4' />

        <div className='grid grid-cols-2 gap-x-4 text-xs'>
          <div className='space-y-0.5 text-right col-start-2'>
            <div className='flex justify-between'>
              <span>Subtotal:</span>
              <span>{formatCurrency(transaction.subtotal)}</span>
            </div>

            {/* PERBAIKAN #3: Tampilkan total diskon jika ada */}
            {transaction.totalDiscountAmount > 0 && (
              <div className='flex justify-between text-destructive'>
                <span>Diskon:</span>
                <span>-{formatCurrency(transaction.totalDiscountAmount)}</span>
              </div>
            )}

            <div className='flex justify-between'>
              <span>Pajak ({branch.taxRate || 0}%):</span>
              <span>{formatCurrency(transaction.taxAmount)}</span>
            </div>

            <Separator className='my-1' />

            <div className='flex justify-between font-bold text-sm'>
              <span>Total:</span>
              <span>{formatCurrency(transaction.totalAmount)}</span>
            </div>

            {transaction.paymentMethod === 'cash' && (
              <>
                <div className='flex justify-between mt-1'>
                  <span>Bayar:</span>
                  <span>{formatCurrency(transaction.amountPaid)}</span>
                </div>
                <div className='flex justify-between'>
                  <span>Kembali:</span>
                  <span>{formatCurrency(transaction.changeGiven)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className='p-4 sm:p-6 border-t print:border-t-2'>
        <p className='text-xs text-muted-foreground text-center w-full'>
          Terima kasih atas kunjungan Anda!
        </p>
      </CardFooter>
    </Card>
  )
}
