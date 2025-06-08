
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from "@/lib/firebase/firestore";
import { getPurchaseOrderById, updatePurchaseOrderStatus } from "@/lib/firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Printer, Edit, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";


export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const poId = params.poId as string;

  const { currentUser } = useAuth();
  const { selectedBranch } = useBranch();
  const { toast } = useToast();

  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [loadingPO, setLoadingPO] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchPurchaseOrder = useCallback(async () => {
    if (!poId) {
      setLoadingPO(false);
      toast({ title: "Error", description: "ID Pesanan Pembelian tidak valid.", variant: "destructive" });
      router.push("/purchase-orders");
      return;
    }
    setLoadingPO(true);
    try {
      const fetchedPO = await getPurchaseOrderById(poId);
      if (fetchedPO) {
        setPurchaseOrder(fetchedPO);
      } else {
        toast({ title: "Tidak Ditemukan", description: "Pesanan Pembelian tidak ditemukan.", variant: "destructive" });
        router.push("/purchase-orders");
      }
    } catch (error) {
      console.error("Error fetching PO details:", error);
      toast({ title: "Gagal Memuat", description: "Gagal memuat detail pesanan pembelian.", variant: "destructive" });
    } finally {
      setLoadingPO(false);
    }
  }, [poId, toast, router]);

  useEffect(() => {
    fetchPurchaseOrder();
  }, [fetchPurchaseOrder]);

  const handleUpdateStatus = async (newStatus: PurchaseOrderStatus) => {
    if (!purchaseOrder) return;
    setIsUpdatingStatus(true);
    const result = await updatePurchaseOrderStatus(purchaseOrder.id, newStatus);
    if (result && "error" in result) {
      toast({ title: "Gagal Update Status", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Status Diperbarui", description: `Status PO ${purchaseOrder.poNumber} telah diubah menjadi ${getStatusText(newStatus)}.` });
      await fetchPurchaseOrder(); // Refresh PO data
    }
    setIsUpdatingStatus(false);
  };

  const formatDate = (timestamp: Timestamp | Date | undefined, includeTime = false) => {
    if (!timestamp) return "N/A";
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return new Intl.DateTimeFormat('id-ID', options).format(date);
  };

  const formatCurrency = (amount: number) => {
    return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString('id-ID')}`;
  };

  const getStatusBadgeVariant = (status: PurchaseOrderStatus | undefined) => {
    if (!status) return 'secondary';
    switch (status) {
      case 'draft': return 'secondary';
      case 'ordered': return 'default';
      case 'partially_received': return 'outline';
      case 'fully_received': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: PurchaseOrderStatus | undefined) => {
    if (!status) return "N/A";
    switch (status) {
      case 'draft': return 'Draft';
      case 'ordered': return 'Dipesan';
      case 'partially_received': return 'Diterima Sebagian';
      case 'fully_received': return 'Diterima Penuh';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };

  if (loadingPO) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/4" />
          <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>
        </div>
      </MainLayout>
    );
  }

  if (!purchaseOrder) {
    // This case should be handled by redirection in fetchPurchaseOrder, but as a fallback.
    return <MainLayout><div className="p-4 text-center">Pesanan Pembelian tidak ditemukan.</div></MainLayout>;
  }

  const canMarkAsOrdered = purchaseOrder.status === 'draft';
  const canCancel = purchaseOrder.status === 'draft' || purchaseOrder.status === 'ordered';
  const canReceiveItems = purchaseOrder.status === 'ordered' || purchaseOrder.status === 'partially_received';

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
                <h1 className="text-xl md:text-2xl font-semibold font-headline">
                Detail Pesanan Pembelian: {purchaseOrder.poNumber}
                </h1>
                <p className="text-sm text-muted-foreground">
                    Status: <Badge variant={getStatusBadgeVariant(purchaseOrder.status)} className={cn(purchaseOrder.status === 'fully_received' && "bg-green-600 text-white hover:bg-green-700", purchaseOrder.status === 'ordered' && "bg-blue-500 text-white hover:bg-blue-600", purchaseOrder.status === 'partially_received' && "bg-yellow-500 text-white hover:bg-yellow-600")}>{getStatusText(purchaseOrder.status)}</Badge>
                </p>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild className="text-xs h-8">
                    <Link href="/purchase-orders"><ArrowLeft className="mr-1.5 h-3.5 w-3.5"/> Kembali ke Daftar</Link>
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8" disabled>
                    <Printer className="mr-1.5 h-3.5 w-3.5"/> Cetak PO (Segera)
                </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Item Pesanan</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Nama Produk</TableHead>
                      <TableHead className="text-xs text-center">Dipesan</TableHead>
                      <TableHead className="text-xs text-center">Diterima</TableHead>
                      <TableHead className="text-xs text-right">Harga Beli</TableHead>
                      <TableHead className="text-xs text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrder.items.map((item, index) => (
                      <TableRow key={item.productId + index}>
                        <TableCell className="text-xs font-medium py-1.5">{item.productName}</TableCell>
                        <TableCell className="text-xs text-center py-1.5">{item.orderedQuantity}</TableCell>
                        <TableCell className="text-xs text-center py-1.5">{item.receivedQuantity}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">{formatCurrency(item.purchasePrice)}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">{formatCurrency(item.totalPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                 <Separator className="my-3"/>
                 <div className="flex justify-end items-center text-sm">
                    <div className="w-full max-w-xs space-y-1">
                        <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span className="font-medium">{formatCurrency(purchaseOrder.subtotal)}</span>
                        </div>
                        {/* Shipping and Tax can be added here if they exist in data */}
                        <div className="flex justify-between font-semibold text-base">
                            <span>Total Pesanan:</span>
                            <span>{formatCurrency(purchaseOrder.totalAmount)}</span>
                        </div>
                    </div>
                 </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-1 space-y-4">
                <Card>
                    <CardHeader><CardTitle className="text-base">Informasi Umum</CardTitle></CardHeader>
                    <CardContent className="space-y-1.5 text-xs">
                        <p><strong>No. PO:</strong> {purchaseOrder.poNumber}</p>
                        <p><strong>Pemasok:</strong> {purchaseOrder.supplierName}</p>
                        <p><strong>Tanggal Pesan:</strong> {formatDate(purchaseOrder.orderDate)}</p>
                        <p><strong>Estimasi Terima:</strong> {purchaseOrder.expectedDeliveryDate ? formatDate(purchaseOrder.expectedDeliveryDate) : "-"}</p>
                         <p><strong>Dibuat Oleh:</strong> {purchaseOrder.createdById.substring(0,8)}...</p> {/* Placeholder, ideally fetch user name */}
                        <p><strong>Dibuat Pada:</strong> {formatDate(purchaseOrder.createdAt, true)}</p>
                        <p><strong>Diperbarui Pada:</strong> {formatDate(purchaseOrder.updatedAt, true)}</p>
                        {purchaseOrder.notes && (
                        <>
                            <Separator className="my-1.5"/>
                            <p><strong>Catatan:</strong></p>
                            <p className="whitespace-pre-wrap bg-muted/50 p-2 rounded-md">{purchaseOrder.notes}</p>
                        </>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-base">Aksi Pesanan</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {canMarkAsOrdered && (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button size="sm" className="w-full text-xs h-8" variant="default" disabled={isUpdatingStatus}>
                                        <CheckCircle className="mr-1.5 h-3.5 w-3.5"/> Tandai sebagai Dipesan
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Konfirmasi Pemesanan</AlertDialogTitle>
                                    <AlertDialogDescription className="text-xs">
                                        Apakah Anda yakin ingin mengubah status pesanan ini menjadi "Dipesan"? Ini menandakan pesanan telah dikirim ke pemasok.
                                    </AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="text-xs h-8" disabled={isUpdatingStatus}>Batal</AlertDialogCancel>
                                        <AlertDialogAction className="text-xs h-8" onClick={() => handleUpdateStatus('ordered')} disabled={isUpdatingStatus}>
                                            {isUpdatingStatus ? "Memproses..." : "Ya, Tandai Dipesan"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        {canReceiveItems && (
                            <Button size="sm" className="w-full text-xs h-8" variant="outline" disabled>
                                <PackageCheck className="mr-1.5 h-3.5 w-3.5"/> Catat Penerimaan Barang (Segera)
                            </Button>
                        )}
                        {canCancel && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                     <Button size="sm" variant="destructive" className="w-full text-xs h-8" disabled={isUpdatingStatus}>
                                        <XCircle className="mr-1.5 h-3.5 w-3.5"/> Batalkan Pesanan
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Batalkan Pesanan Pembelian?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-xs">
                                        Apakah Anda yakin ingin membatalkan pesanan pembelian ini? Tindakan ini tidak dapat diurungkan.
                                    </AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="text-xs h-8" disabled={isUpdatingStatus}>Tutup</AlertDialogCancel>
                                        <AlertDialogAction className="text-xs h-8 bg-destructive hover:bg-destructive/90" onClick={() => handleUpdateStatus('cancelled')} disabled={isUpdatingStatus}>
                                            {isUpdatingStatus ? "Memproses..." : "Ya, Batalkan PO"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                         {!canMarkAsOrdered && !canCancel && !canReceiveItems && (
                            <p className="text-xs text-muted-foreground text-center">Tidak ada aksi yang tersedia untuk status PO saat ini ({getStatusText(purchaseOrder.status)}).</p>
                         )}
                    </CardContent>
                </Card>
            </div>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

