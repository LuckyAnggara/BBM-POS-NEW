'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/auth-context'
import { useBranch } from '@/contexts/branch-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogDescription,
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
  PackagePlus,
  Tag,
  X,
  Upload,
  Download,
  FileText,
  Info,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  MoreVertical,
  Copy,
  ArrowLeft, // Import Copy icon
} from 'lucide-react'
import { useDebounce } from '@uidotdev/usehooks'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  InventoryItem,
  InventoryCategory,
  InventoryItemInput,
  InventoryCategoryInput,
} from '@/lib/appwrite/inventory'
import {
  addInventoryItem,
  getInventoryItems,
  deleteInventoryItem,
  addInventoryCategory,
  getInventoryCategories,
  deleteInventoryCategory,
} from '@/lib/appwrite/inventory'

import {
  exportInventoryToCSV,
  downloadInventoryTemplateCSV,
  parseInventoryCSV,
  batchImportInventory,
  type ParsedCsvItem,
} from '@/lib/inventorycsv'
import Image from 'next/image'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription as AlertDescUI } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

const categoryFormSchema = z.object({
  name: z.string().min(2, { message: 'Nama kategori minimal 2 karakter.' }),
})
type CategoryFormValues = z.infer<typeof categoryFormSchema>
type ViewMode = 'card' | 'table'

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]

