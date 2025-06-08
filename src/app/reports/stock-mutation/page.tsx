
"use client";

import React, { useState, useEffect, useCallback } from "react";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useBranch } from "@/contexts/branch-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { CalendarIcon, Download } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { getInventoryItems, getTransactionsByDateRangeAndBranch, type InventoryItem, type PosTransaction } from "@/lib/firebase/firestore";

interface StockMutationReportItem {
  productId: string;
  productName: string;
  sku?: string;
  categoryName?: string;
  initialStock: number;
  stockIn: number; // For future use (purchases, adjustments)
  stockSold: number;
  finalStock: number; // Current stock at the end of the period (or current if period ends today)
}

export default function StockMutationReportPage() {
  const { selectedBranch } = useBranch();
  const { toast } = useToast();

  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportData, setReportData] = useState<StockMutationReportItem[] | null>(null);

  const formatCurrency = (amount: number) => {
     // Assuming a default if branch/currency is not set, adjust as needed
    return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const handleGenerateReport = useCallback(async () => {
    if (!selectedBranch) {
      toast({ title: "Pilih Cabang", description: "Silakan pilih cabang terlebih dahulu.", variant: "destructive" });
      return;
    }
    if (!startDate || !endDate) {
      toast({ title: "Tanggal Tidak Lengkap", description: "Silakan pilih tanggal mulai dan tanggal akhir.", variant: "destructive" });
      return;
    }
    if (endDate < startDate) {
      toast({ title: "Rentang Tanggal Tidak Valid", description: "Tanggal akhir tidak boleh sebelum tanggal mulai.", variant: "destructive" });
      return;
    }

    setLoadingReport(true);
    setReportData(null);

    try {
      const inventoryItems = await getInventoryItems(selectedBranch.id);
      const transactions = await getTransactionsByDateRangeAndBranch(selectedBranch.id, startDate, endDate);

      const soldQuantitiesMap = new Map<string, number>();
      transactions.forEach(tx => {
        tx.items.forEach(item => {
          soldQuantitiesMap.set(item.productId, (soldQuantitiesMap.get(item.productId) || 0) + item.quantity);
        });
      });

      const processedData: StockMutationReportItem[] = inventoryItems.map(item => {
        const stockSold = soldQuantitiesMap.get(item.id) || 0;
        // finalStock is the current quantity of the item.
        const finalStock = item.quantity; 
        // initialStock is calculated as current stock + items sold during the period.
        // This assumes no stock was received or manually adjusted during the period.
        const initialStock = finalStock + stockSold; 

        return {
          productId: item.id,
          productName: item.name,
          sku: item.sku,
          categoryName: item.categoryName,
          initialStock: initialStock,
          stockIn: 0, // Placeholder for now
          stockSold: stockSold,
          finalStock: finalStock,
        };
      });

      setReportData(processedData);
      if (processedData.length === 0) {
        toast({ title: "Tidak Ada Data", description: "Tidak ada produk inventaris ditemukan untuk cabang ini.", variant: "default" });
      }

    } catch (error) {
      console.error("Error generating stock mutation report:", error);
      toast({ title: "Gagal Membuat Laporan", description: "Terjadi kesalahan saat mengambil data.", variant: "destructive" });
    } finally {
      setLoadingReport(false);
    }
  }, [selectedBranch, startDate, endDate, toast]);

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold font-headline">
              Laporan Mutasi Stok {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            {reportData && !loadingReport && (
                <Button variant="outline" size="sm" className="rounded-md text-xs">
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Ekspor ke CSV (Segera)
                </Button>
            )}
          </div>

          <Card className="shadow-sm">
            <CardHeader className="p-4">
              <CardTitle className="text-base font-semibold">Filter Laporan</CardTitle>
              <CardDescription className="text-xs">Pilih rentang tanggal untuk melihat mutasi stok.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end p-4 pt-0">
              <div className="lg:col-span-1">
                <label htmlFor="branch" className="block text-xs font-medium mb-1">Cabang</label>
                <Select value={selectedBranch?.id || ""} disabled>
                  <SelectTrigger id="branch" className="rounded-md h-9 text-xs">
                    <SelectValue placeholder="Pilih Cabang" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedBranch ? (
                        <SelectItem value={selectedBranch.id} className="text-xs">{selectedBranch.name}</SelectItem>
                    ) : (
                        <SelectItem value="" className="text-xs" disabled>Pilih cabang dari sidebar</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="startDate" className="block text-xs font-medium mb-1">Tanggal Mulai</label>
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal rounded-md h-9 text-xs"
                    >
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {startDate ? format(startDate, "dd MMM yyyy") : <span>Pilih tanggal</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="text-xs"
                    />
                  </PopoverContent>
                </Popover>
              </div>
               <div>
                <label htmlFor="endDate" className="block text-xs font-medium mb-1">Tanggal Akhir</label>
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal rounded-md h-9 text-xs"
                    >
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {endDate ? format(endDate, "dd MMM yyyy") : <span>Pilih tanggal</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="text-xs"
                      disabled={{ before: startDate }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button size="sm" className="w-full sm:w-auto self-end rounded-md text-xs h-9" onClick={handleGenerateReport} disabled={loadingReport || !selectedBranch}>
                {loadingReport ? "Memuat..." : "Buat Laporan"}
              </Button>
            </CardContent>
          </Card>

          {loadingReport && (
            <Card className="shadow-sm">
                <CardHeader className="p-4">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4 mt-1" />
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </CardContent>
            </Card>
          )}

          {reportData && !loadingReport && (
            <Card className="shadow-sm">
              <CardHeader className="p-4">
                <CardTitle className="text-base font-semibold">Laporan Mutasi Stok</CardTitle>
                <CardDescription className="text-xs">
                  Untuk cabang: {selectedBranch?.name || 'N/A'} <br />
                  Periode: {startDate ? format(startDate, "dd MMM yyyy") : 'N/A'} - {endDate ? format(endDate, "dd MMM yyyy") : 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 overflow-x-auto">
                {reportData.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs">Produk</TableHead>
                                <TableHead className="text-xs hidden md:table-cell">SKU</TableHead>
                                <TableHead className="text-xs hidden lg:table-cell">Kategori</TableHead>
                                <TableHead className="text-xs text-right">Stok Awal</TableHead>
                                <TableHead className="text-xs text-right text-destructive">Terjual (-)</TableHead>
                                <TableHead className="text-xs text-right text-green-600">Masuk (+)</TableHead>
                                <TableHead className="text-xs text-right">Stok Akhir</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.map(item => (
                                <TableRow key={item.productId}>
                                    <TableCell className="text-xs font-medium py-1.5">{item.productName}</TableCell>
                                    <TableCell className="text-xs hidden md:table-cell py-1.5">{item.sku || '-'}</TableCell>
                                    <TableCell className="text-xs hidden lg:table-cell py-1.5">{item.categoryName || '-'}</TableCell>
                                    <TableCell className="text-xs text-right py-1.5">{item.initialStock}</TableCell>
                                    <TableCell className="text-xs text-right py-1.5 text-destructive">{item.stockSold > 0 ? `${item.stockSold}` : '-'}</TableCell>
                                    <TableCell className="text-xs text-right py-1.5 text-green-600">{item.stockIn > 0 ? `${item.stockIn}` : '-'}</TableCell>
                                    <TableCell className="text-xs text-right font-semibold py-1.5">{item.finalStock}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                         <TableCaption className="text-xs py-2">Stok Awal dihitung berdasarkan: Stok Akhir (Saat Ini) + Barang Terjual (Selama Periode). Fitur stok masuk/penyesuaian belum diimplementasikan.</TableCaption>
                    </Table>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">Tidak ada data produk inventaris untuk ditampilkan pada cabang ini.</p>
                )}
              </CardContent>
            </Card>
          )}

          {!reportData && !loadingReport && (
             <Card className="shadow-sm">
                <CardContent className="p-10 text-center">
                    <p className="text-sm text-muted-foreground">Pilih filter di atas dan klik "Buat Laporan" untuk melihat hasilnya.</p>
                </CardContent>
            </Card>
          )}

        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

