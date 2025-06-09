
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
import { PlusCircle, Search, FilePenLine, Trash2 } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { Customer, CustomerInput } from "@/lib/firebase/customers"; // Updated import
import { addCustomer, getCustomers, updateCustomer, deleteCustomer } from "@/lib/firebase/customers"; // Updated import

const customerFormSchema = z.object({
  name: z.string().min(2, { message: "Nama pelanggan minimal 2 karakter." }),
  email: z.string().email({ message: "Format email tidak valid." }).optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

export default function CustomersPage() {
  const { userData } = useAuth(); 
  const { selectedBranch } = useBranch();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const customerForm = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  const fetchCustomers = useCallback(async () => {
    if (!selectedBranch) {
      setCustomers([]);
      setLoadingCustomers(false);
      return;
    }
    setLoadingCustomers(true);
    const fetchedCustomers = await getCustomers(selectedBranch.id);
    setCustomers(fetchedCustomers);
    setLoadingCustomers(false);
  }, [selectedBranch]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleOpenDialog = (customer: Customer | null = null) => {
    setEditingCustomer(customer);
    if (customer) {
      customerForm.reset({
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        notes: customer.notes || "",
      });
    } else {
      customerForm.reset({ name: "", email: "", phone: "", address: "", notes: "" });
    }
    setIsDialogOpen(true);
  };

  const onSubmitCustomer: SubmitHandler<CustomerFormValues> = async (values) => {
    if (!selectedBranch) {
      toast({ title: "Error", description: "Cabang tidak valid.", variant: "destructive" });
      return;
    }

    const customerData: CustomerInput = {
      ...values,
      branchId: selectedBranch.id,
    };

    let result;
    if (editingCustomer) {
      result = await updateCustomer(editingCustomer.id, customerData);
    } else {
      result = await addCustomer(customerData);
    }

    if (result && "error" in result) {
      toast({ title: editingCustomer ? "Gagal Memperbarui" : "Gagal Menambah", description: result.error, variant: "destructive" });
    } else {
      toast({ title: editingCustomer ? "Pelanggan Diperbarui" : "Pelanggan Ditambahkan" });
      setIsDialogOpen(false);
      await fetchCustomers();
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    const result = await deleteCustomer(customerToDelete.id);
    if (result && "error" in result) {
      toast({ title: "Gagal Menghapus", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Pelanggan Dihapus" });
      await fetchCustomers();
    }
    setCustomerToDelete(null);
  };
  
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  );


  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold font-headline">
              Manajemen Pelanggan {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            <div className="flex gap-2 w-full sm:w-auto">
               <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari pelanggan..."
                  className="pl-8 w-full sm:w-56 rounded-md h-9 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={!selectedBranch || loadingCustomers}
                />
              </div>
              <Button size="sm" className="rounded-md text-xs" onClick={() => handleOpenDialog()} disabled={!selectedBranch}>
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Tambah Pelanggan
              </Button>
            </div>
          </div>

          {loadingCustomers ? (
             <div className="space-y-2 border rounded-lg shadow-sm p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
          ) : !selectedBranch ? (
            <div className="border rounded-lg shadow-sm overflow-hidden p-10 text-center">
                <p className="text-sm text-muted-foreground">Pilih cabang untuk mengelola data pelanggan.</p>
            </div>
          ) : filteredCustomers.length === 0 && searchTerm ? (
            <div className="border rounded-lg shadow-sm overflow-hidden p-10 text-center">
              <p className="text-sm text-muted-foreground">Tidak ada pelanggan yang cocok dengan pencarian Anda.</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="border rounded-lg shadow-sm overflow-hidden p-10 text-center">
              <p className="text-sm text-muted-foreground">Belum ada data pelanggan untuk cabang ini.</p>
              <Button size="sm" className="mt-4 text-xs" onClick={() => handleOpenDialog()}>
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Tambah Pelanggan Pertama
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg shadow-sm overflow-hidden">
              <Table>
                <TableCaption className="text-xs">Daftar pelanggan untuk {selectedBranch?.name || 'cabang terpilih'}.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nama Pelanggan</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Email</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Telepon</TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">Alamat</TableHead>
                    <TableHead className="text-right text-xs">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="py-2 text-xs font-medium">{customer.name}</TableCell>
                      <TableCell className="py-2 text-xs hidden sm:table-cell">{customer.email || "-"}</TableCell>
                      <TableCell className="py-2 text-xs hidden md:table-cell">{customer.phone || "-"}</TableCell>
                      <TableCell className="py-2 text-xs hidden lg:table-cell truncate max-w-xs" title={customer.address}>{customer.address || "-"}</TableCell>
                      <TableCell className="text-right py-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog(customer)}>
                          <FilePenLine className="h-3.5 w-3.5" />
                           <span className="sr-only">Edit</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => setCustomerToDelete(customer)}>
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Hapus</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                              <AlertDialogDescription className="text-xs">
                                Tindakan ini akan menghapus pelanggan "{customerToDelete?.name}". Ini tidak dapat dibatalkan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="text-xs h-8" onClick={() => setCustomerToDelete(null)}>Batal</AlertDialogCancel>
                              <AlertDialogAction 
                                className="text-xs h-8 bg-destructive hover:bg-destructive/90" 
                                onClick={handleDeleteCustomer}
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">{editingCustomer ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={customerForm.handleSubmit(onSubmitCustomer)} className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <Label htmlFor="customerName" className="text-xs">Nama Pelanggan*</Label>
                <Input id="customerName" {...customerForm.register("name")} className="h-9 text-xs mt-1" placeholder="Nama lengkap pelanggan"/>
                {customerForm.formState.errors.name && <p className="text-xs text-destructive mt-1">{customerForm.formState.errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="customerEmail" className="text-xs">Email</Label>
                <Input id="customerEmail" type="email" {...customerForm.register("email")} className="h-9 text-xs mt-1" placeholder="email@pelanggan.com"/>
                {customerForm.formState.errors.email && <p className="text-xs text-destructive mt-1">{customerForm.formState.errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="customerPhone" className="text-xs">Telepon</Label>
                <Input id="customerPhone" {...customerForm.register("phone")} className="h-9 text-xs mt-1" placeholder="08xxxxxxxxxx"/>
              </div>
              <div>
                <Label htmlFor="customerAddress" className="text-xs">Alamat</Label>
                <Textarea id="customerAddress" {...customerForm.register("address")} className="text-xs mt-1 min-h-[70px]" placeholder="Alamat lengkap pelanggan"/>
              </div>
              <div>
                <Label htmlFor="customerNotes" className="text-xs">Catatan</Label>
                <Textarea id="customerNotes" {...customerForm.register("notes")} className="text-xs mt-1 min-h-[70px]" placeholder="Catatan tambahan tentang pelanggan"/>
              </div>
               <DialogFooter className="pt-3">
                 <DialogClose asChild>
                    <Button type="button" variant="outline" className="text-xs h-8">Batal</Button>
                  </DialogClose>
                <Button type="submit" className="text-xs h-8" disabled={customerForm.formState.isSubmitting}>
                  {customerForm.formState.isSubmitting ? "Menyimpan..." : (editingCustomer ? "Simpan Perubahan" : "Tambah Pelanggan")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </MainLayout>
    </ProtectedRoute>
  );
}

    