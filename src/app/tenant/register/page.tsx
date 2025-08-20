'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Building2, User, Building, ArrowLeft, ArrowRight, Check, Loader2, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { 
  TenantRegistrationData, 
  registerTenant, 
  validateTenantData,
  checkTenantAvailability 
} from '@/lib/services/tenantServices'

export default function TenantRegisterPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'unavailable' | null>(null)
  const [formData, setFormData] = useState<TenantRegistrationData>({
    tenant_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    description: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    admin_password_confirmation: '',
    branch_name: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const totalSteps = 3
  const progress = (currentStep / totalSteps) * 100

  // Check tenant name availability with debouncing
  const checkAvailability = async (tenantName: string) => {
    if (tenantName.length < 2) {
      setAvailabilityStatus(null)
      return
    }
    
    setIsCheckingAvailability(true)
    try {
      const result = await checkTenantAvailability(tenantName)
      setAvailabilityStatus(result.available ? 'available' : 'unavailable')
    } catch (error) {
      setAvailabilityStatus(null)
    } finally {
      setIsCheckingAvailability(false)
    }
  }

  const validateStep = (step: number): boolean => {
    const newErrors = validateTenantData(formData, step)
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleInputChange = (field: keyof TenantRegistrationData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      const newErrors = { ...errors }
      delete newErrors[field]
      setErrors(newErrors)
    }
    
    // Check availability for tenant name
    if (field === 'tenant_name') {
      const timeoutId = setTimeout(() => checkAvailability(value), 500)
      return () => clearTimeout(timeoutId)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(3)) return
    
    setIsLoading(true)
    
    try {
      const response = await registerTenant(formData)
      
      if (response.success) {
        toast.success('Registration successful!', {
          description: 'Your tenant account has been created. You will be redirected to login.'
        })
        
        // Redirect to login with success message
        router.push('/login?registered=true')
      } else {
        // Handle validation errors from backend
        if (response.errors) {
          const flatErrors: Record<string, string> = {}
          Object.entries(response.errors).forEach(([key, messages]) => {
            flatErrors[key] = Array.isArray(messages) ? messages[0] : messages
          })
          setErrors(flatErrors)
        } else {
          toast.error('Registration failed', {
            description: response.message || 'An error occurred during tenant registration'
          })
        }
      }
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Registration failed', {
        description: 'A connection error occurred. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className='space-y-4'>
            <div className='text-center mb-6'>
              <Building2 className='h-12 w-12 text-primary mx-auto mb-2' />
              <h3 className='text-xl font-semibold'>Informasi Bisnis</h3>
              <p className='text-muted-foreground'>Ceritakan tentang bisnis Anda</p>
            </div>
            
            <div className='space-y-4'>
              <div>
                <Label htmlFor='tenant_name'>Business Name *</Label>
                <div className='relative'>
                  <Input
                    id='tenant_name'
                    placeholder='e.g., Tech Electronics Store'
                    value={formData.tenant_name}
                    onChange={(e) => handleInputChange('tenant_name', e.target.value)}
                    className={errors.tenant_name ? 'border-red-500' : ''}
                  />
                  {isCheckingAvailability && (
                    <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                      <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
                    </div>
                  )}
                  {!isCheckingAvailability && availabilityStatus && formData.tenant_name.length > 1 && (
                    <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                      {availabilityStatus === 'available' ? (
                        <Check className='h-4 w-4 text-green-500' />
                      ) : (
                        <X className='h-4 w-4 text-red-500' />
                      )}
                    </div>
                  )}
                </div>
                {!isCheckingAvailability && availabilityStatus === 'unavailable' && (
                  <p className='text-sm text-orange-600 mt-1'>
                    This business name is already taken. Please try a different name.
                  </p>
                )}
                {!isCheckingAvailability && availabilityStatus === 'available' && formData.tenant_name.length > 1 && (
                  <p className='text-sm text-green-600 mt-1'>
                    Great! This business name is available.
                  </p>
                )}
                {errors.tenant_name && (
                  <p className='text-sm text-red-500 mt-1'>{errors.tenant_name}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor='contact_email'>Email Bisnis *</Label>
                <Input
                  id='contact_email'
                  type='email'
                  placeholder='admin@tokoelektronik.com'
                  value={formData.contact_email}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  className={errors.contact_email ? 'border-red-500' : ''}
                />
                {errors.contact_email && (
                  <p className='text-sm text-red-500 mt-1'>{errors.contact_email}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor='contact_phone'>Nomor Telepon</Label>
                <Input
                  id='contact_phone'
                  placeholder='+62812345678'
                  value={formData.contact_phone}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor='address'>Alamat Bisnis *</Label>
                <Textarea
                  id='address'
                  placeholder='Jl. Sudirman No. 123, Jakarta Pusat'
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className={errors.address ? 'border-red-500' : ''}
                />
                {errors.address && (
                  <p className='text-sm text-red-500 mt-1'>{errors.address}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor='description'>Deskripsi Bisnis</Label>
                <Textarea
                  id='description'
                  placeholder='Deskripsikan jenis bisnis Anda (opsional)'
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>
            </div>
          </div>
        )
        
      case 2:
        return (
          <div className='space-y-4'>
            <div className='text-center mb-6'>
              <User className='h-12 w-12 text-primary mx-auto mb-2' />
              <h3 className='text-xl font-semibold'>Admin Akun</h3>
              <p className='text-muted-foreground'>Buat akun administrator untuk bisnis Anda</p>
            </div>
            
            <div className='space-y-4'>
              <div>
                <Label htmlFor='admin_name'>Nama Lengkap Admin *</Label>
                <Input
                  id='admin_name'
                  placeholder='John Doe'
                  value={formData.admin_name}
                  onChange={(e) => handleInputChange('admin_name', e.target.value)}
                  className={errors.admin_name ? 'border-red-500' : ''}
                />
                {errors.admin_name && (
                  <p className='text-sm text-red-500 mt-1'>{errors.admin_name}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor='admin_email'>Email Admin *</Label>
                <Input
                  id='admin_email'
                  type='email'
                  placeholder='john@tokoelektronik.com'
                  value={formData.admin_email}
                  onChange={(e) => handleInputChange('admin_email', e.target.value)}
                  className={errors.admin_email ? 'border-red-500' : ''}
                />
                {errors.admin_email && (
                  <p className='text-sm text-red-500 mt-1'>{errors.admin_email}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor='admin_password'>Password *</Label>
                <Input
                  id='admin_password'
                  type='password'
                  placeholder='Minimal 8 karakter'
                  value={formData.admin_password}
                  onChange={(e) => handleInputChange('admin_password', e.target.value)}
                  className={errors.admin_password ? 'border-red-500' : ''}
                />
                {errors.admin_password && (
                  <p className='text-sm text-red-500 mt-1'>{errors.admin_password}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor='admin_password_confirmation'>Konfirmasi Password *</Label>
                <Input
                  id='admin_password_confirmation'
                  type='password'
                  placeholder='Ketik ulang password'
                  value={formData.admin_password_confirmation}
                  onChange={(e) => handleInputChange('admin_password_confirmation', e.target.value)}
                  className={errors.admin_password_confirmation ? 'border-red-500' : ''}
                />
                {errors.admin_password_confirmation && (
                  <p className='text-sm text-red-500 mt-1'>{errors.admin_password_confirmation}</p>
                )}
              </div>
            </div>
          </div>
        )
        
      case 3:
        return (
          <div className='space-y-4'>
            <div className='text-center mb-6'>
              <Building className='h-12 w-12 text-primary mx-auto mb-2' />
              <h3 className='text-xl font-semibold'>Cabang Utama</h3>
              <p className='text-muted-foreground'>Atur cabang pertama untuk memulai</p>
            </div>
            
            <div className='space-y-4'>
              <div>
                <Label htmlFor='branch_name'>Nama Cabang *</Label>
                <Input
                  id='branch_name'
                  placeholder='Cabang Pusat'
                  value={formData.branch_name}
                  onChange={(e) => handleInputChange('branch_name', e.target.value)}
                  className={errors.branch_name ? 'border-red-500' : ''}
                />
                {errors.branch_name && (
                  <p className='text-sm text-red-500 mt-1'>{errors.branch_name}</p>
                )}
              </div>
              
              {/* Summary */}
              <div className='bg-muted/50 p-4 rounded-lg space-y-2'>
                <h4 className='font-medium'>Ringkasan Pendaftaran</h4>
                <div className='text-sm space-y-1'>
                  <p><strong>Bisnis:</strong> {formData.tenant_name}</p>
                  <p><strong>Email:</strong> {formData.contact_email}</p>
                  <p><strong>Admin:</strong> {formData.admin_name}</p>
                  <p><strong>Cabang:</strong> {formData.branch_name}</p>
                </div>
              </div>
              
              <div className='bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg'>
                <div className='flex items-start gap-2'>
                  <Check className='h-5 w-5 text-blue-600 mt-0.5' />
                  <div className='text-sm'>
                    <p className='font-medium text-blue-900 dark:text-blue-100'>
                      Trial 30 Hari Gratis
                    </p>
                    <p className='text-blue-700 dark:text-blue-200'>
                      Anda akan mendapatkan akses penuh selama 30 hari tanpa biaya.
                      Tidak ada kartu kredit yang diperlukan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
        
      default:
        return null
    }
  }

  return (
    <div className='min-h-screen bg-background flex items-center justify-center p-4'>
      <div className='w-full max-w-2xl'>
        {/* Header */}
        <div className='text-center mb-8'>
          <Link href='/' className='inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4'>
            <ArrowLeft className='h-4 w-4' />
            Kembali ke Beranda
          </Link>
          
          <div className='flex items-center justify-center gap-2 mb-4'>
            <div className='relative'>
              <Building2 className='h-8 w-8 text-blue-600' />
              <div className='absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full animate-pulse'></div>
            </div>
            <h1 className='text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent'>Mercato POS</h1>
          </div>
          
          <h2 className='text-xl font-semibold mb-2'>Daftar Bisnis Baru</h2>
          <p className='text-muted-foreground mb-6'>
            Bergabunglah dengan 500+ bisnis yang telah menggunakan Mercato POS untuk mengoptimalkan operasi mereka
          </p>
          
          {/* Progress */}
          <div className='mb-6'>
            <div className='flex justify-between text-sm mb-2'>
              <span>Langkah {currentStep} dari {totalSteps}</span>
              <span>{Math.round(progress)}% selesai</span>
            </div>
            <Progress value={progress} className='h-2' />
          </div>
        </div>

        {/* Form Card */}
        <Card className='shadow-lg'>
          <CardContent className='p-6'>
            {renderStepContent()}
            
            {/* Navigation Buttons */}
            <div className='flex justify-between pt-6'>
              <Button
                variant='outline'
                onClick={prevStep}
                disabled={currentStep === 1}
                className='flex items-center gap-2'
              >
                <ArrowLeft className='h-4 w-4' />
                Sebelumnya
              </Button>
              
              {currentStep < totalSteps ? (
                <Button onClick={nextStep} className='flex items-center gap-2'>
                  Selanjutnya
                  <ArrowRight className='h-4 w-4' />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={isLoading}
                  className='flex items-center gap-2'
                >
                  {isLoading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
                  {!isLoading && <Check className='h-4 w-4' />}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className='text-center mt-6 text-sm text-muted-foreground'>
          Sudah punya akun?{' '}
          <Link href='/login' className='text-primary hover:underline'>
            Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  )
}