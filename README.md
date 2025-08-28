# BBM POS (BranchWise) - Multi-Branch Point of Sale System

A comprehensive Point of Sale system designed for multi-branch retail businesses with advanced inventory management, financial tracking, and user management capabilities.

## 🚀 Quick Start

This application is currently migrating from Firebase → Appwrite → Laravel 10 backend. For complete setup and migration information, please refer to our comprehensive documentation.

### 📚 Documentation

**Start here**: [Complete Documentation](./docs/README.md)

Key documentation files:
- **[Laravel Migration Guide](./docs/LARAVEL_MIGRATION_GUIDE.md)** - Complete migration strategy and architecture
- **[Development Setup](./docs/DEVELOPMENT_SETUP.md)** - Step-by-step environment setup
- **[API Reference](./docs/API_REFERENCE.md)** - Complete API documentation
- **[Database Schema](./docs/DATABASE_SCHEMA.md)** - Database design and migrations

## 🏗️ Architecture

### Current State
- **Frontend**: Next.js 15.3.3 with TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Transitioning from Appwrite to Laravel 10
- **Database**: Moving to MySQL/PostgreSQL with Laravel Eloquent ORM
- **Authentication**: Laravel Sanctum with session-based auth

### Migration Progress
```
✅ Firebase (Legacy) → ✅ Appwrite (Current) → 🔄 Laravel 10 (In Progress)
```

## 🎯 Core Features

- **Multi-branch POS Interface** - Support for multiple store locations
- **Inventory Management** - Categories, items, stock tracking, mutations
- **Financial Operations** - Sales transactions, purchase orders, expenses
- **User Management** - Role-based access (admin, manager, cashier)
- **Customer & Supplier Management** - Complete relationship tracking
- **Comprehensive Reporting** - Sales, inventory, and financial reports
- **Real-time Notifications** - System-wide and branch-specific alerts

## 🛠️ Technology Stack

**Frontend**
- Next.js 15.3.3 with React 18.3.1
- TypeScript for type safety
- TailwindCSS + shadcn/ui components
- React Query for state management
- Axios for HTTP requests

**Backend (Target)**
- Laravel 10 with PHP 8.2+
- Laravel Sanctum authentication
- MySQL/PostgreSQL database
- Eloquent ORM

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- PHP 8.2+
- MySQL 8.0+ or PostgreSQL 13+
- Composer

### Quick Setup
```bash
# Clone the repository
git clone <repository-url>
cd BBM-POS-NEW

# Install frontend dependencies
npm install

# Start development server
npm run dev
```

**For complete setup instructions**, including Laravel backend setup, please see: [Development Setup Guide](./docs/DEVELOPMENT_SETUP.md)

## 🔧 Development

### Frontend Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
```

### Backend Development (Laravel)
```bash
php artisan serve    # Start Laravel development server
php artisan migrate  # Run database migrations
php artisan test     # Run tests
```

## 📊 Migration Status

### Phase 1: Laravel Backend Development (In Progress)
- [ ] Laravel project setup and configuration
- [ ] Database migrations and models
- [ ] API controllers and routes
- [ ] Authentication with Sanctum
- [ ] Business logic implementation

### Phase 2: API Integration (Planned)
- [ ] Update frontend API client
- [ ] Implement Laravel API calls
- [ ] Error handling and validation
- [ ] Test all CRUD operations

### Phase 3: Data Migration (Planned)
- [ ] Export data from Appwrite
- [ ] Data transformation scripts
- [ ] Import to Laravel database
- [ ] Data integrity verification

### Phase 4: Deployment & Testing (Planned)
- [ ] Production environment setup
- [ ] Laravel backend deployment
- [ ] Frontend configuration updates
- [ ] Comprehensive testing

## 🤝 Contributing

1. Read the [Development Setup Guide](./docs/DEVELOPMENT_SETUP.md)
2. Review the [Laravel Migration Guide](./docs/LARAVEL_MIGRATION_GUIDE.md)
3. Check the [API Reference](./docs/API_REFERENCE.md) for endpoint specifications
4. Follow the coding standards and create pull requests

## 📄 License

This project is proprietary software. Please contact the development team for licensing information.

## 📞 Support

For detailed documentation, setup instructions, and development guidelines, please refer to the [complete documentation](./docs/README.md).

---

**Note**: This application is currently undergoing a backend migration. For the most up-to-date information on setup and development, please refer to the documentation in the `/docs` folder.
