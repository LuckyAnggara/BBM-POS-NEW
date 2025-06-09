
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import MainLayout from "@/components/layout/main-layout";
import { useBranch } from "@/contexts/branch-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Package, AlertTriangle as AlertTriangleIconLucide, Info, Activity, Layers } from "lucide-react";
import Image from 'next/image';
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { getTransactionsByDateRangeAndBranch, getActiveShift, getTransactionsForShift, type PosTransaction } from "@/lib/firebase/pos";
import { getExpenses, type Expense } from "@/lib/firebase/expenses";
import { getInventoryItems, type InventoryItem } from "@/lib/firebase/inventory";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { Separator } from "@/components/ui/separator";

interface DashboardStats {
  netRevenueThisMonth: number;
  totalExpensesThisMonth: number;
  netTransactionCountThisMonth: number;
  revenueChangePercentage: string; // Placeholder
  expenseChangePercentage: string; // Placeholder
  transactionChangePercentage: string; // Placeholder
}

interface InventorySummary {
  totalUniqueProducts: number;
  lowStockItemsCount: number;
}

interface ActiveShiftSummary {
  initialCash: number;
  estimatedCashInDrawer: number;
  totalCashSalesShift: number;
  totalCardSalesShift: number;
  totalTransferSalesShift: number;
}

const LOW_STOCK_THRESHOLD = 5;

