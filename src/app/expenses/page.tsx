
"use client";

import React, { useState, useEffect, useCallback } from "react";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, Filter, Download, FilePenLine, Trash2, CalendarIcon } from "lucide-react";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Timestamp } from "firebase/firestore";
import { 
  addExpense, 
  getExpenses, 
  updateExpense, 
  deleteExpense, 
  type Expense, 
  type ExpenseInput,
  EXPENSE_CATEGORIES,
  type ExpenseCategory
} from "@/lib/firebase/firestore";
import { format, parseISO } from "date-fns";

const expenseFormSchema = z.object({
  date: z.date({ required_error: "Tanggal harus diisi." }),
  category: z.string().min(1, { message: "Kategori harus dipilih." }),
  amount: z.coerce.number().positive({ message: "Jumlah harus lebih dari 0." }),
  description: z.string().min(3, {message: "Deskripsi minimal 3 karakter."}).max(200, {message: "Deskripsi maksimal 200 karakter."}),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export default function ExpensesPage() {
  const { userData, currentUser } = useAuth();
  const { selectedBranch } = useBranch();
  const { toast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      date: new Date(),
      category: "",
      amount: 0,
      description: "",
    },
  });

  const fetchExpenses = useCallback(async () => {
    if (!selectedBranch) {
      setExpenses([]);
      setLoadingExpenses(false);
      return;
    }
    setLoadingExpenses(true);
    const fetchedExpenses = await getExpenses(selectedBranch.id, { categories: selectedCategories });
    setExpenses(fetchedExpenses);
    setLoadingExpenses(false);
  }, [selectedBranch, selectedCategories]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleOpenDialog = (expense: Expense | null = null) => {
    setEditingExpense(expense);
    if (expense) {
      expenseForm.reset({
        date: expense.date.toDate(), // Convert Timestamp to Date
        category: expense.category,
        amount: expense.amount,
        description: expense.description,
      });
    } else {
      expenseForm.reset({
        date: new Date(),
        category: "",
        amount: 0,
        description: "",
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmitExpense: SubmitHandler<ExpenseFormValues> = async (values) => {
    if (!selectedBranch || !currentUser) {
      toast({ title: "Error", description: "Cabang atau pengguna tidak valid.", variant: "destructive" });
      return;
    }

    const expenseData: ExpenseInput = {
      branchId: selectedBranch.id,
      date: Timestamp.fromDate(values.date),
      category: values.category,
      amount: values.amount,
      description: values.description,
    };

    let result;
    if (editingExpense) {
      result = await updateExpense(editingExpense.id, expenseData);
    } else {
      result = await addExpense(expenseData, currentUser.uid);
    }

    if (result && "error" in result) {
      toast({ title: editingExpense ? "Gagal Memperbarui" : "Gagal Menambah", description: result.error, variant: "destructive" });
    } else {
      toast({ title: editingExpense ? "Pengeluaran Diperbarui" : "Pengeluaran Ditambahkan" });
      setIsDialogOpen(false);
      await fetchExpenses();
    }
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    const result = await deleteExpense(expenseToDelete.id);
    if (result && "error" in result) {
      toast({ title: "Gagal Menghapus", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Pengeluaran Dihapus" });
      await fetchExpenses();
    }
    setExpenseToDelete(null);
  };

  const handleCategoryFilterChange = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };
  
  const formatDate = (timestamp: Timestamp | Date) => {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return format(date, "dd MMM yyyy");
  };

  const formatCurrency = (amount: number) => {
    return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString('id-ID')}`;
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold font-headline">
              Pengeluaran {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            <div className="flex gap-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-md text-xs">
                    <Filter className="mr-1.5 h-3.5 w-3.5" /> Filter Kategori
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="text-xs">Filter berdasarkan Kategori</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {EXPENSE_CATEGORIES.map(cat => (
                    <DropdownMenuCheckboxItem 
                      key={cat} 
                      className="text-xs"
                      checked={selectedCategories.includes(cat)}
                      onCheckedChange={() => handleCategoryFilterChange(cat)}
                    >
                      {cat}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" className="rounded-md text-xs" disabled>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Ekspor (Segera)
              </Button>
              <Button size="sm" className="rounded-md text-xs" onClick={() => handleOpenDialog()} disabled={!selectedBranch}>
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Tambah Pengeluaran
              </Button>
            </div>
          </div>

          {loadingExpenses ? (
             <div className="space-y-2 border rounded-lg shadow-sm p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
          ) : !selectedBranch ? (
            <div className="border rounded-lg shadow-sm overflow-hidden p-10 text-center">
                <p className="text-sm text-muted-foreground">Pilih cabang untuk melihat data pengeluaran.</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="border rounded-lg shadow-sm overflow-hidden p-10 text-center">
                <p className="text-sm text-muted-foreground">
                    {selectedCategories.length > 0 ? "Tidak ada pengeluaran yang cocok dengan filter kategori Anda." : "Belum ada data pengeluaran untuk cabang ini."}
                </p>
            </div>
          ) : (
            <div className="border rounded-lg shadow-sm overflow-hidden">
              <Table>
                <TableCaption className="text-xs">Daftar pengeluaran untuk {selectedBranch?.name || 'cabang terpilih'}.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Tanggal</TableHead>
                    <TableHead className="text-xs">Kategori</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs">Deskripsi</TableHead>
                    <TableHead className="text-right text-xs">Jumlah</TableHead>
                    <TableHead className="text-right text-xs">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="py-2 text-xs">{formatDate(expense.date)}</TableCell>
                      <TableCell className="py-2 text-xs">{expense.category}</TableCell>
                      <TableCell className="hidden sm:table-cell py-2 text-xs">{expense.description}</TableCell>
                      <TableCell className="text-right font-medium py-2 text-xs">{formatCurrency(expense.amount)}</TableCell>
                      <TableCell className="text-right py-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog(expense)}>
                          <FilePenLine className="h-3.5 w-3.5" />
                           <span className="sr-only">Edit</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => setExpenseToDelete(expense)}>
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Hapus</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                              <AlertDialogDescription className="text-xs">
                                Tindakan ini akan menghapus pengeluaran untuk kategori "{expenseToDelete?.category}" sebesar {formatCurrency(expenseToDelete?.amount || 0)}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="text-xs h-8" onClick={() => setExpenseToDelete(null)}>Batal</AlertDialogCancel>
                              <AlertDialogAction 
                                className="text-xs h-8 bg-destructive hover:bg-destructive/90" 
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
        </div>

        {/* Add/Edit Expense Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">{editingExpense ? "Edit Pengeluaran" : "Tambah Pengeluaran Baru"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={expenseForm.handleSubmit(onSubmitExpense)} className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <Label htmlFor="date" className="text-xs">Tanggal</Label>
                <Controller
                  name="date"
                  control={expenseForm.control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className="w-full justify-start text-left font-normal h-9 text-xs mt-1"
                        >
                          <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                          {field.value ? format(field.value, "dd MMM yyyy") : <span>Pilih tanggal</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {expenseForm.formState.errors.date && <p className="text-xs text-destructive mt-1">{expenseForm.formState.errors.date.message}</p>}
              </div>
              <div>
                <Label htmlFor="category" className="text-xs">Kategori</Label>
                <Controller
                  name="category"
                  control={expenseForm.control}
                  render={({ field }) => (
                     <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="h-9 text-xs mt-1">
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {expenseForm.formState.errors.category && <p className="text-xs text-destructive mt-1">{expenseForm.formState.errors.category.message}</p>}
              </div>
              <div>
                <Label htmlFor="amount" className="text-xs">Jumlah ({selectedBranch?.currency || 'Rp'})</Label>
                <Input id="amount" type="number" {...expenseForm.register("amount")} className="h-9 text-xs mt-1" placeholder="Contoh: 50000"/>
                {expenseForm.formState.errors.amount && <p className="text-xs text-destructive mt-1">{expenseForm.formState.errors.amount.message}</p>}
              </div>
              <div>
                <Label htmlFor="description" className="text-xs">Deskripsi</Label>
                <Textarea id="description" {...expenseForm.register("description")} className="text-xs mt-1 min-h-[70px]" placeholder="Deskripsi singkat pengeluaran"/>
                {expenseForm.formState.errors.description && <p className="text-xs text-destructive mt-1">{expenseForm.formState.errors.description.message}</p>}
              </div>
               <DialogFooter className="pt-3">
                 <DialogClose asChild>
                    <Button type="button" variant="outline" className="text-xs h-8">Batal</Button>
                  </DialogClose>
                <Button type="submit" className="text-xs h-8" disabled={expenseForm.formState.isSubmitting}>
                  {expenseForm.formState.isSubmitting ? "Menyimpan..." : (editingExpense ? "Simpan Perubahan" : "Tambah Pengeluaran")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </MainLayout>
    </ProtectedRoute>
  );
}
