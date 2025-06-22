import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { navMain, navAdmin } from '@/components/layout/menu'
import { useAuth } from '@/contexts/auth-context'

// Re-use the interfaces from app-sidebar.tsx for consistency
interface SubNavItem {
  href: string
  label: string
  icon: any // LucideIcon
  adminOnly?: boolean
}

interface NavItem {
  href?: string
  label: string
  icon: any // LucideIcon
  adminOnly?: boolean
  subItems?: SubNavItem[]
  badgeCount?: number
  exactMatch?: boolean
}

// Helper function to find the active label based on pathname and menu structure
const findActiveLabel = (
  items: NavItem[],
  pathname: string
): string | undefined => {
  for (const item of items) {
    // Check if the current item is active
    if (item.href) {
      const isActive = item.exactMatch
        ? pathname === item.href
        : pathname.startsWith(item.href)
      if (isActive) {
        return item.label
      }
    }

    // If not active, check its sub-items recursively
    if (item.subItems && item.subItems.length > 0) {
      const subItemLabel = findActiveLabel(
        item.subItems.map((sub) => ({ ...sub, icon: sub.icon || item.icon })),
        pathname
      ) // Pass icon down
      if (subItemLabel) {
        return subItemLabel
      }
    }
  }
  return undefined
}

export const useActiveMenuTitle = (): string => {
  const pathname = usePathname()
  const { userData } = useAuth()
  const isAdmin = userData?.role === 'admin'
  const unreadCount = 0 // This should ideally come from a global state/context if dynamic

  const allNavItems = useMemo(() => {
    const mainItems = navMain(unreadCount)
    const adminItems = navAdmin()
    return [...mainItems, ...adminItems]
  }, [unreadCount])

  const activeTitle = useMemo(() => {
    // Filter menu items based on user's admin status
    const accessibleNavItems = allNavItems.filter(
      (item) => !item.adminOnly || isAdmin
    )

    // Find the label of the currently active menu item
    const foundLabel = findActiveLabel(accessibleNavItems, pathname)

    // Return the found label or a default title
    return foundLabel || 'Dashboard'
  }, [pathname, allNavItems, isAdmin])

  return activeTitle
}
