import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { POSShift } from '@/lib/appwrite/pos'
import { LogIn, LogOut } from 'lucide-react'

interface POSHeaderProps {
  activeShift: POSShift | null
  userName: string
  onStartShiftClick: () => void
  onEndShiftClick: () => void
}

export const POSHeader = ({
  activeShift,
  userName,
  onStartShiftClick,
  onEndShiftClick,
}: POSHeaderProps) => {
  return (
    <Card>
      <CardContent className='p-4 flex justify-between items-center'>
        <div>
          <p className='font-semibold text-lg'>
            {activeShift ? `Shift Aktif: ${userName}` : 'Tidak Ada Shift Aktif'}
          </p>
          <p className='text-sm text-muted-foreground'>
            {activeShift
              ? `Dimulai pada: ${new Date(
                  activeShift.startShift
                ).toLocaleTimeString('id-ID')}`
              : 'Silakan mulai shift untuk memulai transaksi.'}
          </p>
        </div>
        <div>
          {activeShift ? (
            <Button variant='destructive' onClick={onEndShiftClick}>
              <LogOut className='mr-2 h-4 w-4' />
              Akhiri Shift
            </Button>
          ) : (
            <Button onClick={onStartShiftClick}>
              <LogIn className='mr-2 h-4 w-4' />
              Mulai Shift
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
