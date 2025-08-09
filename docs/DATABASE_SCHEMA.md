# Database Schema Migration

This document details the database schema for migrating from Appwrite to Laravel 10 with MySQL/PostgreSQL.

## Schema Overview

The BBM POS system requires the following core entities:
- Branches (stores/locations)
- Users (staff members)
- Customers
- Suppliers
- Inventory (categories and items)
- Transactions (POS sales)
- Purchase Orders
- Expenses
- Notifications
- Bank Accounts

## Laravel Migrations

### 1. Create Branches Table

```php
<?php
// database/migrations/2024_01_01_000001_create_branches_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('invoice_name');
            $table->string('currency', 10)->default('IDR');
            $table->decimal('tax_rate', 5, 2)->default(11.00);
            $table->text('address')->nullable();
            $table->string('phone_number', 20)->nullable();
            $table->string('transaction_deletion_password')->nullable();
            $table->timestamps();
            
            $table->index('name');
        });
    }

    public function down()
    {
        Schema::dropIfExists('branches');
    }
};
```

### 2. Create Users Table

```php
<?php
// database/migrations/2024_01_01_000002_create_users_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->enum('role', ['admin', 'manager', 'cashier']);
            $table->string('avatar_url', 512)->nullable();
            $table->string('local_printer_url', 512)->nullable();
            $table->rememberToken();
            $table->timestamps();
            
            $table->index(['branch_id', 'role']);
            $table->index('email');
        });
    }

    public function down()
    {
        Schema::dropIfExists('users');
    }
};
```

### 3. Create Customers Table

```php
<?php
// database/migrations/2024_01_01_000003_create_customers_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone', 20)->nullable();
            $table->text('address')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            
            $table->index(['branch_id', 'name']);
            $table->index('email');
            $table->index('phone');
        });
    }

    public function down()
    {
        Schema::dropIfExists('customers');
    }
};
```

### 4. Create Suppliers Table

```php
<?php
// database/migrations/2024_01_01_000004_create_suppliers_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('contact_person')->nullable();
            $table->string('email')->nullable();
            $table->string('phone_number', 20)->nullable();
            $table->text('address')->nullable();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            
            $table->index(['branch_id', 'name']);
            $table->index('email');
        });
    }

    public function down()
    {
        Schema::dropIfExists('suppliers');
    }
};
```

### 5. Create Inventory Categories Table

```php
<?php
// database/migrations/2024_01_01_000005_create_inventory_categories_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('inventory_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            
            $table->unique(['name', 'branch_id']);
            $table->index('branch_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('inventory_categories');
    }
};
```

### 6. Create Inventory Items Table

```php
<?php
// database/migrations/2024_01_01_000006_create_inventory_items_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('sku', 100)->unique()->nullable();
            $table->string('image_url', 512)->nullable();
            $table->string('image_hint')->nullable();
            $table->decimal('price', 15, 2);
            $table->decimal('cost_price', 15, 2);
            $table->integer('quantity')->default(0);
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('category_id')->nullable()->constrained('inventory_categories')->onDelete('set null');
            $table->string('category_name')->nullable(); // Denormalized for performance
            $table->timestamps();
            
            $table->index(['branch_id', 'name']);
            $table->index(['branch_id', 'category_id']);
            $table->index('sku');
            $table->index(['quantity', 'branch_id']); // For low stock queries
        });
    }

    public function down()
    {
        Schema::dropIfExists('inventory_items');
    }
};
```

### 7. Create POS Shifts Table

```php
<?php
// database/migrations/2024_01_01_000007_create_pos_shifts_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('pos_shifts', function (Blueprint $table) {
            $table->id();
            $table->decimal('initial_cash', 15, 2)->default(0);
            $table->enum('status', ['active', 'closed'])->default('active');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->json('total_sales_by_payment_method')->nullable();
            $table->timestamp('start_time');
            $table->timestamp('end_time')->nullable();
            $table->decimal('closing_cash', 15, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index(['branch_id', 'status']);
            $table->index(['user_id', 'start_time']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('pos_shifts');
    }
};
```

### 8. Create POS Transactions Table

