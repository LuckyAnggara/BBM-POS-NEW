# Invoicing Module API Endpoints

This document outlines the API endpoints that need to be implemented on the Laravel backend to support the new invoicing module.

## Overview

The invoicing module extends the existing Sale model to provide dedicated invoice management with proper status tracking, sales agent integration, and accounts receivable management. This approach leverages the robust existing infrastructure while adding invoice-specific features.

## Implementation Strategy

**Based on technical analysis, this implementation extends the existing Sale model rather than creating separate invoice tables.** This approach provides:

- Zero data migration risk
- Backward compatibility
- Faster development time
- Consistent architecture
- Lower maintenance overhead

The Sale model will be enhanced with invoice-specific fields and functionality while maintaining all existing POS capabilities.

## Required API Endpoints

### 1. Invoice CRUD Operations

#### Create Invoice

```
POST /api/invoices
```

**Request Body:**

```json
{
  "customer_id": 1,
  "sales_id": 2,
  "due_date": "2024-02-15",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": 100000
    }
  ],
  "notes": "Optional notes",
  "shipping_cost": 50000,
  "tax_amount": 22000
}
```

**Response:**

```json
{
  "id": 1,
  "transaction_number": "TRX-20240115-ABC123",
  "invoice_number": "INV-2024-001",
  "customer_id": 1,
  "customer_name": "PT. Example",
  "sales_id": 2,
  "sales_name": "John Doe",
  "branch_id": 1,
  "subtotal": 200000,
  "tax_amount": 22000,
  "shipping_cost": 50000,
  "total_amount": 272000,
  "amount_paid": 0,
  "outstanding_amount": 272000,
  "payment_status": "unpaid",
  "invoice_status": "draft",
  "is_credit_sale": true,
  "is_invoice": true,
  "transaction_type": "invoice",
  "credit_due_date": "2024-02-15",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z",
  "sale_details": [
    {
      "id": 1,
      "product_id": 1,
      "product_name": "Product Name",
      "quantity": 2,
      "price_at_sale": 100000,
      "subtotal": 200000
    }
  ],
  "customer": {
    "id": 1,
    "name": "PT. Example",
    "customer_type": "business"
  },
  "sales_employee": {
    "id": 2,
    "name": "John Doe"
  }
}
```

#### List Invoices

```
GET /api/invoices
```

**Query Parameters:**

- `branch_id` (optional): Filter by branch
- `invoice_status` (optional): Filter by invoice status (draft, unpaid, partial, paid, overdue)
- `customer_id` (optional): Filter by customer
- `sales_id` (optional): Filter by sales agent
- `search` (optional): Search in invoice number, transaction number, customer name, sales agent name
- `start_date` (optional): Filter from date
- `end_date` (optional): Filter to date
- `page` (optional): Page number for pagination
- `per_page` (optional): Items per page

**Note:** This endpoint automatically filters to only show invoices (`is_invoice = true`)

**Response:**

```json
{
  "data": [...],
  "total": 100,
  "current_page": 1,
  "last_page": 10,
  "per_page": 10
}
```

#### Get Single Invoice

```
GET /api/invoices/{id}
```

**Response:** Same as create response

#### Update Invoice

```
PUT /api/invoices/{id}
```

**Request Body:** Same as create (partial updates allowed)

#### Update Invoice Status

```
PATCH /api/invoices/{id}/status
```

**Request Body:**

```json
{
  "invoice_status": "paid",
  "payment_amount": 272000,
  "notes": "Paid via bank transfer"
}
```

#### Delete Invoice

```
DELETE /api/invoices/{id}
```

**Note:** Only allow deletion if invoice_status is "draft"

### 2. Invoice Utilities

#### Generate Invoice Number

```
POST /api/invoices/generate-number
```

**Request Body:**

```json
{
  "branch_id": 1
}
```

**Response:**

```json
{
  "invoice_number": "INV-2024-001"
}
```

#### Get Invoice Summary

```
GET /api/invoices/summary?branch_id=1
```

**Response:**

```json
{
  "total_invoices": 50,
  "total_amount": 10000000,
  "total_outstanding": 5000000,
  "total_paid": 5000000,
  "overdue_count": 5,
  "overdue_amount": 1000000,
  "by_status": {
    "draft": 2,
    "unpaid": 15,
    "partial": 8,
    "paid": 20,
    "overdue": 5
  }
}
```

