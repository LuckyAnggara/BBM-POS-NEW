
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  createBranch, 
  updateBranch,
  deleteBranch,
  type BranchInput,
} from "@/lib/firebase/branches";
import { 
  getAllUsers, 
  updateUserBranch, 
  updateUserRole,
} from "@/lib/firebase/users";
import {
  addBankAccount,
  getBankAccounts,
  updateBankAccount,
  deleteBankAccount,
  type BankAccount,
  type BankAccountInput
} from "@/lib/firebase/bankAccounts";
import { getInventoryItems, type InventoryItem } from "@/lib/firebase/inventory";
import { addStockMutation, checkIfInitialStockExists } from "@/lib/firebase/stockMutations";
import { Timestamp } from "firebase/firestore";
import type { UserData } from "@/contexts/auth-context";
import type { Branch } from "@/contexts/branch-context";
import { Skeleton } from "@/components/ui/skeleton";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, KeyRound, Banknote, PlusCircle, DatabaseZap, AlertTriangle } from "lucide-react";

interface BranchFormState {
  name: string;
  invoiceName: string;
  currency: string;
  taxRate: string; 
  address: string;
  phoneNumber: string;
  transactionDeletionPassword?: string;
}

const initialBranchFormState: BranchFormState = {
  name: "",
  invoiceName: "",
  currency: "IDR",
  taxRate: "0",
  address: "",
  phoneNumber: "",
  transactionDeletionPassword: "",
};

interface BankAccountFormState {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  branchId?: string | null; 
  isActive: boolean;
}

const initialBankAccountFormState: BankAccountFormState = {
  bankName: "",
  accountNumber: "",
  accountHolderName: "",
  branchId: null,
  isActive: true,
};

