"use client"
import * as React from "react"
import { usePathname } from 'next/navigation'
import {
  ArrowUpCircleIcon,
  BarChartIcon,
  CameraIcon,
  ClipboardListIcon,
  DatabaseIcon,
  FileCodeIcon,
  FileIcon,
  FileTextIcon,
  FolderIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  ListIcon,
  LucideIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react"
import {navMain as mainMenu,navAdmin} from "./menu"
import { NavDocuments } from "@/components/layout/nav-documents"
import { NavMain } from "@/components/layout/nav-main"
import { NavSecondary } from "@/components/layout/nav-secondary"
import { NavUser } from "@/components/layout/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// --- 1. Definisi Tipe (Interfaces) untuk Type Safety ---

// Tipe untuk sub-item di konfigurasi asli
interface SubNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

// Tipe untuk item utama di konfigurasi asli
interface NavItem {
  href?: string;
  label:string;
  icon: LucideIcon;
  adminOnly: boolean;
  subItems?: SubNavItem[];
  badgeCount?: number;
  exactMatch?: boolean;
}

// Tipe untuk sub-item di format target (navClouds)
interface SubCloudItem {
  title: string;
  url: string;
}

// Tipe untuk item utama di format target (navClouds)
export interface NavCloud {
  title: string;
  icon: LucideIcon;
  isActive: boolean;
  url: string;
  items: SubCloudItem[];
}

// --- Fungsi Konversi dengan Tipe ---
const convertToNavClouds = (navItems: NavItem[], currentPath: string): NavCloud[] => {
  return navItems.map(item => {
    const subCloudItems = (item.subItems || []).map(subItem => ({
      title: subItem.label,
      url: subItem.href,
    }));
    
    // Item induk dianggap 'aktif' jika URL-nya cocok, ATAU
    // jika path saat ini diawali dengan URL salah satu anaknya.
    const isParentActive = item.href ? currentPath === item.href : false;
    const isChildActive = subCloudItems.some(sub => currentPath === sub.url);
    const isActive = isParentActive || isChildActive;

    return {
      title: item.label,
      icon: item.icon,
      isActive: isActive,
      url: item.href || '#',
      items: subCloudItems,
    };
  });
};

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: LayoutDashboardIcon,
    },
    {
      title: "Lifecycle",
      url: "#",
      icon: ListIcon,
    },
    {
      title: "Analytics",
      url: "#",
      icon: BarChartIcon,
    },
    {
      title: "Projects",
      url: "#",
      icon: FolderIcon,
    },
    {
      title: "Team",
      url: "#",
      icon: UsersIcon,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: SettingsIcon,
    },
    {
      title: "Get Help",
      url: "#",
      icon: HelpCircleIcon,
    },
    {
      title: "Search",
      url: "#",
      icon: SearchIcon,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: DatabaseIcon,
    },
    {
      name: "Reports",
      url: "#",
      icon: ClipboardListIcon,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: FileIcon,
    },
  ],
}


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  // 2. Gunakan hooks di dalam komponen
  const pathname = usePathname(); // Mendapatkan path URL saat ini

  // Contoh state, ini bisa datang dari context, props, atau state management library
  const isAdmin = true; // Ganti 'true' untuk melihat menu admin
  const unreadCount = 5;

  // 3. Gunakan useMemo untuk efisiensi
  const navMainMenu = React.useMemo(() => {
    // a. Dapatkan konfigurasi menu asli
    const originalNavItems = mainMenu(unreadCount);
    

    // b. Filter berdasarkan hak akses
    const accessibleNavItems = originalNavItems.filter(item => !item.adminOnly || isAdmin);
    // c. Lakukan konversi
    return convertToNavClouds(accessibleNavItems, pathname);
  }, [pathname, isAdmin, unreadCount]);

    const navAdminMenu = React.useMemo(() => {
    // a. Dapatkan konfigurasi menu asli
    const originalNavItems = navAdmin();
    

    // b. Filter berdasarkan hak akses
    const accessibleNavItems = originalNavItems.filter(item => !item.adminOnly || isAdmin);
    // c. Lakukan konversi
    return convertToNavClouds(accessibleNavItems, pathname);
  }, [pathname, isAdmin, unreadCount]);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <ArrowUpCircleIcon className="h-5 w-5" />
                <span className="text-base font-semibold">Berkah Baja Makmur</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainMenu} />
        <NavDocuments items={navAdminMenu} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
