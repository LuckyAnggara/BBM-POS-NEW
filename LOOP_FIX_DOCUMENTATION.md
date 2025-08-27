# Fix Documentation: Branch Context Loop Issue

## Problem Description

Ketika fetch shift dipindahkan ke context branch, terjadi infinite loop saat membuka dashboard page yang menyebabkan:

- Fast refresh terus menerus
- Console error berulang
- Performance degradation

## Root Cause Analysis

### Masalah Utama:

1. `fetchActiveShift` memiliki dependency `[selectedBranch, setActiveShiftSummary]`
2. `useEffect` memanggil both `fetchBranches()` dan `fetchActiveShift()` secara bersamaan
3. `fetchBranches` mengupdate `selectedBranch` → `fetchActiveShift` function berubah → useEffect re-run

### Dependency Chain Loop:

```
useEffect runs → fetchBranches() → setSelectedBranch() →
fetchActiveShift function changes → useEffect dependency change →
useEffect runs again → LOOP
```

## Solution Implemented

### Before (Problematic Code):

```tsx
const fetchActiveShift = useCallback(async () => {
  if (selectedBranch) {
    setLoadingActiveShift(true)
    try {
      const shift = await getActiveShift()
      setActiveShiftSummary(shift)
    } finally {
      setLoadingActiveShift(false)
    }
  } else {
    setActiveShiftSummary(null)
  }
}, [selectedBranch, setActiveShiftSummary]) // ❌ setActiveShiftSummary tidak perlu

useEffect(() => {
  setIsLoadingBranches(true)
  if (!isLoadingUser && userData) {
    fetchBranches()
    fetchActiveShift() // ❌ Dipanggil bersamaan dengan fetchBranches
  } else if (!isLoadingUser && !userData) {
    setIsLoadingBranches(false)
  }
}, [userData, isLoadingUser, fetchBranches, fetchActiveShift]) // ❌ fetchActiveShift jadi dependency
```

### After (Fixed Code):

```tsx
const fetchActiveShift = useCallback(async () => {
  if (selectedBranch) {
    setLoadingActiveShift(true)
    try {
      const shift = await getActiveShift()
      setActiveShiftSummary(shift)
    } finally {
      setLoadingActiveShift(false)
    }
  } else {
    setActiveShiftSummary(null)
  }
}, [selectedBranch]) // ✅ Hanya depend pada selectedBranch

// useEffect untuk fetch branches
useEffect(() => {
  setIsLoadingBranches(true)
  if (!isLoadingUser && userData) {
    fetchBranches() // ✅ Hanya fetch branches
  } else if (!isLoadingUser && !userData) {
    setIsLoadingBranches(false)
  }
}, [userData, isLoadingUser, fetchBranches]) // ✅ Tidak ada fetchActiveShift

// useEffect terpisah untuk fetch active shift ketika selectedBranch berubah
useEffect(() => {
  fetchActiveShift() // ✅ Fetch shift setelah selectedBranch di-set
}, [fetchActiveShift])
```

## Key Changes:

1. **Removed `setActiveShiftSummary` from dependency**: setState functions are stable and don't need to be dependencies
2. **Separated useEffect**: Created separate useEffect for `fetchActiveShift` that only runs when `selectedBranch` changes
3. **Removed concurrent calls**: Don't call `fetchActiveShift()` in the same useEffect as `fetchBranches()`

## Test Results:

✅ Dashboard loads without infinite loop
✅ Navigation between pages works normally  
✅ Shift data loads correctly after branch is selected
✅ No more Fast Refresh loops
✅ Console clean from repetitive errors

## Files Modified:

- `src/contexts/branch-context.tsx` - Fixed useEffect dependencies and separation

## Validation:

- Manual testing: Dashboard → POS → Invoicing navigation works smooth
- No console errors
- Shift data loads properly when branch is available
- Performance restored to normal levels
