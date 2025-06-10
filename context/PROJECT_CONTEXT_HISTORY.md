
# BranchWise - Project Context & History

## 1. Project Objectives and Vision

**BranchWise** aims to be a comprehensive, multi-branch management system designed for businesses to efficiently track and manage their operations, with a strong emphasis on financial and inventory aspects. The core vision is to provide a centralized platform where data for each branch is isolated yet manageable from a single interface, particularly for administrative roles. The system should be intuitive for daily tasks like Point of Sale (POS) operations and robust enough for administrative tasks like reporting and user management.

## 2. Technical Stack and Architecture

*   **Frontend Framework**: Next.js (using App Router)
*   **Language**: TypeScript
*   **UI Library**: React
*   **Component Library**: ShadCN UI
*   **Styling**: Tailwind CSS
*   **Backend & Database**: Firebase (Firestore for database, Firebase Authentication for user management)
*   **AI Integration**: Genkit (predefined in stack, minimal usage currently)
*   **State Management**: React Context API (for Auth and Branch contexts)
*   **Form Handling**: React Hook Form with Zod for validation
*   **Deployment**: Assumed to be Firebase Hosting or a similar platform supporting Next.js.

**Architecture Overview**:
The application primarily uses a client-side rendering model with Next.js, leveraging Server Components where appropriate. Firebase serves as the Backend-as-a-Service (BaaS), handling data storage, user authentication, and security rules. Data is structured in Firestore with a strong emphasis on branch-specific data isolation, typically using a `branchId` field in relevant collections.

## 3. Features Implemented

### 3.1. Core & Authentication
*   **User Authentication**: Login, Registration, Sign Out.
*   **Account Management**: Users can update their profile (name, avatar, local printer URL) and change their password.
*   **Protected Routes**: Ensuring only authenticated users can access specific pages.
*   **Role-Based Access Control (RBAC)**: Basic admin/cashier roles. Admins have wider access.

### 3.2. Branch Management
*   **Branch Selection**: Users (especially admins) can select an active branch to work with.
*   **Admin Branch CRUD**: Admins can create, view, edit (name, invoice details, currency, tax, address, phone, transaction deletion password, default report period), and delete branches.
*   **User Branch Assignment**: Admins can assign users to specific branches.
*   **Branch-Specific Settings**: Users can modify some settings for their assigned branch (name, currency, tax, address, phone, default report period), excluding sensitive settings like the transaction deletion password.

### 3.3. User Management (Admin)
*   Admins can view all users.
*   Admins can update a user's assigned branch and role (admin/cashier).

### 3.4. Point of Sale (POS)
*   **Shift Management**: Start new shift (with initial cash), end shift (with actual cash, calculating difference).
*   **Product Catalog Display**: Card view and Table view modes for product selection.
*   **Product Search**: Search products by name or SKU.
*   **Cart Management**: Add items, update quantity, remove items.
*   **Discounts**:
    *   **Per Item Discount**: Apply nominal or percentage discount to individual cart items via a dialog.
    *   **Voucher Discount**: Manual input for voucher code (as reference) and voucher discount amount (nominal).
*   **Shipping Cost**: Manual input for shipping cost.
*   **Payment Processing**:
    *   Cash (with change calculation).
    *   Card (no specific gateway integration, logs as 'card').
    *   Transfer (allows selection of bank account, input reference number).
    *   Credit (requires customer selection and due date).
*   **Customer Management (in POS context)**:
    *   Select existing customer for credit sales.
    *   QR Code scanning for customer selection.
*   **Invoice Generation**:
    *   Viewable web invoice.
    *   Integration with local dot matrix printer helper via HTTP POST (user-configurable URL in account settings). Payload includes detailed transaction info.
*   **Active Shift Information**: Display for current shift (initial cash, sales by payment method, estimated cash).

### 3.5. Inventory Management
*   **Product CRUD**: Add, edit, and delete inventory items (name, SKU, category, quantity, price, cost price, image URL, image hint).
*   **Category Management**: Add and delete inventory categories. Products are linked to categories.
*   Data is branch-specific.

### 3.6. Financial Management & Tracking
*   **Expense Tracking**: Add, edit, delete, and categorize expenses for the selected branch.
*   **Sales History**: View list of transactions for the selected branch, filter by date range and search term.
    *   View detailed invoice.
    *   Process full transaction returns (updates stock, marks transaction as returned).
    *   Delete transactions (admin only, requires branch-specific password, restores stock if applicable).
