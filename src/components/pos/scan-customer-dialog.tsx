import { useState, useEffect } from 'react'
import { useBranch } from '@/contexts/branch-context'
import { useDebounce } from '@uidotdev/usehooks'
import { getCustomers, Customer } from '@/lib/appwrite/customers'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'

interface ScanCustomerDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onCustomerSelect: (customer: Customer) => void
}

export const ScanCustomerDialog = ({
  isOpen,
  onOpenChange,
  onCustomerSelect,
}: ScanCustomerDialogProps) => {
  const { branch } = useBranch()
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const fetch = async () => {
      if (!branch?.id) return
      setIsLoading(true)
      const result = await getCustomers(branch.id, {
        searchTerm: debouncedSearch,
        limit: 10,
      })
      setCustomers(result.customers)
      setIsLoading(false)
    }
    fetch()
  }, [debouncedSearch, isOpen, branch?.id])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Pilih Pelanggan</DialogTitle>
          <DialogDescription>
            Cari pelanggan berdasarkan nama atau nomor telepon.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4'>
          <Input
            placeholder='Ketik untuk mencari...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <ScrollArea className='h-64'>
            <div className='space-y-2 pr-4'>
              {isLoading
                ? [...Array(3)].map((_, i) => (
                    <Skeleton key={i} className='h-12 w-full' />
                  ))
                : customers.map((c) => (
                    <div
                      key={c.id}
                      className='border p-2 rounded-md flex justify-between items-center cursor-pointer hover:bg-muted'
                      onClick={() => onCustomerSelect(c)}
                    >
                      <div>
                        <p className='font-semibold'>{c.name}</p>
                        <p className='text-sm text-muted-foreground'>
                          {c.phone}
                        </p>
                      </div>
                    </div>
                  ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
