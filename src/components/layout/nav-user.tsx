'use client'

import {
  BellIcon,
  CreditCardIcon,
  LogOutIcon,
  MoreVerticalIcon,
  UserCircleIcon,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAuth } from '@/contexts/auth-context'
import { useBranches } from '@/contexts/branch-context'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'

export function NavUser() {
  const { isMobile } = useSidebar()
  const { userData, logout, isLoading, isLoadingUserData } = useAuth()

  const handleLogout = async () => {
    logout()
  }

  const { branches, selectedBranch, getBranchById, isLoadingBranches } =
    useBranches()

  const userDisplayName = userData?.name || 'Pengguna'
  const userDisplayRole = userData?.role
    ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1)
    : isLoadingBranches
    ? ''
    : 'N/A'
  const userAvatar =
    userData?.avatar_url ||
    `https://placehold.co/40x40.png?text=${
      userDisplayName?.substring(0, 1) || 'BW'
    }`

  const assignedBranchName = useMemo(() => {
    if (isLoadingBranches || !userData) return null
    if (userData.role === 'admin') return null
    if (!userData.branch_id) return 'Belum ada cabang'
    const foundBranch = branches.find((b) => b.id === userData.branch_id)
    return foundBranch?.name || 'ID Cabang tidak valid'
  }, [userData, branches, isLoadingBranches])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {isLoadingBranches ? (
          <Skeleton className='h-9 w-full rounded-md' />
        ) : userData?.role === 'admin' ? (
          branches.length > 0 && (
            <Select
              value={String(selectedBranch?.id || '')}
              onValueChange={(branchId) => {
                getBranchById(branchId)
              }}
              disabled={
                isLoadingBranches || (!selectedBranch && branches.length === 0)
              }
            >
              <SelectTrigger className='h-9 text-xs rounded-md w-full justify-between bg-sidebar-accent hover:bg-sidebar-accent/90 text-sidebar-accent-foreground'>
                <SelectValue
                  placeholder={
                    isLoadingBranches ? 'Memuat cabang...' : 'Pilih Cabang'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem
                    key={branch.id}
                    value={String(branch.id)}
                    className='text-xs'
                  >
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        ) : (
          <div className='h-9 px-3 py-2 text-xs rounded-md w-full bg-sidebar-accent/50 text-sidebar-foreground/80 text-left truncate flex items-center'>
            {isLoadingBranches ? (
              <Skeleton className='h-4 w-24' />
            ) : (
              assignedBranchName || 'Memuat...'
            )}
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <Avatar className='h-8 w-8'>
                <AvatarImage
                  src={userAvatar}
                  alt='User Avatar'
                  data-ai-hint='person avatar'
                />
                <AvatarFallback>
                  {userDisplayName?.substring(0, 2).toUpperCase() || 'BW'}
                </AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-medium'>{userDisplayName}</span>
                <span className='truncate text-xs text-muted-foreground'>
                  {userDisplayRole}
                </span>
              </div>
              <MoreVerticalIcon className='ml-auto size-4' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <DropdownMenuLabel className='p-0 font-normal'>
              <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                <Avatar className='h-8 w-8 rounded-lg'>
                  <AvatarImage src={userAvatar} alt={userDisplayName} />
                  <AvatarFallback className='rounded-lg'>CN</AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-medium'>
                    {userDisplayName}
                  </span>
                  <span className='truncate text-xs text-muted-foreground'>
                    {userDisplayRole}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className='text-xs cursor-pointer'>
                <UserCircleIcon />
                Account
              </DropdownMenuItem>

              <DropdownMenuItem className='text-xs cursor-pointer'>
                <BellIcon />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              className='text-xs cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10'
              onClick={handleLogout}
            >
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
