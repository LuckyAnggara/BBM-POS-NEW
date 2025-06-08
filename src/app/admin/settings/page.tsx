
"use client";

import React, { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  createBranch as apiCreateBranch, 
  getAllUsers as apiGetAllUsers, 
  updateUserBranch as apiUpdateUserBranch, 
  updateUserRole as apiUpdateUserRole,
  updateBranch as apiUpdateBranch,
  deleteBranch as apiDeleteBranch,
  type BranchInput
} from "@/lib/firebase/firestore";
import type { UserData } from "@/contexts/auth-context";
import type { Branch } from "@/contexts/branch-context";
import { Skeleton } from "@/components/ui/skeleton";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, KeyRound } from "lucide-react";

// Form values for creating/editing a branch
interface BranchFormState {
  name: string;
  invoiceName: string;
  currency: string;
  taxRate: string; // Store as string for input, convert to number on save
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

export default function AdminSettingsPage() {
  const { userData, loadingAuth } = useAuth();
  const { branches, loadingBranches, refreshBranches, selectedBranch, setSelectedBranch } = useBranch();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("manage-branches");

  // Branch Management State
  const [branchForm, setBranchForm] = useState<BranchFormState>(initialBranchFormState);
  const [isSubmittingBranch, setIsSubmittingBranch] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editBranchForm, setEditBranchForm] = useState<BranchFormState>(initialBranchFormState);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);

  // User Management State
  const [users, setUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userBranchChanges, setUserBranchChanges] = useState<Record<string, string | null>>({});
  const [userRoleChanges, setUserRoleChanges] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loadingAuth && userData?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [userData, loadingAuth, router]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const fetchedUsers = await apiGetAllUsers();
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

  useEffect(() => {
    if (userData?.role === "admin") {
      fetchUsers();
    }
  }, [userData]);

  // Branch Form Input Handler
  const handleBranchFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, formSetter: React.Dispatch<React.SetStateAction<BranchFormState>>) => {
    const { name, value } = e.target;
    formSetter(prev => ({ ...prev, [name]: value }));
  };


  // Branch Handlers
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
    const result = await apiCreateBranch(branchInput);
    if ("error" in result) {
      toast({ title: "Gagal Membuat Cabang", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Cabang Berhasil Dibuat", description: `Cabang "${result.name}" telah ditambahkan.` });
      setBranchForm(initialBranchFormState);
      await refreshBranches();
    }
    setIsSubmittingBranch(false);
  };

  const handleOpenEditModal = (branch: Branch) => {
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
    setIsEditModalOpen(true);
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
    const result = await apiUpdateBranch(editingBranch.id, branchUpdates);
    if (result && "error" in result) {
      toast({ title: "Gagal Memperbarui Cabang", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Cabang Berhasil Diperbarui" });
      setIsEditModalOpen(false);
      setEditingBranch(null);
      await refreshBranches();
      // If the currently selected branch was edited, update it in the context
      if (selectedBranch && selectedBranch.id === editingBranch.id) {
        const updatedBranchData = { ...selectedBranch, ...branchUpdates };
        setSelectedBranch(updatedBranchData as Branch); // Cast because branchUpdates is partial
      }
    }
  };

  const handleConfirmDeleteBranch = async () => {
    if (!branchToDelete) return;
    setIsDeletingBranch(true);
    const result = await apiDeleteBranch(branchToDelete.id);
     if (result && "error" in result) {
      toast({ title: "Gagal Menghapus Cabang", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Cabang Berhasil Dihapus" });
      await refreshBranches();
      await fetchUsers(); 
      if (selectedBranch && selectedBranch.id === branchToDelete.id) {
        setSelectedBranch(null); // Deselect if the deleted branch was selected
      }
    }
    setBranchToDelete(null); 
    setIsDeletingBranch(false);
  };

  // User Handlers
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
      const branchResult = await apiUpdateUserBranch(userId, newBranchId);
      if (branchResult && "error" in branchResult) {
        toast({ title: "Gagal Update Cabang", description: branchResult.error, variant: "destructive" });
        return;
      }
      branchUpdated = true;
    }

    if (newRole !== originalUser.role) {
      const roleResult = await apiUpdateUserRole(userId, newRole);
      if (roleResult && "error" in roleResult) {
        toast({ title: "Gagal Update Peran", description: roleResult.error, variant: "destructive" });
        return;
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
                        <div>
                            <Label htmlFor="branchName" className="text-xs">Nama Cabang Utama*</Label>
                            <Input id="branchName" name="name" value={branchForm.name} onChange={(e) => handleBranchFormChange(e, setBranchForm)} placeholder="Contoh: Cabang Pusat" className="h-9 text-xs" disabled={isSubmittingBranch} />
                        </div>
                        <div>
                            <Label htmlFor="invoiceName" className="text-xs">Nama di Invoice (Opsional)</Label>
                            <Input id="invoiceName" name="invoiceName" value={branchForm.invoiceName} onChange={(e) => handleBranchFormChange(e, setBranchForm)} placeholder="Sama seperti nama cabang jika kosong" className="h-9 text-xs" disabled={isSubmittingBranch} />
                        </div>
                        <div>
                            <Label htmlFor="currency" className="text-xs">Mata Uang</Label>
                            <Input id="currency" name="currency" value={branchForm.currency} onChange={(e) => handleBranchFormChange(e, setBranchForm)} placeholder="IDR" className="h-9 text-xs" disabled={isSubmittingBranch} />
                        </div>
                        <div>
                            <Label htmlFor="taxRate" className="text-xs">Tarif Pajak (%)</Label>
                            <Input id="taxRate" name="taxRate" type="number" value={branchForm.taxRate} onChange={(e) => handleBranchFormChange(e, setBranchForm)} placeholder="0" className="h-9 text-xs" disabled={isSubmittingBranch} />
                        </div>
                    </div>
                     <div>
                        <Label htmlFor="address" className="text-xs">Alamat</Label>
                        <Textarea id="address" name="address" value={branchForm.address} onChange={(e) => handleBranchFormChange(e, setBranchForm)} placeholder="Alamat lengkap cabang" className="text-xs min-h-[60px]" disabled={isSubmittingBranch} />
                    </div>
                    <div>
                        <Label htmlFor="phoneNumber" className="text-xs">Nomor Telepon</Label>
                        <Input id="phoneNumber" name="phoneNumber" value={branchForm.phoneNumber} onChange={(e) => handleBranchFormChange(e, setBranchForm)} placeholder="08xxxxxxxxxx" className="h-9 text-xs" disabled={isSubmittingBranch} />
                    </div>
                    <div>
                        <Label htmlFor="transactionDeletionPasswordCreate" className="text-xs">Password Hapus Transaksi (Opsional)</Label>
                        <div className="relative">
                        <KeyRound className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input 
                            id="transactionDeletionPasswordCreate" 
                            name="transactionDeletionPassword" 
                            type="password" 
                            value={branchForm.transactionDeletionPassword} 
                            onChange={(e) => handleBranchFormChange(e, setBranchForm)} 
                            placeholder="Kosongkan jika tidak diset" 
                            className="h-9 text-xs pl-8" 
                            disabled={isSubmittingBranch} 
                        />
                        </div>
                    </div>
                    <Button type="submit" size="sm" className="h-9 text-xs" disabled={isSubmittingBranch}>
                      {isSubmittingBranch ? "Membuat..." : "Buat Cabang"}
                    </Button>
                  </form>
                  <div>
                    <h3 className="text-sm font-medium mb-1.5 mt-4">Daftar Cabang Saat Ini</h3>
                    {loadingBranches ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : branches.length > 0 ? (
                      <div className="border rounded-md overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Nama Cabang</TableHead>
                              <TableHead className="text-xs hidden sm:table-cell">Nama di Invoice</TableHead>
                              <TableHead className="text-xs hidden md:table-cell">Mata Uang</TableHead>
                              <TableHead className="text-xs hidden md:table-cell">Pajak (%)</TableHead>
                              <TableHead className="text-xs hidden lg:table-cell">Pass. Hapus</TableHead>
                              <TableHead className="text-xs text-right">Aksi</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {branches.map((branch) => (
                              <TableRow key={branch.id}>
                                <TableCell className="text-xs py-2">{branch.name}</TableCell>
                                <TableCell className="text-xs py-2 hidden sm:table-cell">{branch.invoiceName || branch.name}</TableCell>
                                <TableCell className="text-xs py-2 hidden md:table-cell">{branch.currency || "IDR"}</TableCell>
                                <TableCell className="text-xs py-2 hidden md:table-cell">{branch.taxRate !== undefined ? branch.taxRate : 0}%</TableCell>
                                <TableCell className="text-xs py-2 hidden lg:table-cell">{branch.transactionDeletionPassword ? "Terpasang" : "Tidak Ada"}</TableCell>
                                <TableCell className="text-right py-2">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditModal(branch)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                    <span className="sr-only">Edit</span>
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => setBranchToDelete(branch)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span className="sr-only">Hapus</span>
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-xs">
                                          Tindakan ini akan menghapus cabang "{branchToDelete?.name}". Ini tidak dapat dibatalkan. Pengguna yang terhubung ke cabang ini mungkin perlu ditetapkan ulang.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="text-xs h-8" onClick={() => setBranchToDelete(null)}>Batal</AlertDialogCancel>
                                        <AlertDialogAction 
                                          className="text-xs h-8 bg-destructive hover:bg-destructive/90" 
                                          onClick={handleConfirmDeleteBranch}
                                          disabled={isDeletingBranch}
                                        >
                                          {isDeletingBranch ? "Menghapus..." : "Ya, Hapus"}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Belum ada cabang yang dibuat.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manage-users" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Kelola Pengguna</CardTitle>
                  <CardDescription className="text-xs">Lihat pengguna, tetapkan cabang, dan ubah peran.</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingUsers ? (
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                  ) : users.length > 0 ? (
                    <div className="border rounded-md overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Nama</TableHead>
                            <TableHead className="text-xs">Email</TableHead>
                            <TableHead className="text-xs">Peran</TableHead>
                            <TableHead className="text-xs">Cabang Saat Ini</TableHead>
                            <TableHead className="text-xs w-[180px]">Tetapkan Cabang</TableHead>
                            <TableHead className="text-xs w-[150px]">Tetapkan Peran</TableHead>
                            <TableHead className="text-xs text-right">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user) => {
                            const currentBranch = branches.find(b => b.id === user.branchId);
                            const currentBranchName = currentBranch ? currentBranch.name : (user.branchId ? "ID Cabang Tidak Valid" : "Belum Ditetapkan");
                            
                            return (
                              <TableRow key={user.uid}>
                                <TableCell className="text-xs py-2">{user.name}</TableCell>
                                <TableCell className="text-xs py-2">{user.email}</TableCell>
                                <TableCell className="text-xs py-2 capitalize">{user.role}</TableCell>
                                <TableCell className="text-xs py-2">{currentBranchName}</TableCell>
                                <TableCell className="text-xs py-2">
                                  <Select 
                                    value={userBranchChanges[user.uid] ?? "UNASSIGNED"}
                                    onValueChange={(value) => handleUserBranchChange(user.uid, value)}
                                    disabled={loadingBranches}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Pilih Cabang" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="UNASSIGNED" className="text-xs">Tidak Ada (Kosongkan)</SelectItem>
                                      {branches.map(branch => (
                                        <SelectItem key={branch.id} value={branch.id} className="text-xs">{branch.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-xs py-2">
                                  <Select
                                    value={userRoleChanges[user.uid] ?? user.role}
                                    onValueChange={(value) => handleUserRoleChange(user.uid, value)}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Pilih Peran" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="cashier" className="text-xs">Kasir</SelectItem>
                                      <SelectItem value="admin" className="text-xs">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-right py-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 text-xs" 
                                    onClick={() => handleUpdateUser(user.uid)}
                                    disabled={
                                        (userBranchChanges[user.uid] === user.branchId || (userBranchChanges[user.uid] === null && !user.branchId)) &&
                                        userRoleChanges[user.uid] === user.role
                                    }
                                    >
                                    Simpan
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Tidak ada pengguna yang terdaftar selain akun admin Anda.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Edit Branch Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Detail Cabang</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3 max-h-[70vh] overflow-y-auto pr-2">
               <div>
                  <Label htmlFor="editBranchName" className="text-xs">Nama Cabang Utama*</Label>
                  <Input id="editBranchName" name="name" value={editBranchForm.name} onChange={(e) => handleBranchFormChange(e, setEditBranchForm)} className="text-xs h-9" />
              </div>
              <div>
                  <Label htmlFor="editInvoiceName" className="text-xs">Nama di Invoice</Label>
                  <Input id="editInvoiceName" name="invoiceName" value={editBranchForm.invoiceName} onChange={(e) => handleBranchFormChange(e, setEditBranchForm)} className="text-xs h-9" />
              </div>
               <div>
                  <Label htmlFor="editCurrency" className="text-xs">Mata Uang</Label>
                  <Input id="editCurrency" name="currency" value={editBranchForm.currency} onChange={(e) => handleBranchFormChange(e, setEditBranchForm)} className="text-xs h-9" />
              </div>
               <div>
                  <Label htmlFor="editTaxRate" className="text-xs">Tarif Pajak (%)</Label>
                  <Input id="editTaxRate" name="taxRate" type="number" value={editBranchForm.taxRate} onChange={(e) => handleBranchFormChange(e, setEditBranchForm)} className="text-xs h-9" />
              </div>
               <div>
                  <Label htmlFor="editAddress" className="text-xs">Alamat</Label>
                  <Textarea id="editAddress" name="address" value={editBranchForm.address} onChange={(e) => handleBranchFormChange(e, setEditBranchForm)} className="text-xs min-h-[60px]" />
              </div>
               <div>
                  <Label htmlFor="editPhoneNumber" className="text-xs">Nomor Telepon</Label>
                  <Input id="editPhoneNumber" name="phoneNumber" value={editBranchForm.phoneNumber} onChange={(e) => handleBranchFormChange(e, setEditBranchForm)} className="text-xs h-9" />
              </div>
              <div>
                <Label htmlFor="transactionDeletionPasswordEdit" className="text-xs">Password Hapus Transaksi</Label>
                <div className="relative">
                <KeyRound className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input 
                    id="transactionDeletionPasswordEdit" 
                    name="transactionDeletionPassword" 
                    type="password" 
                    value={editBranchForm.transactionDeletionPassword} 
                    onChange={(e) => handleBranchFormChange(e, setEditBranchForm)} 
                    placeholder="Kosongkan untuk tidak mengubah" 
                    className="h-9 text-xs pl-8" 
                />
                </div>
                 <p className="text-xs text-muted-foreground mt-1">Kosongkan jika tidak ingin mengubah password yang sudah ada. Mengisi akan menimpa password lama.</p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="text-xs h-8">Batal</Button>
              </DialogClose>
              <Button onClick={handleUpdateBranch} className="text-xs h-8">Simpan Perubahan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </MainLayout>
    </ProtectedRoute>
  );
}
