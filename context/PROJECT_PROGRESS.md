
DONE:
- Implemented core Authentication (Login, Register, Sign Out, Account Management)
- Implemented Branch Management (CRUD, Selection, User Assignment)
- Implemented User Management (Admin view, update user branch/role)
- Implemented basic Point of Sale (POS) interface
- Implemented Inventory Management (Product CRUD, Category Management)
- Implemented Expense Tracking
- Implemented Sales History (View, Returns, Deletion with Password)
- Implemented POS Shift Management (Start, End, Active Shift Info)
- Implemented Customer Management (CRUD in Master Data, selection in POS)
- Implemented Supplier Management (CRUD in Master Data)
- Implemented Purchase Orders (Create, View List, View Detail, Update Status, Record Receipts)
- Implemented Accounts Payable (View Outstanding POs, Record Payments to Suppliers)
- Implemented Accounts Receivable (View Outstanding Credit Sales, Record Payments from Customers)
- Implemented Basic Reporting (Sales Summary, Income Statement)
- Implemented Stock Mutation and Stock Movement Reports
- Implemented Notification System (Admin Send, History; User View, Read Status, Unread Count in Sidebar, Clickable Links)
- Implemented User-configurable Branch Settings (name, invoice details, currency, tax, address, phone, default report period)
- Integrated Branch's Default Report Period into Report pages
- Implemented local dot matrix printer helper integration for POS invoices (URL configurable in User Account Settings)
- Implemented Shipping Cost and Discount features in POS (UI for item discount with nominal/percentage, manual voucher discount, updated calculations and print payload)
- Fixed FirebaseError for `undefined` voucherCode in posTransactions

WORKING:
- (No tasks currently in active, multi-turn development)

NEXT:
- Advanced Voucher System (Database-driven validation, usage limits, expiry dates)
- UI for editing/removing applied item discounts in POS cart
- More granular PO workflow statuses (e.g., 'Approved', 'Shipped')
- Direct image uploads for products/avatars instead of URL input
- Additional Report Types (e.g., Balance Sheet, Detailed COGS)
- Export functionality for reports and data tables
- Dashboard enhancements (more charts, KPIs)
