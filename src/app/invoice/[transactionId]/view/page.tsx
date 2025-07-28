'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import InvoiceTemplate from '@/components/invoice/invoice-template'
import { getTransactionById } from '@/lib/appwrite/pos' // Updated import
import { getBranchById } from '@/lib/appwrite/branches' // Updated import
import type { Branch, TransactionViewModel } from '@/lib/appwrite/types' // Updated import
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { handlePrint } from '@/lib/printHelper' // Updated import
import Link from 'next/link'

export default function InvoiceViewPage() {
  const params = useParams()
  const transactionId = params.transactionId as string

  const [transaction, setTransaction] = useState<TransactionViewModel | null>(
    null
  )
  const [branch, setBranch] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)

  const invoiceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchInvoiceData = async () => {
      if (!transactionId) {
        setError('ID Transaksi tidak valid.')
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const txData = await getTransactionById(transactionId)
        if (!txData) {
          setError('Transaksi tidak ditemukan.')
          setTransaction(null)
          setBranch(null)
          setLoading(false)
          return
        }
        setTransaction(txData)

        if (txData.branch.id) {
          const branchData = await getBranchById(txData.branch.id)
          setBranch(branchData)
        } else {
          setError('ID Cabang tidak ditemukan pada transaksi.')
          setBranch(null)
        }
      } catch (e: any) {
        console.error('Error fetching invoice data:', e)
        setError(e.message || 'Gagal memuat data invoice.')
      } finally {
        setLoading(false)
      }
    }

    fetchInvoiceData()
  }, [transactionId])

  const printInvoice = async () => {
    if (!branch) {
      toast.error('Tidak ada cabang yang dipilih.')
      return
    }
    if (!transaction) {
      toast.error('Tidak ada transaksi yang tersedia untuk dicetak.')
      return
    }
    setIsPrinting(true)
    try {
      toast.loading('Mengirim data untuk dicetak...', {
        id: 'print-loading',
      })
      const result = await handlePrint({
        printerType: '58mm',
        branch,
        transaction,
        isPrinting,
        setIsPrinting,
      })
      toast.success(result, { id: 'print-loading' })
    } catch (error) {
      toast.error('Gagal mencetak invoice.', { id: 'print-loading' })
    } finally {
      setIsPrinting(false)
    }
  }

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen bg-muted p-4'>
        <div className='w-full max-w-2xl space-y-3'>
          <Skeleton className='h-20 w-full' />
          <Skeleton className='h-40 w-full' />
          <Skeleton className='h-60 w-full' />
          <Skeleton className='h-10 w-1/3' />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center'>
        <p className='text-destructive text-lg mb-4'>{error}</p>
        <Button asChild variant='outline'>
          <Link href='/sales-history'>
            <ArrowLeft className='mr-2 h-4 w-4' /> Kembali ke Riwayat Penjualan
          </Link>
        </Button>
      </div>
    )
  }

  if (!transaction || !branch) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center'>
        <p className='text-muted-foreground text-lg mb-4'>
          Data invoice tidak lengkap.
        </p>
        <Button asChild variant='outline'>
          <Link href='/sales-history'>
            <ArrowLeft className='mr-2 h-4 w-4' /> Kembali ke Riwayat Penjualan
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className='bg-muted min-h-screen py-4 print:bg-white print:py-0'>
      <div className='fixed top-4 left-4 print:hidden z-50 flex gap-2'>
        <Button variant='outline' size='sm' asChild>
          <Link href='/sales-history'>
            <ArrowLeft className='mr-2 h-4 w-4' /> Kembali
          </Link>
        </Button>
        <Button onClick={printInvoice} size='sm'>
          <Printer className='mr-2 h-4 w-4' /> Cetak Invoice
        </Button>
      </div>
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\:shadow-none {
            box-shadow: none !important;
          }
          .print\:border-none {
            border: none !important;
          }
          .print\:my-0 {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }
          .print\:py-0 {
            padding-top: 0 !important;
            padding-bottom: 0 !importan;
          }
          .print\:bg-white {
            background-color: white !important;
          }
          .print\:border-b-2 {
            border-bottom-width: 2px !important;
          }
          .print\:border-t-2 {
            border-top-width: 2px !important;
          }
          .print\:hidden {
            display: none !important;
          }
        }
      `}</style>
      <div ref={invoiceRef} className='py-12'>
        <InvoiceTemplate transaction={transaction} branch={branch} />
      </div>
    </div>
  )
}
