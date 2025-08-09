# Development Setup Guide

This guide provides step-by-step instructions for setting up the development environment for the BBM POS application with Laravel 10 backend.

## Prerequisites

### System Requirements

- **PHP**: 8.2 or higher
- **Node.js**: 18 or higher
- **Database**: MySQL 8.0+ or PostgreSQL 13+
- **Composer**: Latest version
- **Git**: Latest version

### Development Tools (Recommended)

- **IDE**: VS Code, PhpStorm, or similar
- **Database Management**: phpMyAdmin, Adminer, or DBeaver
- **API Testing**: Postman, Insomnia, or Thunder Client
- **Git GUI**: SourceTree, GitKraken, or GitHub Desktop

## Laravel Backend Setup

### 1. Create Laravel Project

```bash
# Create new Laravel project
composer create-project laravel/laravel bbm-pos-backend

# Navigate to project directory
cd bbm-pos-backend

# Install required packages
composer require laravel/sanctum
composer require spatie/laravel-cors
```

### 2. Environment Configuration

Create `.env` file from template:

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```bash
APP_NAME="BBM POS Backend"
APP_ENV=local
APP_KEY=base64:your-generated-key
APP_DEBUG=true
APP_URL=http://localhost:8000

# Database Configuration
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=bbm_pos
DB_USERNAME=your_username
DB_PASSWORD=your_password

# Sanctum Configuration
SANCTUM_STATEFUL_DOMAINS=localhost:3000,localhost:9002,127.0.0.1:3000,127.0.0.1:9002

# Session Configuration
SESSION_DRIVER=cookie
SESSION_LIFETIME=120
SESSION_DOMAIN=null
SESSION_SECURE_COOKIE=false

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:9002

# Mail Configuration (for notifications)
MAIL_MAILER=smtp
MAIL_HOST=mailhog
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="noreply@bbmpos.local"
MAIL_FROM_NAME="${APP_NAME}"
```

### 3. Generate Application Key

```bash
php artisan key:generate
```

### 4. Database Setup

Create database:

```sql
-- MySQL
CREATE DATABASE bbm_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- PostgreSQL
CREATE DATABASE bbm_pos WITH ENCODING 'UTF8';
```

### 5. Install and Configure Sanctum

```bash
# Publish Sanctum migration
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"

# Run migrations
php artisan migrate
```

### 6. Configure CORS

Update `config/cors.php`:

```php
<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000')),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

### 7. Update Kernel for API

Update `app/Http/Kernel.php`:

```php
protected $middlewareGroups = [
    'web' => [
        // ... existing middleware
    ],

    'api' => [
        \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        'throttle:api',
        \Illuminate\Routing\Middleware\SubstituteBindings::class,
    ],
];
```

### 8. Create Models and Migrations

Generate models with migrations:

```bash
# Generate all models with migrations
php artisan make:model Branch -m
php artisan make:model User -m
php artisan make:model Customer -m
php artisan make:model Supplier -m
php artisan make:model InventoryCategory -m
php artisan make:model InventoryItem -m
php artisan make:model PosShift -m
php artisan make:model PosTransaction -m
php artisan make:model PosTransactionItem -m
php artisan make:model PurchaseOrder -m
php artisan make:model PurchaseOrderItem -m
php artisan make:model StockMutation -m
php artisan make:model Expense -m
php artisan make:model BankAccount -m
php artisan make:model Notification -m
php artisan make:model UserNotificationStatus -m
php artisan make:model PaymentRecord -m
```

### 9. Create Controllers

Generate API controllers:

```bash
# Authentication controllers
php artisan make:controller API/AuthController
php artisan make:controller API/UserController --api

# Business logic controllers
php artisan make:controller API/BranchController --api
php artisan make:controller API/CustomerController --api
php artisan make:controller API/SupplierController --api
php artisan make:controller API/InventoryController --api
php artisan make:controller API/PosController --api
php artisan make:controller API/PurchaseOrderController --api
php artisan make:controller API/ReportController
php artisan make:controller API/NotificationController --api
```

### 10. Create Form Requests

Generate form request validators:

```bash
php artisan make:request LoginRequest
php artisan make:request RegisterRequest
php artisan make:request BranchRequest
php artisan make:request CustomerRequest
php artisan make:request InventoryItemRequest
php artisan make:request TransactionRequest
```

### 11. Create API Routes

Update `routes/api.php`:

```php
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\BranchController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\CustomerController;
use App\Http\Controllers\API\SupplierController;
use App\Http\Controllers\API\InventoryController;
use App\Http\Controllers\API\PosController;
use App\Http\Controllers\API\ReportController;

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Authentication
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    
    // Branches
    Route::apiResource('branches', BranchController::class);
    
    // Users
    Route::apiResource('users', UserController::class);
    
    // Customers
    Route::apiResource('customers', CustomerController::class);
    
    // Suppliers
    Route::apiResource('suppliers', SupplierController::class);
    
    // Inventory
    Route::prefix('inventory')->group(function () {
        Route::apiResource('categories', InventoryController::class . '@categories');
        Route::apiResource('items', InventoryController::class . '@items');
        Route::post('items/bulk-update', [InventoryController::class, 'bulkUpdate']);
    });
    
    // POS Operations
    Route::prefix('pos')->group(function () {
        Route::apiResource('transactions', PosController::class . '@transactions');
        Route::post('transactions/{id}/payments', [PosController::class, 'addPayment']);
        Route::apiResource('shifts', PosController::class . '@shifts');
        Route::post('shifts/{id}/close', [PosController::class, 'closeShift']);
    });
    
    // Reports
    Route::prefix('reports')->group(function () {
        Route::get('sales', [ReportController::class, 'sales']);
        Route::get('inventory', [ReportController::class, 'inventory']);
        Route::get('financial', [ReportController::class, 'financial']);
    });
});
```

### 12. Run Migrations and Seed Data

```bash
# Run migrations
php artisan migrate