#### Download Invoice PDF

```
GET /api/invoices/{id}/pdf
```

**Response:** Binary PDF file with headers:

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="invoice-{id}.pdf"
```

#### Mark Invoice as Overdue

```
POST /api/invoices/{id}/mark-overdue
```

**Response:** Updated invoice object

### 3. Integration Endpoints

#### Convert Sale to Invoice

```
POST /api/sales/{id}/convert-to-invoice
```

**Request Body:**

```json
{
  "due_date": "2024-02-15",
  "notes": "Converted from POS sale"
}
```

**Response:** Updated sale object with invoice fields populated

#### Get POS Transactions (Non-Invoices)

```
GET /api/pos/transactions
```

**Query Parameters:** Same as invoice list, but filters `is_invoice = false`

**Response:** List of POS transactions only

## Database Schema Requirements

### Enhanced Sales Table (Migration Required)

```sql
-- Add invoice-specific fields to existing sales table
ALTER TABLE sales ADD COLUMN invoice_number VARCHAR(50) NULL AFTER transaction_number;
ALTER TABLE sales ADD COLUMN invoice_status ENUM('draft', 'unpaid', 'partial', 'paid', 'overdue') NULL AFTER payment_status;
ALTER TABLE sales ADD COLUMN is_invoice BOOLEAN DEFAULT FALSE AFTER is_credit_sale;
ALTER TABLE sales ADD COLUMN transaction_type ENUM('pos', 'invoice') DEFAULT 'pos' AFTER is_invoice;

-- Add indexes for performance
CREATE INDEX idx_sales_invoice_number ON sales(invoice_number);
CREATE INDEX idx_sales_invoice_status ON sales(invoice_status);
CREATE INDEX idx_sales_is_invoice ON sales(is_invoice);
CREATE INDEX idx_sales_transaction_type ON sales(transaction_type);

-- Update existing credit sales to be invoices (optional migration)
UPDATE sales SET is_invoice = TRUE, transaction_type = 'invoice' WHERE is_credit_sale = TRUE;
```

### Existing Tables (No Changes Required)

The following existing tables already provide all necessary functionality:

**sales table** - Enhanced with new invoice fields

```sql
-- Existing fields that support invoicing:
id, transaction_number, branch_id, customer_id, sales_id (sales agent),
subtotal, tax_amount, shipping_cost, total_amount, amount_paid, outstanding_amount,
is_credit_sale, credit_due_date, payment_status, notes, created_at, updated_at

-- New fields added:
invoice_number, invoice_status, is_invoice, transaction_type
```

**sale_details table** - Already handles item details

```sql
-- Existing structure perfect for invoice items:
id, sale_id, product_id, product_name, quantity, price_at_sale, subtotal, etc.
```

**customer_payments table** - Already handles partial payments

```sql
-- Existing structure perfect for invoice payments:
id, sale_id, payment_date, amount_paid, payment_method, reference_number, notes, etc.
```

## Enhanced Sale Model Requirements

### New Model Methods

```php
// Enhanced Sale Model
class Sale extends Model
{
    // Add new fillable fields
    protected $fillable = [
        // ... existing fields
        'invoice_number',
        'invoice_status',
        'is_invoice',
        'transaction_type',
    ];

    // Add invoice-specific methods
    public function generateInvoiceNumber(): string
    {
        $year = date('Y');
        $branch = $this->branch_id;
        $sequence = Sale::where('is_invoice', true)
            ->where('created_at', '>=', "$year-01-01")
            ->where('branch_id', $branch)
            ->count() + 1;

        return "INV-$year-" . str_pad($sequence, 3, '0', STR_PAD_LEFT);
    }

    public function markAsOverdue(): bool
    {
        if ($this->is_invoice && $this->credit_due_date < now() && $this->outstanding_amount > 0) {
            $this->update(['invoice_status' => 'overdue']);
            return true;
        }
        return false;
    }

    public function updateInvoiceStatus(): void
    {
        if (!$this->is_invoice) return;

        if ($this->outstanding_amount <= 0) {
            $this->invoice_status = 'paid';
        } elseif ($this->amount_paid > 0) {
            $this->invoice_status = 'partial';
        } elseif ($this->credit_due_date < now()) {
            $this->invoice_status = 'overdue';
        } else {
            $this->invoice_status = 'unpaid';
        }

        $this->save();
    }

