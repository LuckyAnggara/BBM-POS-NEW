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

export const navItemsConfig = (unreadCount: number) => [
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
        label: 'Inventaris',
        icon: Archive,
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
    label: 'Pengaturan Cabang',
    icon: Settings,
    adminOnly: false,
  },
  {
    label: 'Administrasi',
    icon: Settings,
    adminOnly: true, // This group is admin only
    subItems: [
      {
        href: '/admin/send-notification',
        label: 'Kirim Notifikasi',
        icon: Send,
      },
      {
        href: '/admin/notification-history',
        label: 'Riwayat Notifikasi',
        icon: HistoryIconLucide,
      },
      {
        href: '/admin/deletion-requests',
        label: 'Permintaan Hapus Trx',
        icon: ShieldAlert,
      },
      {
        href: '/admin/settings',
        label: 'Pengaturan Umum Admin',
        icon: Settings,
      },
    ],
  },
]