# Create and run seeders
php artisan make:seeder DatabaseSeeder
php artisan make:seeder BranchSeeder
php artisan make:seeder UserSeeder

# Run seeders
php artisan db:seed
```

### 13. Start Development Server

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

## Next.js Frontend Setup

### 1. Install Dependencies

```bash
# Navigate to frontend directory
cd /path/to/bbm-pos-frontend

# Install dependencies
npm install

# Install additional packages for Laravel integration
npm install @tanstack/react-query axios
```

### 2. Environment Configuration

Create `.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_TYPE=laravel

# App Configuration
NEXT_PUBLIC_APP_NAME="BBM POS"
NEXT_PUBLIC_APP_VERSION="2.0.0"

# Features Flags
NEXT_PUBLIC_ENABLE_OFFLINE_MODE=false
NEXT_PUBLIC_ENABLE_PRINTING=true
```

### 3. Update API Configuration

Update `src/lib/api.ts`:

```typescript
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

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for error handling
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

### 4. Create API Service Layer

Create Laravel-specific API services in `src/lib/laravel/`:

Example: `src/lib/laravel/auth.ts`:

```typescript
import api from '../api'

export interface LoginCredentials {
  email: string
  password: string
}

export interface User {
  id: number
  name: string
  email: string
  role: string
  branch_id: number
  branch: {
    id: number
    name: string
    currency: string
  }
}

export const login = async (credentials: LoginCredentials) => {
  // Get CSRF token first
  await api.get('/sanctum/csrf-cookie')
  
  const response = await api.post('/api/login', credentials)
  
  if (response.data.token) {
    localStorage.setItem('authToken', response.data.token)
  }
  
  return response.data
}

export const logout = async () => {
  try {
    await api.post('/api/logout')
  } finally {
    localStorage.removeItem('authToken')
  }
}

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get('/api/user')
  return response.data
}
```

### 5. Update Authentication Context

Update `src/contexts/auth-context.tsx`:

```typescript
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { login, logout, getCurrentUser, type User, type LoginCredentials } from '@/lib/laravel/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const handleLogin = async (credentials: LoginCredentials) => {
    const data = await login(credentials)
    setUser(data.user)
  }

  const handleLogout = async () => {
    await logout()
    setUser(null)
  }

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (token) {
        const userData = await getCurrentUser()
        setUser(userData)
      }
    } catch (error) {
      localStorage.removeItem('authToken')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login: handleLogin,
      logout: handleLogout,
      checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

### 6. Add React Query for State Management

Create `src/lib/query-client.ts`:

```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 401) return false
        return failureCount < 3
      },
    },
  },
})
```

Update `src/app/layout.tsx`:

```typescript
'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query-client'
import { AuthProvider } from '@/contexts/auth-context'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {children}
          </AuthProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </body>
    </html>
  )
}
```

### 7. Start Development Server

```bash
npm run dev
```

## Database Setup

### MySQL Setup (Ubuntu/macOS)

#### Ubuntu

```bash
# Install MySQL
sudo apt update
sudo apt install mysql-server

# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p

CREATE DATABASE bbm_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bbm_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON bbm_pos.* TO 'bbm_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### macOS

```bash
# Install MySQL via Homebrew
brew install mysql

# Start MySQL service
brew services start mysql

# Secure MySQL installation
mysql_secure_installation

# Create database
mysql -u root -p

CREATE DATABASE bbm_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bbm_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON bbm_pos.* TO 'bbm_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### PostgreSQL Setup (Alternative)

#### Ubuntu

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Switch to postgres user
sudo -u postgres psql

CREATE DATABASE bbm_pos;
CREATE USER bbm_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE bbm_pos TO bbm_user;
\q
```

#### macOS

```bash
# Install PostgreSQL via Homebrew
brew install postgresql

# Start PostgreSQL service
brew services start postgresql

# Create database
createdb bbm_pos
psql bbm_pos

CREATE USER bbm_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE bbm_pos TO bbm_user;
\q
```

## Development Tools Setup

