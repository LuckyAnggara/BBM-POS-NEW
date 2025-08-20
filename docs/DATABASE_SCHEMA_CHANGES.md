# Database Schema Changes for SaaS Transformation

## New Tables

### 1. tenants
Stores organization/tenant information.

```sql
CREATE TABLE tenants (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    domain VARCHAR(255) UNIQUE NULL,
    description TEXT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(255) NULL,
    address TEXT NULL,
    logo_url VARCHAR(255) NULL,
    status ENUM('active', 'suspended', 'cancelled') DEFAULT 'active',
    settings JSON NULL,
    trial_ends_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
```

**Key Fields:**
- `slug`: URL-friendly identifier for tenant
- `domain`: Custom domain support for white-labeling
- `status`: Tenant account status
- `settings`: Custom tenant configurations
- `trial_ends_at`: Trial expiration timestamp

### 2. subscriptions
Manages tenant subscription plans and billing.

```sql
CREATE TABLE subscriptions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    plan_name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    billing_cycle ENUM('monthly', 'yearly') NOT NULL,
    status ENUM('active', 'cancelled', 'expired', 'trial') DEFAULT 'trial',
    max_branches INT DEFAULT 1,
    max_users INT DEFAULT 5,
    has_inventory BOOLEAN DEFAULT true,
    has_reports BOOLEAN DEFAULT true,
    has_employee_management BOOLEAN DEFAULT false,
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    trial_ends_at TIMESTAMP NULL,
    features JSON NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

**Key Fields:**
- `plan_name`: basic, premium, enterprise
- `max_branches`: Maximum branches allowed for this subscription
- `max_users`: Maximum users allowed for this subscription
- `features`: Additional features as JSON array

### 3. support_tickets
Customer support and ticket management system.

```sql
CREATE TABLE support_tickets (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    ticket_number VARCHAR(255) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    assigned_to BIGINT UNSIGNED NULL,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);
```

**Key Fields:**
- `ticket_number`: Auto-generated unique ticket identifier
- `assigned_to`: Support agent assigned to handle ticket
- `resolved_at`: Timestamp when ticket was resolved

## Modified Tables

### 1. branches
Added tenant relationship.

```sql
ALTER TABLE branches ADD COLUMN tenant_id BIGINT UNSIGNED NOT NULL AFTER id;
ALTER TABLE branches ADD CONSTRAINT branches_tenant_id_foreign 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
```

**Impact:**
- All branches now belong to a tenant
- Existing data needs migration to assign tenant_id
- Branch queries will be scoped by tenant

### 2. users
Added tenant and user type fields.

```sql
ALTER TABLE users ADD COLUMN tenant_id BIGINT UNSIGNED NULL AFTER branch_id;
ALTER TABLE users ADD COLUMN user_type ENUM('super_admin', 'tenant_admin', 'branch_user') DEFAULT 'branch_user' AFTER role;
ALTER TABLE users ADD COLUMN is_tenant_owner BOOLEAN DEFAULT false AFTER user_type;
ALTER TABLE users ADD CONSTRAINT users_tenant_id_foreign 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
```

**New Fields:**
- `tenant_id`: Links user to their tenant organization
- `user_type`: Defines user's access level across the platform
- `is_tenant_owner`: Flags the primary owner of a tenant

## Data Migration Strategy

### Step 1: Create Default Tenant
For existing installations, create a default tenant:

```sql
INSERT INTO tenants (
    name, 
    slug, 
    contact_email, 
    status, 
    trial_ends_at,
    created_at, 
    updated_at
) VALUES (
    'Legacy Business',
    'legacy-business', 
    'admin@legacy.com',
    'active',
    DATE_ADD(NOW(), INTERVAL 90 DAY),
    NOW(),
    NOW()
);
```

### Step 2: Create Default Subscription
```sql
INSERT INTO subscriptions (
    tenant_id,
    plan_name,
    price,
    billing_cycle,
    status,
    max_branches,
    max_users,
    starts_at,
    ends_at,
    created_at,
    updated_at
) VALUES (
    1,
    'enterprise',
    0,
    'monthly',
    'active',
    999,
    999,
    NOW(),
    DATE_ADD(NOW(), INTERVAL 1 YEAR),
    NOW(),
    NOW()
);
```

### Step 3: Migrate Existing Data
```sql
-- Assign all branches to the default tenant
UPDATE branches SET tenant_id = 1 WHERE tenant_id IS NULL;