export default function AdminSettingsPage() {
  const { currentUser, userData, loadingAuth } = useAuth();
  const { branches, loadingBranches, refreshBranches, selectedBranch: adminSelectedBranch, setSelectedBranch: setAdminSelectedBranch } = useBranch(); 
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("manage-branches");

  const [branchForm, setBranchForm] = useState<BranchFormState>(initialBranchFormState);
  const [isSubmittingBranch, setIsSubmittingBranch] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editBranchForm, setEditBranchForm] = useState<BranchFormState>(initialBranchFormState);
  const [isEditBranchModalOpen, setIsEditBranchModalOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);

  const [users, setUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userBranchChanges, setUserBranchChanges] = useState<Record<string, string | null>>({});
  const [userRoleChanges, setUserRoleChanges] = useState<Record<string, string>>({});

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loadingBankAccounts, setLoadingBankAccounts] = useState(true);
  const [bankAccountForm, setBankAccountForm] = useState<BankAccountFormState>(initialBankAccountFormState);
  const [isBankAccountModalOpen, setIsBankAccountModalOpen] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<BankAccount | null>(null);
  const [isSubmittingBankAccount, setIsSubmittingBankAccount] = useState(false);
  const [bankAccountToDelete, setBankAccountToDelete] = useState<BankAccount | null>(null);
  const [isDeletingBankAccount, setIsDeletingBankAccount] = useState(false);

  const [isInitializingMutations, setIsInitializingMutations] = useState(false);
  const [showInitializeConfirm, setShowInitializeConfirm] = useState(false);


  useEffect(() => {
    if (!loadingAuth && userData?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [userData, loadingAuth, router]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const fetchedUsers = await getAllUsers();
    setUsers(fetchedUsers);
    
    const initialBranchChanges: Record<string, string | null> = {};
    const initialRoleChanges: Record<string, string> = {};
    fetchedUsers.forEach(user => {
      initialBranchChanges[user.uid] = user.branchId;
      initialRoleChanges[user.uid] = user.role;
    });
    setUserBranchChanges(initialBranchChanges);
    setUserRoleChanges(initialRoleChanges);

    setLoadingUsers(false);
  };

  const fetchBankAccounts = useCallback(async () => {
    setLoadingBankAccounts(true);
    const fetchedBankAccounts = await getBankAccounts(); 
    setBankAccounts(fetchedBankAccounts);
    setLoadingBankAccounts(false);
  }, []);


  useEffect(() => {
    if (userData?.role === "admin") {
      fetchUsers();
      fetchBankAccounts();
    }
  }, [userData, fetchBankAccounts]);

  const handleBranchFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, formSetter: React.Dispatch<React.SetStateAction<BranchFormState>>) => {
    const { name, value } = e.target;
    formSetter(prev => ({ ...prev, [name]: value }));
  };

  const handleBankAccountFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setBankAccountForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  
  const handleBankAccountFormSelectChange = (name: string, value: string) => {
    setBankAccountForm(prev => ({
      ...prev,
      [name]: value === "NONE" ? null : value,
    }));
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.name.trim()) {
      toast({ title: "Nama cabang kosong", description: "Silakan masukkan nama cabang.", variant: "destructive" });
      return;
    }
    setIsSubmittingBranch(true);
    const branchInput: BranchInput = {
      name: branchForm.name,
      invoiceName: branchForm.invoiceName || branchForm.name,
      currency: branchForm.currency || "IDR",
      taxRate: parseFloat(branchForm.taxRate) || 0,
      address: branchForm.address,
      phoneNumber: branchForm.phoneNumber,
      transactionDeletionPassword: branchForm.transactionDeletionPassword || "",
    };
    const result = await createBranch(branchInput);
    if ("error" in result) {
      toast({ title: "Gagal Membuat Cabang", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Cabang Berhasil Dibuat", description: `Cabang "${result.name}" telah ditambahkan.` });
      setBranchForm(initialBranchFormState);
      await refreshBranches();
    }
    setIsSubmittingBranch(false);
  };

  const handleOpenEditBranchModal = (branch: Branch) => {
    setEditingBranch(branch);
    setEditBranchForm({
      name: branch.name,
      invoiceName: branch.invoiceName || branch.name,
      currency: branch.currency || "IDR",
      taxRate: (branch.taxRate || 0).toString(),
      address: branch.address || "",
      phoneNumber: branch.phoneNumber || "",
      transactionDeletionPassword: branch.transactionDeletionPassword || "",
    });
    setIsEditBranchModalOpen(true);
  };

  const handleUpdateBranch = async () => {
    if (!editingBranch || !editBranchForm.name.trim()) {
      toast({ title: "Data tidak lengkap", description: "Nama cabang tidak boleh kosong.", variant: "destructive" });
      return;
    }
    const branchUpdates: Partial<BranchInput> = {
      name: editBranchForm.name,
      invoiceName: editBranchForm.invoiceName || editBranchForm.name,
      currency: editBranchForm.currency || "IDR",
      taxRate: parseFloat(editBranchForm.taxRate) || 0,
      address: editBranchForm.address,
      phoneNumber: editBranchForm.phoneNumber,
      transactionDeletionPassword: editBranchForm.transactionDeletionPassword,
    };
    const result = await updateBranch(editingBranch.id, branchUpdates);
    if (result && "error" in result) {
      toast({ title: "Gagal Memperbarui Cabang", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Cabang Berhasil Diperbarui" });
      setIsEditBranchModalOpen(false);
      setEditingBranch(null);
      await refreshBranches();
      if (adminSelectedBranch && adminSelectedBranch.id === editingBranch.id) {
        const updatedBranchData = { ...adminSelectedBranch, ...branchUpdates };
        setAdminSelectedBranch(updatedBranchData as Branch); 
      }
    }
  };

  const handleConfirmDeleteBranch = async () => {
    if (!branchToDelete) return;
    setIsDeletingBranch(true);
    const result = await deleteBranch(branchToDelete.id);
     if (result && "error" in result) {
      toast({ title: "Gagal Menghapus Cabang", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Cabang Berhasil Dihapus" });
      await refreshBranches();
      await fetchUsers(); 
      if (adminSelectedBranch && adminSelectedBranch.id === branchToDelete.id) {
        setAdminSelectedBranch(null); 
      }
    }
    setBranchToDelete(null); 
    setIsDeletingBranch(false);
  };

  const handleUserBranchChange = (userId: string, branchId: string) => {
    setUserBranchChanges(prev => ({ ...prev, [userId]: branchId === "UNASSIGNED" ? null : branchId }));
  };
  
  const handleUserRoleChange = (userId: string, role: string) => {
    setUserRoleChanges(prev => ({ ...prev, [userId]: role }));
  };

  const handleUpdateUser = async (userId: string) => {
    const newBranchId = userBranchChanges[userId];
    const newRole = userRoleChanges[userId];
    const originalUser = users.find(u => u.uid === userId);
    if (!originalUser) return;
    let branchUpdated = false;
    let roleUpdated = false;
    if (newBranchId !== originalUser.branchId) {
      const branchResult = await updateUserBranch(userId, newBranchId);
      if (branchResult && "error" in branchResult) {
        toast({ title: "Gagal Update Cabang", description: branchResult.error, variant: "destructive" }); return;
      }
      branchUpdated = true;
    }
    if (newRole !== originalUser.role) {
      const roleResult = await updateUserRole(userId, newRole);
      if (roleResult && "error" in roleResult) {
        toast({ title: "Gagal Update Peran", description: roleResult.error, variant: "destructive" }); return;
      }
      roleUpdated = true;
    }
    if (branchUpdated || roleUpdated) {
        toast({ title: "Pengguna Diperbarui", description: "Data pengguna berhasil diperbarui." });
        await fetchUsers(); 
    } else {
        toast({ title: "Tidak Ada Perubahan", description: "Tidak ada perubahan data untuk disimpan.", variant: "default" });
    }
  };

  const handleOpenBankAccountModal = (bankAccount: BankAccount | null = null) => {
    setEditingBankAccount(bankAccount);
    if (bankAccount) {
      setBankAccountForm({
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber,
        accountHolderName: bankAccount.accountHolderName,
        branchId: bankAccount.branchId || null,
        isActive: bankAccount.isActive,
      });
    } else {
      setBankAccountForm(initialBankAccountFormState);
    }
    setIsBankAccountModalOpen(true);
  };

  const handleSubmitBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBankAccount(true);
    const dataInput: BankAccountInput = {
        ...bankAccountForm,
        branchId: bankAccountForm.branchId || null,
    };
    let result;
    if (editingBankAccount) {
        result = await updateBankAccount(editingBankAccount.id, dataInput);
    } else {
        result = await addBankAccount(dataInput);
    }

    if (result && "error" in result) {
        toast({ title: editingBankAccount ? "Gagal Memperbarui" : "Gagal Menambah", description: result.error, variant: "destructive" });
    } else {
        toast({ title: editingBankAccount ? "Rekening Diperbarui" : "Rekening Ditambahkan" });
        setIsBankAccountModalOpen(false);
        await fetchBankAccounts();
    }
    setIsSubmittingBankAccount(false);
  };
  
  const handleConfirmDeleteBankAccount = async () => {
    if (!bankAccountToDelete) return;
    setIsDeletingBankAccount(true);
    const result = await deleteBankAccount(bankAccountToDelete.id);
    if (result && "error" in result) {
      toast({ title: "Gagal Menghapus Rekening", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Rekening Berhasil Dihapus" });
      await fetchBankAccounts();
    }
    setBankAccountToDelete(null);
    setIsDeletingBankAccount(false);
  };

  const handleInitializeStockMutations = async () => {
    if (!adminSelectedBranch || !currentUser || !userData) {
      toast({ title: "Error", description: "Cabang atau data admin tidak valid.", variant: "destructive" });
      return;
    }
    setShowInitializeConfirm(false);
    setIsInitializingMutations(true);
    toast({ title: "Memulai Inisialisasi", description: `Memproses produk untuk cabang ${adminSelectedBranch.name}...`, duration: 5000 });

    const inventoryResult = await getInventoryItems(adminSelectedBranch.id);
    const itemsToProcess = inventoryResult.items;

    let initializedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const item of itemsToProcess) {
      try {
        const alreadyInitialized = await checkIfInitialStockExists(item.id, adminSelectedBranch.id);
        if (alreadyInitialized) {
          skippedCount++;
          continue;
        }

        const mutationResult = await addStockMutation({
          branchId: adminSelectedBranch.id,
          productId: item.id,
          productName: item.name,
          sku: item.sku,
          mutationTime: Timestamp.now(),
          type: "INITIAL_STOCK",
          quantityChange: item.quantity,
          currentProductStock: 0, 
          notes: "Inisialisasi stok awal sistem",
          userId: currentUser.uid,
          userName: userData.name,
        });

        if ("error" in mutationResult) {
          console.error(`Gagal inisialisasi ${item.name}: ${mutationResult.error}`);
          errorCount++;
        } else {
          initializedCount++;
        }
      } catch (e: any) {
        console.error(`Error saat memproses ${item.name}: ${e.message}`);
        errorCount++;
      }
    }

    setIsInitializingMutations(false);
    toast({
      title: "Inisialisasi Selesai",
      description: `Total produk: ${itemsToProcess.length}. Diinisialisasi: ${initializedCount}. Dilewati: ${skippedCount}. Gagal: ${errorCount}.`,
      duration: 10000,
    });
  };


  if (loadingAuth || (userData && userData.role !== "admin")) {
    return <div className="flex h-screen items-center justify-center">Memuat data admin...</div>;
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          <h1 className="text-xl md:text-2xl font-semibold font-headline">Pengaturan Admin</h1>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="inline-flex items-center justify-start rounded-md bg-muted p-1 text-muted-foreground">
              <TabsTrigger value="manage-branches" className="text-xs px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Kelola Cabang</TabsTrigger>
              <TabsTrigger value="manage-users" className="text-xs px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Kelola Pengguna</TabsTrigger>
              <TabsTrigger value="manage-bank-accounts" className="text-xs px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Rekening Bank</TabsTrigger>
              <TabsTrigger value="system-utilities" className="text-xs px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Utilitas Sistem</TabsTrigger>
            </TabsList>

            <TabsContent value="manage-branches" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Kelola Cabang</CardTitle>
                  <CardDescription className="text-xs">Buat, edit, hapus, dan lihat daftar cabang beserta detailnya.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleCreateBranch} className="space-y-3 border p-4 rounded-md">
                    <h3 className="text-sm font-medium mb-1">Tambah Cabang Baru</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><Label htmlFor="branchName" className="text-xs">Nama Cabang Utama*</Label><Input id="branchName" name="name" value={branchForm.name} onChange={(e) => handleBranchFormChange(e, setBranchForm)} placeholder="Contoh: Cabang Pusat" className="h-9 text-xs" disabled={isSubmittingBranch} /></div>
                        <div><Label htmlFor="invoiceName" className="text-xs">Nama di Invoice (Opsional)</Label><Input id="invoiceName" name="invoiceName" value={branchForm.invoiceName} onChange={(e) => handleBranchFormChange(e, setBranchForm)} placeholder="Sama seperti nama cabang jika kosong" className="h-9 text-xs" disabled={isSubmittingBranch} /></div>
                        <div><Label htmlFor="currency" className="text-xs">Mata Uang</Label><Input id="currency" name="currency" value={branchForm.currency} onChange={(e) => handleBranchFormChange(e, setBranchForm)} placeholder="IDR" className="h-9 text-xs" disabled={isSubmittingBranch} /></div>
                        <div><Label htmlFor="taxRate" className="text-xs">Tarif Pajak (%)</Label><Input id="taxRate" name="taxRate" type="number" value={branchForm.taxRate} onChange={(e) => handleBranchFormChange(e, setBranchForm)} placeholder="0" className="h-9 text-xs" disabled={isSubmittingBranch} /></div>
                    </div>
                     <div><Label htmlFor="address" className="text-xs">Alamat</Label><Textarea id="address" name="address" value={branchForm.address} onChange={(e) => handleBranchFormChange(e, setBranchForm)} placeholder="Alamat lengkap cabang" className="text-xs min-h-[60px]" disabled={isSubmittingBranch} /></div>
                    <div><Label htmlFor="phoneNumber" className="text-xs">Nomor Telepon</Label><Input id="phoneNumber" name="phoneNumber" value={branchForm.phoneNumber} onChange={(e) => handleBranchFormChange(e, setBranchForm)} placeholder="08xxxxxxxxxx" className="h-9 text-xs" disabled={isSubmittingBranch} /></div>
                    <div><Label htmlFor="transactionDeletionPasswordCreate" className="text-xs">Password Hapus Transaksi (Opsional)</Label><div className="relative"><KeyRound className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input id="transactionDeletionPasswordCreate" name="transactionDeletionPassword" type="password" value={branchForm.transactionDeletionPassword} onChange={(e) => handleBranchFormChange(e, setBranchForm)} placeholder="Kosongkan jika tidak diset" className="h-9 text-xs pl-8" disabled={isSubmittingBranch} /></div></div>
                    <Button type="submit" size="sm" className="h-9 text-xs" disabled={isSubmittingBranch}>{isSubmittingBranch ? "Membuat..." : "Buat Cabang"}</Button>
                  </form>
                  <div>
                    <h3 className="text-sm font-medium mb-1.5 mt-4">Daftar Cabang Saat Ini</h3>
                    {loadingBranches ? (<div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>) : branches.length > 0 ? (
                      <div className="border rounded-md overflow-x-auto"><Table><TableHeader><TableRow>
                              <TableHead className="text-xs">Nama Cabang</TableHead><TableHead className="text-xs hidden sm:table-cell">Nama di Invoice</TableHead><TableHead className="text-xs hidden md:table-cell">Mata Uang</TableHead><TableHead className="text-xs hidden md:table-cell">Pajak (%)</TableHead><TableHead className="text-xs hidden lg:table-cell">Pass. Hapus</TableHead><TableHead className="text-xs text-right">Aksi</TableHead>
                            </TableRow></TableHeader><TableBody>
                            {branches.map((branch) => (<TableRow key={branch.id}>
                                <TableCell className="text-xs py-2">{branch.name}</TableCell><TableCell className="text-xs py-2 hidden sm:table-cell">{branch.invoiceName || branch.name}</TableCell><TableCell className="text-xs py-2 hidden md:table-cell">{branch.currency || "IDR"}</TableCell><TableCell className="text-xs py-2 hidden md:table-cell">{branch.taxRate !== undefined ? branch.taxRate : 0}%</TableCell><TableCell className="text-xs py-2 hidden lg:table-cell">{branch.transactionDeletionPassword ? "Terpasang" : "Tidak Ada"}</TableCell>
                                <TableCell className="text-right py-2">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditBranchModal(branch)}><Pencil className="h-3.5 w-3.5" /><span className="sr-only">Edit</span></Button>
                                  <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => setBranchToDelete(branch)}><Trash2 className="h-3.5 w-3.5" /><span className="sr-only">Hapus</span></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle><AlertDialogDescription className="text-xs">Tindakan ini akan menghapus cabang "{branchToDelete?.name}". Ini tidak dapat dibatalkan. Pengguna yang terhubung ke cabang ini mungkin perlu ditetapkan ulang.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="text-xs h-8" onClick={() => setBranchToDelete(null)}>Batal</AlertDialogCancel><AlertDialogAction className="text-xs h-8 bg-destructive hover:bg-destructive/90" onClick={handleConfirmDeleteBranch} disabled={isDeletingBranch}>{isDeletingBranch ? "Menghapus..." : "Ya, Hapus"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell>
                              </TableRow>))}
                          </TableBody></Table></div>) : (<p className="text-xs text-muted-foreground">Belum ada cabang yang dibuat.</p>)}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manage-users" className="mt-0">
              <Card><CardHeader><CardTitle className="text-base font-semibold">Kelola Pengguna</CardTitle><CardDescription className="text-xs">Lihat pengguna, tetapkan cabang, dan ubah peran.</CardDescription></CardHeader>
                <CardContent>
                  {loadingUsers ? (<div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>) : users.length > 0 ? (
                    <div className="border rounded-md overflow-x-auto"><Table><TableHeader><TableRow>
                            <TableHead className="text-xs">Nama</TableHead><TableHead className="text-xs">Email</TableHead><TableHead className="text-xs">Peran</TableHead><TableHead className="text-xs">Cabang Saat Ini</TableHead><TableHead className="text-xs w-[180px]">Tetapkan Cabang</TableHead><TableHead className="text-xs w-[150px]">Tetapkan Peran</TableHead><TableHead className="text-xs text-right">Aksi</TableHead>
                          </TableRow></TableHeader><TableBody>
                          {users.map((user) => {
                            const currentBranch = branches.find(b => b.id === user.branchId);
                            const currentBranchName = currentBranch ? currentBranch.name : (user.branchId ? "ID Cabang Tidak Valid" : "Belum Ditetapkan");
                            return (<TableRow key={user.uid}>
                                <TableCell className="text-xs py-2">{user.name}</TableCell><TableCell className="text-xs py-2">{user.email}</TableCell><TableCell className="text-xs py-2 capitalize">{user.role}</TableCell><TableCell className="text-xs py-2">{currentBranchName}</TableCell>
                                <TableCell className="text-xs py-2"><Select value={userBranchChanges[user.uid] ?? "UNASSIGNED"} onValueChange={(value) => handleUserBranchChange(user.uid, value)} disabled={loadingBranches}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih Cabang" /></SelectTrigger><SelectContent><SelectItem value="UNASSIGNED" className="text-xs">Tidak Ada (Kosongkan)</SelectItem>{branches.map(branch => (<SelectItem key={branch.id} value={branch.id} className="text-xs">{branch.name}</SelectItem>))}</SelectContent></Select></TableCell>
                                <TableCell className="text-xs py-2"><Select value={userRoleChanges[user.uid] ?? user.role} onValueChange={(value) => handleUserRoleChange(user.uid, value)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih Peran" /></SelectTrigger><SelectContent><SelectItem value="cashier" className="text-xs">Kasir</SelectItem><SelectItem value="admin" className="text-xs">Admin</SelectItem></SelectContent></Select></TableCell>
                                <TableCell className="text-right py-2"><Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleUpdateUser(user.uid)} disabled={ (userBranchChanges[user.uid] === user.branchId || (userBranchChanges[user.uid] === null && !user.branchId)) && userRoleChanges[user.uid] === user.role }>Simpan</Button></TableCell>
                              </TableRow>);})}
                        </TableBody></Table></div>) : (<p className="text-xs text-muted-foreground">Tidak ada pengguna yang terdaftar selain akun admin Anda.</p>)}
                </CardContent></Card>
            </TabsContent>

            <TabsContent value="manage-bank-accounts" className="mt-0">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-base font-semibold">Kelola Rekening Bank</CardTitle>
                                <CardDescription className="text-xs">Tambah, edit, atau hapus rekening bank yang digunakan untuk transaksi.</CardDescription>
                            </div>
                            <Button size="sm" className="text-xs h-8" onClick={() => handleOpenBankAccountModal()}>
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Tambah Rekening
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loadingBankAccounts ? (
                            <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
                        ) : bankAccounts.length > 0 ? (
                            <div className="border rounded-md overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-xs">Nama Bank</TableHead>
                                            <TableHead className="text-xs">Nomor Rekening</TableHead>
                                            <TableHead className="text-xs hidden sm:table-cell">Atas Nama</TableHead>
                                            <TableHead className="text-xs hidden md:table-cell">Cabang Tertaut</TableHead>
                                            <TableHead className="text-xs text-center">Status</TableHead>
                                            <TableHead className="text-xs text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bankAccounts.map((acc) => {
                                            const linkedBranch = acc.branchId ? branches.find(b => b.id === acc.branchId)?.name : "Global";
                                            return (
                                            <TableRow key={acc.id}>
                                                <TableCell className="text-xs py-2 font-medium">{acc.bankName}</TableCell>
                                                <TableCell className="text-xs py-2">{acc.accountNumber}</TableCell>
                                                <TableCell className="text-xs py-2 hidden sm:table-cell">{acc.accountHolderName}</TableCell>
                                                <TableCell className="text-xs py-2 hidden md:table-cell">{linkedBranch || "N/A"}</TableCell>
                                                <TableCell className="text-xs text-center py-2">{acc.isActive ? <span className="text-green-600">Aktif</span> : <span className="text-destructive">Nonaktif</span>}</TableCell>
                                                <TableCell className="text-right py-2">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenBankAccountModal(acc)}><Pencil className="h-3.5 w-3.5" /><span className="sr-only">Edit</span></Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => setBankAccountToDelete(acc)}><Trash2 className="h-3.5 w-3.5" /><span className="sr-only">Hapus</span></Button></AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Hapus Rekening Bank?</AlertDialogTitle><AlertDialogDescription className="text-xs">Tindakan ini akan menghapus rekening bank "{bankAccountToDelete?.bankName} - {bankAccountToDelete?.accountNumber}". Ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel className="text-xs h-8" onClick={() => setBankAccountToDelete(null)}>Batal</AlertDialogCancel>
                                                                <AlertDialogAction className="text-xs h-8 bg-destructive hover:bg-destructive/90" onClick={handleConfirmDeleteBankAccount} disabled={isDeletingBankAccount}>{isDeletingBankAccount ? "Menghapus..." : "Ya, Hapus"}</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        )})}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground text-center py-6">Belum ada rekening bank yang ditambahkan.</p>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="system-utilities" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Utilitas Sistem</CardTitle>
                  <CardDescription className="text-xs">Alat bantu untuk pengelolaan data sistem tingkat lanjut.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-md">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div>
                            <h3 className="text-sm font-medium">Inisialisasi Mutasi Stok Awal</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Buat catatan mutasi "Stok Awal" untuk semua produk di cabang terpilih saat ini. <br/>
                                Ini diperlukan agar laporan mutasi memiliki basis yang benar.
                            </p>
                            <p className="text-xs text-destructive mt-1">
                                <AlertTriangle className="inline-block h-3.5 w-3.5 mr-1"/>Hanya jalankan satu kali per produk per cabang.
                            </p>
                        </div>
                        <Button
                            size="sm"
                            className="text-xs h-8 mt-2 sm:mt-0"
                            variant="outline"
                            onClick={() => setShowInitializeConfirm(true)}
                            disabled={!adminSelectedBranch || isInitializingMutations}
                        >
                            <DatabaseZap className="mr-1.5 h-3.5 w-3.5"/> 
                            {isInitializingMutations ? "Memproses..." : "Inisialisasi Stok Cabang Ini"}
                        </Button>
                    </div>
                    {!adminSelectedBranch && (
                        <p className="text-xs text-amber-600 mt-2">Pilih cabang dari dropdown di sidebar kiri bawah untuk mengaktifkan utilitas ini.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>

        <Dialog open={isEditBranchModalOpen} onOpenChange={setIsEditBranchModalOpen}>
          <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Edit Detail Cabang</DialogTitle></DialogHeader>
            <div className="space-y-3 py-3 max-h-[70vh] overflow-y-auto pr-2">
               <div><Label htmlFor="editBranchName" className="text-xs">Nama Cabang Utama*</Label><Input id="editBranchName" name="name" value={editBranchForm.name} onChange={(e) => handleBranchFormChange(e, setEditBranchForm)} className="text-xs h-9" /></div>
              <div><Label htmlFor="editInvoiceName" className="text-xs">Nama di Invoice</Label><Input id="editInvoiceName" name="invoiceName" value={editBranchForm.invoiceName} onChange={(e) => handleBranchFormChange(e, setEditBranchForm)} className="text-xs h-9" /></div>
               <div><Label htmlFor="editCurrency" className="text-xs">Mata Uang</Label><Input id="editCurrency" name="currency" value={editBranchForm.currency} onChange={(e) => handleBranchFormChange(e, setEditBranchForm)} className="text-xs h-9" /></div>
               <div><Label htmlFor="editTaxRate" className="text-xs">Tarif Pajak (%)</Label><Input id="editTaxRate" name="taxRate" type="number" value={editBranchForm.taxRate} onChange={(e) => handleBranchFormChange(e, setEditBranchForm)} className="text-xs h-9" /></div>
               <div><Label htmlFor="editAddress" className="text-xs">Alamat</Label><Textarea id="editAddress" name="address" value={editBranchForm.address} onChange={(e) => handleBranchFormChange(e, setEditBranchForm)} className="text-xs min-h-[60px]" /></div>
               <div><Label htmlFor="editPhoneNumber" className="text-xs">Nomor Telepon</Label><Input id="editPhoneNumber" name="phoneNumber" value={editBranchForm.phoneNumber} onChange={(e) => handleBranchFormChange(e, setEditBranchForm)} className="text-xs h-9" /></div>
              <div><Label htmlFor="transactionDeletionPasswordEdit" className="text-xs">Password Hapus Transaksi</Label><div className="relative"><KeyRound className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input id="transactionDeletionPasswordEdit" name="transactionDeletionPassword" type="password" value={editBranchForm.transactionDeletionPassword} onChange={(e) => handleBranchFormChange(e, setEditBranchForm)} placeholder="Kosongkan untuk tidak mengubah" className="h-9 text-xs pl-8" /></div><p className="text-xs text-muted-foreground mt-1">Kosongkan jika tidak ingin mengubah password yang sudah ada. Mengisi akan menimpa password lama.</p></div>
            </div>
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline" className="text-xs h-8">Batal</Button></DialogClose><Button onClick={handleUpdateBranch} className="text-xs h-8">Simpan Perubahan</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isBankAccountModalOpen} onOpenChange={setIsBankAccountModalOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>{editingBankAccount ? "Edit Rekening Bank" : "Tambah Rekening Bank Baru"}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmitBankAccount} className="space-y-3 py-3">
                    <div><Label htmlFor="bankName" className="text-xs">Nama Bank*</Label><Input id="bankName" name="bankName" value={bankAccountForm.bankName} onChange={handleBankAccountFormChange} placeholder="Contoh: BCA, Mandiri" className="h-9 text-xs" /></div>
                    <div><Label htmlFor="accountNumber" className="text-xs">Nomor Rekening*</Label><Input id="accountNumber" name="accountNumber" value={bankAccountForm.accountNumber} onChange={handleBankAccountFormChange} placeholder="1234567890" className="h-9 text-xs" /></div>
                    <div><Label htmlFor="accountHolderName" className="text-xs">Atas Nama (Pemilik)*</Label><Input id="accountHolderName" name="accountHolderName" value={bankAccountForm.accountHolderName} onChange={handleBankAccountFormChange} placeholder="Nama Pemilik Rekening" className="h-9 text-xs" /></div>
                    <div>
                        <Label htmlFor="bankAccountBranchId" className="text-xs">Tautkan ke Cabang (Opsional)</Label>
                        <Select value={bankAccountForm.branchId || "NONE"} onValueChange={(value) => handleBankAccountFormSelectChange("branchId", value)} disabled={loadingBranches}>
                            <SelectTrigger className="h-9 text-xs mt-1"><SelectValue placeholder={loadingBranches ? "Memuat cabang..." : "Pilih Cabang (atau Global)"} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NONE" className="text-xs">Global (Semua Cabang)</SelectItem>
                                {branches.map(b => (<SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">Jika tidak dipilih, rekening ini dapat digunakan di semua cabang.</p>
                    </div>
                    <div className="flex items-center space-x-2 pt-1">
                        <Switch id="isActive" name="isActive" checked={bankAccountForm.isActive} onCheckedChange={(checked) => setBankAccountForm(prev => ({...prev, isActive: checked}))} />
                        <Label htmlFor="isActive" className="text-xs">Aktifkan Rekening Ini</Label>
                    </div>
                    <DialogFooter className="pt-4">
                        <DialogClose asChild><Button type="button" variant="outline" className="text-xs h-8">Batal</Button></DialogClose>
                        <Button type="submit" className="text-xs h-8" disabled={isSubmittingBankAccount}>{isSubmittingBankAccount ? "Menyimpan..." : (editingBankAccount ? "Simpan Perubahan" : "Tambah Rekening")}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        <AlertDialog open={showInitializeConfirm} onOpenChange={setShowInitializeConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Inisialisasi Mutasi Stok</AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                Anda akan membuat catatan mutasi "Stok Awal" untuk SEMUA produk yang ada di cabang <strong>{adminSelectedBranch?.name || "N/A"}</strong>.
                Proses ini menggunakan jumlah stok produk saat ini sebagai basis. <br/><br/>
                <span className="font-semibold text-destructive">PERHATIAN:</span>
                <ul className="list-disc pl-4 mt-1">
                    <li>Tindakan ini sebaiknya hanya dijalankan SATU KALI per produk per cabang.</li>
                    <li>Jika sudah pernah dijalankan, produk yang telah memiliki mutasi "Stok Awal" akan dilewati.</li>
                    <li>Pastikan data inventaris Anda sudah akurat sebelum melanjutkan.</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="text-xs h-8" onClick={() => setShowInitializeConfirm(false)} disabled={isInitializingMutations}>Batal</AlertDialogCancel>
              <AlertDialogAction
                className="text-xs h-8"
                onClick={handleInitializeStockMutations}
                disabled={isInitializingMutations}
              >
                {isInitializingMutations ? "Memproses..." : "Ya, Lanjutkan Inisialisasi"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </MainLayout>
    </ProtectedRoute>
  );
}
