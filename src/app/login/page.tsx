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
import { Building2, Eye, EyeOff, ArrowLeft, Sparkles, Shield, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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
  const [showPassword, setShowPassword] = useState(false)
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
  const handleLoginError = (error: any) => {
    let title = 'Login Gagal'
    let description =
      'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.'
    if (error.response) {
      switch (error.response.status) {
        case 401: // user_unauthorized / general_unauthorized
          description =
            'Kombinasi email dan password salah. Mohon periksa kembali.'
          break
        case 429: // rate_limit_exceeded
          description =
            'Terlalu banyak percobaan login. Silakan tunggu beberapa saat.'
          break
        default:
          description = error.response.message // Gunakan pesan default dari Appwrite jika ada
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
      await auth.login({ email, password })
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
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex'>
      {/* Left Side - Branding */}
      <div className='hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-teal-600 p-12 text-white relative overflow-hidden'>
        {/* Animated background elements */}
        <div className='absolute inset-0'>
          <div className='absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full animate-pulse'></div>
          <div className='absolute bottom-1/4 right-1/4 w-24 h-24 bg-white/10 rounded-full animate-pulse delay-1000'></div>
          <div className='absolute top-1/2 left-1/2 w-16 h-16 bg-white/10 rounded-full animate-bounce'></div>
        </div>
        
        <div className='relative z-10 flex flex-col justify-center'>
          <div className='flex items-center gap-3 mb-8'>
            <div className='relative'>
              <Building2 className='h-12 w-12 text-white' />
              <div className='absolute -top-1 -right-1 w-4 h-4 bg-teal-300 rounded-full animate-pulse'></div>
            </div>
            <div>
              <h1 className='text-3xl font-bold'>Mercato POS</h1>
              <Badge variant='secondary' className='mt-1 bg-white/20 text-white border-white/30'>
                v2.0
              </Badge>
            </div>
          </div>
          
          <h2 className='text-4xl font-bold mb-6 leading-tight'>
            Satu Platform,<br />
            Semua Cabang<br />
            <span className='text-teal-200'>Terkendali</span>
          </h2>
          
          <p className='text-lg text-blue-100 mb-8 leading-relaxed'>
            Kelola bisnis multi-cabang Anda dengan platform POS terdepan di Indonesia. 
            Real-time, cloud-based, dan mudah digunakan.
          </p>
          
          <div className='space-y-4'>
            <div className='flex items-center gap-3'>
              <div className='bg-white/20 rounded-full p-2'>
                <CheckCircle className='h-5 w-5' />
              </div>
              <span>Multi-branch management dalam satu dashboard</span>
            </div>
            <div className='flex items-center gap-3'>
              <div className='bg-white/20 rounded-full p-2'>
                <Shield className='h-5 w-5' />
              </div>
              <span>Data isolation untuk keamanan maksimal</span>
            </div>
            <div className='flex items-center gap-3'>
              <div className='bg-white/20 rounded-full p-2'>
                <Sparkles className='h-5 w-5' />
              </div>
              <span>Trial 30 hari gratis tanpa kartu kredit</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Side - Login Form */}
      <div className='flex-1 flex items-center justify-center p-8'>
        <div className='w-full max-w-md'>
          {/* Mobile Header */}
          <div className='lg:hidden text-center mb-8'>
            <Link href='/' className='inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6'>
              <ArrowLeft className='h-4 w-4' />
              Kembali ke Beranda
            </Link>
            
            <div className='flex items-center justify-center gap-3 mb-4'>
              <div className='relative'>
                <Building2 className='h-8 w-8 text-blue-600' />
                <div className='absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full animate-pulse'></div>
              </div>
              <h1 className='text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent'>
                Mercato POS
              </h1>
            </div>
          </div>
          
          <Card className='shadow-xl border-0'>
            <CardHeader className='text-center pb-6'>
              <CardTitle className='text-2xl font-bold'>Selamat Datang Kembali</CardTitle>
              <CardDescription className='text-base'>
                Masuk ke dashboard bisnis Anda untuk melanjutkan mengelola operasi
              </CardDescription>
            </CardHeader>
            
            <CardContent className='space-y-6'>
              <form onSubmit={handleSubmit} className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='email' className='text-sm font-semibold'>Email</Label>
                  <Input
                    id='email'
                    type='email'
                    placeholder='admin@bisnis.com'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={auth.isLoading}
                    className='h-12 text-base'
                    required
                  />
                </div>
                
                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <Label htmlFor='password' className='text-sm font-semibold'>Password</Label>
                    <Link href='/forgot-password' className='text-sm text-blue-600 hover:underline'>
                      Lupa password?
                    </Link>
                  </div>
                  <div className='relative'>
                    <Input
                      id='password'
                      type={showPassword ? 'text' : 'password'}
                      placeholder='Masukkan password Anda'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={auth.isLoading}
                      className='h-12 text-base pr-12'
                      required
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700'
                    >
                      {showPassword ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
                    </button>
                  </div>
                </div>
                
                <Button 
                  type='submit' 
                  className='w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white'
                  disabled={auth.isLoading}
                >
                  {auth.isLoading ? (
                    <div className='flex items-center gap-2'>
                      <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                      Memproses...
                    </div>
                  ) : (
                    'Masuk ke Dashboard'
                  )}
                </Button>
              </form>
              
              <div className='relative'>
                <div className='absolute inset-0 flex items-center'>
                  <div className='w-full border-t border-gray-200'></div>
                </div>
                <div className='relative flex justify-center text-sm'>
                  <span className='px-4 bg-white text-gray-500'>atau</span>
                </div>
              </div>
              
              <div className='text-center space-y-4'>
                <div className='text-sm text-gray-600'>
                  Belum punya akun bisnis?
                </div>
                <Button asChild variant='outline' className='w-full h-12 text-base border-2 border-blue-600 text-blue-600 hover:bg-blue-50'>
                  <Link href='/tenant/register'>
                    <Sparkles className='mr-2 h-5 w-5' />
                    Daftar Bisnis Gratis
                  </Link>
                </Button>
              </div>
              
              <div className='text-center pt-4'>
                <div className='text-xs text-gray-500'>
                  Dengan masuk, Anda menyetujui{' '}
                  <Link href='/terms' className='text-blue-600 hover:underline'>
                    Syarat & Ketentuan
                  </Link>{' '}
                  dan{' '}
                  <Link href='/privacy' className='text-blue-600 hover:underline'>
                    Kebijakan Privasi
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
