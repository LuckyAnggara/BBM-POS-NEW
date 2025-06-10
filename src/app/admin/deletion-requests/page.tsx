
"use client";

import React, { useState, useEffect, useCallback } from "react";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, CheckSquare, XSquare, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPendingDeletionRequestsByBranch, type TransactionDeletionRequest } from "@/lib/firebase/deletionRequests";
import { format } from "date-fns";
import { id as localeID } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { Timestamp } from "firebase/firestore";

export default function DeletionRequestsPage() {
  const { userData, currentUser } = useAuth();
  const { selectedBranch } = useBranch();
  const { toast } = useToast();

  const [requests, setRequests] = useState<TransactionDeletionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!selectedBranch || userData?.role !== 'admin') {
      setRequests([]);
      setLoadingRequests(false);
      return;
    }
    setLoadingRequests(true);
    try {
      const fetchedRequests = await getPendingDeletionRequestsByBranch(selectedBranch.id);
      setRequests(fetchedRequests);
      if (fetchedRequests.length === 0) {
        toast({ title: "Tidak Ada Permintaan", description: "Tidak ada permintaan penghapusan transaksi yang tertunda untuk cabang ini.", variant: "default" });
      }
    } catch (error) {
        console.error("Error fetching deletion requests", error);
        toast({title: "Gagal Memuat", description: "Tidak dapat memuat daftar permintaan.", variant: "destructive"});
    } finally {
        setLoadingRequests(false);
    }
  }, [selectedBranch, userData?.role, toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return "N/A";
    return format(timestamp.toDate(), "dd MMM yyyy, HH:mm", { locale: localeID });
  };
  
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return "N/A";
    return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString('id-ID')}`;
  };


  if (userData?.role !== 'admin') {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className="p-4 text-center text-destructive">
            Hanya admin yang dapat mengakses halaman ini.
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold font-headline">
              Permintaan Hapus Transaksi {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={fetchRequests} disabled={loadingRequests || !selectedBranch}>
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loadingRequests ? 'animate-spin' : ''}`}/> Segarkan Daftar
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Daftar Permintaan Tertunda</CardTitle>
              <CardDescription className="text-xs">
                Tinjau dan proses permintaan penghapusan transaksi dari kasir.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !selectedBranch ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Pilih cabang untuk melihat permintaan.
                </p>
              ) : requests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Belum ada permintaan penghapusan transaksi yang tertunda.
                </p>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableCaption className="text-xs">Permintaan penghapusan transaksi.</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">No. Invoice</TableHead>
                        <TableHead className="text-xs hidden md:table-cell">Tgl. Transaksi</TableHead>
                        <TableHead className="text-xs hidden lg:table-cell text-right">Jumlah</TableHead>
                        <TableHead className="text-xs">Diminta Oleh</TableHead>
                        <TableHead className="text-xs">Alasan</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">Tgl. Permintaan</TableHead>
                        <TableHead className="text-xs text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="py-2 text-xs font-medium">{req.transactionInvoiceNumber}</TableCell>
                          <TableCell className="py-2 text-xs hidden md:table-cell">{formatDate(req.transactionDate)}</TableCell>
                          <TableCell className="py-2 text-xs hidden lg:table-cell text-right">{formatCurrency(req.transactionTotalAmount)}</TableCell>
                          <TableCell className="py-2 text-xs">{req.requestedByUserName}</TableCell>
                          <TableCell className="py-2 text-xs max-w-[200px] truncate" title={req.reason}>{req.reason}</TableCell>
                          <TableCell className="py-2 text-xs hidden sm:table-cell">{formatDate(req.requestTimestamp)}</TableCell>
                          <TableCell className="text-center py-1.5">
                            <Button variant="outline" size="sm" className="h-7 text-xs mr-1" disabled>
                               <CheckSquare className="mr-1 h-3 w-3" /> Setujui
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive" disabled>
                               <XSquare className="mr-1 h-3 w-3" /> Tolak
                            </Button>
                            {/* Logic for approve/reject will be added in the next step */}
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
