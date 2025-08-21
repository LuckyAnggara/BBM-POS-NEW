# Invoicing Module API Endpoints

This document outlines the API endpoints that need to be implemented on the Laravel backend to support the new invoicing module.

## Overview

The invoicing module separates credit transactions from the POS system, providing dedicated invoice management with proper status tracking, sales agent integration, and accounts receivable management.

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
  "sales_agent_id": 2,
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
  "invoice_number": "INV-2024-001",
  "customer_id": 1,
  "customer_name": "PT. Example",
  "sales_agent_id": 2,
  "sales_agent_name": "John Doe",
  "branch_id": 1,
  "subtotal": 200000,
  "tax_amount": 22000,
  "shipping_cost": 50000,
  "total_amount": 272000,
  "amount_paid": 0,
  "outstanding_amount": 272000,
  "status": "draft",
  "due_date": "2024-02-15",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z",
  "items": [...],
  "customer": {...},
  "sales_agent": {...}
}
```

#### List Invoices
```
GET /api/invoices
```
**Query Parameters:**
- `branch_id` (optional): Filter by branch
- `status` (optional): Filter by status (draft, unpaid, partial, paid, overdue)
- `customer_id` (optional): Filter by customer
- `sales_agent_id` (optional): Filter by sales agent
- `search` (optional): Search in invoice number, customer name, sales agent name
- `start_date` (optional): Filter from date
- `end_date` (optional): Filter to date
- `page` (optional): Page number for pagination
- `per_page` (optional): Items per page

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
  "status": "paid",
  "payment_amount": 272000,
  "notes": "Paid via bank transfer"
}
```

#### Delete Invoice
```
DELETE /api/invoices/{id}
```
**Note:** Only allow deletion if status is "draft"

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
POST /api/sales/{id}/create-invoice
```
**Response:** Created invoice object

## Database Schema Requirements

### invoices table
```sql
CREATE TABLE invoices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    branch_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    sales_agent_id BIGINT UNSIGNED NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    shipping_cost DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    amount_paid DECIMAL(15,2) DEFAULT 0,
    outstanding_amount DECIMAL(15,2) NOT NULL,
    status ENUM('draft', 'unpaid', 'partial', 'paid', 'overdue') DEFAULT 'draft',
    due_date DATE NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (sales_agent_id) REFERENCES users(id),
    
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date),
    INDEX idx_customer (customer_id),
    INDEX idx_sales_agent (sales_agent_id),
    INDEX idx_branch (branch_id)
);
```

### invoice_items table
```sql
CREATE TABLE invoice_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    total DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    
    INDEX idx_invoice (invoice_id),
    INDEX idx_product (product_id)
);
```

### invoice_payments table (for tracking partial payments)
```sql
CREATE TABLE invoice_payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT UNSIGNED NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method ENUM('cash', 'transfer', 'card', 'qris') NOT NULL,
    reference_number VARCHAR(100) NULL,
    notes TEXT NULL,
    recorded_by_user_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by_user_id) REFERENCES users(id),
    
    INDEX idx_invoice (invoice_id),
    INDEX idx_payment_date (payment_date)
);
```

## Business Logic Requirements

### Invoice Number Generation
- Format: `INV-{YEAR}-{SEQUENCE}`
- Sequence resets yearly per branch
- Must be unique across the system

### Status Management
1. **draft**: Invoice created but not sent to customer
2. **unpaid**: Invoice sent, waiting for payment
3. **partial**: Partial payment received
4. **paid**: Fully paid
5. **overdue**: Past due date and not fully paid

### Automatic Status Updates
- Mark invoices as "overdue" when past due date (background job)
- Update status to "partial" when payment received but not full amount
- Update status to "paid" when full amount received

### Inventory Integration
- Reserve stock when invoice is created (optional)
- Reduce stock when invoice status changes to "unpaid" or "paid"
- Handle stock return if invoice is cancelled

### Accounts Receivable Integration
- Automatically create receivable entry when invoice status is "unpaid"
- Update receivable when payments are received
- Close receivable when invoice is fully paid

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

### Data Migration
- Identify existing credit sales that should become invoices
- Create migration script to convert sales to invoices
- Maintain data integrity and audit trail

### Gradual Rollout
- Phase 1: Deploy invoicing module alongside existing system
- Phase 2: Train users on new workflow
- Phase 3: Migrate existing credit transactions
- Phase 4: Remove credit functionality from POS