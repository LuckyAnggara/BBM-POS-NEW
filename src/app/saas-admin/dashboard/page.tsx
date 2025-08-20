'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Building2,
  Users,
  DollarSign,
  Activity,
  TrendingUp,
  TrendingDown,
  Search,
  MoreHorizontal,
  Eye,
  Pause,
  Play,
  Ban,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tenant, TenantStatus } from '@/lib/types'

interface DashboardStats {
  total_tenants: number
  active_tenants: number
  trial_tenants: number
  suspended_tenants: number
  total_revenue: number
  monthly_revenue: number
  total_users: number
  recent_registrations: number
}

interface SubscriptionAnalytics {
  plan_distribution: {
    plan_name: string
    count: number
    revenue: number
  }[]
  mrr: number
  churn_rate: number
}

export default function SaasAdminDashboard() {
  const { currentUser, isSuperAdmin } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [analytics, setAnalytics] = useState<SubscriptionAnalytics | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Redirect if not super admin
  useEffect(() => {
    if (currentUser && !isSuperAdmin()) {
      router.push('/dashboard')
      toast.error('Access denied. Super admin privileges required.')
    }
  }, [currentUser, isSuperAdmin, router])

  // Fetch dashboard data
  useEffect(() => {
    if (currentUser && isSuperAdmin()) {
      fetchDashboardData()
    }
  }, [currentUser, isSuperAdmin])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch dashboard stats
      const statsResponse = await fetch('/api/saas-admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Fetch subscription analytics
      const analyticsResponse = await fetch('/api/saas-admin/analytics/subscriptions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json()
        setAnalytics(analyticsData)
      }

      // Fetch tenants
      await fetchTenants()
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTenants = async () => {
    try {
      const params = new URLSearchParams({
        per_page: '15',
        page: currentPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      })

      const response = await fetch(`/api/saas-admin/tenants?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTenants(data.data || data)
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error)
      toast.error('Failed to load tenants')
    }
  }

  const updateTenantStatus = async (tenantId: number, newStatus: TenantStatus) => {
    try {
      const response = await fetch(`/api/saas-admin/tenants/${tenantId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (response.ok) {
        toast.success(`Tenant status updated to ${newStatus}`)
        fetchTenants() // Refresh tenant list
        fetchDashboardData() // Refresh stats
      } else {
        toast.error('Failed to update tenant status')
      }
    } catch (error) {
      console.error('Failed to update tenant status:', error)
      toast.error('Failed to update tenant status')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getStatusBadgeVariant = (status: TenantStatus) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'suspended':
        return 'secondary'
      case 'cancelled':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getStatusColor = (status: TenantStatus) => {
    switch (status) {
      case 'active':
        return 'text-green-600'
      case 'suspended':
        return 'text-yellow-600'
      case 'cancelled':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (!currentUser || !isSuperAdmin()) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <AlertCircle className='h-12 w-12 text-red-500 mx-auto mb-4' />
          <h1 className='text-xl font-semibold mb-2'>Access Denied</h1>
          <p className='text-muted-foreground'>Super admin privileges required</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <Building2 className='h-12 w-12 text-primary animate-pulse mx-auto mb-4' />
          <h1 className='text-xl font-semibold mb-2'>Loading Dashboard</h1>
          <p className='text-muted-foreground'>Please wait...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-background p-6'>
      <div className='max-w-7xl mx-auto space-y-6'>
        {/* Header */}
        <div className='flex justify-between items-center'>
          <div>
            <h1 className='text-3xl font-bold'>SaaS Admin Dashboard</h1>
            <p className='text-muted-foreground'>Platform management and analytics</p>
          </div>
          
          <div className='flex items-center gap-4'>
            <Badge variant='outline' className='px-3 py-1'>
              Super Admin
            </Badge>
            <Button
              onClick={() => router.push('/dashboard')}
              variant='outline'
            >
              Go to POS Dashboard
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Total Tenants</CardTitle>
              <Building2 className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{stats?.total_tenants || 0}</div>
              <p className='text-xs text-muted-foreground'>
                <span className='text-green-600'>+{stats?.recent_registrations || 0}</span> this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Active Tenants</CardTitle>
              <Activity className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{stats?.active_tenants || 0}</div>
              <p className='text-xs text-muted-foreground'>
                {stats?.trial_tenants || 0} on trial
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Monthly Revenue</CardTitle>
              <DollarSign className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {formatCurrency(stats?.monthly_revenue || 0)}
              </div>
              <p className='text-xs text-muted-foreground'>
                MRR: {formatCurrency(analytics?.mrr || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Total Users</CardTitle>
              <Users className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{stats?.total_users || 0}</div>
              <p className='text-xs text-muted-foreground'>
                Across all tenants
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            <Card>
              <CardHeader>
                <CardTitle>Plan Distribution</CardTitle>
                <CardDescription>Revenue by subscription plans</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {analytics.plan_distribution.map((plan, index) => (
                    <div key={index} className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <div className='w-3 h-3 rounded-full bg-primary' />
                        <span className='font-medium capitalize'>{plan.plan_name}</span>
                      </div>
                      <div className='text-right'>
                        <div className='font-medium'>{formatCurrency(plan.revenue)}</div>
                        <div className='text-sm text-muted-foreground'>{plan.count} tenants</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
                <CardDescription>Platform performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-medium'>Monthly Recurring Revenue</span>
                    <span className='font-bold text-green-600'>
                      {formatCurrency(analytics.mrr)}
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-medium'>Churn Rate</span>
                    <span className='font-bold text-red-600'>
                      {analytics.churn_rate.toFixed(1)}%
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-medium'>Total Revenue</span>
                    <span className='font-bold'>
                      {formatCurrency(stats?.total_revenue || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tenants Management */}
        <Card>
          <CardHeader>
            <CardTitle>Tenant Management</CardTitle>
            <CardDescription>Manage all platform tenants</CardDescription>
            
            {/* Filters */}
            <div className='flex gap-4 pt-4'>
              <div className='relative flex-1'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search tenants...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='pl-10'
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className='w-40'>
                  <SelectValue placeholder='Filter by status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Status</SelectItem>
                  <SelectItem value='active'>Active</SelectItem>
                  <SelectItem value='suspended'>Suspended</SelectItem>
                  <SelectItem value='cancelled'>Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchTenants}>
                Search
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div>
                        <div className='font-medium'>{tenant.name}</div>
                        <div className='text-sm text-muted-foreground'>{tenant.slug}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div>
                        <div className='text-sm'>{tenant.contact_email}</div>
                        {tenant.contact_phone && (
                          <div className='text-sm text-muted-foreground'>{tenant.contact_phone}</div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(tenant.status)}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      {tenant.subscription ? (
                        <div>
                          <div className='font-medium capitalize'>{tenant.subscription.plan_name}</div>
                          <div className='text-sm text-muted-foreground'>
                            {formatCurrency(tenant.subscription.price)}/month
                          </div>
                        </div>
                      ) : (
                        <span className='text-muted-foreground'>No subscription</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className='text-sm'>
                        {new Date(tenant.created_at).toLocaleDateString('id-ID')}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' className='h-8 w-8 p-0'>
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem onClick={() => {/* View tenant details */}}>
                            <Eye className='mr-2 h-4 w-4' />
                            View Details
                          </DropdownMenuItem>
                          
                          {tenant.status === 'active' && (
                            <DropdownMenuItem 
                              onClick={() => updateTenantStatus(tenant.id, 'suspended')}
                            >
                              <Pause className='mr-2 h-4 w-4' />
                              Suspend
                            </DropdownMenuItem>
                          )}
                          
                          {tenant.status === 'suspended' && (
                            <DropdownMenuItem 
                              onClick={() => updateTenantStatus(tenant.id, 'active')}
                            >
                              <Play className='mr-2 h-4 w-4' />
                              Activate
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuItem 
                            onClick={() => updateTenantStatus(tenant.id, 'cancelled')}
                            className='text-red-600'
                          >
                            <Ban className='mr-2 h-4 w-4' />
                            Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}