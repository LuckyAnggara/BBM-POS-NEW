
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
import { 
  getPendingDeletionRequestsByBranch, 
  approveDeletionRequest,
  rejectDeletionRequest,
  type TransactionDeletionRequest 
} from "@/lib/firebase/deletionRequests";
import { format } from "date-fns";
import { id as localeID } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { Timestamp } from "firebase/firestore";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle as DialogModalTitle, DialogDescription as DialogModalDescription, DialogFooter as DialogModalFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";


export default function DeletionRequestsPage() {
  const { userData, currentUser } = useAuth();
  const { selectedBranch } = useBranch();
  const { toast } = useToast();

  const [requests, setRequests] = useState<TransactionDeletionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [requestToProcess, setRequestToProcess] = useState<TransactionDeletionRequest | null>(null);
  const [isApproveDialogVisible, setIsApproveDialogVisible] = useState(false);
  const [isRejectDialogVisible, setIsRejectDialogVisible] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminRejectionReasonInput, setAdminRejectionReasonInput] = useState("");
  const [processingAction, setProcessingAction] = useState(false);


  const fetchRequests = useCallback(async () => {
    if (!selectedBranch || userData?.role !== 'admin') {
      setRequests([]);
      setLoadingRequests(false);
      return;
    }
    setLoadingRequests(true);
    try {
      console.log(`[DeletionRequestsPage] Fetching requests for branch ID: ${selectedBranch.id}, Branch Name: ${selectedBranch.name}`);
      const fetchedRequests = await getPendingDeletionRequestsByBranch(selectedBranch.id);
      console.log('[DeletionRequestsPage] Fetched Deletion Requests from Firestore:', fetchedRequests);
      setRequests(fetchedRequests);
      
      if (fetchedRequests.length === 0 && !loadingRequests && selectedBranch && userData?.role === 'admin') {
        toast({ title: "Tidak Ada Permintaan", description: `Tidak ada permintaan penghapusan transaksi yang tertunda untuk cabang "${selectedBranch.name}".`, variant: "default", duration: 5000 });
      }
    } catch (error) {
        console.error("Error fetching deletion requests", error);
        toast({title: "Gagal Memuat", description: "Tidak dapat memuat daftar permintaan.", variant: "destructive"});
    } finally {
        setLoadingRequests(false);
    }
  }, [selectedBranch, userData?.role, toast, loadingRequests]); // Added loadingRequests to dependencies of useCallback as it's used in the toast condition logic now.

  useEffect(() => {
    if (userData?.role === 'admin' && selectedBranch) {
      fetchRequests();
    } else if (!selectedBranch && userData?.role === 'admin') {
      setRequests([]);
      setLoadingRequests(false);
    }
  }, [fetchRequests, selectedBranch, userData?.role]);


  const formatDate = (timestamp: Timestamp | undefined, withTime = true) => {
    if (!timestamp) return "N/A";
    return format(timestamp.toDate(), withTime ? "dd MMM yy, HH:mm" : "dd MMM yy", { locale: localeID });
  };
  
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return "N/A";
    return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString('id-ID')}`;
  };

  const handleOpenApproveDialog = (request: TransactionDeletionRequest) => {
    setRequestToProcess(request);
    setAdminPasswordInput("");
    setIsApproveDialogVisible(true);
  };

  const handleOpenRejectDialog = (request: TransactionDeletionRequest) => {
    setRequestToProcess(request);
    setAdminRejectionReasonInput("");
    setIsRejectDialogVisible(true);
  };

  const handleConfirmApproval = async () => {
    if (!requestToProcess || !currentUser || !userData || !selectedBranch) {
        toast({ title: "Error", description: "Data tidak lengkap untuk memproses.", variant: "destructive"});
        return;
    }
    if (!adminPasswordInput) {
        toast({ title: "Password Diperlukan", description: "Masukkan password hapus transaksi cabang.", variant: "destructive"});
        return;
    }
    setProcessingAction(true);
    const result = await approveDeletionRequest(requestToProcess.id, currentUser.uid, userData.name, adminPasswordInput);
    setProcessingAction(false);
    setIsApproveDialogVisible(false);

    if (result.success) {
        toast({ title: "Permintaan Disetujui", description: `Transaksi ${requestToProcess.transactionInvoiceNumber} telah dihapus.` });
        await fetchRequests();
    } else {
        toast({ title: "Gagal Menyetujui", description: result.error || "Terjadi kesalahan.", variant: "destructive" });
    }
    setRequestToProcess(null);
  };

  const handleConfirmRejection = async () => {
    if (!requestToProcess || !currentUser || !userData) {
        toast({ title: "Error", description: "Data tidak lengkap untuk memproses.", variant: "destructive"});
        return;
    }
    setProcessingAction(true);
    const result = await rejectDeletionRequest(requestToProcess.id, currentUser.uid, userData.name, adminRejectionReasonInput);
    setProcessingAction(false);
    setIsRejectDialogVisible(false);

    if (result.success) {
        toast({ title: "Permintaan Ditolak", description: `Permintaan hapus untuk ${requestToProcess.transactionInvoiceNumber} telah ditolak.` });
        await fetchRequests();
    } else {
        toast({ title: "Gagal Menolak", description: result.error || "Terjadi kesalahan.", variant: "destructive" });
    }
    setRequestToProcess(null);
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
                            <Button variant="outline" size="sm" className="h-7 text-xs mr-1" onClick={() => handleOpenApproveDialog(req)} disabled={processingAction}>
                               <CheckSquare className="mr-1 h-3 w-3" /> Setujui
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleOpenRejectDialog(req)} disabled={processingAction}>
                               <XSquare className="mr-1 h-3 w-3" /> Tolak
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

        {/* Approve Dialog */}
        <Dialog open={isApproveDialogVisible} onOpenChange={(open) => { if (!open) setRequestToProcess(null); setIsApproveDialogVisible(open);}}>
            <DialogContent className="sm:max-w-md">
               
                  <DialogModalTitle>Informasi Permintaan Penghapusan</DialogModalTitle>
               
                 <DialogHeader>
                    <DialogModalTitle className="text-base">Setujui Penghapusan Transaksi</DialogModalTitle>
                    <DialogModalDescription className="text-xs">
                        Anda akan menyetujui penghapusan untuk Invoice: <strong>{requestToProcess?.transactionInvoiceNumber}</strong>.
                        <br/>Jumlah: {formatCurrency(requestToProcess?.transactionTotalAmount)}
                        <br/>Alasan Permintaan: {requestToProcess?.reason}
                        <br/>Stok barang akan dikembalikan (jika berlaku).
                    </DialogModalDescription>
                </DialogHeader>
                <div className="py-2 space-y-2">
                    <Label htmlFor="adminPasswordInput" className="text-xs">Password Hapus Transaksi Cabang Ini</Label>
                    <Input
                        id="adminPasswordInput"
                        type="password"
                        value={adminPasswordInput}
                        onChange={(e) => setAdminPasswordInput(e.target.value)}
                        placeholder="Masukkan password cabang"
                        className="text-xs h-9"
                        disabled={processingAction}
                    />
                     <p className="text-xs text-muted-foreground">Password ini diatur oleh admin untuk cabang "{selectedBranch?.name}".</p>
                </div>
                <DialogModalFooter>
                    <DialogClose asChild><Button type="button" variant="outline" className="text-xs h-8" disabled={processingAction}>Batal</Button></DialogClose>
                    <Button onClick={handleConfirmApproval} className="text-xs h-8" disabled={processingAction || !adminPasswordInput.trim()}>
                        {processingAction ? "Memproses..." : "Ya, Setujui & Hapus"}
                    </Button>
                </DialogModalFooter>
            </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={isRejectDialogVisible} onOpenChange={(open) => { if (!open) setRequestToProcess(null); setIsRejectDialogVisible(open);}}>
            <DialogContent className="sm:max-w-md">
              
                  <DialogModalTitle>Informasi Permintaan Penghapusan</DialogModalTitle>
                
                <DialogHeader>
                    <DialogModalTitle className="text-base">Tolak Permintaan Penghapusan</DialogModalTitle>
                    <DialogModalDescription className="text-xs">
                        Anda akan menolak permintaan penghapusan untuk Invoice: <strong>{requestToProcess?.transactionInvoiceNumber}</strong>.
                         <br/>Alasan Permintaan Awal: {requestToProcess?.reason}
                    </DialogModalDescription>
                </DialogHeader>
                <div className="py-2 space-y-2">
                    <Label htmlFor="adminRejectionReasonInput" className="text-xs">Alasan Penolakan Admin (Opsional)</Label>
                    <Textarea
                        id="adminRejectionReasonInput"
                        value={adminRejectionReasonInput}
                        onChange={(e) => setAdminRejectionReasonInput(e.target.value)}
                        placeholder="Jelaskan mengapa permintaan ditolak (jika perlu)"
                        className="text-xs min-h-[70px]"
                        disabled={processingAction}
                    />
                </div>
                <DialogModalFooter>
                     <DialogClose asChild><Button type="button" variant="outline" className="text-xs h-8" disabled={processingAction}>Batal</Button></DialogClose>
                    <Button onClick={handleConfirmRejection} variant="destructive" className="text-xs h-8" disabled={processingAction}>
                        {processingAction ? "Memproses..." : "Ya, Tolak Permintaan"}
                    </Button>
                </DialogModalFooter>
            </DialogContent>
        </Dialog>

      </MainLayout>
    </ProtectedRoute>
  );
}
