
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import React, { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Archive,
  CreditCard,
  BarChart3,
  Settings, // Keep Settings icon
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
  ShieldAlert, // For deletion requests
} from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuSkeleton,
  SidebarMenuBadge
} from "@/components/ui/sidebar";
import SidebarUserProfile from "./sidebar-user-profile";
import SidebarHeaderBrand from "./sidebar-header-brand";
import { useAuth } from "@/contexts/auth-context";
import { getUnreadNotificationCount } from "@/lib/firebase/notifications";


const navItemsConfig = (unreadCount: number) => [
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
    label: "Notifikasi",
    icon: unreadCount > 0 ? BellDot : Bell,
    adminOnly: false,
    subItems: [
      { href: "/notifications", label: "Lihat Notifikasi", icon: unreadCount > 0 ? BellDot : Bell, exactMatch: true, badgeCount: unreadCount > 0 ? unreadCount : undefined },
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
  { href: "/branch-settings", label: "Pengaturan Cabang", icon: Settings, adminOnly: false }, 
  {
    label: "Administrasi",
    icon: Settings,
    adminOnly: true, // This group is admin only
    subItems: [
      { href: "/admin/send-notification", label: "Kirim Notifikasi", icon: Send },
      { href: "/admin/notification-history", label: "Riwayat Notifikasi", icon: HistoryIconLucide },
      { href: "/admin/deletion-requests", label: "Permintaan Hapus Trx", icon: ShieldAlert },
      { href: "/admin/settings", label: "Pengaturan Umum Admin", icon: Settings },
    ]
  }
];

export default function AppSidebarNav() {
  const pathname = usePathname();
  const { currentUser, userData, loadingAuth, loadingUserData } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (currentUser?.uid) {
      const count = await getUnreadNotificationCount(currentUser.uid);
      setUnreadCount(count);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    fetchUnreadCount();
    const intervalId = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(intervalId);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (pathname.includes('/notifications')) {
      setTimeout(fetchUnreadCount, 1500);
    }
  }, [pathname, fetchUnreadCount]);

  const navItems = navItemsConfig(unreadCount);

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
              
              const isCashierNoBranch = userData?.role === 'cashier' && !userData.branchId;
              const isAllowedForCashierNoBranch = item.href === '/dashboard' || 
                                                  item.label === 'Notifikasi' || 
                                                  item.href === '/account' || // Allow access to account page
                                                  (item.adminOnly && item.href === '/admin/settings');

              const isNavItemDisabled = isCashierNoBranch && !isAllowedForCashierNoBranch && 
                                      !item.subItems?.some(sub => sub.href === '/dashboard' || sub.href === '/notifications' || sub.href === '/account');


              if (item.subItems) {
                // Check if any sub-item should be visible for this user role
                const visibleSubItems = item.subItems.filter(subItem => !(subItem.adminOnly && userData?.role !== 'admin'));
                if (visibleSubItems.length === 0 && item.adminOnly && userData?.role !== 'admin') {
                    return null; // Hide entire admin group if no sub-items are visible
                }
                
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
                         {item.subItems.some(sub => sub.badgeCount && sub.badgeCount > 0) && (
                           <SidebarMenuBadge className="ml-auto">
                            {item.subItems.find(sub => sub.badgeCount && sub.badgeCount > 0)?.badgeCount}
                           </SidebarMenuBadge>
                         )}
                    </SidebarMenuButton>
                    <SidebarMenuSub className={cn(isNavItemDisabled && "opacity-60 pointer-events-none")}>
                      {visibleSubItems.map(subItem => {
                          const isSubItemDisabled = isCashierNoBranch && subItem.href !== '/dashboard' && subItem.href !== '/notifications' && subItem.href !== '/account';
                          return (
                            <SidebarMenuSubItem key={subItem.href}>
                            <Link href={isSubItemDisabled ? "#" : subItem.href} passHref legacyBehavior>
                                <SidebarMenuSubButton
                                    isActive={ (subItem.exactMatch ? pathname === subItem.href : pathname.startsWith(subItem.href)) && !isSubItemDisabled}
                                    aria-disabled={isSubItemDisabled}
                                    className={cn(isSubItemDisabled && "cursor-not-allowed")}
                                >
                                <subItem.icon className="mr-2 h-3.5 w-3.5 text-muted-foreground data-[active=true]:text-primary" />
                                <span>{subItem.label}</span>
                                {subItem.badgeCount && subItem.badgeCount > 0 && (
                                    <SidebarMenuBadge className="ml-auto">{subItem.badgeCount}</SidebarMenuBadge>
                                )}
                                </SidebarMenuSubButton>
                            </Link>
                            </SidebarMenuSubItem>
                          );
                      })}
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
