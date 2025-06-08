
"use client";

import React, { useState, useEffect, useCallback } from "react";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { PlusCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { PurchaseOrder } from "@/lib/firebase/firestore";
import { getPurchaseOrdersByBranch } from "@/lib/firebase/firestore";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function PurchaseOrdersPage() {
  const { currentUser } = useAuth();
  const { selectedBranch } = useBranch();
  const { toast } = useToast();

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loadingPOs, setLoadingPOs] = useState(true);

  const fetchPurchaseOrders = useCallback(async () => {
    if (!selectedBranch) {
      setPurchaseOrders([]);
      setLoadingPOs(false);
      return;
    }
    setLoadingPOs(true);
    try {
      const fetchedPOs = await getPurchaseOrdersByBranch(selectedBranch.id, { orderByField: "createdAt", orderDirection: "desc" });
      setPurchaseOrders(fetchedPOs);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      toast({ title: "Gagal Memuat Pesanan", description: "Terjadi kesalahan saat mengambil data pesanan pembelian.", variant: "destructive" });
    } finally {
      setLoadingPOs(false);
    }
  }, [selectedBranch, toast]);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  const formatDate = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return "N/A";
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return format(date, "dd MMM yyyy");
  };

  const formatCurrency = (amount: number) => {
    return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString('id-ID')}`;
  };

  const getStatusBadgeVariant = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'ordered': return 'default';
      case 'partially_received': return 'outline'; // Or another color
      case 'fully_received': return 'default'; // Same as ordered, but with different text potentially
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };
   const getStatusText = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'ordered': return 'Dipesan';
      case 'partially_received': return 'Diterima Sebagian';
      case 'fully_received': return 'Diterima Penuh';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };


  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold font-headline">
              Pesanan Pembelian {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            <Button size="sm" className="rounded-md text-xs" asChild disabled={!selectedBranch}>
              <Link href="/purchase-orders/new">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Buat Pesanan Baru
              </Link>
            </Button>
          </div>

          {loadingPOs ? (
             <div className="space-y-2 border rounded-lg shadow-sm p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
          ) : !selectedBranch ? (
            <div className="border rounded-lg shadow-sm overflow-hidden p-10 text-center">
                <p className="text-sm text-muted-foreground">Pilih cabang untuk mengelola pesanan pembelian.</p>
            </div>
          ) : purchaseOrders.length === 0 ? (
            <div className="border rounded-lg shadow-sm overflow-hidden p-10 text-center">
              <p className="text-sm text-muted-foreground">Belum ada pesanan pembelian untuk cabang ini.</p>
              <Button size="sm" className="mt-4 text-xs" asChild>
                 <Link href="/purchase-orders/new">
                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Buat Pesanan Pembelian Pertama
                 </Link>
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg shadow-sm overflow-hidden">
              <Table>
                <TableCaption className="text-xs">Daftar pesanan pembelian untuk {selectedBranch?.name || 'cabang terpilih'}.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">No. PO</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Pemasok</TableHead>
                    <TableHead className="text-xs">Tanggal Pesan</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Est. Terima</TableHead>
                    <TableHead className="text-xs text-center">Status</TableHead>
                    <TableHead className="text-right text-xs">Total</TableHead>
                    <TableHead className="text-right text-xs">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="py-2 text-xs font-medium">{po.poNumber || po.id.substring(0,6).toUpperCase()}</TableCell>
                      <TableCell className="py-2 text-xs hidden sm:table-cell">{po.supplierName}</TableCell>
                      <TableCell className="py-2 text-xs">{formatDate(po.orderDate)}</TableCell>
                      <TableCell className="py-2 text-xs hidden md:table-cell">{po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '-'}</TableCell>
                      <TableCell className="py-2 text-xs text-center">
                        <Badge 
                          variant={getStatusBadgeVariant(po.status)} 
                          className={cn(po.status === 'fully_received' && "bg-green-600 text-white hover:bg-green-700")}
                        >
                            {getStatusText(po.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-2 text-xs">{formatCurrency(po.totalAmount)}</TableCell>
                      <TableCell className="text-right py-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Lihat Detail PO">
                          <Link href={`/purchase-orders/${po.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                            <span className="sr-only">Lihat Detail</span>
                          </Link>
                        </Button>
                        {/* Edit/Delete actions can be added here later */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