### VS Code Configuration

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "php.validate.enable": true,
  "php.validate.executablePath": "/usr/bin/php",
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.associations": {
    "*.blade.php": "blade"
  }
}
```

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json",
    "bmewburn.vscode-intelephense-client",
    "onecentlin.laravel-blade",
    "ryannaddy.laravel-artisan"
  ]
}
```

### Laravel IDE Helper

```bash
# Install Laravel IDE Helper for better IntelliSense
composer require --dev barryvdh/laravel-ide-helper

# Generate helper files
php artisan ide-helper:generate
php artisan ide-helper:models
php artisan ide-helper:meta
```

### PHP CS Fixer

```bash
# Install PHP CS Fixer
composer require --dev friendsofphp/php-cs-fixer

# Create configuration file
touch .php-cs-fixer.dist.php
```

Add to `.php-cs-fixer.dist.php`:

```php
<?php

$finder = PhpCsFixer\Finder::create()
    ->in(__DIR__)
    ->exclude(['bootstrap', 'storage', 'vendor'])
    ->name('*.php')
    ->notName('*.blade.php')
    ->ignoreDotFiles(true)
    ->ignoreVCS(true);

return (new PhpCsFixer\Config())
    ->setRules([
        '@PSR12' => true,
        'array_syntax' => ['syntax' => 'short'],
        'ordered_imports' => ['sort_algorithm' => 'alpha'],
        'no_unused_imports' => true,
    ])
    ->setFinder($finder);
```

## Testing Setup

### Laravel Testing

```bash
# Install testing dependencies
composer require --dev phpunit/phpunit
composer require --dev mockery/mockery

# Create test database
php artisan make:test BranchControllerTest
php artisan make:test UserControllerTest
```

Configure `phpunit.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="./vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true">
    <testsuites>
        <testsuite name="Unit">
            <directory suffix="Test.php">./tests/Unit</directory>
        </testsuite>
        <testsuite name="Feature">
            <directory suffix="Test.php">./tests/Feature</directory>
        </testsuite>
    </testsuites>
    <php>
        <env name="APP_ENV" value="testing"/>
        <env name="BCRYPT_ROUNDS" value="4"/>
        <env name="CACHE_DRIVER" value="array"/>
        <env name="DB_CONNECTION" value="sqlite"/>
        <env name="DB_DATABASE" value=":memory:"/>
        <env name="MAIL_MAILER" value="array"/>
        <env name="QUEUE_CONNECTION" value="sync"/>
        <env name="SESSION_DRIVER" value="array"/>
    </php>
</phpunit>
```

### Frontend Testing

```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Create jest configuration
touch jest.config.js
```

Add to `jest.config.js`:

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
}

module.exports = createJestConfig(customJestConfig)
```

## Docker Setup (Optional)

### Laravel Docker

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - .:/var/www/html
    depends_on:
      - mysql
    environment:
      - DB_HOST=mysql
      - DB_DATABASE=bbm_pos
      - DB_USERNAME=root
      - DB_PASSWORD=secret

  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=secret
      - MYSQL_DATABASE=bbm_pos
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

volumes:
  mysql_data:
```

Create `Dockerfile`:

```dockerfile
FROM php:8.2-fpm

WORKDIR /var/www/html

RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip

RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

COPY . .

RUN composer install

EXPOSE 8000

CMD php artisan serve --host=0.0.0.0 --port=8000
```

## Common Issues and Solutions

### CORS Issues

If you encounter CORS issues:

1. Ensure `SANCTUM_STATEFUL_DOMAINS` includes your frontend domain
2. Check that `withCredentials: true` is set in axios config
3. Verify CORS middleware is properly configured

### Database Connection Issues

1. Check database credentials in `.env`
2. Ensure database server is running
3. Verify database exists and user has proper permissions

### Authentication Issues

1. Clear Laravel config cache: `php artisan config:clear`
2. Check Sanctum middleware is added to API routes
3. Verify CSRF token is being retrieved before login

### Build Issues

1. Clear Next.js cache: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check TypeScript errors: `npm run typecheck`

## Development Workflow

### Daily Development Process

1. **Start Services**
   ```bash
   # Terminal 1 - Laravel
   cd backend && php artisan serve
   
   # Terminal 2 - Frontend
   cd frontend && npm run dev
   
   # Terminal 3 - Database (if needed)
   mysql -u bbm_user -p bbm_pos
   ```

2. **Make Changes**
   - Update backend API endpoints
   - Modify frontend components
   - Test changes in browser

3. **Test Changes**
   ```bash
   # Backend tests
   php artisan test
   
   # Frontend tests
   npm test
   
   # API tests with Postman/Insomnia
   ```

4. **Git Workflow**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature-branch
   ```

### Code Quality Checks

```bash
# PHP CS Fixer
vendor/bin/php-cs-fixer fix

# ESLint
npm run lint

# TypeScript check
npm run typecheck

# Laravel Pint (alternative to PHP CS Fixer)
./vendor/bin/pint
```

This development setup guide provides a comprehensive foundation for building and maintaining the BBM POS application with Laravel 10 backend and Next.js frontend.