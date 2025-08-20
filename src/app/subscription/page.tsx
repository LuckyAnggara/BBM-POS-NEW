'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Building2,
  Users,
  Check,
  X,
  CreditCard,
  Calendar,
  TrendingUp,
  AlertCircle,
  ArrowLeft,
  Crown,
  Zap
} from 'lucide-react'
import { toast } from 'sonner'
import { Subscription, Tenant } from '@/lib/types'
import Link from 'next/link'

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

export default function SubscriptionManagement() {
  const { currentUser, getCurrentTenant, isTenantAdmin } = useAuth()
  const router = useRouter()
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null)
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null)
  const [availablePlans, setAvailablePlans] = useState<PricingPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isYearly, setIsYearly] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null)
  const [isSubscribing, setIsSubscribing] = useState(false)

  // Redirect if not tenant admin
  useEffect(() => {
    if (currentUser && !isTenantAdmin()) {
      router.push('/dashboard')
      toast.error('Access denied. Tenant admin privileges required.')
    }
  }, [currentUser, isTenantAdmin, router])

  // Fetch data
  useEffect(() => {
    if (currentUser && isTenantAdmin()) {
      fetchData()
    }
  }, [currentUser, isTenantAdmin])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      
      // Get current tenant info
      const tenantData = await getCurrentTenant()
      setCurrentTenant(tenantData)
      
      // Get current subscription
      const subscriptionResponse = await fetch('/api/subscription/current', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      
      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json()
        setCurrentSubscription(subscriptionData)
      }

      // Get available plans
      const plansResponse = await fetch('/api/subscription/plans')
      if (plansResponse.ok) {
        const plansData = await plansResponse.json()
        setAvailablePlans(plansData)
      }
      
    } catch (error) {
      console.error('Failed to fetch subscription data:', error)
      toast.error('Failed to load subscription data')
    } finally {
      setIsLoading(false)
    }
  }

  const subscribeToPlan = async (plan: PricingPlan) => {
    if (!plan) return
    
    try {
      setIsSubscribing(true)
      
      const response = await fetch('/api/subscription/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          plan_name: plan.name,
          billing_cycle: isYearly ? 'yearly' : 'monthly'
        })
      })
      
      if (response.ok) {
        toast.success('Subscription updated successfully!')
        fetchData() // Refresh data
        setSelectedPlan(null) // Close dialog
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to update subscription')
      }
    } catch (error) {
      console.error('Failed to subscribe:', error)
      toast.error('Failed to update subscription')
    } finally {
      setIsSubscribing(false)
    }
  }

  const cancelSubscription = async () => {
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      
      if (response.ok) {
        toast.success('Subscription cancelled successfully')
        fetchData() // Refresh data
      } else {
        toast.error('Failed to cancel subscription')
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
      toast.error('Failed to cancel subscription')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getTrialDaysRemaining = () => {
    if (!currentSubscription?.trial_ends_at) return 0
    const trialEnd = new Date(currentSubscription.trial_ends_at)
    const now = new Date()
    const diffTime = trialEnd.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const isTrialExpired = () => {
    if (!currentSubscription?.trial_ends_at) return false
    return new Date(currentSubscription.trial_ends_at) < new Date()
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'trial':
        return 'secondary'
      case 'cancelled':
        return 'destructive'
      case 'expired':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'basic':
        return <Building2 className='h-6 w-6' />
      case 'premium':
        return <Zap className='h-6 w-6' />
      case 'enterprise':
        return <Crown className='h-6 w-6' />
      default:
        return <Building2 className='h-6 w-6' />
    }
  }

  if (!currentUser || !isTenantAdmin()) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <AlertCircle className='h-12 w-12 text-red-500 mx-auto mb-4' />
          <h1 className='text-xl font-semibold mb-2'>Access Denied</h1>
          <p className='text-muted-foreground'>Tenant admin privileges required</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <CreditCard className='h-12 w-12 text-primary animate-pulse mx-auto mb-4' />
          <h1 className='text-xl font-semibold mb-2'>Loading Subscription</h1>
          <p className='text-muted-foreground'>Please wait...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-background p-6'>
      <div className='max-w-6xl mx-auto space-y-6'>
        {/* Header */}
        <div className='flex items-center gap-4 mb-6'>
          <Button asChild variant='outline' size='sm'>
            <Link href='/dashboard'>
              <ArrowLeft className='h-4 w-4 mr-2' />
              Back to Dashboard
            </Link>
          </Button>
          
          <div>
            <h1 className='text-3xl font-bold'>Subscription Management</h1>
            <p className='text-muted-foreground'>
              Manage your subscription plan and billing
            </p>
          </div>
        </div>

        {/* Current Subscription Card */}
        {currentSubscription && (
          <Card className='border-2'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  {getPlanIcon(currentSubscription.plan_name)}
                  <div>
                    <CardTitle className='capitalize'>
                      {currentSubscription.plan_name} Plan
                    </CardTitle>
                    <CardDescription>
                      Your current subscription plan
                    </CardDescription>
                  </div>
                </div>
                
                <Badge variant={getStatusBadgeVariant(currentSubscription.status)}>
                  {currentSubscription.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div>
                  <div className='text-2xl font-bold'>
                    {formatCurrency(currentSubscription.price)}
                  </div>
                  <div className='text-sm text-muted-foreground'>
                    per {currentSubscription.billing_cycle === 'yearly' ? 'year' : 'month'}
                  </div>
                </div>
                
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <Building2 className='h-4 w-4 text-muted-foreground' />
                    <span className='text-sm'>
                      {currentSubscription.max_branches} Branches
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Users className='h-4 w-4 text-muted-foreground' />
                    <span className='text-sm'>
                      {currentSubscription.max_users} Users
                    </span>
                  </div>
                </div>
                
                <div className='space-y-1 text-sm'>
                  <div>
                    <strong>Started:</strong> {formatDate(currentSubscription.starts_at)}
                  </div>
                  <div>
                    <strong>Expires:</strong> {formatDate(currentSubscription.ends_at)}
                  </div>
                </div>
              </div>

              {/* Trial Information */}
              {currentSubscription.status === 'trial' && currentSubscription.trial_ends_at && (
                <div className='bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg'>
                  <div className='flex items-start gap-2'>
                    <AlertCircle className='h-5 w-5 text-yellow-600 mt-0.5' />
                    <div className='flex-1'>
                      <h4 className='font-medium text-yellow-900 dark:text-yellow-100'>
                        Trial Period
                      </h4>
                      <p className='text-yellow-700 dark:text-yellow-200 text-sm'>
                        {isTrialExpired() 
                          ? 'Your trial has expired. Please upgrade to continue using the service.'
                          : `Your trial expires in ${getTrialDaysRemaining()} days. Upgrade now to continue without interruption.`
                        }
                      </p>
                      {!isTrialExpired() && (
                        <div className='mt-2'>
                          <Progress 
                            value={100 - (getTrialDaysRemaining() / 30) * 100} 
                            className='h-2 w-full'
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className='flex gap-3 pt-2'>
                {currentSubscription.status !== 'cancelled' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant='outline' size='sm'>
                        Cancel Subscription
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will cancel your subscription at the end of the current billing period.
                          You will retain access until {formatDate(currentSubscription.ends_at)}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                        <AlertDialogAction onClick={cancelSubscription}>
                          Cancel Subscription
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan Selection */}
        <div className='space-y-6'>
          <div className='text-center'>
            <h2 className='text-2xl font-bold mb-2'>
              {currentSubscription?.status === 'trial' || isTrialExpired() 
                ? 'Choose Your Plan' 
                : 'Upgrade Your Plan'
              }
            </h2>
            <p className='text-muted-foreground mb-6'>
              Select the perfect plan for your business needs
            </p>
            
            {/* Billing Toggle */}
            <div className='flex items-center justify-center gap-4 mb-8'>
              <span className={!isYearly ? 'font-semibold' : 'text-muted-foreground'}>
                Monthly
              </span>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setIsYearly(!isYearly)}
                className='h-6 w-12 p-0'
              >
                <div className={`h-4 w-4 rounded-full bg-primary transition-transform ${
                  isYearly ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </Button>
              <span className={isYearly ? 'font-semibold' : 'text-muted-foreground'}>
                Yearly
                <Badge className='ml-2' variant='secondary'>-20%</Badge>
              </span>
            </div>
          </div>
          
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {availablePlans.map((plan, index) => {
              const isCurrentPlan = currentSubscription?.plan_name === plan.name
              const price = isYearly && plan.price_yearly ? plan.price_yearly : plan.price
              
              return (
                <Card key={index} className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}>
                  {plan.popular && (
                    <Badge className='absolute -top-3 left-1/2 transform -translate-x-1/2'>
                      Most Popular
                    </Badge>
                  )}
                  
                  <CardHeader className='text-center'>
                    <div className='flex justify-center mb-3'>
                      {getPlanIcon(plan.name)}
                    </div>
                    <CardTitle className='text-2xl'>{plan.display_name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className='mt-4'>
                      <span className='text-4xl font-bold'>
                        {formatCurrency(price)}
                      </span>
                      <span className='text-muted-foreground'>
                        /{isYearly ? 'year' : 'month'}
                      </span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className='space-y-4'>
                    <ul className='space-y-2'>
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className='flex items-center gap-2'>
                          <Check className='h-4 w-4 text-primary' />
                          <span className='text-sm'>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <div className='pt-4 space-y-2 text-sm text-muted-foreground'>
                      <div className='flex items-center gap-2'>
                        <Building2 className='h-4 w-4' />
                        {plan.max_branches} Branches
                      </div>
                      <div className='flex items-center gap-2'>
                        <Users className='h-4 w-4' />
                        {plan.max_users} Users
                      </div>
                    </div>
                    
                    {isCurrentPlan ? (
                      <Button className='w-full' disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            className='w-full' 
                            variant={plan.popular ? 'default' : 'outline'}
                            onClick={() => setSelectedPlan(plan)}
                          >
                            {currentSubscription?.status === 'trial' ? 'Select Plan' : 'Upgrade'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirm Plan Selection</DialogTitle>
                            <DialogDescription>
                              You are about to {currentSubscription?.status === 'trial' ? 'subscribe to' : 'upgrade to'} the {plan.display_name} plan.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className='space-y-4'>
                            <div className='bg-muted/50 p-4 rounded-lg'>
                              <h4 className='font-medium mb-2'>Plan Details</h4>
                              <div className='space-y-1 text-sm'>
                                <div className='flex justify-between'>
                                  <span>Plan:</span>
                                  <span className='font-medium'>{plan.display_name}</span>
                                </div>
                                <div className='flex justify-between'>
                                  <span>Price:</span>
                                  <span className='font-medium'>
                                    {formatCurrency(price)}/{isYearly ? 'year' : 'month'}
                                  </span>
                                </div>
                                <div className='flex justify-between'>
                                  <span>Branches:</span>
                                  <span>{plan.max_branches}</span>
                                </div>
                                <div className='flex justify-between'>
                                  <span>Users:</span>
                                  <span>{plan.max_users}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className='flex gap-3'>
                            <Button 
                              variant='outline' 
                              className='flex-1'
                              onClick={() => setSelectedPlan(null)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              className='flex-1'
                              onClick={() => subscribeToPlan(plan)}
                              disabled={isSubscribing}
                            >
                              {isSubscribing ? 'Processing...' : 'Confirm'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}