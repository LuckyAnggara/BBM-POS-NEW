
"use client";

import React, { useState, useEffect, useCallback } from "react";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PlusCircle, Search, Eye, DollarSign, CalendarIcon, FilterX, Info } from "lucide-react";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Timestamp } from "firebase/firestore";
import { getOutstandingPurchaseOrdersByBranch, recordPaymentToSupplier, type PurchaseOrder, type PaymentToSupplier, type PurchaseOrderPaymentStatus } from "@/lib/firebase/purchaseOrders";
import Link from "next/link";
import { format, isBefore, startOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription as CardDesc, CardHeader, CardTitle as CardTtl, CardFooter as CardFtr } from "@/components/ui/card"; // Aliased to avoid conflict

const paymentToSupplierFormSchema = z.object({
  paymentDate: z.date({ required_error: "Tanggal pembayaran harus diisi." }),
  amountPaid: z.coerce.number().positive({ message: "Jumlah bayar harus lebih dari 0." }),
  paymentMethod: z.enum(["cash", "transfer", "card", "other"], { required_error: "Metode pembayaran harus dipilih."}),
  notes: z.string().optional(),
});

type PaymentToSupplierFormValues = z.infer<typeof paymentToSupplierFormSchema>;

export default function AccountsPayablePage() {
  const { currentUser } = useAuth();
  const { selectedBranch } = useBranch();
  const { toast } = useToast();

  const [payables, setPayables] = useState<PurchaseOrder[]>([]);
  const [filteredPayables, setFilteredPayables] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderPaymentStatus | "all">("all");

  const paymentForm = useForm<PaymentToSupplierFormValues>({
    resolver: zodResolver(paymentToSupplierFormSchema),
    defaultValues: {
      paymentDate: new Date(),
      amountPaid: 0,
      paymentMethod: "transfer",
      notes: "",
    },
  });

  const fetchPayables = useCallback(async () => {
    if (!selectedBranch) {
      setPayables([]);
      setFilteredPayables([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const fetchedPayables = await getOutstandingPurchaseOrdersByBranch(selectedBranch.id);
    setPayables(fetchedPayables);
    setLoading(false);
  }, [selectedBranch]);

  useEffect(() => {
    fetchPayables();
  }, [fetchPayables]);

  useEffect(() => {
    let filtered = payables;
    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.paymentStatusOnPO === statusFilter || (statusFilter === 'overdue' && p.paymentDueDateOnPO && isBefore(p.paymentDueDateOnPO.toDate(), startOfDay(new Date())) && p.paymentStatusOnPO !== 'paid'));
    }
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.poNumber.toLowerCase().includes(lowerSearchTerm) ||
        p.supplierName.toLowerCase().includes(lowerSearchTerm) ||
        p.supplierInvoiceNumber?.toLowerCase().includes(lowerSearchTerm)
      );
    }
    setFilteredPayables(filtered);
  }, [payables, statusFilter, searchTerm]);

  const handleOpenPaymentDialog = (po: PurchaseOrder) => {
    setSelectedPO(po);
    paymentForm.reset({
      paymentDate: new Date(),
      amountPaid: po.outstandingPOAmount || 0,
      paymentMethod: "transfer",
      notes: "",
    });
    setIsPaymentDialogOpen(true);
  };

  const onSubmitPayment: SubmitHandler<PaymentToSupplierFormValues> = async (values) => {
    if (!selectedPO || !currentUser) {
      toast({ title: "Error", description: "Pesanan Pembelian atau pengguna tidak valid.", variant: "destructive" });
      return;
    }
    if (values.amountPaid > (selectedPO.outstandingPOAmount || 0)) {
        toast({ title: "Jumlah Tidak Valid", description: "Jumlah bayar melebihi sisa tagihan.", variant: "destructive"});
        paymentForm.setError("amountPaid", { type: "manual", message: "Jumlah bayar melebihi sisa tagihan."});
        return;
    }

    const paymentDetails: Omit<PaymentToSupplier, 'paymentDate'> & { paymentDate: Date, recordedByUserId: string } = {
      amountPaid: values.amountPaid,
      paymentMethod: values.paymentMethod,
      notes: values.notes,
      paymentDate: values.paymentDate,
      recordedByUserId: currentUser.uid,
    };

    const result = await recordPaymentToSupplier(selectedPO.id, paymentDetails);

    if (result && "error" in result) {
      toast({ title: "Gagal Mencatat Pembayaran", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Pembayaran Dicatat", description: `Pembayaran untuk PO ${selectedPO.poNumber} berhasil dicatat.` });
      setIsPaymentDialogOpen(false);
      await fetchPayables();
    }
  };

  const formatDate = (timestamp: Timestamp | undefined, includeTime = false) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate();
    return format(date, includeTime ? "dd MMM yyyy, HH:mm" : "dd MMM yyyy");
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return "N/A";
    return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString('id-ID')}`;
  };

  const getStatusBadge = (status: PurchaseOrderPaymentStatus | undefined, dueDate?: Timestamp) => {
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    let text = status ? status.charAt(0).toUpperCase() + status.slice(1) : "N/A";

    if (status === 'paid') { variant = 'default'; text = "Lunas"; }
    else if (status === 'unpaid') { variant = 'destructive'; text = "Belum Bayar"; }
    else if (status === 'partially_paid') { variant = 'outline'; text = "Bayar Sebagian"; }

    if (dueDate && (status === 'unpaid' || status === 'partially_paid') && isBefore(dueDate.toDate(), startOfDay(new Date()))) {
      variant = 'destructive';
      text = "Jatuh Tempo";
    }
    return <Badge variant={variant} className={cn(variant === 'default' && 'bg-green-600 hover:bg-green-700 text-white', variant === 'outline' && 'border-yellow-500 text-yellow-600')}>{text}</Badge>;
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold font-headline">
              Utang Usaha {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
          </div>

          <Card>
            <CardHeader className="p-3 pb-2">
                <CardTtl className="text-base">Filter Utang</CardTtl>
            </CardHeader>
            <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 items-end">
                 <div>
                    <Label htmlFor="searchTermAP" className="text-xs">Cari PO/Pemasok/Inv. Pemasok</Label>
                    <Input
                        id="searchTermAP"
                        type="search"
                        placeholder="Ketik untuk mencari..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-8 text-xs mt-0.5"
                        disabled={!selectedBranch || loading}
                    />
                </div>
                <div>
                    <Label htmlFor="statusFilterAP" className="text-xs">Status Pembayaran</Label>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PurchaseOrderPaymentStatus | "all")} disabled={!selectedBranch || loading}>
                        <SelectTrigger className="h-8 text-xs mt-0.5">
                            <SelectValue placeholder="Semua Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs">Semua Status</SelectItem>
                            <SelectItem value="unpaid" className="text-xs">Belum Bayar</SelectItem>
                            <SelectItem value="partially_paid" className="text-xs">Bayar Sebagian</SelectItem>
                            <SelectItem value="paid" className="text-xs">Lunas</SelectItem>
                            <SelectItem value="overdue" className="text-xs">Jatuh Tempo</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={() => {setSearchTerm(""); setStatusFilter("all");}} variant="outline" size="sm" className="h-8 text-xs">
                    <FilterX className="mr-1.5 h-3.5 w-3.5"/> Reset Filter
                </Button>
            </CardContent>
          </Card>


          {loading ? (
             <div className="space-y-2 border rounded-lg shadow-sm p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
          ) : !selectedBranch ? (
            <div className="border rounded-lg shadow-sm overflow-hidden p-10 text-center">
                <p className="text-sm text-muted-foreground">Pilih cabang untuk mengelola utang usaha.</p>
            </div>
          ) : filteredPayables.length === 0 ? (
            <div className="border rounded-lg shadow-sm overflow-hidden p-10 text-center">
              <p className="text-sm text-muted-foreground">
                {payables.length === 0 ? "Belum ada data utang untuk cabang ini." : "Tidak ada utang yang cocok dengan filter Anda."}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg shadow-sm overflow-hidden">
              <Table>
                <TableCaption className="text-xs">Daftar utang usaha untuk {selectedBranch?.name || 'cabang terpilih'}.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">No. PO</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Pemasok</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Tgl. PO</TableHead>
                    <TableHead className="text-xs">Jatuh Tempo</TableHead>
                    <TableHead className="text-xs text-right">Total Tagihan</TableHead>
                    <TableHead className="text-xs text-right">Sisa Tagihan</TableHead>
                    <TableHead className="text-xs text-center">Status</TableHead>
                    <TableHead className="text-center text-xs">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayables.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="py-2 text-xs font-medium">{po.poNumber}</TableCell>
                      <TableCell className="py-2 text-xs hidden sm:table-cell">{po.supplierName || "-"}</TableCell>
                      <TableCell className="py-2 text-xs hidden md:table-cell">{formatDate(po.orderDate)}</TableCell>
                      <TableCell className="py-2 text-xs">{po.paymentDueDateOnPO ? formatDate(po.paymentDueDateOnPO) : "-"}</TableCell>
                      <TableCell className="text-right py-2 text-xs">{formatCurrency(po.totalAmount)}</TableCell>
                      <TableCell className="text-right py-2 text-xs font-semibold">{formatCurrency(po.outstandingPOAmount)}</TableCell>
                      <TableCell className="text-center py-2 text-xs">{getStatusBadge(po.paymentStatusOnPO, po.paymentDueDateOnPO)}</TableCell>
                      <TableCell className="text-center py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs mr-1"
                          onClick={() => handleOpenPaymentDialog(po)}
                          disabled={po.paymentStatusOnPO === 'paid'}
                        >
                          <DollarSign className="mr-1 h-3 w-3" /> Bayar
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                           <Link href={`/purchase-orders/${po.id}`} target="_blank"><Eye className="h-3.5 w-3.5" /><span className="sr-only">Lihat PO</span></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Catat Pembayaran Utang</DialogTitle>
              <DialogDescription className="text-xs">
                PO: {selectedPO?.poNumber} <br/>
                Pemasok: {selectedPO?.supplierName || "-"} <br />
                Sisa Tagihan: <span className="font-semibold">{formatCurrency(selectedPO?.outstandingPOAmount)}</span>
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={paymentForm.handleSubmit(onSubmitPayment)} className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <Label htmlFor="paymentDateAP" className="text-xs">Tanggal Pembayaran*</Label>
                <Controller
                  name="paymentDate"
                  control={paymentForm.control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant={"outline"} className="w-full justify-start text-left font-normal h-9 text-xs mt-1">
                          <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                          {field.value ? format(field.value, "dd MMM yyyy") : <span>Pilih tanggal</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={(date) => date > new Date()} /></PopoverContent>
                    </Popover>
                  )}
                />
                {paymentForm.formState.errors.paymentDate && <p className="text-xs text-destructive mt-1">{paymentForm.formState.errors.paymentDate.message}</p>}
              </div>
              <div>
                <Label htmlFor="amountPaidAP" className="text-xs">Jumlah Dibayar* ({selectedBranch?.currency || 'Rp'})</Label>
                <Input id="amountPaidAP" type="number" {...paymentForm.register("amountPaid")} className="h-9 text-xs mt-1" placeholder="0"/>
                {paymentForm.formState.errors.amountPaid && <p className="text-xs text-destructive mt-1">{paymentForm.formState.errors.amountPaid.message}</p>}
              </div>
              <div>
                <Label htmlFor="paymentMethodAP" className="text-xs">Metode Pembayaran*</Label>
                 <Controller
                  name="paymentMethod"
                  control={paymentForm.control}
                  render={({ field }) => (
                     <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="h-9 text-xs mt-1"><SelectValue placeholder="Pilih metode" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash" className="text-xs">Tunai</SelectItem>
                        <SelectItem value="transfer" className="text-xs">Transfer Bank</SelectItem>
                        <SelectItem value="card" className="text-xs">Kartu</SelectItem> {/* Maybe not common for AP but for consistency */}
                        <SelectItem value="other" className="text-xs">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {paymentForm.formState.errors.paymentMethod && <p className="text-xs text-destructive mt-1">{paymentForm.formState.errors.paymentMethod.message}</p>}
              </div>
              <div>
                <Label htmlFor="notesAP" className="text-xs">Catatan (Opsional)</Label>
                <Textarea id="notesAP" {...paymentForm.register("notes")} className="text-xs mt-1 min-h-[60px]" placeholder="Catatan tambahan..."/>
              </div>
               <DialogFooter className="pt-3">
                 <DialogClose asChild>
                    <Button type="button" variant="outline" className="text-xs h-8">Batal</Button>
                  </DialogClose>
                <Button type="submit" className="text-xs h-8" disabled={paymentForm.formState.isSubmitting}>
                  {paymentForm.formState.isSubmitting ? "Menyimpan..." : "Simpan Pembayaran"}
                </Button>
              </DialogFooter>
            </form>
            {selectedPO && selectedPO.paymentsMadeToSupplier && selectedPO.paymentsMadeToSupplier.length > 0 && (
                <div className="mt-4 pt-3 border-t">
                    <h4 className="text-sm font-medium mb-1.5">Riwayat Pembayaran PO Ini:</h4>
                    <ScrollArea className="h-32">
                        <ul className="space-y-1.5 text-xs">
                            {selectedPO.paymentsMadeToSupplier.map((pmt, idx) => (
                                <li key={idx} className="p-1.5 bg-muted/50 rounded-md">
                                    <p><strong>Tgl:</strong> {formatDate(pmt.paymentDate, true)} - <strong>{formatCurrency(pmt.amountPaid)}</strong> ({pmt.paymentMethod})</p>
                                    {pmt.notes && <p className="text-muted-foreground italic text-[0.7rem]">Catatan: {pmt.notes}</p>}
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                </div>
            )}
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  );
}

    