    // Scope for invoices only
    public function scopeInvoices($query)
    {
        return $query->where('is_invoice', true);
    }

    // Scope for POS transactions only
    public function scopePosTransactions($query)
    {
        return $query->where('is_invoice', false);
    }

    // Existing relationships remain the same
    public function saleDetails(): HasMany
    public function customerPayments(): HasMany
    public function customer(): BelongsTo
    public function salesEmployee(): BelongsTo
    public function branch(): BelongsTo
}
```

### Controller Implementation

```php
// Invoice Controller
class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        return Sale::invoices()
            ->with(['customer', 'salesEmployee', 'saleDetails'])
            ->when($request->invoice_status, fn($q, $status) => $q->where('invoice_status', $status))
            ->when($request->customer_id, fn($q, $id) => $q->where('customer_id', $id))
            ->when($request->sales_id, fn($q, $id) => $q->where('sales_id', $id))
            ->when($request->search, function($q, $search) {
                $q->where(function($query) use ($search) {
                    $query->where('invoice_number', 'like', "%{$search}%")
                          ->orWhere('transaction_number', 'like', "%{$search}%")
                          ->orWhereHas('customer', fn($q) => $q->where('name', 'like', "%{$search}%"));
                });
            })
            ->paginate($request->per_page ?? 25);
    }

    public function store(Request $request)
    {
        $sale = Sale::create([
            // ... invoice data
            'is_invoice' => true,
            'transaction_type' => 'invoice',
            'invoice_status' => 'draft',
            'is_credit_sale' => true,
        ]);

        $sale->invoice_number = $sale->generateInvoiceNumber();
        $sale->save();

        return $sale->fresh();
    }

    public function show(Sale $sale)
    {
        if (!$sale->is_invoice) {
            return response()->json(['message' => 'Not an invoice'], 404);
        }

        return $sale->load(['customer', 'salesEmployee', 'saleDetails', 'customerPayments']);
    }
}

// Enhanced POS Controller
class PosController extends Controller
{
    public function index(Request $request)
    {
        return Sale::posTransactions()
            ->with(['customer', 'saleDetails'])
            ->when($request->search, function($q, $search) {
                // POS specific search logic
            })
            ->paginate($request->per_page ?? 25);
    }

    public function convertToInvoice(Request $request, Sale $sale)
    {
        if ($sale->is_invoice) {
            return response()->json(['message' => 'Already an invoice'], 422);
        }

        $sale->update([
            'is_invoice' => true,
            'transaction_type' => 'invoice',
            'is_credit_sale' => true,
            'credit_due_date' => $request->due_date,
            'invoice_status' => 'draft',
        ]);

        $sale->invoice_number = $sale->generateInvoiceNumber();
        $sale->save();

        return $sale->fresh();
    }
}
```

## Business Logic Requirements

### Invoice Number Generation

- Format: `INV-{YEAR}-{SEQUENCE}`
- Sequence resets yearly per branch
- Must be unique across the system
- Generated automatically when `is_invoice` is set to true

### Status Management

1. **draft**: Invoice created but not sent to customer
2. **unpaid**: Invoice sent, waiting for payment
3. **partial**: Partial payment received (amount_paid > 0 && outstanding_amount > 0)
4. **paid**: Fully paid (outstanding_amount = 0)
5. **overdue**: Past due date and not fully paid

### Automatic Status Updates

- Mark invoices as "overdue" when past due date (background job or on-access)
- Update `invoice_status` to "partial" when payment received but not full amount
- Update `invoice_status` to "paid" when full amount received
- Use existing `CustomerPayment` model for payment tracking

### Inventory Integration

- Use existing Sale/SaleDetail inventory management
- No changes needed to current stock handling logic

### Accounts Receivable Integration

- Leverage existing `outstanding_amount` and `CustomerPayment` system
- Use existing credit management infrastructure

## PDF Generation Requirements

### Invoice PDF Template

- Company branding and branch information
- Invoice details (number, date, due date)
- Customer information
- Sales agent information
- Itemized list with quantities, prices, totals
- Subtotal, tax, shipping, and grand total
- Payment terms and instructions
- Professional layout suitable for B2B transactions

### PDF Library Recommendation

- **Laravel**: Use `barryvdh/laravel-dompdf` or `spatie/browsershot`
- Generate PDF from blade template
- Support for CSS styling (Tailwind CSS compatible if using browsershot)

## Security & Permissions

### Access Control

- Users can only access invoices from their assigned branch
- Sales agents can only see their own invoices
- Admin users can see all invoices
- Cashiers have read-only access

### Audit Trail

- Log all invoice status changes
- Track who made changes and when
- Record payment history

## Performance Considerations

### Indexing

- Index on frequently queried fields (status, due_date, customer_id)
- Composite indexes for common filter combinations

### Caching

- Cache invoice summaries and statistics
- Cache PDF files for finalized invoices

### Pagination

- Implement efficient pagination for large invoice lists
- Default to 25 items per page

## Testing Requirements

### Unit Tests

- Invoice creation and validation
- Status transitions
- Payment calculations
- PDF generation

### Integration Tests

- API endpoint testing
- Database transactions
- File upload/download

### Feature Tests

- Complete invoice workflow
- Payment processing
- Report generation

## Migration from Current System

### Simple Database Migration

```sql
-- Phase 1: Add new fields to sales table
ALTER TABLE sales ADD COLUMN invoice_number VARCHAR(50) NULL AFTER transaction_number;
ALTER TABLE sales ADD COLUMN invoice_status ENUM('draft', 'unpaid', 'partial', 'paid', 'overdue') NULL AFTER payment_status;
ALTER TABLE sales ADD COLUMN is_invoice BOOLEAN DEFAULT FALSE AFTER is_credit_sale;
ALTER TABLE sales ADD COLUMN transaction_type ENUM('pos', 'invoice') DEFAULT 'pos' AFTER is_invoice;

