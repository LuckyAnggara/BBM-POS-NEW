# BBM POS SaaS API Documentation

## Overview

The BBM POS application has been transformed from a multi-branch system to a multi-tenant SaaS application. This document provides comprehensive API documentation for frontend developers.

## Authentication Flow

### 1. Tenant Registration
```http
POST /api/tenant/register
Content-Type: application/json

{
  "tenant_name": "My Business",
  "contact_email": "admin@mybusiness.com",
  "contact_phone": "+62123456789",
  "address": "Business Address",
  "description": "Business Description",
  "admin_name": "John Doe",
  "admin_email": "john@mybusiness.com", 
  "admin_password": "password123",
  "branch_name": "Main Branch"
}
```

**Response:**
```json
{
  "message": "Tenant registered successfully",
  "tenant": {
    "id": 1,
    "name": "My Business",
    "slug": "my-business",
    "contact_email": "admin@mybusiness.com",
    "status": "active",
    "trial_ends_at": "2025-09-18T10:32:48.000000Z",
    "subscription": {
      "plan_name": "trial",
      "status": "trial",
      "max_branches": 1,
      "max_users": 5
    }
  },
  "admin": {
    "id": 1,
    "name": "John Doe",
    "email": "john@mybusiness.com",
    "user_type": "tenant_admin",
    "is_tenant_owner": true
  },
  "branch": {
    "id": 1,
    "name": "Main Branch",
    "tenant_id": 1
  }
}
```

### 2. User Login
```http
POST /api/login
Content-Type: application/json

{
  "email": "john@mybusiness.com",
  "password": "password123"
}
```

## User Types

1. **super_admin**: Platform administrators who can manage all tenants
2. **tenant_admin**: Tenant administrators who can manage their organization
3. **branch_user**: Regular users who work in specific branches

## Tenant Management APIs

### Get Current Tenant
```http
GET /api/tenant/current
Authorization: Bearer {token}
```

### Update Tenant
```http
PUT /api/tenant/current
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Business Name",
  "contact_email": "newemail@business.com",
  "contact_phone": "+62987654321",
  "address": "New Address",
  "description": "Updated description",
  "logo_url": "https://example.com/logo.png"
}
```

### Get Tenant Statistics
```http
GET /api/tenant/stats
Authorization: Bearer {token}
```

## Subscription Management APIs

### Get Available Plans
```http
GET /api/subscription/plans
```

**Response:**
```json
[
  {
    "name": "basic",
    "display_name": "Basic Plan",
    "price": 50000,
    "billing_cycle": "monthly",
    "max_branches": 1,
    "max_users": 3,
    "features": [
      "Point of Sale",
      "Inventory Management",
      "Basic Reports",
      "Customer Management"
    ]
  },
  {
    "name": "premium",
    "display_name": "Premium Plan", 
    "price": 150000,
    "billing_cycle": "monthly",
    "max_branches": 3,
    "max_users": 10,
    "features": [
      "Everything in Basic",
      "Multi-branch Support",
      "Employee Management",
      "Advanced Reports"
    ]
  }
]
```

### Get Current Subscription
```http
GET /api/subscription/current
Authorization: Bearer {token}
```

### Subscribe to Plan
```http
POST /api/subscription/subscribe
Authorization: Bearer {token}
Content-Type: application/json

{
  "plan_name": "premium",
  "billing_cycle": "monthly"
}
```

### Cancel Subscription
```http
POST /api/subscription/cancel
Authorization: Bearer {token}
```

## Support System APIs

### Create Support Ticket
```http
POST /api/support-tickets
Authorization: Bearer {token}
Content-Type: application/json

{
  "subject": "Issue with inventory",
  "description": "Detailed description of the issue",
  "priority": "medium"
}
```

### Get Support Tickets
```http
GET /api/support-tickets?status=open&priority=high&per_page=10
Authorization: Bearer {token}
```

### Get Support Statistics
```http
GET /api/support/stats
Authorization: Bearer {token}
```

