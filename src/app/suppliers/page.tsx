
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
import type { Supplier, SupplierInput } from "@/lib/firebase/firestore";
import { addSupplier, getSuppliers, updateSupplier, deleteSupplier } from "@/lib/firebase/firestore";

const supplierFormSchema = z.object({
  name: z.string().min(2, { message: "Nama pemasok minimal 2 karakter." }),
  contactPerson: z.string().optional(),
  email: z.string().email({ message: "Format email tidak valid." }).optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

export default function SuppliersPage() {
  const { userData } = useAuth();
  const { selectedBranch } = useBranch();
  const { toast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const supplierForm = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  const fetchSuppliers = useCallback(async () => {
    if (!selectedBranch) {
      setSuppliers([]);
      setLoadingSuppliers(false);
      return;
    }
    setLoadingSuppliers(true);
    const fetchedSuppliers = await getSuppliers(selectedBranch.id);
    setSuppliers(fetchedSuppliers);
    setLoadingSuppliers(false);
  }, [selectedBranch]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleOpenDialog = (supplier: Supplier | null = null) => {
    setEditingSupplier(supplier);
    if (supplier) {
      supplierForm.reset({
        name: supplier.name,
        contactPerson: supplier.contactPerson || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        notes: supplier.notes || "",
      });
    } else {
      supplierForm.reset({ name: "", contactPerson: "", email: "", phone: "", address: "", notes: "" });
    }
    setIsDialogOpen(true);
  };

  const onSubmitSupplier: SubmitHandler<SupplierFormValues> = async (values) => {
    if (!selectedBranch) {
      toast({ title: "Error", description: "Cabang tidak valid.", variant: "destructive" });
      return;
    }

    const supplierData: SupplierInput = {
      ...values,
      branchId: selectedBranch.id,
    };

    let result;
    if (editingSupplier) {
      result = await updateSupplier(editingSupplier.id, supplierData);
    } else {
      result = await addSupplier(supplierData);
    }

    if (result && "error" in result) {
      toast({ title: editingSupplier ? "Gagal Memperbarui" : "Gagal Menambah", description: result.error, variant: "destructive" });
    } else {
      toast({ title: editingSupplier ? "Pemasok Diperbarui" : "Pemasok Ditambahkan" });
      setIsDialogOpen(false);
      await fetchSuppliers();
    }
  };

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    const result = await deleteSupplier(supplierToDelete.id);
    if (result && "error" in result) {
      toast({ title: "Gagal Menghapus", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Pemasok Dihapus" });
      await fetchSuppliers();
    }
    setSupplierToDelete(null);
  };
  
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold font-headline">
              Manajemen Pemasok {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            <div className="flex gap-2 w-full sm:w-auto">
               <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari pemasok..."
                  className="pl-8 w-full sm:w-56 rounded-md h-9 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={!selectedBranch || loadingSuppliers}
                />
              </div>
              <Button size="sm" className="rounded-md text-xs" onClick={() => handleOpenDialog()} disabled={!selectedBranch}>
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Tambah Pemasok
              </Button>
            </div>
          </div>

          {loadingSuppliers ? (
             <div className="space-y-2 border rounded-lg shadow-sm p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
          ) : !selectedBranch ? (
            <div className="border rounded-lg shadow-sm overflow-hidden p-10 text-center">
                <p className="text-sm text-muted-foreground">Pilih cabang untuk mengelola data pemasok.</p>
            </div>
          ) : filteredSuppliers.length === 0 && searchTerm ? (
            <div className="border rounded-lg shadow-sm overflow-hidden p-10 text-center">
              <p className="text-sm text-muted-foreground">Tidak ada pemasok yang cocok dengan pencarian Anda.</p>
            </div>
          ) : suppliers.length === 0 ? (
            <div className="border rounded-lg shadow-sm overflow-hidden p-10 text-center">
              <p className="text-sm text-muted-foreground">Belum ada data pemasok untuk cabang ini.</p>
              <Button size="sm" className="mt-4 text-xs" onClick={() => handleOpenDialog()}>
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Tambah Pemasok Pertama
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg shadow-sm overflow-hidden">
              <Table>
                <TableCaption className="text-xs">Daftar pemasok untuk {selectedBranch?.name || 'cabang terpilih'}.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nama Pemasok</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Kontak Person</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Email</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Telepon</TableHead>
                    <TableHead className="text-right text-xs">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="py-2 text-xs font-medium">{supplier.name}</TableCell>
                      <TableCell className="py-2 text-xs hidden sm:table-cell">{supplier.contactPerson || "-"}</TableCell>
                      <TableCell className="py-2 text-xs hidden md:table-cell">{supplier.email || "-"}</TableCell>
                      <TableCell className="py-2 text-xs hidden md:table-cell">{supplier.phone || "-"}</TableCell>
                      <TableCell className="text-right py-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog(supplier)}>
                          <FilePenLine className="h-3.5 w-3.5" />
                           <span className="sr-only">Edit</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => setSupplierToDelete(supplier)}>
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Hapus</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                              <AlertDialogDescription className="text-xs">
                                Tindakan ini akan menghapus pemasok "{supplierToDelete?.name}". Ini tidak dapat dibatalkan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="text-xs h-8" onClick={() => setSupplierToDelete(null)}>Batal</AlertDialogCancel>
                              <AlertDialogAction 
                                className="text-xs h-8 bg-destructive hover:bg-destructive/90" 
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
          )}
        </div>

        {/* Add/Edit Supplier Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">{editingSupplier ? "Edit Pemasok" : "Tambah Pemasok Baru"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={supplierForm.handleSubmit(onSubmitSupplier)} className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <Label htmlFor="name" className="text-xs">Nama Pemasok*</Label>
                <Input id="name" {...supplierForm.register("name")} className="h-9 text-xs mt-1" placeholder="Contoh: PT Pemasok Jaya"/>
                {supplierForm.formState.errors.name && <p className="text-xs text-destructive mt-1">{supplierForm.formState.errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="contactPerson" className="text-xs">Kontak Person</Label>
                <Input id="contactPerson" {...supplierForm.register("contactPerson")} className="h-9 text-xs mt-1" placeholder="Nama kontak"/>
              </div>
              <div>
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input id="email" type="email" {...supplierForm.register("email")} className="h-9 text-xs mt-1" placeholder="kontak@pemasok.com"/>
                {supplierForm.formState.errors.email && <p className="text-xs text-destructive mt-1">{supplierForm.formState.errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="phone" className="text-xs">Telepon</Label>
                <Input id="phone" {...supplierForm.register("phone")} className="h-9 text-xs mt-1" placeholder="08xxxxxxxxxx"/>
              </div>
              <div>
                <Label htmlFor="address" className="text-xs">Alamat</Label>
                <Textarea id="address" {...supplierForm.register("address")} className="text-xs mt-1 min-h-[70px]" placeholder="Alamat lengkap pemasok"/>
              </div>
              <div>
                <Label htmlFor="notes" className="text-xs">Catatan</Label>
                <Textarea id="notes" {...supplierForm.register("notes")} className="text-xs mt-1 min-h-[70px]" placeholder="Catatan tambahan tentang pemasok"/>
              </div>
               <DialogFooter className="pt-3">
                 <DialogClose asChild>
                    <Button type="button" variant="outline" className="text-xs h-8">Batal</Button>
                  </DialogClose>
                <Button type="submit" className="text-xs h-8" disabled={supplierForm.formState.isSubmitting}>
                  {supplierForm.formState.isSubmitting ? "Menyimpan..." : (editingSupplier ? "Simpan Perubahan" : "Tambah Pemasok")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </MainLayout>
    </ProtectedRoute>
  );
}
