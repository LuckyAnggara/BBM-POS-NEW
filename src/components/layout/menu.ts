import {
  LayoutDashboard,
  ShoppingCart,
  Archive,
  CreditCard,
  BarChart3,
  Settings,
  Receipt,
  History,
  PackageSearch,
  Truck,
  ClipboardList,
  PackageOpen,
  Users,
  ListChecks,
  Database,
  Landmark,
  Bell,
  BellDot,
  Send,
  History as HistoryIconLucide,
  ShieldAlert,
} from 'lucide-react'

export const navMain = (unreadCount: number) => [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    adminOnly: false,
  },
  {
    href: '/pos',
    label: 'Point of Sale',
    icon: ShoppingCart,
    adminOnly: false,
  },
  {
    href: '/purchase-orders',
    label: 'Pembelian',
    icon: ClipboardList,
    adminOnly: false,
  },
  {
    label: 'Master Data',
    icon: Database,
    adminOnly: false,
    subItems: [
      { href: '/customers', label: 'Pelanggan', icon: Users },
      { href: '/suppliers', label: 'Pemasok', icon: Truck },
      {
        href: '/inventory',
        label: 'Persediaan',
        icon: Archive,
        adminOnly: false,
      },
      {
        href: '/stock-opname',
        label: 'Stock Opname',
        icon: ListChecks,
        adminOnly: false,
      },
    ],
  },
  {
    label: 'Riwayat',
    icon: History,
    adminOnly: false,
    subItems: [
      {
        href: '/sales-history',
        label: 'Riwayat Penjualan',
        icon: Receipt,
        adminOnly: false,
      },
      {
        href: '/shift-history',
        label: 'Riwayat Shift',
        icon: History,
        adminOnly: false,
      },
    ],
  },

  {
    label: 'Keuangan',
    icon: Landmark,
    adminOnly: false,
    subItems: [
      {
        href: '/accounts-receivable',
        label: 'Piutang Usaha',
        icon: ListChecks,
      },
      { href: '/accounts-payable', label: 'Utang Usaha', icon: Archive },
    ],
  },

  {
    href: '/expenses',
    label: 'Pengeluaran',
    icon: CreditCard,
    adminOnly: false,
  },
  {
    label: 'Notifikasi',
    href: '/notifications',
    icon: unreadCount > 0 ? BellDot : Bell,
    badgeCount: unreadCount > 0 ? unreadCount : undefined,
    exactMatch: true,
    adminOnly: false,
  },
  {
    href: '/reports',
    label: 'Laporan',
    icon: BarChart3,
    adminOnly: false,
    subItems: [
      {
        href: '/reports',
        label: 'Ringkasan Keuangan',
        icon: BarChart3,
        exactMatch: true,
      },
      {
        href: '/reports/stock-mutation',
        label: 'Mutasi Stok Global',
        icon: PackageSearch,
      },
      {
        href: '/reports/stock-movement',
        label: 'Pergerakan Stok Produk',
        icon: PackageOpen,
      },
    ],
  },
  {
    href: '/branch-settings',
    label: 'Pengaturan Toko',
    icon: Settings,
    adminOnly: false,
  },
]

export const navAdmin = () => [
  {
    href: '/admin/send-notification',
    label: 'Kirim Notifikasi',
    icon: Send,
    adminOnly: true,
  },
  {
    href: '/admin/notification-history',
    label: 'Riwayat Notifikasi',
    icon: HistoryIconLucide,
    adminOnly: true,
  },
  {
    href: '/admin/deletion-requests',
    label: 'Permintaan Transaksi',
    icon: ShieldAlert,
    adminOnly: true,
  },
  {
    href: '/admin/stock-opname-review',
    label: 'Review Stock Opname',
    icon: ListChecks,
    adminOnly: true,
  },
  {
    href: '/admin/settings',
    label: 'Pengaturan Admin',
    icon: Settings,
    adminOnly: true,
  },
]
