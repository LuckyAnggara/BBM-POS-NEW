// src/app/admin/settings/ManageUsers.tsx
'use client'

import React, { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { listUsers, updateUser, createUser } from '@/lib/laravel/users'
import type { User, Branch, UserRole } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlusCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ManageUsersProps {
  branches: Branch[]
  loadingBranches: boolean
}

export default function ManageUsers({
  branches,
  loadingBranches,
}: ManageUsersProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [userBranchChanges, setUserBranchChanges] = useState<
    Record<number, number | null>
  >({})
  const [userRoleChanges, setUserRoleChanges] = useState<
    Record<number, string>
  >({})
  // Create user states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'cashier' as UserRole,
    branch_id: 'UNASSIGNED' as string | number | null,
  })

  const fetchUsers = async () => {
    setLoadingUsers(true)
    const fetchedUsers = await listUsers()
    setUsers(fetchedUsers)

    const initialBranchChanges: Record<number, number | null> = {}
    const initialRoleChanges: Record<number, string> = {}
    fetchedUsers.forEach((user) => {
      initialBranchChanges[user.id] =
        typeof user.branch_id === 'number'
          ? user.branch_id
          : user.branch_id
          ? Number(user.branch_id)
          : null
      initialRoleChanges[user.id] = user.role
    })
    setUserBranchChanges(initialBranchChanges)
    setUserRoleChanges(initialRoleChanges)

    setLoadingUsers(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleUserBranchChange = (userId: number, branchId: string) => {
    setUserBranchChanges((prev) => ({
      ...prev,
      [userId]: branchId === 'UNASSIGNED' ? null : Number(branchId),
    }))
  }

  const handleUserRoleChange = (userId: number, role: string) => {
    setUserRoleChanges((prev) => ({ ...prev, [userId]: role }))
  }

  const resetCreateForm = () =>
    setCreateForm({
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
      role: 'cashier',
      branch_id: 'UNASSIGNED',
    })

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCreateForm((prev) => ({ ...prev, [name]: value }))
  }
  const handleCreateRoleChange = (role: string) =>
    setCreateForm((prev) => ({ ...prev, role: role as UserRole }))
  const handleCreateBranchChange = (val: string) =>
    setCreateForm((prev) => ({ ...prev, branch_id: val }))

  const validateCreate = () => {
    if (
      !createForm.name.trim() ||
      !createForm.email.trim() ||
      !createForm.password
    )
      return 'Nama, email, password wajib.'
    if (createForm.password.length < 6) return 'Password minimal 6 karakter.'
    if (createForm.password !== createForm.password_confirmation)
      return 'Konfirmasi password tidak sesuai.'
    return null
  }

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validateCreate()
    if (err) {
      toast.error('Validasi Gagal', { description: err })
      return
    }
    setCreating(true)
    try {
      await createUser({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        password_confirmation: createForm.password_confirmation,
        role: createForm.role,
        branch_id:
          createForm.branch_id === 'UNASSIGNED'
            ? null
            : Number(createForm.branch_id),
      })
      toast.success('Pengguna Ditambahkan')
      setIsCreateOpen(false)
      resetCreateForm()
      await fetchUsers()
    } catch (error: any) {
      toast.error('Gagal Menambah Pengguna', { description: error.message })
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateUser = async (userId: number) => {
    const newBranchId = userBranchChanges[userId]
    const newRole = userRoleChanges[userId]
    const originalUser = users.find((u) => u.id === userId)
    if (!originalUser) return

    let branchUpdated = false
    let roleUpdated = false

    try {
      if (newBranchId !== originalUser.branch_id) {
        await updateUser(userId, { branch_id: newBranchId || undefined })
        branchUpdated = true
      }

      if (newRole !== originalUser.role) {
        await updateUser(userId, { role: newRole as UserRole })
        roleUpdated = true
      }

      if (branchUpdated || roleUpdated) {
        toast.success('Pengguna Diperbarui', {
          description: 'Data pengguna berhasil diperbarui.',
        })
        await fetchUsers() // Muat ulang data pengguna untuk merefleksikan perubahan
      } else {
        toast.info('Tidak Ada Perubahan', {
          description: 'Tidak ada perubahan data untuk disimpan.',
        })
      }
    } catch (error: any) {
      toast.error('Error Tidak Diketahui', {
        description:
          error.message || 'Terjadi kesalahan saat memperbarui pengguna.',
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex justify-between items-center'>
          <div>
            <CardTitle className='text-base font-semibold'>
              Kelola Pengguna
            </CardTitle>
            <CardDescription className='text-xs'>
              Lihat pengguna, tambah, tetapkan cabang, dan ubah peran.
            </CardDescription>
          </div>
          <Button
            size='sm'
            className='h-8 text-xs'
            onClick={() => {
              resetCreateForm()
              setIsCreateOpen(true)
            }}
          >
            <PlusCircle className='mr-1.5 h-3.5 w-3.5' /> Tambah User
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loadingUsers ? (
          <div className='space-y-2'>
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
          </div>
        ) : users.length > 0 ? (
          <div className='border rounded-md overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='text-xs'>Nama</TableHead>
                  <TableHead className='text-xs'>Email</TableHead>
                  <TableHead className='text-xs'>Peran</TableHead>
                  <TableHead className='text-xs'>Cabang Saat Ini</TableHead>
                  <TableHead className='text-xs w-[180px]'>
                    Tetapkan Cabang
                  </TableHead>
                  <TableHead className='text-xs w-[150px]'>
                    Tetapkan Peran
                  </TableHead>
                  <TableHead className='text-xs text-right'>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const currentBranch = branches.find(
                    (b) => b.id === user.branch_id
                  )
                  const currentBranchName = currentBranch
                    ? currentBranch.name
                    : user.branch_id
                    ? 'ID Cabang Tidak Valid'
                    : 'Belum Ditetapkan'
                  return (
                    <TableRow key={user.id}>
                      <TableCell className='text-xs py-2'>
                        {user.name}
                      </TableCell>
                      <TableCell className='text-xs py-2'>
                        {user.email}
                      </TableCell>
                      <TableCell className='text-xs py-2 capitalize'>
                        {user.role}
                      </TableCell>
                      <TableCell className='text-xs py-2'>
                        {currentBranchName}
                      </TableCell>
                      <TableCell className='text-xs py-2'>
                        <Select
                          value={
                            userBranchChanges[user.id] === null ||
                            userBranchChanges[user.id] === undefined
                              ? 'UNASSIGNED'
                              : String(userBranchChanges[user.id])
                          }
                          onValueChange={(value) =>
                            handleUserBranchChange(user.id, value)
                          }
                          disabled={loadingBranches}
                        >
                          <SelectTrigger className='h-8 text-xs'>
                            <SelectValue placeholder='Pilih Cabang' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='UNASSIGNED' className='text-xs'>
                              Tidak Ada (Kosongkan)
                            </SelectItem>
                            {branches.map((branch) => (
                              <SelectItem
                                key={branch.id}
                                value={String(branch.id)}
                                className='text-xs'
                              >
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className='text-xs py-2'>
                        <Select
                          value={userRoleChanges[user.id] ?? user.role}
                          onValueChange={(value) =>
                            handleUserRoleChange(user.id, value)
                          }
                        >
                          <SelectTrigger className='h-8 text-xs'>
                            <SelectValue placeholder='Pilih Peran' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='cashier' className='text-xs'>
                              Kasir
                            </SelectItem>
                            <SelectItem value='admin' className='text-xs'>
                              Admin
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className='text-right py-2'>
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-8 text-xs'
                          onClick={() => handleUpdateUser(user.id)}
                          disabled={
                            (userBranchChanges[user.id] === user.branch_id ||
                              (userBranchChanges[user.id] === null &&
                                !user.branch_id)) &&
                            userRoleChanges[user.id] === user.role
                          }
                        >
                          Simpan
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className='text-xs text-muted-foreground'>
            Tidak ada pengguna yang terdaftar selain akun admin Anda.
          </p>
        )}
      </CardContent>
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>Tambah Pengguna Baru</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmitCreate}
            className='space-y-3 text-xs pt-1'
          >
            <div>
              <Label htmlFor='name'>Nama*</Label>
              <Input
                id='name'
                name='name'
                value={createForm.name}
                onChange={handleCreateChange}
                className='h-9 text-xs'
              />
            </div>
            <div>
              <Label htmlFor='email'>Email*</Label>
              <Input
                id='email'
                type='email'
                name='email'
                value={createForm.email}
                onChange={handleCreateChange}
                className='h-9 text-xs'
              />
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              <div>
                <Label htmlFor='password'>Password*</Label>
                <Input
                  id='password'
                  type='password'
                  name='password'
                  value={createForm.password}
                  onChange={handleCreateChange}
                  className='h-9 text-xs'
                />
              </div>
              <div>
                <Label htmlFor='password_confirmation'>
                  Konfirmasi Password*
                </Label>
                <Input
                  id='password_confirmation'
                  type='password'
                  name='password_confirmation'
                  value={createForm.password_confirmation}
                  onChange={handleCreateChange}
                  className='h-9 text-xs'
                />
              </div>
            </div>
            <div>
              <Label>Peran*</Label>
              <Select
                value={createForm.role}
                onValueChange={handleCreateRoleChange}
              >
                <SelectTrigger className='h-9 text-xs'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='cashier' className='text-xs'>
                    Kasir
                  </SelectItem>
                  <SelectItem value='admin' className='text-xs'>
                    Admin
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cabang</Label>
              <Select
                value={
                  createForm.branch_id === null
                    ? 'UNASSIGNED'
                    : String(createForm.branch_id)
                }
                onValueChange={handleCreateBranchChange}
                disabled={loadingBranches}
              >
                <SelectTrigger className='h-9 text-xs'>
                  <SelectValue placeholder='Pilih Cabang (opsional)' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='UNASSIGNED' className='text-xs'>
                    Tidak Ada (Kosongkan)
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
            </div>
            <DialogFooter className='pt-2'>
              <DialogClose asChild>
                <Button type='button' variant='outline' className='h-8 text-xs'>
                  Batal
                </Button>
              </DialogClose>
              <Button type='submit' className='h-8 text-xs' disabled={creating}>
                {creating ? 'Menyimpan...' : 'Tambah'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
