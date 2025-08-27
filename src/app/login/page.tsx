// src/app/login/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
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
import { Building2 } from 'lucide-react'

const loadingMessages = [
  'Memuat aplikasi...',
  'Menyiapkan sesi Anda...',
  'Cek sesi sebelumnya...',
  'Menghubungkan ke data...',
  'Hampir selesai...',
]

export default function LoginPage() {
  const { currentUser, isLoading, isLoadingUserData } = useAuth()
  const router = useRouter()
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentMessageIndex(
        (prevIndex) => (prevIndex + 1) % loadingMessages.length
      )
    }, 1000) // Ganti pesan setiap 1 detik

    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (currentUser) {
      router.replace('/dashboard')
    }
  }, [currentUser])

  // 3. Fungsi untuk menangani error secara spesifik
  const handleLoginError = (message: any) => {
    let title = 'Login Gagal'

    toast.error(title, {
      description: message,
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    try {
      await auth.login({ email, password })
      // 4. Tampilkan notifikasi toast sukses
      toast.success('Login Berhasil!', {
        description: 'Anda akan diarahkan ke dashboard.',
      })
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Login error:', error)
      handleLoginError(error.message)
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
                disabled={auth.isLoading}
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
                disabled={auth.isLoading}
              />
            </div>
            <Button type='submit' className='w-full' disabled={auth.isLoading}>
              {auth.isLoading ? 'Memproses...' : 'Login'}
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
