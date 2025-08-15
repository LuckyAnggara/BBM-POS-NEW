# Laravel API Reference

This document provides detailed API reference for all endpoints in the BBM POS Laravel backend.

## Authentication

All API endpoints require authentication except for login and registration. Use Bearer token authentication.

### Headers
```
Authorization: Bearer {token}
Accept: application/json
Content-Type: application/json
```

### Authentication Endpoints

#### POST /api/login
Authenticate user and receive access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "role": "manager",
    "branch_id": 1,
    "branch": {
      "id": 1,
      "name": "Main Branch"
    }
  },
  "token": "1|abc123def456..."
}
```

**Response (401):**
```json
{
  "message": "Invalid credentials"
}
```

#### POST /api/logout
Logout current user and revoke token.

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

#### GET /api/user
Get current authenticated user information.

**Response (200):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "user@example.com",
  "role": "manager",
  "branch_id": 1,
  "avatar_url": "https://example.com/avatar.jpg",
  "branch": {
    "id": 1,
    "name": "Main Branch",
    "currency": "IDR",
    "tax_rate": 11.0
  }
}
```

## Branch Management

### GET /api/branches
List all branches (admin only) or user's branch.

**Query Parameters:**
- `page` (integer): Page number for pagination
- `per_page` (integer): Items per page (max 100)

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Main Branch",
      "invoice_name": "Main Store Invoice",
      "currency": "IDR",
      "tax_rate": 11.0,
      "address": "123 Main St",
      "phone_number": "+62123456789",
      "created_at": "2024-01-01T00:00:00.000000Z",
      "updated_at": "2024-01-01T00:00:00.000000Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 1,
    "last_page": 1
  }
}
```

### POST /api/branches
Create a new branch (admin only).

**Request Body:**
```json
{
  "name": "New Branch",
  "invoice_name": "New Branch Invoice",
  "currency": "IDR",
  "tax_rate": 11.0,
  "address": "456 Second St",
  "phone_number": "+62987654321",
  "transaction_deletion_password": "delete123"
}
```

**Response (201):**
```json
{
  "id": 2,
  "name": "New Branch",
  "invoice_name": "New Branch Invoice",
  "currency": "IDR",
  "tax_rate": 11.0,
  "address": "456 Second St",
  "phone_number": "+62987654321",
  "created_at": "2024-01-02T00:00:00.000000Z",
  "updated_at": "2024-01-02T00:00:00.000000Z"
}
```

### GET /api/branches/{id}
Get specific branch details.

**Response (200):**
```json
{
  "id": 1,
  "name": "Main Branch",
  "invoice_name": "Main Store Invoice",
  "currency": "IDR",
  "tax_rate": 11.0,
  "address": "123 Main St",
  "phone_number": "+62123456789",
  "users_count": 5,
  "inventory_items_count": 150,
  "created_at": "2024-01-01T00:00:00.000000Z",
  "updated_at": "2024-01-01T00:00:00.000000Z"
}
```

### PUT /api/branches/{id}
Update branch information (admin only).

**Request Body:** (All fields optional)
```json
{
  "name": "Updated Branch Name",
  "tax_rate": 12.0
}
```

**Response (200):**
```json
{
  "id": 1,
  "name": "Updated Branch Name",
  "invoice_name": "Main Store Invoice",
  "currency": "IDR",
  "tax_rate": 12.0,
  "address": "123 Main St",
  "phone_number": "+62123456789",
  "created_at": "2024-01-01T00:00:00.000000Z",
  "updated_at": "2024-01-02T00:00:00.000000Z"
}
```

### DELETE /api/branches/{id}
Delete a branch (admin only).

**Response (204):** No content

## User Management

### GET /api/users
List users with optional branch filtering.

**Query Parameters:**
- `branch_id` (integer): Filter by branch ID
- `role` (string): Filter by role (admin, manager, cashier)
- `page` (integer): Page number
- `per_page` (integer): Items per page

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "manager",
      "branch_id": 1,
      "avatar_url": null,
      "local_printer_url": null,
      "branch": {
        "id": 1,
        "name": "Main Branch"
      },
      "created_at": "2024-01-01T00:00:00.000000Z",
      "updated_at": "2024-01-01T00:00:00.000000Z"
    }
  ]
}
```

