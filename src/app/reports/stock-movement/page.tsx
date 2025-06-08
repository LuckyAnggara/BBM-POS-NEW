
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
import { CalendarIcon, Download, Package, AlertTriangle, Info } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image"; // Added missing import
import { 
  getInventoryItems, 
  getTransactionsByDateRangeAndBranch, 
  getPurchaseOrdersByBranch, 
  type InventoryItem, 
  type PosTransaction, 
  type PurchaseOrder,
  type PurchaseOrderItem
} from "@/lib/firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface StockMovement {
  date: Timestamp;
  type: "Stok Awal" | "Penjualan" | "Retur Jual" | "Penerimaan PO" | "Penyesuaian"; // Added Penyesuaian for future use
  documentId?: string; // Invoice number or PO number
  notes?: string; // For return reason, etc.
  quantityChange: number; // Positive for stock in, negative for stock out
  stockBefore: number;
  stockAfter: number;
}

interface StockMovementReportData {
  product: InventoryItem;
  movements: StockMovement[];
  currentStock: number;
}

export default function StockMovementReportPage() {
  const { selectedBranch } = useBranch();
  const { toast } = useToast();

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [reportData, setReportData] = useState<StockMovementReportData | null>(null);

  const fetchInventory = useCallback(async () => {
    if (!selectedBranch) {
      setInventoryItems([]);
      setLoadingInventory(false);
      return;
    }
    setLoadingInventory(true);
    const items = await getInventoryItems(selectedBranch.id);
    setInventoryItems(items);
    setLoadingInventory(false);
  }, [selectedBranch]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleGenerateReport = useCallback(async () => {
    if (!selectedBranch) {
      toast({ title: "Pilih Cabang", description: "Silakan pilih cabang terlebih dahulu.", variant: "destructive" });
      return;
    }
    if (!selectedProductId) {
      toast({ title: "Pilih Produk", description: "Silakan pilih produk untuk melihat pergerakan stoknya.", variant: "destructive" });
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
      const product = inventoryItems.find(item => item.id === selectedProductId);
      if (!product) {
        toast({ title: "Produk Tidak Ditemukan", variant: "destructive" });
        setLoadingReport(false);
        return;
      }

      const currentStock = product.quantity;
      let movements: Omit<StockMovement, 'stockBefore' | 'stockAfter'>[] = [];

      // Fetch Sales and Returns
      const salesTransactions = await getTransactionsByDateRangeAndBranch(selectedBranch.id, startDate, endDate);
      salesTransactions.forEach(tx => {
        tx.items.forEach(item => {
          if (item.productId === selectedProductId) {
            if (tx.status === 'returned') {
              movements.push({
                date: tx.returnedAt || tx.timestamp, // Prefer returnedAt if available
                type: "Retur Jual",
                documentId: tx.invoiceNumber,
                notes: tx.returnReason,
                quantityChange: item.quantity, // Positive as it's stock in
              });
            } else { // completed
              movements.push({
                date: tx.timestamp,
                type: "Penjualan",
                documentId: tx.invoiceNumber,
                quantityChange: -item.quantity, // Negative for stock out
              });
            }
          }
        });
      });

      // Fetch Purchase Order Receipts (approximation based on PO update time and status)
      const purchaseOrders = await getPurchaseOrdersByBranch(selectedBranch.id, { startDate, endDate, orderByField: "updatedAt" });
      purchaseOrders.forEach(po => {
        if (po.status === 'partially_received' || po.status === 'fully_received') {
          po.items.forEach(poItem => {
            if (poItem.productId === selectedProductId && poItem.receivedQuantity > 0) {
              // To get quantity received *within* the period is complex without per-receipt logs.
              // This simplified version assumes all receivedQuantity for POs updated in period happened in period.
              // A more accurate system would track each receipt event.
              // For this version, we'll take the total received quantity for the item in this PO
              // if the PO was updated in the period, as a proxy for stock received.
              // This could be refined by storing previous received quantity and calculating delta.
              // However, this is a good starting point.
              movements.push({
                date: po.updatedAt, // Use PO update time as proxy for receipt time
                type: "Penerimaan PO",
                documentId: po.poNumber,
                quantityChange: poItem.receivedQuantity, // This is total received on PO, not necessarily in period
              });
            }
          });
        }
      });
      
      // Sort movements by date
      movements.sort((a, b) => a.date.toMillis() - b.date.toMillis());

      // Calculate initial stock by working backwards from current stock
      let calculatedInitialStock = currentStock;
      for (let i = movements.length - 1; i >= 0; i--) {
        calculatedInitialStock -= movements[i].quantityChange;
      }
      
      const processedMovements: StockMovement[] = [];
      processedMovements.push({
        date: Timestamp.fromDate(startDate), // Start of the period
        type: "Stok Awal",
        quantityChange: 0, // No change, just a starting point
        stockBefore: calculatedInitialStock,
        stockAfter: calculatedInitialStock,
      });

      let runningStock = calculatedInitialStock;
      movements.forEach(move => {
        const stockBefore = runningStock;
        runningStock += move.quantityChange;
        processedMovements.push({
          ...move,
          stockBefore: stockBefore,
          stockAfter: runningStock,
        });
      });

      setReportData({ product, movements: processedMovements, currentStock });

      if (processedMovements.length <= 1 && movements.length === 0) { // Only initial stock
        toast({ title: "Tidak Ada Pergerakan", description: `Tidak ada pergerakan stok untuk ${product.name} pada periode ini.`, variant: "default" });
      }

    } catch (error) {
      console.error("Error generating stock movement report:", error);
      toast({ title: "Gagal Membuat Laporan", description: "Terjadi kesalahan saat mengambil data.", variant: "destructive" });
    } finally {
      setLoadingReport(false);
    }
  }, [selectedBranch, selectedProductId, startDate, endDate, toast, inventoryItems]);


  const formatMovementDate = (timestamp: Timestamp) => {
    return format(timestamp.toDate(), "dd MMM yyyy, HH:mm");
  };


  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold font-headline">
              Laporan Pergerakan Stok Produk {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            {reportData && !loadingReport && (
                <Button variant="outline" size="sm" className="rounded-md text-xs" disabled>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Ekspor ke PDF (Segera)
                </Button>
            )}
          </div>

          <Card className="shadow-sm">
            <CardHeader className="p-4">
              <CardTitle className="text-base font-semibold">Filter Laporan</CardTitle>
              <CardDescription className="text-xs">Pilih produk dan rentang tanggal untuk melihat pergerakan stoknya.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end p-4 pt-0">
              <div className="lg:col-span-2">
                <label htmlFor="productSelect" className="block text-xs font-medium mb-1">Produk</label>
                <Select 
                    value={selectedProductId} 
                    onValueChange={setSelectedProductId}
                    disabled={loadingInventory || inventoryItems.length === 0}
                >
                  <SelectTrigger id="productSelect" className="rounded-md h-9 text-xs">
                    <SelectValue placeholder={loadingInventory ? "Memuat produk..." : (inventoryItems.length === 0 ? "Tidak ada produk" : "Pilih produk")} />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryItems.map(item => (
                        <SelectItem key={item.id} value={item.id} className="text-xs">
                            {item.name} (SKU: {item.sku || '-'})
                        </SelectItem>
                    ))}
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
              <Button size="sm" className="w-full sm:w-auto self-end rounded-md text-xs h-9" onClick={handleGenerateReport} disabled={loadingReport || !selectedBranch || loadingInventory}>
                {loadingReport ? "Memuat..." : "Buat Laporan"}
              </Button>
            </CardContent>
          </Card>

          {loadingReport && (
            <Card className="shadow-sm">
                <CardHeader className="p-4">
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-4 w-1/2 mt-1" />
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </CardContent>
            </Card>
          )}

          {reportData && !loadingReport && (
            <Card className="shadow-sm">
              <CardHeader className="p-4">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-base font-semibold">Laporan Pergerakan Stok: {reportData.product.name}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                            SKU: {reportData.product.sku || "-"} | Kategori: {reportData.product.categoryName || "-"} <br/>
                            Periode: {startDate ? format(startDate, "dd MMM yyyy") : 'N/A'} - {endDate ? format(endDate, "dd MMM yyyy") : 'N/A'} <br/>
                            Stok Saat Ini (di Inventaris): {reportData.currentStock}
                        </CardDescription>
                    </div>
                    <div className="text-right">
                         <Image
                            src={reportData.product.imageUrl || `https://placehold.co/80x80.png`}
                            alt={reportData.product.name}
                            width={60} height={60}
                            className="rounded object-cover border"
                            data-ai-hint={reportData.product.imageHint || reportData.product.name.split(" ").slice(0,2).join(" ").toLowerCase()}
                            onError={(e) => (e.currentTarget.src = "https://placehold.co/80x80.png")}
                        />
                    </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 overflow-x-auto">
                {reportData.movements.length > 0 ? (
                    <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs w-[150px]">Tanggal</TableHead>
                                <TableHead className="text-xs">Tipe</TableHead>
                                <TableHead className="text-xs hidden sm:table-cell">Dok. Terkait</TableHead>
                                <TableHead className="text-xs hidden md:table-cell">Catatan</TableHead>
                                <TableHead className="text-xs text-right">+/- Jml</TableHead>
                                <TableHead className="text-xs text-right">Stok Sblm</TableHead>
                                <TableHead className="text-xs text-right">Stok Ssdh</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.movements.map((move, index) => (
                                <TableRow key={index}>
                                    <TableCell className="text-xs py-1.5">{formatMovementDate(move.date)}</TableCell>
                                    <TableCell className="text-xs py-1.5 font-medium">{move.type}</TableCell>
                                    <TableCell className="text-xs hidden sm:table-cell py-1.5">{move.documentId || '-'}</TableCell>
                                    <TableCell className="text-xs hidden md:table-cell py-1.5 max-w-[200px] truncate" title={move.notes}>{move.notes || '-'}</TableCell>
                                    <TableCell className={`text-xs text-right py-1.5 font-semibold ${move.quantityChange > 0 ? 'text-green-600' : move.quantityChange < 0 ? 'text-destructive' : ''}`}>
                                        {move.quantityChange > 0 ? `+${move.quantityChange}` : (move.quantityChange < 0 ? `${move.quantityChange}` : '-')}
                                    </TableCell>
                                    <TableCell className="text-xs text-right py-1.5">{move.stockBefore}</TableCell>
                                    <TableCell className="text-xs text-right py-1.5 font-bold">{move.stockAfter}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <Alert variant="default" className="mt-4 text-xs bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700/50 dark:text-blue-300">
                        <Info className="h-4 w-4 !text-blue-600 dark:!text-blue-400" />
                        <AlertTitle className="font-semibold text-blue-700 dark:text-blue-200">Catatan Kalkulasi</AlertTitle>
                        <AlertDescription className="text-blue-600 dark:text-blue-400">
                            <ul className="list-disc pl-4">
                                <li><strong>Stok Awal:</strong> Dihitung mundur dari Stok Saat Ini di inventaris, dengan memperhitungkan semua pergerakan (penjualan, retur, estimasi penerimaan PO) selama periode laporan.</li>
                                <li><strong>Penerimaan PO:</strong> Estimasi berdasarkan Pesanan Pembelian yang statusnya 'Diterima Sebagian' atau 'Diterima Penuh' dan tanggal <i>update</i> PO-nya masuk dalam periode laporan. Ini menggunakan total kuantitas diterima pada PO tersebut sebagai proxy.</li>
                                <li><strong>Stok Akhir per Baris:</strong> Adalah stok setelah pergerakan pada baris tersebut. Stok akhir di baris terakhir mungkin berbeda dari 'Stok Saat Ini' jika ada transaksi setelah akhir periode laporan.</li>
                            </ul>
                        </AlertDescription>
                    </Alert>
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">Tidak ada data pergerakan stok untuk produk dan periode yang dipilih.</p>
                )}
              </CardContent>
            </Card>
          )}

          {!reportData && !loadingReport && (
             <Card className="shadow-sm">
                <CardContent className="p-10 text-center">
                    <p className="text-sm text-muted-foreground">Pilih produk dan rentang tanggal, lalu klik "Buat Laporan" untuk melihat hasilnya.</p>
                </CardContent>
            </Card>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

