# Laravel 10 Backend Migration Guide

## Overview

This guide documents the migration strategy from Firebase → Appwrite → Laravel 10 for the BBM POS (BranchWise) application. The application is a multi-branch Point of Sale system with comprehensive inventory management, financial tracking, and user management capabilities.

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Migration Strategy](#migration-strategy)
3. [Laravel Backend Architecture](#laravel-backend-architecture)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Authentication & Authorization](#authentication--authorization)
7. [Data Migration](#data-migration)
8. [Development Setup](#development-setup)
9. [Deployment Guide](#deployment-guide)
10. [Testing Strategy](#testing-strategy)

## Current Architecture

### Frontend
- **Framework**: Next.js 15.3.3 with TypeScript
- **UI**: TailwindCSS + shadcn/ui components
- **State Management**: React Context API
- **Key Features**:
  - Multi-branch POS interface
  - Inventory management
  - Financial reporting
  - User management
  - Real-time notifications

### Backend Evolution
1. **Firebase** (Legacy)
   - Firestore for data storage
   - Firebase Auth for authentication
   - Cloud Functions for business logic

2. **Appwrite** (Current)
   - Appwrite Database
   - Appwrite Auth
   - Appwrite Functions
   - Collection-based data model

3. **Laravel 10** (Target)
   - REST API backend
   - Laravel Sanctum for authentication
   - Eloquent ORM for data management
   - MySQL/PostgreSQL database

## Migration Strategy

### Phase 1: Laravel Backend Development
- [ ] Set up Laravel 10 project structure
- [ ] Create database migrations
- [ ] Implement Eloquent models
- [ ] Build API controllers and routes
- [ ] Set up authentication with Sanctum
- [ ] Implement business logic and validation

### Phase 2: API Integration
- [ ] Update frontend API client
- [ ] Implement Laravel API calls in `/src/lib/laravel/`
- [ ] Add error handling and validation
- [ ] Test all CRUD operations

### Phase 3: Data Migration
- [ ] Export data from Appwrite
- [ ] Transform data to Laravel format
- [ ] Import data to Laravel database
- [ ] Verify data integrity

### Phase 4: Deployment & Testing
- [ ] Set up production environment
- [ ] Deploy Laravel backend
- [ ] Update frontend configuration
- [ ] Perform comprehensive testing
- [ ] Monitor performance and errors

## Laravel Backend Architecture

### Project Structure
```
laravel-backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Auth/
│   │   │   ├── BranchController.php
│   │   │   ├── UserController.php
│   │   │   ├── InventoryController.php
│   │   │   ├── PosController.php
│   │   │   ├── CustomerController.php
│   │   │   ├── SupplierController.php
│   │   │   └── ReportController.php
│   │   ├── Middleware/
│   │   ├── Requests/
│   │   └── Resources/
│   ├── Models/
│   ├── Services/
│   └── Jobs/
├── database/
│   ├── migrations/
│   ├── seeders/
│   └── factories/
├── routes/
│   ├── api.php
│   └── web.php
└── config/
```

### Core Models

#### User Model
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $fillable = [
        'name',
        'email',
        'password',
        'branch_id',
        'role',
        'avatar_url',
        'local_printer_url',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
```

#### Branch Model
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    protected $fillable = [
        'name',
        'invoice_name',
        'currency',
        'tax_rate',
        'address',
        'phone_number',
        'transaction_deletion_password',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function inventoryItems()
    {
        return $this->hasMany(InventoryItem::class);
    }

    public function transactions()
    {
        return $this->hasMany(PosTransaction::class);
    }
}
```

## Database Schema

### Core Tables

#### branches
```sql
CREATE TABLE branches (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    invoice_name VARCHAR(255) NOT NULL,
    currency VARCHAR(10) DEFAULT 'IDR',
    tax_rate DECIMAL(5,2) DEFAULT 11.00,
    address TEXT,
    phone_number VARCHAR(20),
    transaction_deletion_password VARCHAR(255),
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
```

#### users
```sql
CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified_at TIMESTAMP NULL,
    password VARCHAR(255) NOT NULL,
    branch_id BIGINT UNSIGNED NOT NULL,
    role ENUM('admin', 'manager', 'cashier') NOT NULL,
    avatar_url VARCHAR(512),
    local_printer_url VARCHAR(512),
    remember_token VARCHAR(100),
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);
```

#### inventory_categories
```sql
CREATE TABLE inventory_categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    branch_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);
```

#### inventory_items
```sql
CREATE TABLE inventory_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    image_url VARCHAR(512),
    image_hint VARCHAR(255),
    price DECIMAL(15,2) NOT NULL,
    cost_price DECIMAL(15,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    branch_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED,
    category_name VARCHAR(255),
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES inventory_categories(id) ON DELETE SET NULL
);
```

#### pos_transactions
```sql
CREATE TABLE pos_transactions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(255) UNIQUE NOT NULL,
    shift_id BIGINT UNSIGNED,
    branch_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NULL,
    customer_name VARCHAR(255),
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    shipping_cost DECIMAL(15,2) DEFAULT 0,
    voucher_discount_amount DECIMAL(15,2) DEFAULT 0,
    total_discount_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    total_cost DECIMAL(15,2) NOT NULL,
    payment_terms VARCHAR(50) DEFAULT 'cash',
    amount_paid DECIMAL(15,2) NOT NULL,
    change_given DECIMAL(15,2) DEFAULT 0,
    is_credit_sale BOOLEAN DEFAULT FALSE,
    credit_due_date DATE NULL,
    outstanding_amount DECIMAL(15,2) DEFAULT 0,
    payment_status ENUM('paid', 'partial', 'pending') DEFAULT 'paid',
    status ENUM('completed', 'returned', 'cancelled') DEFAULT 'completed',
    bank_name VARCHAR(255),
    bank_transaction_ref VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);
```

## API Endpoints

### Authentication Endpoints
```
POST   /api/login
POST   /api/logout
POST   /api/register
GET    /api/user
POST   /api/refresh
```

### Branch Management
```
GET    /api/branches                 # List all branches
POST   /api/branches                 # Create new branch
GET    /api/branches/{id}            # Get branch details
PUT    /api/branches/{id}            # Update branch
DELETE /api/branches/{id}            # Delete branch
```

### User Management
```
GET    /api/users                    # List users (with branch filter)
POST   /api/users                    # Create new user
GET    /api/users/{id}               # Get user details
PUT    /api/users/{id}               # Update user
DELETE /api/users/{id}               # Delete user
```

### Inventory Management
```
GET    /api/inventory/categories     # List categories
POST   /api/inventory/categories     # Create category
PUT    /api/inventory/categories/{id} # Update category
DELETE /api/inventory/categories/{id} # Delete category

GET    /api/inventory/items          # List items (with filters)
POST   /api/inventory/items          # Create item
GET    /api/inventory/items/{id}     # Get item details
PUT    /api/inventory/items/{id}     # Update item
DELETE /api/inventory/items/{id}     # Delete item
POST   /api/inventory/items/bulk-update # Bulk quantity update
```

### POS Operations
```
POST   /api/pos/transactions         # Create new transaction
GET    /api/pos/transactions         # List transactions
GET    /api/pos/transactions/{id}    # Get transaction details
POST   /api/pos/transactions/{id}/return # Process return
DELETE /api/pos/transactions/{id}    # Delete transaction (with password)

GET    /api/pos/shifts               # List shifts
POST   /api/pos/shifts               # Start new shift
PUT    /api/pos/shifts/{id}/close    # Close shift
```

### Customer Management
```
GET    /api/customers                # List customers
POST   /api/customers                # Create customer
GET    /api/customers/{id}           # Get customer details
PUT    /api/customers/{id}           # Update customer
DELETE /api/customers/{id}           # Delete customer
```

### Supplier Management
```
GET    /api/suppliers                # List suppliers
POST   /api/suppliers                # Create supplier
GET    /api/suppliers/{id}           # Get supplier details
PUT    /api/suppliers/{id}           # Update supplier
DELETE /api/suppliers/{id}           # Delete supplier
```

### Purchase Orders
```
GET    /api/purchase-orders          # List purchase orders
POST   /api/purchase-orders          # Create purchase order
GET    /api/purchase-orders/{id}     # Get PO details
PUT    /api/purchase-orders/{id}     # Update PO
POST   /api/purchase-orders/{id}/receive # Receive items
```

### Reports
```
GET    /api/reports/sales            # Sales reports
GET    /api/reports/inventory        # Inventory reports
GET    /api/reports/financial        # Financial reports
GET    /api/reports/user-activity    # User activity reports
```

## Authentication & Authorization

### Laravel Sanctum Setup
```php
// config/sanctum.php
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
    '%s%s',
    'localhost,localhost:3000,localhost:9002,127.0.0.1,127.0.0.1:8000,::1',
    env('APP_URL') ? ','.parse_url(env('APP_URL'), PHP_URL_HOST) : ''
))),
```

### Frontend API Configuration
```typescript
// src/lib/api.ts
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  withXSRFToken: true,
})

// Request interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

### Role-Based Access Control
```php
// app/Http/Middleware/CheckRole.php
public function handle($request, Closure $next, ...$roles)
{
    if (!$request->user()) {
        return response()->json(['message' => 'Unauthorized'], 401);
    }

    if (!in_array($request->user()->role, $roles)) {
        return response()->json(['message' => 'Forbidden'], 403);
    }

    return $next($request);
}
```

## Data Migration

### Migration Scripts

#### 1. Export from Appwrite
```javascript
// scripts/export-appwrite-data.js
const { Client, Databases } = require('appwrite');

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function exportCollection(databaseId, collectionId, fileName) {
    try {
        let documents = [];
        let offset = 0;
        const limit = 100;
        
        while (true) {
            const response = await databases.listDocuments(
                databaseId,
                collectionId,
                [Query.limit(limit), Query.offset(offset)]
            );
            
            documents = documents.concat(response.documents);
            
            if (response.documents.length < limit) break;
            offset += limit;
        }
        
        fs.writeFileSync(
            `./exports/${fileName}.json`,
            JSON.stringify(documents, null, 2)
        );
        
        console.log(`Exported ${documents.length} documents from ${collectionId}`);
    } catch (error) {
        console.error(`Error exporting ${collectionId}:`, error);
    }
}
```

#### 2. Transform and Import to Laravel
```php
// app/Console/Commands/ImportDataCommand.php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ImportDataCommand extends Command
{
    protected $signature = 'data:import {collection}';
    protected $description = 'Import data from Appwrite exports';

    public function handle()
    {
        $collection = $this->argument('collection');
        $filePath = storage_path("app/exports/{$collection}.json");
        
        if (!file_exists($filePath)) {
            $this->error("Export file not found: {$filePath}");
            return 1;
        }
        
        $data = json_decode(file_get_contents($filePath), true);
        
        switch ($collection) {
            case 'branches':
                $this->importBranches($data);
                break;
            case 'users':
                $this->importUsers($data);
                break;
            // Add other collections...
        }
        
        $this->info("Successfully imported {$collection}");
    }
    
    private function importBranches($data)
    {
        foreach ($data as $item) {
            Branch::create([
                'id' => $this->extractId($item['$id']),
                'name' => $item['name'],
                'invoice_name' => $item['invoiceName'],
                'currency' => $item['currency'] ?? 'IDR',
                'tax_rate' => $item['taxRate'] ?? 11,
                'address' => $item['address'],
                'phone_number' => $item['phoneNumber'],
                'transaction_deletion_password' => $item['transactionDeletionPassword'],
                'created_at' => $item['$createdAt'] ?? now(),
                'updated_at' => $item['$updatedAt'] ?? now(),
            ]);
        }
    }
}
```

## Development Setup

### Laravel Backend Setup
```bash
# 1. Create Laravel project
composer create-project laravel/laravel bbm-pos-backend

# 2. Install required packages
composer require laravel/sanctum
composer require spatie/laravel-permission

# 3. Configure environment
cp .env.example .env
php artisan key:generate

# 4. Configure database
# Edit .env file with database credentials

# 5. Run migrations
php artisan migrate

# 6. Install Sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate

# 7. Seed initial data
php artisan db:seed

# 8. Start development server
php artisan serve
```

### Frontend Configuration
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local

# 3. Update environment variables
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_TYPE=laravel

# 4. Start development server
npm run dev
```

### Environment Variables

#### Laravel (.env)
```bash
APP_NAME="BBM POS Backend"
APP_ENV=local
APP_KEY=base64:your-app-key
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=bbm_pos
DB_USERNAME=root
DB_PASSWORD=

SANCTUM_STATEFUL_DOMAINS=localhost:9002,localhost:3000
SESSION_DRIVER=cookie
```

#### Next.js (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_TYPE=laravel
```

## Deployment Guide

### Production Environment

#### Laravel Deployment (Ubuntu/DigitalOcean)
```bash
# 1. Install dependencies
sudo apt update
sudo apt install nginx mysql-server php8.2-fpm php8.2-mysql php8.2-xml php8.2-curl php8.2-zip

# 2. Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# 3. Clone and setup project
git clone your-repo.git /var/www/bbm-pos-backend
cd /var/www/bbm-pos-backend
composer install --optimize-autoloader --no-dev

# 4. Configure environment
cp .env.example .env
php artisan key:generate
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 5. Set permissions
sudo chown -R www-data:www-data /var/www/bbm-pos-backend
sudo chmod -R 755 /var/www/bbm-pos-backend/storage

# 6. Configure Nginx
sudo nano /etc/nginx/sites-available/bbm-pos-backend
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/bbm-pos-backend/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

#### Frontend Deployment (Vercel/Netlify)
```bash
# 1. Build production version
npm run build

# 2. Configure environment variables in deployment platform
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_BACKEND_TYPE=laravel

# 3. Deploy to platform
vercel --prod
# or
netlify deploy --prod
```

## Testing Strategy

### Backend Testing (Laravel)
```php
// tests/Feature/BranchControllerTest.php
<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Branch;
use Laravel\Sanctum\Sanctum;

class BranchControllerTest extends TestCase
{
    public function test_can_list_branches()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        
        Branch::factory()->count(3)->create();
        
        $response = $this->getJson('/api/branches');
        
        $response->assertStatus(200)
                ->assertJsonCount(3, 'data');
    }
    
    public function test_can_create_branch()
    {
        $user = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($user);
        
        $branchData = [
            'name' => 'Test Branch',
            'invoice_name' => 'Test Invoice Name',
            'currency' => 'IDR',
            'tax_rate' => 11.0,
        ];
        
        $response = $this->postJson('/api/branches', $branchData);
        
        $response->assertStatus(201)
                ->assertJsonFragment(['name' => 'Test Branch']);
                
        $this->assertDatabaseHas('branches', $branchData);
    }
}
```

### Frontend Testing
```typescript
// __tests__/api/branches.test.ts
import { jest } from '@jest/globals';
import { listBranches, createBranch } from '@/lib/laravel/branches';

// Mock the API
jest.mock('@/lib/api');

describe('Branch API', () => {
  it('should list branches', async () => {
    const mockBranches = [
      { id: 1, name: 'Branch 1' },
      { id: 2, name: 'Branch 2' },
    ];
    
    (api.get as jest.MockedFunction<typeof api.get>).mockResolvedValue({
      data: { data: mockBranches }
    });
    
    const branches = await listBranches();
    expect(branches).toEqual(mockBranches);
    expect(api.get).toHaveBeenCalledWith('/api/branches');
  });
  
  it('should create branch', async () => {
    const newBranch = { name: 'New Branch', invoice_name: 'Invoice Name' };
    const createdBranch = { id: 1, ...newBranch };
    
    (api.post as jest.MockedFunction<typeof api.post>).mockResolvedValue({
      data: createdBranch
    });
    
    const result = await createBranch(newBranch);
    expect(result).toEqual(createdBranch);
    expect(api.post).toHaveBeenCalledWith('/api/branches', newBranch);
  });
});
```

## Performance Considerations

### Database Optimization
```sql
-- Indexes for better query performance
CREATE INDEX idx_inventory_items_branch_id ON inventory_items(branch_id);
CREATE INDEX idx_inventory_items_category_id ON inventory_items(category_id);
CREATE INDEX idx_pos_transactions_branch_id ON pos_transactions(branch_id);
CREATE INDEX idx_pos_transactions_timestamp ON pos_transactions(timestamp);
CREATE INDEX idx_pos_transactions_invoice ON pos_transactions(invoice_number);
```

### API Response Caching
```php
// app/Http/Controllers/InventoryController.php
public function index(Request $request)
{
    $cacheKey = 'inventory_items_' . md5(serialize($request->all()));
    
    return Cache::remember($cacheKey, 300, function () use ($request) {
        return InventoryItem::with('category')
            ->when($request->branch_id, function ($query) use ($request) {
                return $query->where('branch_id', $request->branch_id);
            })
            ->paginate(50);
    });
}
```

### Frontend Optimization
```typescript
// src/hooks/useInventory.ts
import { useQuery } from '@tanstack/react-query';
import { listInventoryItems } from '@/lib/laravel/inventory';

export function useInventory(branchId?: string) {
  return useQuery({
    queryKey: ['inventory', branchId],
    queryFn: () => listInventoryItems({ branch_id: branchId }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

## Security Considerations

### API Security
- Input validation using Form Requests
- Rate limiting on authentication endpoints
- CORS configuration for frontend domains
- SQL injection prevention with Eloquent ORM
- XSS prevention with data sanitization

### Authentication Security
- Secure password hashing with bcrypt
- Token expiration and refresh
- CSRF protection for web routes
- Secure session configuration

### Data Protection
- Sensitive data encryption
- Database backup strategies
- Access logging and monitoring
- Role-based permissions

## Monitoring and Logging

### Laravel Logging
```php
// config/logging.php
'channels' => [
    'daily' => [
        'driver' => 'daily',
        'path' => storage_path('logs/laravel.log'),
        'level' => env('LOG_LEVEL', 'debug'),
        'days' => 14,
    ],
    
    'api' => [
        'driver' => 'daily',
        'path' => storage_path('logs/api.log'),
        'level' => 'info',
        'days' => 30,
    ],
],
```

### API Logging Middleware
```php
// app/Http/Middleware/LogApiRequests.php
public function handle($request, Closure $next)
{
    $response = $next($request);
    
    Log::channel('api')->info('API Request', [
        'method' => $request->method(),
        'url' => $request->fullUrl(),
        'ip' => $request->ip(),
        'user_id' => $request->user()?->id,
        'status' => $response->status(),
        'duration' => microtime(true) - LARAVEL_START,
    ]);
    
    return $response;
}
```

## Conclusion

This migration guide provides a comprehensive roadmap for transitioning from Appwrite to Laravel 10 backend. The Laravel implementation offers better control, performance, and scalability for the BBM POS application while maintaining all existing functionality.

Key benefits of this migration:
- Better performance with optimized database queries
- More flexible API design
- Improved error handling and validation
- Better testing capabilities
- Enhanced security features
- Easier deployment and maintenance

Follow the phases outlined in this guide to ensure a smooth transition with minimal downtime and data loss.