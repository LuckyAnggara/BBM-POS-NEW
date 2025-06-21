// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { useForm, type SubmitHandler } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
// import { useAuth } from "@/contexts/auth-context";
// import { registerWithEmailAndPassword } from "@/lib/firebase/auth";
// import { useToast } from "@/hooks/use-toast";
// import Link from "next/link";
// import { Building } from "lucide-react";

// const registerSchema = z.object({
//   name: z.string().min(3, { message: "Nama minimal 3 karakter." }),
//   email: z.string().email({ message: "Format email tidak valid." }),
//   password: z.string().min(6, { message: "Password minimal 6 karakter." }),
// });

// type RegisterFormInputs = z.infer<typeof registerSchema>;

// export default function RegisterPage() {
//   const router = useRouter();
//   const { currentUser, loadingAuth } = useAuth();
//   const { toast } = useToast();
//   const [isLoading, setIsLoading] = useState(false);

//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//   } = useForm<RegisterFormInputs>({
//     resolver: zodResolver(registerSchema),
//   });

//   const onSubmit: SubmitHandler<RegisterFormInputs> = async (data) => {
//     setIsLoading(true);
//     const result = await registerWithEmailAndPassword(data.name, data.email, data.password);
//     if ("error" in result && result.error) {
//       let description = "Registrasi gagal. Silakan coba lagi.";
//       if (result.errorCode === "auth/email-already-in-use") {
//         description = "Email ini sudah terdaftar. Silakan gunakan email lain atau login.";
//       } else if (result.errorCode === "auth/weak-password") {
//         description = "Password terlalu lemah. Gunakan minimal 6 karakter.";
//       } else if (result.errorCode === "auth/invalid-email") {
//         description = "Format email tidak valid.";
//       } else if (result.errorCode === "auth/operation-not-allowed") {
//         description = "Metode pendaftaran ini tidak diizinkan. Hubungi administrator.";
//       } else {
//         // Fallback for other errors, including potentially permission issues from Firebase Rules
//         description = `Terjadi kesalahan: ${result.error}. Cek konsol untuk detail.`;
//       }
//       toast({
//         title: "Registrasi Gagal",
//         description: description,
//         variant: "destructive",
//       });
//     } else {
//       toast({
//         title: "Registrasi Berhasil",
//         description: "Akun Anda telah dibuat. Anda akan diarahkan ke dashboard.",
//       });
//       // AuthContext will handle redirect
//     }
//     setIsLoading(false);
//   };

//   if (loadingAuth) {
//     return <div className="flex h-screen items-center justify-center">Memuat...</div>;
//   }

//    if (currentUser) {
//     // This should ideally be handled by AuthContext's effect,
//     // but as a fallback or if AuthContext hasn't redirected yet.
//     // router.push('/dashboard');
//     return <div className="flex h-screen items-center justify-center">Mengarahkan ke dashboard...</div>;
//   }

//   return (
//     <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
//       <div className="absolute top-8 left-8 flex items-center gap-2">
//          <Building className="h-7 w-7 text-primary" />
//          <span className="text-xl font-semibold font-headline text-foreground">Berkah Baja Makmur</span>
//        </div>
//       <Card className="w-full max-w-md shadow-xl">
//         <CardHeader>
//           <CardTitle className="text-2xl font-bold text-center">Buat Akun Baru</CardTitle>
//           <CardDescription className="text-center text-sm">
//             Daftarkan diri Anda untuk mulai mengelola cabang.
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//             <div className="space-y-1.5">
//               <Label htmlFor="name">Nama Lengkap</Label>
//               <Input id="name" type="text" placeholder="Nama Anda" {...register("name")} className="text-xs"/>
//               {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
//             </div>
//             <div className="space-y-1.5">
//               <Label htmlFor="email">Email</Label>
//               <Input id="email" type="email" placeholder="contoh@email.com" {...register("email")} className="text-xs"/>
//               {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
//             </div>
//             <div className="space-y-1.5">
//               <Label htmlFor="password">Password</Label>
//               <Input id="password" type="password" placeholder="********" {...register("password")} className="text-xs"/>
//               {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
//             </div>
//             <Button type="submit" className="w-full text-sm" disabled={isLoading}>
//               {isLoading ? "Memproses..." : "Daftar"}
//             </Button>
//           </form>
//         </CardContent>
//         <CardFooter className="flex-col items-center text-xs">
//           <p>
//             Sudah punya akun?{" "}
//             <Link href="/login" className="font-medium text-primary hover:underline">
//               Masuk di sini
//             </Link>
//           </p>
//         </CardFooter>
//       </Card>
//     </div>
//   );
// }

// src/app/register/page.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AppwriteException } from 'appwrite'
import { toast } from 'sonner'

export default function RegisterPage() {
  const router = useRouter()
  const { currentUser, register, loadingAuth: loading } = useAuth() // <-- Gunakan hook useAuth kita
  // State untuk form input
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  // 3. Fungsi untuk menangani error registrasi
  const handleRegisterError = (error: unknown) => {
    let title = 'Registrasi Gagal'
    let description =
      'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.'

    if (error instanceof AppwriteException) {
      switch (error.code) {
        case 409: // user_already_exists
          description =
            'Email yang Anda masukkan sudah terdaftar. Silakan login.'
          break
        case 400: // user_password_invalid, ...
          if (error.message.toLowerCase().includes('password')) {
            description =
              'Password tidak valid. Harus memiliki minimal 8 karakter.'
          } else {
            description = 'Input tidak valid, mohon periksa kembali data Anda.'
          }
          break
        case 429: // rate_limit_exceeded
          description =
            'Terlalu banyak percobaan. Silakan tunggu beberapa saat.'
          break
        default:
          description = error.message
          break
      }
    }

    toast.error(title, {
      description: description,
    })
  }
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('') // Bersihkan error sebelumnya

    if (password.length < 8) {
      toast.warning('Password Terlalu Pendek', {
        description: 'Password harus terdiri dari minimal 8 karakter.',
      })
      return
    }
    setIsLoading(true)

    try {
      await register(name, email, password) // Panggil fungsi register dari AuthContext
      router.push('/dashboard') // Redirect ke dashboard setelah berhasil
    } catch (err) {
      handleRegisterError(err) // Panggil fungsi error handler kita
    } finally {
      setIsLoading(false)
    }
  }

  // if (loading) {
  //   return (
  //     <div className='flex h-screen items-center justify-center'>Memuat...</div>
  //   )
  // }

  if (currentUser) {
    // This should ideally be handled by AuthContext's effect,
    // but as a fallback or if AuthContext hasn't redirected yet.
    // router.push('/dashboard');
    return (
      <div className='flex h-screen items-center justify-center'>
        Mengarahkan ke dashboard...
      </div>
    )
  }

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950'>
      <Card className='mx-auto max-w-sm'>
        <CardHeader>
          <CardTitle className='text-xl'>Daftar Akun</CardTitle>
          <CardDescription>
            Masukkan informasi Anda untuk membuat akun baru
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='full-name'>Nama Lengkap</Label>
              <Input
                id='full-name'
                placeholder='John Doe'
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                type='email'
                placeholder='m@example.com'
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='password'>Password</Label>
              <Input
                id='password'
                type='password'
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && (
              <p className='text-sm font-medium text-red-500'>{error}</p>
            )}
            <Button type='submit' className='w-full' disabled={isLoading}>
              {isLoading ? 'Memproses...' : 'Buat Akun'}
            </Button>
          </form>
          <div className='mt-4 text-center text-sm'>
            Sudah punya akun?{' '}
            <Link href='/login' className='underline'>
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