```php
<?php
// database/migrations/2024_01_01_000008_create_pos_transactions_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('pos_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number')->unique();
            $table->foreignId('shift_id')->nullable()->constrained('pos_shifts')->onDelete('set null');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('customer_id')->nullable()->constrained()->onDelete('set null');
            $table->string('customer_name')->nullable();
            
            // Financial fields
            $table->decimal('subtotal', 15, 2);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('shipping_cost', 15, 2)->default(0);
            $table->decimal('voucher_discount_amount', 15, 2)->default(0);
            $table->decimal('total_discount_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2);
            $table->decimal('total_cost', 15, 2); // For profit calculation
            
            // Payment fields
            $table->string('payment_terms', 50)->default('cash');
            $table->decimal('amount_paid', 15, 2);
            $table->decimal('change_given', 15, 2)->default(0);
            
            // Credit sale fields
            $table->boolean('is_credit_sale')->default(false);
            $table->date('credit_due_date')->nullable();
            $table->decimal('outstanding_amount', 15, 2)->default(0);
            $table->enum('payment_status', ['paid', 'partial', 'pending'])->default('paid');
            
            // Status and metadata
            $table->enum('status', ['completed', 'returned', 'cancelled'])->default('completed');
            $table->string('bank_name')->nullable();
            $table->string('bank_transaction_ref')->nullable();
            $table->timestamp('transaction_timestamp');
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index(['branch_id', 'transaction_timestamp']);
            $table->index(['user_id', 'transaction_timestamp']);
            $table->index(['customer_id', 'transaction_timestamp']);
            $table->index(['status', 'payment_status']);
            $table->index('invoice_number');
        });
    }

    public function down()
    {
        Schema::dropIfExists('pos_transactions');
    }
};
```

### 9. Create POS Transaction Items Table

```php
<?php
// database/migrations/2024_01_01_000009_create_pos_transaction_items_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('pos_transaction_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained('pos_transactions')->onDelete('cascade');
            $table->foreignId('inventory_item_id')->constrained()->onDelete('cascade');
            $table->string('product_name'); // Denormalized for historical data
            $table->string('product_sku')->nullable(); // Denormalized
            $table->integer('quantity');
            $table->decimal('unit_price', 15, 2);
            $table->decimal('unit_cost', 15, 2); // For profit calculation
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('total_price', 15, 2); // (unit_price * quantity) - discount_amount
            $table->decimal('total_cost', 15, 2); // unit_cost * quantity
            $table->timestamps();
            
            $table->index(['transaction_id']);
            $table->index(['inventory_item_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('pos_transaction_items');
    }
};
```

### 10. Create Purchase Orders Table

```php
<?php
// database/migrations/2024_01_01_000010_create_purchase_orders_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->string('po_number')->unique();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('supplier_id')->constrained()->onDelete('cascade');
            $table->string('supplier_name'); // Denormalized
            $table->date('order_date');
            $table->date('expected_delivery_date')->nullable();
            $table->date('payment_due_date')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by_id')->constrained('users')->onDelete('cascade');
            
            // Financial fields
            $table->decimal('subtotal', 15, 2);
            $table->decimal('shipping_cost', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2);
            
            // Credit purchase fields
            $table->boolean('is_credit_purchase')->default(false);
            $table->string('payment_terms', 64)->nullable();
            $table->string('supplier_invoice_number')->nullable();
            $table->decimal('outstanding_amount', 15, 2)->default(0);
            $table->enum('payment_status', ['paid', 'partial', 'pending'])->default('pending');
            
            // Status
            $table->enum('status', ['draft', 'sent', 'confirmed', 'received', 'cancelled'])->default('draft');
            
            $table->timestamps();
            
            $table->index(['branch_id', 'order_date']);
            $table->index(['supplier_id', 'order_date']);
            $table->index(['status', 'payment_status']);
            $table->index('po_number');
        });
    }

    public function down()
    {
        Schema::dropIfExists('purchase_orders');
    }
};
```

### 11. Create Purchase Order Items Table