### POST /api/users
Create a new user (admin/manager only).

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "password123",
  "password_confirmation": "password123",
  "role": "cashier",
  "branch_id": 1,
  "avatar_url": "https://example.com/avatar.jpg",
  "local_printer_url": "http://192.168.1.100:9100"
}
```

**Response (201):**
```json
{
  "id": 2,
  "name": "Jane Smith",
  "email": "jane@example.com",
  "role": "cashier",
  "branch_id": 1,
  "avatar_url": "https://example.com/avatar.jpg",
  "local_printer_url": "http://192.168.1.100:9100",
  "created_at": "2024-01-02T00:00:00.000000Z",
  "updated_at": "2024-01-02T00:00:00.000000Z"
}
```

### GET /api/users/{id}
Get specific user details.

**Response (200):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "manager",
  "branch_id": 1,
  "avatar_url": null,
  "local_printer_url": null,
  "branch": {
    "id": 1,
    "name": "Main Branch",
    "currency": "IDR"
  },
  "created_at": "2024-01-01T00:00:00.000000Z",
  "updated_at": "2024-01-01T00:00:00.000000Z"
}
```

## Inventory Management

### GET /api/inventory/categories
List inventory categories for current branch.

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Electronics",
      "branch_id": 1,
      "items_count": 25,
      "created_at": "2024-01-01T00:00:00.000000Z"
    }
  ]
}
```

### POST /api/inventory/categories
Create new inventory category.

**Request Body:**
```json
{
  "name": "Beverages"
}
```

**Response (201):**
```json
{
  "id": 2,
  "name": "Beverages",
  "branch_id": 1,
  "created_at": "2024-01-02T00:00:00.000000Z"
}
```

### GET /api/inventory/items
List inventory items with filtering options.

**Query Parameters:**
- `category_id` (integer): Filter by category
- `search` (string): Search in name or SKU
- `low_stock` (boolean): Show only low stock items
- `page` (integer): Page number
- `per_page` (integer): Items per page

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Laptop Dell XPS 13",
      "sku": "DELL-XPS13-001",
      "price": 15000000.00,
      "cost_price": 12000000.00,
      "quantity": 5,
      "image_url": "https://example.com/laptop.jpg",
      "category_id": 1,
      "category_name": "Electronics",
      "branch_id": 1,
      "created_at": "2024-01-01T00:00:00.000000Z",
      "updated_at": "2024-01-01T00:00:00.000000Z"
    }
  ]
}
```

### POST /api/inventory/items
Create new inventory item.

**Request Body:**
```json
{
  "name": "iPhone 15 Pro",
  "sku": "APPLE-IP15P-001",
  "price": 18000000.00,
  "cost_price": 15000000.00,
  "quantity": 10,
  "category_id": 1,
  "image_url": "https://example.com/iphone.jpg",
  "image_hint": "Latest iPhone model"
}
```

**Response (201):**
```json
{
  "id": 2,
  "name": "iPhone 15 Pro",
  "sku": "APPLE-IP15P-001",
  "price": 18000000.00,
  "cost_price": 15000000.00,
  "quantity": 10,
  "category_id": 1,
  "category_name": "Electronics",
  "image_url": "https://example.com/iphone.jpg",
  "image_hint": "Latest iPhone model",
  "branch_id": 1,
  "created_at": "2024-01-02T00:00:00.000000Z",
  "updated_at": "2024-01-02T00:00:00.000000Z"
}
```

### PUT /api/inventory/items/{id}
Update inventory item.

**Request Body:** (All fields optional)
```json
{
  "price": 17500000.00,
  "quantity": 8
}
```

**Response (200):**
```json
{
  "id": 2,
  "name": "iPhone 15 Pro",
  "sku": "APPLE-IP15P-001",
  "price": 17500000.00,
  "cost_price": 15000000.00,
  "quantity": 8,
  "category_id": 1,
  "category_name": "Electronics",
  "image_url": "https://example.com/iphone.jpg",
  "branch_id": 1,
  "updated_at": "2024-01-02T12:00:00.000000Z"
}
```

### POST /api/inventory/items/bulk-update
Bulk update inventory quantities.

**Request Body:**
```json
{
  "updates": [
    {
      "id": 1,
      "quantity": 10,
      "notes": "Stock replenishment"
    },
    {
      "id": 2,
      "quantity": 15,
      "notes": "Manual adjustment"
    }
  ]
}
```

**Response (200):**
```json
{
  "message": "Bulk update completed",
  "updated_count": 2,
  "errors": []
}
```

## POS Operations

### POST /api/pos/transactions
Create new POS transaction.

**Request Body:**
```json
{
  "items": [
    {
      "inventory_item_id": 1,
      "quantity": 2,
      "unit_price": 15000000.00,
      "discount_amount": 0
    },
    {
      "inventory_item_id": 2,
      "quantity": 1,
      "unit_price": 17500000.00,
      "discount_amount": 500000.00
    }
  ],
  "customer_id": 1,
  "payment_method": "cash",
  "amount_paid": 50000000.00,
  "notes": "Customer paid in cash"
}
```

