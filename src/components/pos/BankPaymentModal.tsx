import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import type { BankAccount } from '@/lib/types'

interface BankPaymentModalProps {
  show: boolean
  onClose: () => void
  total: number
  availableBankAccounts: BankAccount[]
  selectedBankAccountId: string
  setSelectedBankAccountId: (id: string) => void
  bankRefNumberInput: string
  setBankRefNumberInput: (ref: string) => void
  handleConfirmBankPayment: () => void
  isProcessingSale: boolean
  currencySymbol: string
}

export default function BankPaymentModal({
  show,
  onClose,
  total,
  availableBankAccounts,
  selectedBankAccountId,
  setSelectedBankAccountId,
  bankRefNumberInput,
  setBankRefNumberInput,
  handleConfirmBankPayment,
  isProcessingSale,
  currencySymbol,
}: BankPaymentModalProps) {
  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pembayaran Bank/Transfer</DialogTitle>
          <DialogDescription>
            Total Belanja: {formatCurrency(total, currencySymbol)}
          </DialogDescription>
        </DialogHeader>
        <div className='py-4 space-y-4'>
          <div>
            <Label htmlFor='bank-account'>Pilih Rekening Bank</Label>
            <Select
              value={selectedBankAccountId}
              onValueChange={setSelectedBankAccountId}
            >
              <SelectTrigger id='bank-account'>
                <SelectValue placeholder='Pilih bank...' />
              </SelectTrigger>
              <SelectContent>
                {availableBankAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={String(acc.id)}>
                    {acc.bank_name} - {acc.account_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor='ref-number'>Nomor Referensi</Label>
            <Input
              id='ref-number'
              value={bankRefNumberInput}
              onChange={(e) => setBankRefNumberInput(e.target.value)}
              placeholder='Masukkan nomor referensi transfer'
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={onClose}
            disabled={isProcessingSale}
          >
            Batal
          </Button>
          <Button
            onClick={handleConfirmBankPayment}
            disabled={
              isProcessingSale || !selectedBankAccountId || !bankRefNumberInput
            }
          >
            {isProcessingSale ? 'Memproses...' : 'Konfirmasi Pembayaran'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
