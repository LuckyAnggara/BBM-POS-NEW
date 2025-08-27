# Shift Active Header Indicator Documentation

## Overview

Fitur indikator visual di site header yang menampilkan status shift active kepada user dengan desain yang menarik dan responsif terhadap light/dark mode.

## Features Implemented

### Visual Indicators

1. **Background Color Change**

   - Light mode: `bg-green-50 border-green-200`
   - Dark mode: `bg-green-950/30 border-green-800/50`

2. **Shift Active Badge**

   - Icon clock dengan animated dot hijau
   - Text "Shift Active" dengan warna hijau
   - Light mode: `text-green-700`
   - Dark mode: `text-green-300`

3. **Enhanced Elements**
   - Separator dengan warna hijau
   - Title text dengan warna hijau saat shift active
   - Theme toggle button dengan hover state hijau

### Technical Implementation

#### Dependencies Added

```tsx
import { useBranches } from '@/contexts/branch-context'
import { cn } from '@/lib/utils'
import { Clock } from 'lucide-react'
```

#### Core Logic

```tsx
const { activeShiftSummary } = useBranches()
const isShiftActive = !!activeShiftSummary
```

#### Conditional Styling

- Header background: conditional green tinting
- Icon dengan pulse animation: `animate-pulse`
- All text elements adapt to shift status
- Smooth transitions: `transition-all ease-linear duration-300`

## Code Structure

### Header Container

```tsx
<header className={cn(
  'group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-all ease-linear duration-300',
  isShiftActive
    ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800/50'
    : 'bg-background border-border'
)}>
```

### Shift Indicator

```tsx
{
  isShiftActive && (
    <div className='flex items-center gap-1.5 text-green-700 dark:text-green-300'>
      <div className='relative'>
        <Clock className='h-4 w-4' />
        <div className='absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full animate-pulse' />
      </div>
      <span className='text-xs font-medium'>Shift Active</span>
    </div>
  )
}
```

## Design Considerations

### Color Scheme

- **Primary Green**: `green-700` (light) / `green-300` (dark)
- **Background Green**: `green-50` (light) / `green-950/30` (dark)
- **Border Green**: `green-200` (light) / `green-800/50` (dark)
- **Accent Green**: `green-500` for pulse dot

### Responsiveness

- Icon dan text scale sesuai dengan header size
- Maintains proper spacing across all viewport sizes
- Smooth transitions tanpa layout shift

### Accessibility

- High contrast pada dark mode
- Clear visual hierarchy
- Meaningful color coding

## Integration with Branch Context

### Data Source

```tsx
const { activeShiftSummary } = useBranches()
```

### Dependency

- Relies on `BranchProvider` untuk data shift
- Automatically updates ketika shift status berubah
- No manual refresh required

## Test Results

### Light Mode ✅

- Background hijau muda yang subtle
- Text dan icon hijau yang jelas
- Border hijau yang tidak mengganggu

### Dark Mode ✅

- Background hijau gelap yang elegan
- Text hijau terang dengan kontras tinggi
- Konsisten dengan dark theme aplikasi

### State Management ✅

- Otomatis hide/show berdasarkan activeShiftSummary
- Smooth transitions antar state
- No performance impact

## Usage Instructions

### For Users

1. **Shift Active**: Header akan berubah warna hijau dengan indikator "Shift Active"
2. **No Active Shift**: Header tampil normal tanpa indikator
3. **Theme Switch**: Indikator tetap terlihat jelas di light/dark mode

### For Developers

1. Component otomatis menggunakan data dari `useBranches()`
2. No additional configuration needed
3. Styling fully responsive dan adaptive

## Files Modified

- `src/components/layout/site-header.tsx` - Main implementation
- Added dependencies: `Clock` icon, `useBranches` hook, `cn` utility

## Future Enhancements

1. Could add shift duration display
2. Could add click handler untuk shift details
3. Could add shift end quick action
4. Could add notification badge for shift warnings

## Production Notes

- Fully tested in light/dark modes
- No performance impact
- Compatible dengan existing layout
- Follows design system guidelines
