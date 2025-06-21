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
import { getAllUsers, updateUserProfile, UserRole } from '@/lib/appwrite/users' // Pastikan path ini benar
import type { UserData, Branch } from '@/lib/appwrite/types' // Pastikan path ini benar
import { toast } from 'sonner'

interface ManageUsersProps {
  branches: Branch[]
  loadingBranches: boolean
}

export default function ManageUsers({
  branches,
  loadingBranches,
}: ManageUsersProps) {
  const [users, setUsers] = useState<UserData[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [userBranchChanges, setUserBranchChanges] = useState<
    Record<string, string | null>
  >({})
  const [userRoleChanges, setUserRoleChanges] = useState<
    Record<string, string>
  >({})

  const fetchUsers = async () => {
    setLoadingUsers(true)
    const fetchedUsers = await getAllUsers()
    setUsers(fetchedUsers)

    const initialBranchChanges: Record<string, string | null> = {}
    const initialRoleChanges: Record<string, string> = {}
    fetchedUsers.forEach((user) => {
      initialBranchChanges[user.id] = user.branchId || null
      initialRoleChanges[user.id] = user.role
    })
    setUserBranchChanges(initialBranchChanges)
    setUserRoleChanges(initialRoleChanges)

    setLoadingUsers(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleUserBranchChange = (userId: string, branchId: string) => {
    setUserBranchChanges((prev) => ({
      ...prev,
      [userId]: branchId === 'UNASSIGNED' ? null : branchId,
    }))
  }

  const handleUserRoleChange = (userId: string, role: string) => {
    setUserRoleChanges((prev) => ({ ...prev, [userId]: role }))
  }

  const handleUpdateUser = async (userId: string) => {
    const newBranchId = userBranchChanges[userId]
    const newRole = userRoleChanges[userId]
    const originalUser = users.find((u) => u.id === userId)
    if (!originalUser) return

    let branchUpdated = false
    let roleUpdated = false

    try {
      if (newBranchId !== originalUser.branchId) {
        await updateUserProfile(userId, { branchId: newBranchId || undefined })
        branchUpdated = true
      }

      if (newRole !== originalUser.role) {
        await updateUserProfile(userId, { role: newRole as UserRole })
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
        <CardTitle className='text-base font-semibold'>
          Kelola Pengguna
        </CardTitle>
        <CardDescription className='text-xs'>
          Lihat pengguna, tetapkan cabang, dan ubah peran.
        </CardDescription>
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
                    (b) => b.id === user.branchId
                  )
                  const currentBranchName = currentBranch
                    ? currentBranch.name
                    : user.branchId
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
                          value={userBranchChanges[user.id] ?? 'UNASSIGNED'}
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
                                value={branch.id}
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
                            (userBranchChanges[user.id] === user.branchId ||
                              (userBranchChanges[user.id] === null &&
                                !user.branchId)) &&
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
    </Card>
  )
}
