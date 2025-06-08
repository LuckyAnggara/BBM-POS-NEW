
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
import { getTransactionsByDateRangeAndBranch, getExpenses, type PosTransaction, type PaymentMethod, type Expense } from "@/lib/firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type ReportType = "sales_summary" | "income_statement" | "balance_sheet";

interface SalesSummaryData {
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  salesByPaymentMethod: Record<PaymentMethod, number>;
}

interface IncomeStatementData {
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  expensesBreakdown?: { category: string; amount: number }[]; 
}


export default function ReportsPage() {
  const { selectedBranch } = useBranch();
  const { toast } = useToast();

  const [reportType, setReportType] = useState<ReportType>("sales_summary");
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [loadingReport, setLoadingReport] = useState(false);
  const [salesSummaryData, setSalesSummaryData] = useState<SalesSummaryData | null>(null);
  const [incomeStatementData, setIncomeStatementData] = useState<IncomeStatementData | null>(null);


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
    setSalesSummaryData(null);
    setIncomeStatementData(null);

    try {
      if (reportType === "sales_summary") {
        const allTransactions = await getTransactionsByDateRangeAndBranch(selectedBranch.id, startDate, endDate);
        const completedTransactions = allTransactions.filter(tx => tx.status !== 'returned');

        let totalRevenue = 0;
        const salesByPaymentMethod: Record<PaymentMethod, number> = { cash: 0, card: 0, transfer: 0 };

        completedTransactions.forEach(tx => {
          totalRevenue += tx.totalAmount;
          salesByPaymentMethod[tx.paymentMethod] = (salesByPaymentMethod[tx.paymentMethod] || 0) + tx.totalAmount;
        });

        const totalTransactions = completedTransactions.length;
        const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

        setSalesSummaryData({
          totalRevenue,
          totalTransactions,
          averageTransactionValue,
          salesByPaymentMethod,
        });
        if (totalTransactions === 0) {
             toast({ title: "Tidak Ada Data", description: "Tidak ada transaksi penjualan (yang belum diretur) ditemukan untuk rentang tanggal dan cabang yang dipilih.", variant: "default" });
        }
      } else if (reportType === "income_statement") {
        const allTransactions = await getTransactionsByDateRangeAndBranch(selectedBranch.id, startDate, endDate);
        const completedTransactions = allTransactions.filter(tx => tx.status !== 'returned');
        
        let totalRevenue = 0;
        let totalCOGS = 0;
        completedTransactions.forEach(tx => {
          totalRevenue += tx.totalAmount;
          totalCOGS += tx.totalCost || 0; 
        });

        const expenses = await getExpenses(selectedBranch.id, { startDate, endDate });
        let totalExpenses = 0;
        const expensesBreakdown: { category: string; amount: number }[] = [];
        const expenseCategoryMap = new Map<string, number>();

        expenses.forEach(exp => {
          totalExpenses += exp.amount;
          expenseCategoryMap.set(exp.category, (expenseCategoryMap.get(exp.category) || 0) + exp.amount);
        });
        expenseCategoryMap.forEach((amount, category) => {
            expensesBreakdown.push({ category, amount });
        });


        const grossProfit = totalRevenue - totalCOGS;
        const netProfit = grossProfit - totalExpenses;

        setIncomeStatementData({
          totalRevenue,
          totalCOGS,
          grossProfit,
          totalExpenses,
          netProfit,
          expensesBreakdown
        });

         if (completedTransactions.length === 0 && expenses.length === 0) {
            toast({ title: "Tidak Ada Data", description: "Tidak ada data transaksi penjualan maupun pengeluaran ditemukan untuk periode ini.", variant: "default" });
        }

      } else {
        toast({ title: "Fitur Belum Tersedia", description: `Pembuatan laporan "${reportType}" belum diimplementasikan.`, variant: "default" });
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast({ title: "Gagal Membuat Laporan", description: "Terjadi kesalahan saat mengambil data.", variant: "destructive" });
    }
    setLoadingReport(false);
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold font-headline">
              Laporan Keuangan {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
             {(salesSummaryData || incomeStatementData) && !loadingReport && (
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
                    <SelectItem value="income_statement" className="text-xs">Laporan Laba Rugi</SelectItem>
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
                      disabled={(date) => startDate ? date < startDate : false}
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

          {salesSummaryData && !loadingReport && reportType === 'sales_summary' && (
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
                        <span className="font-semibold">{formatCurrency(salesSummaryData.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Jumlah Transaksi:</span>
                        <span className="font-semibold">{salesSummaryData.totalTransactions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Rata-rata per Transaksi:</span>
                        <span className="font-semibold">{formatCurrency(salesSummaryData.averageTransactionValue)}</span>
                    </div>
                </div>
                <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                    <h3 className="text-sm font-medium text-muted-foreground">Pendapatan per Metode Pembayaran</h3>
                     <div className="flex justify-between text-sm">
                        <span>Tunai (Cash):</span>
                        <span className="font-semibold">{formatCurrency(salesSummaryData.salesByPaymentMethod.cash)}</span>
                    </div>
                     <div className="flex justify-between text-sm">
                        <span>Kartu (Card):</span>
                        <span className="font-semibold">{formatCurrency(salesSummaryData.salesByPaymentMethod.card)}</span>
                    </div>
                     <div className="flex justify-between text-sm">
                        <span>Transfer:</span>
                        <span className="font-semibold">{formatCurrency(salesSummaryData.salesByPaymentMethod.transfer)}</span>
                    </div>
                </div>
              </CardContent>
            </Card>
          )}

          {incomeStatementData && !loadingReport && reportType === 'income_statement' && (
            <Card className="shadow-sm">
              <CardHeader className="p-4">
                <CardTitle className="text-base font-semibold">Laporan Laba Rugi</CardTitle>
                <CardDescription className="text-xs">
                  Untuk cabang: {selectedBranch?.name || 'N/A'} <br />
                  Periode: {startDate ? format(startDate, "dd MMM yyyy") : 'N/A'} - {endDate ? format(endDate, "dd MMM yyyy") : 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="border rounded-md p-3 bg-muted/30 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span>Total Pendapatan Penjualan:</span>
                    <span className="font-medium">{formatCurrency(incomeStatementData.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Harga Pokok Penjualan (HPP):</span>
                    <span className="font-medium text-destructive">({formatCurrency(incomeStatementData.totalCOGS)})</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Laba Kotor:</span>
                    <span>{formatCurrency(incomeStatementData.grossProfit)}</span>
                  </div>
                </div>

                <div className="border rounded-md p-3 bg-muted/30 space-y-1.5 text-sm">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Beban Operasional:</h3>
                    {incomeStatementData.expensesBreakdown && incomeStatementData.expensesBreakdown.length > 0 ? (
                        incomeStatementData.expensesBreakdown.map(exp => (
                            <div key={exp.category} className="flex justify-between">
                                <span>{exp.category}:</span>
                                <span className="font-medium text-destructive">({formatCurrency(exp.amount)})</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-muted-foreground">Tidak ada beban operasional tercatat untuk periode ini.</p>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                        <span>Total Beban Operasional:</span>
                        <span className="text-destructive">({formatCurrency(incomeStatementData.totalExpenses)})</span>
                    </div>
                </div>
                
                <div className="border rounded-md p-3 bg-background mt-2">
                    <div className="flex justify-between text-base font-bold">
                        <span>Laba / (Rugi) Bersih:</span>
                        <span className={incomeStatementData.netProfit >= 0 ? "text-green-600" : "text-destructive"}>
                        {formatCurrency(incomeStatementData.netProfit)}
                        </span>
                    </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!(salesSummaryData || incomeStatementData) && !loadingReport && (
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
