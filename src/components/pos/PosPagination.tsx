import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PosPaginationProps {
  currentPage: number
  totalPages: number
  setCurrentPage: (page: number) => void
  itemsPerPage: number
  setItemsPerPage: (limit: number) => void
  totalItems: number
}

const ITEMS_PER_PAGE_OPTIONS = [12, 24, 36, 48]

export default function PosPagination({
  currentPage,
  totalPages,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage,
  totalItems,
}: PosPaginationProps) {
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div className='flex items-center justify-between p-2 bg-card rounded-lg shadow mt-2'>
      <div className='text-sm text-muted-foreground'>
        Menampilkan {startItem}-{endItem} dari {totalItems} produk
      </div>
      <div className='flex items-center gap-4'>
        <div className='flex items-center gap-2'>
          <span className='text-sm'>Item per halaman:</span>
          <Select
            value={String(itemsPerPage)}
            onValueChange={(value) => setItemsPerPage(Number(value))}
          >
            <SelectTrigger className='w-20'>
              <SelectValue placeholder={itemsPerPage} />
            </SelectTrigger>
            <SelectContent>
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='icon'
            onClick={handlePrevPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <span className='text-sm font-medium'>
            Halaman {currentPage} dari {totalPages}
          </span>
          <Button
            variant='outline'
            size='icon'
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  )
}
