"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

// Gunakan tipe data NavCloud yang sudah kita definisikan sebelumnya
// Pastikan path impor ini benar atau pindahkan tipe ke file terpusat

export function NavDocuments({ items }: { items: NavCloud[] }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Administrator</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const hasSubItems = item.items && item.items.length > 0
          
          // Render item sebagai Collapsible HANYA JIKA punya submenu
          if (hasSubItems) {
            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={item.isActive} // Buka jika item induk atau anaknya aktif
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    {/* Tombol ini hanya untuk membuka/menutup, bukan link */}
                    <SidebarMenuButton active={item.isActive} tooltip={item.title}>
                      {item.icon && <item.icon className="h-4 w-4" />}
                      <span>{item.title}</span>
                      {/* Ikon panah hanya muncul di sini */}
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          {/* Gunakan asChild agar Link dari Next.js bisa dipakai */}
                          <SidebarMenuSubButton asChild active={pathname === subItem.url}>
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          }

          // Jika tidak punya submenu, render sebagai Link langsung
          return (
            <SidebarMenuItem key={item.title}>
              {/* Gunakan asChild agar seluruh tombol menjadi Link */}
              <SidebarMenuButton asChild active={item.isActive} tooltip={item.title}>
                <Link href={item.url}>
                  {item.icon && <item.icon className="h-4 w-4" />}
                  <span>{item.title}</span>
                  {/* Tidak ada ikon panah di sini */}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}