*   **Shift History**: View list of past shifts for the current user and selected branch, filterable by date.
*   **Accounts Payable**: View outstanding Purchase Orders (credit terms) for the selected branch, record payments to suppliers.
*   **Accounts Receivable**: View outstanding credit sales for the selected branch, record payments from customers.

### 3.7. Master Data
*   **Customer Management**: Add, edit, delete customers (name, email, phone, address, notes, QR code ID for scanning). Branch-specific.
*   **Supplier Management**: Add, edit, delete suppliers (name, contact person, email, phone, address, notes). Branch-specific.

### 3.8. Purchase Orders (PO)
*   Create new Purchase Orders (select supplier, order date, expected delivery, items with quantity and purchase price, payment terms - cash/credit, supplier invoice no., payment due date).
*   View list of POs for the selected branch, filterable by date, search, PO status, and payment status.
*   View PO details.
*   Update PO status (e.g., from 'draft' to 'ordered', or 'cancelled').
*   Record item receipts against a PO (updates inventory stock and PO item received quantities).
*   Record payments to suppliers for credit POs.

### 3.9. Reporting
*   **Sales Summary Report**: Gross revenue, returns, net revenue, transaction count, average transaction value, sales by payment method for a selected period.
*   **Income Statement Report**: Revenue, COGS, gross profit, expenses, net profit for a selected period.
*   **Stock Mutation Report**: Initial stock, stock in (PO), stock sold, stock returned, final stock for all products over a selected period.
*   **Stock Movement Report**: Detailed transaction log (sales, returns, PO receipts) for a specific product over a selected period.
*   All reports use the branch's default report period as the initial filter if set.

### 3.10. Notifications
*   **Admin Send Notifications**: Admins can create and send global notifications with title, message, category, and an optional clickable link.
*   **Admin Notification History**: Admins can view a history of all notifications sent.
*   **User View Notifications**: All users can view notifications.
*   **Read/Unread Status**:
    *   Notifications are marked as read when clicked (or link is clicked).
    *   Option to "Mark all as read".
*   **Unread Count Indicator**: Sidebar shows a badge with the count of unread notifications.

### 3.11. Bank Account Management (Admin)
*   Admins can add, edit, and delete bank accounts.
*   Bank accounts can be global (branchId is null) or specific to a branch.
*   Used in POS for 'transfer' payment method selection.

## 4. Features Currently Under Development
*   No specific features are actively being coded in the *current* exchange, but the project is in an ongoing development phase.

## 5. Planned Features / Future Work
*   **Advanced Voucher System**: Database-driven voucher validation, automatic discount application, usage limits, expiry dates.
*   **Real-time Updates**: For notification badges and potentially other dashboard elements.
*   **Targeted Notifications**: Ability to send notifications to specific branches or user groups.
*   **More Report Types**: e.g., Balance Sheet, detailed COGS report.
*   **Export Functionality**: For reports (CSV/PDF) and possibly other data tables (e.g., POs, Sales History).
*   **Dashboard Enhancements**: More charts, key performance indicators (KPIs), trend analysis.
*   **Stock Adjustments**: Manual stock adjustments (e.g., for damage, loss, or recounts) with reasons.
*   **Purchase Order Workflow**: More granular status updates (e.g., 'Approved', 'Shipped').
*   **User Profile Settings**: More options under "Pengaturan (Segera)".
*   **Image Uploads**: Direct image uploads for products/avatars instead of URL input.
*   **More Granular Permissions**: Beyond simple admin/cashier roles if needed.
*   **Audit Trails**: Logging important actions.

## 6. Design Decisions and Constraints
*   **UI/UX**: Adherence to ShadCN UI components and Tailwind CSS for styling, aiming for a clean, modern, and responsive interface. Font: "Inter".
*   **Technology Choices**: Next.js App Router, Firebase BaaS.
*   **Data Isolation**: Branch ID (`branchId`) is a key field in most data collections to ensure data separation.
*   **Local Printer**: Integration relies on an external Python helper application accessible via HTTP POST. The URL for this helper is user-configurable.
*   **Notifications**: Currently global. Read status is managed per user.
*   **Error Handling**: Primarily through `toast` notifications.
*   **Code Style**: Functional components, hooks, modern React patterns. TypeScript for type safety.
*   **Security**: Firebase security rules are the primary mechanism for data access control.