## SaaS Admin APIs (Super Admin Only)

### Get Dashboard Statistics
```http
GET /api/saas-admin/dashboard
Authorization: Bearer {super_admin_token}
```

### Get All Tenants
```http
GET /api/saas-admin/tenants?search=business&status=active&per_page=15
Authorization: Bearer {super_admin_token}
```

### Update Tenant Status
```http
PUT /api/saas-admin/tenants/{tenant_id}/status
Authorization: Bearer {super_admin_token}
Content-Type: application/json

{
  "status": "suspended"
}
```

### Get Subscription Analytics
```http
GET /api/saas-admin/analytics/subscriptions
Authorization: Bearer {super_admin_token}
```

## Landing Page APIs

### Get Landing Page Info
```http
GET /
```

### Get Pricing Plans
```http
GET /pricing
```

### Get Features List
```http
GET /features
```

### Submit Contact Form
```http
POST /contact
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Inquiry about features",
  "message": "I would like to know more about..."
}
```

## Data Migration Guide

### Existing Data Structure Changes

1. **branches** table now has `tenant_id` field
2. **users** table has new fields:
   - `tenant_id`: Foreign key to tenants table
   - `user_type`: enum('super_admin', 'tenant_admin', 'branch_user')
   - `is_tenant_owner`: boolean flag

### Migration Steps for Existing Data

1. Create a default tenant for existing data
2. Assign all existing branches to this tenant
3. Update all existing users to belong to this tenant
4. Set appropriate user types based on current roles

```sql
-- Example migration for existing data
INSERT INTO tenants (name, slug, contact_email, status, created_at, updated_at) 
VALUES ('Legacy Business', 'legacy-business', 'admin@legacy.com', 'active', NOW(), NOW());

UPDATE branches SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE users SET tenant_id = 1, user_type = 'tenant_admin' WHERE tenant_id IS NULL AND role = 'admin';
UPDATE users SET tenant_id = 1, user_type = 'branch_user' WHERE tenant_id IS NULL AND role = 'cashier';
```

## Frontend Implementation Guidelines

### Authentication State Management

1. Store user type in frontend state for UI permissions
2. Handle tenant context in all API calls
3. Implement different navigation based on user type

### Tenant Isolation

1. All existing POS features now work within tenant context
2. Branch selection is scoped to current tenant
3. Data queries automatically filtered by tenant

### New UI Components Needed

1. **Landing Page**: Marketing page with pricing plans
2. **Tenant Registration**: Multi-step registration form
3. **Subscription Management**: Plan selection and billing
4. **Support System**: Ticket creation and management
5. **SaaS Admin Panel**: Super admin dashboard for platform management

### Error Handling

- Handle tenant-not-found errors
- Manage subscription limit violations
- Handle trial expiration scenarios

### Subscription Limits Enforcement

Frontend should check and enforce:
- Maximum number of branches allowed
- Maximum number of users allowed
- Feature availability based on plan

## API Response Patterns

### Success Response
```json
{
  "message": "Operation successful",
  "data": {...}
}
```

### Error Response
```json
{
  "message": "Error description",
  "errors": {
    "field": ["Validation error message"]
  }
}
```

### Pagination Response
```json
{
  "data": [...],
  "current_page": 1,
  "per_page": 15,
  "total": 100,
  "last_page": 7
}
```

## Security Considerations

1. All tenant data is automatically scoped by middleware
2. Super admin access is strictly controlled
3. Subscription limits are enforced at API level
4. Tenant isolation is maintained across all endpoints

## Testing the APIs

Use the provided Postman collection or test with curl:

```bash
# Register a new tenant
curl -X POST http://localhost:8000/api/tenant/register \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_name": "Test Business",
    "contact_email": "test@example.com",
    "admin_name": "Test Admin", 
    "admin_email": "admin@example.com",
    "admin_password": "password123",
    "branch_name": "Main Branch"
  }'

# Login with the admin user
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```