```php
<?php
// database/migrations/2024_01_01_000011_create_purchase_order_items_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained()->onDelete('cascade');
            $table->foreignId('inventory_item_id')->constrained()->onDelete('cascade');
            $table->string('product_name'); // Denormalized
            $table->string('product_sku')->nullable(); // Denormalized
            $table->integer('quantity_ordered');
            $table->integer('quantity_received')->default(0);
            $table->decimal('unit_cost', 15, 2);
            $table->decimal('total_cost', 15, 2);
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index(['purchase_order_id']);
            $table->index(['inventory_item_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('purchase_order_items');
    }
};
```

### 12. Create Stock Mutations Table

```php
<?php
// database/migrations/2024_01_01_000012_create_stock_mutations_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('stock_mutations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('inventory_item_id')->constrained()->onDelete('cascade');
            $table->string('product_name'); // Denormalized
            $table->timestamp('mutation_time');
            $table->enum('type', ['sale', 'purchase', 'adjustment', 'return', 'transfer']);
            $table->integer('quantity_change'); // Can be negative
            $table->integer('stock_before_mutation');
            $table->integer('stock_after_mutation');
            $table->string('reference_id')->nullable(); // Reference to transaction, PO, etc.
            $table->string('reference_type')->nullable(); // 'transaction', 'purchase_order', etc.
            $table->text('notes')->nullable();
            $table->foreignId('created_by_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->index(['branch_id', 'mutation_time']);
            $table->index(['inventory_item_id', 'mutation_time']);
            $table->index(['type', 'mutation_time']);
            $table->index(['reference_id', 'reference_type']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('stock_mutations');
    }
};
```

### 13. Create Expenses Table

```php
<?php
// database/migrations/2024_01_01_000013_create_expenses_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->string('category', 64);
            $table->decimal('amount', 15, 2);
            $table->string('description');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->date('expense_date');
            $table->string('receipt_url')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index(['branch_id', 'expense_date']);
            $table->index(['category', 'expense_date']);
            $table->index(['user_id', 'expense_date']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('expenses');
    }
};
```

### 14. Create Bank Accounts Table

```php
<?php
// database/migrations/2024_01_01_000014_create_bank_accounts_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('bank_name');
            $table->string('account_number', 64);
            $table->string('account_holder_name');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->unique(['account_number', 'bank_name']);
            $table->index(['branch_id', 'is_active']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('bank_accounts');
    }
};
```

### 15. Create Notifications Table

```php
<?php
// database/migrations/2024_01_01_000015_create_notifications_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('message');
            $table->string('category');
            $table->foreignId('created_by_id')->constrained('users')->onDelete('cascade');
            $table->string('created_by_name'); // Denormalized
            $table->boolean('is_global')->default(false);
            $table->string('link_url', 512)->nullable();
            $table->foreignId('target_branch_id')->nullable()->constrained('branches')->onDelete('cascade');
            $table->timestamps();
            
            $table->index(['target_branch_id', 'created_at']);
            $table->index(['is_global', 'created_at']);
            $table->index(['category', 'created_at']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('notifications');
    }
};
```

### 16. Create User Notification Status Table

```php
<?php
// database/migrations/2024_01_01_000016_create_user_notification_status_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('user_notification_status', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('notification_id')->constrained()->onDelete('cascade');
            $table->timestamp('read_at')->nullable();
            $table->timestamp('dismissed_at')->nullable();
            $table->timestamps();
            
            $table->unique(['user_id', 'notification_id']);
            $table->index(['user_id', 'read_at']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('user_notification_status');
    }
};
```

### 17. Create Payment Records Table

```php
<?php
// database/migrations/2024_01_01_000017_create_payment_records_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('payment_records', function (Blueprint $table) {
            $table->id();
            $table->morphs('payable'); // Can be pos_transaction or purchase_order
            $table->decimal('amount', 15, 2);
            $table->enum('method', ['cash', 'bank_transfer', 'credit_card', 'e_wallet', 'check']);
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('bank_account_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('created_by_id')->constrained('users')->onDelete('cascade');
            $table->timestamp('payment_date');
            $table->timestamps();
            
            $table->index(['payable_type', 'payable_id']);
            $table->index(['method', 'payment_date']);
            $table->index(['bank_account_id', 'payment_date']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('payment_records');
    }
};
```

