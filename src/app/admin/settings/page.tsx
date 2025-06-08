
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createBranch as apiCreateBranch, getAllUsers as apiGetAllUsers, updateUserBranch as apiUpdateUserBranch, updateUserRole as apiUpdateUserRole } from "@/lib/firebase/firestore";
import type { UserData } from "@/contexts/auth-context";
import type { Branch } from "@/contexts/branch-context";
import { Skeleton } from "@/components/ui/skeleton";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function AdminSettingsPage() {
  const { userData, loadingAuth } = useAuth();
  const { branches, loadingBranches, refreshBranches } = useBranch();
  const router = useRouter();
  const { toast } = useToast();

  const [newBranchName, setNewBranchName] = useState("");
  const [users, setUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isSubmittingBranch, setIsSubmittingBranch] = useState(false);
  const [userBranchChanges, setUserBranchChanges] = useState<Record<string, string | null>>({});
  const [userRoleChanges, setUserRoleChanges] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loadingAuth && userData?.role !== "admin") {
      router.push("/dashboard"); // Redirect non-admins
    }
  }, [userData, loadingAuth, router]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const fetchedUsers = await apiGetAllUsers();
    setUsers(fetchedUsers);
    
    // Initialize local state for select dropdowns
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

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) {
      toast({ title: "Nama cabang kosong", description: "Silakan masukkan nama cabang.", variant: "destructive" });
      return;
    }
    setIsSubmittingBranch(true);
    const result = await apiCreateBranch(newBranchName);
    if ("error" in result) {
      toast({ title: "Gagal Membuat Cabang", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Cabang Berhasil Dibuat", description: `Cabang "${result.name}" telah ditambahkan.` });
      setNewBranchName("");
      await refreshBranches(); // Refresh global branch list
    }
    setIsSubmittingBranch(false);
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
    
    // Find original user data to compare
    const originalUser = users.find(u => u.uid === userId);
    if (!originalUser) return;

    let branchUpdated = false;
    let roleUpdated = false;

    if (newBranchId !== originalUser.branchId) {
      const branchResult = await apiUpdateUserBranch(userId, newBranchId);
      if (branchResult && "error" in branchResult) {
        toast({ title: "Gagal Update Cabang", description: branchResult.error, variant: "destructive" });
        return; // Stop if branch update fails
      }
      branchUpdated = true;
    }

    if (newRole !== originalUser.role) {
      const roleResult = await apiUpdateUserRole(userId, newRole);
      if (roleResult && "error" in roleResult) {
        toast({ title: "Gagal Update Peran", description: roleResult.error, variant: "destructive" });
        return; // Stop if role update fails
      }
      roleUpdated = true;
    }
    
    if (branchUpdated || roleUpdated) {
        toast({ title: "Pengguna Diperbarui", description: "Data pengguna berhasil diperbarui." });
        await fetchUsers(); // Refresh user list to show changes
    } else {
        toast({ title: "Tidak Ada Perubahan", description: "Tidak ada perubahan data untuk disimpan.", variant: "default" });
    }
  };


  if (loadingAuth || (userData && userData.role !== "admin")) {
    // Show loading or redirect if not admin (useEffect handles redirect)
    return <div className="flex h-screen items-center justify-center">Memuat data admin...</div>;
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          <h1 className="text-xl md:text-2xl font-semibold font-headline">Pengaturan Admin</h1>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Kelola Cabang</CardTitle>
              <CardDescription className="text-xs">Buat dan lihat daftar cabang yang tersedia.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleCreateBranch} className="flex items-end gap-3">
                <div className="flex-grow">
                  <Label htmlFor="branchName" className="text-xs">Nama Cabang Baru</Label>
                  <Input 
                    id="branchName" 
                    type="text" 
                    value={newBranchName} 
                    onChange={(e) => setNewBranchName(e.target.value)} 
                    placeholder="Contoh: Cabang Utama"
                    className="h-9 text-xs"
                    disabled={isSubmittingBranch}
                  />
                </div>
                <Button type="submit" size="sm" className="h-9 text-xs" disabled={isSubmittingBranch}>
                  {isSubmittingBranch ? "Membuat..." : "Buat Cabang"}
                </Button>
              </form>
              <div>
                <h3 className="text-sm font-medium mb-1.5">Daftar Cabang Saat Ini</h3>
                {loadingBranches ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : branches.length > 0 ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Nama Cabang</TableHead>
                          <TableHead className="text-xs">ID Cabang</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {branches.map((branch) => (
                          <TableRow key={branch.id}>
                            <TableCell className="text-xs py-2">{branch.name}</TableCell>
                            <TableCell className="text-xs py-2 text-muted-foreground">{branch.id}</TableCell>
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
                        const currentBranchName = user.branchId ? branches.find(b => b.id === user.branchId)?.name : "Belum Ditetapkan";
                        return (
                          <TableRow key={user.uid}>
                            <TableCell className="text-xs py-2">{user.name}</TableCell>
                            <TableCell className="text-xs py-2">{user.email}</TableCell>
                            <TableCell className="text-xs py-2 capitalize">{user.role}</TableCell>
                            <TableCell className="text-xs py-2">{currentBranchName || "Belum Ditetapkan"}</TableCell>
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
                                    (userBranchChanges[user.uid] === user.branchId || (userBranchChanges[user.uid] === null && user.branchId === null)) &&
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
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