## 7. Open Questions / Assumptions
*   **Python Printer Helper**: Assumed to be fully functional and capable of parsing the provided JSON payload.
*   **Tax Complexity**: Current tax calculation is a simple percentage. Real-world tax scenarios might be more complex.
*   **Scalability of Notification Read Status**: Current client-side calculation of unread counts might become inefficient with a very large number of notifications/users.
*   **User Roles Granularity**: Current admin/cashier roles might need further refinement for larger organizations.
*   **Initial Admin User**: How is the first admin user created or designated? (Currently, any registered user can be made admin by an existing admin).

## 8. Data Structures (Firestore Collections)

*   **`users`**:
    *   `uid` (doc ID): string
    *   `name`: string
    *   `email`: string
    *   `avatarUrl`: string | null
    *   `branchId`: string | null
    *   `role`: "admin" | "cashier" | string
    *   `localPrinterUrl`: string | null
    *   `createdAt`: Timestamp

*   **`branches`**:
    *   `id` (doc ID): string
    *   `name`: string
    *   `invoiceName`: string
    *   `currency`: string (e.g., "IDR")
    *   `taxRate`: number (e.g., 10 for 10%)
    *   `address`: string
    *   `phoneNumber`: string
    *   `transactionDeletionPassword`: string (hashed or plain, currently plain)
    *   `defaultReportPeriod`: "thisMonth" | "thisWeek" | "today"
    *   `createdAt`: Timestamp
    *   `updatedAt`: Timestamp

*   **`inventoryCategories`**:
    *   `id` (doc ID): string
    *   `name`: string
    *   `branchId`: string
    *   `createdAt`: Timestamp

*   **`inventoryItems`**:
    *   `id` (doc ID): string
    *   `name`: string
    *   `sku`: string | null
    *   `categoryId`: string
    *   `categoryName`: string | null (denormalized for display)
    *   `branchId`: string
    *   `quantity`: number
    *   `price`: number (selling price)
    *   `costPrice`: number (purchase/cost price)
    *   `imageUrl`: string | null
    *   `imageHint`: string | null (for placeholder services)
    *   `createdAt`: Timestamp
    *   `updatedAt`: Timestamp

*   **`customers`**:
    *   `id` (doc ID): string
    *   `branchId`: string
    *   `name`: string
    *   `email`: string | null
    *   `phone`: string | null
    *   `address`: string | null
    *   `notes`: string | null
    *   `qrCodeId`: string | null (for QR scanning)
    *   `createdAt`: Timestamp
    *   `updatedAt`: Timestamp

*   **`suppliers`**:
    *   `id` (doc ID): string
    *   `name`: string
    *   `contactPerson`: string | null
    *   `email`: string | null
    *   `phone`: string | null
    *   `address`: string | null
    *   `notes`: string | null
    *   `branchId`: string
    *   `createdAt`: Timestamp
    *   `updatedAt`: Timestamp

*   **`expenses`**:
    *   `id` (doc ID): string
    *   `branchId`: string
    *   `userId`: string (who recorded it)
    *   `date`: Timestamp (date of expense)
    *   `category`: string (e.g., "Sewa", "Gaji")
    *   `amount`: number
    *   `description`: string
    *   `createdAt`: Timestamp
    *   `updatedAt`: Timestamp

*   **`posShifts`**:
    *   `id` (doc ID): string
    *   `userId`: string
    *   `branchId`: string
    *   `startTime`: Timestamp
    *   `initialCash`: number
    *   `status`: "active" | "ended"
    *   `endTime`: Timestamp | null
    *   `expectedCashAtEnd`: number | null
    *   `actualCashAtEnd`: number | null
    *   `cashDifference`: number | null
    *   `totalSalesByPaymentMethod`: { `cash`: number, `card`: number, `transfer`: number } | null

