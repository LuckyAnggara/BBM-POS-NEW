
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import MainLayout from "@/components/layout/main-layout";
import { useBranch } from "@/contexts/branch-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Activity, Layers, AlertTriangle as AlertTriangleIconLucide, Info, Package } from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { getTransactionsByDateRangeAndBranch, getActiveShift, getTransactionsForShift, type PosTransaction } from "@/lib/firebase/pos";
import { getExpenses, type Expense } from "@/lib/firebase/expenses";
import { getInventoryItems, type InventoryItem } from "@/lib/firebase/inventory";
import { startOfMonth, endOfMonth, format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { id as localeID } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface DashboardStats {
  netRevenue: number;
  totalExpenses: number;
  netTransactionCount: number;
  revenueChangePercentage: string;
  expenseChangePercentage: string;
  transactionChangePercentage: string;
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

interface ChartDataPoint {
  name: string; // Day name, date, or hour
  total: number;
}

const LOW_STOCK_THRESHOLD = 5;

const chartConfig = {
  penjualan: {
    label: "Penjualan",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

type RangePreset = "today" | "thisWeek" | "thisMonth";

export default function DashboardPage() {
  const { selectedBranch } = useBranch();
  const { currentUser, userData, loadingAuth, loadingUserData } = useAuth();

  const [selectedRangePreset, setSelectedRangePreset] = useState<RangePreset>("thisMonth");
  const [currentDisplayRange, setCurrentDisplayRange] = useState<{ start: Date; end: Date } | null>(null);

  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null);
  const [activeShiftSummary, setActiveShiftSummary] = useState<ActiveShiftSummary | null>(null);
  const [chartSalesData, setChartSalesData] = useState<ChartDataPoint[]>([]);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingInventorySummary, setLoadingInventorySummary] = useState(true);
  const [loadingActiveShift, setLoadingActiveShift] = useState(true);
  const [loadingChartSales, setLoadingChartSales] = useState(true);

  const isCashierWithoutBranch = !loadingAuth && !loadingUserData && userData?.role === 'cashier' && !userData.branchId;

  const dashboardTitle = useMemo(() => {
    if (isCashierWithoutBranch) {
      return "Dashboard - Belum Ada Cabang";
    }
    if (userData?.role === 'admin' && !selectedBranch) {
      return "Dashboard (Pilih Cabang)";
    }
    return `Dashboard ${selectedBranch ? `- ${selectedBranch.name}` : ''}`;
  }, [isCashierWithoutBranch, userData, selectedBranch]);


  const formatCurrency = (amount: number): string => {
    return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  useEffect(() => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (selectedRangePreset) {
      case "today":
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case "thisWeek":
        start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "thisMonth":
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
    }
    setCurrentDisplayRange({ start, end });
  }, [selectedRangePreset]);


  const fetchDashboardData = useCallback(async () => {
    if (!selectedBranch || !currentUser || !currentDisplayRange || isCashierWithoutBranch) {
      setDashboardStats(null);
      setActiveShiftSummary(null);
      setChartSalesData([]);
      setLoadingStats(false);
      setLoadingActiveShift(false);
      setLoadingChartSales(false);
      if (!selectedBranch || isCashierWithoutBranch) {
        setInventorySummary(null);
        setLoadingInventorySummary(false);
      }
      return;
    }

    setLoadingStats(true);
    setLoadingActiveShift(true);
    setLoadingChartSales(true);
    
    if(loadingInventorySummary) { 
        setLoadingInventorySummary(true);
        getInventoryItems(selectedBranch.id).then(result => {
            const itemsArray = result.items;
            const totalUniqueProducts = itemsArray.length;
            const lowStockItemsCount = itemsArray.filter(item => item.quantity < LOW_STOCK_THRESHOLD).length;
            setInventorySummary({ totalUniqueProducts, lowStockItemsCount });
            setLoadingInventorySummary(false);
        }).catch(e => {
            console.error("Error fetching inventory:", e);
            setLoadingInventorySummary(false);
        });
    }


    const { start, end } = currentDisplayRange;

    try {
      const [
        rangeTransactions,
        rangeExpenses,
        activeShiftData,
      ] = await Promise.all([
        getTransactionsByDateRangeAndBranch(selectedBranch.id, start, end),
        getExpenses(selectedBranch.id, { startDate: start, endDate: end }),
        getActiveShift(currentUser.uid, selectedBranch.id) 
      ]);

      let netRevenue = 0;
      let netTransactionCount = 0;
      rangeTransactions.forEach(tx => {
        if (tx.status === 'completed') {
          netRevenue += tx.totalAmount;
          netTransactionCount++;
        } else if (tx.status === 'returned') {
          netRevenue -= tx.totalAmount;
        }
      });
      const totalExpenses = rangeExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      setDashboardStats({
        netRevenue,
        totalExpenses,
        netTransactionCount,
        revenueChangePercentage: "N/A", 
        expenseChangePercentage: "N/A",
        transactionChangePercentage: "N/A",
      });
      setLoadingStats(false);

      const salesByDay: { [key: string]: { total: number, dateObj: Date } } = {};
      let currentDateIterator = startOfDay(start);
      while (currentDateIterator <= endOfDay(end)) {
          const dateKey = format(currentDateIterator, "yyyy-MM-dd");
          salesByDay[dateKey] = { total: 0, dateObj: new Date(currentDateIterator) };
          currentDateIterator = startOfDay(subDays(currentDateIterator, -1)); 
      }

      rangeTransactions.forEach(tx => {
        const dateStr = format(tx.timestamp.toDate(), "yyyy-MM-dd");
        if (salesByDay[dateStr]) {
          if (tx.status === 'completed') {
            salesByDay[dateStr].total += tx.totalAmount;
          } else if (tx.status === 'returned') {
            salesByDay[dateStr].total -= tx.totalAmount;
          }
        }
      });
      
      const formattedChartSales = Object.entries(salesByDay)
        .map(([_, value]) => ({
            name: format(value.dateObj, "d MMM", { locale: localeID }), 
            total: value.total,
        }))
        .sort((a,b) => {
          const dateA = Object.values(salesByDay).find(d => d.dateObj && format(d.dateObj, "d MMM", { locale: localeID }) === a.name)?.dateObj;
          const dateB = Object.values(salesByDay).find(d => d.dateObj && format(d.dateObj, "d MMM", { locale: localeID }) === b.name)?.dateObj;
          if (dateA && dateB) return dateA.getTime() - dateB.getTime();
          return 0;
        });


      setChartSalesData(formattedChartSales);
      setLoadingChartSales(false);

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
      setLoadingActiveShift(false);
      setLoadingChartSales(false);
    }
  }, [selectedBranch, currentUser, currentDisplayRange, loadingInventorySummary, isCashierWithoutBranch]);

  useEffect(() => {
    if (currentDisplayRange && (selectedBranch || isCashierWithoutBranch)) { // Check isCashierWithoutBranch too, so it can clear data if user becomes cashier w/o branch
        fetchDashboardData();
    } else if (!selectedBranch && !isCashierWithoutBranch) { // If no branch selected AND user is not a cashier without a branch (e.g. admin with no branch selected yet)
        setDashboardStats(null);
        setInventorySummary(null);
        setActiveShiftSummary(null);
        setChartSalesData([]);
        setLoadingStats(false);
        setLoadingInventorySummary(false);
        setLoadingActiveShift(false);
        setLoadingChartSales(false);
    }
  }, [fetchDashboardData, selectedBranch, currentDisplayRange, isCashierWithoutBranch]);


  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 ">
                <h1 className="text-xl md:text-2xl font-semibold font-headline">
                    {dashboardTitle}
                </h1>
                {!isCashierWithoutBranch && (
                  <div className="flex items-center gap-2">
                      <Select value={selectedRangePreset} onValueChange={(value) => setSelectedRangePreset(value as RangePreset)}>
                          <SelectTrigger className="w-[180px] h-9 text-xs rounded-md">
                              <SelectValue placeholder="Pilih Periode" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="today" className="text-xs">Hari Ini</SelectItem>
                              <SelectItem value="thisWeek" className="text-xs">Minggu Ini</SelectItem>
                              <SelectItem value="thisMonth" className="text-xs">Bulan Ini</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                )}
            </div>
            {currentDisplayRange && !isCashierWithoutBranch && (
                <p className="text-sm text-muted-foreground -mt-2 mb-4">
                    Periode: {format(currentDisplayRange.start, "dd MMM yyyy", { locale: localeID })} - {format(currentDisplayRange.end, "dd MMM yyyy", { locale: localeID })}
                </p>
            )}


          {isCashierWithoutBranch && (
            <Alert variant="default" className="bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700/50 dark:text-yellow-300">
              <Info className="h-4 w-4 !text-yellow-600 dark:!text-yellow-400" />
              <AlertTitle className="font-semibold text-yellow-700 dark:text-yellow-200">Perhatian untuk Kasir</AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                Akun Anda belum terhubung dengan cabang manapun. Mohon hubungi Administrator untuk menetapkan cabang Anda agar dapat mengakses semua fitur.
              </AlertDescription>
            </Alert>
          )}
          
          {!isCashierWithoutBranch && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Pendapatan Bersih</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {loadingStats ? <Skeleton className="h-7 w-3/4" /> : <div className="text-lg font-bold">{formatCurrency(dashboardStats?.netRevenue ?? 0)}</div>}
                    {loadingStats ? <Skeleton className="h-4 w-1/2 mt-1" /> : <p className="text-xs text-muted-foreground">{dashboardStats?.revenueChangePercentage} dari periode lalu</p>}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Total Pengeluaran</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {loadingStats ? <Skeleton className="h-7 w-3/4" /> : <div className="text-lg font-bold">{formatCurrency(dashboardStats?.totalExpenses ?? 0)}</div>}
                    {loadingStats ? <Skeleton className="h-4 w-1/2 mt-1" /> : <p className="text-xs text-muted-foreground">{dashboardStats?.expenseChangePercentage} dari periode lalu</p>}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Transaksi Selesai</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {loadingStats ? <Skeleton className="h-7 w-1/2" /> : <div className="text-lg font-bold">{(dashboardStats?.netTransactionCount ?? 0).toLocaleString('id-ID')}</div>}
                    {loadingStats ? <Skeleton className="h-4 w-1/2 mt-1" /> : <p className="text-xs text-muted-foreground">{dashboardStats?.transactionChangePercentage} dari periode lalu</p>}
                  </CardContent>
                </Card>
              </div>

              {loadingActiveShift ? (
                <Skeleton className="h-28 w-full" /> 
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
                    <CardTitle className="text-base font-semibold">Tren Penjualan</CardTitle>
                    <CardDescription className="text-xs">Total penjualan bersih harian untuk periode terpilih.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px] pl-2 pr-6 pb-6">
                    {loadingChartSales ? (
                      <Skeleton className="h-full w-full" />
                    ) : chartSalesData.length > 0 ? (
                      <ChartContainer config={chartConfig} className="w-full h-full">
                        <BarChart accessibilityLayer data={chartSalesData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            className="text-xs"
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => `${selectedBranch?.currency || 'Rp'}${value / 1000}k`}
                            className="text-xs"
                          />
                          <RechartsTooltip
                            cursor={{ fill: 'hsl(var(--muted))' }}
                            content={<ChartTooltipContent
                                        formatter={(value, name, props) => (
                                            <div className="flex flex-col">
                                                <span className="text-xs text-muted-foreground">{props.payload.name}</span>
                                                <span className="font-bold">{formatCurrency(value as number)}</span>
                                            </div>
                                        )}
                                        indicator="dot"
                                    />}
                          />
                          <Bar dataKey="total" fill="var(--color-penjualan)" radius={4} />
                        </BarChart>
                      </ChartContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-muted-foreground">Tidak ada data penjualan untuk periode ini.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Status Inventaris</CardTitle>
                    <CardDescription className="text-xs">Ringkasan level stok terkini (tidak terpengaruh filter tanggal).</CardDescription>
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
            </>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

    
