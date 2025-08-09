'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Building, Building2 } from 'lucide-react'

const loadingMessages = [
  'Memuat aplikasi...',
  'Menyiapkan sesi Anda...',
  'Mengautentikasi pengguna...',
  'Menghubungkan ke data...',
  'Hampir selesai...',
]

export default function HomePage() {
  const { currentUser, isLoading, isLoadingUserData } = useAuth()
  const router = useRouter()
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
    if (!isLoading) {
      setIsRedirecting(true) // Mulai tampilkan pesan pengalihan
      if (currentUser) {
        router.replace('/dashboard')
      } else {
        router.replace('/login')
      }
    }
  }, [currentUser, isLoadingUserData, router])

  if (!isLoadingUserData || isRedirecting) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4'>
        <Building2 className='h-16 w-16 text-primary animate-pulse mb-4' />
        <h1 className='text-2xl font-semibold font-headline mb-2'>
          Berkah Baja Makmur
        </h1>
        <p className='text-sm text-muted-foreground transition-opacity duration-500'>
          {isLoadingUserData
            ? loadingMessages[currentMessageIndex]
            : 'Mengarahkan Anda...'}
        </p>
      </div>
    )
  }

  // Fallback content, ideally never shown as user should be redirected quickly.
  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4'>
      <Building2 className='h-16 w-16 text-primary animate-pulse mb-4' />
      <h1 className='text-2xl font-semibold font-headline mb-2'>
        Berkah Baja Makmur
      </h1>
      <p className='text-sm text-muted-foreground'>Silakan tunggu...</p>
    </div>
  )
}
