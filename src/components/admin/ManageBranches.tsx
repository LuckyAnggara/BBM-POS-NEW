// src/app/admin/settings/ManageBranches.tsx
'use client'

import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Pencil, Trash2, KeyRound, PlusCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  createBranch,
  updateBranch,
  deleteBranch,
  type BranchInput,
} from '@/lib/appwrite/branches'
import { Branch } from '@/lib/appwrite/types' // Pastikan path ini benar
import { toast } from 'sonner'
import { useBranch } from '@/contexts/branch-context'
import { set } from 'date-fns'

interface BranchFormState {
  name: string
  invoiceName: string
  currency: string
  taxRate: string
  address: string
  phoneNumber: string
  transactionDeletionPassword?: string
}

const initialBranchFormState: BranchFormState = {
  name: '',
  invoiceName: '',
  currency: 'IDR',
  taxRate: '0',
  address: '',
  phoneNumber: '',
  transactionDeletionPassword: '',
}

interface ManageBranchesProps {
  branches: Branch[]
  loadingBranches: boolean
  refreshBranches: () => Promise<void>
  adminSelectedBranch: Branch | null
  setAdminSelectedBranchId: (id: string | null) => void
  fetchUsers: () => Promise<void> // Tambahkan ini jika ManageUsers ada di file terpisah
}

