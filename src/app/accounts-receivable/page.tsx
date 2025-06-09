
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
import { PlusCircle, Search, Eye, DollarSign, CalendarIcon, Filter, FilterX, Info } from "lucide-react";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Timestamp } from "firebase/firestore";
import { getOutstandingCreditSalesByBranch, recordPaymentForCreditSale, type PosTransaction, type TransactionPayment, type PaymentStatus } from "@/lib/firebase/pos";
import Link from "next/link";
import { format, isBefore, startOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";


const paymentFormSchema = z.object({
  paymentDate: z.date({ required_error: "Tanggal pembayaran harus diisi." }),
  amountPaid: z.coerce.number().positive({ message: "Jumlah bayar harus lebih dari 0." }),
  paymentMethod: z.enum(["cash", "transfer", "card", "other"], { required_error: "Metode pembayaran harus dipilih."}),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export default function AccountsReceivablePage() {
  const { currentUser } = useAuth();
  const { selectedBranch } = useBranch();
  const { toast } = useToast();

  const [receivables, setReceivables] = useState<PosTransaction[]>([]);
  const [filteredReceivables, setFilteredReceivables] = useState<PosTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<PosTransaction | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");


  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      paymentDate: new Date(),
      amountPaid: 0,
      paymentMethod: "cash",
      notes: "",
    },
  });

  const fetchReceivables = useCallback(async () => {
    if (!selectedBranch) {
      setReceivables([]);
      setFilteredReceivables([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const fetchedReceivables = await getOutstandingCreditSalesByBranch(selectedBranch.id);
    setReceivables(fetchedReceivables);
    setLoading(false);
  }, [selectedBranch]);

  useEffect(() => {
    fetchReceivables();
  }, [fetchReceivables]);

  useEffect(() => {
    let filtered = receivables;
    if (statusFilter !== "all") {
      filtered = filtered.filter(r => r.paymentStatus === statusFilter || (statusFilter === 'overdue' && r.creditDueDate && isBefore(r.creditDueDate.toDate(), startOfDay(new Date())) && r.paymentStatus !== 'paid' && r.paymentStatus !== 'returned'));
    }
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.invoiceNumber.toLowerCase().includes(lowerSearchTerm) ||
        r.customerName?.toLowerCase().includes(lowerSearchTerm)
      );
    }
    setFilteredReceivables(filtered);
  }, [receivables, statusFilter, searchTerm]);


  const handleOpenPaymentDialog = (transaction: PosTransaction) => {
    setSelectedTransaction(transaction);
    paymentForm.reset({
      paymentDate: new Date(),
      amountPaid: transaction.outstandingAmount || 0,
      paymentMethod: "cash",
      notes: "",
    });
    setIsPaymentDialogOpen(true);
  };

  const onSubmitPayment: SubmitHandler<PaymentFormValues> = async (values) => {
    if (!selectedTransaction || !currentUser) {
      toast({ title: "Error", description: "Transaksi atau pengguna tidak valid.", variant: "destructive" });
      return;
    }
    if (values.amountPaid > (selectedTransaction.outstandingAmount || 0)) {
        toast({ title: "Jumlah Tidak Valid", description: "Jumlah bayar melebihi sisa tagihan.", variant: "destructive"});
        paymentForm.setError("amountPaid", { type: "manual", message: "Jumlah bayar melebihi sisa tagihan."});
        return;
    }

    const paymentDetails: Omit<TransactionPayment, 'paymentDate'> & { paymentDate: Date, recordedByUserId: string } = {
      amountPaid: values.amountPaid,
      paymentMethod: values.paymentMethod,
      notes: values.notes,
      paymentDate: values.paymentDate,
      recordedByUserId: currentUser.uid,
    };

    const result = await recordPaymentForCreditSale(selectedTransaction.id, paymentDetails);

    if (result && "error" in result) {
      toast({ title: "Gagal Mencatat Pembayaran", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Pembayaran Dicatat", description: `Pembayaran untuk invoice ${selectedTransaction.invoiceNumber} berhasil dicatat.` });
      setIsPaymentDialogOpen(false);
      await fetchReceivables();
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

  const getStatusBadge = (status: PaymentStatus | undefined, dueDate?: Timestamp) => {
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    let text = status ? status.charAt(0).toUpperCase() + status.slice(1) : "N/A";

    if (status === 'paid') { variant = 'default'; text = "Lunas"; }
    else if (status === 'unpaid') { variant = 'destructive'; text = "Belum Lunas"; }
    else if (status === 'partially_paid') { variant = 'outline'; text = "Lunas Sebagian"; }
    else if (status === 'returned') { variant = 'secondary'; text = "Diretur"; }

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
              Piutang Usaha {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
          </div>

          <Card>
            <CardHeader className="p-3 pb-2">
                <CardTitle className="text-base">Filter Piutang</CardTitle>
            </CardHeader>
            <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 items-end">
                 <div>
                    <Label htmlFor="searchTermAR" className="text-xs">Cari Invoice/Pelanggan</Label>
                    <Input
                        id="searchTermAR"
                        type="search"
                        placeholder="Ketik untuk mencari..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-8 text-xs mt-0.5"
                        disabled={!selectedBranch || loading}
                    />
                </div>
                <div>
                    <Label htmlFor="statusFilter" className="text-xs">Status Pembayaran</Label>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PaymentStatus | "all")} disabled={!selectedBranch || loading}>
                        <SelectTrigger className="h-8 text-xs mt-0.5">
                            <SelectValue placeholder="Semua Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs">Semua Status</SelectItem>
                            <SelectItem value="unpaid" className="text-xs">Belum Lunas</SelectItem>
                            <SelectItem value="partially_paid" className="text-xs">Lunas Sebagian</SelectItem>
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
                <p className="text-sm text-muted-foreground">Pilih cabang untuk mengelola piutang.</p>
            </div>
          ) : filteredReceivables.length === 0 ? (
            <div className="border rounded-lg shadow-sm overflow-hidden p-10 text-center">
              <p className="text-sm text-muted-foreground">
                {receivables.length === 0 ? "Belum ada data piutang untuk cabang ini." : "Tidak ada piutang yang cocok dengan filter Anda."}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg shadow-sm overflow-hidden">
              <Table>
                <TableCaption className="text-xs">Daftar piutang usaha untuk {selectedBranch?.name || 'cabang terpilih'}.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">No. Invoice</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Pelanggan</TableHead>
                    <TableHead className="text-xs">Tgl Transaksi</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Jatuh Tempo</TableHead>
                    <TableHead className="text-xs text-right">Total Tagihan</TableHead>
                    <TableHead className="text-xs text-right">Sisa Tagihan</TableHead>
                    <TableHead className="text-xs text-center">Status</TableHead>
                    <TableHead className="text-center text-xs">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceivables.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="py-2 text-xs font-medium">{tx.invoiceNumber}</TableCell>
                      <TableCell className="py-2 text-xs hidden sm:table-cell">{tx.customerName || "-"}</TableCell>
                      <TableCell className="py-2 text-xs">{formatDate(tx.timestamp)}</TableCell>
                      <TableCell className="py-2 text-xs hidden md:table-cell">{tx.creditDueDate ? formatDate(tx.creditDueDate) : "-"}</TableCell>
                      <TableCell className="text-right py-2 text-xs">{formatCurrency(tx.totalAmount)}</TableCell>
                      <TableCell className="text-right py-2 text-xs font-semibold">{formatCurrency(tx.outstandingAmount)}</TableCell>
                      <TableCell className="text-center py-2 text-xs">{getStatusBadge(tx.paymentStatus, tx.creditDueDate)}</TableCell>
                      <TableCell className="text-center py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs mr-1"
                          onClick={() => handleOpenPaymentDialog(tx)}
                          disabled={tx.paymentStatus === 'paid' || tx.paymentStatus === 'returned'}
                        >
                          <DollarSign className="mr-1 h-3 w-3" /> Bayar
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                           <Link href={`/invoice/${tx.id}/view`} target="_blank"><Eye className="h-3.5 w-3.5" /><span className="sr-only">Lihat Invoice</span></Link>
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
              <DialogTitle className="text-base">Catat Pembayaran Piutang</DialogTitle>
              <DialogDescription className="text-xs">
                Invoice: {selectedTransaction?.invoiceNumber} <br/>
                Pelanggan: {selectedTransaction?.customerName || "-"} <br />
                Sisa Tagihan: <span className="font-semibold">{formatCurrency(selectedTransaction?.outstandingAmount)}</span>
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={paymentForm.handleSubmit(onSubmitPayment)} className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <Label htmlFor="paymentDate" className="text-xs">Tanggal Pembayaran*</Label>
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
                <Label htmlFor="amountPaid" className="text-xs">Jumlah Dibayar* ({selectedBranch?.currency || 'Rp'})</Label>
                <Input id="amountPaid" type="number" {...paymentForm.register("amountPaid")} className="h-9 text-xs mt-1" placeholder="0"/>
                {paymentForm.formState.errors.amountPaid && <p className="text-xs text-destructive mt-1">{paymentForm.formState.errors.amountPaid.message}</p>}
              </div>
              <div>
                <Label htmlFor="paymentMethod" className="text-xs">Metode Pembayaran*</Label>
                 <Controller
                  name="paymentMethod"
                  control={paymentForm.control}
                  render={({ field }) => (
                     <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="h-9 text-xs mt-1"><SelectValue placeholder="Pilih metode" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash" className="text-xs">Tunai</SelectItem>
                        <SelectItem value="transfer" className="text-xs">Transfer Bank</SelectItem>
                        <SelectItem value="card" className="text-xs">Kartu Debit/Kredit</SelectItem>
                        <SelectItem value="other" className="text-xs">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {paymentForm.formState.errors.paymentMethod && <p className="text-xs text-destructive mt-1">{paymentForm.formState.errors.paymentMethod.message}</p>}
              </div>
              <div>
                <Label htmlFor="notes" className="text-xs">Catatan (Opsional)</Label>
                <Textarea id="notes" {...paymentForm.register("notes")} className="text-xs mt-1 min-h-[60px]" placeholder="Catatan tambahan..."/>
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
            {selectedTransaction && selectedTransaction.paymentsMade && selectedTransaction.paymentsMade.length > 0 && (
                <div className="mt-4 pt-3 border-t">
                    <h4 className="text-sm font-medium mb-1.5">Riwayat Pembayaran Invoice Ini:</h4>
                    <ScrollArea className="h-32">
                        <ul className="space-y-1.5 text-xs">
                            {selectedTransaction.paymentsMade.map((pmt, idx) => (
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
