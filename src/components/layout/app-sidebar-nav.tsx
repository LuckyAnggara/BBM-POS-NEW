
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
  Bell, // Added Bell icon
  Send, // Added Send icon
  History as HistoryIconLucide, // Renamed for clarity
} from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuSkeleton
} from "@/components/ui/sidebar";
import SidebarUserProfile from "./sidebar-user-profile";
import SidebarHeaderBrand from "./sidebar-header-brand";
import { useAuth } from "@/contexts/auth-context";


const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/pos", label: "Point of Sale", icon: ShoppingCart, adminOnly: false },
  { href: "/inventory", label: "Inventaris", icon: Archive, adminOnly: false },
  {
    label: "Master Data",
    icon: Database,
    adminOnly: false,
    subItems: [
      { href: "/customers", label: "Pelanggan", icon: Users },
      { href: "/suppliers", label: "Pemasok", icon: Truck },
    ]
  },
  { href: "/purchase-orders", label: "Pesanan Pembelian", icon: ClipboardList, adminOnly: false },
  { href: "/sales-history", label: "Riwayat Penjualan", icon: Receipt, adminOnly: false },
  {
    label: "Keuangan",
    icon: Landmark,
    adminOnly: false,
    subItems: [
      { href: "/accounts-receivable", label: "Piutang Usaha", icon: ListChecks },
      { href: "/accounts-payable", label: "Utang Usaha", icon: Archive }, 
    ]
  },
  { href: "/shift-history", label: "Riwayat Shift", icon: History, adminOnly: false },
  { href: "/expenses", label: "Pengeluaran", icon: CreditCard, adminOnly: false },
  {
    label: "Notifikasi", // New general notification item
    icon: Bell,
    adminOnly: false,
    subItems: [
      { href: "/notifications", label: "Lihat Notifikasi", icon: Bell, exactMatch: true },
    ]
  },
  {
    href: "/reports",
    label: "Laporan",
    icon: BarChart3,
    adminOnly: false,
    subItems: [
      { href: "/reports", label: "Ringkasan Keuangan", icon: BarChart3, exactMatch: true },
      { href: "/reports/stock-mutation", label: "Mutasi Stok Global", icon: PackageSearch },
      { href: "/reports/stock-movement", label: "Pergerakan Stok Produk", icon: PackageOpen },
    ]
  },
  {
    label: "Admin Notifikasi", // New admin-only notification group
    icon: Send, // Using Send for "Admin Notifikasi" parent
    adminOnly: true,
    subItems: [
      { href: "/admin/send-notification", label: "Kirim Notifikasi", icon: Send },
      { href: "/admin/notification-history", label: "Riwayat Notifikasi", icon: HistoryIconLucide },
    ]
  },
  { href: "/admin/settings", label: "Pengaturan Admin", icon: Settings, adminOnly: true },
];

export default function AppSidebarNav() {
  const pathname = usePathname();
  const { userData, loadingAuth, loadingUserData } = useAuth();

  return (
    <nav className="flex flex-col h-full">
      <SidebarHeaderBrand />

      <div className="flex-grow overflow-y-auto p-2 space-y-1 mt-1">
        <SidebarMenu>
          {(loadingAuth || loadingUserData) ? (
            <>
              <SidebarMenuSkeleton showIcon className="my-1" />
              <SidebarMenuSkeleton showIcon className="my-1" />
              <SidebarMenuSkeleton showIcon className="my-1" />
              <SidebarMenuSkeleton showIcon className="my-1" />
              <SidebarMenuSkeleton showIcon className="my-1" />
              <SidebarMenuSkeleton showIcon className="my-1" />
              <SidebarMenuSkeleton showIcon className="my-1" />
            </>
          ) : (
            navItems.map((item) => {
              if (item.adminOnly && userData?.role !== 'admin') {
                return null;
              }

              const isNavItemDisabled = 
                                      userData?.role === 'cashier' &&
                                      userData?.branchId === null &&
                                      item.href !== '/dashboard' &&
                                      item.label !== 'Notifikasi' && // Allow notifications page
                                      !item.subItems?.some(sub => sub.href === '/dashboard' || sub.href === '/notifications');

              if (item.subItems) {
                return (
                  <SidebarMenuItem key={item.label} className="flex flex-col items-start">
                    <SidebarMenuButton
                        variant="default"
                        size="default"
                        className={cn(
                          "w-full justify-start text-sm font-medium",
                          (item.href && pathname.startsWith(item.href) || item.subItems.some(sub => sub.href && (sub.exactMatch ? pathname === sub.href : pathname.startsWith(sub.href)))) && !isNavItemDisabled ? "text-primary" : "hover:bg-sidebar-accent/50",
                          isNavItemDisabled && "opacity-60 cursor-not-allowed hover:bg-transparent"
                        )}
                        isActive={(item.href && pathname.startsWith(item.href) || item.subItems.some(sub => sub.href && (sub.exactMatch ? pathname === sub.href : pathname.startsWith(sub.href)))) && !isNavItemDisabled}
                        asChild={false}
                        onClick={(e) => { if(isNavItemDisabled) e.preventDefault(); }}
                        aria-disabled={isNavItemDisabled}
                        tabIndex={isNavItemDisabled ? -1 : undefined}
                      >
                        <item.icon className="mr-2.5 h-4.5 w-4.5" />
                        <span className="truncate">{item.label}</span>
                    </SidebarMenuButton>
                    <SidebarMenuSub className={cn(isNavItemDisabled && "opacity-60 pointer-events-none")}>
                      {item.subItems.map(subItem => (
                        <SidebarMenuSubItem key={subItem.href}>
                          <Link href={isNavItemDisabled ? "#" : subItem.href} passHref legacyBehavior>
                            <SidebarMenuSubButton
                                isActive={ (subItem.exactMatch ? pathname === subItem.href : pathname.startsWith(subItem.href)) && !isNavItemDisabled}
                                aria-disabled={isNavItemDisabled}
                                className={cn(isNavItemDisabled && "cursor-not-allowed")}
                            >
                              <span>{subItem.label}</span>
                            </SidebarMenuSubButton>
                          </Link>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                );
              }

              if (!item.href) return null; 

              return (
                <SidebarMenuItem key={item.label}>
                  <Link
                    href={isNavItemDisabled ? "#" : item.href}
                    onClick={(e) => {
                      if (isNavItemDisabled) e.preventDefault();
                    }}
                    aria-disabled={isNavItemDisabled}
                    className={cn(isNavItemDisabled && "pointer-events-none focus:outline-none")}
                    tabIndex={isNavItemDisabled ? -1 : undefined}
                  >
                    <SidebarMenuButton
                      variant="default"
                      size="default"
                      className={cn(
                        "w-full justify-start text-sm",
                        pathname === item.href && !isNavItemDisabled ? "bg-primary/10 text-primary hover:bg-primary/20" : "hover:bg-sidebar-accent/50",
                        isNavItemDisabled && "opacity-60 cursor-not-allowed hover:bg-transparent"
                      )}
                      isActive={!isNavItemDisabled && pathname === item.href}
                      tooltip={isNavItemDisabled ? undefined : {children: item.label, side: "right", align: "center"}}
                    >
                      <item.icon className="mr-2.5 h-4.5 w-4.5" />
                      <span className="truncate">{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })
          )}
        </SidebarMenu>
      </div>

      <SidebarUserProfile />
    </nav>
  );
}
