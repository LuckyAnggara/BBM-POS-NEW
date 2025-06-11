
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import SidebarUserProfile from "./sidebar-user-profile";
import SidebarHeaderBrand from "./sidebar-header-brand";
import { useAuth } from "@/contexts/auth-context";
import { getUnreadNotificationCount } from "@/lib/firebase/notifications";


const navItemsConfig = (unreadCount: number) => [
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
    // Re-fetch immediately if path changes to notifications or from notifications
    // to update badge possibly cleared by visiting the page.
    if (pathname.includes('/notifications')) {
       setTimeout(fetchUnreadCount, 1000); // slight delay to allow read status to update
    }
  }, [pathname, fetchUnreadCount]);

  const navItems = navItemsConfig(unreadCount);

  return (
    <nav className="flex flex-col h-full">
      <SidebarHeaderBrand />

      <div className="flex-grow overflow-y-auto p-2 space-y-0.5 mt-1"> {/* Reduced space-y for tighter packing */}
        {(loadingAuth || loadingUserData) ? (
          <SidebarMenu>
            <SidebarMenuSkeleton showIcon className="my-1" />
            <SidebarMenuSkeleton showIcon className="my-1" />
            <SidebarMenuSkeleton showIcon className="my-1" />
            <SidebarMenuSkeleton showIcon className="my-1" />
            <SidebarMenuSkeleton showIcon className="my-1" />
            <SidebarMenuSkeleton showIcon className="my-1" />
            <SidebarMenuSkeleton showIcon className="my-1" />
          </SidebarMenu>
        ) : (
          <SidebarMenu> {/* UL as the root container for all items */}
            {navItems.map((item) => {
              if (item.adminOnly && userData?.role !== 'admin') {
                return null;
              }
              
              const isCashierNoBranch = userData?.role === 'cashier' && !userData.branchId;

              if (item.subItems && item.subItems.length > 0) {
                // This is an accordion group
                const isGroupDisabledForCashier = isCashierNoBranch && !item.subItems?.some(sub => sub.href === '/dashboard' || sub.href === '/notifications' || sub.href === '/account');
                const visibleSubItems = item.subItems.filter(subItem => !(subItem.adminOnly && userData?.role !== 'admin'));
                if (visibleSubItems.length === 0 && item.adminOnly && userData?.role !== 'admin') {
                    return null;
                }
                const isGroupActive = visibleSubItems.some(sub => sub.href && (sub.exactMatch ? pathname === sub.href : pathname.startsWith(sub.href))) && !isGroupDisabledForCashier;

                return (
                  <SidebarMenuItem key={item.label} className="w-full my-0.5 p-0 list-none"> {/* Wrapper LI */}
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value={item.label} className="border-none">
                        <AccordionTrigger
                          className={cn(
                            "flex items-center justify-between w-full p-2 text-xs rounded-md hover:no-underline",
                            "hover:bg-sidebar-accent/50 data-[state=open]:bg-sidebar-accent/60",
                            "h-9", // Consistent height
                            isGroupActive ? "bg-primary/10 text-primary hover:bg-primary/15 font-medium" : "text-sidebar-foreground",
                            isGroupDisabledForCashier && "opacity-60 cursor-not-allowed hover:bg-transparent",
                          )}
                          disabled={isGroupDisabledForCashier}
                          aria-disabled={isGroupDisabledForCashier}
                          tabIndex={isGroupDisabledForCashier ? -1 : undefined}
                        >
                          <div className="flex items-center gap-2.5">
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="truncate text-xs">{item.label}</span>
                          </div>
                          {/* ChevronDown is part of AccordionTrigger by default */}
                        </AccordionTrigger>
                        <AccordionContent className="pt-0 pb-0 pl-5 pr-0 overflow-hidden"> {/* Indent sub-items */}
                          <SidebarMenuSub className={cn("!mx-0 !px-0 !py-1 !border-l-0", isGroupDisabledForCashier && "opacity-60 pointer-events-none")}>
                            {visibleSubItems.map(subItem => {
                                const isSubItemCashierNoBranch = userData?.role === 'cashier' && !userData.branchId;
                                const isSubItemAllowedForCashierNoBranch = subItem.href === '/dashboard' || subItem.href === '/notifications' || subItem.href === '/account';
                                const isSubItemDisabled = isSubItemCashierNoBranch && !isSubItemAllowedForCashierNoBranch;
                                const isSubItemActive = (subItem.href && (subItem.exactMatch ? pathname === subItem.href : pathname.startsWith(subItem.href))) && !isSubItemDisabled;
                                return (
                                  <SidebarMenuSubItem key={subItem.href || subItem.label} className="py-0.5">
                                    <Link href={isSubItemDisabled || !subItem.href ? "#" : subItem.href} passHref legacyBehavior>
                                        <SidebarMenuSubButton
                                            isActive={isSubItemActive}
                                            aria-disabled={isSubItemDisabled}
                                            className={cn(
                                              "text-xs h-auto py-1.5 px-2 w-full justify-start hover:bg-sidebar-accent/50",
                                              isSubItemActive ? "text-primary font-medium bg-sidebar-accent/60" : "text-sidebar-foreground/80",
                                              isSubItemDisabled && "cursor-not-allowed opacity-50"
                                            )}
                                        >
                                          <span className='text-xs'>{subItem.label}</span>
                                          {subItem.badgeCount && subItem.badgeCount > 0 && (
                                              <SidebarMenuBadge className="ml-auto">{subItem.badgeCount}</SidebarMenuBadge>
                                          )}
                                        </SidebarMenuSubButton>
                                    </Link>
                                  </SidebarMenuSubItem>
                                );
                            })}
                          </SidebarMenuSub>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </SidebarMenuItem>
                );
              }

              // Non-group items (direct links)
              if (!item.href) return null;

              const isAllowedForCashierNoBranch = item.href === '/dashboard' || item.href === '/notifications' || item.href === '/account';
              const isNavItemDisabled = isCashierNoBranch && !isAllowedForCashierNoBranch;
              
              return (
                <SidebarMenuItem key={item.label} className="w-full my-0.5">
                  <Link
                    href={isNavItemDisabled ? "#" : item.href}
                    onClick={(e) => { if (isNavItemDisabled) e.preventDefault(); }}
                    aria-disabled={isNavItemDisabled}
                    className={cn("w-full", isNavItemDisabled && "pointer-events-none focus:outline-none")}
                    tabIndex={isNavItemDisabled ? -1 : undefined}
                  >
                    <SidebarMenuButton
                      variant="default"
                      size="default" 
                      className={cn(
                        "w-full justify-start text-xs p-2 h-9", 
                        pathname === item.href && !isNavItemDisabled ? "bg-primary/10 text-primary hover:bg-primary/20 font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                        isNavItemDisabled && "opacity-60 cursor-not-allowed hover:bg-transparent"
                      )}
                      isActive={!isNavItemDisabled && pathname === item.href}
                      tooltip={isNavItemDisabled ? undefined : {children: item.label, side: "right", align: "center"}}
                    >
                      <item.icon className="mr-2.5 h-4 w-4 shrink-0" />
                      <span className="truncate text-xs">{item.label}</span>
                       {item.badgeCount && item.badgeCount > 0 && (
                         <SidebarMenuBadge className="ml-auto">{item.badgeCount}</SidebarMenuBadge>
                       )}
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        )}
      </div>

      <SidebarUserProfile />
    </nav>
  );
}
