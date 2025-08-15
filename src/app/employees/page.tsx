'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/auth-context'
import { useBranches } from '@/contexts/branch-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PlusCircle,
  FilePenLine,
  Trash2,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  UserPlus,
} from 'lucide-react'
import { useDebounce } from '@uidotdev/usehooks'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import {
  type Employee,
  listEmployees,
  deleteEmployee,
} from '@/lib/laravel/employee'
import { ITEMS_PER_PAGE_OPTIONS } from '@/lib/types'
import { formatCurrency } from '@/lib/helper'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

const EMPLOYMENT_TYPE_LABELS = {
  full_time: 'Karyawan Tetap',
  part_time: 'Paruh Waktu',
  contract: 'Kontrak',
}

const STATUS_LABELS = {
  active: 'Aktif',
  inactive: 'Tidak Aktif',
  terminated: 'Berhenti',
}

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800 border-green-200',
  inactive: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  terminated: 'bg-red-100 text-red-800 border-red-200',
}

export default function EmployeesPage() {
  const router = useRouter()
  const { userData } = useAuth()
  const { selectedBranch, isLoadingBranches } = useBranches()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'active' | 'inactive' | 'terminated' | ''
  >('')
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    ITEMS_PER_PAGE_OPTIONS[0]
  )
  const totalPages = Math.ceil(totalEmployees / itemsPerPage)

  const debouncedSearchTerm = useDebounce(searchTerm, 1000)

  const [currentPage, setCurrentPage] = useState(1)

  const fetchData = useCallback(
    async (page: number, currentSearchTerm: string) => {
      if (!selectedBranch) {
        setEmployees([])
        setLoadingEmployees(false)
        setTotalEmployees(0)
        return
      }
      setLoadingEmployees(true)

      const options = {
        branchId: selectedBranch.id,
        limit: itemsPerPage,
        search: currentSearchTerm || undefined,
        page: page || 1,
        status: (statusFilter || undefined) as
          | 'active'
          | 'inactive'
          | 'terminated'
          | undefined,
      }

      try {
        const result = await listEmployees(options)
        setEmployees(result.data)
        setTotalEmployees(result.total)
        setLoadingEmployees(false)
      } catch (error) {
        console.error('Error fetching employees:', error)
        toast.error('Gagal memuat data pegawai')
        setLoadingEmployees(false)
      }
    },
    [selectedBranch, itemsPerPage, statusFilter]
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedBranch, itemsPerPage, debouncedSearchTerm, statusFilter])

  useEffect(() => {
    if (!selectedBranch) {
      setEmployees([])
      setLoadingEmployees(false)
      return
    }

    fetchData(currentPage, debouncedSearchTerm)
  }, [currentPage, debouncedSearchTerm, selectedBranch, fetchData])

  const handleDeleteEmployee = async (
    employeeId: number,
    employeeName: string
  ) => {
    try {
      await deleteEmployee(employeeId)
      toast.success('Pegawai Dihapus', {
        description: `${employeeName} telah dihapus dari sistem.`,
      })
      await fetchData(1, debouncedSearchTerm)
    } catch (error: any) {
      console.error('Gagal menghapus pegawai:', error)
      let errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      toast.error('Gagal Menghapus Pegawai', {
        description: errorMessage,
      })
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => prevPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => prevPage - 1)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoadingBranches && !selectedBranch) {
    return (
      <MainLayout>
        <div className='flex h-full items-center justify-center'>
          Memuat data cabang...
        </div>
      </MainLayout>
    )
  }

  if (!selectedBranch && userData?.role === 'admin') {
    return (
      <MainLayout>
        <div className='p-4 text-center'>
          Silakan pilih cabang dari sidebar untuk mengelola data pegawai.
        </div>
      </MainLayout>
    )
  }

  if (!selectedBranch && userData?.role === 'cashier') {
    return (
      <MainLayout>
        <div className='p-4 text-center text-destructive'>
          Anda tidak terhubung ke cabang. Hubungi admin.
        </div>
      </MainLayout>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-4'>
          <div className='flex flex-col sm:flex-row justify-between items-center gap-3'>
            <h1 className='text-xl md:text-2xl font-semibold font-headline'>
              Data Pegawai {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            <div className='flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end'>
              <div className='relative flex-grow sm:flex-grow-0'>
                <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
                <Input
                  type='search'
                  placeholder='Cari pegawai...'
                  className='pl-8 w-full sm:w-80 rounded-md h-9 text-xs'
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                  }}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value === 'all' ? '' : value)
                }}
              >
                <SelectTrigger className='h-9 text-xs rounded-md w-auto sm:w-[120px]'>
                  <SelectValue placeholder='Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all' className='text-xs'>
                    Semua Status
                  </SelectItem>
                  <SelectItem value='active' className='text-xs'>
                    Aktif
                  </SelectItem>
                  <SelectItem value='inactive' className='text-xs'>
                    Tidak Aktif
                  </SelectItem>
                  <SelectItem value='terminated' className='text-xs'>
                    Berhenti
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value))
                }}
              >
                <SelectTrigger className='h-9 text-xs rounded-md w-auto sm:w-[100px]'>
                  <SelectValue placeholder='Tampil' />
                </SelectTrigger>
                <SelectContent>
                  {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem
                      key={option}
                      value={option.toString()}
                      className='text-xs'
                    >
                      Tampil {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size='sm'
                className='rounded-md text-xs h-9'
                onClick={() => router.push('/employees/new')}
                disabled={!selectedBranch}
              >
                <UserPlus className='mr-1.5 h-3.5 w-3.5' /> Tambah Pegawai
              </Button>
            </div>
          </div>

          {loadingEmployees ? (
            <div className='space-y-2 border rounded-lg shadow-sm p-4'>
              {[...Array(itemsPerPage)].map((_, i) => (
                <Skeleton key={i} className='h-10 w-full' />
              ))}
            </div>
          ) : employees.length === 0 && searchTerm ? (
            <div className='border rounded-lg shadow-sm overflow-hidden p-10 text-center'>
              <p className='text-sm text-muted-foreground'>
                Tidak ada pegawai yang cocok dengan pencarian Anda.
              </p>
            </div>
          ) : employees.length === 0 ? (
            <div className='border rounded-lg shadow-sm overflow-hidden p-10 text-center'>
              <p className='text-sm text-muted-foreground'>
                Belum ada data pegawai di cabang ini.
              </p>
              <Button
                size='sm'
                className='mt-4 text-xs'
                onClick={() => router.push('/employees/new')}
              >
                <UserPlus className='mr-1.5 h-3.5 w-3.5' /> Tambah Pegawai
                Pertama
              </Button>
            </div>
          ) : (
            <>
              <div className='border rounded-lg shadow-sm overflow-hidden'>
                <Table>
                  <TableCaption className='text-xs'>
                    Menampilkan {employees.length} dari {totalEmployees}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-xs px-2'>Kode</TableHead>
                      <TableHead className='text-xs px-2'>Nama</TableHead>
                      <TableHead className='hidden md:table-cell text-xs px-2'>
                        Posisi
                      </TableHead>
                      <TableHead className='hidden lg:table-cell text-xs px-2'>
                        Jenis
                      </TableHead>
                      <TableHead className='text-right hidden sm:table-cell text-xs px-2'>
                        Gaji Harian
                      </TableHead>
                      <TableHead className='text-right hidden sm:table-cell text-xs px-2'>
                        Gaji Bulanan
                      </TableHead>
                      <TableHead className='text-center text-xs px-2'>
                        Status
                      </TableHead>
                      <TableHead className='text-right text-xs px-2'>
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className='font-medium py-1.5 px-2 text-xs'>
                          {employee.employee_code}
                        </TableCell>
                        <TableCell className='py-1.5 px-2 text-xs'>
                          <div>
                            <div className='font-medium'>{employee.name}</div>
                            {employee.email && (
                              <div className='text-muted-foreground text-[10px]'>
                                {employee.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className='hidden md:table-cell py-1.5 px-2 text-xs'>
                          {employee.position}
                        </TableCell>
                        <TableCell className='hidden lg:table-cell py-1.5 px-2 text-xs'>
                          {EMPLOYMENT_TYPE_LABELS[employee.employment_type]}
                        </TableCell>
                        <TableCell className='text-right hidden sm:table-cell py-1.5 px-2 text-xs'>
                          {formatCurrency(employee.daily_salary)}
                        </TableCell>
                        <TableCell className='text-right hidden sm:table-cell py-1.5 px-2 text-xs'>
                          {formatCurrency(employee.monthly_salary)}
                        </TableCell>
                        <TableCell className='text-center py-1.5 px-2'>
                          <Badge
                            variant='outline'
                            className={`text-xs ${
                              STATUS_COLORS[employee.status]
                            }`}
                          >
                            {STATUS_LABELS[employee.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-right py-1.5 px-2'>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-7 w-7'
                              >
                                <MoreVertical className='h-3.5 w-3.5' />
                                <span className='sr-only'>Aksi</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end'>
                              <DropdownMenuItem
                                className='text-xs cursor-pointer'
                                onClick={() =>
                                  router.push(`/employees/${employee.id}/edit`)
                                }
                              >
                                <FilePenLine className='mr-2 h-3.5 w-3.5' />
                                Edit
                              </DropdownMenuItem>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    className='text-xs cursor-pointer text-destructive'
                                    onSelect={(e) => e.preventDefault()}
                                  >
                                    <Trash2 className='mr-2 h-3.5 w-3.5' />
                                    Hapus
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Apakah Anda yakin?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className='text-xs'>
                                      Tindakan ini akan menghapus pegawai "
                                      {employee.name}" secara permanen.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className='text-xs h-8'>
                                      Batal
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className='text-xs h-8 bg-destructive hover:bg-destructive/90'
                                      onClick={() =>
                                        handleDeleteEmployee(
                                          employee.id,
                                          employee.name
                                        )
                                      }
                                    >
                                      Ya, Hapus
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className='flex justify-between items-center pt-2'>
                <Button
                  variant='outline'
                  size='sm'
                  className='text-xs h-8'
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1 || loadingEmployees}
                >
                  <ChevronLeft className='mr-1 h-4 w-4' /> Sebelumnya
                </Button>
                <span className='text-xs text-muted-foreground'>
                  Halaman {currentPage} dari {totalPages}
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  className='text-xs h-8'
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages || loadingEmployees}
                >
                  Berikutnya <ChevronRight className='ml-1 h-4 w-4' />
                </Button>
              </div>
            </>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