## Data Mapping from Appwrite

### Appwrite to Laravel Field Mapping

#### Branches Collection
```
Appwrite -> Laravel
$id -> id
name -> name
invoiceName -> invoice_name
currency -> currency
taxRate -> tax_rate
address -> address
phoneNumber -> phone_number
transactionDeletionPassword -> transaction_deletion_password
$createdAt -> created_at
$updatedAt -> updated_at
```

#### Users Collection
```
Appwrite -> Laravel
$id -> id
name -> name
email -> email
branchId -> branch_id
role -> role
avatarUrl -> avatar_url
localPrinterUrl -> local_printer_url
$createdAt -> created_at
$updatedAt -> updated_at
```

#### Inventory Items Collection
```
Appwrite -> Laravel
$id -> id
name -> name
sku -> sku
imageUrl -> image_url
imageHint -> image_hint
price -> price
costPrice -> cost_price
quantity -> quantity
branchId -> branch_id
categoryId -> category_id
categoryName -> category_name
$createdAt -> created_at
$updatedAt -> updated_at
```

## Database Seeder

### Create DatabaseSeeder

```php
<?php
// database/seeders/DatabaseSeeder.php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        $this->call([
            BranchSeeder::class,
            UserSeeder::class,
            InventoryCategorySeeder::class,
            BankAccountSeeder::class,
        ]);
    }
}
```

### Create Branch Seeder

```php
<?php
// database/seeders/BranchSeeder.php

namespace Database\Seeders;

use App\Models\Branch;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    public function run()
    {
        Branch::create([
            'name' => 'Main Branch',
            'invoice_name' => 'BBM POS Main Store',
            'currency' => 'IDR',
            'tax_rate' => 11.0,
            'address' => 'Jl. Raya No. 123, Jakarta',
            'phone_number' => '+62-21-12345678',
        ]);
    }
}
```

### Create User Seeder

```php
<?php
// database/seeders/UserSeeder.php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Branch;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run()
    {
        $mainBranch = Branch::first();
        
        User::create([
            'name' => 'System Administrator',
            'email' => 'admin@bbmpos.com',
            'password' => Hash::make('password'),
            'branch_id' => $mainBranch->id,
            'role' => 'admin',
        ]);
        
        User::create([
            'name' => 'Store Manager',
            'email' => 'manager@bbmpos.com',
            'password' => Hash::make('password'),
            'branch_id' => $mainBranch->id,
            'role' => 'manager',
        ]);
        
        User::create([
            'name' => 'Cashier User',
            'email' => 'cashier@bbmpos.com',
            'password' => Hash::make('password'),
            'branch_id' => $mainBranch->id,
            'role' => 'cashier',
        ]);
    }
}
```

## Database Indexes for Performance

### Additional Indexes for Reporting

```sql
-- Additional indexes for better performance
CREATE INDEX idx_pos_transactions_branch_date ON pos_transactions(branch_id, DATE(transaction_timestamp));
CREATE INDEX idx_pos_transactions_user_date ON pos_transactions(user_id, DATE(transaction_timestamp));
CREATE INDEX idx_pos_transaction_items_product_date ON pos_transaction_items(inventory_item_id, DATE(created_at));
CREATE INDEX idx_stock_mutations_item_date ON stock_mutations(inventory_item_id, DATE(mutation_time));
CREATE INDEX idx_expenses_branch_date ON expenses(branch_id, expense_date);
CREATE INDEX idx_purchase_orders_supplier_date ON purchase_orders(supplier_id, order_date);

-- Composite indexes for complex queries
CREATE INDEX idx_transactions_status_date ON pos_transactions(status, payment_status, DATE(transaction_timestamp));
CREATE INDEX idx_inventory_branch_category ON inventory_items(branch_id, category_id, quantity);
CREATE INDEX idx_users_branch_role ON users(branch_id, role, created_at);
```

## Views for Reporting

### Sales Summary View

