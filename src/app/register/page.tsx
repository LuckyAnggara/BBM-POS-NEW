
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { registerWithEmailAndPassword } from "@/lib/firebase/auth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Building } from "lucide-react";


const registerSchema = z.object({
  name: z.string().min(3, { message: "Nama minimal 3 karakter." }),
  email: z.string().email({ message: "Format email tidak valid." }),
  password: z.string().min(6, { message: "Password minimal 6 karakter." }),
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { currentUser, loadingAuth } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit: SubmitHandler<RegisterFormInputs> = async (data) => {
    setIsLoading(true);
    const result = await registerWithEmailAndPassword(data.name, data.email, data.password);
    if ("error" in result && result.error) {
      let description = "Registrasi gagal. Silakan coba lagi.";
      if (result.errorCode === "auth/email-already-in-use") {
        description = "Email ini sudah terdaftar. Silakan gunakan email lain atau login.";
      } else if (result.errorCode === "auth/weak-password") {
        description = "Password terlalu lemah. Gunakan minimal 6 karakter.";
      } else if (result.errorCode === "auth/invalid-email") {
        description = "Format email tidak valid.";
      } else if (result.errorCode === "auth/operation-not-allowed") {
        description = "Metode pendaftaran ini tidak diizinkan. Hubungi administrator.";
      } else {
        // Fallback for other errors, including potentially permission issues from Firebase Rules
        description = `Terjadi kesalahan: ${result.error}. Cek konsol untuk detail.`;
      }
      toast({
        title: "Registrasi Gagal",
        description: description,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Registrasi Berhasil",
        description: "Akun Anda telah dibuat. Anda akan diarahkan ke dashboard.",
      });
      // AuthContext will handle redirect
    }
    setIsLoading(false);
  };

  if (loadingAuth) {
    return <div className="flex h-screen items-center justify-center">Memuat...</div>;
  }

   if (currentUser) {
    // This should ideally be handled by AuthContext's effect,
    // but as a fallback or if AuthContext hasn't redirected yet.
    // router.push('/dashboard');
    return <div className="flex h-screen items-center justify-center">Mengarahkan ke dashboard...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-8 left-8 flex items-center gap-2">
         <Building className="h-7 w-7 text-primary" />
         <span className="text-xl font-semibold font-headline text-foreground">Berkah Baja Makmur</span>
       </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Buat Akun Baru</CardTitle>
          <CardDescription className="text-center text-sm">
            Daftarkan diri Anda untuk mulai mengelola cabang.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input id="name" type="text" placeholder="Nama Anda" {...register("name")} className="text-xs"/>
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="contoh@email.com" {...register("email")} className="text-xs"/>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="********" {...register("password")} className="text-xs"/>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full text-sm" disabled={isLoading}>
              {isLoading ? "Memproses..." : "Daftar"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col items-center text-xs">
          <p>
            Sudah punya akun?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Masuk di sini
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
