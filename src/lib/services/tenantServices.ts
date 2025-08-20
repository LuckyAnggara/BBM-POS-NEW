// src/lib/services/tenantServices.ts
import api from '@/lib/api'

export interface TenantRegistrationData {
  // Tenant Info
  tenant_name: string
  contact_email: string
  contact_phone: string
  address: string
  description: string
  // Admin User Info
  admin_name: string
  admin_email: string
  admin_password: string
  admin_password_confirmation: string
  // Branch Info
  branch_name: string
}

export interface TenantRegistrationResponse {
  success: boolean
  message: string
  data?: {
    tenant: {
      id: number
      name: string
      slug: string
      contact_email: string
      status: string
    }
    user: {
      id: number
      name: string
      email: string
      user_type: string
    }
    branch: {
      id: number
      name: string
    }
  }
  errors?: Record<string, string[]>
}

export interface PricingPlan {
  id: string
  name: string
  display_name: string
  description: string
  price_monthly: number
  price_yearly: number
  currency: string
  max_branches: number | string
  max_users: number | string
  features: string[]
  popular?: boolean
  recommended?: boolean
}

/**
 * Register a new tenant with admin user and initial branch
 */
export const registerTenant = async (data: TenantRegistrationData): Promise<TenantRegistrationResponse> => {
  try {
    const response = await api.post<TenantRegistrationResponse>('/api/tenant/register', data)
    return response.data
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data
    }
    throw new Error('Network error occurred during registration')
  }
}

/**
 * Get available pricing plans for tenant registration
 */
export const getPricingPlans = async (): Promise<PricingPlan[]> => {
  try {
    const response = await api.get<{ data: PricingPlan[] }>('/api/subscription/plans')
    return response.data.data || []
  } catch (error) {
    console.error('Failed to fetch pricing plans:', error)
    // Return default plans if API fails
    return getDefaultPricingPlans()
  }
}

/**
 * Default pricing plans based on marketing kit
 */
export const getDefaultPricingPlans = (): PricingPlan[] => {
  return [
    {
      id: 'starter',
      name: 'starter',
      display_name: 'Starter Plan',
      description: 'Perfect for single locations or small businesses',
      price_monthly: 29,
      price_yearly: 348, // 29 * 12 * 0.8 (20% discount)
      currency: 'USD',
      max_branches: 1,
      max_users: 2,
      features: [
        'Complete POS functionality',
        'Up to 2 users per branch',
        'Basic inventory management (up to 500 products)',
        'Customer management (up to 1,000 customers)',
        'Basic reporting (sales summary, simple analytics)',
        'Email support',
        'Cloud storage (1GB)'
      ]
    },
    {
      id: 'professional',
      name: 'professional',
      display_name: 'Professional Plan',
      description: 'Ideal for growing businesses with multiple locations',
      price_monthly: 59,
      price_yearly: 708, // 59 * 12 * 0.8 (20% discount)
      currency: 'USD',
      max_branches: 'Unlimited',
      max_users: 5,
      popular: true,
      features: [
        'Everything in Starter',
        'Up to 5 users per branch',
        'Advanced inventory management (unlimited products)',
        'Purchase order management',
        'Accounts payable/receivable',
        'Advanced reporting & analytics',
        'Supplier management',
        'Priority email + phone support',
        'Cloud storage (5GB)',
        'Multi-branch management dashboard'
      ]
    },
    {
      id: 'enterprise',
      name: 'enterprise',
      display_name: 'Enterprise Plan',
      description: 'For large operations requiring advanced features',
      price_monthly: 99,
      price_yearly: 1188, // 99 * 12 * 0.8 (20% discount)
      currency: 'USD',
      max_branches: 'Unlimited',
      max_users: 'Unlimited',
      recommended: true,
      features: [
        'Everything in Professional',
        'Unlimited users per branch',
        'Advanced discount & voucher system',
        'Custom reporting & data export',
        'API access for integrations',
        'White-label options',
        'Dedicated account manager',
        '24/7 phone support',
        'Cloud storage (25GB)',
        'Advanced user permissions',
        'Audit trails & compliance features'
      ]
    }
  ]
}

/**
 * Send contact form inquiry
 */
export interface ContactFormData {
  name: string
  email: string
  company: string
  phone?: string
  message: string
  plan_interest?: string
}

export const submitContactForm = async (data: ContactFormData): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.post('/api/contact/inquiry', data)
    return {
      success: true,
      message: 'Thank you for your inquiry! We\'ll get back to you soon.'
    }
  } catch (error: any) {
    console.error('Contact form submission failed:', error)
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to send message. Please try again.'
    }
  }
}

/**
 * Check if tenant name/slug is available
 */
export const checkTenantAvailability = async (tenantName: string): Promise<{ available: boolean; suggestion?: string }> => {
  try {
    const response = await api.post('/api/tenant/check-availability', { tenant_name: tenantName })
    return response.data
  } catch (error: any) {
    console.error('Availability check failed:', error)
    return { available: false }
  }
}

/**
 * Validate tenant registration data
 */
export const validateTenantData = (data: Partial<TenantRegistrationData>, step: number): Record<string, string> => {
  const errors: Record<string, string> = {}
  
  switch (step) {
    case 1: // Business Information
      if (!data.tenant_name?.trim()) {
        errors.tenant_name = 'Business name is required'
      } else if (data.tenant_name.length < 2) {
        errors.tenant_name = 'Business name must be at least 2 characters'
      }
      
      if (!data.contact_email?.trim()) {
        errors.contact_email = 'Business email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact_email)) {
        errors.contact_email = 'Please enter a valid email address'
      }
      
      if (!data.address?.trim()) {
        errors.address = 'Business address is required'
      } else if (data.address.length < 10) {
        errors.address = 'Please provide a complete address'
      }
      
      if (data.contact_phone && data.contact_phone.length < 10) {
        errors.contact_phone = 'Please enter a valid phone number'
      }
      break
      
    case 2: // Admin Account
      if (!data.admin_name?.trim()) {
        errors.admin_name = 'Admin name is required'
      } else if (data.admin_name.length < 2) {
        errors.admin_name = 'Name must be at least 2 characters'
      }
      
      if (!data.admin_email?.trim()) {
        errors.admin_email = 'Admin email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.admin_email)) {
        errors.admin_email = 'Please enter a valid email address'
      }
      
      if (!data.admin_password) {
        errors.admin_password = 'Password is required'
      } else if (data.admin_password.length < 8) {
        errors.admin_password = 'Password must be at least 8 characters'
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.admin_password)) {
        errors.admin_password = 'Password must contain uppercase, lowercase, and number'
      }
      
      if (!data.admin_password_confirmation) {
        errors.admin_password_confirmation = 'Password confirmation is required'
      } else if (data.admin_password !== data.admin_password_confirmation) {
        errors.admin_password_confirmation = 'Passwords do not match'
      }
      break
      
    case 3: // Branch Setup
      if (!data.branch_name?.trim()) {
        errors.branch_name = 'Branch name is required'
      } else if (data.branch_name.length < 2) {
        errors.branch_name = 'Branch name must be at least 2 characters'
      }
      break
  }
  
  return errors
}