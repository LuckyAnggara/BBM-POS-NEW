
"use client";

import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { updateUserProfileData, changeUserPassword } from "@/lib/firebase/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, UserCircle, Image as ImageIcon, KeyRound, Printer } from "lucide-react";


const profileFormSchema = z.object({
  name: z.string().min(3, { message: "Nama minimal 3 karakter." }),
  avatarUrl: z.string().url({ message: "URL Avatar tidak valid." }).or(z.literal('')).optional(),
  localPrinterUrl: z.string().url({ message: "URL Printer Lokal tidak valid. Contoh: http://localhost:5000/print" }).or(z.literal('')).optional(),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Password saat ini harus diisi." }),
  newPassword: z.string().min(6, { message: "Password baru minimal 6 karakter." }),
  confirmPassword: z.string().min(6, { message: "Konfirmasi password minimal 6 karakter." }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Password baru dan konfirmasi password tidak cocok.",
  path: ["confirmPassword"],
});
type PasswordFormValues = z.infer<typeof passwordFormSchema>;


export default function AccountPage() {
  const { currentUser, userData, loadingAuth, loadingUserData, signOut, refreshAuthContextState } = useAuth();
  const { toast } = useToast();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      avatarUrl: "",
      localPrinterUrl: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (userData) {
      profileForm.reset({
        name: userData.name || "",
        avatarUrl: userData.avatarUrl || "",
        localPrinterUrl: userData.localPrinterUrl || "",
      });
    }
  }, [userData, profileForm]);

  const onProfileSubmit: SubmitHandler<ProfileFormValues> = async (values) => {
    setIsSavingProfile(true);
    const result = await updateUserProfileData({ // This function in firebase/auth.ts also updates firestore via updateUserAccountDetails
      name: values.name,
      avatarUrl: values.avatarUrl,
      localPrinterUrl: values.localPrinterUrl,
    });
    if (result.success) {
      toast({ title: "Profil Diperbarui", description: "Informasi profil Anda berhasil disimpan." });
      await refreshAuthContextState();
    } else {
      toast({ title: "Gagal Memperbarui Profil", description: result.error, variant: "destructive" });
    }
    setIsSavingProfile(false);
  };

  const onPasswordSubmit: SubmitHandler<PasswordFormValues> = async (values) => {
    setIsChangingPassword(true);
    const result = await changeUserPassword(values.currentPassword, values.newPassword);
    if (result.success) {
      toast({ title: "Password Diubah", description: "Password Anda berhasil diganti. Silakan login kembali." });
      passwordForm.reset();
      await signOut();
    } else {
      toast({ title: "Gagal Mengubah Password", description: result.error, variant: "destructive" });
    }
    setIsChangingPassword(false);
  };

  const userDisplayRole = userData?.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : "N/A";

  if (loadingAuth || loadingUserData) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/3" />
          <Card><CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader><CardContent><div className="flex items-center gap-4 mb-6"><Skeleton className="h-20 w-20 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-24" /></div></div><Skeleton className="h-10 w-full mb-3" /><Skeleton className="h-10 w-full" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader><CardContent><Skeleton className="h-10 w-full mb-3" /><Skeleton className="h-10 w-full mb-3" /><Skeleton className="h-10 w-full" /></CardContent></Card>
        </div>
      </MainLayout>
    );
  }

  if (!currentUser || !userData) {
    return <MainLayout><p>Silakan login untuk mengakses halaman ini.</p></MainLayout>;
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          <h1 className="text-xl md:text-2xl font-semibold font-headline">Pengaturan Akun Saya</h1>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center"><UserCircle className="mr-2 h-5 w-5 text-primary" /> Informasi Profil</CardTitle>
              <CardDescription className="text-xs">Lihat dan perbarui informasi profil Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-2">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profileForm.watch("avatarUrl") || userData.avatarUrl || `https://placehold.co/80x80.png?text=${userData.name.substring(0,1)}`} alt={userData.name} data-ai-hint="user avatar" />
                  <AvatarFallback>{userData.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">{userData.name}</p>
                  <p className="text-sm text-muted-foreground">{userData.email} ({userDisplayRole})</p>
                </div>
              </div>

              <Separator />

              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-3 pt-2">
                <div>
                  <Label htmlFor="name" className="text-xs">Nama Lengkap</Label>
                  <Input id="name" {...profileForm.register("name")} className="h-9 text-sm mt-1" />
                  {profileForm.formState.errors.name && <p className="text-xs text-destructive mt-1">{profileForm.formState.errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="avatarUrl" className="text-xs">URL Avatar</Label>
                  <div className="flex items-center gap-2 mt-1">
                     <ImageIcon className="h-4 w-4 text-muted-foreground" />
                     <Input id="avatarUrl" {...profileForm.register("avatarUrl")} placeholder="https://contoh.com/gambar.png" className="h-9 text-sm"/>
                  </div>
                  {profileForm.formState.errors.avatarUrl && <p className="text-xs text-destructive mt-1">{profileForm.formState.errors.avatarUrl.message}</p>}
                </div>
                <div>
                  <Label htmlFor="localPrinterUrl" className="text-xs">URL Printer Lokal (Dot Matrix)</Label>
                   <div className="flex items-center gap-2 mt-1">
                     <Printer className="h-4 w-4 text-muted-foreground" />
                     <Input id="localPrinterUrl" {...profileForm.register("localPrinterUrl")} placeholder="Contoh: http://localhost:5000/print" className="h-9 text-sm"/>
                  </div>
                  {profileForm.formState.errors.localPrinterUrl && <p className="text-xs text-destructive mt-1">{profileForm.formState.errors.localPrinterUrl.message}</p>}
                  <p className="text-xs text-muted-foreground mt-1">Isi jika Anda menggunakan aplikasi helper printer dot matrix lokal.</p>
                </div>
                <Button type="submit" size="sm" className="text-xs h-8" disabled={isSavingProfile}>
                  {isSavingProfile ? "Menyimpan..." : "Simpan Perubahan Profil"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center"><KeyRound className="mr-2 h-5 w-5 text-primary"/> Ubah Password</CardTitle>
              <CardDescription className="text-xs">Perbarui password akun Anda secara berkala untuk keamanan.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-3">
                <div>
                  <Label htmlFor="currentPasswordProfile" className="text-xs">Password Saat Ini</Label>
                  <div className="relative mt-1">
                    <Input id="currentPasswordProfile" type={showCurrentPassword ? "text" : "password"} {...passwordForm.register("currentPassword")} className="h-9 text-sm pr-10" />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && <p className="text-xs text-destructive mt-1">{passwordForm.formState.errors.currentPassword.message}</p>}
                </div>
                 <div>
                  <Label htmlFor="newPasswordProfile" className="text-xs">Password Baru</Label>
                   <div className="relative mt-1">
                    <Input id="newPasswordProfile" type={showNewPassword ? "text" : "password"} {...passwordForm.register("newPassword")} className="h-9 text-sm pr-10" />
                     <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowNewPassword(!showNewPassword)}>
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {passwordForm.formState.errors.newPassword && <p className="text-xs text-destructive mt-1">{passwordForm.formState.errors.newPassword.message}</p>}
                </div>
                <div>
                  <Label htmlFor="confirmPasswordProfile" className="text-xs">Konfirmasi Password Baru</Label>
                  <div className="relative mt-1">
                    <Input id="confirmPasswordProfile" type={showConfirmPassword ? "text" : "password"} {...passwordForm.register("confirmPassword")} className="h-9 text-sm pr-10" />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {passwordForm.formState.errors.confirmPassword && <p className="text-xs text-destructive mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>}
                </div>
                <Button type="submit" size="sm" className="text-xs h-8" disabled={isChangingPassword}>
                  {isChangingPassword ? "Mengubah..." : "Ubah Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
