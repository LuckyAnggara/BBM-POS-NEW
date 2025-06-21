// src/app/admin/settings/SystemUtilities.tsx
'use client'

import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DatabaseZap, AlertTriangle } from 'lucide-react'
import { getInventoryItems, type InventoryItem } from '@/lib/appwrite/inventory' // Ganti ke Appwrite jika sudah
import {
  addStockMutation,
  checkIfInitialStockExists,
} from '@/lib/appwrite/stockMutations' // Pastikan path ini benar
import { Timestamp } from 'firebase/firestore' // Jika masih menggunakan Timestamp Firebase
import type { UserData, Branch } from '@/lib/appwrite/types' // Pastikan path ini benar
import type { Models } from 'appwrite'
import type { ToastFn } from '@/hooks/use-toast' // Asumsi tipe ini ada

interface SystemUtilitiesProps {
  adminSelectedBranch: Branch | null
  currentUser: Models.User<Models.Preferences> | null
  userData: UserData | null
  toast: ToastFn
}

export default function SystemUtilities({
  adminSelectedBranch,
  currentUser,
  userData,
  toast,
}: SystemUtilitiesProps) {
  const [isInitializingMutations, setIsInitializingMutations] = useState(false)
  const [showInitializeConfirm, setShowInitializeConfirm] = useState(false)

  const handleInitializeStockMutations = async () => {
    if (!adminSelectedBranch || !currentUser || !userData) {
      toast.error('Cabang atau data admin tidak valid.')
      return
    }
    setShowInitializeConfirm(false)
    setIsInitializingMutations(true)
    toast.info(`Memproses produk untuk cabang ${adminSelectedBranch.name}...`, {
      duration: 5000,
    })

    try {
      const inventoryResult = await getInventoryItems(adminSelectedBranch.id)
      const itemsToProcess = inventoryResult.items

      let initializedCount = 0
      let skippedCount = 0
      let errorCount = 0

      for (const item of itemsToProcess) {
        try {
          const alreadyInitialized = await checkIfInitialStockExists(
            item.id, // Appwrite $id
            adminSelectedBranch.id
          )
          if (alreadyInitialized) {
            skippedCount++
            continue
          }

          const mutationResult = await addStockMutation({
            branchId: adminSelectedBranch.id,
            itemId: item.id, // Appwrite $id
            itemName: item.name,
            sku: item.sku,
            mutationTime: new Date().toISOString(), // Appwrite uses ISO strings
            type: 'INITIAL_STOCK',
            quantityChange: item.stock, // Ganti dari item.quantity ke item.stock
            currentProductStock: 0, // Stok awal dianggap 0 sebelum mutasi ini
            notes: 'Inisialisasi stok awal sistem',
            userId: currentUser.$id,
            userName: userData.name,
          })

          // Appwrite functions typically throw on error, or return a specific error structure
          // This part might need adjustment based on how your Appwrite addStockMutation handles errors
          // if (mutationResult && 'error' in mutationResult) {
          //   console.error(
          //     `Gagal inisialisasi ${item.name}: ${mutationResult.error}`
          //   )
          //   errorCount++
          // } else {
          initializedCount++
          // }
        } catch (e: any) {
          console.error(`Error saat memproses ${item.name}: ${e.message}`)
          errorCount++
        }
      }
      toast.success('Inisialisasi Selesai', {
        description: `Total produk: ${itemsToProcess.length}. Diinisialisasi: ${initializedCount}. Dilewati: ${skippedCount}. Gagal: ${errorCount}.`,
        duration: 10000,
      })
    } catch (error: any) {
      toast.error('Gagal Memuat Produk', {
        description:
          error.message ||
          'Tidak dapat memuat daftar produk untuk inisialisasi.',
      })
    } finally {
      setIsInitializingMutations(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base font-semibold'>
          Utilitas Sistem
        </CardTitle>
        <CardDescription className='text-xs'>
          Alat bantu untuk pengelolaan data sistem tingkat lanjut.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='p-4 border rounded-md'>
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2'>
            <div>
              <h3 className='text-sm font-medium'>
                Inisialisasi Mutasi Stok Awal
              </h3>
              <p className='text-xs text-muted-foreground mt-0.5'>
                Buat catatan mutasi "Stok Awal" untuk semua produk di cabang
                terpilih saat ini. <br />
                Ini diperlukan agar laporan mutasi memiliki basis yang benar.
              </p>
              <p className='text-xs text-destructive mt-1'>
                <AlertTriangle className='inline-block h-3.5 w-3.5 mr-1' />
                Hanya jalankan satu kali per produk per cabang.
              </p>
            </div>
            <Button
              size='sm'
              className='text-xs h-8 mt-2 sm:mt-0'
              variant='outline'
              onClick={() => setShowInitializeConfirm(true)}
              disabled={!adminSelectedBranch || isInitializingMutations}
            >
              <DatabaseZap className='mr-1.5 h-3.5 w-3.5' />
              {isInitializingMutations
                ? 'Memproses...'
                : 'Inisialisasi Stok Cabang Ini'}
            </Button>
          </div>
          {!adminSelectedBranch && (
            <p className='text-xs text-amber-600 mt-2'>
              Pilih cabang dari dropdown di sidebar kiri bawah untuk
              mengaktifkan utilitas ini.
            </p>
          )}
        </div>
      </CardContent>
      <AlertDialog
        open={showInitializeConfirm}
        onOpenChange={setShowInitializeConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Konfirmasi Inisialisasi Mutasi Stok
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              Anda akan membuat catatan mutasi "Stok Awal" untuk SEMUA produk
              yang ada di cabang{' '}
              <strong>{adminSelectedBranch?.name || 'N/A'}</strong>. Proses ini
              menggunakan jumlah stok produk saat ini sebagai basis. <br />
              <br />
              <span className='font-semibold text-destructive'>PERHATIAN:</span>
              <ul className='list-disc pl-4 mt-1'>
                <li>
                  Tindakan ini sebaiknya hanya dijalankan SATU KALI per produk
                  per cabang.
                </li>
                <li>
                  Jika sudah pernah dijalankan, produk yang telah memiliki
                  mutasi "Stok Awal" akan dilewati.
                </li>
                <li>
                  Pastikan data inventaris Anda sudah akurat sebelum
                  melanjutkan.
                </li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className='text-xs h-8'
              onClick={() => setShowInitializeConfirm(false)}
              disabled={isInitializingMutations}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              className='text-xs h-8'
              onClick={handleInitializeStockMutations}
              disabled={isInitializingMutations}
            >
              {isInitializingMutations
                ? 'Memproses...'
                : 'Ya, Lanjutkan Inisialisasi'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