**Response (201):**
```json
{
  "id": 1,
  "invoice_number": "INV-20240102-001",
  "subtotal": 47500000.00,
  "tax_amount": 5225000.00,
  "total_discount_amount": 500000.00,
  "total_amount": 52225000.00,
  "amount_paid": 50000000.00,
  "change_given": 0,
  "payment_status": "partial",
  "outstanding_amount": 2225000.00,
  "customer": {
    "id": 1,
    "name": "John Customer"
  },
  "items": [
    {
      "id": 1,
      "inventory_item_id": 1,
      "product_name": "Laptop Dell XPS 13",
      "quantity": 2,
      "unit_price": 15000000.00,
      "discount_amount": 0,
      "total_price": 30000000.00
    },
    {
      "id": 2,
      "inventory_item_id": 2,
      "product_name": "iPhone 15 Pro",
      "quantity": 1,
      "unit_price": 17500000.00,
      "discount_amount": 500000.00,
      "total_price": 17000000.00
    }
  ],
  "created_at": "2024-01-02T10:30:00.000000Z"
}
```

### GET /api/pos/transactions
List POS transactions with filtering.

**Query Parameters:**
- `date_from` (date): Filter from date (YYYY-MM-DD)
- `date_to` (date): Filter to date (YYYY-MM-DD)
- `status` (string): Filter by status
- `payment_status` (string): Filter by payment status
- `customer_id` (integer): Filter by customer
- `page` (integer): Page number

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "invoice_number": "INV-20240102-001",
      "total_amount": 52225000.00,
      "payment_status": "partial",
      "status": "completed",
      "customer_name": "John Customer",
      "created_at": "2024-01-02T10:30:00.000000Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "total": 1
  }
}
```

### GET /api/pos/transactions/{id}
Get specific transaction details.

**Response (200):**
```json
{
  "id": 1,
  "invoice_number": "INV-20240102-001",
  "subtotal": 47500000.00,
  "tax_amount": 5225000.00,
  "total_discount_amount": 500000.00,
  "total_amount": 52225000.00,
  "amount_paid": 50000000.00,
  "change_given": 0,
  "payment_status": "partial",
  "outstanding_amount": 2225000.00,
  "status": "completed",
  "customer": {
    "id": 1,
    "name": "John Customer",
    "email": "john.customer@example.com"
  },
  "user": {
    "id": 1,
    "name": "Jane Cashier"
  },
  "items": [
    {
      "id": 1,
      "inventory_item_id": 1,
      "product_name": "Laptop Dell XPS 13",
      "sku": "DELL-XPS13-001",
      "quantity": 2,
      "unit_price": 15000000.00,
      "discount_amount": 0,
      "total_price": 30000000.00
    }
  ],
  "payments": [
    {
      "id": 1,
      "amount": 50000000.00,
      "method": "cash",
      "reference": null,
      "created_at": "2024-01-02T10:30:00.000000Z"
    }
  ],
  "created_at": "2024-01-02T10:30:00.000000Z"
}
```

### POST /api/pos/transactions/{id}/payments
Add payment to existing transaction.

**Request Body:**
```json
{
  "amount": 2225000.00,
  "method": "bank_transfer",
  "reference": "TXN123456789",
  "notes": "Bank transfer payment"
}
```

**Response (201):**
```json
{
  "id": 2,
  "transaction_id": 1,
  "amount": 2225000.00,
  "method": "bank_transfer",
  "reference": "TXN123456789",
  "notes": "Bank transfer payment",
  "created_at": "2024-01-02T14:00:00.000000Z"
}
```

## Customer Management

### GET /api/customers
List customers for current branch.

**Query Parameters:**
- `search` (string): Search in name, email, or phone
- `page` (integer): Page number

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "John Customer",
      "email": "john.customer@example.com",
      "phone": "+62123456789",
      "address": "123 Customer St",
      "notes": "VIP customer",
      "total_purchases": 5,
      "total_amount": 100000000.00,
      "outstanding_amount": 2225000.00,
      "created_at": "2024-01-01T00:00:00.000000Z"
    }
  ]
}
```

### POST /api/customers
Create new customer.

**Request Body:**
```json
{
  "name": "Jane Customer",
  "email": "jane.customer@example.com",
  "phone": "+62987654321",
  "address": "456 Customer Ave",
  "notes": "Regular customer"
}
```

**Response (201):**
```json
{
  "id": 2,
  "name": "Jane Customer",
  "email": "jane.customer@example.com",
  "phone": "+62987654321",
  "address": "456 Customer Ave",
  "notes": "Regular customer",
  "branch_id": 1,
  "created_at": "2024-01-02T00:00:00.000000Z"
}
```

