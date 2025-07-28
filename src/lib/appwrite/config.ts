import {
  Client,
  Account,
  Databases,
  Permission,
  Role,
  Functions,
  ID,
  Query,
} from 'appwrite'
// Validasi bahwa environment variables telah di-set
if (
  !process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  !process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
) {
  throw new Error('Missing Appwrite environment variables')
}
const client = new Client()
const functions = new Functions(client)

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)

const account = new Account(client)
const databases = new Databases(client)

// Ekspor semua yang kita butuhkan
export { client, account, databases, Permission, Role, ID, Query, functions }

// Ekspor konstanta untuk ID agar mudah dikelola
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!
export const USERS_COLLECTION_ID = process.env.NEXT_PUBLIC_USERS_COLLECTION_ID!
export const BRANCHES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_BRANCHES_COLLECTION_ID!

export const INVENTORY_CATEGORIES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_INVENTORY_CATEGORIES_COLLECTION_ID!
export const INVENTORY_ITEMS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_INVENTORY_ITEMS_COLLECTION_ID!
export const POS_TRANSACTIONS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_POS_TRANSACTIONS_COLLECTION_ID!
export const POS_TRANSACTION_ITEMS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_POS_TRANSACTION_ITEMS_COLLECTION_ID!
export const BANK_ACCOUNTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_BANK_ACCOUNTS_COLLECTION_ID!
export const NOTIFICATIONS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_NOTIFICATIONS_COLLECTION_ID!
export const POS_SHIFTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_POS_SHIFTS_COLLECTION_ID!
export const STOCK_MUTATIONS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_STOCK_MUTATIONS_COLLECTION_ID!
export const EXPENSES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_EXPENSES_COLLECTION_ID!
export const CUSTOMERS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_CUSTOMERS_COLLECTION_ID!
export const PURCHASE_ORDERS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_PURCHASE_ORDERS_COLLECTION_ID!
export const PURCHASE_ORDER_ITEMS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_PURCHASE_ORDER_ITEMS_COLLECTION_ID!
export const SUPPLIERS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_SUPPLIERS_COLLECTION_ID!
export const NOTIFICATION_READS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_NOTIFICATION_READS_COLLECTION_ID!
export const NOTIFICATION_DISMISSALS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_NOTIFICATION_DISMISSALS_COLLECTION_ID!
export const SUPPLIER_PAYMENTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_SUPPLIER_PAYMENTS_COLLECTION_ID!

export const CREATE_POS_FUNCTION_ID =
  process.env.NEXT_PUBLIC_CREATE_POST_FUNCTION_ID!
export const PROCESS_RETURN_FUNCTION_ID =
  process.env.NEXT_PUBLIC_PROCESS_RETURN_FUNCTION_ID!
export const PROCESS_DELETION_FUNCTION_ID =
  process.env.NEXT_PUBLIC_PROCESS_DELETION_FUNCTION_ID!
export const PURCHASE_ORDER_FUNCTION_ID =
  process.env.NEXT_PUBLIC_PURCHASE_ORDER_FUNCTION_ID!
