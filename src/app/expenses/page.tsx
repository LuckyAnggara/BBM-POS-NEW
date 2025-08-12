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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  PlusCircle,
  Filter,
  Download,
  FilePenLine,
  Trash2,
  DollarSign,
  Activity,
} from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { type DateRange } from 'react-day-picker'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EXPENSE_CATEGORIES } from '@/lib/appwrite/expenses'
import {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '@/lib/laravel/expenseService'
import type { Expense } from '@/lib/types'
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { cn, formatCurrency } from '@/lib/utils'
import { useDebounce } from '@uidotdev/usehooks'
import { ITEMS_PER_PAGE_OPTIONS } from '@/lib/types'

// Local date formatter for created_at
const formatDateIntl = (dateInput: string | Date) => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  return format(date, 'dd MMM yyyy')
}

const expenseFormSchema = z.object({
  category: z.string().min(1, { message: 'Kategori harus dipilih.' }),
  amount: z.coerce.number().positive({ message: 'Jumlah harus lebih dari 0.' }),
  description: z
    .string()
    .min(3, { message: 'Deskripsi minimal 3 karakter.' })
    .max(200, { message: 'Deskripsi maksimal 200 karakter.' }),
})

type ExpenseFormValues = z.infer<typeof expenseFormSchema>