-- Phase 2: Add indexes
CREATE INDEX idx_sales_invoice_number ON sales(invoice_number);
CREATE INDEX idx_sales_invoice_status ON sales(invoice_status);
CREATE INDEX idx_sales_is_invoice ON sales(is_invoice);

-- Phase 3: Optionally convert existing credit sales to invoices
UPDATE sales SET
    is_invoice = TRUE,
    transaction_type = 'invoice',
    invoice_status = CASE
        WHEN outstanding_amount = 0 THEN 'paid'
        WHEN amount_paid > 0 THEN 'partial'
        ELSE 'unpaid'
    END
WHERE is_credit_sale = TRUE;
```

### Implementation Phases

- **Phase 1 (Week 1):** Database migration and model enhancement
- **Phase 2 (Week 2-3):** Invoice controller and API endpoints
- **Phase 3 (Week 4-5):** PDF generation and overdue detection
- **Phase 4 (Week 6):** Frontend integration and testing

### ## Key API Endpoints Summary

### Invoice Management

- `GET /api/invoices` - List all invoices (Sale model with is_invoice=true)
- `POST /api/invoices` - Create new invoice
- `GET /api/invoices/{id}` - Get single invoice
- `PUT /api/invoices/{id}` - Update invoice
- `DELETE /api/invoices/{id}` - Delete draft invoice
- `PATCH /api/invoices/{id}/status` - Update invoice status
- `GET /api/invoices/{id}/pdf` - Download invoice PDF

### POS Management

- `GET /api/pos/transactions` - List POS transactions (Sale model with is_invoice=false)
- `POST /api/pos/transactions` - Create POS transaction
- `POST /api/sales/{id}/convert-to-invoice` - Convert POS sale to invoice

### Utilities

- `POST /api/invoices/generate-number` - Generate invoice number
- `GET /api/invoices/summary` - Invoice statistics
- `POST /api/invoices/{id}/mark-overdue` - Mark as overdue

### Payment Management (Existing)

- `GET /api/customer-payments?sale_id={id}` - List payments for invoice
- `POST /api/customer-payments` - Record payment (works for both POS and invoices)

## Development Benefits

1. **Faster Development:** Reuse existing, tested infrastructure
2. **Lower Risk:** No complex data migration required
3. **Consistent API:** Familiar patterns for frontend developers
4. **Maintenance:** Single model to maintain instead of duplicate systems
5. **Performance:** No additional joins required for most operations
6. **Flexibility:** Easy to add invoice-specific features in the future

This implementation provides all the benefits of a separate invoicing system while leveraging the robust existing Sale infrastructure.