*   **`posTransactions`**:
    *   `id` (doc ID): string
    *   `shiftId`: string
    *   `branchId`: string
    *   `userId`: string
    *   `timestamp`: Timestamp
    *   `invoiceNumber`: string
    *   `items`: Array<{
        *   `productId`: string
        *   `productName`: string
        *   `quantity`: number
        *   `originalPrice`: number (price before item-specific discount)
        *   `price`: number (price after item-specific discount, per unit)
        *   `discountAmount`: number (item-specific discount amount, per unit)
        *   `costPrice`: number
        *   `total`: number (quantity * price)
        *   }>
    *   `subtotal`: number (sum of item.total, after item discounts)
    *   `taxAmount`: number
    *   `shippingCost`: number | null
    *   `voucherCode`: string | null
    *   `voucherDiscountAmount`: number | null
    *   `totalDiscountAmount`: number | null (sum of all item discounts + voucher discount)
    *   `totalAmount`: number (final payable amount)
    *   `totalCost`: number (sum of item.costPrice * item.quantity)
    *   `paymentTerms`: "cash" | "card" | "transfer" | "credit"
    *   `amountPaid`: number
    *   `changeGiven`: number
    *   `customerId`: string | null
    *   `customerName`: string | null
    *   `isCreditSale`: boolean
    *   `creditDueDate`: Timestamp | null
    *   `outstandingAmount`: number | null
    *   `paymentStatus`: "unpaid" | "partially_paid" | "paid" | "overdue" | "returned"
    *   `paymentsMade`: Array<{
        *   `paymentDate`: Timestamp
        *   `amountPaid`: number
        *   `paymentMethod`: "cash" | "transfer" | "card" | "other"
        *   `notes`: string | null
        *   `recordedByUserId`: string
        *   }> | null
    *   `bankName`: string | null (if paymentTerms is transfer)
    *   `bankTransactionRef`: string | null (if paymentTerms is transfer)
    *   `status`: "completed" | "returned"
    *   `returnedAt`: Timestamp | null
    *   `returnReason`: string | null
    *   `returnedByUserId`: string | null

*   **`purchaseOrders`**:
    *   `id` (doc ID): string
    *   `poNumber`: string
    *   `branchId`: string
    *   `supplierId`: string
    *   `supplierName`: string (denormalized)
    *   `orderDate`: Timestamp
    *   `expectedDeliveryDate`: Timestamp | null
    *   `items`: Array<{
        *   `productId`: string
        *   `productName`: string
        *   `orderedQuantity`: number
        *   `purchasePrice`: number
        *   `receivedQuantity`: number
        *   `totalPrice`: number (orderedQuantity * purchasePrice)
        *   }>
    *   `notes`: string | null
    *   `status`: "draft" | "ordered" | "partially_received" | "fully_received" | "cancelled"
    *   `createdById`: string (user ID)
    *   `subtotal`: number
    *   `shippingCost`: number | null
    *   `taxAmount`: number | null
    *   `totalAmount`: number
    *   `paymentTermsOnPO`: "cash" | "credit"
    *   `supplierInvoiceNumber`: string | null
    *   `paymentDueDateOnPO`: Timestamp | null
    *   `isCreditPurchase`: boolean
    *   `outstandingPOAmount`: number | null
    *   `paymentStatusOnPO`: "unpaid" | "partially_paid" | "paid" | "overdue"
    *   `paymentsMadeToSupplier`: Array<{
        *   `paymentDate`: Timestamp
        *   `amountPaid`: number
        *   `paymentMethod`: "cash" | "transfer" | "card" | "other"
        *   `notes`: string | null
        *   `recordedByUserId`: string
        *   }> | null
    *   `createdAt`: Timestamp
    *   `updatedAt`: Timestamp

*   **`bankAccounts`**:
    *   `id` (doc ID): string
    *   `branchId`: string | null (null if global)
    *   `bankName`: string
    *   `accountNumber`: string
    *   `accountHolderName`: string
    *   `isActive`: boolean
    *   `createdAt`: Timestamp
    *   `updatedAt`: Timestamp

*   **`notifications`**:
    *   `id` (doc ID): string
    *   `title`: string
    *   `message`: string
    *   `category`: string (from `NOTIFICATION_CATEGORIES`)
    *   `createdByUid`: string
    *   `createdByName`: string
    *   `isGlobal`: boolean (currently always true)
    *   `linkUrl`: string | null
    *   `targetBranchId`: string | null (for future use)
    *   `createdAt`: Timestamp

*   **`userNotificationStatus/{userId}/notificationsRead/{notificationId}`**: (Subcollection structure)
    *   `readAt`: Timestamp

