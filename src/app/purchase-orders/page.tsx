
"use client";

import React, { useState, useEffect, useCallback } from "react";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { PlusCircle, Eye, CheckCircle, XCircle, MoreHorizontal, CalendarIcon, Search, FilterX, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { PurchaseOrder, PurchaseOrderStatus, PurchaseOrderPaymentStatus } from "@/lib/firebase/purchaseOrders";
import { getPurchaseOrdersByBranch, updatePurchaseOrderStatus } from "@/lib/firebase/purchaseOrders";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";
import { format, isBefore, startOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const ALL_PO_STATUSES: PurchaseOrderStatus[] = ['draft', 'ordered', 'partially_received', 'fully_received', 'cancelled'];
const ALL_PAYMENT_STATUSES: PurchaseOrderPaymentStatus[] = ['unpaid', 'partially_paid', 'paid', 'overdue'];


export default function PurchaseOrdersPage() {
  const { currentUser } = useAuth();
  const { selectedBranch } = useBranch();
  const { toast } = useToast();

  const [allFetchedPOs, setAllFetchedPOs] = useState<PurchaseOrder[]>([]);
  const [filteredPOs, setFilteredPOs] = useState<PurchaseOrder[]>([]);
  const [loadingPOs, setLoadingPOs] = useState(true);
  
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [poToUpdate, setPoToUpdate] = useState<{ id: string; newStatus: PurchaseOrderStatus; poNumber: string } | null>(null);

  // Filter states
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusPoFilter, setStatusPoFilter] = useState<PurchaseOrderStatus | "all">("all");
  const [paymentStatusPoFilter, setPaymentStatusPoFilter] = useState<PurchaseOrderPaymentStatus | "all">("all");

  const fetchPurchaseOrdersWithDateFilters = useCallback(async () => {
    if (!selectedBranch || !startDate || !endDate) {
      // This case should ideally be handled by UI disabling apply button
      // or by calling loadDefaultForBranch if no dates are set.
      // For now, if called without dates, it implies an error or clears data.
      setAllFetchedPOs([]);
      setFilteredPOs([]);
      setLoadingPOs(false);
      return;
    }
    setLoadingPOs(true);
    try {
      const fetchedPOs = await getPurchaseOrdersByBranch(selectedBranch.id, {
        startDate: startDate,
        endDate: endDate,
        orderByField: "orderDate",
        orderDirection: "desc",
      });
      setAllFetchedPOs(fetchedPOs);
      setLoadingPOs(false);
      if (fetchedPOs.length === 0) {
        toast({ title: "Tidak Ada Pesanan", description: "Tidak ada pesanan pembelian ditemukan untuk filter tanggal yang dipilih.", variant: "default" });
      }
    } catch (error) {
      console.error("Error fetching purchase orders with date filters:", error);
      toast({ title: "Gagal Memuat Pesanan", description: "Terjadi kesalahan saat mengambil data pesanan pembelian.", variant: "destructive" });
      setLoadingPOs(false);
    }
  }, [selectedBranch, startDate, endDate, toast]);

  const loadDefaultForBranch = useCallback(async (branchId: string) => {
    setLoadingPOs(true);
    const initialPOs = await getPurchaseOrdersByBranch(branchId, {
      limit: 50,
      orderByField: "createdAt",
      orderDirection: "desc"
    });
    setAllFetchedPOs(initialPOs);
    setLoadingPOs(false);
  }, []);


  useEffect(() => {
    if (selectedBranch) {
      if (startDate && endDate) {
        // If date filters are active, fetch using them
        fetchPurchaseOrdersWithDateFilters();
      } else {
        // Otherwise, load default (e.g., on initial load or after clearing date filters)
        loadDefaultForBranch(selectedBranch.id);
      }
    } else {
      // No branch selected, clear data
      setAllFetchedPOs([]);
      setFilteredPOs([]);
      setLoadingPOs(false);
    }
  }, [selectedBranch, startDate, endDate, fetchPurchaseOrdersWithDateFilters, loadDefaultForBranch]);


  useEffect(() => {
    let currentPOs = [...allFetchedPOs];

    if (statusPoFilter !== "all") {
      currentPOs = currentPOs.filter(po => po.status === statusPoFilter);
    }

    if (paymentStatusPoFilter !== "all") {
      currentPOs = currentPOs.filter(po => {
        if (paymentStatusPoFilter === 'overdue') {
          return po.isCreditPurchase && po.paymentDueDateOnPO && isBefore(po.paymentDueDateOnPO.toDate(), startOfDay(new Date())) && po.paymentStatusOnPO !== 'paid';
        }
        return po.isCreditPurchase && po.paymentStatusOnPO === paymentStatusPoFilter;
      });
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      currentPOs = currentPOs.filter(po =>
        po.poNumber.toLowerCase().includes(lowerSearchTerm) ||
        po.supplierName.toLowerCase().includes(lowerSearchTerm) ||
        po.supplierInvoiceNumber?.toLowerCase().includes(lowerSearchTerm)
      );
    }
    setFilteredPOs(currentPOs);
  }, [allFetchedPOs, statusPoFilter, paymentStatusPoFilter, searchTerm]);


  const handleApplyFilters = () => {
      if (!startDate || !endDate) {
          toast({ title: "Pilih Rentang Tanggal", description: "Silakan pilih tanggal mulai dan akhir untuk filter tanggal.", variant: "destructive"});
          return;
      }
      // The useEffect dependent on startDate and endDate will trigger fetchPurchaseOrdersWithDateFilters
      // No need to call it directly here if the state update is sufficient to trigger the effect.
      // However, to ensure immediate fetch on apply, explicitly call it:
      fetchPurchaseOrdersWithDateFilters();
  };

  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSearchTerm("");
    setStatusPoFilter("all");
    setPaymentStatusPoFilter("all");
    // useEffect will handle fetching default data when startDate/endDate become undefined
  };


  const handleUpdateStatus = async () => {
    if (!poToUpdate || !selectedBranch) return;
    setIsUpdatingStatus(true);
    const result = await updatePurchaseOrderStatus(poToUpdate.id, poToUpdate.newStatus);
    if (result && "error" in result) {
      toast({ title: "Gagal Update Status", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Status Diperbarui", description: `Status PO ${poToUpdate.poNumber} telah diubah menjadi ${getPOStatusText(poToUpdate.newStatus)}.` });
      // Refetch data based on current filters (could be date-filtered or default)
      if (startDate && endDate) {
        await fetchPurchaseOrdersWithDateFilters();
      } else {
        await loadDefaultForBranch(selectedBranch.id);
      }
    }
    setIsUpdatingStatus(false);
    setShowConfirmDialog(false);
    setPoToUpdate(null);
  };

  const openConfirmDialog = (poId: string, poNumber: string, newStatus: PurchaseOrderStatus) => {
    setPoToUpdate({ id: poId, newStatus, poNumber });
    setShowConfirmDialog(true);
  };


  const formatDate = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return "N/A";
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return format(date, "dd MMM yyyy");
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return "N/A";
    return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString('id-ID')}`;
  };

  const getPOStatusBadgeVariant = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'ordered': return 'default';
      case 'partially_received': return 'outline';
      case 'fully_received': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };
   const getPOStatusText = (status: PurchaseOrderStatus | undefined) => {
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

  const getPaymentStatusBadgeVariant = (status: PurchaseOrderPaymentStatus | undefined, dueDate?: Timestamp) => {
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    if (!status) return variant;

    if (status === 'paid') { variant = 'default'; }
    else if (status === 'unpaid') { variant = 'destructive'; }
    else if (status === 'partially_paid') { variant = 'outline'; }

    if (dueDate && (status === 'unpaid' || status === 'partially_paid') && isBefore(dueDate.toDate(), startOfDay(new Date()))) {
      variant = 'destructive';
    }
    return variant;
  };

  const getPaymentStatusText = (status: PurchaseOrderPaymentStatus | undefined, dueDate?: Timestamp) => {
    if (!status) return "N/A";
    let text = "";
     switch (status) {
      case 'paid': text = "Lunas"; break;
      case 'unpaid': text = "Belum Bayar"; break;
      case 'partially_paid': text = "Bayar Sebagian"; break;
      case 'overdue': text = "Jatuh Tempo"; break;
      default: text = status.charAt(0).toUpperCase() + status.slice(1);
    }
    if (dueDate && (status === 'unpaid' || status === 'partially_paid') && isBefore(dueDate.toDate(), startOfDay(new Date()))) {
      text = "Jatuh Tempo";
    }
    return text;
  };


  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold font-headline">
              Pesanan Pembelian {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            <Button size="sm" className="rounded-md text-xs h-8" asChild disabled={!selectedBranch}>
              <Link href="/purchase-orders/new">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Buat Pesanan Baru
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-base font-semibold">Filter Pesanan Pembelian</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-end">
                    <div>
                        <Label htmlFor="startDatePO" className="text-xs">Tgl Pesan Mulai</Label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-8 text-xs mt-0.5", !startDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                            {startDate ? format(startDate, "dd MMM yyyy") : <span>Pilih tanggal</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                    <div>
                        <Label htmlFor="endDatePO" className="text-xs">Tgl Pesan Akhir</Label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-8 text-xs mt-0.5", !endDate && "text-muted-foreground")} disabled={!startDate}>
                            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                            {endDate ? format(endDate, "dd MMM yyyy") : <span>Pilih tanggal</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus disabled={startDate ? { before: startDate } : undefined} /></PopoverContent>
                        </Popover>
                    </div>
                     <div>
                        <Label htmlFor="searchTermPO" className="text-xs">Cari PO/Pemasok</Label>
                        <Input id="searchTermPO" placeholder="Ketik..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-8 text-xs mt-0.5"/>
                    </div>
                    <div>
                        <Label htmlFor="statusPoFilter" className="text-xs">Status PO</Label>
                        <Select value={statusPoFilter} onValueChange={(value) => setStatusPoFilter(value as PurchaseOrderStatus | "all")}>
                            <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue placeholder="Semua Status PO" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs">Semua Status PO</SelectItem>
                                {ALL_PO_STATUSES.map(status => (
                                    <SelectItem key={status} value={status} className="text-xs">{getPOStatusText(status)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="paymentStatusPoFilter" className="text-xs">Status Bayar (Kredit)</Label>
                        <Select value={paymentStatusPoFilter} onValueChange={(value) => setPaymentStatusPoFilter(value as PurchaseOrderPaymentStatus | "all")}>
                            <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue placeholder="Semua Status Bayar" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs">Semua Status Bayar</SelectItem>
                                {ALL_PAYMENT_STATUSES.map(status => (
                                     <SelectItem key={status} value={status} className="text-xs">{getPaymentStatusText(status)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                   <div className="flex gap-2 items-end lg:col-start-4 lg:col-span-2">
                        <Button onClick={handleApplyFilters} size="sm" className="h-8 text-xs flex-grow" disabled={loadingPOs || !selectedBranch}>
                            <Filter className="mr-1.5 h-3.5 w-3.5"/> Terapkan
                        </Button>
                         <Button onClick={handleClearFilters} variant="outline" size="sm" className="h-8 text-xs flex-grow" disabled={loadingPOs || !selectedBranch}>
                            <FilterX className="mr-1.5 h-3.5 w-3.5"/> Reset
                        </Button>
                    </div>
                </div>
            </CardContent>
          </Card>

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
          ) : filteredPOs.length === 0 ? (
            <div className="border rounded-lg shadow-sm overflow-hidden p-10 text-center">
              <p className="text-sm text-muted-foreground">
                {allFetchedPOs.length === 0 && !startDate && !endDate ? "Belum ada pesanan pembelian untuk cabang ini." : "Tidak ada pesanan pembelian yang cocok dengan filter Anda."}
              </p>
              {allFetchedPOs.length === 0 && !startDate && !endDate && (
                <Button size="sm" className="mt-4 text-xs" asChild>
                    <Link href="/purchase-orders/new">
                        <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Buat Pesanan Pembelian Pertama
                    </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg shadow-sm overflow-hidden">
              <Table>
                <TableCaption className="text-xs">Daftar pesanan pembelian untuk {selectedBranch?.name || 'cabang terpilih'}.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">No. PO</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Pemasok</TableHead>
                    <TableHead className="text-xs">Tgl Pesan</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Jenis Beli</TableHead>
                    <TableHead className="text-xs text-center">Status PO</TableHead>
                    <TableHead className="text-xs text-center hidden md:table-cell">Status Bayar</TableHead>
                    <TableHead className="text-right text-xs">Total</TableHead>
                    <TableHead className="text-center text-xs w-[80px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPOs.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="py-2 text-xs font-medium">{po.poNumber || po.id.substring(0,6).toUpperCase()}</TableCell>
                      <TableCell className="py-2 text-xs hidden sm:table-cell">{po.supplierName}</TableCell>
                      <TableCell className="py-2 text-xs">{formatDate(po.orderDate)}</TableCell>
                      <TableCell className="py-2 text-xs hidden md:table-cell">{po.isCreditPurchase ? "Kredit" : "Tunai"}</TableCell>
                      <TableCell className="py-2 text-xs text-center">
                        <Badge
                          variant={getPOStatusBadgeVariant(po.status)}
                          className={cn(po.status === 'fully_received' && "bg-green-600 text-white hover:bg-green-700",
                                       po.status === 'ordered' && "bg-blue-500 text-white hover:bg-blue-600",
                                       po.status === 'partially_received' && "bg-yellow-500 text-white hover:bg-yellow-600"
                                      )}
                        >
                            {getPOStatusText(po.status)}
                        </Badge>
                      </TableCell>
                       <TableCell className="py-2 text-xs text-center hidden md:table-cell">
                        {po.isCreditPurchase ? (
                             <Badge variant={getPaymentStatusBadgeVariant(po.paymentStatusOnPO, po.paymentDueDateOnPO)} className={cn(po.paymentStatusOnPO === 'paid' && 'bg-green-600 hover:bg-green-700 text-white', po.paymentStatusOnPO === 'partially_paid' && 'border-yellow-500 text-yellow-600')}>
                                {getPaymentStatusText(po.paymentStatusOnPO, po.paymentDueDateOnPO)}
                             </Badge>
                        ) : (
                            <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-2 text-xs">{formatCurrency(po.totalAmount)}</TableCell>
                      <TableCell className="text-center py-1.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Aksi</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild className="text-xs cursor-pointer">
                              <Link href={`/purchase-orders/${po.id}`}>
                                <Eye className="mr-2 h-3.5 w-3.5" />
                                Lihat Detail
                              </Link>
                            </DropdownMenuItem>
                            {po.status === 'draft' && (
                              <DropdownMenuItem
                                className="text-xs cursor-pointer"
                                onClick={() => openConfirmDialog(po.id, po.poNumber, 'ordered')}
                                disabled={isUpdatingStatus}
                              >
                                <CheckCircle className="mr-2 h-3.5 w-3.5" />
                                Tandai Dipesan
                              </DropdownMenuItem>
                            )}
                            {(po.status === 'draft' || po.status === 'ordered') && (
                              <DropdownMenuItem
                                className="text-xs cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => openConfirmDialog(po.id, po.poNumber, 'cancelled')}
                                disabled={isUpdatingStatus}
                              >
                                <XCircle className="mr-2 h-3.5 w-3.5" />
                                Batalkan Pesanan
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Konfirmasi Perubahan Status PO</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs">
                        Apakah Anda yakin ingin mengubah status untuk PO <strong>{poToUpdate?.poNumber}</strong> menjadi <strong>"{getPOStatusText(poToUpdate?.newStatus)}"</strong>?
                        {poToUpdate?.newStatus === 'ordered' && " Ini menandakan pesanan telah dikirim ke pemasok."}
                        {poToUpdate?.newStatus === 'cancelled' && " Tindakan ini tidak dapat diurungkan."}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="text-xs h-8" onClick={() => {setShowConfirmDialog(false); setPoToUpdate(null);}} disabled={isUpdatingStatus}>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        className={cn("text-xs h-8", poToUpdate?.newStatus === 'cancelled' && "bg-destructive hover:bg-destructive/90")}
                        onClick={handleUpdateStatus}
                        disabled={isUpdatingStatus}
                    >
                        {isUpdatingStatus ? "Memproses..." : `Ya, ${poToUpdate?.newStatus === 'ordered' ? 'Tandai Dipesan' : 'Batalkan PO'}`}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </MainLayout>
    </ProtectedRoute>
  );
}

    
    