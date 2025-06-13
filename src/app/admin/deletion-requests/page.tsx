
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, CheckSquare, XSquare, RefreshCw, Search, MoreHorizontal, Send, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  getPendingDeletionRequestsByBranch, // This function name might be misleading now as it fetches all
  approveDeletionRequest,
  rejectDeletionRequest,
  type TransactionDeletionRequest
} from "@/lib/firebase/deletionRequests";
import { format as formatDateFn, isValid as isValidDate, parseISO } from "date-fns";
import { id as localeID } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { Timestamp } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle as DialogModalTitle, DialogDescription as DialogModalDescription, DialogFooter as DialogModalFooter, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";


export default function DeletionRequestsPage() {
  const { userData, currentUser } = useAuth();
  const { selectedBranch } = useBranch();
  const { toast } = useToast();

  const [requests, setRequests] = useState<TransactionDeletionRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<TransactionDeletionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [requestToProcess, setRequestToProcess] = useState<TransactionDeletionRequest | null>(null);
  const [isApproveDialogVisible, setIsApproveDialogVisible] = useState(false);
  const [isRejectDialogVisible, setIsRejectDialogVisible] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminRejectionReasonInput, setAdminRejectionReasonInput] = useState("");
  const [processingAction, setProcessingAction] = useState(false);

  const branchId = selectedBranch?.id;
  const branchName = selectedBranch?.name;
  const userRole = userData?.role;

  const fetchRequests = useCallback(async (currentBranchId: string, currentBranchName: string | undefined) => {
    console.log(`[DeletionRequestsPage] Fetching requests for branch ID: ${currentBranchId}, Branch Name: ${currentBranchName}`);
    setLoadingRequests(true);
    try {
      const fetchedRequestsData = await getPendingDeletionRequestsByBranch(currentBranchId); // Consider renaming if it fetches more than pending
      console.log('[DeletionRequestsPage] Fetched Deletion Requests from Firestore:', fetchedRequestsData);
      setRequests(fetchedRequestsData);
    } catch (error) {
        console.error("Error fetching deletion requests", error);
        toast({title: "Gagal Memuat", description: "Tidak dapat memuat daftar permintaan.", variant: "destructive"});
    } finally {
        setLoadingRequests(false);
    }
  }, [toast]);


  useEffect(() => {
    if (userRole === 'admin' && branchId && branchName) {
      fetchRequests(branchId, branchName);
    } else if (userRole === 'admin' && !branchId) {
      setRequests([]);
      setLoadingRequests(false); // Stop loading if no branch is selected
    }
  }, [branchId, branchName, userRole, fetchRequests]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRequests(requests);
      return;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    const searchResults = requests.filter(req =>
      req.transactionInvoiceNumber.toLowerCase().includes(lowerSearchTerm) ||
      req.requestedByUserName.toLowerCase().includes(lowerSearchTerm) ||
      req.reason.toLowerCase().includes(lowerSearchTerm)
    );
    setFilteredRequests(searchResults);
  }, [searchTerm, requests]);


  const formatDate = (timestampInput: Timestamp | Date | string | number | undefined, withTime = true): string => {
    if (!timestampInput) return "N/A";

    let dateToFormat: Date | null = null;

    if (timestampInput instanceof Timestamp) {
      dateToFormat = timestampInput.toDate();
    } else if (timestampInput instanceof Date) {
      dateToFormat = timestampInput;
    } else if (typeof timestampInput === 'string') {
      const parsedDate = parseISO(timestampInput);
      if (isValidDate(parsedDate)) {
        dateToFormat = parsedDate;
      } else {
        const numericTimestamp = Number(timestampInput);
        if (!isNaN(numericTimestamp) && numericTimestamp > 0) {
          dateToFormat = new Date(numericTimestamp);
        }
      }
    } else if (typeof timestampInput === 'number') {
      if (timestampInput > 0) {
        dateToFormat = new Date(timestampInput);
      }
    }

    if (dateToFormat && isValidDate(dateToFormat)) {
      return formatDateFn(dateToFormat, withTime ? "dd MMM yy, HH:mm" : "dd MMM yy", { locale: localeID });
    }

    console.warn("[DeletionRequestsPage] Invalid or unparseable date received in formatDate:", timestampInput);
    return "Tanggal Invalid";
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
        if (branchId && branchName) fetchRequests(branchId, branchName);
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
        if (branchId && branchName) fetchRequests(branchId, branchName);
    } else {
        toast({ title: "Gagal Menolak", description: result.error || "Terjadi kesalahan.", variant: "destructive" });
    }
    setRequestToProcess(null);
  };

  const getDeletionRequestStatusBadge = (status: 'pending' | 'approved' | 'rejected' | undefined) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">Tertunda</Badge>;
      case 'approved':
        return <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">Disetujui</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="text-xs">Ditolak</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Tidak Diketahui</Badge>;
    }
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
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                    type="search"
                    placeholder="Cari Inv/Pemohon/Alasan..."
                    className="pl-8 w-full sm:w-56 rounded-md h-9 text-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={loadingRequests || !selectedBranch}
                    />
                </div>
                <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => { if (branchId && branchName) fetchRequests(branchId, branchName);}} disabled={loadingRequests || !selectedBranch}>
                    <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loadingRequests ? 'animate-spin' : ''}`}/> Segarkan
                </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Daftar Permintaan</CardTitle>
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
              ) : filteredRequests.length === 0 && searchTerm.trim() ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Tidak ada permintaan yang cocok dengan pencarian Anda.
                </p>
              ) : requests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Belum ada permintaan penghapusan transaksi untuk cabang "{branchName}".
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
                        <TableHead className="text-xs text-center">Status Permintaan</TableHead>
                        <TableHead className="text-xs text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="py-2 text-xs font-medium">{req.transactionInvoiceNumber}</TableCell>
                          <TableCell className="py-2 text-xs hidden md:table-cell">{formatDate(req.transactionDate)}</TableCell>
                          <TableCell className="py-2 text-xs hidden lg:table-cell text-right">{formatCurrency(req.transactionTotalAmount)}</TableCell>
                          <TableCell className="py-2 text-xs">{req.requestedByUserName}</TableCell>
                          <TableCell className="py-2 text-xs max-w-[150px] truncate" title={req.reason}>{req.reason}</TableCell>
                          <TableCell className="py-2 text-xs hidden sm:table-cell">{formatDate(req.requestTimestamp)}</TableCell>
                          <TableCell className="text-center py-1.5">{getDeletionRequestStatusBadge(req.status)}</TableCell>
                          <TableCell className="text-center py-1.5">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={processingAction || req.status !== 'pending'}>
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Aksi</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-xs cursor-pointer"
                                  onClick={() => handleOpenApproveDialog(req)}
                                  disabled={processingAction || req.status !== 'pending'}
                                >
                                  <CheckSquare className="mr-2 h-3.5 w-3.5" /> Setujui
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                  onClick={() => handleOpenRejectDialog(req)}
                                  disabled={processingAction || req.status !== 'pending'}
                                >
                                  <XSquare className="mr-2 h-3.5 w-3.5" /> Tolak
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

        {/* Approve Dialog */}
        <Dialog open={isApproveDialogVisible} onOpenChange={(open) => { if (!open) setRequestToProcess(null); setIsApproveDialogVisible(open);}}>
            <DialogContent className="sm:max-w-md">
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
    
    
