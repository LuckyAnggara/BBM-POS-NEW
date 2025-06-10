
"use client";

import React, { useState } from "react";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Send } from "lucide-react";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { sendNotification, NOTIFICATION_CATEGORIES, type NotificationCategory, type AppNotificationInput } from "@/lib/firebase/notifications";
import { useRouter } from "next/navigation";

const notificationFormSchema = z.object({
  title: z.string().min(5, { message: "Judul minimal 5 karakter." }).max(100, { message: "Judul maksimal 100 karakter."}),
  message: z.string().min(10, { message: "Pesan minimal 10 karakter." }).max(500, { message: "Pesan maksimal 500 karakter."}),
  category: z.enum(NOTIFICATION_CATEGORIES, { required_error: "Kategori harus dipilih." }),
});

type NotificationFormValues = z.infer<typeof notificationFormSchema>;

export default function SendNotificationPage() {
  const { userData, currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);

  const notificationForm = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      title: "",
      message: "",
      category: undefined, // Atau set default category pertama jika ada
    },
  });

  const onSubmitNotification: SubmitHandler<NotificationFormValues> = async (values) => {
    if (!currentUser || !userData || userData.role !== 'admin') {
      toast({ title: "Akses Ditolak", description: "Anda tidak memiliki izin untuk mengirim notifikasi.", variant: "destructive" });
      return;
    }
    setIsSending(true);

    const notificationData: AppNotificationInput = {
      title: values.title,
      message: values.message,
      category: values.category,
      createdByUid: currentUser.uid,
      createdByName: userData.name || "Admin",
      isGlobal: true, // Semua notifikasi bersifat global untuk saat ini
    };

    const result = await sendNotification(notificationData);

    if (result && "error" in result) {
      toast({ title: "Gagal Mengirim Notifikasi", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Notifikasi Terkirim", description: `Notifikasi "${values.title}" berhasil dikirim.` });
      notificationForm.reset();
      router.push("/admin/notification-history"); // Arahkan ke riwayat setelah mengirim
    }
    setIsSending(false);
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
          <h1 className="text-xl md:text-2xl font-semibold font-headline">
            Kirim Notifikasi Baru
          </h1>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Buat dan Kirim Notifikasi Global</CardTitle>
              <CardDescription className="text-xs">
                Notifikasi ini akan dikirimkan ke semua pengguna aplikasi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={notificationForm.handleSubmit(onSubmitNotification)} className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-xs">Judul Notifikasi*</Label>
                  <Input 
                    id="title" 
                    {...notificationForm.register("title")} 
                    className="h-9 text-sm mt-1" 
                    placeholder="Contoh: Pembaruan Aplikasi Penting"
                    disabled={isSending}
                  />
                  {notificationForm.formState.errors.title && <p className="text-xs text-destructive mt-1">{notificationForm.formState.errors.title.message}</p>}
                </div>

                <div>
                  <Label htmlFor="category" className="text-xs">Kategori Notifikasi*</Label>
                  <Controller
                    name="category"
                    control={notificationForm.control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSending}>
                        <SelectTrigger className="h-9 text-xs mt-1">
                          <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                        <SelectContent>
                          {NOTIFICATION_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {notificationForm.formState.errors.category && <p className="text-xs text-destructive mt-1">{notificationForm.formState.errors.category.message}</p>}
                </div>

                <div>
                  <Label htmlFor="message" className="text-xs">Pesan Notifikasi*</Label>
                  <Textarea 
                    id="message" 
                    {...notificationForm.register("message")} 
                    className="text-sm mt-1 min-h-[120px]" 
                    placeholder="Tulis pesan notifikasi Anda di sini..."
                    disabled={isSending}
                  />
                  {notificationForm.formState.errors.message && <p className="text-xs text-destructive mt-1">{notificationForm.formState.errors.message.message}</p>}
                </div>
                
                <Button type="submit" className="text-sm h-9" disabled={isSending || !notificationForm.formState.isValid}>
                  {isSending ? "Mengirim..." : <><Send className="mr-2 h-4 w-4" /> Kirim Notifikasi</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
