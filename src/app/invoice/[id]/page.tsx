'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import InvoiceTemplate from '@/components/invoice/invoice-template'
import { getInvoiceById } from '@/lib/laravel/invoiceService'
import { getBranchById } from '@/lib/laravel/branches'
import type { Branch, Invoice } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft, Edit, Save } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { handlePrint } from '@/lib/printHelper' // Updated import
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export default function InvoiceViewPage() {
  const params = useParams()
  const transactionId = params.id as string

  const [transaction, setTransaction] = useState<Invoice | null>(null)
  const [branch, setBranch] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [signatureName, setSignatureName] = useState('')
  const [signaturePosition, setSignaturePosition] = useState('')
  const [showSignatureDialog, setShowSignatureDialog] = useState(false)

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
        const txData = await getInvoiceById(Number(transactionId))
        if (!txData) {
          setError('Transaksi tidak ditemukan.')
          setTransaction(null)
          setBranch(null)
          setLoading(false)
          return
        }
        setTransaction(txData)

        // Set signature values if available
        if (txData.signature_name) {
          setSignatureName(txData.signature_name)
        } else if (txData.user?.name) {
          setSignatureName(txData.user.name)
        } else {
          setSignatureName('Manager Proyek')
        }

        if (txData.signature_position) {
          setSignaturePosition(txData.signature_position)
        } else if (txData.user?.role) {
          setSignaturePosition(txData.user.role)
        } else {
          setSignaturePosition('Manager')
        }

        if (txData.branch?.id || txData.branch_id) {
          const branchId = txData.branch?.id || txData.branch_id
          const branchData = await getBranchById(Number(branchId))
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
      })
      toast.success(result, { id: 'print-loading' })
    } catch (error) {
      toast.error('Gagal mencetak invoice.', { id: 'print-loading' })
    } finally {
      setIsPrinting(false)
    }
  }

  const updateSignature = () => {
    if (!transaction) return

    // Create a new transaction with updated signature fields
    const updatedTransaction = {
      ...transaction,
      signature_name: signatureName,
      signature_position: signaturePosition,
    }

    setTransaction(updatedTransaction)
    setShowSignatureDialog(false)
    toast.success('Tanda tangan berhasil diperbarui')
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
        <Dialog
          open={showSignatureDialog}
          onOpenChange={setShowSignatureDialog}
        >
          <DialogTrigger asChild>
            <Button variant='outline' size='sm'>
              <Edit className='mr-2 h-4 w-4' />
              Edit Tanda Tangan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Tanda Tangan</DialogTitle>
            </DialogHeader>
            <div className='space-y-4 py-2'>
              <div className='space-y-2'>
                <Label htmlFor='signature-name'>Nama Penandatangan</Label>
                <Input
                  id='signature-name'
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='signature-position'>Jabatan</Label>
                <Input
                  id='signature-position'
                  value={signaturePosition}
                  onChange={(e) => setSignaturePosition(e.target.value)}
                />
              </div>
              <Button onClick={updateSignature} className='w-full'>
                <Save className='mr-2 h-4 w-4' />
                Simpan Perubahan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
        <InvoiceTemplate
          transaction={{
            ...transaction,
            signature_name: signatureName,
            signature_position: signaturePosition,
            items: transaction.items || [],
          }}
          branch={branch}
        />
      </div>
    </div>
  )
}
