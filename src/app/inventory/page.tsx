
"use client";

import React, { useState, useEffect, useCallback } from "react";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, FilePenLine, Trash2, Search, PackagePlus, Tag, X } from "lucide-react";
import Image from "next/image";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { InventoryItem, InventoryCategory, InventoryItemInput, InventoryCategoryInput } from "@/lib/firebase/inventory"; // Updated import
import {
  addInventoryItem, getInventoryItems, updateInventoryItem, deleteInventoryItem,
  addInventoryCategory, getInventoryCategories, deleteInventoryCategory
} from "@/lib/firebase/inventory"; // Updated import
import { Timestamp } from "firebase/firestore";


const itemFormSchema = z.object({
  name: z.string().min(3, { message: "Nama produk minimal 3 karakter." }),
  sku: z.string().optional(),
  categoryId: z.string().min(1, { message: "Kategori harus dipilih." }),
  quantity: z.coerce.number().min(0, { message: "Stok tidak boleh negatif." }),
  price: z.coerce.number().min(0, { message: "Harga jual tidak boleh negatif." }),
  costPrice: z.coerce.number().min(0, { message: "Harga pokok tidak boleh negatif." }),
  imageUrl: z.string().url({ message: "URL gambar tidak valid." }).optional().or(z.literal('')),
  imageHint: z.string().optional(),
});
type ItemFormValues = z.infer<typeof itemFormSchema>;

