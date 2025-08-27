// src/app/admin/settings/ManageBankAccounts.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
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
import { Pencil, Trash2, PlusCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  createBankAccount,
  listBankAccounts,
  updateBankAccount,
  deleteBankAccount,
} from '@/lib/laravel/bankAccounts' // Pastikan path ini benar
import { Branch, type BankAccount, type BankAccountInput } from '@/lib/types'
import { toast } from 'sonner'

interface BankAccountFormState {
  bank_name: string
  account_number: string
  account_holder_name: string
  branch_id: number | null
  is_active: boolean
}

const initialBankAccountFormState: BankAccountFormState = {
  bank_name: '',
  account_number: '',
  account_holder_name: '',
  branch_id: null,
  is_active: true,
}

interface ManageBankAccountsProps {
  branches: Branch[]
  loadingBranches: boolean
}

export default function ManageBankAccounts({
  branches,
  loadingBranches,
}: ManageBankAccountsProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loadingBankAccounts, setLoadingBankAccounts] = useState(true)
  const [bankAccountForm, setBankAccountForm] = useState<BankAccountFormState>(
    initialBankAccountFormState
  )
  const [isBankAccountModalOpen, setIsBankAccountModalOpen] = useState(false)
  const [editingBankAccount, setEditingBankAccount] =
    useState<BankAccount | null>(null)
  const [isSubmittingBankAccount, setIsSubmittingBankAccount] = useState(false)
  const [bankAccountToDelete, setBankAccountToDelete] =
    useState<BankAccount | null>(null)
  const [isDeletingBankAccount, setIsDeletingBankAccount] = useState(false)

  const fetchBankAccounts = useCallback(async () => {
    setLoadingBankAccounts(true)
    try {
      const fetchedBankAccounts = await listBankAccounts()
      setBankAccounts(fetchedBankAccounts)
    } catch (e: any) {
      toast.error('Gagal memuat rekening bank', { description: e.message })
    } finally {
      setLoadingBankAccounts(false)
    }
  }, [])

  useEffect(() => {
    fetchBankAccounts()
  }, [])

  const handleBankAccountFormChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type, checked } = e.target
    setBankAccountForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleBankAccountFormSelectChange = (value: string) => {
    setBankAccountForm((prev) => ({
      ...prev,
      branch_id: value === 'NONE' ? null : Number(value),
    }))
  }

  const handleOpenBankAccountModal = (
    bankAccount: BankAccount | null = null
  ) => {
    setEditingBankAccount(bankAccount)
    if (bankAccount) {
      setBankAccountForm({
        bank_name: bankAccount.bank_name,
        account_number: bankAccount.account_number,
        account_holder_name: bankAccount.account_holder_name,
        branch_id: bankAccount.branch_id ? Number(bankAccount.branch_id) : null,
        is_active: bankAccount.is_active,
      })
    } else setBankAccountForm(initialBankAccountFormState)
    setIsBankAccountModalOpen(true)
  }

  const handleSubmitBankAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingBankAccount(true)
    // Basic validation
    if (
      !bankAccountForm.bank_name.trim() ||
      !bankAccountForm.account_number.trim() ||
      !bankAccountForm.account_holder_name.trim()
    ) {
      toast.error('Kolom wajib masih kosong', {
        description: 'Nama bank, nomor rekening, dan atas nama wajib diisi.',
      })
      setIsSubmittingBankAccount(false)
      return
    }
    const dataInput: BankAccountInput = {
      bank_name: bankAccountForm.bank_name.trim(),
      account_number: bankAccountForm.account_number.trim(),
      account_holder_name: bankAccountForm.account_holder_name.trim(),
      branch_id: bankAccountForm.branch_id, // API expects number|null
      is_active: bankAccountForm.is_active,
      is_default: false,
    } as any
    try {
      let result: BankAccount | { error: string }
      if (editingBankAccount) {
        result = await updateBankAccount(editingBankAccount.id, dataInput)
      } else {
        result = await createBankAccount(dataInput)
      }

      if ('error' in result) {
        toast.error(
          editingBankAccount ? 'Gagal Memperbarui' : 'Gagal Menambah',
          { description: String(result.error) }
        )
        return // Stop execution if there's a validation error
      }

      toast.success(
        editingBankAccount ? 'Rekening Diperbarui' : 'Rekening Ditambahkan'
      )
      setIsBankAccountModalOpen(false)
      await fetchBankAccounts()
    } catch (error: any) {
      toast.error(editingBankAccount ? 'Gagal Memperbarui' : 'Gagal Menambah', {
        description:
          error.message || 'Terjadi kesalahan pada operasi rekening bank.',
      })
    } finally {
      setIsSubmittingBankAccount(false)
    }
  }

  const handleConfirmDeleteBankAccount = async () => {
    if (!bankAccountToDelete) return
    setIsDeletingBankAccount(true)
    try {
      await deleteBankAccount(bankAccountToDelete.id)
      toast.success('Rekening Berhasil Dihapus')
      await fetchBankAccounts()
    } catch (error: any) {
      toast.error('Gagal Menghapus Rekening', {
        description:
          error.message || 'Terjadi kesalahan saat menghapus rekening bank.',
      })
    } finally {
      setBankAccountToDelete(null)
      setIsDeletingBankAccount(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex justify-between items-center'>
          <div>
            <CardTitle className='text-base font-semibold'>
              Kelola Rekening Bank
            </CardTitle>
            <CardDescription className='text-xs'>
              Tambah, edit, atau hapus rekening bank yang digunakan untuk
              transaksi.
            </CardDescription>
          </div>
          <Button
            size='sm'
            className='text-xs h-8'
            onClick={() => handleOpenBankAccountModal()}
          >
            <PlusCircle className='mr-1.5 h-3.5 w-3.5' /> Tambah Rekening
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loadingBankAccounts ? (
          <div className='space-y-2'>
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
          </div>
        ) : bankAccounts.length > 0 ? (
          <div className='border rounded-md overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='text-xs'>Nama Bank</TableHead>
                  <TableHead className='text-xs'>Nomor Rekening</TableHead>
                  <TableHead className='text-xs hidden sm:table-cell'>
                    Atas Nama
                  </TableHead>
                  <TableHead className='text-xs hidden md:table-cell'>
                    Cabang Tertaut
                  </TableHead>
                  <TableHead className='text-xs text-center'>Status</TableHead>
                  <TableHead className='text-xs text-right'>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankAccounts.map((acc) => {
                  const linkedBranch = acc.branch_id
                    ? branches.find((b) => b.id === acc.branch_id)?.name
                    : 'Global'
                  return (
                    <TableRow key={acc.id}>
                      <TableCell className='text-xs py-2 font-medium'>
                        {acc.bank_name}
                      </TableCell>
                      <TableCell className='text-xs py-2'>
                        {acc.account_number}
                      </TableCell>
                      <TableCell className='text-xs py-2 hidden sm:table-cell'>
                        {acc.account_holder_name}
                      </TableCell>
                      <TableCell className='text-xs py-2 hidden md:table-cell'>
                        {linkedBranch || 'N/A'}
                      </TableCell>
                      <TableCell className='text-xs text-center py-2'>
                        {acc.is_active ? (
                          <span className='text-green-600'>Aktif</span>
                        ) : (
                          <span className='text-destructive'>Nonaktif</span>
                        )}
                      </TableCell>
                      <TableCell className='text-right py-2'>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-7 w-7'
                          onClick={() => handleOpenBankAccountModal(acc)}
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
                              onClick={() => setBankAccountToDelete(acc)}
                            >
                              <Trash2 className='h-3.5 w-3.5' />
                              <span className='sr-only'>Hapus</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Hapus Rekening Bank?
                              </AlertDialogTitle>
                              <AlertDialogDescription className='text-xs'>
                                Tindakan ini akan menghapus rekening bank "
                                {bankAccountToDelete?.bank_name} -{' '}
                                {bankAccountToDelete?.account_number}". Ini
                                tidak dapat dibatalkan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                className='text-xs h-8'
                                onClick={() => setBankAccountToDelete(null)}
                              >
                                Batal
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className='text-xs h-8 bg-destructive hover:bg-destructive/90'
                                onClick={handleConfirmDeleteBankAccount}
                                disabled={isDeletingBankAccount}
                              >
                                {isDeletingBankAccount
                                  ? 'Menghapus...'
                                  : 'Ya, Hapus'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className='text-xs text-muted-foreground text-center py-6'>
            Belum ada rekening bank yang ditambahkan.
          </p>
        )}
      </CardContent>
      <Dialog
        open={isBankAccountModalOpen}
        onOpenChange={setIsBankAccountModalOpen}
      >
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              {editingBankAccount
                ? 'Edit Rekening Bank'
                : 'Tambah Rekening Bank Baru'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitBankAccount} className='space-y-3 py-3'>
            <div>
              <Label htmlFor='bank_name' className='text-xs'>
                Nama Bank*
              </Label>
              <Input
                id='bank_name'
                name='bank_name'
                value={bankAccountForm.bank_name}
                onChange={handleBankAccountFormChange}
                placeholder='Contoh: BCA, Mandiri'
                className='h-9 text-xs'
              />
            </div>
            <div>
              <Label htmlFor='account_number' className='text-xs'>
                Nomor Rekening*
              </Label>
              <Input
                id='account_number'
                name='account_number'
                value={bankAccountForm.account_number}
                onChange={handleBankAccountFormChange}
                placeholder='1234567890'
                className='h-9 text-xs'
              />
            </div>
            <div>
              <Label htmlFor='account_holder_name' className='text-xs'>
                Atas Nama (Pemilik)*
              </Label>
              <Input
                id='account_holder_name'
                name='account_holder_name'
                value={bankAccountForm.account_holder_name}
                onChange={handleBankAccountFormChange}
                placeholder='Nama Pemilik Rekening'
                className='h-9 text-xs'
              />
            </div>
            <div>
              <Label htmlFor='bankAccountBranchId' className='text-xs'>
                Tautkan ke Cabang (Opsional)
              </Label>
              <Select
                value={
                  bankAccountForm.branch_id === null
                    ? 'NONE'
                    : String(bankAccountForm.branch_id)
                }
                onValueChange={handleBankAccountFormSelectChange}
                disabled={loadingBranches}
              >
                <SelectTrigger className='h-9 text-xs mt-1'>
                  <SelectValue
                    placeholder={
                      loadingBranches
                        ? 'Memuat cabang...'
                        : 'Pilih Cabang (atau Global)'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='NONE' className='text-xs'>
                    Global (Semua Cabang)
                  </SelectItem>
                  {branches.map((b) => (
                    <SelectItem
                      key={b.id}
                      value={String(b.id)}
                      className='text-xs'
                    >
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='text-xs text-muted-foreground mt-1'>
                Jika tidak dipilih, rekening ini dapat digunakan di semua
                cabang.
              </p>
            </div>
            <div className='flex items-center space-x-2 pt-1'>
              <Switch
                id='is_active'
                name='is_active'
                checked={bankAccountForm.is_active}
                onCheckedChange={(checked) =>
                  setBankAccountForm((prev) => ({
                    ...prev,
                    is_active: checked,
                  }))
                }
              />
              <Label htmlFor='is_active' className='text-xs'>
                Aktifkan Rekening Ini
              </Label>
            </div>
            <DialogFooter className='pt-4'>
              <DialogClose asChild>
                <Button type='button' variant='outline' className='text-xs h-8'>
                  Batal
                </Button>
              </DialogClose>
              <Button
                type='submit'
                className='text-xs h-8'
                disabled={isSubmittingBankAccount}
              >
                {isSubmittingBankAccount
                  ? 'Menyimpan...'
                  : editingBankAccount
                  ? 'Simpan Perubahan'
                  : 'Tambah Rekening'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