## 9. Firebase Rules Summary

*   **General Principles**:
    *   Default deny.
    *   `isAuthenticated()`: Checks `request.auth != null`.
    *   `isRequestUserAdmin()`: Checks `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'`.
    *   `requestUserBranchId()`: Gets `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.branchId`.
    *   `isUserAssignedToBranch(branchId)`: Checks `requestUserBranchId() == branchId`.

*   **`users/{userId}`**:
    *   `read`: If `request.auth.uid == userId` OR `isRequestUserAdmin()`.
    *   `create`: If `request.auth.uid == userId`.
    *   `update`: If `request.auth.uid == userId` (can update specific fields like `name`, `avatarUrl`, `localPrinterUrl`) OR `isRequestUserAdmin()` (can update `role`, `branchId`).

*   **`branches/{branchId}`**:
    *   `read`: `isAuthenticated()`.
    *   `create`: `isRequestUserAdmin()`.
    *   `update`: `isRequestUserAdmin()` OR (`isUserAssignedToBranch(branchId)` AND only allowed fields like `name`, `defaultReportPeriod`, etc., NOT `transactionDeletionPassword`).
    *   `delete`: `isRequestUserAdmin()` (with dependency checks in backend logic before deletion).

*   **`inventoryCategories/{categoryId}`**, **`inventoryItems/{itemId}`**, **`customers/{customerId}`**, **`suppliers/{supplierId}`**, **`expenses/{expenseId}`**:
    *   `read, create, update, delete`: `isAuthenticated()` (further checks for branchId match often done in create/update rules or backend logic, e.g., `request.resource.data.branchId == requestUserBranchId()`). Deletes might have dependency checks.

*   **`posShifts/{shiftId}`**:
    *   `read, update`: If `isRequestUserAdmin()` OR (`request.auth.uid == resource.data.userId`).
    *   `create`: `isAuthenticated()`.

*   **`posTransactions/{transactionId}`**:
    *   `read`: If `isRequestUserAdmin()` OR (`request.auth.uid == resource.data.userId`).
    *   `create`: `isAuthenticated()`.
    *   `update`: (For returns) If `isRequestUserAdmin()` OR (`request.auth.uid == resource.data.userId`).
    *   `delete`: `isRequestUserAdmin()` (deletion logic also checks a password).

*   **`purchaseOrders/{poId}`**:
    *   `read, create, update, delete`: `isAuthenticated()`. (branchId checks within rules or backend).

*   **`bankAccounts/{accountId}`**:
    *   `read`: `isAuthenticated()`.
    *   `create, update, delete`: `isRequestUserAdmin()`.

*   **`notifications/{notificationId}`**:
    *   `read`: `isAuthenticated()`.
    *   `create`: If `isRequestUserAdmin()` AND `request.resource.data.createdByUid == request.auth.uid` AND `request.resource.data.isGlobal == true`.
    *   `update, delete`: `false` (immutable).

*   **`userNotificationStatus/{userId}/notificationsRead/{notificationReadId}`**:
    *   `read, write`: If `request.auth.uid == userId`.

## 10. Cloud Functions and APIs

*   **Cloud Functions**: None implemented or explicitly discussed so far.
*   **External APIs**:
    *   **Local Printer Helper API**: An HTTP POST endpoint (e.g., `http://localhost:PORT/print`) expected to be run by the user locally. The application sends a JSON payload to this endpoint for printing invoices on dot matrix printers. The URL is configurable per user.

## 11. Other Important Observations

*   **Color Scheme**: Primary Blue (`#4285F4`), Background Light Gray (`#F5F5F5`), Accent Teal (`#00BCD4`). HSL variables are used in `globals.css`.
*   **Font**: "Inter" sans-serif.
*   **Responsiveness**: The UI aims to be responsive across different screen sizes.
*   **Modularity**: Contexts are used for Auth and Branch selection. Firebase functions are grouped by feature (e.g., `users.ts`, `branches.ts`).
*   **Error Handling**: Primarily relies on `toast` notifications for user feedback on operations.
*   **Development Environment**: Uses Next.js development server.
*   **Firebase Configuration**: API keys and project config are stored in `src/lib/firebase/config.ts` (though currently hardcoded for the example, ideally from environment variables).

This summary should provide a good overview of the project's current state.