export default function ManageBranches({
  branches,
  loadingBranches,
  adminSelectedBranch,
  setAdminSelectedBranchId,
  fetchUsers,
}: ManageBranchesProps) {
  const [branchForm, setBranchForm] = useState<BranchFormState>(
    initialBranchFormState
  )
  const { refreshBranches } = useBranch()
  const [isSubmittingBranch, setIsSubmittingBranch] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [editBranchForm, setEditBranchForm] = useState<BranchFormState>(
    initialBranchFormState
  )
  const [isNewBranchModalOpen, setIsNewBranchModalOpen] = useState(false)
  const [isUpdatingBranch, setIsUpdatingBranch] = useState(false)
  const [isEditBranchModalOpen, setIsEditBranchModalOpen] = useState(false)
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null)
  const [isDeletingBranch, setIsDeletingBranch] = useState(false)

  const handleBranchFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    formSetter: React.Dispatch<React.SetStateAction<BranchFormState>>
  ) => {
    const { name, value } = e.target
    formSetter((prev) => ({ ...prev, [name]: value }))
  }

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!branchForm.name.trim()) {
      toast.error('Nama cabang kosong', {
        description: 'Silakan masukkan nama cabang.',
      })
      return
    }
    setIsSubmittingBranch(true)
    const branchInput: BranchInput = {
      name: branchForm.name,
      invoiceName: branchForm.invoiceName || branchForm.name,
      currency: branchForm.currency || 'IDR',
      taxRate: parseFloat(branchForm.taxRate) || 0,
      address: branchForm.address,
      phoneNumber: branchForm.phoneNumber,
      transactionDeletionPassword: branchForm.transactionDeletionPassword || '',
    }
    try {
      const newBranch = await createBranch(branchInput)
      toast.success('Cabang Berhasil Dibuat', {
        description: `Cabang "${newBranch.name}" telah ditambahkan.`,
      })
      setBranchForm(initialBranchFormState)
      await refreshBranches()
    } catch (error: any) {
      toast.error('Gagal Membuat Cabang', {
        description: error.message || 'Terjadi kesalahan saat membuat cabang.',
      })
    } finally {
      setIsSubmittingBranch(false)
      setIsNewBranchModalOpen(false)
    }
  }

  const handleOpenEditBranchModal = (branch: Branch) => {
    setEditingBranch(branch)
    setEditBranchForm({
      name: branch.name,
      invoiceName: branch.invoiceName || branch.name,
      currency: branch.currency || 'IDR',
      taxRate: (branch.taxRate || 0).toString(),
      address: branch.address || '',
      phoneNumber: branch.phoneNumber || '',
      transactionDeletionPassword: branch.transactionDeletionPassword || '',
    })
    setIsEditBranchModalOpen(true)
  }

  const handleUpdateBranch = async () => {
    if (!editingBranch || !editBranchForm.name.trim()) {
      toast.error('Data tidak lengkap', {
        description: 'Nama cabang tidak boleh kosong.',
      })
      return
    }
    setIsUpdatingBranch(true)
    const branchUpdates: Partial<BranchInput> = {
      name: editBranchForm.name,
      invoiceName: editBranchForm.invoiceName || editBranchForm.name,
      currency: editBranchForm.currency || 'IDR',
      taxRate: parseFloat(editBranchForm.taxRate) || 0,
      address: editBranchForm.address,
      phoneNumber: editBranchForm.phoneNumber,
      transactionDeletionPassword: editBranchForm.transactionDeletionPassword,
    }
    try {
      const updatedBranch = await updateBranch(editingBranch.id, branchUpdates)
      toast.success('Cabang Berhasil Diperbarui')
      setIsEditBranchModalOpen(false)
      setEditingBranch(null)
      await refreshBranches()
      if (adminSelectedBranch && adminSelectedBranch.id === updatedBranch.id) {
        setAdminSelectedBranchId(updatedBranch.id)
      }
    } catch (error: any) {
      toast.error('Gagal Memperbarui Cabang', {
        description:
          error.message || 'Terjadi kesalahan saat memperbarui cabang.',
      })
    } finally {
      setIsUpdatingBranch(false)
    }
  }

  const handleConfirmDeleteBranch = async () => {
    if (!branchToDelete) return
    setIsDeletingBranch(true)
    try {
      await deleteBranch(branchToDelete.id)
      toast.success('Cabang Berhasil Dihapus')
      await refreshBranches()
      await fetchUsers() // Refresh user list as their branch assignments might change
      if (adminSelectedBranch && adminSelectedBranch.id === branchToDelete.id) {
        setAdminSelectedBranchId(null) // Kosongkan pilihan jika cabang yang aktif dihapus
      }
    } catch (error: any) {
      toast.error('Gagal Menghapus Cabang', {
        description:
          error.message || 'Terjadi kesalahan saat menghapus cabang.',
      })
    } finally {
      setBranchToDelete(null)
      setIsDeletingBranch(false)
    }
  }

  const handleOpenNewBranchModal = () => {
    setIsNewBranchModalOpen(true)
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex justify-between items-center'>
          <div>
            <CardTitle className='text-base font-semibold'>
              Kelola Cabang
            </CardTitle>
            <CardDescription className='text-xs'>
              Buat, edit, hapus, dan lihat daftar cabang beserta detailnya.
            </CardDescription>
          </div>
          <Button
            size='sm'
            className='text-xs h-8'
            onClick={() => handleOpenNewBranchModal()}
          >
            <PlusCircle className='mr-1.5 h-3.5 w-3.5' /> Tambah Rekening
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div>
          <h3 className='text-sm font-medium mb-1.5 mt-4'>
            Daftar Cabang Saat Ini
          </h3>
          {loadingBranches ? (
            <div className='space-y-2'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
            </div>
          ) : branches.length > 0 ? (
            <div className='border rounded-md overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-xs'>Nama Cabang</TableHead>
                    <TableHead className='text-xs hidden sm:table-cell'>
                      Nama di Invoice
                    </TableHead>
                    <TableHead className='text-xs hidden md:table-cell'>
                      Mata Uang
                    </TableHead>
                    <TableHead className='text-xs hidden md:table-cell'>
                      Pajak (%)
                    </TableHead>
                    <TableHead className='text-xs hidden lg:table-cell'>
                      Pass. Hapus
                    </TableHead>
                    <TableHead className='text-xs text-right'>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className='text-xs py-2'>
                        {branch.name}
                      </TableCell>
                      <TableCell className='text-xs py-2 hidden sm:table-cell'>
                        {branch.invoiceName || branch.name}
                      </TableCell>
                      <TableCell className='text-xs py-2 hidden md:table-cell'>
                        {branch.currency || 'IDR'}
                      </TableCell>
                      <TableCell className='text-xs py-2 hidden md:table-cell'>
                        {branch.taxRate !== undefined ? branch.taxRate : 0}%
                      </TableCell>
                      <TableCell className='text-xs py-2 hidden lg:table-cell'>
                        {branch.transactionDeletionPassword
                          ? 'Terpasang'
                          : 'Tidak Ada'}
                      </TableCell>
                      <TableCell className='text-right py-2'>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-7 w-7'
                          onClick={() => handleOpenEditBranchModal(branch)}
                        >
                          <Pencil className='h-3.5 w-3.5' />
                          <span className='sr-only'>Edit</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-7 w-7 text-destructive hover:text-destructive/80'
                              onClick={() => setBranchToDelete(branch)}
                            >
                              <Trash2 className='h-3.5 w-3.5' />
                              <span className='sr-only'>Hapus</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Apakah Anda yakin?
                              </AlertDialogTitle>
                              <AlertDialogDescription className='text-xs'>
                                Tindakan ini akan menghapus cabang "
                                {branchToDelete?.name}". Ini tidak dapat
                                dibatalkan. Pengguna yang terhubung ke cabang
                                ini mungkin perlu ditetapkan ulang.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                className='text-xs h-8'
                                onClick={() => setBranchToDelete(null)}
                              >
                                Batal
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className='text-xs h-8 bg-destructive hover:bg-destructive/90'
                                onClick={handleConfirmDeleteBranch}
                                disabled={isDeletingBranch}
                              >
                                {isDeletingBranch
                                  ? 'Menghapus...'
                                  : 'Ya, Hapus'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className='text-xs text-muted-foreground'>
              Belum ada cabang yang dibuat.
            </p>
          )}
        </div>
      </CardContent>
      <Dialog
        open={isNewBranchModalOpen}
        onOpenChange={setIsNewBranchModalOpen}
      >
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <DialogTitle>Tambah Cabang Baru</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleCreateBranch}
            className='space-y-3 border p-4 rounded-md'
          >
            <h3 className='text-sm font-medium mb-1'>Tambah Cabang Baru</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              <div>
                <Label htmlFor='branchName' className='text-xs'>
                  Nama Cabang Utama*
                </Label>
                <Input
                  id='branchName'
                  name='name'
                  value={branchForm.name}
                  onChange={(e) => handleBranchFormChange(e, setBranchForm)}
                  placeholder='Contoh: Cabang Pusat'
                  className='h-9 text-xs'
                  disabled={isSubmittingBranch}
                />
              </div>
              <div>
                <Label htmlFor='invoiceName' className='text-xs'>
                  Nama di Invoice (Opsional)
                </Label>
                <Input
                  id='invoiceName'
                  name='invoiceName'
                  value={branchForm.invoiceName}
                  onChange={(e) => handleBranchFormChange(e, setBranchForm)}
                  placeholder='Sama seperti nama cabang jika kosong'
                  className='h-9 text-xs'
                  disabled={isSubmittingBranch}
                />
              </div>
              <div>
                <Label htmlFor='currency' className='text-xs'>
                  Mata Uang
                </Label>
                <Input
                  id='currency'
                  name='currency'
                  value={branchForm.currency}
                  onChange={(e) => handleBranchFormChange(e, setBranchForm)}
                  placeholder='IDR'
                  className='h-9 text-xs'
                  disabled={isSubmittingBranch}
                />
              </div>
              <div>
                <Label htmlFor='taxRate' className='text-xs'>
                  Tarif Pajak (%)
                </Label>
                <Input
                  id='taxRate'
                  name='taxRate'
                  type='number'
                  value={branchForm.taxRate}
                  onChange={(e) => handleBranchFormChange(e, setBranchForm)}
                  placeholder='0'
                  className='h-9 text-xs'
                  disabled={isSubmittingBranch}
                />
              </div>
            </div>
            <div>
              <Label htmlFor='address' className='text-xs'>
                Alamat
              </Label>
              <Textarea
                id='address'
                name='address'
                value={branchForm.address}
                onChange={(e) => handleBranchFormChange(e, setBranchForm)}
                placeholder='Alamat lengkap cabang'
                className='text-xs min-h-[60px]'
                disabled={isSubmittingBranch}
              />
            </div>
            <div>
              <Label htmlFor='phoneNumber' className='text-xs'>
                Nomor Telepon
              </Label>
              <Input
                id='phoneNumber'
                name='phoneNumber'
                value={branchForm.phoneNumber}
                onChange={(e) => handleBranchFormChange(e, setBranchForm)}
                placeholder='08xxxxxxxxxx'
                className='h-9 text-xs'
                disabled={isSubmittingBranch}
              />
            </div>
            <div>
              <Label
                htmlFor='transactionDeletionPasswordCreate'
                className='text-xs'
              >
                Password Hapus Transaksi (Opsional)
              </Label>
              <div className='relative'>
                <KeyRound className='absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
                <Input
                  id='transactionDeletionPasswordCreate'
                  name='transactionDeletionPassword'
                  type='password'
                  value={branchForm.transactionDeletionPassword}
                  onChange={(e) => handleBranchFormChange(e, setBranchForm)}
                  placeholder='Kosongkan jika tidak diset'
                  className='h-9 text-xs pl-8'
                  disabled={isSubmittingBranch}
                />
              </div>
            </div>
            <Button
              type='submit'
              size='sm'
              className='h-9 text-xs'
              disabled={isSubmittingBranch}
            >
              {isSubmittingBranch ? 'Membuat...' : 'Buat Cabang'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isEditBranchModalOpen}
        onOpenChange={setIsEditBranchModalOpen}
      >
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Edit Detail Cabang</DialogTitle>
          </DialogHeader>
          <div className='space-y-3 p-3 max-h-[70vh] overflow-y-auto pr-2'>
            <div>
              <Label htmlFor='editBranchName' className='text-xs'>
                Nama Cabang Utama*
              </Label>
              <Input
                id='editBranchName'
                name='name'
                value={editBranchForm.name}
                onChange={(e) => handleBranchFormChange(e, setEditBranchForm)}
                className='text-xs h-9'
              />
            </div>
            <div>
              <Label htmlFor='editInvoiceName' className='text-xs'>
                Nama di Invoice
              </Label>
              <Input
                id='editInvoiceName'
                name='invoiceName'
                value={editBranchForm.invoiceName}
                onChange={(e) => handleBranchFormChange(e, setEditBranchForm)}
                className='text-xs h-9'
              />
            </div>
            <div>
              <Label htmlFor='editCurrency' className='text-xs'>
                Mata Uang
              </Label>
              <Input
                id='editCurrency'
                name='currency'
                value={editBranchForm.currency}
                onChange={(e) => handleBranchFormChange(e, setEditBranchForm)}
                className='text-xs h-9'
              />
            </div>
            <div>
              <Label htmlFor='editTaxRate' className='text-xs'>
                Tarif Pajak (%)
              </Label>
              <Input
                id='editTaxRate'
                name='taxRate'
                type='number'
                value={editBranchForm.taxRate}
                onChange={(e) => handleBranchFormChange(e, setEditBranchForm)}
                className='text-xs h-9'
              />
            </div>
            <div>
              <Label htmlFor='editAddress' className='text-xs'>
                Alamat
              </Label>
              <Textarea
                id='editAddress'
                name='address'
                value={editBranchForm.address}
                onChange={(e) => handleBranchFormChange(e, setEditBranchForm)}
                className='text-xs min-h-[60px]'
              />
            </div>
            <div>
              <Label htmlFor='editPhoneNumber' className='text-xs'>
                Nomor Telepon
              </Label>
              <Input
                id='editPhoneNumber'
                name='phoneNumber'
                value={editBranchForm.phoneNumber}
                onChange={(e) => handleBranchFormChange(e, setEditBranchForm)}
                className='text-xs h-9'
              />
            </div>
            <div>
              <Label
                htmlFor='transactionDeletionPasswordEdit'
                className='text-xs'
              >
                Password Hapus Transaksi
              </Label>
              <div className='relative'>
                <KeyRound className='absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
                <Input
                  id='transactionDeletionPasswordEdit'
                  name='transactionDeletionPassword'
                  type='password'
                  value={editBranchForm.transactionDeletionPassword}
                  onChange={(e) => handleBranchFormChange(e, setEditBranchForm)}
                  placeholder='Kosongkan untuk tidak mengubah'
                  className='h-9 text-xs pl-8'
                />
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Kosongkan jika tidak ingin mengubah password yang sudah ada.
                Mengisi akan menimpa password lama.
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type='button' variant='outline' className='text-xs h-8'>
                Batal
              </Button>
            </DialogClose>
            <Button
              onClick={handleUpdateBranch}
              className='text-xs h-8'
              disabled={isUpdatingBranch}
            >
              {isUpdatingBranch ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
