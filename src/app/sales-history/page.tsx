
"use client";

import React, { useEffect, useState, useCallback } from "react";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { getTransactionsForUserByBranch, processFullTransactionReturn, type PosTransaction } from "@/lib/firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, RotateCcw, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function SalesHistoryPage() {
  const { currentUser } = useAuth();
  const { selectedBranch } = useBranch();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<PosTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [transactionToReturn, setTransactionToReturn] = useState<PosTransaction | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (currentUser && selectedBranch) {
      setLoading(true);
      const fetchedTransactions = await getTransactionsForUserByBranch(
        currentUser.uid,
        selectedBranch.id,
        { limit: 50, orderByField: "timestamp", orderDirection: "desc" }
      );
      setTransactions(fetchedTransactions);
      setLoading(false);
    } else {
      setTransactions([]);
      setLoading(false);
    }
  }, [currentUser, selectedBranch]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const formatDate = (timestamp: Timestamp | undefined) => {
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
      await fetchTransactions(); // Refresh list
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
              <CardTitle className="text-base font-semibold">Daftar Transaksi</CardTitle>
              <CardDescription className="text-xs">Menampilkan 50 transaksi terakhir Anda di cabang ini.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Belum ada riwayat penjualan di cabang ini.</p>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">No. Invoice</TableHead>
                        <TableHead className="text-xs">Tanggal</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">Metode Bayar</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                        <TableHead className="text-xs text-center">Status</TableHead>
                        <TableHead className="text-xs text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id} className={cn(tx.status === 'returned' && "bg-muted/50 hover:bg-muted/60")}>
                          <TableCell className="text-xs font-medium py-2">{tx.invoiceNumber || tx.id.substring(0, 8).toUpperCase()}</TableCell>
                          <TableCell className="text-xs py-2">{formatDate(tx.timestamp)}</TableCell>
                          <TableCell className="text-xs capitalize hidden sm:table-cell py-2">{tx.paymentMethod}</TableCell>
                          <TableCell className="text-xs text-right py-2">{formatCurrency(tx.totalAmount)}</TableCell>
                          <TableCell className="text-xs text-center py-2">
                            {getStatusChip(tx.status)}
                            {tx.status === 'returned' && tx.returnReason && (
                                <p className="text-xs text-muted-foreground italic mt-0.5">Alasan: {tx.returnReason}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-center py-2 space-x-1">
                            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                              <Link href={`/invoice/${tx.id}/view`} target="_blank">
                                <Printer className="mr-1.5 h-3.5 w-3.5" /> Invoice
                              </Link>
                            </Button>
                            {tx.status === 'completed' && (
                              <Button variant="outline" size="sm" className="h-7 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 hover:text-amber-800" onClick={() => handleOpenReturnDialog(tx)}>
                                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Retur
                              </Button>
                            )}
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
                Anda akan memproses retur untuk invoice <strong>{transactionToReturn?.invoiceNumber}</strong>.
                Stok barang akan dikembalikan ke inventaris.
                Pastikan Anda telah memproses pengembalian dana ke pelanggan secara manual jika diperlukan.
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

      </MainLayout>
    </ProtectedRoute>
  );
}

    