export default function ExpensesPage() {
  const { currentUser } = useAuth()

  const { selectedBranch } = useBranches()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loadingExpenses, setLoadingExpenses] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  // Compute dynamic summary and total from filtered expenses
  const expenseSummary = expenses.reduce<Record<string, number>>((acc, e) => {
    const amt = Number((e as any).amount ?? 0)
    acc[e.category] = (acc[e.category] || 0) + (isNaN(amt) ? 0 : amt)
    return acc
  }, {})
  const totalExpenses = Object.values(expenseSummary).reduce(
    (sum, v) => sum + v,
    0
  )
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 800)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    ITEMS_PER_PAGE_OPTIONS[0]
  )
  const [totalItems, setTotalItems] = useState(0)
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  // Filter states
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })

  // Temporary states for filters inside Popover
  const [tempCategories, setTempCategories] =
    useState<string[]>(selectedCategories)
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(
    dateRange
  )

  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      category: '',
      amount: 0,
      description: '',
    },
  })

  const fetchExpenses = useCallback(async () => {
    if (!selectedBranch) {
      setExpenses([])
      setLoadingExpenses(false)
      setTotalItems(0)
      return
    }
    setLoadingExpenses(true)
    try {
      const res = await listExpenses({
        branchId: selectedBranch.id,
        page: currentPage,
        limit: itemsPerPage,
        categories: selectedCategories,
        search: debouncedSearchTerm || undefined,
        startDate: format(
          dateRange?.from || startOfMonth(new Date()),
          'yyyy-MM-dd'
        ),
        endDate: format(dateRange?.to || endOfMonth(new Date()), 'yyyy-MM-dd'),
      })
      setExpenses(res.data)
      setTotalItems(res.total || res.data.length)
    } catch (e) {
      toast.error('Gagal memuat pengeluaran')
    } finally {
      setLoadingExpenses(false)
    }
  }, [
    selectedBranch,
    currentPage,
    itemsPerPage,
    dateRange,
    debouncedSearchTerm,
    selectedCategories,
  ])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedBranch])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, selectedCategories, dateRange])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const handleOpenDialog = (expense: Expense | null = null) => {
    setEditingExpense(expense)
    if (expense) {
      expenseForm.reset({
        category: expense.category,
        amount: expense.amount,
        description: expense.description || '',
      })
    } else {
      expenseForm.reset({
        category: '',
        amount: 0,
        description: '',
      })
    }
    setIsDialogOpen(true)
  }

  const onSubmitExpense: SubmitHandler<ExpenseFormValues> = async (values) => {
    if (!selectedBranch || !currentUser) {
      toast.error('Error', {
        description: 'Cabang atau pengguna tidak valid.',
      })
      return
    }

    const payload = {
      branch_id: selectedBranch.id,
      category: values.category,
      amount: values.amount,
      description: values.description,
    }

    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id as any, payload as any)
        toast.success('Pengeluaran Diperbarui')
      } else {
        await createExpense(payload as any)
        toast.success('Pengeluaran Ditambahkan')
      }
      setIsDialogOpen(false)
      await fetchExpenses()
    } catch (error: any) {
      let errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
        const firstErrorKey = Object.keys(validationErrors)[0]
        errorMessage = validationErrors[firstErrorKey][0]
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      toast.error(editingExpense ? 'Gagal Memperbarui' : 'Gagal Menambah', {
        description: errorMessage,
      })
    }
  }

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return
    try {
      await deleteExpense(expenseToDelete.id as any)
      toast.success('Pengeluaran Dihapus')
      await fetchExpenses()
    } catch (error: any) {
      let errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
        const firstErrorKey = Object.keys(validationErrors)[0]
        errorMessage = validationErrors[firstErrorKey][0]
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      toast.error('Gagal Menghapus', { description: errorMessage })
    }
    setExpenseToDelete(null)
  }

  const handleApplyFilters = () => {
    setDateRange(tempDateRange)
    setSelectedCategories(tempCategories)
    setIsFilterOpen(false)
  }

  const handleResetFilters = () => {
    const now = new Date()
    const defaultStart = startOfMonth(now)
    const defaultEnd = endOfMonth(now)

    // Reset temp state
    setTempDateRange({ from: defaultStart, to: defaultEnd })
    setTempCategories([])

    // Also apply them immediately to re-fetch
    setDateRange({ from: defaultStart, to: defaultEnd })
    setSelectedCategories([])
    setIsFilterOpen(false)
  }

  const activeFilterCount =
    (selectedCategories.length > 0 ? 1 : 0) +
    (dateRange?.from || dateRange?.to ? 1 : 0)

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-4'>
          <div className='flex flex-col sm:flex-row justify-between items-center gap-3'>
            <h1 className='text-xl md:text-2xl font-semibold font-headline'>
              Pengeluaran {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            <div className='flex gap-2 w-full sm:w-auto items-center'>
              <div className='relative flex-grow sm:flex-grow-0'>
                <Input
                  type='search'
                  placeholder='Cari deskripsi/kategori...'
                  className='pl-3 w-full sm:w-56 rounded-md h-9 text-xs'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={!selectedBranch || loadingExpenses}
                />
              </div>
              <div className='hidden md:flex items-center gap-1 text-xs'>
                <span>Per halaman:</span>
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(v) => setItemsPerPage(Number(v))}
                >
                  <SelectTrigger className='h-8 w-[80px]'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt}
                        value={String(opt)}
                        className='text-xs'
                      >
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    size='sm'
                    className='rounded-md text-xs'
                    onClick={() => {
                      // Sync temp filters with applied filters when opening
                      setTempDateRange(dateRange)
                      setTempCategories(selectedCategories)
                      setIsFilterOpen(true)
                    }}
                  >
                    <Filter className='mr-1.5 h-3.5 w-3.5' />
                    Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-auto p-0' align='end'>
                  <div className='p-4'>
                    <h4 className='font-medium leading-none text-sm'>
                      Filter Pengeluaran
                    </h4>
                    <p className='text-xs text-muted-foreground mt-1'>
                      Filter berdasarkan tanggal dan kategori.
                    </p>
                  </div>
                  <hr />
                  <div className='p-4 flex flex-row space-x-4'>
                    <div className='space-y-1'>
                      <Label className='text-xs'>Rentang Tanggal</Label>
                      <Calendar
                        mode='range'
                        selected={tempDateRange}
                        onSelect={setTempDateRange}
                        className='rounded-md border p-2'
                        numberOfMonths={1}
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label className='text-xs'>Kategori</Label>
                      <div className='grid grid-cols-2 gap-2'>
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <Button
                            key={cat}
                            variant={
                              tempCategories.includes(cat)
                                ? 'default'
                                : 'outline'
                            }
                            size='sm'
                            className='text-xs h-8'
                            onClick={() => {
                              setTempCategories((prev) =>
                                prev.includes(cat)
                                  ? prev.filter((c) => c !== cat)
                                  : [...prev, cat]
                              )
                            }}
                          >
                            {cat}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <hr />
                  <div className='flex items-center justify-end gap-2 p-4'>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-xs h-8'
                      onClick={handleResetFilters}
                    >
                      Reset
                    </Button>
                    <Button
                      size='sm'
                      className='text-xs h-8'
                      onClick={handleApplyFilters}
                    >
                      Terapkan
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant='outline'
                size='sm'
                className='rounded-md text-xs'
                disabled
              >
                <Download className='mr-1.5 h-3.5 w-3.5' /> Ekspor (Segera)
              </Button>
              <Button
                size='sm'
                className='rounded-md text-xs'
                onClick={() => handleOpenDialog()}
                disabled={!selectedBranch}
              >
                <PlusCircle className='mr-1.5 h-3.5 w-3.5' /> Tambah Pengeluaran
              </Button>
            </div>
          </div>

          {!loadingExpenses && selectedBranch && (
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Total Pengeluaran
                  </CardTitle>
                  <DollarSign className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {formatCurrency(totalExpenses)}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Total dari semua kategori
                  </p>
                </CardContent>
              </Card>
              {(selectedCategories.length
                ? selectedCategories
                : Object.keys(expenseSummary)
              ).map((category) => (
                <Card key={category}>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>
                      {category}
                    </CardTitle>
                    <Activity className='h-4 w-4 text-muted-foreground' />
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold'>
                      {formatCurrency(expenseSummary[category] || 0)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {loadingExpenses ? (
            <div className='space-y-2 border rounded-lg shadow-sm p-4'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
            </div>
          ) : !selectedBranch ? (
            <div className='border rounded-lg shadow-sm overflow-hidden p-10 text-center'>
              <p className='text-sm text-muted-foreground'>
                Pilih cabang untuk melihat data pengeluaran.
              </p>
            </div>
          ) : expenses.length === 0 ? (
            <div className='border rounded-lg shadow-sm overflow-hidden p-10 text-center'>
              <p className='text-sm text-muted-foreground'>
                {selectedCategories.length > 0
                  ? 'Tidak ada pengeluaran yang cocok dengan filter kategori Anda.'
                  : 'Belum ada data pengeluaran untuk cabang ini.'}
              </p>
            </div>
          ) : (
            <div className='border rounded-lg shadow-sm overflow-hidden'>
              <Table>
                <TableCaption className='text-xs'>
                  Menampilkan {expenses.length} dari {totalItems}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-xs w-12'>No</TableHead>
                    <TableHead className='text-xs'>Tanggal</TableHead>
                    <TableHead className='text-xs'>Kategori</TableHead>
                    <TableHead className='hidden sm:table-cell text-xs'>
                      Deskripsi
                    </TableHead>
                    <TableHead className='text-right text-xs'>Jumlah</TableHead>
                    <TableHead className='text-right text-xs'>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense, idx) => (
                    <TableRow key={expense.id}>
                      <TableCell className='py-2 text-xs'>
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </TableCell>
                      <TableCell className='py-2 text-xs'>
                        {formatDateIntl(expense.created_at)}
                      </TableCell>
                      <TableCell className='py-2 text-xs'>
                        {expense.category}
                      </TableCell>
                      <TableCell className='hidden sm:table-cell py-2 text-xs'>
                        {expense.description}
                      </TableCell>
                      <TableCell className='text-right font-medium py-2 text-xs'>
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className='text-right py-2'>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-7 w-7'
                          onClick={() => handleOpenDialog(expense)}
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
                              onClick={() => setExpenseToDelete(expense)}
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
                                Tindakan ini akan menghapus pengeluaran untuk
                                kategori "{expenseToDelete?.category}" sebesar{' '}
                                {formatCurrency(expenseToDelete?.amount || 0)}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                className='text-xs h-8'
                                onClick={() => setExpenseToDelete(null)}
                              >
                                Batal
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className='text-xs h-8 bg-destructive hover:bg-destructive/90'
                                onClick={handleDeleteExpense}
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
          )}
          {/* Pagination controls */}
          <div className='flex justify-between items-center pt-2'>
            <Button
              variant='outline'
              size='sm'
              className='text-xs h-8'
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loadingExpenses}
            >
              Sebelumnya
            </Button>
            <span className='text-xs text-muted-foreground'>
              Halaman {currentPage} dari {Math.max(1, totalPages)}
            </span>
            <Button
              variant='outline'
              size='sm'
              className='text-xs h-8'
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage >= totalPages || loadingExpenses}
            >
              Berikutnya
            </Button>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className='sm:max-w-2xl'>
            <DialogHeader>
              <DialogTitle className='text-base'>
                {editingExpense
                  ? 'Edit Pengeluaran'
                  : 'Tambah Pengeluaran Baru'}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={expenseForm.handleSubmit(onSubmitExpense)}
              className='space-y-3 p-2 max-h-[70vh] overflow-y-auto pr-2'
            >
              <div>
                <Label htmlFor='category' className='text-xs'>
                  Kategori
                </Label>
                <Controller
                  name='category'
                  control={expenseForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className='h-9 text-xs mt-1'>
                        <SelectValue placeholder='Pilih kategori' />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat} className='text-xs'>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {expenseForm.formState.errors.category && (
                  <p className='text-xs text-destructive mt-1'>
                    {expenseForm.formState.errors.category.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='amount' className='text-xs'>
                  Jumlah ({selectedBranch?.currency || 'Rp'})
                </Label>
                <Input
                  id='amount'
                  type='number'
                  {...expenseForm.register('amount')}
                  className='h-9 text-xs mt-1'
                  placeholder='Contoh: 50000'
                />
                {expenseForm.formState.errors.amount && (
                  <p className='text-xs text-destructive mt-1'>
                    {expenseForm.formState.errors.amount.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='description' className='text-xs'>
                  Deskripsi
                </Label>
                <Textarea
                  id='description'
                  {...expenseForm.register('description')}
                  className='text-xs mt-1 min-h-[70px]'
                  placeholder='Deskripsi singkat pengeluaran'
                />
                {expenseForm.formState.errors.description && (
                  <p className='text-xs text-destructive mt-1'>
                    {expenseForm.formState.errors.description.message}
                  </p>
                )}
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
                  disabled={expenseForm.formState.isSubmitting}
                >
                  {expenseForm.formState.isSubmitting
                    ? 'Menyimpan...'
                    : editingExpense
                    ? 'Simpan Perubahan'
                    : 'Tambah Pengeluaran'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  )
}