export default function InventoryPage() {
  const router = useRouter()
  const { userData } = useAuth()
  const { selectedBranch, loadingBranches } = useBranch()

  const [viewMode, setViewMode] = useState<ViewMode>('table')

  const [items, setItems] = useState<InventoryItem[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    ITEMS_PER_PAGE_OPTIONS[0]
  )
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  const [currentPage, setCurrentPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)

  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [parsedCsvData, setParsedCsvData] = useState<ParsedCsvItem[]>([])
  const [csvImportFileName, setCsvImportFileName] = useState<string | null>(
    null
  )
  const [isProcessingImport, setIsProcessingImport] = useState(false)
  const [csvImportSummary, setCsvImportSummary] = useState<{
    total: number
    invalidCategories: number
  }>({ total: 0, invalidCategories: 0 })

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    async function loadCategories() {
      if (selectedBranch) {
        setLoadingCategories(true)
        const fetchedCategoriesResult = await getInventoryCategories(
          selectedBranch.id
        )
        setCategories(fetchedCategoriesResult)
        setLoadingCategories(false)
      } else {
        setCategories([])
        setLoadingCategories(false)
      }
    }
    loadCategories()
  }, [selectedBranch])

  const fetchData = useCallback(
    async (page: number, currentSearchTerm: string) => {
      if (!selectedBranch) {
        setItems([])
        setLoadingItems(false)
        setTotalItems(0)
        return
      }
      setLoadingItems(true)

      const options = {
        limit: itemsPerPage,
        searchTerm: currentSearchTerm || undefined,
        page: page, // Kirim nomor halaman
      }

      // Panggil fungsi API yang baru
      const result = await getInventoryItems(selectedBranch.id, options)

      setItems(result.items)
      setTotalItems(result.total) // Simpan total item
      setLoadingItems(false)
    },
    [selectedBranch, itemsPerPage] // Dependensi lebih sederhana
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedBranch, itemsPerPage, debouncedSearchTerm])

  useEffect(() => {
    // Jika tidak ada cabang yang dipilih, bersihkan state dan jangan lakukan apa-apa lagi.
    if (!selectedBranch) {
      setItems([])
      setLoadingItems(false)
      // Untuk mode cursor pagination, Anda akan menggunakan setHasNextPage(false)
      // Untuk mode offset pagination, Anda akan menggunakan setTotalItems(0)
      setHasNextPage(false) // Sesuaikan dengan mode paginasi Anda
      return // Hentikan eksekusi lebih lanjut
    }

    // Jika ada cabang, panggil fetchData.
    // Efek ini akan otomatis berjalan ketika `currentPage` berubah (dari efek reset di atas)
    // atau ketika `fetchData` itu sendiri berubah (jika dependensinya berubah).
    fetchData(currentPage, debouncedSearchTerm)
  }, [currentPage, debouncedSearchTerm, selectedBranch, fetchData]) // Sertakan semua dependensi relevan

  // --- New function for duplicating an item ---
  const handleDuplicateItem = async (item: InventoryItem) => {
    if (!selectedBranch) {
      toast.error('Error', { description: 'Cabang tidak valid.' })
      return
    }

    // Find the category name from the fetched categories
    const category = categories.find((cat) => cat.id === item.categoryId)
    if (!category) {
      toast.error('Error', { description: 'Kategori produk tidak ditemukan.' })
      return
    }

    const duplicatedItemData: InventoryItemInput = {
      name: `${item.name} (Copy)`,
      sku: '', // Let Appwrite generate a new SKU
      categoryId: item.categoryId,
      branchId: selectedBranch.id,
      quantity: item.quantity, // Copy current quantity
      price: item.price,
      costPrice: item.costPrice || 0,
      imageUrl: item.imageUrl || '',
      imageHint: item.imageHint || '',
    }

    try {
      const result = await addInventoryItem(duplicatedItemData, category.name)

      if (result && 'error' in result) {
        toast.error('Gagal Duplikasi Produk', {
          description: result.error,
        })
      } else {
        toast.success('Produk Berhasil Diduplikasi', {
          description: `${item.name} telah diduplikasi menjadi ${duplicatedItemData.name}.`,
        })
        // Refresh the current page to show the new item
        await fetchData(currentPage, debouncedSearchTerm)
      }
    } catch (error: any) {
      toast.error('Terjadi Kesalahan', {
        description: error.message || 'Gagal menduplikasi produk.',
      })
    }
  }

  useEffect(() => {
    if (selectedBranch) {
      fetchData(currentPage, debouncedSearchTerm)
    }
  }, [currentPage, selectedBranch, fetchData])

  useEffect(() => {
    if (selectedBranch) {
    } else {
      setItems([])
      // Categories are handled by their own useEffect
      setCurrentPage(1)
      setHasNextPage(false)
      setLoadingItems(false)
    }
  }, [selectedBranch])

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    const result = await deleteInventoryItem(itemId)
    if (result && 'error' in result) {
      toast.error('Gagal Menghapus', {
        description: result.error,
      })
    } else {
      toast.success('Produk Dihapus', {
        description: `${itemName} telah dihapus dari inventaris.`,
      })

      await fetchData(1)
    }
  }

  const onCategorySubmit: SubmitHandler<CategoryFormValues> = async (
    values
  ) => {
    if (!selectedBranch) return
    const categoryData: InventoryCategoryInput = {
      name: values.name,
      branchId: selectedBranch.id,
    }
    const result = await addInventoryCategory(categoryData)
    if (result && 'error' in result) {
      toast.error('Gagal Menambah Kategori', {
        description: result.error,
      })
    } else {
      toast.success('Kategori Ditambahkan', {
        description: `Kategori "${values.name}" telah ditambahkan.`,
      })
      categoryForm.reset()
      const fetchedCategories = await getInventoryCategories(selectedBranch.id)
      setCategories(fetchedCategories)
    }
  }

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

  const handleDeleteCategory = async (
    categoryId: string,
    categoryName: string
  ) => {
    if (!selectedBranch) return
    const result = await deleteInventoryCategory(categoryId)
    if (result && 'error' in result) {
      toast.error('Gagal Hapus Kategori', {
        description: result.error,
      })
    } else {
      toast.success('Kategori Dihapus', {
        description: `Kategori "${categoryName}" telah dihapus.`,
      })
      const fetchedCategories = await getInventoryCategories(selectedBranch.id)
      setCategories(fetchedCategories)
    }
  }

  const handleExportCSV = () => {
    exportInventoryToCSV(items, selectedBranch)
  }

  const handleDownloadTemplateCSV = () => {
    downloadInventoryTemplateCSV(categories, selectedBranch)
  }

  const handleImportButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && selectedBranch) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const { data, invalidCategoryCount, error } = parseInventoryCSV(
          text,
          items,
          categories,
          selectedBranch.id
        )

        if (error) {
          toast.error(error.split(':')[0], { description: error.split(':')[1] })
          return
        }

        setCsvImportSummary({
          total: data.length,
          invalidCategories: invalidCategoryCount,
        })
        setParsedCsvData(data)
        setCsvImportFileName(file.name)
        setIsImportDialogOpen(true)
      }
      reader.readAsText(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleConfirmImport = async () => {
    if (!parsedCsvData || parsedCsvData.length === 0 || !selectedBranch) return

    setIsProcessingImport(true)
    const {
      successCount,
      errorCount,
      skippedInvalidCategoryCount,
      errorMessages,
    } = await batchImportInventory(parsedCsvData, categories)

    let toastMessage = ''
    if (successCount > 0) {
      toastMessage += `${successCount} produk berhasil diimpor. `
    }
    if (errorCount - skippedInvalidCategoryCount > 0) {
      toastMessage += `${
        errorCount - skippedInvalidCategoryCount
      } produk gagal karena error lain. `
    }
    if (skippedInvalidCategoryCount > 0) {
      toastMessage += `${skippedInvalidCategoryCount} produk dilewati karena ID kategori tidak valid. `
    }

    if (toastMessage.trim() === '') {
      toast.info('Tidak Ada Perubahan', {
        description: 'Tidak ada produk yang diimpor atau dilewati.',
      })
    } else {
      toast.success('Impor Selesai', { description: toastMessage.trim() })
    }

    if (errorMessages.length > 0 && errorCount > 0) {
      toast.error(`Detail Kegagalan Impor (${errorCount} item)`, {
        description:
          errorMessages.slice(0, 3).join('; ') +
          (errorMessages.length > 3 ? '; ...' : ''),
        duration: 10000,
      })
    }

    setIsProcessingImport(false)
    setIsImportDialogOpen(false)
    setParsedCsvData([])
    setCsvImportFileName(null)
    await fetchData(currentPage, debouncedSearchTerm)
  }

  const displayedItems = useMemo(() => {
    if (!searchTerm.trim()) {
      return items
    }
    const lowerSearchTerm = searchTerm.toLowerCase()
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerSearchTerm) ||
        (item.sku && item.sku.toLowerCase().includes(lowerSearchTerm)) ||
        categories
          .find((c) => c.id === item.categoryId)
          ?.name.toLowerCase()
          .includes(lowerSearchTerm)
    )
  }, [items, searchTerm, categories])

  if (loadingBranches && !selectedBranch) {
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
          Silakan pilih cabang dari sidebar untuk mengelola inventaris.
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
              Produk Cabang {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            <div className='flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end'>
              <div className='relative flex-grow sm:flex-grow-0'>
                <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
                <Input
                  type='search'
                  placeholder='Cari produk...'
                  className='pl-8 w-full sm:w-80 rounded-md h-9 text-xs'
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                  }}
                />
              </div>
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
              <input
                type='file'
                ref={fileInputRef}
                onChange={handleFileSelected}
                accept='.csv'
                style={{ display: 'none' }}
              />
              <Button
                size='sm'
                variant='outline'
                className='rounded-md text-xs h-9'
                onClick={handleDownloadTemplateCSV}
                disabled={!selectedBranch || loadingCategories}
              >
                <FileText className='mr-1.5 h-3.5 w-3.5' /> Template
              </Button>
              <Button
                size='sm'
                variant='outline'
                className='rounded-md text-xs h-9'
                onClick={handleImportButtonClick}
                disabled={!selectedBranch || loadingItems || loadingCategories}
              >
                <Upload className='mr-1.5 h-3.5 w-3.5' /> Impor
              </Button>
              <Button
                size='sm'
                variant='outline'
                className='rounded-md text-xs h-9'
                onClick={handleExportCSV}
                disabled={!selectedBranch || loadingItems || items.length === 0}
              >
                <Download className='mr-1.5 h-3.5 w-3.5' /> Ekspor
              </Button>
              <Button
                size='sm'
                className='rounded-md text-xs h-9'
                onClick={() => setIsCategoryManagerOpen(true)}
                disabled={!selectedBranch || loadingCategories}
              >
                <Tag className='mr-1.5 h-3.5 w-3.5' /> Kategori
              </Button>
              <Button
                size='sm'
                className='rounded-md text-xs h-9'
                onClick={() => router.push('/inventory/new')}
                disabled={
                  !selectedBranch ||
                  loadingCategories ||
                  categories.length === 0
                }
              >
                <PackagePlus className='mr-1.5 h-3.5 w-3.5' /> Tambah
              </Button>
            </div>
          </div>

          <Alert
            variant='default'
            className='bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700/50 dark:text-blue-300 text-xs'
          >
            <Info className='h-4 w-4 !text-blue-600 dark:!text-blue-400' />
            <AlertDescUI>
              Pencarian produk dilakukan pada data yang ditampilkan di halaman
              saat ini. Untuk pencarian menyeluruh di semua data, hapus filter
              pencarian atau navigasi ke semua halaman jika perlu.
            </AlertDescUI>
          </Alert>

          {loadingItems || loadingCategories ? (
            <div className='space-y-2 border rounded-lg shadow-sm p-4'>
              {[...Array(itemsPerPage)].map((_, i) => (
                <Skeleton key={i} className='h-10 w-full' />
              ))}
            </div>
          ) : displayedItems.length === 0 && searchTerm ? (
            <div className='border rounded-lg shadow-sm overflow-hidden p-10 text-center'>
              <p className='text-sm text-muted-foreground'>
                Tidak ada produk yang cocok dengan pencarian Anda pada halaman
                ini.
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className='border rounded-lg shadow-sm overflow-hidden p-10 text-center'>
              <p className='text-sm text-muted-foreground'>
                Belum ada produk di inventaris cabang ini.
              </p>
              <Button
                size='sm'
                className='mt-4 text-xs'
                onClick={() => router.push('/inventory/new')}
                disabled={categories.length === 0}
              >
                <PackagePlus className='mr-1.5 h-3.5 w-3.5' /> Tambah Produk
                Pertama
              </Button>
              {categories.length === 0 && (
                <p className='text-xs text-destructive mt-2'>
                  Harap tambahkan kategori terlebih dahulu melalui tombol
                  'Kategori'.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className='border rounded-lg shadow-sm overflow-hidden'>
                <Table>
                  <TableCaption className='text-xs'>
                    Menampilkan {displayedItems.length} dari {totalItems}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-[50px] hidden sm:table-cell text-xs px-2'>
                        Gambar
                      </TableHead>
                      <TableHead className='text-xs px-2'>Nama</TableHead>
                      <TableHead className='hidden md:table-cell text-xs px-2'>
                        SKU
                      </TableHead>
                      <TableHead className='hidden lg:table-cell text-xs px-2'>
                        Kategori
                      </TableHead>
                      <TableHead className='text-right text-xs px-2'>
                        Stok
                      </TableHead>
                      <TableHead className='text-right hidden sm:table-cell text-xs px-2'>
                        Harga Jual
                      </TableHead>
                      <TableHead className='text-right hidden sm:table-cell text-xs px-2'>
                        Harga Pokok
                      </TableHead>
                      <TableHead className='text-right text-xs px-2'>
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedItems.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className='hidden sm:table-cell py-1.5 px-2'>
                          <Image
                            src={
                              product.imageUrl ||
                              `https://placehold.co/64x64.png`
                            }
                            alt={product.name}
                            width={32}
                            height={32}
                            className='rounded object-cover h-8 w-8'
                            data-ai-hint={
                              product.imageHint ||
                              product.name
                                .split(' ')
                                .slice(0, 2)
                                .join(' ')
                                .toLowerCase()
                            }
                            onError={(e) =>
                              (e.currentTarget.src =
                                'https://placehold.co/64x64.png')
                            }
                          />
                        </TableCell>
                        <TableCell className='font-medium py-1.5 px-2 text-xs'>
                          {product.name}
                        </TableCell>
                        <TableCell className='hidden md:table-cell py-1.5 px-2 text-xs'>
                          {product.sku || '-'}
                        </TableCell>
                        <TableCell className='hidden lg:table-cell py-1.5 px-2 text-xs'>
                          {categories.find((c) => c.id === product.categoryId)
                            ?.name || 'N/A'}
                        </TableCell>
                        <TableCell className='text-right py-1.5 px-2 text-xs'>
                          {product.quantity}
                        </TableCell>
                        <TableCell className='text-right hidden sm:table-cell py-1.5 px-2 text-xs'>
                          {selectedBranch?.currency}{' '}
                          {product.price.toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className='text-right hidden sm:table-cell py-1.5 px-2 text-xs'>
                          {selectedBranch?.currency}{' '}
                          {(product.costPrice || 0).toLocaleString('id-ID')}
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
                                  router.push(`/inventory/${product.id}/edit`)
                                }
                              >
                                <FilePenLine className='mr-2 h-3.5 w-3.5' />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className='text-xs cursor-pointer'
                                onClick={() => handleDuplicateItem(product)}
                              >
                                <Copy className='mr-2 h-3.5 w-3.5' />
                                Duplikasi
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    className='text-xs cursor-pointer text-destructive'
                                    onSelect={(e) => e.preventDefault()} // Prevent dropdown from closing immediately
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
                                      Tindakan ini akan menghapus produk "
                                      {product.name}" secara permanen.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className='text-xs h-8'>
                                      Batal
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className='text-xs h-8 bg-destructive hover:bg-destructive/90'
                                      onClick={() =>
                                        handleDeleteItem(
                                          product.id,
                                          product.name
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
                  disabled={currentPage <= 1 || loadingItems}
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
                  disabled={currentPage >= totalPages || loadingItems}
                >
                  Berikutnya <ChevronRight className='ml-1 h-4 w-4' />
                </Button>
              </div>
            </>
          )}
        </div>

        <Dialog
          open={isCategoryManagerOpen}
          onOpenChange={setIsCategoryManagerOpen}
        >
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle className='text-base'>
                Kelola Kategori Inventaris
              </DialogTitle>
            </DialogHeader>
            <div className='space-y-3 py-2'>
              <form
                onSubmit={categoryForm.handleSubmit(onCategorySubmit)}
                className='flex items-end gap-2'
              >
                <div className='flex-grow'>
                  <Label htmlFor='categoryName' className='text-xs'>
                    Nama Kategori Baru
                  </Label>
                  <Input
                    id='categoryName'
                    {...categoryForm.register('name')}
                    className='h-9 text-xs'
                    placeholder='Contoh: Minuman'
                  />
                  {categoryForm.formState.errors.name && (
                    <p className='text-xs text-destructive mt-1'>
                      {categoryForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <Button
                  type='submit'
                  size='sm'
                  className='h-9 text-xs'
                  disabled={categoryForm.formState.isSubmitting}
                >
                  {categoryForm.formState.isSubmitting
                    ? 'Menambah...'
                    : 'Tambah'}
                </Button>
              </form>

              <div className='mt-3'>
                <h3 className='text-sm font-medium mb-1.5'>
                  Daftar Kategori Saat Ini:
                </h3>
                {loadingCategories ? (
                  <Skeleton className='h-8 w-full' />
                ) : categories.length === 0 ? (
                  <p className='text-xs text-muted-foreground'>
                    Belum ada kategori.
                  </p>
                ) : (
                  <ScrollArea className='max-h-60'>
                    <ul className='space-y-1 pr-1'>
                      {categories.map((cat) => (
                        <li
                          key={cat.id}
                          className='flex items-center justify-between text-xs p-1.5 bg-muted/50 rounded-md'
                        >
                          <div className='truncate'>
                            <span className='font-medium'>{cat.name}</span>
                            <span className='text-muted-foreground ml-1.5 text-[0.7rem]'>
                              (ID: {cat.id})
                            </span>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-6 w-6 text-destructive hover:text-destructive/80 shrink-0'
                              >
                                <X className='h-3.5 w-3.5' />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Hapus Kategori "{cat.name}"?
                                </AlertDialogTitle>
                                <AlertDialogDescription className='text-xs'>
                                  Ini akan menghapus kategori. Pastikan tidak
                                  ada produk yang masih menggunakan kategori
                                  ini. Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className='text-xs h-8'>
                                  Batal
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  className='text-xs h-8 bg-destructive hover:bg-destructive/90'
                                  onClick={() =>
                                    handleDeleteCategory(cat.id, cat.name)
                                  }
                                >
                                  Ya, Hapus Kategori
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                )}
              </div>
            </div>
            <DialogFooter className='pt-3'>
              <DialogClose asChild>
                <Button type='button' variant='outline' className='text-xs h-8'>
                  Tutup
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isImportDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setParsedCsvData([])
              setCsvImportFileName(null)
              setCsvImportSummary({ total: 0, invalidCategories: 0 })
            }
            setIsImportDialogOpen(open)
          }}
        >
          <DialogContent className='sm:max-w-2xl'>
            <DialogHeader>
              <DialogTitle className='text-base'>
                Konfirmasi Impor Inventaris
              </DialogTitle>
              {csvImportFileName && (
                <DialogDescription className='text-xs'>
                  File: {csvImportFileName}
                </DialogDescription>
              )}
            </DialogHeader>
            <div className='py-2'>
              {parsedCsvData.length > 0 ? (
                <>
                  <p className='text-sm mb-2'>
                    Akan mengimpor <strong>{csvImportSummary.total}</strong>{' '}
                    produk.
                    {csvImportSummary.invalidCategories > 0 && (
                      <span className='text-destructive font-medium'>
                        {' '}
                        ({csvImportSummary.invalidCategories} item memiliki ID
                        kategori tidak valid dan akan dilewati).
                      </span>
                    )}
                  </p>
                  {csvImportSummary.invalidCategories > 0 && (
                    <Alert variant='destructive' className='mb-3 text-xs'>
                      <AlertTriangle className='h-4 w-4' />
                      <AlertDescUI>
                        <strong>Peringatan Kategori Tidak Valid:</strong>{' '}
                        {csvImportSummary.invalidCategories} item memiliki ID
                        Kategori yang tidak terdaftar di cabang ini. Item-item
                        tersebut tidak akan diimpor. Silakan tambahkan kategori
                        yang diperlukan melalui tombol 'Kategori' di halaman
                        inventaris, lalu coba impor ulang file ini.
                      </AlertDescUI>
                    </Alert>
                  )}

                  <p className='text-sm mb-1'>
                    Berikut adalah preview beberapa item pertama (hingga 5
                    item):
                  </p>
                  <ScrollArea className='max-h-[30vh] border rounded-md'>
                    <Table className='text-xs'>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama Produk</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Nama Kategori (dari CSV)</TableHead>
                          <TableHead className='text-right'>Stok</TableHead>
                          <TableHead className='text-right'>
                            Harga Jual
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedCsvData.slice(0, 5).map((item, index) => (
                          <TableRow
                            key={index}
                            className={cn(
                              item.isCategoryInvalid && 'bg-destructive/10'
                            )}
                          >
                            <TableCell>
                              {item.name}
                              {item.isDuplicateSku && (
                                <Badge
                                  variant='outline'
                                  className='ml-1.5 text-xs border-amber-500 text-amber-600'
                                >
                                  SKU Duplikat
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{item.sku || '-'}</TableCell>
                            <TableCell
                              className={cn(
                                item.isCategoryInvalid &&
                                  'text-destructive font-medium'
                              )}
                            >
                              {item.categoryNameForPreview}
                            </TableCell>
                            <TableCell className='text-right'>
                              {item.quantity}
                            </TableCell>
                            <TableCell className='text-right'>
                              {item.price}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  {parsedCsvData.length > 5 && (
                    <p className='text-xs text-muted-foreground mt-1'>
                      Dan {parsedCsvData.length - 5} item lainnya...
                    </p>
                  )}
                  <p className='text-xs text-amber-600 mt-3'>
                    <strong>Perhatian:</strong> Fitur ini hanya akan menambahkan
                    produk baru. Jika SKU produk sudah ada, produk duplikat
                    mungkin akan dibuat (dengan SKU yang sama). SKU akan dibuat
                    otomatis jika kolom SKU di CSV kosong. Pastikan ID Kategori
                    di CSV valid dan sudah ada di sistem untuk cabang ini.
                  </p>
                </>
              ) : (
                <p className='text-sm text-muted-foreground'>
                  Tidak ada data valid untuk diimpor.
                </p>
              )}
            </div>
            <DialogFooter className='pt-3'>
              <DialogClose asChild>
                <Button
                  type='button'
                  variant='outline'
                  className='text-xs h-8'
                  disabled={isProcessingImport}
                >
                  Batal
                </Button>
              </DialogClose>
              <Button
                type='button'
                onClick={handleConfirmImport}
                className='text-xs h-8'
                disabled={isProcessingImport || parsedCsvData.length === 0}
              >
                {isProcessingImport
                  ? 'Memproses Impor...'
                  : 'Konfirmasi & Impor Produk'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  )
}
