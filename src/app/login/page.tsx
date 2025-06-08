
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
import { signInWithEmail } from "@/lib/firebase/auth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Building } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "Format email tidak valid." }),
  password: z.string().min(6, { message: "Password minimal 6 karakter." }),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, loadingAuth } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setIsLoading(true);
    const result = await signInWithEmail(data.email, data.password);
    if ("error" in result && result.error) {
      let description = "Login gagal. Silakan coba lagi.";
      if (result.errorCode === "auth/invalid-credential" || 
          result.errorCode === "auth/user-not-found" || 
          result.errorCode === "auth/wrong-password") {
        description = "Email atau password salah. Silakan periksa kembali.";
      } else if (result.errorCode === "auth/invalid-email") {
        description = "Format email tidak valid.";
      } else if (result.errorCode === "auth/user-disabled") {
        description = "Akun ini telah dinonaktifkan.";
      } else {
        description = `Terjadi kesalahan: ${result.error}. Cek konsol untuk detail.`;
      }
      toast({
        title: "Login Gagal",
        description: description,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Login Berhasil",
        description: "Anda akan diarahkan ke dashboard.",
      });
      // AuthContext will handle redirect via useEffect
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
         <span className="text-xl font-semibold font-headline text-foreground">BranchWise</span>
       </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Selamat Datang Kembali!</CardTitle>
          <CardDescription className="text-center text-sm">
            Silakan masuk ke akun Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="contoh@email.com" {...register("email")} className="text-xs" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="********" {...register("password")} className="text-xs" />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full text-sm" disabled={isLoading}>
              {isLoading ? "Memproses..." : "Masuk"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col items-center text-xs">
          <p>
            Belum punya akun?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Daftar di sini
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