-- Update users with tenant information
UPDATE users SET 
    tenant_id = 1,
    user_type = CASE 
        WHEN role = 'admin' THEN 'tenant_admin'
        ELSE 'branch_user'
    END,
    is_tenant_owner = CASE 
        WHEN role = 'admin' AND id = (SELECT MIN(id) FROM users WHERE role = 'admin') THEN true
        ELSE false
    END
WHERE tenant_id IS NULL;
```

## Query Scoping Changes

### Before (Multi-branch)
```sql
-- Users could access any branch they were assigned to
SELECT * FROM sales WHERE branch_id = ?
```

### After (Multi-tenant)
```sql
-- Users can only access data within their tenant
SELECT s.* FROM sales s
JOIN branches b ON s.branch_id = b.id
WHERE b.tenant_id = ? AND s.branch_id = ?
```

## New Indexes Recommended

```sql
-- Tenant-based indexes for performance
CREATE INDEX idx_branches_tenant_id ON branches(tenant_id);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_support_tickets_tenant_id ON support_tickets(tenant_id);
CREATE INDEX idx_subscriptions_tenant_id ON subscriptions(tenant_id);

-- Status-based indexes
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);

-- Composite indexes for common queries
CREATE INDEX idx_users_tenant_type ON users(tenant_id, user_type);
CREATE INDEX idx_branches_tenant_active ON branches(tenant_id, created_at);
```

## Backup Strategy

Before running migrations:

```sql
-- Backup existing tables
CREATE TABLE branches_backup AS SELECT * FROM branches;
CREATE TABLE users_backup AS SELECT * FROM users;

-- Verify data integrity after migration
SELECT COUNT(*) FROM branches WHERE tenant_id IS NULL; -- Should be 0
SELECT COUNT(*) FROM users WHERE tenant_id IS NULL; -- Should be 0
```

## Rollback Plan

If needed, rollback changes:

```sql
-- Remove new columns
ALTER TABLE branches DROP FOREIGN KEY branches_tenant_id_foreign;
ALTER TABLE branches DROP COLUMN tenant_id;

ALTER TABLE users DROP FOREIGN KEY users_tenant_id_foreign;
ALTER TABLE users DROP COLUMN tenant_id;
ALTER TABLE users DROP COLUMN user_type;
ALTER TABLE users DROP COLUMN is_tenant_owner;

-- Drop new tables
DROP TABLE support_tickets;
DROP TABLE subscriptions;
DROP TABLE tenants;

-- Restore from backup if needed
-- Note: This will lose any new data created after migration
```

## Performance Considerations

1. **Query Performance**: All queries now include tenant_id filtering
2. **Index Strategy**: Tenant-based indexes are crucial for performance
3. **Connection Pooling**: Consider tenant-aware connection pooling
4. **Caching**: Cache tenant configuration and subscription data

## Security Implications

1. **Data Isolation**: Tenant data is strictly isolated by foreign keys
2. **Access Control**: User types provide granular permission control
3. **Audit Trail**: All changes are tracked with tenant context
4. **Cross-tenant Access**: Only super_admin users can access multiple tenants

## Validation Queries

After migration, run these queries to validate:

```sql
-- Verify all branches have tenants
SELECT COUNT(*) FROM branches WHERE tenant_id IS NULL;

-- Verify all users have tenants (except super_admin)
SELECT COUNT(*) FROM users WHERE tenant_id IS NULL AND user_type != 'super_admin';

-- Verify tenant owners exist
SELECT t.name, COUNT(u.id) as owners
FROM tenants t
LEFT JOIN users u ON t.id = u.tenant_id AND u.is_tenant_owner = true
GROUP BY t.id, t.name;

-- Verify subscriptions exist for active tenants
SELECT t.name
FROM tenants t
LEFT JOIN subscriptions s ON t.id = s.tenant_id AND s.status = 'active'
WHERE t.status = 'active' AND s.id IS NULL;
```

## Frontend Schema Changes Summary

For frontend developers, key changes:

1. **User Context**: All API calls now include tenant context
2. **Branch Filtering**: Branch lists are automatically filtered by tenant
3. **Permission Levels**: New user types require different UI components
4. **Subscription Limits**: UI must respect plan limitations
5. **Support System**: New ticket management interface needed