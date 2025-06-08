
"use client";

import React, { useEffect, useState } from "react";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { getTransactionsForUserByBranch, type PosTransaction } from "@/lib/firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Printer } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SalesHistoryPage() {
  const { currentUser, userData } = useAuth();
  const { selectedBranch } = useBranch();
  const [transactions, setTransactions] = useState<PosTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (currentUser && selectedBranch) {
        setLoading(true);
        const fetchedTransactions = await getTransactionsForUserByBranch(
          currentUser.uid, 
          selectedBranch.id,
          { limit: 50, orderByField: "timestamp", orderDirection: "desc" } // Example options
        );
        setTransactions(fetchedTransactions);
        setLoading(false);
      } else {
        setTransactions([]);
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [currentUser, selectedBranch]);

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return "N/A";
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp.toDate());
  };

  const formatCurrency = (amount: number) => {
    return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString('id-ID')}`;
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
                                <TableHead className="text-xs text-center">Aksi</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {transactions.map((tx) => (
                                <TableRow key={tx.id}>
                                <TableCell className="text-xs font-medium py-2">{tx.invoiceNumber || tx.id.substring(0,8).toUpperCase()}</TableCell>
                                <TableCell className="text-xs py-2">{formatDate(tx.timestamp)}</TableCell>
                                <TableCell className="text-xs capitalize hidden sm:table-cell py-2">{tx.paymentMethod}</TableCell>
                                <TableCell className="text-xs text-right py-2">{formatCurrency(tx.totalAmount)}</TableCell>
                                <TableCell className="text-xs text-center py-2">
                                    <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                                    <Link href={`/invoice/${tx.id}/view`} target="_blank">
                                        <Printer className="mr-1.5 h-3.5 w-3.5" /> Lihat/Cetak
                                    </Link>
                                    </Button>
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
      </MainLayout>
    </ProtectedRoute>
  );
}

    