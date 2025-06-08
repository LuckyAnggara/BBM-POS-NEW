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
} from "lucide-react";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import SidebarUserProfile from "./sidebar-user-profile";
import SidebarHeaderBrand from "./sidebar-header-brand";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "Point of Sale", icon: ShoppingCart },
  { href: "/inventory", label: "Inventory", icon: Archive },
  { href: "/expenses", label: "Expenses", icon: CreditCard },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export default function AppSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col h-full">
      <SidebarHeaderBrand />
      <Separator className="mx-2 my-1 w-auto bg-sidebar-border" />
      <div className="flex-grow overflow-y-auto p-2 space-y-1">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href}>
                <SidebarMenuButton
                  variant="default"
                  size="default" 
                  className={cn(
                    "w-full justify-start text-sm", // Use text-sm for nav items
                    pathname === item.href ? "bg-primary/10 text-primary hover:bg-primary/20" : "hover:bg-accent/50"
                  )}
                  isActive={pathname === item.href}
                  tooltip={{children: item.label, side: "right", align: "center"}}
                >
                  <item.icon className="mr-2.5 h-4.5 w-4.5" /> 
                  <span className="truncate">{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </div>
      <Separator className="mx-2 my-1 w-auto bg-sidebar-border" />
      <SidebarUserProfile />
    </nav>
  );
}
