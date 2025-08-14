// src/app/admin/settings/SystemUtilities.tsx
'use client'

import React, { useState, useEffect } from 'react'
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
import {
  DatabaseZap,
  AlertTriangle,
  CalendarCheck2,
  CalendarPlus,
  FileDown,
  ListTree,
} from 'lucide-react'
// Legacy code references replaced; below utilities remain temporarily until full migration
import type { Models } from 'appwrite'
// Using toast passed from parent; no explicit ToastFn type available
import {
  fetchInventoryYearStatus,
  closeInventoryYear,
  openInventoryYear,
  fetchClosingDetail,
  exportClosingCsv,
  fetchBranchStatus,
  closeInventoryYearBranch,
  openInventoryYearBranch,
  type YearStatusRow,
  type SnapshotDetailRow,
  type BranchStatusRow,
} from '@/lib/laravel/inventorySnapshots'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
// removed manual branch input usage
import { Eye } from 'lucide-react'
import { Branch, User } from '@/lib/types'

interface SystemUtilitiesProps {
  adminSelectedBranch: Branch | null
  userData: User | null
  // Using any for toast to stay compatible with existing toast lib signature
  toast: any
}

export default function SystemUtilities({ toast }: SystemUtilitiesProps) {
  // Year / type states
  const currentYear = new Date().getFullYear()
  const [yearStatus, setYearStatus] = useState<YearStatusRow[]>([])
  const [loadingYearStatus, setLoadingYearStatus] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [detailType, setDetailType] = useState<'closing' | 'opening'>('closing')

  // Detail states
  const [details, setDetails] = useState<SnapshotDetailRow[] | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [detailBranchId, setDetailBranchId] = useState<number | null>(null)

  // Branch status / bulk processing states
  const [branchStatus, setBranchStatus] = useState<BranchStatusRow[]>([])
  const [loadingBranchStatus, setLoadingBranchStatus] = useState(false)
  const [branchSelection, setBranchSelection] = useState<string>('all')
  const [processingBranches, setProcessingBranches] = useState(false)
  const [branchProgress, setBranchProgress] = useState({
    done: 0,
    total: 0,
    current: 0 as number | null,
  })
  const [pendingBulk, setPendingBulk] = useState<{
    type: 'closing' | 'opening'
    targets: number[]
  } | null>(null)

  // Year closing/opening states
  const [processingYearOp, setProcessingYearOp] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [showOpenConfirm, setShowOpenConfirm] = useState(false)
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)

  // Helpers
  const hasClosing = (year: number) =>
    !!yearStatus.find((r) => Number(r.year) === year && r.closing > 0)
  const hasOpening = (year: number) =>
    !!yearStatus.find((r) => Number(r.year) === year && r.opening > 0)

  // Load year status
  const refreshYearStatus = async () => {
    setLoadingYearStatus(true)
    try {
      const rows = await fetchInventoryYearStatus()
      setYearStatus(rows.sort((a, b) => Number(b.year) - Number(a.year)))
      // Ensure selected year present
      if (!rows.find((r) => Number(r.year) === selectedYear)) {
        if (rows.length) setSelectedYear(Number(rows[0].year))
      }
    } catch (e: any) {
      toast.error('Gagal memuat status tahun', { description: e.message })
    } finally {
      setLoadingYearStatus(false)
    }
  }

  // Load branch status for selected year
  const refreshBranchStatus = async (year: number) => {
    setLoadingBranchStatus(true)
    try {
      const rows = await fetchBranchStatus(year)
      setBranchStatus(rows)
    } catch (e: any) {
      toast.error('Gagal memuat status cabang', { description: e.message })
    } finally {
      setLoadingBranchStatus(false)
    }
  }

  // Detail loader
  const loadDetails = async (branchId?: number) => {
    setLoadingDetails(true)
    if (branchId !== undefined) setDetailBranchId(branchId)
    try {
      const rows = await fetchClosingDetail(selectedYear, {
        branch_id: branchId ?? detailBranchId ?? undefined,
        type: detailType,
      })
      setDetails(rows)
    } catch (e: any) {
      toast.error('Gagal memuat detail snapshot', { description: e.message })
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleExport = async (branchId?: number) => {
    try {
      const exportBranchId = branchId ?? detailBranchId ?? undefined
      const blob = await exportClosingCsv(selectedYear, {
        branch_id: exportBranchId,
        type: detailType,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventory_${detailType}_${selectedYear}${
        exportBranchId ? `_branch${exportBranchId}` : ''
      }.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      toast.error('Gagal export CSV', { description: e.message })
    }
  }

  // Bulk processing helpers
  const processBranchClosing = async (targets: number[]) => {
    setProcessingBranches(true)
    setBranchProgress({ done: 0, total: targets.length, current: null })
    for (const id of targets) {
      setBranchProgress((p) => ({ ...p, current: id }))
      try {
        await closeInventoryYearBranch(selectedYear, id)
      } catch (e: any) {
        console.warn('Closing cabang gagal', id, e)
      }
      setBranchProgress((p) => ({ ...p, done: p.done + 1 }))
    }
    setProcessingBranches(false)
    refreshBranchStatus(selectedYear)
    toast.success('Closing cabang selesai')
  }
  const processBranchOpening = async (targets: number[]) => {
    setProcessingBranches(true)
    setBranchProgress({ done: 0, total: targets.length, current: null })
    for (const id of targets) {
      setBranchProgress((p) => ({ ...p, current: id }))
      try {
        await openInventoryYearBranch(selectedYear + 1, id)
      } catch (e: any) {
        console.warn('Opening cabang gagal', id, e)
      }
      setBranchProgress((p) => ({ ...p, done: p.done + 1 }))
    }
    setProcessingBranches(false)
    refreshBranchStatus(selectedYear)
    toast.success('Opening cabang selesai')
  }

  const startBulk = (type: 'closing' | 'opening') => {
    let targets: number[] = []
    if (branchSelection === 'all') {
      targets = branchStatus
        .filter((b) => (type === 'closing' ? !b.closing_done : !b.opening_done))
        .map((b) => b.branch_id)
    } else {
      const id = Number(branchSelection)
      if (!isNaN(id)) targets = [id]
    }
    if (!targets.length) {
      toast.info('Tidak ada cabang yang perlu diproses')
      return
    }
    setPendingBulk({ type, targets })
    setShowBulkConfirm(true)
  }

  const confirmBulk = async () => {
    if (!pendingBulk) return
    setShowBulkConfirm(false)
    if (pendingBulk.type === 'closing')
      await processBranchClosing(pendingBulk.targets)
    else await processBranchOpening(pendingBulk.targets)
    setPendingBulk(null)
  }

  // Year operations
  const handleCloseYear = async () => {
    setProcessingYearOp(true)
    try {
      await closeInventoryYear({ year: selectedYear })
      toast.success('Closing berhasil')
    } catch (e: any) {
      toast.error('Gagal closing', { description: e.message })
    } finally {
      setProcessingYearOp(false)
      refreshYearStatus()
      refreshBranchStatus(selectedYear)
    }
  }
  const handleOpenYear = async () => {
    setProcessingYearOp(true)
    try {
      await openInventoryYear(selectedYear + 1)
      toast.success('Opening berhasil')
    } catch (e: any) {
      toast.error('Gagal opening', { description: e.message })
    } finally {
      setProcessingYearOp(false)
      refreshYearStatus()
      refreshBranchStatus(selectedYear)
    }
  }

  // Effects
  useEffect(() => {
    refreshYearStatus()
  }, [])
  useEffect(() => {
    if (selectedYear) {
      refreshBranchStatus(selectedYear)
      setDetails(null)
      setDetailBranchId(null)
    }
  }, [selectedYear, detailType])

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className='text-base font-semibold'>
            Utilitas Sistem
          </CardTitle>
          <CardDescription className='text-xs'>
            Alat bantu untuk pengelolaan data sistem tingkat lanjut.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4 text-xs'>
          <div className='flex flex-wrap gap-4 items-end'>
            <div className='flex flex-col'>
              <span className='mb-1 font-medium'>Pilih Tahun</span>
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(Number(v))}
              >
                <SelectTrigger className='h-8 w-40'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearStatus.map((r) => (
                    <SelectItem key={r.year} value={String(r.year)}>
                      {r.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='flex flex-col'>
              <span className='mb-1 font-medium'>Tipe</span>
              <Select
                value={detailType}
                onValueChange={(v) => setDetailType(v as any)}
              >
                <SelectTrigger className='h-8 w-36'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='closing'>Closing</SelectItem>
                  <SelectItem value='opening'>Opening</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='flex gap-2'>
              <Button
                size='sm'
                variant='outline'
                className='h-8'
                onClick={() => setShowCloseConfirm(true)}
                disabled={processingYearOp || hasClosing(selectedYear)}
              >
                {' '}
                <CalendarCheck2 className='h-3.5 w-3.5 mr-1' />{' '}
                {hasClosing(selectedYear)
                  ? 'Closing Sudah Ada'
                  : `Closing ${selectedYear}`}{' '}
              </Button>
              <Button
                size='sm'
                variant='outline'
                className='h-8'
                onClick={() => setShowOpenConfirm(true)}
                disabled={
                  processingYearOp ||
                  !hasClosing(selectedYear) ||
                  hasOpening(selectedYear + 1)
                }
              >
                {' '}
                <CalendarPlus className='h-3.5 w-3.5 mr-1' />{' '}
                {hasOpening(selectedYear + 1)
                  ? `Opening ${selectedYear + 1} Ada`
                  : `Opening ${selectedYear + 1}`}{' '}
              </Button>
              <Button
                size='sm'
                variant='secondary'
                className='h-8'
                onClick={refreshYearStatus}
                disabled={loadingYearStatus || processingYearOp}
              >
                Refresh Status
              </Button>
            </div>
          </div>

          {/* Branch status & bulk actions */}
          <div className='space-y-2 pt-2 border-t'>
            <div className='flex flex-wrap gap-2 items-end'>
              <div className='flex flex-col'>
                <span className='mb-1'>Pilih Cabang</span>
                <Select
                  value={branchSelection}
                  onValueChange={setBranchSelection}
                >
                  <SelectTrigger className='h-8 w-56'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>Semua Cabang</SelectItem>
                    {branchStatus.map((b) => (
                      <SelectItem key={b.branch_id} value={String(b.branch_id)}>
                        {b.branch_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='flex gap-2'>
                <Button
                  size='sm'
                  variant='outline'
                  className='h-8'
                  disabled={processingBranches || loadingBranchStatus}
                  onClick={() => startBulk('closing')}
                >
                  Closing Cabang
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  className='h-8'
                  disabled={processingBranches || loadingBranchStatus}
                  onClick={() => startBulk('opening')}
                >
                  Opening Cabang
                </Button>
                <Button
                  size='sm'
                  variant='secondary'
                  className='h-8'
                  disabled={processingBranches || loadingBranchStatus}
                  onClick={() => refreshBranchStatus(selectedYear)}
                >
                  Refresh Cabang
                </Button>
              </div>
            </div>
            <div className='overflow-x-auto border rounded-md max-h-60 text-[11px]'>
              {loadingBranchStatus ? (
                <p className='p-3'>Memuat status cabang...</p>
              ) : branchStatus.length === 0 ? (
                <p className='p-3 text-muted-foreground'>
                  Tidak ada data cabang.
                </p>
              ) : (
                <table className='w-full'>
                  <thead className='bg-muted sticky top-0'>
                    <tr>
                      <th className='px-2 py-1 text-left'>Cabang</th>
                      <th className='px-2 py-1 text-right'>Produk</th>
                      <th className='px-2 py-1 text-right'>Closing</th>
                      <th className='px-2 py-1 text-right'>Opening</th>
                      <th className='px-2 py-1 text-right'>Nilai Closing</th>
                      <th className='px-2 py-1 text-right'>Nilai Opening</th>
                      <th className='px-2 py-1 text-center'>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchStatus.map((b) => (
                      <tr key={b.branch_id} className='border-t'>
                        <td className='px-2 py-1'>{b.branch_name}</td>
                        <td className='px-2 py-1 text-right'>
                          {b.total_products}
                        </td>
                        <td className='px-2 py-1 text-right'>
                          {b.closing_done ? (
                            <span className='text-green-600 font-medium'>
                              OK
                            </span>
                          ) : (
                            `${b.closing_count}/${b.total_products}`
                          )}
                        </td>
                        <td className='px-2 py-1 text-right'>
                          {b.opening_done ? (
                            <span className='text-green-600 font-medium'>
                              OK
                            </span>
                          ) : (
                            `${b.opening_count}/${b.total_products}`
                          )}
                        </td>
                        <td className='px-2 py-1 text-right'>
                          {b.closing_value.toLocaleString('id-ID', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className='px-2 py-1 text-right'>
                          {b.opening_value.toLocaleString('id-ID', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className='px-2 py-1 text-center space-x-1'>
                          <Button
                            size='icon'
                            variant='ghost'
                            className='h-6 w-6'
                            onClick={() => loadDetails(b.branch_id)}
                            disabled={loadingDetails || processingBranches}
                          >
                            <Eye className='h-3.5 w-3.5' />
                          </Button>
                          <Button
                            size='icon'
                            variant='ghost'
                            className='h-6 w-6'
                            onClick={() => handleExport(b.branch_id)}
                            disabled={processingBranches}
                          >
                            <FileDown className='h-3.5 w-3.5' />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {processingBranches && (
              <div className='text-xs mt-2 flex items-center gap-2'>
                <div className='animate-spin h-4 w-4 rounded-full border-2 border-primary border-t-transparent'></div>
                Memproses cabang ({branchProgress.done}/{branchProgress.total})
                {branchProgress.current
                  ? ` - Cabang ID ${branchProgress.current}`
                  : ''}
                ...
              </div>
            )}
          </div>

          {/* Detail table */}
          <div className='pt-4 mt-4 border-t'>
            <h4 className='font-medium text-xs mb-2'>
              Detail Snapshot {detailType} {selectedYear}
              {detailBranchId ? ` - Cabang ${detailBranchId}` : ''}
            </h4>
            <div className='overflow-x-auto border rounded-md max-h-72 text-[11px]'>
              {loadingDetails ? (
                <p className='p-3'>Memuat detail...</p>
              ) : !details ? (
                <p className='p-3 text-muted-foreground'>
                  Klik icon mata pada cabang untuk melihat detail.
                </p>
              ) : details.length === 0 ? (
                <p className='p-3 text-muted-foreground'>Data kosong.</p>
              ) : (
                <table className='w-full'>
                  <thead className='bg-muted sticky top-0'>
                    <tr>
                      <th className='px-2 py-1 text-left'>Produk</th>
                      <th className='px-2 py-1 text-right'>Qty</th>
                      <th className='px-2 py-1 text-right'>Harga</th>
                      <th className='px-2 py-1 text-right'>Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((d) => (
                      <tr
                        key={d.product_id + ':' + (d.branch_id ?? '')}
                        className='border-t'
                      >
                        <td className='px-2 py-1'>
                          {d.product_name || d.product_id}
                        </td>
                        <td className='px-2 py-1 text-right'>{d.quantity}</td>
                        <td className='px-2 py-1 text-right'>
                          {d.cost_price.toLocaleString('id-ID', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className='px-2 py-1 text-right'>
                          {d.value_amount.toLocaleString('id-ID', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className='flex gap-2 mt-2'>
              <Button
                size='sm'
                variant='outline'
                className='h-8'
                onClick={() => loadDetails()}
                disabled={!detailBranchId || loadingDetails}
              >
                Refresh Detail
              </Button>
              <Button
                size='sm'
                variant='outline'
                className='h-8'
                onClick={() => handleExport()}
                disabled={!detailBranchId}
              >
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Year dialogs */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Konfirmasi Closing Tahun {selectedYear}
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              Menyimpan snapshot stok semua produk sebagai closing{' '}
              {selectedYear}. Tidak mengubah stok berjalan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='text-xs h-8'>Batal</AlertDialogCancel>
            <AlertDialogAction
              className='text-xs h-8'
              onClick={handleCloseYear}
              disabled={processingYearOp}
            >
              Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showOpenConfirm} onOpenChange={setShowOpenConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Konfirmasi Opening Tahun {selectedYear + 1}
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              Membuat snapshot opening {selectedYear + 1} dari data closing{' '}
              {selectedYear}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='text-xs h-8'>Batal</AlertDialogCancel>
            <AlertDialogAction
              className='text-xs h-8'
              onClick={handleOpenYear}
              disabled={processingYearOp}
            >
              Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk dialog */}
      <AlertDialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Konfirmasi Proses{' '}
              {pendingBulk?.type === 'closing' ? 'Closing' : 'Opening'} Cabang
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              {pendingBulk?.targets.length || 0} cabang akan diproses. Hanya
              cabang yang belum selesai dipilih otomatis ketika memilih Semua
              Cabang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='text-xs h-8'>Batal</AlertDialogCancel>
            <AlertDialogAction
              className='text-xs h-8'
              onClick={confirmBulk}
              disabled={processingBranches}
            >
              Mulai
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