const categoryFormSchema = z.object({
  name: z.string().min(2, { message: "Nama kategori minimal 2 karakter." }),
});
type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function InventoryPage() {
  const { userData } = useAuth();
  const { selectedBranch, loadingBranches } = useBranch();
  const { toast } = useToast();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

  const itemForm = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: { name: "", sku: "", categoryId: "", quantity: 0, price: 0, costPrice: 0, imageUrl: "", imageHint: "" },
  });

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "" },
  });

  const fetchData = useCallback(async () => {
    if (!selectedBranch) {
      setItems([]);
      setCategories([]);
      setLoadingItems(false);
      setLoadingCategories(false);
      return;
    }
    setLoadingItems(true);
    setLoadingCategories(true);
    const [fetchedItems, fetchedCategories] = await Promise.all([
      getInventoryItems(selectedBranch.id),
      getInventoryCategories(selectedBranch.id),
    ]);
    setItems(fetchedItems);
    setCategories(fetchedCategories);
    setLoadingItems(false);
    setLoadingCategories(false);
  }, [selectedBranch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenItemDialog = (item: InventoryItem | null = null) => {
    setEditingItem(item);
    if (item) {
      itemForm.reset({
        name: item.name,
        sku: item.sku || "",
        categoryId: item.categoryId,
        quantity: item.quantity,
        price: item.price,
        costPrice: item.costPrice || 0,
        imageUrl: item.imageUrl || "",
        imageHint: item.imageHint || "",
      });
    } else {
      itemForm.reset({ name: "", sku: "", categoryId: "", quantity: 0, price: 0, costPrice: 0, imageUrl: "", imageHint: "" });
    }
    setIsItemDialogOpen(true);
  };

  const onItemSubmit: SubmitHandler<ItemFormValues> = async (values) => {
    if (!selectedBranch) return;

    const selectedCategory = categories.find(c => c.id === values.categoryId);
    if (!selectedCategory) {
        toast({ title: "Kategori Tidak Valid", description: "Kategori yang dipilih tidak ditemukan.", variant: "destructive"});
        return;
    }

    const itemData: InventoryItemInput = {
      ...values,
      branchId: selectedBranch.id,
      quantity: Number(values.quantity),
      price: Number(values.price),
      costPrice: Number(values.costPrice),
      imageUrl: values.imageUrl || `https://placehold.co/64x64.png`,
      imageHint: values.imageHint || values.name.split(" ").slice(0,2).join(" ").toLowerCase(),
    };

    let result;
    if (editingItem) {
      result = await updateInventoryItem(editingItem.id, itemData, selectedCategory.name);
    } else {
      result = await addInventoryItem(itemData, selectedCategory.name);
    }

    if (result && "error" in result) {
      toast({ title: editingItem ? "Gagal Memperbarui" : "Gagal Menambah", description: result.error, variant: "destructive" });
    } else {
      toast({ title: editingItem ? "Produk Diperbarui" : "Produk Ditambahkan", description: `${values.name} telah ${editingItem ? 'diperbarui' : 'ditambahkan'} ke inventaris.` });
      setIsItemDialogOpen(false);
      await fetchData();
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    const result = await deleteInventoryItem(itemId);
    if (result && "error" in result) {
      toast({ title: "Gagal Menghapus", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Produk Dihapus", description: `${itemName} telah dihapus dari inventaris.` });
      await fetchData();
    }
  };

  const onCategorySubmit: SubmitHandler<CategoryFormValues> = async (values) => {
    if (!selectedBranch) return;
    const categoryData: InventoryCategoryInput = {
      name: values.name,
      branchId: selectedBranch.id,
    };
    const result = await addInventoryCategory(categoryData);
    if (result && "error" in result) {
      toast({ title: "Gagal Menambah Kategori", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Kategori Ditambahkan", description: `Kategori "${values.name}" telah ditambahkan.` });
      setIsCategoryManagerOpen(false); 
      categoryForm.reset();
      const fetchedCategories = await getInventoryCategories(selectedBranch.id);
      setCategories(fetchedCategories);
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!selectedBranch) return;
    const result = await deleteInventoryCategory(categoryId);
    if (result && "error" in result) {
      toast({ title: "Gagal Hapus Kategori", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Kategori Dihapus", description: `Kategori "${categoryName}" telah dihapus.` });
      const fetchedCategories = await getInventoryCategories(selectedBranch.id);
      setCategories(fetchedCategories);
    }
  };


  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    categories.find(c => c.id === item.categoryId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loadingBranches) {
    return <MainLayout><div className="flex h-full items-center justify-center">Memuat data cabang...</div></MainLayout>;
  }
  if (!selectedBranch && userData?.role === 'admin') {
     return <MainLayout><div className="p-4 text-center">Silakan pilih cabang dari sidebar untuk mengelola inventaris.</div></MainLayout>;
  }
  if (!selectedBranch && userData?.role === 'cashier') {
    return <MainLayout><div className="p-4 text-center text-destructive">Anda tidak terhubung ke cabang. Hubungi admin.</div></MainLayout>;
  }


  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold font-headline">
              Inventaris {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari produk..."
                  className="pl-8 w-full sm:w-56 rounded-md h-9 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button size="sm" className="rounded-md text-xs" onClick={() => setIsCategoryManagerOpen(true)}>
                <Tag className="mr-1.5 h-3.5 w-3.5" /> Kelola Kategori
              </Button>
              <Button size="sm" className="rounded-md text-xs" onClick={() => handleOpenItemDialog()}>
                <PackagePlus className="mr-1.5 h-3.5 w-3.5" /> Tambah Produk
              </Button>
            </div>
          </div>

          {loadingItems || loadingCategories ? (
            <div className="space-y-2 border rounded-lg shadow-sm p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredItems.length === 0 && searchTerm ? (
             <div className="border rounded-lg shadow-sm overflow-hidden p-10 text-center">
                <p className="text-sm text-muted-foreground">Tidak ada produk yang cocok dengan pencarian Anda.</p>
            </div>
          ) : items.length === 0 ? (
            <div className="border rounded-lg shadow-sm overflow-hidden p-10 text-center">
                <p className="text-sm text-muted-foreground">Belum ada produk di inventaris cabang ini.</p>
                <Button size="sm" className="mt-4 text-xs" onClick={() => handleOpenItemDialog()}>
                    <PackagePlus className="mr-1.5 h-3.5 w-3.5" /> Tambah Produk Pertama
                </Button>
            </div>
          ) : (
            <div className="border rounded-lg shadow-sm overflow-hidden">
              <Table>
                <TableCaption className="text-xs">Daftar produk untuk {selectedBranch?.name || 'cabang terpilih'}.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] hidden sm:table-cell text-xs px-2">Gambar</TableHead>
                    <TableHead className="text-xs px-2">Nama</TableHead>
                    <TableHead className="hidden md:table-cell text-xs px-2">SKU</TableHead>
                    <TableHead className="hidden lg:table-cell text-xs px-2">Kategori</TableHead>
                    <TableHead className="text-right text-xs px-2">Stok</TableHead>
                    <TableHead className="text-right hidden sm:table-cell text-xs px-2">Harga Jual</TableHead>
                    <TableHead className="text-right hidden sm:table-cell text-xs px-2">Harga Pokok</TableHead>
                    <TableHead className="text-right text-xs px-2">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="hidden sm:table-cell py-1.5 px-2">
                        <Image
                            src={product.imageUrl || `https://placehold.co/64x64.png`}
                            alt={product.name}
                            width={32} height={32}
                            className="rounded object-cover h-8 w-8"
                            data-ai-hint={product.imageHint || product.name.split(" ").slice(0,2).join(" ").toLowerCase()}
                            onError={(e) => (e.currentTarget.src = "https://placehold.co/64x64.png")}
                        />
                      </TableCell>
                      <TableCell className="font-medium py-1.5 px-2 text-xs">{product.name}</TableCell>
                      <TableCell className="hidden md:table-cell py-1.5 px-2 text-xs">{product.sku || "-"}</TableCell>
                      <TableCell className="hidden lg:table-cell py-1.5 px-2 text-xs">{product.categoryName || categories.find(c => c.id === product.categoryId)?.name || "N/A"}</TableCell>
                      <TableCell className="text-right py-1.5 px-2 text-xs">{product.quantity}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell py-1.5 px-2 text-xs">Rp {product.price.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell py-1.5 px-2 text-xs">Rp {(product.costPrice || 0).toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right py-1.5 px-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenItemDialog(product)}>
                          <FilePenLine className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80">
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Hapus</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                              <AlertDialogDescription className="text-xs">
                                Tindakan ini akan menghapus produk "{product.name}" secara permanen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="text-xs h-8">Batal</AlertDialogCancel>
                              <AlertDialogAction
                                className="text-xs h-8 bg-destructive hover:bg-destructive/90"
                                onClick={() => handleDeleteItem(product.id, product.name)}>
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

        <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">{editingItem ? "Edit Produk" : "Tambah Produk Baru"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={itemForm.handleSubmit(onItemSubmit)} className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <Label htmlFor="itemName" className="text-xs">Nama Produk</Label>
                <Input id="itemName" {...itemForm.register("name")} className="h-9 text-xs" />
                {itemForm.formState.errors.name && <p className="text-xs text-destructive mt-1">{itemForm.formState.errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="itemSku" className="text-xs">SKU (Opsional)</Label>
                <Input id="itemSku" {...itemForm.register("sku")} className="h-9 text-xs" />
              </div>
              <div>
                <Label htmlFor="itemCategory" className="text-xs">Kategori</Label>
                <Controller
                  name="categoryId"
                  control={itemForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={loadingCategories}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder={loadingCategories ? "Memuat kategori..." : "Pilih kategori"} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.length === 0 && !loadingCategories ? (
                            <div className="p-2 text-xs text-muted-foreground">Belum ada kategori. Tambah dulu.</div>
                        ) : (
                            categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id} className="text-xs">{cat.name}</SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {itemForm.formState.errors.categoryId && <p className="text-xs text-destructive mt-1">{itemForm.formState.errors.categoryId.message}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="itemQuantity" className="text-xs">Stok</Label>
                  <Input id="itemQuantity" type="number" {...itemForm.register("quantity")} className="h-9 text-xs" />
                  {itemForm.formState.errors.quantity && <p className="text-xs text-destructive mt-1">{itemForm.formState.errors.quantity.message}</p>}
                </div>
                <div>
                  <Label htmlFor="itemPrice" className="text-xs">Harga Jual (Rp)</Label>
                  <Input id="itemPrice" type="number" {...itemForm.register("price")} className="h-9 text-xs" />
                  {itemForm.formState.errors.price && <p className="text-xs text-destructive mt-1">{itemForm.formState.errors.price.message}</p>}
                </div>
                 <div>
                  <Label htmlFor="itemCostPrice" className="text-xs">Harga Pokok (Rp)</Label>
                  <Input id="itemCostPrice" type="number" {...itemForm.register("costPrice")} className="h-9 text-xs" />
                  {itemForm.formState.errors.costPrice && <p className="text-xs text-destructive mt-1">{itemForm.formState.errors.costPrice.message}</p>}
                </div>
              </div>
               <div>
                <Label htmlFor="itemImageUrl" className="text-xs">URL Gambar (Opsional)</Label>
                <Input id="itemImageUrl" {...itemForm.register("imageUrl")} placeholder="https://..." className="h-9 text-xs" />
                 {itemForm.formState.errors.imageUrl && <p className="text-xs text-destructive mt-1">{itemForm.formState.errors.imageUrl.message}</p>}
              </div>
               <div>
                <Label htmlFor="itemImageHint" className="text-xs">Petunjuk Gambar (Opsional, maks 2 kata untuk placeholder)</Label>
                <Input id="itemImageHint" {...itemForm.register("imageHint")} placeholder="Contoh: coffee beans" className="h-9 text-xs" />
              </div>
              <DialogFooter className="pt-3">
                 <DialogClose asChild>
                    <Button type="button" variant="outline" className="text-xs h-8">Batal</Button>
                  </DialogClose>
                <Button type="submit" className="text-xs h-8" disabled={itemForm.formState.isSubmitting}>
                  {itemForm.formState.isSubmitting ? "Menyimpan..." : (editingItem ? "Simpan Perubahan" : "Tambah Produk")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Kelola Kategori Inventaris</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="flex items-end gap-2">
                <div className="flex-grow">
                  <Label htmlFor="categoryName" className="text-xs">Nama Kategori Baru</Label>
                  <Input id="categoryName" {...categoryForm.register("name")} className="h-9 text-xs" placeholder="Contoh: Minuman"/>
                  {categoryForm.formState.errors.name && <p className="text-xs text-destructive mt-1">{categoryForm.formState.errors.name.message}</p>}
                </div>
                <Button type="submit" size="sm" className="h-9 text-xs" disabled={categoryForm.formState.isSubmitting}>
                  {categoryForm.formState.isSubmitting ? "Menambah..." : "Tambah"}
                </Button>
              </form>

              <div className="mt-3">
                <h3 className="text-sm font-medium mb-1.5">Daftar Kategori Saat Ini:</h3>
                {loadingCategories ? (
                  <Skeleton className="h-8 w-full" />
                ) : categories.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Belum ada kategori.</p>
                ) : (
                  <ul className="space-y-1 max-h-60 overflow-y-auto pr-1">
                    {categories.map(cat => (
                      <li key={cat.id} className="flex items-center justify-between text-xs p-1.5 bg-muted/50 rounded-md">
                        <span>{cat.name}</span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive/80">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Kategori "{cat.name}"?</AlertDialogTitle>
                                <AlertDialogDescription className="text-xs">
                                Ini akan menghapus kategori. Pastikan tidak ada produk yang masih menggunakan kategori ini. Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="text-xs h-8">Batal</AlertDialogCancel>
                                <AlertDialogAction
                                    className="text-xs h-8 bg-destructive hover:bg-destructive/90"
                                    onClick={() => handleDeleteCategory(cat.id, cat.name)}>
                                    Ya, Hapus Kategori
                                </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
             <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline" className="text-xs h-8">Tutup</Button>
                </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </MainLayout>
    </ProtectedRoute>
  );
}

    