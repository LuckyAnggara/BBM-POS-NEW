
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
  Settings, // Added Settings icon
} from "lucide-react";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import SidebarUserProfile from "./sidebar-user-profile";
import SidebarHeaderBrand from "./sidebar-header-brand";
import { useAuth } from "@/contexts/auth-context";


const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/pos", label: "Point of Sale", icon: ShoppingCart, adminOnly: false },
  { href: "/inventory", label: "Inventory", icon: Archive, adminOnly: false },
  { href: "/expenses", label: "Expenses", icon: CreditCard, adminOnly: false },
  { href: "/reports", label: "Reports", icon: BarChart3, adminOnly: false },
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
          {navItems.map((item) => {
            if (item.adminOnly && userData?.role !== 'admin') {
              return null; // Don't render admin-only items for non-admins
            }

            const isNavItemDisabled = !loadingAuth && !loadingUserData &&
                                     userData?.role === 'cashier' &&
                                     userData?.branchId === null &&
                                     item.href !== '/dashboard'; // Dashboard is always accessible

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
          })}
        </SidebarMenu>
      </div>
      
      <SidebarUserProfile />
    </nav>
  );
}