## Supplier Management

### GET /api/suppliers
List suppliers for current branch.

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Electronics Supplier Ltd",
      "contact_person": "John Supplier",
      "email": "contact@electronicsltd.com",
      "phone_number": "+62111222333",
      "address": "123 Supplier District",
      "total_orders": 10,
      "total_amount": 500000000.00,
      "outstanding_amount": 50000000.00,
      "created_at": "2024-01-01T00:00:00.000000Z"
    }
  ]
}
```

### POST /api/suppliers
Create new supplier.

**Request Body:**
```json
{
  "name": "Gadget Supplier Inc",
  "contact_person": "Jane Supplier",
  "email": "orders@gadgetsupplier.com",
  "phone_number": "+62444555666",
  "address": "789 Supplier Road"
}
```

**Response (201):**
```json
{
  "id": 2,
  "name": "Gadget Supplier Inc",
  "contact_person": "Jane Supplier",
  "email": "orders@gadgetsupplier.com",
  "phone_number": "+62444555666",
  "address": "789 Supplier Road",
  "branch_id": 1,
  "created_at": "2024-01-02T00:00:00.000000Z"
}
```

## Reports

### GET /api/reports/sales
Generate sales reports with filtering.

**Query Parameters:**
- `date_from` (date): Start date (YYYY-MM-DD)
- `date_to` (date): End date (YYYY-MM-DD)
- `group_by` (string): Group by 'day', 'week', 'month'
- `branch_id` (integer): Filter by branch (admin only)

**Response (200):**
```json
{
  "summary": {
    "total_transactions": 150,
    "total_revenue": 750000000.00,
    "total_profit": 150000000.00,
    "average_transaction": 5000000.00,
    "total_items_sold": 300
  },
  "daily_breakdown": [
    {
      "date": "2024-01-01",
      "transactions": 25,
      "revenue": 125000000.00,
      "profit": 25000000.00,
      "items_sold": 50
    }
  ],
  "top_products": [
    {
      "product_name": "iPhone 15 Pro",
      "quantity_sold": 20,
      "revenue": 350000000.00,
      "profit": 60000000.00
    }
  ],
  "payment_methods": [
    {
      "method": "cash",
      "count": 80,
      "amount": 400000000.00,
      "percentage": 53.33
    },
    {
      "method": "bank_transfer",
      "count": 70,
      "amount": 350000000.00,
      "percentage": 46.67
    }
  ]
}
```

### GET /api/reports/inventory
Generate inventory reports.

**Query Parameters:**
- `category_id` (integer): Filter by category
- `low_stock_threshold` (integer): Threshold for low stock items

**Response (200):**
```json
{
  "summary": {
    "total_items": 150,
    "total_value": 2250000000.00,
    "low_stock_items": 15,
    "out_of_stock_items": 3
  },
  "by_category": [
    {
      "category_name": "Electronics",
      "item_count": 50,
      "total_value": 1500000000.00,
      "low_stock_count": 5
    }
  ],
  "low_stock_items": [
    {
      "id": 1,
      "name": "Laptop Dell XPS 13",
      "sku": "DELL-XPS13-001",
      "current_quantity": 2,
      "recommended_quantity": 10,
      "value": 30000000.00
    }
  ],
  "top_value_items": [
    {
      "id": 2,
      "name": "iPhone 15 Pro",
      "quantity": 15,
      "unit_value": 17500000.00,
      "total_value": 262500000.00
    }
  ]
}
```

## Error Responses

### Validation Error (422)
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": [
      "The email field is required."
    ],
    "password": [
      "The password field must be at least 8 characters."
    ]
  }
}
```

### Unauthorized (401)
```json
{
  "message": "Unauthenticated."
}
```

### Forbidden (403)
```json
{
  "message": "This action is unauthorized."
}
```

### Not Found (404)
```json
{
  "message": "Resource not found."
}
```

### Server Error (500)
```json
{
  "message": "Something went wrong.",
  "error": "Internal server error details"
}
```

## Rate Limiting

API endpoints are rate limited as follows:
- Authentication endpoints: 5 requests per minute per IP
- General API endpoints: 60 requests per minute per user
- Report endpoints: 10 requests per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1641024000
```

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `per_page` (integer): Items per page (default: 20, max: 100)

**Response Meta:**
```json
{
  "data": [...],
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 5,
    "per_page": 20,
    "to": 20,
    "total": 100
  },
  "links": {
    "first": "http://api.example.com/api/items?page=1",
    "last": "http://api.example.com/api/items?page=5",
    "prev": null,
    "next": "http://api.example.com/api/items?page=2"
  }
}
```