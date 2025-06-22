import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { startShift, POSShift } from '@/lib/appwrite/pos'
import { useToast } from '@/hooks/use-toast'

const shiftFormSchema = z.object({
  startingBalance: z.coerce.number().min(0, 'Saldo awal tidak boleh negatif.'),
})
type ShiftFormValues = z.infer<typeof shiftFormSchema>

interface StartShiftDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onShiftStarted: (newShift: POSShift) => void
  userId: string
  userName: string
  branchId: string
}

export const StartShiftDialog = ({
  isOpen,
  onOpenChange,
  onShiftStarted,
  userId,
  userName,
  branchId,
}: StartShiftDialogProps) => {
  const { toast } = useToast()
  const form = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: { startingBalance: 0 },
  })

  const onSubmit = async (values: ShiftFormValues) => {
    const result = await startShift(branchId, userId, values.startingBalance)
    if ('error' in result) {
      toast({
        title: 'Gagal',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Sukses', description: 'Shift baru berhasil dimulai.' })
      onShiftStarted(result)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mulai Shift Baru</DialogTitle>
          <DialogDescription>
            Masukkan jumlah saldo awal (kas) Anda untuk memulai.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='startingBalance'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Saldo Awal (Rp)</FormLabel>
                  <FormControl>
                    <Input type='number' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type='submit'>Mulai Shift</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
