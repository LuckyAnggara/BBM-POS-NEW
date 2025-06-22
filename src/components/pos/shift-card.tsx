import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { POSShift } from '@/lib/appwrite/pos'
import { LogIn, LogOut } from 'lucide-react'

interface ShiftCardProps {
  activeShift: POSShift | null
  userName: string
  onStartShiftClick: () => void
  onEndShiftClick: () => void
  isLoading: boolean
}

export const ShiftCard = ({
  activeShift,
  userName,
  onStartShiftClick,
  onEndShiftClick,
  isLoading,
}: ShiftCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manajemen Shift</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='flex justify-between items-center'>
          <div>
            <p className='font-semibold'>
              {activeShift ? `Kasir: ${userName}` : 'Tidak Ada Shift Aktif'}
            </p>
            <p className='text-sm text-muted-foreground'>
              {activeShift
                ? `Mulai: ${new Date(activeShift.startShift).toLocaleString(
                    'id-ID'
                  )}`
                : 'Mulai shift untuk transaksi.'}
            </p>
          </div>
          {activeShift ? (
            <Button
              variant='destructive'
              onClick={onEndShiftClick}
              disabled={isLoading}
            >
              <LogOut className='mr-2 h-4 w-4' />
              Akhiri Shift
            </Button>
          ) : (
            <Button onClick={onStartShiftClick} disabled={isLoading}>
              <LogIn className='mr-2 h-4 w-4' />
              Mulai Shift
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
