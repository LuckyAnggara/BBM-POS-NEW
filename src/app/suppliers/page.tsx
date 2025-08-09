'use client'

import React, { useState, useEffect, useCallback } from 'react'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/auth-context'
import { useBranches } from '@/contexts/branch-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  PlusCircle,
  Search,
  FilePenLine,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ITEMS_PER_PAGE_OPTIONS,
  type Supplier,
  type SupplierInput,
} from '@/lib/types' // Updated import
import {
  createSupplier,
  getSupplierById,
  listSuppliers,
  updateSupplier,
  deleteSupplier,
} from '@/lib/laravel/suppliers' // Updated import
import { useDebounce } from '@uidotdev/usehooks'

const supplierFormSchema = z.object({
  name: z.string().min(2, { message: 'Nama pemasok minimal 2 karakter.' }),
  contact_person: z.string().optional(),
  email: z
    .string()
    .email({ message: 'Format email tidak valid.' })
    .optional()
    .or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

type SupplierFormValues = z.infer<typeof supplierFormSchema>

export default function SuppliersPage() {
  const { selectedBranch } = useBranches()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(
    null
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    ITEMS_PER_PAGE_OPTIONS[0]
  )
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const debouncedSearchTerm = useDebounce(searchTerm, 1000)

  const [currentPage, setCurrentPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)

  const supplierForm = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
    },
  })

  const fetchSuppliers = useCallback(
    async (page: number, currentSearchTerm: string) => {
      if (!selectedBranch) {
        setSuppliers([])
        setLoadingSuppliers(false)
        return
      }
      setLoadingSuppliers(true)
      const result = await listSuppliers({
        branchId: selectedBranch.id,
        limit: itemsPerPage,
        searchTerm: currentSearchTerm || undefined,
        page: page || 1,
      })
      setSuppliers(result.data)
      setLoadingSuppliers(false)
    },
    [selectedBranch]
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedBranch, itemsPerPage, debouncedSearchTerm])

  useEffect(() => {
    if (!selectedBranch) {
      setSuppliers([])
      setLoadingSuppliers(false)
      setHasNextPage(false) // Sesuaikan dengan mode paginasi Anda
      return // Hentikan eksekusi lebih lanjut
    }

    fetchSuppliers(currentPage, debouncedSearchTerm)
  }, [currentPage, debouncedSearchTerm, selectedBranch, fetchSuppliers]) // Sertakan semua dependensi relevan

  const handleNextPage = () => {
    // Cek jika halaman saat ini belum mencapai halaman terakhir
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => prevPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => prevPage - 1)
    }
  }

  const handleOpenDialog = (supplier: Supplier | null = null) => {
    setEditingSupplier(supplier)
    if (supplier) {
      supplierForm.reset({
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        notes: supplier.notes || '',
      })
    } else {
      supplierForm.reset({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
      })
    }
    setIsDialogOpen(true)
  }

  const onSubmitSupplier: SubmitHandler<SupplierFormValues> = async (
    values
  ) => {
    if (!selectedBranch) {
      toast.error('Error', {
        description: 'Cabang tidak valid.',
      })
      return
    }

    const supplierData: SupplierInput = {
      ...values,
      branch_id: selectedBranch.id,
    }

    try {
      let result
      if (editingSupplier) {
        result = await updateSupplier(editingSupplier.id, supplierData)
      } else {
        result = await createSupplier(supplierData)
      }

      toast.info(
        editingSupplier ? 'Pelanggan Diperbarui' : 'Pelanggan Ditambahkan'
      )
      setIsDialogOpen(false)
      await fetchSuppliers(1, debouncedSearchTerm)
    } catch (error: any) {
      let errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'

      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
        const firstErrorKey = Object.keys(validationErrors)[0]
        errorMessage = validationErrors[firstErrorKey][0]
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }

      toast.error(editingSupplier ? 'Gagal Memperbarui' : 'Gagal Menambah', {
        description: errorMessage,
      })
    }
  }

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return
    try {
      const result = await deleteSupplier(supplierToDelete.id)
      toast.success(`Pemasok ${supplierToDelete.name} Dihapus`)
      await fetchSuppliers(1, debouncedSearchTerm)
    } catch (error: any) {
      console.error('Gagal menghapus supplier:', error)

      let errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'

      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
        const firstErrorKey = Object.keys(validationErrors)[0]
        errorMessage = validationErrors[firstErrorKey][0]
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }

      toast.error('Gagal Menghapus', {
        description: errorMessage,
      })
    } finally {
      setSupplierToDelete(null)
    }
  }

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contact_person
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-4'>
          <div className='flex flex-col sm:flex-row justify-between items-center gap-3'>
            <h1 className='text-xl md:text-2xl font-semibold font-headline'>
              Pemasok Cabang {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            <div className='flex gap-2 w-full sm:w-auto'>
              <div className='relative flex-grow sm:flex-grow-0'>
                <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
                <Input
                  type='search'
                  placeholder='Cari pemasok...'
                  className='pl-8 w-full sm:w-56 rounded-md h-9 text-xs'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={!selectedBranch || loadingSuppliers}
                />
              </div>
              <Button
                size='sm'
                className='rounded-md text-xs'
                onClick={() => handleOpenDialog()}
                disabled={!selectedBranch}
              >
                <PlusCircle className='mr-1.5 h-3.5 w-3.5' /> Tambah Pemasok
              </Button>
            </div>
          </div>

          {loadingSuppliers ? (
            <div className='space-y-2 border rounded-lg shadow-sm p-4'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
            </div>
          ) : !selectedBranch ? (
            <div className='border rounded-lg shadow-sm overflow-hidden p-10 text-center'>
              <p className='text-sm text-muted-foreground'>
                Pilih cabang untuk mengelola data pemasok.
              </p>
            </div>
          ) : filteredSuppliers.length === 0 && searchTerm ? (
            <div className='border rounded-lg shadow-sm overflow-hidden p-10 text-center'>
              <p className='text-sm text-muted-foreground'>
                Tidak ada pemasok yang cocok dengan pencarian Anda.
              </p>
            </div>
          ) : suppliers.length === 0 ? (
            <div className='border rounded-lg shadow-sm overflow-hidden p-10 text-center'>
              <p className='text-sm text-muted-foreground'>
                Belum ada data pemasok untuk cabang ini.
              </p>
              <Button
                size='sm'
                className='mt-4 text-xs'
                onClick={() => handleOpenDialog()}
              >
                <PlusCircle className='mr-1.5 h-3.5 w-3.5' /> Tambah Pemasok
                Pertama
              </Button>
            </div>
          ) : (
            <>
              <div className='border rounded-lg shadow-sm overflow-hidden'>
                <Table>
                  <TableCaption className='text-xs'>
                    Menampilkan {suppliers.length} dari {totalItems}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-xs'>Nama Pemasok</TableHead>
                      <TableHead className='text-xs hidden sm:table-cell'>
                        Kontak Person
                      </TableHead>
                      <TableHead className='text-xs hidden md:table-cell'>
                        Email
                      </TableHead>
                      <TableHead className='text-xs hidden md:table-cell'>
                        Telepon
                      </TableHead>
                      <TableHead className='text-right text-xs'>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className='py-2 text-xs font-medium'>
                          {supplier.name}
                        </TableCell>
                        <TableCell className='py-2 text-xs hidden sm:table-cell'>
                          {supplier.contact_person || '-'}
                        </TableCell>
                        <TableCell className='py-2 text-xs hidden md:table-cell'>
                          {supplier.email || '-'}
                        </TableCell>
                        <TableCell className='py-2 text-xs hidden md:table-cell'>
                          {supplier.phone || '-'}
                        </TableCell>
                        <TableCell className='text-right py-2'>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-7 w-7'
                            onClick={() => handleOpenDialog(supplier)}
                          >
                            <FilePenLine className='h-3.5 w-3.5' />
                            <span className='sr-only'>Edit</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-7 w-7 text-destructive hover:text-destructive/80'
                                onClick={() => setSupplierToDelete(supplier)}
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
                                  Tindakan ini akan menghapus pemasok "
                                  {supplierToDelete?.name}". Ini tidak dapat
                                  dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel
                                  className='text-xs h-8'
                                  onClick={() => setSupplierToDelete(null)}
                                >
                                  Batal
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  className='text-xs h-8 bg-destructive hover:bg-destructive/90'
                                  onClick={handleDeleteSupplier}
                                >
                                  Ya, Hapus
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
              <div className='flex justify-between items-center pt-2'>
                <Button
                  variant='outline'
                  size='sm'
                  className='text-xs h-8'
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1 || loadingSuppliers}
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
                  disabled={currentPage >= totalPages || loadingSuppliers}
                >
                  Berikutnya <ChevronRight className='ml-1 h-4 w-4' />
                </Button>
              </div>
            </>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className='sm:max-w-2xl'>
            <DialogHeader>
              <DialogTitle className='text-base'>
                {editingSupplier ? 'Edit Pemasok' : 'Tambah Pemasok Baru'}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={supplierForm.handleSubmit(onSubmitSupplier)}
              className='space-y-3 p-2 max-h-[80vh] overflow-y-auto pr-2'
            >
              <div>
                <Label htmlFor='name' className='text-xs'>
                  Nama Pemasok*
                </Label>
                <Input
                  id='name'
                  {...supplierForm.register('name')}
                  className='h-9 text-xs mt-1'
                  placeholder='Contoh: PT Pemasok Jaya'
                />
                {supplierForm.formState.errors.name && (
                  <p className='text-xs text-destructive mt-1'>
                    {supplierForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='contact_person' className='text-xs'>
                  Kontak Person
                </Label>
                <Input
                  id='contact_person'
                  {...supplierForm.register('contact_person')}
                  className='h-9 text-xs mt-1'
                  placeholder='Nama kontak'
                />
              </div>
              <div>
                <Label htmlFor='email' className='text-xs'>
                  Email
                </Label>
                <Input
                  id='email'
                  type='email'
                  {...supplierForm.register('email')}
                  className='h-9 text-xs mt-1'
                  placeholder='kontak@pemasok.com'
                />
                {supplierForm.formState.errors.email && (
                  <p className='text-xs text-destructive mt-1'>
                    {supplierForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='phone' className='text-xs'>
                  Telepon
                </Label>
                <Input
                  id='phone'
                  {...supplierForm.register('phone')}
                  className='h-9 text-xs mt-1'
                  placeholder='08xxxxxxxxxx'
                />
              </div>
              <div>
                <Label htmlFor='address' className='text-xs'>
                  Alamat
                </Label>
                <Textarea
                  id='address'
                  {...supplierForm.register('address')}
                  className='text-xs mt-1 min-h-[70px]'
                  placeholder='Alamat lengkap pemasok'
                />
              </div>
              <div>
                <Label htmlFor='notes' className='text-xs'>
                  Catatan
                </Label>
                <Textarea
                  id='notes'
                  {...supplierForm.register('notes')}
                  className='text-xs mt-1 min-h-[70px]'
                  placeholder='Catatan tambahan tentang pemasok'
                />
              </div>
              <DialogFooter className='pt-3'>
                <DialogClose asChild>
                  <Button
                    type='button'
                    variant='outline'
                    className='text-xs h-8'
                  >
                    Batal
                  </Button>
                </DialogClose>
                <Button
                  type='submit'
                  className='text-xs h-8'
                  disabled={supplierForm.formState.isSubmitting}
                >
                  {supplierForm.formState.isSubmitting
                    ? 'Menyimpan...'
                    : editingSupplier
                    ? 'Simpan Perubahan'
                    : 'Tambah Pemasok'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  )
}
