import React, { useCallback, useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Image from 'next/image'
import {
  Search,
  LayoutGrid,
  List,
  PackagePlus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  getInventoryItems,
  type InventoryCategory,
  type InventoryItem,
} from '@/lib/appwrite/inventory'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { useBranches } from '@/contexts/branch-context'
import { useDebounce } from '@uidotdev/usehooks'

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]
const LOCALSTORAGE_POS_VIEW_MODE_KEY = 'branchwise_posViewMode'

type ViewMode = 'card' | 'table'

interface ProductDisplayProps {
  activeShift: boolean

  onAddToCart: (product: InventoryItem) => void
}

export function ProductDisplay({
  activeShift,
  onAddToCart,
}: ProductDisplayProps) {
  const { userData, currentUser } = useAuth()
  const { selectedBranch, loadingBranches } = useBranches()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    ITEMS_PER_PAGE_OPTIONS[0]
  )
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  const [currentPage, setCurrentPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)

  const handleSetViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem(LOCALSTORAGE_POS_VIEW_MODE_KEY, mode)
  }, []) // Tidak ada dependensi karena setViewMode dijamin stabil

  const handleNextPage = () => {
    // Cek jika halaman saat ini belum mencapai halaman terakhir
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => prevPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => prevPage - 1)
    }
  }

  const fetchData = useCallback(
    async (page: number, currentSearchTerm: string) => {
      if (!selectedBranch) {
        setItems([])
        setLoadingItems(false)
        setTotalItems(0)
        return
      }
      setLoadingItems(true)

      const options = {
        limit: itemsPerPage,
        searchTerm: currentSearchTerm || undefined,
        page: page, // Kirim nomor halaman
      }

      // Panggil fungsi API yang baru
      const result = await getInventoryItems(selectedBranch.id, options)

      setItems(result.items)
      setTotalItems(result.total) // Simpan total item
      setLoadingItems(false)
    },
    [selectedBranch, itemsPerPage] // Dependensi lebih sederhana
  )
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedBranch, itemsPerPage, debouncedSearchTerm])

  useEffect(() => {
    // Jika tidak ada cabang yang dipilih, bersihkan state dan jangan lakukan apa-apa lagi.
    if (!selectedBranch) {
      setItems([])
      setLoadingItems(false)
      // Untuk mode cursor pagination, Anda akan menggunakan setHasNextPage(false)
      // Untuk mode offset pagination, Anda akan menggunakan setTotalItems(0)
      setHasNextPage(false) // Sesuaikan dengan mode paginasi Anda
      return // Hentikan eksekusi lebih lanjut
    }

    // Jika ada cabang, panggil fetchData.
    // Efek ini akan otomatis berjalan ketika `currentPage` berubah (dari efek reset di atas)
    // atau ketika `fetchData` itu sendiri berubah (jika dependensinya berubah).
    fetchData(currentPage, debouncedSearchTerm)
  }, [currentPage, debouncedSearchTerm, selectedBranch, fetchData]) // Sertakan semua dependensi relevan

  return (
    <div className='p-3 space-y-3 flex flex-col h-full'>
      {/* Search and View Controls */}
      <div className='flex justify-between items-center gap-2'>
        <div className='relative flex-grow'>
          <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
          <Input
            type='search'
            placeholder='Cari produk atau SKU...'
            className='pl-8 w-full rounded-md h-8 text-xs'
            disabled={!activeShift || loadingItems}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select
          value={itemsPerPage.toString()}
          onValueChange={(value) => onItemsPerPageChange(Number(value))}
        >
          <SelectTrigger className='h-8 text-xs rounded-md w-auto sm:w-[120px]'>
            <SelectValue placeholder='Tampil' />
          </SelectTrigger>
          <SelectContent>
            {ITEMS_PER_PAGE_OPTIONS.map((option) => (
              <SelectItem
                key={option}
                value={option.toString()}
                className='text-xs'
              >
                Tampil {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className='flex items-center gap-1.5'>
          <Button
            variant={viewMode === 'card' ? 'secondary' : 'outline'}
            size='sm'
            className='h-8 w-8 p-0'
            onClick={() => handleSetViewMode('card')}
            aria-label='Card View'
            disabled={!activeShift}
          >
            <LayoutGrid className='h-4 w-4' />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'outline'}
            size='sm'
            className='h-8 w-8 p-0'
            onClick={() => handleSetViewMode('table')}
            aria-label='Table View'
            disabled={!activeShift}
          >
            <List className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Product List Area */}
      <div
        className={cn(
          'flex-grow overflow-y-auto p-0.5 -m-0.5 relative min-h-0',
          viewMode === 'card'
            ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5'
            : ''
        )}
      >
        {loadingItems ? (
          <div
            className={cn(
              viewMode === 'card'
                ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5'
                : 'space-y-2'
            )}
          >
            {[...Array(itemsPerPage)].map((_, i) => (
              <Skeleton
                key={i}
                className={cn(
                  viewMode === 'card' ? 'h-48 w-full' : 'h-10 w-full'
                )}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className='text-center py-10 text-muted-foreground text-sm'>
            Produk tidak ditemukan atau belum ada produk.
          </div>
        ) : viewMode === 'card' ? (
          <ProductCardView
            items={items}
            currency={selectedBranch.currency}
            onAddToCart={onAddToCart}
            activeShift={activeShift}
          />
        ) : (
          <ProductTableView
            items={items}
            currency={selectedBranch.currency}
            onAddToCart={onAddToCart}
            activeShift={activeShift}
          />
        )}

        {!activeShift && (
          <div className='absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md z-10'>
            <p className='text-sm font-medium text-muted-foreground p-4 bg-card border rounded-lg shadow-md'>
              Mulai shift untuk mengaktifkan penjualan.
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className='flex justify-between items-center pt-2'>
        <Button
          variant='outline'
          size='sm'
          className='text-xs h-8'
          onClick={handlePrevPage}
          disabled={currentPage <= 1 || loadingItems}
        >
          <ChevronLeft className='mr-1 h-4 w-4' /> Sebelumnya
        </Button>
        <span className='text-xs text-muted-foreground'>
          Halaman {currentPage} dari {totalPages}
        </span>
        <Button
          variant='outline'
          size='sm'
          className='text-xs h-8'
          onClick={handleNextPage}
          disabled={currentPage >= totalPages || loadingItems}
        >
          Berikutnya <ChevronRight className='ml-1 h-4 w-4' />
        </Button>
      </div>
    </div>
  )
}

// Sub-component for Card View
function ProductCardView({
  items,
  currency,
  onAddToCart,
  activeShift,
}: {
  items: InventoryItem[]
  currency: string
  onAddToCart: (p: InventoryItem) => void
  activeShift: boolean
}) {
  return (
    <>
      {items.map((product) => (
        <Card
          key={product.id}
          className={cn(
            'h-64 overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-md cursor-pointer flex flex-col',
            product.quantity <= 0 && 'opacity-60 cursor-not-allowed'
          )}
          onClick={() => product.quantity > 0 && onAddToCart(product)}
        >
          <div className='relative w-full aspect-[4/3]'>
            <Image
              src={product.imageUrl || `https://placehold.co/150x100.png`}
              alt={product.name}
              layout='fill'
              objectFit='cover'
              className='rounded-t-md'
              onError={(e) =>
                (e.currentTarget.src = 'https://placehold.co/150x100.png')
              }
            />
          </div>
          <CardContent className='p-2 flex flex-col flex-grow'>
            <h3 className='font-semibold text-xs truncate leading-snug flex-grow'>
              {product.name}
            </h3>
            <p className='text-primary font-bold text-sm mt-0.5'>
              {currency}
              {product.price.toLocaleString('id-ID')}
            </p>
            <p className='text-xs text-muted-foreground mb-1'>
              Stok: {product.quantity}
            </p>
            <Button
              size='sm'
              className='w-full text-xs h-7 mt-auto'
              disabled={!activeShift || product.quantity <= 0}
              onClick={(e) => {
                e.stopPropagation()
                if (product.quantity > 0) onAddToCart(product)
              }}
            >
              <PackagePlus className='mr-1.5 h-3.5 w-3.5' /> Tambah
            </Button>
          </CardContent>
        </Card>
      ))}
    </>
  )
}

// Sub-component for Table View
function ProductTableView({
  items,
  currency,
  onAddToCart,
  activeShift,
}: {
  items: InventoryItem[]
  currency: string
  onAddToCart: (p: InventoryItem) => void
  activeShift: boolean
}) {
  return (
    <div className='border rounded-md overflow-hidden'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-[40px] p-1.5 hidden sm:table-cell'></TableHead>
            <TableHead className='p-1.5 text-xs'>Nama Produk</TableHead>
            <TableHead className='p-1.5 text-xs text-right'>Harga</TableHead>
            <TableHead className='p-1.5 text-xs text-center hidden md:table-cell'>
              Stok
            </TableHead>
            <TableHead className='p-1.5 text-xs text-center'>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((product) => (
            <TableRow
              key={product.id}
              className={cn(product.quantity <= 0 && 'opacity-60')}
            >
              <TableCell className='p-1 hidden sm:table-cell'>
                <Image
                  src={product.imageUrl || `https://placehold.co/28x28.png`}
                  alt={product.name}
                  width={28}
                  height={28}
                  className='rounded object-cover h-7 w-7'
                  onError={(e) =>
                    (e.currentTarget.src = 'https://placehold.co/28x28.png')
                  }
                />
              </TableCell>
              <TableCell className='p-1.5 text-xs font-medium'>
                {product.name}
              </TableCell>
              <TableCell className='p-1.5 text-xs text-right'>
                {currency}
                {product.price.toLocaleString('id-ID')}
              </TableCell>
              <TableCell className='p-1.5 text-xs text-center hidden md:table-cell'>
                {product.quantity}
              </TableCell>
              <TableCell className='p-1.5 text-xs text-center'>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-7 text-xs'
                  disabled={!activeShift || product.quantity <= 0}
                  onClick={() => product.quantity > 0 && onAddToCart(product)}
                >
                  <PackagePlus className='mr-1 h-3 w-3' /> Tambah
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