export default function DashboardPage() {
  const { selectedBranch } = useBranch();
  const { currentUser, userData, loadingAuth, loadingUserData } = useAuth();

  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null);
  const [activeShiftSummary, setActiveShiftSummary] = useState<ActiveShiftSummary | null>(null);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingInventorySummary, setLoadingInventorySummary] = useState(true);
  const [loadingActiveShift, setLoadingActiveShift] = useState(true);

  const showBranchAlert = !loadingAuth && !loadingUserData && userData && userData.role === 'cashier' && userData.branchId === null;

  const formatCurrency = (amount: number): string => {
    return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const fetchDashboardData = useCallback(async () => {
    if (!selectedBranch || !currentUser) {
      setDashboardStats(null);
      setInventorySummary(null);
      setActiveShiftSummary(null);
      setLoadingStats(false);
      setLoadingInventorySummary(false);
      setLoadingActiveShift(false);
      return;
    }

    setLoadingStats(true);
    setLoadingInventorySummary(true);
    setLoadingActiveShift(true);

    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const currentMonthEnd = endOfMonth(today);

    try {
      // Fetch sales and expenses for the current month
      const [monthlyTransactions, monthlyExpenses, inventoryItemsData, activeShiftData] = await Promise.all([
        getTransactionsByDateRangeAndBranch(selectedBranch.id, currentMonthStart, currentMonthEnd),
        getExpenses(selectedBranch.id, { startDate: currentMonthStart, endDate: currentMonthEnd }),
        getInventoryItems(selectedBranch.id),
        getActiveShift(currentUser.uid, selectedBranch.id)
      ]);

      // Calculate dashboard stats
      let netRevenueThisMonth = 0;
      let netTransactionCountThisMonth = 0;
      monthlyTransactions.forEach(tx => {
        if (tx.status === 'completed') {
          netRevenueThisMonth += tx.totalAmount;
          netTransactionCountThisMonth++;
        } else if (tx.status === 'returned') {
          // Assuming returned amount should be subtracted
          netRevenueThisMonth -= tx.totalAmount;
        }
      });
      const totalExpensesThisMonth = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      setDashboardStats({
        netRevenueThisMonth,
        totalExpensesThisMonth,
        netTransactionCountThisMonth,
        revenueChangePercentage: "+20.1%", // Placeholder
        expenseChangePercentage: "+5.2%", // Placeholder
        transactionChangePercentage: "+180", // Placeholder
      });
      setLoadingStats(false);

      // Calculate inventory summary
      const totalUniqueProducts = inventoryItemsData.length;
      const lowStockItemsCount = inventoryItemsData.filter(item => item.quantity < LOW_STOCK_THRESHOLD).length;
      setInventorySummary({ totalUniqueProducts, lowStockItemsCount });
      setLoadingInventorySummary(false);

      // Calculate active shift summary
      if (activeShiftData) {
        const shiftTransactions = await getTransactionsForShift(activeShiftData.id);
        const totalCashSalesShift = shiftTransactions.filter(tx => tx.paymentTerms === 'cash' && tx.status === 'completed').reduce((sum, tx) => sum + tx.totalAmount, 0);
        const totalCardSalesShift = shiftTransactions.filter(tx => tx.paymentTerms === 'card' && tx.status === 'completed').reduce((sum, tx) => sum + tx.totalAmount, 0);
        const totalTransferSalesShift = shiftTransactions.filter(tx => tx.paymentTerms === 'transfer' && tx.status === 'completed').reduce((sum, tx) => sum + tx.totalAmount, 0);
        setActiveShiftSummary({
          initialCash: activeShiftData.initialCash,
          estimatedCashInDrawer: activeShiftData.initialCash + totalCashSalesShift,
          totalCashSalesShift,
          totalCardSalesShift,
          totalTransferSalesShift,
        });
      } else {
        setActiveShiftSummary(null);
      }
      setLoadingActiveShift(false);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoadingStats(false);
      setLoadingInventorySummary(false);
      setLoadingActiveShift(false);
    }
  }, [selectedBranch, currentUser]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-4">
          <h1 className="text-xl md:text-2xl font-semibold font-headline">
            Dashboard {selectedBranch ? `- ${selectedBranch.name}` : ''}
          </h1>

          {showBranchAlert && (
            <Alert variant="default" className="bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700/50 dark:text-yellow-300">
              <Info className="h-4 w-4 !text-yellow-600 dark:!text-yellow-400" />
              <AlertTitle className="font-semibold text-yellow-700 dark:text-yellow-200">Perhatian untuk Kasir</AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                Akun Anda belum terhubung dengan cabang manapun. Mohon hubungi Administrator untuk menetapkan cabang Anda agar dapat mengakses semua fitur.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Pendapatan Bersih (Bulan Ini)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingStats ? <Skeleton className="h-7 w-3/4" /> : <div className="text-lg font-bold">{formatCurrency(dashboardStats?.netRevenueThisMonth ?? 0)}</div>}
                {loadingStats ? <Skeleton className="h-4 w-1/2 mt-1" /> : <p className="text-xs text-muted-foreground">{dashboardStats?.revenueChangePercentage} dari bulan lalu</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Total Pengeluaran (Bulan Ini)</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingStats ? <Skeleton className="h-7 w-3/4" /> : <div className="text-lg font-bold">{formatCurrency(dashboardStats?.totalExpensesThisMonth ?? 0)}</div>}
                {loadingStats ? <Skeleton className="h-4 w-1/2 mt-1" /> : <p className="text-xs text-muted-foreground">{dashboardStats?.expenseChangePercentage} dari bulan lalu</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Transaksi Selesai (Bulan Ini)</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingStats ? <Skeleton className="h-7 w-1/2" /> : <div className="text-lg font-bold">{(dashboardStats?.netTransactionCountThisMonth ?? 0).toLocaleString('id-ID')}</div>}
                {loadingStats ? <Skeleton className="h-4 w-1/2 mt-1" /> : <p className="text-xs text-muted-foreground">{dashboardStats?.transactionChangePercentage} dari bulan lalu</p>}
              </CardContent>
            </Card>
          </div>

          {loadingActiveShift ? (
            <Card><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ) : activeShiftSummary && (
            <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700/40">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300">Informasi Kas Shift Saat Ini</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5 px-4 pb-3 text-xs">
                <div>
                  <p className="text-blue-600 dark:text-blue-400">Modal Awal:</p>
                  <p className="font-medium text-blue-700 dark:text-blue-200">{formatCurrency(activeShiftSummary.initialCash)}</p>
                </div>
                <div>
                  <p className="text-blue-600 dark:text-blue-400">Kas Seharusnya:</p>
                  <p className="font-medium text-blue-700 dark:text-blue-200">{formatCurrency(activeShiftSummary.estimatedCashInDrawer)}</p>
                </div>
                <div>
                  <p className="text-blue-600 dark:text-blue-400">Total Tunai (Shift):</p>
                  <p className="font-medium text-blue-700 dark:text-blue-200">{formatCurrency(activeShiftSummary.totalCashSalesShift)}</p>
                </div>
                 <div>
                  <p className="text-blue-600 dark:text-blue-400">Total Kartu (Shift):</p>
                  <p className="font-medium text-blue-700 dark:text-blue-200">{formatCurrency(activeShiftSummary.totalCardSalesShift)}</p>
                </div>
                 <div>
                  <p className="text-blue-600 dark:text-blue-400">Total Transfer (Shift):</p>
                  <p className="font-medium text-blue-700 dark:text-blue-200">{formatCurrency(activeShiftSummary.totalTransferSalesShift)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Tren Penjualan Mingguan</CardTitle>
                <CardDescription className="text-xs">Gambaran umum performa penjualan selama seminggu terakhir.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg p-4">
                {/* Placeholder - ganti dengan komponen grafik jika sudah ada */}
                <Image src="https://placehold.co/600x300.png" alt="Sales Trend Placeholder" width={600} height={300} className="rounded-md object-cover" data-ai-hint="sales graph" />
              </CardContent>
            </Card>
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Status Inventaris</CardTitle>
                <CardDescription className="text-xs">Ringkasan level stok terkini.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 bg-muted/20 rounded-md">
                      <div>
                          <h3 className="font-medium text-xs">Stok Hampir Habis ({'<'} {LOW_STOCK_THRESHOLD})</h3>
                          {loadingInventorySummary ? <Skeleton className="h-5 w-20" /> : <p className="text-base font-bold text-destructive">{inventorySummary?.lowStockItemsCount ?? 0} item</p>}
                      </div>
                      <AlertTriangleIconLucide className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-muted/20 rounded-md">
                      <div>
                          <h3 className="font-medium text-xs">Total Produk Unik</h3>
                          {loadingInventorySummary ? <Skeleton className="h-5 w-24" /> : <p className="text-base font-bold text-primary">{inventorySummary?.totalUniqueProducts ?? 0} produk terdaftar</p>}
                      </div>
                      <Layers className="h-5 w-5 text-primary" />
                  </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

    