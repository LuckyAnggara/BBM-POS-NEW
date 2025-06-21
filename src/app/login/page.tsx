// src/app/login/page.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { AppwriteException } from 'appwrite' // <-- Impor tipe error Appwrite
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const { login, loadingAuth: loading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Kita tidak lagi memerlukan state [error, setError]

  // 3. Fungsi untuk menangani error secara spesifik
  const handleLoginError = (error: unknown) => {
    let title = 'Login Gagal'
    let description =
      'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.'

    if (error instanceof AppwriteException) {
      switch (error.code) {
        case 401: // user_unauthorized / general_unauthorized
          description =
            'Kombinasi email dan password salah. Mohon periksa kembali.'
          break
        case 429: // rate_limit_exceeded
          description =
            'Terlalu banyak percobaan login. Silakan tunggu beberapa saat.'
          break
        default:
          description = error.message // Gunakan pesan default dari Appwrite jika ada
          break
      }
    }

    // Tampilkan notifikasi toast error
    toast.error(title, {
      description: description,
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    try {
      await login(email, password)

      // 4. Tampilkan notifikasi toast sukses
      toast.success('Login Berhasil!', {
        description: 'Anda akan diarahkan ke dashboard.',
      })

      router.push('/dashboard')
    } catch (err) {
      console.error('Login Error:', err)
      handleLoginError(err) // Panggil fungsi error handler kita
    }
  }

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950'>
      <Card className='mx-auto max-w-sm'>
        <CardHeader>
          <CardTitle className='text-2xl'>Login</CardTitle>
          <CardDescription>
            Masukkan email Anda di bawah untuk login ke akun Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Form tidak berubah, hanya saja tidak ada lagi <p> untuk error */}
          <form onSubmit={handleSubmit} className='grid gap-4'>
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
            <Button type='submit' className='w-full' disabled={loading}>
              {loading ? 'Memproses...' : 'Login'}
            </Button>
          </form>
          <div className='mt-4 text-center text-sm'>
            Belum punya akun?{' '}
            <Link href='/register' className='underline'>
              Daftar
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
