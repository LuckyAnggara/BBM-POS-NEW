# TYPESCRIPT ISSUES CATALOG

## Remaining 'any' Type Violations Found During Build Testing

**Generated:** December 2024
**Status:** Customer Module Fixed ✅ | Other Modules Need Attention ⚠️

---

## CUSTOMER MODULE TYPESCRIPT STATUS: ✅ FIXED

All TypeScript issues in customer files have been resolved:

### Fixed Files:

- `src/app/customers/page.tsx` - No TypeScript errors
- `src/app/customers/[id]/page.tsx` - Fixed error: any → error: unknown
- `src/app/customers/[id]/edit/page.tsx` - Fixed error handling with type guards
- `src/lib/laravel/customers.ts` - Fixed getCustomerSales return type

---

## REMAINING TYPESCRIPT ISSUES BY MODULE

### 1. POS MODULE ⚠️ HIGH PRIORITY (10+ violations)

**File: `src/app/pos/page.tsx`**

```typescript
// Line 234
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any

// Line 547
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any

// Line 644
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

**Impact:** Critical - POS is core business functionality
**Recommendation:** Fix immediately before production

---

### 2. INVENTORY MODULE ⚠️ HIGH PRIORITY (15+ violations)

**File: `src/app/inventory/page.tsx`**

```typescript
// Line 134, 277
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

**File: `src/app/inventory/new/page.tsx`**

```typescript
// Line 134
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

**File: `src/app/inventory/[id]/page.tsx`**

```typescript
// Lines 139, 173, 191, 225
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

**File: `src/app/inventory/[id]/edit/page.tsx`**

```typescript
// Line 171
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

---

### 3. REPORTS MODULE ⚠️ MEDIUM PRIORITY (12+ violations)

**File: `src/app/reports/page.tsx`**

```typescript
// Lines 202, 229, 230, 340, 341, 388
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

**File: `src/app/reports/sales/page.tsx`**

```typescript
// Lines 133, 223
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

**File: `src/app/reports/stock-movement/page.tsx`**

```typescript
// Line 185
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

**File: `src/app/reports/stock-mutation/page.tsx`**

```typescript
// Lines 143, 193
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

---

### 4. PURCHASE ORDERS MODULE ⚠️ MEDIUM PRIORITY (8+ violations)

**File: `src/app/purchase-orders/page.tsx`**

```typescript
// Line 235
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

**File: `src/app/purchase-orders/new/page.tsx`**

```typescript
// Line 305
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

**File: `src/app/purchase-orders/[poId]/page.tsx`**

```typescript
// Lines 297, 300, 329, 372, 421, 459, 511, 536
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

---

### 5. AUTHENTICATION & CONTEXT ⚠️ MEDIUM PRIORITY (5+ violations)

**File: `src/contexts/auth-context.tsx`**

```typescript
// Lines 19, 23, 66, 84, 97, 112
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

**File: `src/contexts/branch-context.tsx`**

```typescript
// Lines 91, 109, 127
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

**File: `src/app/login/page.tsx`**

```typescript
// Line 56
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

---

### 6. SALES & TRANSACTIONS ⚠️ MEDIUM PRIORITY (4+ violations)

**File: `src/app/sales/[id]/page.tsx`**

```typescript
// Lines 144, 158
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

**File: `src/app/sales-history/page.tsx`**

```typescript
// Line 203
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

**File: `src/app/invoice/[transactionId]/view/page.tsx`**

```typescript
// Line 56
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

---

### 7. ADMIN & UTILITIES ⚠️ LOW PRIORITY (10+ violations)

**File: `src/components/admin/SystemUtilities.tsx`**

```typescript
// Lines 62, 115, 128, 145, 169, 182, 198, 241, 254, 310
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

**File: `src/components/admin/ManageBankAccounts.tsx`**

```typescript
// Lines 104, 170, 193, 210
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

**File: `src/components/admin/ManageBranches.tsx`**

```typescript
// Lines 141, 142, 151, 213, 234
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

---

### 8. SERVICE LAYER ⚠️ MEDIUM PRIORITY (15+ violations)

**File: `src/lib/laravel/purchaseOrderService.ts`**

```typescript
// Lines 9, 70, 80, 83, 117, 158, 179, 192, 210, 287
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

**File: `src/lib/laravel/stockOpname.ts`**

```typescript
// Lines 34, 55, 153
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

**File: `src/lib/laravel/shiftService.ts`**

```typescript
// Lines 44, 66, 94, 108
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

**File: `src/hooks/usePosLogic.ts`**

```typescript
// Lines 292, 374, 637
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

---

## RECOMMENDED FIX PRIORITY

### 🔴 CRITICAL (Fix Before Production)

1. **POS Module** - Core business functionality
2. **Authentication Context** - Security implications
3. **Service Layer** - API integration issues

### 🟡 HIGH PRIORITY (Fix Within 1 Week)

1. **Inventory Module** - Stock management critical
2. **Reports Module** - Business intelligence needs
3. **Purchase Orders** - Supply chain management

### 🟢 MEDIUM PRIORITY (Fix Within 2 Weeks)

1. **Sales & Transactions** - Historical data handling
2. **Admin Components** - Management functions

---

## COMMON PATTERNS FOR FIXES

### Error Handling Pattern

```typescript
// BEFORE (wrong)
catch (error: any) {
  console.error(error);
}

// AFTER (correct)
catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('An unknown error occurred');
  }
}
```

### API Response Pattern

```typescript
// BEFORE (wrong)
const response: any = await api.call()

// AFTER (correct)
interface ApiResponse {
  data: YourDataType
  status: number
  message?: string
}
const response: ApiResponse = await api.call()
```

### Form Data Pattern

```typescript
// BEFORE (wrong)
const formData: any = form.getValues()

// AFTER (correct)
interface FormData {
  name: string
  email: string
  // ... other fields
}
const formData: FormData = form.getValues()
```

---

## AUTOMATED FIXING APPROACH

### Step 1: Install TypeScript Strict Mode

```bash
# Update tsconfig.json
"strict": true,
"noImplicitAny": true
```

### Step 2: Use TypeScript Compiler

```bash
npx tsc --noEmit --strict
```

### Step 3: Fix By Priority

1. Start with critical modules (POS, Auth)
2. Use proper interface definitions
3. Implement type guards for error handling
4. Test each fix individually

---

## ESTIMATED EFFORT

- **Critical Fixes:** 2-3 days
- **High Priority:** 1 week
- **Medium Priority:** 2 weeks
- **Total Cleanup:** 3-4 weeks

---

**Note:** Customer module TypeScript issues are completely resolved ✅
This catalog focuses on remaining modules that need attention for full production readiness.
