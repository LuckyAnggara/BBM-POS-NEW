
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { getTransactionsForUserByBranch, processFullTransactionReturn, deleteTransaction as apiDeleteTransaction, type PosTransaction } from "@/lib/firebase/pos"; // Updated import
import { createDeletionRequest, type TransactionDeletionRequestInput } from "@/lib/firebase/deletionRequests";
import { Timestamp } from "firebase/firestore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, RotateCcw, CheckCircle, XCircle, Trash2, CalendarIcon, Search, FilterX, MoreHorizontal, Send } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog,DialogFooter, DialogContent, DialogHeader, DialogTitle as DialogModalTitle, DialogFooter as DialogModalFooter, DialogClose, DialogDescription as DialogModalDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isValid, parseISO } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export default function SalesHistoryPage() {
  const { currentUser, userData } = useAuth();
  const { selectedBranch } = useBranch();
  const { toast } = useToast();

  const [allFetchedTransactions, setAllFetchedTransactions] = useState<PosTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<PosTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");

  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [transactionToReturn, setTransactionToReturn] = useState<PosTransaction | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<PosTransaction | null>(null);
  const [deletePasswordInput, setDeletePasswordInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [showRequestDeletionDialog, setShowRequestDeletionDialog] = useState(false);
  const [deletionRequestReason, setDeletionRequestReason] = useState("");
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);


  const fetchTransactions = useCallback(async () => {
    if (currentUser && selectedBranch && startDate && endDate) {
      if (endDate < startDate) {
        toast({ title: "Rentang Tanggal Tidak Valid", description: "Tanggal akhir tidak boleh sebelum tanggal mulai.", variant: "destructive" });
        setAllFetchedTransactions([]);
        setFilteredTransactions([]);
        return;
      }
      setLoading(true);
      const fetchedTransactions = await getTransactionsForUserByBranch(
        currentUser.uid,
        selectedBranch.id,
        { startDate, endDate, orderByField: "timestamp", orderDirection: "desc" }
      );
      setAllFetchedTransactions(fetchedTransactions);
      setFilteredTransactions(fetchedTransactions); 
      setLoading(false);
      if(fetchedTransactions.length === 0){
        toast({title: "Tidak Ada Transaksi", description: "Tidak ada transaksi ditemukan untuk rentang tanggal yang dipilih.", variant: "default"});
      }
    } else {
      setAllFetchedTransactions([]);
      setFilteredTransactions([]);
      setLoading(false);
    }
  }, [currentUser, selectedBranch, startDate, endDate, toast]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTransactions(allFetchedTransactions);
      return;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    const searchResults = allFetchedTransactions.filter(tx => 
      (tx.invoiceNumber && tx.invoiceNumber.toLowerCase().includes(lowerSearchTerm)) ||
      (tx.customerName && tx.customerName.toLowerCase().includes(lowerSearchTerm))
    );
    setFilteredTransactions(searchResults);
  }, [searchTerm, allFetchedTransactions]);

  const handleSearchAndFilter = () => {
    if (!startDate || !endDate) {
      toast({ title: "Pilih Rentang Tanggal", description: "Silakan pilih tanggal mulai dan akhir terlebih dahulu.", variant: "destructive" });
      return;
    }
    fetchTransactions();
  };

  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSearchTerm("");
    setAllFetchedTransactions([]);
    setFilteredTransactions([]);
  };

  const formatDateDisplay = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return "N/A";
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp.toDate());
  };

  const formatCurrency = (amount: number) => {
    return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString('id-ID')}`;
  };

  const handleOpenReturnDialog = (transaction: PosTransaction) => {
    setTransactionToReturn(transaction);
    setReturnReason("");
    setShowReturnDialog(true);
  };

  const handleProcessReturn = async () => {
    if (!transactionToReturn || !currentUser) {
      toast({ title: "Error", description: "Transaksi atau pengguna tidak valid untuk retur.", variant: "destructive" });
      return;
    }
    if (!returnReason.trim()) {
      toast({ title: "Alasan Diperlukan", description: "Silakan masukkan alasan retur.", variant: "destructive" });
      return;
    }

    setIsProcessingReturn(true);
    const result = await processFullTransactionReturn(transactionToReturn.id, returnReason, currentUser.uid);
    setIsProcessingReturn(false);

    if (result && "error" in result) {
      toast({ title: "Gagal Memproses Retur", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Retur Berhasil", description: `Transaksi ${transactionToReturn.invoiceNumber} telah diretur.` });
      setShowReturnDialog(false);
      setTransactionToReturn(null);
      setReturnReason("");
      await fetchTransactions(); 
    }
  };
  
  const handleOpenDeleteAction = (tx: PosTransaction) => {
    setTransactionToDelete(tx);
    if (userData?.role === 'admin') {
      setDeletePasswordInput("");
      setShowDeleteDialog(true);
    } else {
      setDeletionRequestReason("");
      setShowRequestDeletionDialog(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete || !selectedBranch) {
        toast({ title: "Error", description: "Transaksi atau cabang tidak valid untuk dihapus.", variant: "destructive"});
        return;
    }
    if (!selectedBranch.transactionDeletionPassword) {
        toast({ title: "Password Belum Diatur", description: "Password hapus transaksi belum diatur untuk cabang ini. Hubungi admin.", variant: "destructive"});
        setShowDeleteDialog(false);
        return;
    }
    if (!deletePasswordInput) {
        toast({ title: "Password Diperlukan", description: "Silakan masukkan password hapus transaksi.", variant: "destructive"});
        return;
    }

    setIsDeleting(true);
    const result = await apiDeleteTransaction(transactionToDelete.id, selectedBranch.id, deletePasswordInput);
    setIsDeleting(false);

    if (result.success) {
        toast({ title: "Transaksi Dihapus", description: "Transaksi berhasil dihapus dan stok dikembalikan."});
        setShowDeleteDialog(false);
        setTransactionToDelete(null);
        await fetchTransactions(); 
    } else {
        toast({ title: "Gagal Menghapus", description: result.error || "Terjadi kesalahan saat menghapus transaksi.", variant: "destructive"});
    }
  };

  const handleConfirmRequestDeletion = async () => {
    if (!transactionToDelete || !currentUser || !userData || !selectedBranch) {
      toast({ title: "Error", description: "Data tidak lengkap untuk mengajukan permintaan.", variant: "destructive" });
      return;
    }
    if (!deletionRequestReason.trim()) {
      toast({ title: "Alasan Diperlukan", description: "Mohon isi alasan mengapa transaksi ini perlu dihapus.", variant: "destructive" });
      return;
    }
    setIsRequestingDeletion(true);
    const requestInput: TransactionDeletionRequestInput = {
      transactionId: transactionToDelete.id,
      transactionInvoiceNumber: transactionToDelete.invoiceNumber,
      transactionDate: transactionToDelete.timestamp.toDate(), // Convert Timestamp to Date
      transactionTotalAmount: transactionToDelete.totalAmount,
      branchId: selectedBranch.id,
      requestedByUserId: currentUser.uid,
      requestedByUserName: userData.name,
      reason: deletionRequestReason,
    };
    const result = await createDeletionRequest(requestInput);
    setIsRequestingDeletion(false);

    if ("error" in result) {
      toast({ title: "Gagal Mengajukan", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Permintaan Terkirim", description: "Permintaan penghapusan transaksi telah dikirim ke admin." });
      setShowRequestDeletionDialog(false);
      setTransactionToDelete(null);
      setDeletionRequestReason("");
    }
  };


  const getStatusChip = (status: 'completed' | 'returned' | undefined) => {
    if (status === 'returned') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle className="mr-1 h-3 w-3" /> Diretur
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle className="mr-1 h-3 w-3" /> Selesai
      </span>
    );
  };


  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-4">
          <h1 className="text-xl md:text-2xl font-semibold font-headline">
            Riwayat Penjualan {selectedBranch ? `- ${selectedBranch.name}` : ""}
          </h1>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Filter Transaksi</CardTitle>
              <CardDescription className="text-xs">Pilih rentang tanggal dan cari untuk menampilkan transaksi.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 items-end">
                    <div>
                        <Label htmlFor="startDate" className="text-xs">Tanggal Mulai</Label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={"outline"}
                            className={cn("w-full justify-start text-left font-normal h-9 text-xs mt-1", !startDate && "text-muted-foreground")}
                            >
                            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                            {startDate ? format(startDate, "dd MMM yyyy") : <span>Pilih tanggal</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                        </PopoverContent>
                        </Popover>
                    </div>
                    <div>
                        <Label htmlFor="endDate" className="text-xs">Tanggal Akhir</Label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={"outline"}
                            className={cn("w-full justify-start text-left font-normal h-9 text-xs mt-1", !endDate && "text-muted-foreground")}
                            disabled={!startDate}
                            >
                            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                            {endDate ? format(endDate, "dd MMM yyyy") : <span>Pilih tanggal</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus disabled={{ before: startDate }} />
                        </PopoverContent>
                        </Popover>
                    </div>
                    <div className="lg:col-span-1">
                        <Label htmlFor="searchTerm" className="text-xs">Cari Invoice/Pelanggan</Label>
                        <Input 
                            id="searchTerm" 
                            placeholder="Nomor invoice atau nama..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-9 text-xs mt-1"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleSearchAndFilter} size="sm" className="h-9 text-xs flex-grow sm:flex-grow-0" disabled={loading || !selectedBranch}>
                            <Search className="mr-1.5 h-3.5 w-3.5"/> Terapkan
                        </Button>
                         <Button onClick={handleClearFilters} variant="outline" size="sm" className="h-9 text-xs flex-grow sm:flex-grow-0" disabled={loading}>
                            <FilterX className="mr-1.5 h-3.5 w-3.5"/> Reset
                        </Button>
                    </div>
                </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Daftar Transaksi</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !startDate || !endDate ? (
                <p className="text-sm text-muted-foreground text-center py-8">Silakan pilih rentang tanggal dan klik "Terapkan" untuk melihat riwayat penjualan.</p>
              ) : filteredTransactions.length === 0 && allFetchedTransactions.length > 0 ? (
                 <p className="text-sm text-muted-foreground text-center py-8">Tidak ada transaksi yang cocok dengan pencarian Anda untuk rentang tanggal yang dipilih.</p>
              ) : filteredTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Belum ada riwayat penjualan untuk filter yang dipilih.</p>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">No. Invoice</TableHead>
                        <TableHead className="text-xs">Tanggal</TableHead>
                        <TableHead className="text-xs hidden md:table-cell">Pelanggan</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">Metode Bayar</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                        <TableHead className="text-xs text-center">Status</TableHead>
                        <TableHead className="text-xs text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((tx) => (
                        <TableRow key={tx.id} className={cn(tx.status === 'returned' && "bg-muted/50 hover:bg-muted/60")}>
                          <TableCell className="text-xs font-medium py-2">{tx.invoiceNumber || tx.id.substring(0, 8).toUpperCase()}</TableCell>
                          <TableCell className="text-xs py-2">{formatDateDisplay(tx.timestamp)}</TableCell>
                          <TableCell className="text-xs hidden md:table-cell py-2">{tx.customerName || "-"}</TableCell>
                          <TableCell className="text-xs capitalize hidden sm:table-cell py-2">{tx.paymentTerms}</TableCell>
                          <TableCell className="text-xs text-right py-2">{formatCurrency(tx.totalAmount)}</TableCell>
                          <TableCell className="text-xs text-center py-2">
                            {getStatusChip(tx.status)}
                            {tx.status === 'returned' && tx.returnReason && (
                                <p className="text-xs text-muted-foreground italic mt-0.5 max-w-[150px] truncate" title={tx.returnReason}>Alasan: {tx.returnReason}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-center py-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Aksi</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild className="text-xs cursor-pointer">
                                  <Link href={`/invoice/${tx.id}/view`} target="_blank" rel="noopener noreferrer">
                                    <Printer className="mr-2 h-3.5 w-3.5" />
                                    Lihat Invoice
                                  </Link>
                                </DropdownMenuItem>
                                {tx.status !== 'returned' && (
                                  <DropdownMenuItem
                                    className="text-xs cursor-pointer text-amber-700 focus:bg-amber-50 focus:text-amber-800"
                                    onClick={() => handleOpenReturnDialog(tx)}
                                  >
                                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                                    Proses Retur
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-xs cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                  onClick={() => handleOpenDeleteAction(tx)}
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  {userData?.role === 'admin' ? "Hapus Transaksi" : "Ajukan Hapus"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <AlertDialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Proses Retur Transaksi</AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                Anda akan memproses retur untuk invoice <strong>{transactionToReturn?.invoiceNumber}</strong>. Stok barang akan dikembalikan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2 space-y-2">
              <Label htmlFor="returnReason" className="text-xs">Alasan Retur (Wajib)</Label>
              <Input
                id="returnReason"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Contoh: Barang rusak, Salah ukuran, dll."
                className="text-xs h-9"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel className="text-xs h-8" onClick={() => { setShowReturnDialog(false); setTransactionToReturn(null); }}>Batal</AlertDialogCancel>
              <AlertDialogAction
                className="text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleProcessReturn}
                disabled={isProcessingReturn || !returnReason.trim()}
              >
                {isProcessingReturn ? "Memproses..." : "Ya, Proses Retur"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {userData?.role === 'admin' && (
          <AlertDialog open={showDeleteDialog} onOpenChange={(open) => { if (!open) setTransactionToDelete(null); setShowDeleteDialog(open);}}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus Transaksi</AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  Anda akan menghapus invoice <strong>{transactionToDelete?.invoiceNumber}</strong> secara permanen. 
                  Stok akan dikembalikan jika transaksi belum diretur. Tindakan ini tidak dapat dibatalkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-2 space-y-2">
                <Label htmlFor="deletePasswordInput" className="text-xs">Password Hapus Transaksi</Label>
                <Input
                  id="deletePasswordInput"
                  type="password"
                  value={deletePasswordInput}
                  onChange={(e) => setDeletePasswordInput(e.target.value)}
                  placeholder="Masukkan password"
                  className="text-xs h-9"
                />
                <p className="text-xs text-muted-foreground">Password ini diatur oleh admin per cabang.</p>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-xs h-8" onClick={() => { setShowDeleteDialog(false); setTransactionToDelete(null); }}>Batal</AlertDialogCancel>
                <AlertDialogAction
                  className="text-xs h-8" 
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting || !deletePasswordInput.trim()}
                >
                  {isDeleting ? "Menghapus..." : "Ya, Hapus Transaksi"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {userData?.role === 'cashier' && (
          <Dialog open={showRequestDeletionDialog} onOpenChange={(open) => { if (!open) setTransactionToDelete(null); setShowRequestDeletionDialog(open);}}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogModalTitle className="text-base">Ajukan Permintaan Hapus Transaksi</DialogModalTitle>
                <DialogModalDescription className="text-xs">
                  Permintaan akan dikirim ke Admin untuk invoice: <strong>{transactionToDelete?.invoiceNumber}</strong>.
                </DialogModalDescription>
              </DialogHeader>
              <div className="py-3 space-y-2">
                <Label htmlFor="deletionRequestReason" className="text-xs">Alasan Permintaan Penghapusan (Wajib)</Label>
                <Textarea
                  id="deletionRequestReason"
                  value={deletionRequestReason}
                  onChange={(e) => setDeletionRequestReason(e.target.value)}
                  placeholder="Jelaskan mengapa transaksi ini perlu dihapus..."
                  className="text-xs min-h-[80px]"
                />
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline" className="text-xs h-8">Batal</Button></DialogClose>
                <Button onClick={handleConfirmRequestDeletion} className="text-xs h-8" disabled={isRequestingDeletion || !deletionRequestReason.trim()}>
                   {isRequestingDeletion ? "Mengirim..." : <><Send className="mr-1.5 h-3.5 w-3.5"/> Kirim Permintaan</>}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </MainLayout>
    </ProtectedRoute>
  );
}
