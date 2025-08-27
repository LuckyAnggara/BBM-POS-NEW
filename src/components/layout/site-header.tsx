import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Computer, MonitorCog, Moon, Sun, Clock } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useBranches } from '@/contexts/branch-context'
import { cn } from '@/lib/utils'

export function SiteHeader({ title = '' }) {
  const { setTheme } = useTheme()
  const { activeShiftSummary } = useBranches()

  // Menentukan apakah ada shift active
  const isShiftActive = !!activeShiftSummary

  return (
    <header
      className={cn(
        'group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-all ease-linear duration-300 justify-between',
        isShiftActive
          ? 'bg-green-100 rounded-t-md border-green-200 dark:bg-green-950/30 dark:border-green-800/50'
          : 'bg-background border-border'
      )}
    >
      <div className='flex  items-center gap-1 px-4 lg:gap-2 lg:px-6'>
        <SidebarTrigger className='-ml-1' />
        <Separator
          orientation='vertical'
          className={cn(
            'mx-2 data-[orientation=vertical]:h-4',
            isShiftActive ? 'bg-green-300 dark:bg-green-700' : ''
          )}
        />
        <div className='flex items-center gap-2'>
          <h1
            className={cn(
              'text-base font-medium',
              isShiftActive
                ? 'text-green-800 dark:text-green-200'
                : 'text-foreground'
            )}
          >
            {title}
          </h1>
        </div>
      </div>
      {/* DarkMode Toggle */}
      <div className='flex flex-row'>
        <div className='flex items-center mr-4'>
          {isShiftActive && (
            <div className='flex items-center gap-1.5 text-green-700 dark:text-green-300'>
              <div className='relative'>
                <Clock className='h-4 w-4' />
                <div className='absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full animate-pulse' />
              </div>
              <span className='text-xs font-medium'>Shift Active</span>
            </div>
          )}
        </div>

        <div className='mr-2'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className={cn(
                  isShiftActive
                    ? 'hover:bg-green-100 dark:hover:bg-green-900/40 text-green-700 dark:text-green-300'
                    : ''
                )}
              >
                <Sun className='h-6 w-6 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90' />
                <Moon className='absolute h-6 w-6 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0' />
                <span className='sr-only'>Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className='h-6 w-6' />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className='h-6 w-6' />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <MonitorCog className='h-6 w-6' />
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
