'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Store, 
  BarChart3, 
  Users, 
  Package, 
  CreditCard,
  Shield,
  Zap,
  Star,
  Check,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Clock,
  Globe,
  CheckCircle,
  PlayCircle,
  Sparkles,
  Target,
  ShoppingCart
} from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface PricingPlan {
  name: string
  display_name: string
  price: number
  price_yearly?: number
  currency: string
  description: string
  max_branches: string | number
  max_users: string | number
  features: string[]
  popular?: boolean
}

interface LandingData {
  message: string
  tagline: string
  features: string[]
  pricing_plans: PricingPlan[]
  stats: {
    total_businesses: number
    total_transactions: number
    uptime: string
  }
}

export default function HomePage() {
  const { currentUser, isLoadingUserData } = useAuth()
  const router = useRouter()
  const [landingData, setLandingData] = useState<LandingData | null>(null)
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isYearly, setIsYearly] = useState(false)
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  // Default pricing plans as fallback
  const defaultPricingPlans: PricingPlan[] = [
    {
      name: 'paket-startup',
      display_name: 'Paket Startup',
      price: 199000,
      price_yearly: 1990000,
      currency: 'IDR',
      description: 'Ideal untuk bisnis kecil',
      max_branches: '1',
      max_users: '2',
      features: [
        '1 Lokasi/Cabang',
        '2 Kasir/User',
        'Fitur Kasir',
        'Laporan Penjualan',
        'Manajemen Stok',
        'Support via Chat'
      ],
      popular: false
    },
    {
      name: 'paket-growth',
      display_name: 'Paket Growth',
      price: 399000,
      price_yearly: 3990000,
      currency: 'IDR', 
      description: 'Terpopuler untuk bisnis berkembang',
      max_branches: '3',
      max_users: 'unlimited',
      features: [
        '3 Lokasi/Cabang',
        'Unlimited Kasir/User',
        'Multi-Cabang Sync',
        'Analisis Penjualan',
        'Customer Management',
        'Priority Support'
      ],
      popular: true
    },
    {
      name: 'paket-pro',
      display_name: 'Paket Pro',
      price: 799000,
      price_yearly: 7990000,
      currency: 'IDR',
      description: 'Untuk bisnis besar dan enterprise',
      max_branches: 'unlimited',
      max_users: 'unlimited',
      features: [
        'Unlimited Lokasi/Cabang',
        'Unlimited Kasir/User',
        'Advanced Analytics',
        'Custom Integrations',
        'Dedicated Support',
        'API Access'
      ],
      popular: false
    }
  ]

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoadingUserData && currentUser) {
      router.replace('/dashboard')
    }
  }, [currentUser, isLoadingUserData, router])

  // Fetch landing data from backend with fallback to marketing kit data
  useEffect(() => {
    const fetchLandingData = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/landing')
        if (response.ok) {
          const data = await response.json()
          setLandingData(data)
          setPricingPlans(data.pricing_plans)
        } else {
          // Use default marketing kit data if API fails
          const defaultData: LandingData = {
            message: 'Welcome to Mercato POS',
            tagline: 'Satu platform, semua cabang terkendali.',
            features: [
              'Advanced Point of Sale System',
              'Multi-Branch Management', 
              'Inventory Management',
              'Financial Management',
              'Customer & Supplier Management',
              'Advanced Reporting & Analytics'
            ],
            pricing_plans: defaultPricingPlans,
            stats: {
              total_businesses: 500,
              total_transactions: 1000000,
              uptime: '99.9%'
            }
          }
          setLandingData(defaultData)
          setPricingPlans(defaultPricingPlans)
        }
      } catch (error) {
        console.error('Failed to fetch landing data:', error)
        // Use default marketing kit data if API fails
        const defaultData: LandingData = {
          message: 'Welcome to Mercato POS',
          tagline: 'Satu platform, semua cabang terkendali.',
          features: [
            'Advanced Point of Sale System',
            'Multi-Branch Management', 
            'Inventory Management',
            'Financial Management',
            'Customer & Supplier Management',
            'Advanced Reporting & Analytics'
          ],
          pricing_plans: defaultPricingPlans,
          stats: {
            total_businesses: 500,
            total_transactions: 1000000,
            uptime: '99.9%'
          }
        }
        setLandingData(defaultData)
        setPricingPlans(defaultPricingPlans)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchLandingData()
  }, [])

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/landing/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      })
      
      if (response.ok) {
        toast.success('Pesan berhasil dikirim!')
        setContactForm({ name: '', email: '', subject: '', message: '' })
      } else {
        toast.error('Gagal mengirim pesan. Silakan coba lagi.')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan. Silakan coba lagi.')
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(price)
  }

  // Show loading or redirect screen for authenticated users
  if (isLoadingUserData || currentUser) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 text-foreground p-4'>
        <div className='relative'>
          <Building2 className='h-16 w-16 text-primary animate-bounce mb-4' />
          <div className='absolute -top-2 -right-2 w-6 h-6 bg-teal-500 rounded-full animate-ping'></div>
        </div>
        <h1 className='text-2xl font-bold font-headline mb-2 bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent'>
          Mercato POS
        </h1>
        <p className='text-sm text-muted-foreground animate-pulse'>
          {isLoadingUserData ? 'Memuat aplikasi...' : 'Mengarahkan ke dashboard...'}
        </p>
        <div className='mt-4 flex space-x-1'>
          <div className='w-2 h-2 bg-blue-500 rounded-full animate-bounce'></div>
          <div className='w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-75'></div>
          <div className='w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150'></div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50'>
      {/* Navigation */}
      <nav className='border-b bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/70 sticky top-0 z-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <div className='relative'>
              <Building2 className='h-8 w-8 text-blue-600' />
              <div className='absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full animate-pulse'></div>
            </div>
            <span className='text-xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent'>
              Mercato POS
            </span>
            <Badge variant='secondary' className='ml-2 animate-pulse'>
              v2.0
            </Badge>
          </div>
          
          <div className='hidden md:flex items-center space-x-6'>
            <Link href='#pricing' className='text-sm font-medium hover:text-blue-600 transition-colors'>
              Harga
            </Link>
            <Link href='#features' className='text-sm font-medium hover:text-blue-600 transition-colors'>
              Fitur
            </Link>
            <Link href='#demo' className='text-sm font-medium hover:text-blue-600 transition-colors'>
              Demo
            </Link>
            <Link href='#contact' className='text-sm font-medium hover:text-blue-600 transition-colors'>
              Kontak
            </Link>
          </div>
          
          <div className='flex items-center space-x-3'>
            <Button asChild variant='ghost' size='sm' className='hover:bg-blue-50'>
              <Link href='/login'>Masuk</Link>
            </Button>
            <Button asChild size='sm' className='bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white shadow-lg animate-pulse'>
              <Link href='/tenant/register'>
                Coba Gratis
                <Sparkles className='ml-2 h-4 w-4' />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className='py-24 px-4 overflow-hidden relative'>
        {/* Animated background elements */}
        <div className='absolute inset-0 overflow-hidden'>
          <div className='absolute top-1/4 left-1/4 w-64 h-64 bg-blue-200 rounded-full opacity-20 animate-pulse'></div>
          <div className='absolute bottom-1/4 right-1/4 w-48 h-48 bg-teal-200 rounded-full opacity-20 animate-pulse delay-1000'></div>
          <div className='absolute top-1/2 left-1/2 w-32 h-32 bg-purple-200 rounded-full opacity-20 animate-bounce'></div>
        </div>
        
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10'>
          <Badge className='mb-6 animate-bounce bg-gradient-to-r from-blue-100 to-teal-100 text-blue-800 border-blue-200' variant='secondary'>
            <Sparkles className='w-4 h-4 mr-2 animate-spin' />
            Platform POS Multi-Cabang Terdepan di Indonesia
          </Badge>
          
          <h1 className='text-5xl md:text-7xl font-bold mb-8 leading-tight'>
            <span className='bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent animate-pulse'>
              Satu Platform,
            </span>
            <br />
            <span className='bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 bg-clip-text text-transparent'>
              Semua Cabang
            </span>
            <br />
            <span className='text-2xl md:text-4xl text-gray-700'>Terkendali</span>
          </h1>
          
          <p className='text-xl md:text-2xl text-gray-600 mb-10 max-w-4xl mx-auto leading-relaxed'>
            Revolusioner dalam manajemen bisnis multi-cabang. Kelola POS, inventory, keuangan, 
            dan laporan dari satu dashboard yang powerful. 
            <span className='font-semibold text-blue-600'>Mulai gratis 30 hari!</span>
          </p>
          
          <div className='flex flex-col sm:flex-row gap-6 justify-center mb-16'>
            <Button asChild size='lg' className='text-lg px-10 py-4 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white shadow-xl transform hover:scale-105 transition-all duration-300'>
              <Link href='/tenant/register'>
                <PlayCircle className='mr-3 h-6 w-6' />
                Mulai Gratis 30 Hari
                <ArrowRight className='ml-3 h-6 w-6 animate-bounce' />
              </Link>
            </Button>
            <Button asChild variant='outline' size='lg' className='text-lg px-10 py-4 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 transform hover:scale-105 transition-all duration-300'>
              <Link href='#demo'>
                <PlayCircle className='mr-3 h-6 w-6' />
                Tonton Demo Live
              </Link>
            </Button>
          </div>
          
          {/* Social Proof */}
          <div className='grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto'>
            <div className='text-center transform hover:scale-110 transition-transform duration-300'>
              <div className='text-4xl font-bold text-blue-600 mb-2 animate-pulse'>
                {landingData?.stats.total_businesses || 500}+
              </div>
              <div className='text-gray-600'>Bisnis Terdaftar</div>
              <div className='flex justify-center mt-2'>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className='w-4 h-4 text-yellow-400 fill-current' />
                ))}
              </div>
            </div>
            <div className='text-center transform hover:scale-110 transition-transform duration-300'>
              <div className='text-4xl font-bold text-teal-600 mb-2 animate-pulse'>
                {landingData?.stats.total_transactions ? 
                  (landingData.stats.total_transactions >= 1000000 ? '1M+' : `${Math.floor(landingData.stats.total_transactions / 1000)}K+`) 
                  : '1M+'
                }
              </div>
              <div className='text-gray-600'>Transaksi Diproses</div>
              <TrendingUp className='w-6 h-6 text-green-500 mx-auto mt-2 animate-bounce' />
            </div>
            <div className='text-center transform hover:scale-110 transition-transform duration-300'>
              <div className='text-4xl font-bold text-purple-600 mb-2 animate-pulse'>
                {landingData?.stats.uptime || '99.9%'}
              </div>
              <div className='text-gray-600'>Uptime Terjamin</div>
              <Shield className='w-6 h-6 text-blue-500 mx-auto mt-2' />
            </div>
            <div className='text-center transform hover:scale-110 transition-transform duration-300'>
              <div className='text-4xl font-bold text-green-600 mb-2 animate-pulse'>24/7</div>
              <div className='text-gray-600'>Support Ready</div>
              <Clock className='w-6 h-6 text-blue-500 mx-auto mt-2 animate-spin' />
            </div>
          </div>
        </div>
      </section>

      {/* Demo Video Section */}
      <section id='demo' className='py-20 px-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white'>
        <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
          <h2 className='text-4xl md:text-5xl font-bold mb-6'>
            Lihat Mercato POS Bekerja
          </h2>
          <p className='text-xl mb-12 max-w-3xl mx-auto'>
            Saksikan bagaimana ribuan bisnis menggunakan Mercato POS untuk mengoptimalkan operasi mereka
          </p>
          
          <div className='relative max-w-4xl mx-auto'>
            <div className='bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20'>
              <div className='aspect-video bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-all duration-300 cursor-pointer group'>
                <PlayCircle className='w-24 h-24 text-white group-hover:scale-110 transition-transform duration-300' />
              </div>
              <div className='mt-6'>
                <h3 className='text-xl font-semibold mb-2'>Demo Komprehensif - 5 Menit</h3>
                <p className='text-white/80'>Pelajari semua fitur utama dan cara kerja sistem</p>
              </div>
            </div>
          </div>
          
          <div className='grid grid-cols-1 md:grid-cols-3 gap-8 mt-16'>
            <div className='text-center transform hover:scale-105 transition-transform duration-300'>
              <div className='bg-white/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4'>
                <Target className='w-8 h-8' />
              </div>
              <h3 className='text-lg font-semibold mb-2'>Setup Cepat</h3>
              <p className='text-white/80'>Siap digunakan dalam 15 menit</p>
            </div>
            <div className='text-center transform hover:scale-105 transition-transform duration-300'>
              <div className='bg-white/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4'>
                <Globe className='w-8 h-8' />
              </div>
              <h3 className='text-lg font-semibold mb-2'>Cloud-Based</h3>
              <p className='text-white/80'>Akses dari mana saja, kapan saja</p>
            </div>
            <div className='text-center transform hover:scale-105 transition-transform duration-300'>
              <div className='bg-white/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4'>
                <CheckCircle className='w-8 h-8' />
              </div>
              <h3 className='text-lg font-semibold mb-2'>Dukungan Penuh</h3>
              <p className='text-white/80'>Training dan implementasi gratis</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id='features' className='py-24 px-4 bg-white'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-20'>
            <Badge className='mb-4 bg-blue-100 text-blue-800' variant='secondary'>
              Fitur Terlengkap
            </Badge>
            <h2 className='text-4xl md:text-5xl font-bold mb-6'>
              <span className='bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent'>
                Semua yang Anda Butuhkan
              </span>
              <br />
              dalam Satu Platform
            </h2>
            <p className='text-xl text-gray-600 max-w-3xl mx-auto'>
              Dari POS hingga analytics, inventory hingga payroll - Mercato POS mengintegrasikan 
              seluruh operasi bisnis Anda
            </p>
          </div>
          
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {[
              {
                icon: ShoppingCart,
                title: 'Smart POS System',
                description: 'Interface intuitif dengan support multi-payment: cash, card, e-wallet, dan credit terms',
                color: 'bg-blue-500',
                features: ['Multi-payment processing', 'Discount & voucher system', 'Receipt printing', 'Customer integration']
              },
              {
                icon: Package,
                title: 'Inventory Management',
                description: 'Real-time stock tracking dengan automated purchase orders dan supplier management',
                color: 'bg-teal-500',
                features: ['Real-time stock tracking', 'Automated reorder points', 'Supplier management', 'Stock movement reports']
              },
              {
                icon: Building2,
                title: 'Multi-Branch Control',
                description: 'Kelola semua cabang dari satu dashboard dengan data isolation yang aman',
                color: 'bg-purple-500',
                features: ['Centralized management', 'Branch-specific settings', 'Cross-branch reporting', 'Data isolation']
              },
              {
                icon: BarChart3,
                title: 'Advanced Analytics',
                description: 'Dashboard real-time dengan insights mendalam untuk decision making yang lebih baik',
                color: 'bg-green-500',
                features: ['Real-time dashboards', 'Profit & loss reports', 'Sales trends analysis', 'Custom reporting']
              },
              {
                icon: Users,
                title: 'Employee Management',
                description: 'Kelola tim, shift, payroll, dan performance tracking dengan sistem role-based access',
                color: 'bg-orange-500',
                features: ['Shift management', 'Role-based access', 'Payroll integration', 'Performance tracking']
              },
              {
                icon: CreditCard,
                title: 'Financial Management',
                description: 'Accounts payable/receivable, expense tracking, dan integrasi dengan sistem akuntansi',
                color: 'bg-pink-500',
                features: ['A/P & A/R management', 'Expense tracking', 'Tax calculations', 'Accounting integration']
              }
            ].map((feature, index) => (
              <Card key={index} className='group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2'>
                <CardHeader className='text-center pb-4'>
                  <div className={`${feature.color} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className='h-8 w-8 text-white' />
                  </div>
                  <CardTitle className='text-xl mb-3'>{feature.title}</CardTitle>
                  <CardDescription className='text-base'>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className='space-y-2'>
                    {feature.features.map((item, featureIndex) => (
                      <li key={featureIndex} className='flex items-center gap-3 text-sm'>
                        <CheckCircle className='h-4 w-4 text-green-500 flex-shrink-0' />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className='text-center mt-16'>
            <Button asChild size='lg' className='bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white px-8'>
              <Link href='/tenant/register'>
                Jelajahi Semua Fitur
                <ArrowRight className='ml-2 h-5 w-5' />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id='pricing' className='py-24 px-4 bg-gradient-to-br from-gray-50 to-blue-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-20'>
            <Badge className='mb-4 bg-teal-100 text-teal-800' variant='secondary'>
              Harga Transparan
            </Badge>
            <h2 className='text-4xl md:text-5xl font-bold mb-6'>
              <span className='bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent'>
                Paket Harga yang
              </span>
              <br />
              Fleksibel & Adil
            </h2>
            <p className='text-xl text-gray-600 mb-8 max-w-3xl mx-auto'>
              Tanpa biaya tersembunyi, tanpa biaya transaksi, tanpa kontrak jangka panjang.
              Bayar sesuai yang Anda gunakan.
            </p>
            
            <div className='flex items-center justify-center gap-6 mb-12'>
              <span className={`text-lg font-semibold transition-colors ${!isYearly ? 'text-blue-600' : 'text-gray-500'}`}>
                Bulanan
              </span>
              <div className='relative'>
                <Button
                  variant='outline'
                  size='lg'
                  onClick={() => setIsYearly(!isYearly)}
                  className={`h-8 w-16 p-0 border-2 transition-all duration-300 ${
                    isYearly ? 'border-teal-500 bg-teal-500' : 'border-gray-300 bg-white'
                  }`}
                >
                  <div className={`h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
                    isYearly ? 'translate-x-8' : 'translate-x-0'
                  }`} />
                </Button>
              </div>
              <span className={`text-lg font-semibold transition-colors ${isYearly ? 'text-teal-600' : 'text-gray-500'}`}>
                Tahunan
                <Badge className='ml-3 bg-green-100 text-green-800 animate-pulse' variant='secondary'>
                  Hemat 20%
                </Badge>
              </span>
            </div>
          </div>
          
          <div className='grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto'>
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative border-2 transition-all duration-500 hover:shadow-2xl transform hover:-translate-y-4 ${
                plan.popular 
                  ? 'border-blue-500 shadow-2xl scale-105 bg-gradient-to-br from-blue-50 to-teal-50' 
                  : 'border-gray-200 hover:border-blue-300 bg-white'
              }`}>
                {plan.popular && (
                  <>
                    <Badge className='absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-teal-600 text-white px-6 py-2 text-sm animate-bounce'>
                      ⭐ Paling Populer
                    </Badge>
                    <div className='absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-spin'>
                      <Sparkles className='w-5 h-5 text-white m-1.5' />
                    </div>
                  </>
                )}
                
                <CardHeader className='text-center pb-8 pt-8'>
                  <CardTitle className='text-2xl mb-2'>{plan.display_name}</CardTitle>
                  <CardDescription className='text-base mb-6'>{plan.description}</CardDescription>
                  <div className='mb-6'>
                    <div className='flex items-baseline justify-center mb-2'>
                      <span className='text-5xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent'>
                        {formatPrice(isYearly && plan.price_yearly ? Math.floor(plan.price_yearly / 12) : plan.price)}
                      </span>
                      <span className='text-gray-500 ml-2'>/bulan</span>
                    </div>
                    {isYearly && (
                      <div className='text-sm text-green-600 font-semibold'>
                        Hemat {formatPrice(plan.price * 12 - (plan.price_yearly || plan.price * 12))} per tahun
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className='space-y-6'>
                  <div className='space-y-4'>
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className='flex items-start gap-3'>
                        <CheckCircle className='h-5 w-5 text-green-500 flex-shrink-0 mt-0.5' />
                        <span className='text-sm leading-relaxed'>{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className='pt-6 border-t space-y-3'>
                    <div className='flex items-center gap-3 text-sm text-gray-600'>
                      <Building2 className='h-4 w-4 text-blue-500' />
                      <span><strong>{plan.max_branches}</strong> Cabang</span>
                    </div>
                    <div className='flex items-center gap-3 text-sm text-gray-600'>
                      <Users className='h-4 w-4 text-teal-500' />
                      <span><strong>{plan.max_users}</strong> Pengguna per cabang</span>
                    </div>
                  </div>
                  
                  <Button 
                    asChild 
                    className={`w-full py-6 text-lg font-semibold transition-all duration-300 ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl' 
                        : 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
                    }`} 
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    <Link href='/tenant/register'>
                      {plan.popular ? 'Mulai Sekarang' : 'Pilih Paket'}
                      <ArrowRight className='ml-2 h-5 w-5' />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className='text-center mt-16'>
            <p className='text-gray-600 mb-6'>Butuh lebih banyak cabang atau fitur khusus?</p>
            <Button asChild variant='outline' size='lg' className='border-2 border-blue-600 text-blue-600 hover:bg-blue-50'>
              <Link href='#contact'>
                Konsultasi Gratis untuk Enterprise
                <ArrowRight className='ml-2 h-5 w-5' />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id='contact' className='py-24 px-4 bg-white'>
        <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-20'>
            <Badge className='mb-4 bg-purple-100 text-purple-800' variant='secondary'>
              Hubungi Kami
            </Badge>
            <h2 className='text-4xl md:text-5xl font-bold mb-6'>
              <span className='bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent'>
                Siap Membantu
              </span>
              <br />
              Kesuksesan Bisnis Anda
            </h2>
            <p className='text-xl text-gray-600 max-w-3xl mx-auto'>
              Tim expert kami siap membantu implementasi dan mengoptimalkan operasi bisnis Anda. 
              Konsultasi gratis tersedia!
            </p>
          </div>
          
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-16'>
            <div className='space-y-8'>
              <div className='flex items-start gap-6 p-6 bg-blue-50 rounded-2xl transform hover:scale-105 transition-transform duration-300'>
                <div className='bg-blue-500 rounded-2xl p-4'>
                  <Phone className='h-8 w-8 text-white' />
                </div>
                <div>
                  <h3 className='text-xl font-semibold mb-2 text-blue-900'>Telepon & WhatsApp</h3>
                  <p className='text-blue-700 text-lg font-medium'>+62 812 3456 7890</p>
                  <p className='text-blue-600 text-sm'>Senin - Jumat: 09:00 - 18:00 WIB</p>
                </div>
              </div>
              
              <div className='flex items-start gap-6 p-6 bg-teal-50 rounded-2xl transform hover:scale-105 transition-transform duration-300'>
                <div className='bg-teal-500 rounded-2xl p-4'>
                  <Mail className='h-8 w-8 text-white' />
                </div>
                <div>
                  <h3 className='text-xl font-semibold mb-2 text-teal-900'>Email Support</h3>
                  <p className='text-teal-700 text-lg font-medium'>support@mercatopos.com</p>
                  <p className='text-teal-600 text-sm'>Response time: &lt; 2 jam (hari kerja)</p>
                </div>
              </div>
              
              <div className='flex items-start gap-6 p-6 bg-purple-50 rounded-2xl transform hover:scale-105 transition-transform duration-300'>
                <div className='bg-purple-500 rounded-2xl p-4'>
                  <MapPin className='h-8 w-8 text-white' />
                </div>
                <div>
                  <h3 className='text-xl font-semibold mb-2 text-purple-900'>Kantor Pusat</h3>
                  <p className='text-purple-700 text-lg font-medium'>Jakarta Selatan</p>
                  <p className='text-purple-600 text-sm'>
                    Jl. Sudirman No. 123<br />
                    Jakarta Pusat, 10110
                  </p>
                </div>
              </div>
              
              <div className='bg-gradient-to-r from-blue-600 to-teal-600 text-white p-8 rounded-2xl'>
                <h3 className='text-xl font-semibold mb-4'>🎯 Konsultasi Gratis untuk Enterprise</h3>
                <p className='mb-6'>
                  Jadwalkan demo khusus dan konsultasi implementasi dengan tim expert kami. 
                  Termasuk analisis kebutuhan bisnis dan ROI calculation.
                </p>
                <Button asChild variant='secondary' size='lg' className='bg-white text-blue-600 hover:bg-blue-50'>
                  <Link href='/demo-enterprise'>
                    Jadwalkan Demo Enterprise
                    <ArrowRight className='ml-2 h-5 w-5' />
                  </Link>
                </Button>
              </div>
            </div>
            
            <Card className='border-0 shadow-2xl'>
              <CardHeader>
                <CardTitle className='text-2xl text-center'>Kirim Pesan</CardTitle>
                <CardDescription className='text-center text-base'>
                  Kirimkan pertanyaan Anda dan tim kami akan merespons dalam 24 jam
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleContactSubmit} className='space-y-6'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <label className='text-sm font-semibold text-gray-700 mb-2 block'>Nama Lengkap *</label>
                      <Input
                        value={contactForm.name}
                        onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                        placeholder='Nama Anda'
                        className='h-12'
                        required
                      />
                    </div>
                    <div>
                      <label className='text-sm font-semibold text-gray-700 mb-2 block'>Email *</label>
                      <Input
                        type='email'
                        value={contactForm.email}
                        onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                        placeholder='email@perusahaan.com'
                        className='h-12'
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className='text-sm font-semibold text-gray-700 mb-2 block'>Subjek *</label>
                    <Input
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({...contactForm, subject: e.target.value})}
                      placeholder='Topik pertanyaan Anda'
                      className='h-12'
                      required
                    />
                  </div>
                  
                  <div>
                    <label className='text-sm font-semibold text-gray-700 mb-2 block'>Pesan *</label>
                    <Textarea
                      rows={6}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                      placeholder='Ceritakan tentang bisnis Anda dan bagaimana kami bisa membantu...'
                      className='resize-none'
                      required
                    />
                  </div>
                  
                  <Button 
                    type='submit' 
                    className='w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-semibold'
                  >
                    Kirim Pesan
                    <ArrowRight className='ml-2 h-5 w-5' />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='border-t bg-gray-900 text-white py-16 px-4'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-12 mb-12'>
            <div>
              <div className='flex items-center space-x-3 mb-6'>
                <div className='relative'>
                  <Building2 className='h-8 w-8 text-blue-400' />
                  <div className='absolute -top-1 -right-1 w-3 h-3 bg-teal-400 rounded-full animate-pulse'></div>
                </div>
                <span className='text-xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent'>
                  Mercato POS
                </span>
              </div>
              <p className='text-gray-400 leading-relaxed mb-4'>
                Platform POS terdepan untuk bisnis multi-cabang di Indonesia. 
                Revolusioner dalam manajemen operasi retail modern.
              </p>
              <div className='flex space-x-4'>
                <div className='w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors cursor-pointer'>
                  <span className='text-sm font-bold'>f</span>
                </div>
                <div className='w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center hover:bg-blue-500 transition-colors cursor-pointer'>
                  <span className='text-sm font-bold'>t</span>
                </div>
                <div className='w-10 h-10 bg-blue-800 rounded-full flex items-center justify-center hover:bg-blue-900 transition-colors cursor-pointer'>
                  <span className='text-sm font-bold'>in</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className='font-bold text-lg mb-6 text-blue-400'>Produk</h3>
              <ul className='space-y-3 text-gray-400'>
                <li><Link href='#features' className='hover:text-white transition-colors'>Fitur Lengkap</Link></li>
                <li><Link href='#pricing' className='hover:text-white transition-colors'>Harga</Link></li>
                <li><Link href='#demo' className='hover:text-white transition-colors'>Demo Live</Link></li>
                <li><Link href='/integrations' className='hover:text-white transition-colors'>Integrasi</Link></li>
                <li><Link href='/api' className='hover:text-white transition-colors'>API</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className='font-bold text-lg mb-6 text-teal-400'>Dukungan</h3>
              <ul className='space-y-3 text-gray-400'>
                <li><Link href='#contact' className='hover:text-white transition-colors'>Hubungi Kami</Link></li>
                <li><Link href='/help' className='hover:text-white transition-colors'>Pusat Bantuan</Link></li>
                <li><Link href='/docs' className='hover:text-white transition-colors'>Dokumentasi</Link></li>
                <li><Link href='/training' className='hover:text-white transition-colors'>Training</Link></li>
                <li><Link href='/status' className='hover:text-white transition-colors'>System Status</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className='font-bold text-lg mb-6 text-purple-400'>Perusahaan</h3>
              <ul className='space-y-3 text-gray-400'>
                <li><Link href='/about' className='hover:text-white transition-colors'>Tentang Kami</Link></li>
                <li><Link href='/careers' className='hover:text-white transition-colors'>Karir</Link></li>
                <li><Link href='/privacy' className='hover:text-white transition-colors'>Kebijakan Privasi</Link></li>
                <li><Link href='/terms' className='hover:text-white transition-colors'>Syarat & Ketentuan</Link></li>
                <li><Link href='/security' className='hover:text-white transition-colors'>Keamanan</Link></li>
              </ul>
            </div>
          </div>
          
          <div className='border-t border-gray-800 pt-8'>
            <div className='flex flex-col md:flex-row justify-between items-center'>
              <div className='text-gray-400 text-sm mb-4 md:mb-0'>
                © 2025 PT. Samara Digital Technology. Semua hak dilindungi.
              </div>
              <div className='flex items-center space-x-6 text-sm text-gray-400'>
                <span>🇮🇩 Made in Indonesia</span>
                <span>🔒 SOC 2 Compliant</span>
                <span>⚡ 99.9% Uptime</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
