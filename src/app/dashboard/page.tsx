
"use client";

import MainLayout from "@/components/layout/main-layout";
import { useBranch } from "@/contexts/branch-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Package, AlertTriangle as AlertTriangleIconLucide, Info } from "lucide-react"; // Renamed to avoid conflict
import Image from 'next/image';
import ProtectedRoute from "@/components/auth/ProtectedRoute"; // Import ProtectedRoute
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components

export default function DashboardPage() {
  const { selectedBranch } = useBranch();
  const { userData, loadingAuth, loadingUserData } = useAuth();

  const showBranchAlert = !loadingAuth && !loadingUserData && userData && userData.role === 'cashier' && userData.branchId === null;

  return (
    <ProtectedRoute> {/* Wrap content with ProtectedRoute */}
      <MainLayout>
        <div className="space-y-4">
          <h1 className="text-xl md:text-2xl font-semibold font-headline">
            Dashboard {selectedBranch ? `- ${selectedBranch.name}` : (userData?.branchId ? '' : '')}
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
                <CardTitle className="text-xs font-medium">Total Pendapatan</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">$45,231.89</div>
                <p className="text-xs text-muted-foreground">+20.1% dari bulan lalu</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Total Pengeluaran</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">$12,543.20</div>
                <p className="text-xs text-muted-foreground">+5.2% dari bulan lalu</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Penjualan Aktif</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">+2350</div>
                <p className="text-xs text-muted-foreground">+180.1% dari bulan lalu</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Tren Penjualan</CardTitle>
                <CardDescription className="text-xs">Gambaran umum performa penjualan dari waktu ke waktu.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg p-4">
                <Image src="https://placehold.co/600x300.png" alt="Sales Trend Placeholder" width={600} height={300} className="rounded-md object-cover" data-ai-hint="sales graph" />
              </CardContent>
            </Card>
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Status Inventaris</CardTitle>
                <CardDescription className="text-xs">Ringkasan level stok.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 bg-muted/20 rounded-md">
                      <div>
                          <h3 className="font-medium text-xs">Stok Hampir Habis</h3>
                          <p className="text-xs text-muted-foreground">5 item hampir habis</p>
                      </div>
                      <AlertTriangleIconLucide className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-muted/20 rounded-md">
                      <div>
                          <h3 className="font-medium text-xs">Total Produk</h3>
                          <p className="text-xs text-muted-foreground">1,280 produk unik</p>
                      </div>
                      <Package className="h-5 w-5 text-primary" />
                  </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
