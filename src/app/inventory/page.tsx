

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, FilePenLine, Trash2, Search, PackagePlus, Tag, X, Upload, Download, FileText } from "lucide-react";
import Image from "next/image";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { InventoryItem, InventoryCategory, InventoryItemInput, InventoryCategoryInput } from "@/lib/firebase/inventory";
import {
  addInventoryItem, getInventoryItems, updateInventoryItem, deleteInventoryItem,
  addInventoryCategory, getInventoryCategories, deleteInventoryCategory
} from "@/lib/firebase/inventory";
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge"; // Import Badge


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

interface ParsedCsvItem extends InventoryItemInput {
  isDuplicateSku?: boolean;
  categoryNameForPreview?: string;
}


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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [parsedCsvData, setParsedCsvData] = useState<ParsedCsvItem[]>([]);
  const [csvImportFileName, setCsvImportFileName] = useState<string | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);


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

  const handleExportCSV = () => {
    if (!items || items.length === 0) {
      toast({ title: "Tidak Ada Data", description: "Tidak ada data inventaris untuk diekspor.", variant: "default" });
      return;
    }

    const headers = ["id", "name", "sku", "categoryId", "categoryName", "quantity", "price", "costPrice", "imageUrl", "imageHint"];
    const csvRows = [headers.join(",")];

    const escapeCSVField = (field: any): string => {
      if (field === null || field === undefined) return "";
      const stringField = String(field);
      if (stringField.includes(",") || stringField.includes("\"") || stringField.includes("\n")) {
        return `"${stringField.replace(/"/g, '""')}"`;
      }
      return stringField;
    };

    items.forEach(item => {
      const row = headers.map(header => escapeCSVField((item as any)[header]));
      csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const branchNamePart = selectedBranch?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'cabang';
    const datePart = format(new Date(), 'yyyyMMdd');
    link.setAttribute("download", `inventaris_${branchNamePart}_${datePart}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({title: "Ekspor Berhasil", description: "Data inventaris telah diekspor ke CSV."});
  };

  const handleImportButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedBranch) {
      setCsvImportFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        processCsvData(text, file.name);
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const processCsvData = (csvContent: string, fileName: string) => {
    const lines = csvContent.split(/\r\n|\n/);
    if (lines.length < 2) {
      toast({ title: "File CSV Kosong atau Invalid", description: "File tidak berisi data atau header.", variant: "destructive"});
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ["name", "categoryid", "quantity", "price"]; // categoryId is case-insensitive
    const missingHeaders = requiredHeaders.filter(rh => !headers.includes(rh));

    if (missingHeaders.length > 0) {
      toast({ title: "Header CSV Tidak Lengkap", description: `Kolom berikut wajib ada: ${missingHeaders.join(', ')}. Perhatikan penulisan (case-insensitive).`, variant: "destructive"});
      return;
    }

    const nameIndex = headers.indexOf("name");
    const categoryIdIndex = headers.indexOf("categoryid");
    const quantityIndex = headers.indexOf("quantity");
    const priceIndex = headers.indexOf("price");
    const skuIndex = headers.indexOf("sku"); // Optional
    const costPriceIndex = headers.indexOf("costprice"); // Optional
    const imageUrlIndex = headers.indexOf("imageurl"); // Optional
    const imageHintIndex = headers.indexOf("imagehint"); // Optional


    const data: ParsedCsvItem[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const currentline = lines[i].split(',');

      const name = currentline[nameIndex]?.trim();
      const categoryId = currentline[categoryIdIndex]?.trim();
      const quantityStr = currentline[quantityIndex]?.trim();
      const priceStr = currentline[priceIndex]?.trim();

      if (!name || !categoryId || !quantityStr || !priceStr) {
        console.warn(`Skipping line ${i+1} due to missing required fields in file ${fileName}`);
        continue;
      }
      
      const quantity = parseFloat(quantityStr);
      const price = parseFloat(priceStr);

      if (isNaN(quantity) || isNaN(price) || quantity < 0 || price < 0) {
        console.warn(`Skipping line ${i+1} due to invalid numeric values for quantity/price in file ${fileName}`);
        continue;
      }
      
      const sku = skuIndex > -1 ? currentline[skuIndex]?.trim() : undefined;
      const isDuplicateSku = !!sku && sku.trim() !== "" && items.some(existingItem => existingItem.sku === sku);
      
      const category = categories.find(cat => cat.id === categoryId);
      const categoryNameForPreview = category ? category.name : `ID: ${categoryId} (Tidak Valid)`;


      data.push({
        branchId: selectedBranch!.id,
        name,
        sku,
        categoryId,
        quantity,
        price,
        costPrice: costPriceIndex > -1 ? parseFloat(currentline[costPriceIndex]?.trim() || "0") : 0,
        imageUrl: imageUrlIndex > -1 ? currentline[imageUrlIndex]?.trim() : undefined,
        imageHint: imageHintIndex > -1 ? currentline[imageHintIndex]?.trim() : undefined,
        isDuplicateSku,
        categoryNameForPreview
      });
    }

    if (data.length === 0) {
      toast({ title: "Tidak Ada Data Valid", description: "Tidak ada data produk yang valid ditemukan di file CSV.", variant: "destructive"});
      return;
    }

    setParsedCsvData(data);
    setIsImportDialogOpen(true);
  };

  const handleConfirmImport = async () => {
    if (!parsedCsvData || parsedCsvData.length === 0 || !selectedBranch) return;

    setIsProcessingImport(true);
    let successCount = 0;
    let errorCount = 0;
    const errorMessages: string[] = [];

    const results = await Promise.allSettled(parsedCsvData.map(async (itemData) => {
        const selectedCategory = categories.find(c => c.id === itemData.categoryId);
        if (!selectedCategory) {
          throw new Error(`Kategori dengan ID '${itemData.categoryId}' untuk produk '${itemData.name}' tidak ditemukan.`);
        }
        // Ensure InventoryItemInput does not include preview-specific fields
        const { isDuplicateSku, categoryNameForPreview, ...actualItemData } = itemData;
        return addInventoryItem(actualItemData, selectedCategory.name);
    }));

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value && !("error" in result.value)) {
            successCount++;
        } else {
            errorCount++;
            const itemName = parsedCsvData[index]?.name || `Item di baris ${index + 2}`;
            const errorMessage = result.status === 'rejected' ? result.reason?.message : (result.value as { error: string })?.error;
            errorMessages.push(`${itemName}: ${errorMessage || 'Error tidak diketahui'}`);
            console.error(`Error importing ${itemName}:`, errorMessage);
        }
    });

    if (successCount > 0) {
        toast({ title: "Impor Selesai", description: `${successCount} produk berhasil diimpor.${errorCount > 0 ? ` ${errorCount} produk gagal.` : ''}` });
        await fetchData();
    } else if (errorCount > 0) {
        toast({ title: "Impor Gagal", description: `Semua ${errorCount} produk gagal diimpor. Cek konsol untuk detail.`, variant: "destructive" });
    } else {
        toast({ title: "Tidak Ada Data", description: "Tidak ada data yang diimpor.", variant: "default" });
    }
    
    if(errorMessages.length > 0 && errorCount > 0) {
        toast({
            title: `${errorCount} Produk Gagal Diimpor`,
            description: errorMessages.slice(0, 3).join("; ") + (errorMessages.length > 3 ? "; ..." : ""),
            variant: "destructive",
            duration: 10000
        });
    }

    setIsProcessingImport(false);
    setIsImportDialogOpen(false);
    setParsedCsvData([]);
    setCsvImportFileName(null);
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
            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end">
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari produk..."
                  className="pl-8 w-full sm:w-48 rounded-md h-9 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept=".csv" style={{ display: 'none' }} />
              <Button size="sm" variant="outline" className="rounded-md text-xs h-9" onClick={handleImportButtonClick} disabled={!selectedBranch || loadingItems}>
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Impor CSV
              </Button>
              <Button size="sm" variant="outline" className="rounded-md text-xs h-9" onClick={handleExportCSV} disabled={!selectedBranch || loadingItems || items.length === 0}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Ekspor CSV
              </Button>
              <Button size="sm" className="rounded-md text-xs h-9" onClick={() => setIsCategoryManagerOpen(true)}>
                <Tag className="mr-1.5 h-3.5 w-3.5" /> Kelola Kategori
              </Button>
              <Button size="sm" className="rounded-md text-xs h-9" onClick={() => handleOpenItemDialog()}>
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
                  <ScrollArea className="max-h-60">
                    <ul className="space-y-1 pr-1">
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
                  </ScrollArea>
                )}
              </div>
            </div>
             <DialogFooter className="pt-3">
                <DialogClose asChild>
                    <Button type="button" variant="outline" className="text-xs h-8">Tutup</Button>
                </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isImportDialogOpen} onOpenChange={(open) => { if (!open) { setParsedCsvData([]); setCsvImportFileName(null); } setIsImportDialogOpen(open);}}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-base">Konfirmasi Impor Inventaris</DialogTitle>
                    {csvImportFileName && <DialogDescription className="text-xs">File: {csvImportFileName}</DialogDescription>}
                </DialogHeader>
                <div className="py-2">
                    {parsedCsvData.length > 0 ? (
                        <>
                            <p className="text-sm mb-2">Akan mengimpor <strong>{parsedCsvData.length}</strong> produk baru. Berikut adalah preview beberapa item pertama:</p>
                            <ScrollArea className="max-h-[40vh] border rounded-md">
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nama Produk</TableHead>
                                            <TableHead>SKU</TableHead>
                                            <TableHead>Nama Kategori</TableHead>
                                            <TableHead className="text-right">Stok</TableHead>
                                            <TableHead className="text-right">Harga Jual</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parsedCsvData.slice(0, 5).map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                  {item.name}
                                                  {item.isDuplicateSku && <Badge variant="outline" className="ml-1.5 text-xs border-amber-500 text-amber-600">SKU Duplikat</Badge>}
                                                </TableCell>
                                                <TableCell>{item.sku || '-'}</TableCell>
                                                <TableCell>{item.categoryNameForPreview}</TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right">{item.price}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                            {parsedCsvData.length > 5 && <p className="text-xs text-muted-foreground mt-1">Dan {parsedCsvData.length - 5} item lainnya...</p>}
                            <p className="text-xs text-amber-600 mt-3">
                                <strong>Perhatian:</strong> Fitur ini hanya akan menambahkan produk baru. Jika SKU atau nama produk sudah ada, produk duplikat mungkin akan dibuat. Pastikan ID Kategori di CSV valid dan sudah ada di sistem untuk cabang ini.
                            </p>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">Tidak ada data valid untuk diimpor.</p>
                    )}
                </div>
                <DialogFooter className="pt-3">
                    <DialogClose asChild><Button type="button" variant="outline" className="text-xs h-8" disabled={isProcessingImport}>Batal</Button></DialogClose>
                    <Button type="button" onClick={handleConfirmImport} className="text-xs h-8" disabled={isProcessingImport || parsedCsvData.length === 0}>
                        {isProcessingImport ? "Memproses Impor..." : "Konfirmasi & Impor Produk"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </MainLayout>
    </ProtectedRoute>
  );
}


