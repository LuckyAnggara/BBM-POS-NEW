import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface PrintInvoiceDialogProps {
  show: boolean
  onClose: () => void
  onConfirm: () => void
  isPrinting: boolean
}

export default function PrintInvoiceDialog({
  show,
  onClose,
  onConfirm,
  isPrinting,
}: PrintInvoiceDialogProps) {
  return (
    <AlertDialog open={show} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cetak Struk?</AlertDialogTitle>
          <AlertDialogDescription>
            Transaksi berhasil disimpan. Apakah Anda ingin mencetak struk untuk
            transaksi ini?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isPrinting}>
            Tidak
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPrinting}>
            {isPrinting ? 'Mencetak...' : 'Ya, Cetak Struk'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
