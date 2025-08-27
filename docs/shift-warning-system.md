# Shift Warning System Documentation

Sistem peringatan shift ini memberikan user experience yang lebih baik ketika ada shift aktif dan user mencoba meninggalkan aplikasi.

## Komponen yang Tersedia

### 1. ShiftWarningDialog

Dialog yang menarik dan animatif yang menampilkan informasi detail shift aktif.

**Fitur:**

- Animasi masuk yang smooth
- Informasi detail shift (kasir, modal awal, durasi)
- Peringatan visual dengan ikon dan warna
- Tombol untuk tutup shift atau tetap keluar

### 2. useShiftUnloadWarning Hook

Hook utama yang menangani logika warning dan state management.

**Return values:**

- `activeShift`: Data shift aktif saat ini
- `showWarningDialog`: State untuk mengontrol dialog
- `showWarning(callback?)`: Function untuk menampilkan warning
- `handleConfirmLeave`: Function untuk konfirmasi keluar
- `handleCancelLeave`: Function untuk membatalkan keluar
- `refreshActiveShift`: Function untuk refresh data shift

### 3. useShiftAwareNavigation Hook

Hook untuk navigasi yang terintegrasi dengan sistem warning.

**Methods:**

- `push(path)`: Navigate dengan warning check
- `replace(path)`: Replace dengan warning check
- `back()`: Go back dengan warning check
- `refresh()`: Refresh dengan warning check

### 4. ShiftUnloadWarningProvider

Provider component yang menangani warning di level aplikasi.

### 5. ShiftStatusIndicator

Komponen UI untuk menampilkan status shift dan testing.

## Cara Penggunaan

### Setup di Level Aplikasi

```tsx
// layout.tsx atau _app.tsx
import { ShiftUnloadWarningProvider } from '@/components/providers/ShiftUnloadWarningProvider'

export default function Layout({ children }) {
  return <ShiftUnloadWarningProvider>{children}</ShiftUnloadWarningProvider>
}
```

### Navigasi yang Aman

```tsx
// Gunakan hook untuk navigasi yang aman
import { useShiftAwareNavigation } from '@/hooks/useShiftAwareNavigation'

function MyComponent() {
  const navigation = useShiftAwareNavigation()

  const handleGoToDashboard = () => {
    // Akan menampilkan warning jika ada shift aktif
    navigation.push('/dashboard')
  }

  return <button onClick={handleGoToDashboard}>Go to Dashboard</button>
}
```

### Custom Warning Implementation

```tsx
import { useShiftUnloadWarning } from '@/hooks/useShiftUnloadWarning'

function MyComponent() {
  const { showWarning, activeShift } = useShiftUnloadWarning()

  const handleCustomAction = () => {
    const wasWarningShown = showWarning(() => {
      // Action yang akan dijalankan setelah konfirmasi
      console.log('Action confirmed')
    })

    if (!wasWarningShown) {
      // Tidak ada shift aktif, langsung jalankan action
      console.log('No active shift, action executed')
    }
  }

  return (
    <div>
      <p>Active shift: {activeShift?.status}</p>
      <button onClick={handleCustomAction}>Custom Action</button>
    </div>
  )
}
```

### Menampilkan Status Shift

```tsx
import { ShiftStatusIndicator } from '@/components/shift/ShiftStatusIndicator'

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <ShiftStatusIndicator />
    </div>
  )
}
```

## Browser Warning

Sistem ini juga menggunakan native browser warning (`beforeunload` event) sebagai fallback untuk situasi dimana user langsung menutup tab/browser.

## Features

1. **Dialog yang Menarik**: UI yang modern dengan animasi dan informasi lengkap
2. **Dual Warning System**: Custom dialog + native browser warning
3. **Smart Navigation**: Hook yang terintegrasi dengan router
4. **Real-time Updates**: Data shift di-refresh secara berkala
5. **Type Safety**: Fully typed dengan TypeScript
6. **Flexible**: Dapat digunakan untuk custom actions

## Styling

Dialog menggunakan:

- Tailwind CSS untuk styling
- shadcn/ui components
- Lucide icons
- Smooth animations dengan CSS classes

## Error Handling

- Handle network errors pada fetch shift data
- Graceful fallback jika data shift tidak tersedia
- Console logging untuk debugging