```sql
CREATE VIEW sales_summary AS
SELECT 
    t.id,
    t.invoice_number,
    t.branch_id,
    b.name as branch_name,
    t.user_id,
    u.name as cashier_name,
    t.customer_id,
    t.customer_name,
    t.subtotal,
    t.tax_amount,
    t.total_discount_amount,
    t.total_amount,
    t.total_cost,
    (t.total_amount - t.total_cost) as profit,
    t.payment_status,
    t.status,
    DATE(t.transaction_timestamp) as transaction_date,
    t.transaction_timestamp
FROM pos_transactions t
JOIN branches b ON t.branch_id = b.id
JOIN users u ON t.user_id = u.id
WHERE t.status = 'completed';
```

### Inventory Summary View

```sql
CREATE VIEW inventory_summary AS
SELECT 
    i.id,
    i.name,
    i.sku,
    i.price,
    i.cost_price,
    i.quantity,
    (i.price * i.quantity) as total_value,
    (i.cost_price * i.quantity) as total_cost,
    i.branch_id,
    b.name as branch_name,
    i.category_id,
    c.name as category_name,
    CASE 
        WHEN i.quantity <= 5 THEN 'Low Stock'
        WHEN i.quantity = 0 THEN 'Out of Stock'
        ELSE 'In Stock'
    END as stock_status
FROM inventory_items i
JOIN branches b ON i.branch_id = b.id
LEFT JOIN inventory_categories c ON i.category_id = c.id;
```

## Stored Procedures

### Update Stock Procedure

```sql
DELIMITER //

CREATE PROCEDURE UpdateStock(
    IN item_id BIGINT,
    IN quantity_change INT,
    IN mutation_type VARCHAR(20),
    IN reference_id VARCHAR(255),
    IN reference_type VARCHAR(50),
    IN user_id BIGINT,
    IN notes TEXT
)
BEGIN
    DECLARE current_stock INT;
    DECLARE new_stock INT;
    DECLARE item_name VARCHAR(255);
    DECLARE branch_id BIGINT;
    
    -- Get current stock and item details
    SELECT quantity, name, branch_id INTO current_stock, item_name, branch_id
    FROM inventory_items 
    WHERE id = item_id;
    
    -- Calculate new stock
    SET new_stock = current_stock + quantity_change;
    
    -- Prevent negative stock
    IF new_stock < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock cannot be negative';
    END IF;
    
    -- Update inventory
    UPDATE inventory_items 
    SET quantity = new_stock, updated_at = NOW()
    WHERE id = item_id;
    
    -- Record stock mutation
    INSERT INTO stock_mutations (
        branch_id, inventory_item_id, product_name, mutation_time,
        type, quantity_change, stock_before_mutation, stock_after_mutation,
        reference_id, reference_type, notes, created_by_id, created_at, updated_at
    ) VALUES (
        branch_id, item_id, item_name, NOW(),
        mutation_type, quantity_change, current_stock, new_stock,
        reference_id, reference_type, notes, user_id, NOW(), NOW()
    );
END //

DELIMITER ;
```

## Data Validation Rules

### Model Validation

```php
// app/Models/InventoryItem.php
public static function rules()
{
    return [
        'name' => 'required|string|max:255',
        'sku' => 'nullable|string|max:100|unique:inventory_items',
        'price' => 'required|numeric|min:0',
        'cost_price' => 'required|numeric|min:0',
        'quantity' => 'required|integer|min:0',
        'category_id' => 'nullable|exists:inventory_categories,id',
        'image_url' => 'nullable|url|max:512',
    ];
}
```

## Backup Strategy

### Daily Backup Script

```bash
#!/bin/bash
# backup-database.sh

DB_NAME="bbm_pos"
DB_USER="root"
DB_PASS="password"
BACKUP_DIR="/var/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform backup
mysqldump -u$DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/bbm_pos_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/bbm_pos_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "bbm_pos_*.sql.gz" -mtime +30 -delete

echo "Backup completed: bbm_pos_$DATE.sql.gz"
```

This comprehensive database schema provides a solid foundation for the Laravel backend migration, ensuring data integrity, performance, and scalability for the BBM POS application.