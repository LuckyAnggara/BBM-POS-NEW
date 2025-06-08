
"use client";

import MainLayout from "@/components/layout/main-layout";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import React, { useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useToast } from "@/hooks/use-toast";
import { getTransactionsByDateRangeAndBranch, type PosTransaction, type PaymentMethod } from "@/lib/firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

type ReportType = "sales_summary" | "balance_sheet" | "income_statement";

interface SalesSummaryData {
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  salesByPaymentMethod: Record<PaymentMethod, number>;
  // Optional: Add more detailed data like top selling products, etc.
}

export default function ReportsPage() {
  const { selectedBranch } = useBranch();
  const { toast } = useToast();

  const [reportType, setReportType] = useState<ReportType>("sales_summary");
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportData, setReportData] = useState<SalesSummaryData | null>(null);

  const formatCurrency = (amount: number) => {
    return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleGenerateReport = async () => {
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

    if (reportType === "sales_summary") {
      try {
        const transactions = await getTransactionsByDateRangeAndBranch(selectedBranch.id, startDate, endDate);
        
        let totalRevenue = 0;
        const salesByPaymentMethod: Record<PaymentMethod, number> = { cash: 0, card: 0, transfer: 0 };

        transactions.forEach(tx => {
          totalRevenue += tx.totalAmount;
          salesByPaymentMethod[tx.paymentMethod] = (salesByPaymentMethod[tx.paymentMethod] || 0) + tx.totalAmount;
        });

        const totalTransactions = transactions.length;
        const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

        setReportData({
          totalRevenue,
          totalTransactions,
          averageTransactionValue,
          salesByPaymentMethod,
        });
        if (totalTransactions === 0) {
             toast({ title: "Tidak Ada Data", description: "Tidak ada transaksi ditemukan untuk rentang tanggal dan cabang yang dipilih.", variant: "default" });
        }

      } catch (error) {
        console.error("Error generating sales summary report:", error);
        toast({ title: "Gagal Membuat Laporan", description: "Terjadi kesalahan saat mengambil data transaksi.", variant: "destructive" });
      }
    } else {
      toast({ title: "Fitur Belum Tersedia", description: `Pembuatan laporan "${reportType}" belum diimplementasikan.`, variant: "default" });
    }
    setLoadingReport(false);
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold font-headline">
              Laporan {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
             {reportData && !loadingReport && (
                <Button variant="outline" size="sm" className="rounded-md text-xs" disabled>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Ekspor ke CSV/PDF (Segera)
                </Button>
            )}
          </div>
          

          <Card className="shadow-sm">
            <CardHeader className="p-4">
              <CardTitle className="text-base font-semibold">Filter Laporan</CardTitle>
              <CardDescription className="text-xs">Pilih jenis laporan dan filter untuk membuat laporan.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end p-4 pt-0">
              <div>
                <label htmlFor="reportType" className="block text-xs font-medium mb-1">Jenis Laporan</label>
                <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                  <SelectTrigger id="reportType" className="rounded-md h-9 text-xs">
                    <SelectValue placeholder="Pilih jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales_summary" className="text-xs">Ringkasan Penjualan</SelectItem>
                    <SelectItem value="income_statement" className="text-xs" disabled>Laporan Laba Rugi (Segera)</SelectItem>
                    <SelectItem value="balance_sheet" className="text-xs" disabled>Neraca Saldo (Segera)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-2/3" />
                </CardContent>
            </Card>
          )}

          {reportData && !loadingReport && reportType === 'sales_summary' && (
            <Card className="shadow-sm">
              <CardHeader className="p-4">
                <CardTitle className="text-base font-semibold">Ringkasan Penjualan</CardTitle>
                <CardDescription className="text-xs">
                  Untuk cabang: {selectedBranch?.name || 'N/A'} <br />
                  Periode: {startDate ? format(startDate, "dd MMM yyyy") : 'N/A'} - {endDate ? format(endDate, "dd MMM yyyy") : 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                    <h3 className="text-sm font-medium text-muted-foreground">Ringkasan Umum</h3>
                    <div className="flex justify-between text-sm">
                        <span>Total Pendapatan:</span>
                        <span className="font-semibold">{formatCurrency(reportData.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Jumlah Transaksi:</span>
                        <span className="font-semibold">{reportData.totalTransactions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Rata-rata per Transaksi:</span>
                        <span className="font-semibold">{formatCurrency(reportData.averageTransactionValue)}</span>
                    </div>
                </div>
                <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                    <h3 className="text-sm font-medium text-muted-foreground">Pendapatan per Metode Pembayaran</h3>
                     <div className="flex justify-between text-sm">
                        <span>Tunai (Cash):</span>
                        <span className="font-semibold">{formatCurrency(reportData.salesByPaymentMethod.cash)}</span>
                    </div>
                     <div className="flex justify-between text-sm">
                        <span>Kartu (Card):</span>
                        <span className="font-semibold">{formatCurrency(reportData.salesByPaymentMethod.card)}</span>
                    </div>
                     <div className="flex justify-between text-sm">
                        <span>Transfer:</span>
                        <span className="font-semibold">{formatCurrency(reportData.salesByPaymentMethod.transfer)}</span>
                    </div>
                </div>
                {/* Placeholder for more detailed reports like top products */}
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
