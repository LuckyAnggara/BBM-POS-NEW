'use client'
import React, { useEffect, useRef, useState, useCallback } from 'react'
import MainLayout from '@/components/layout/main-layout'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  addItem,
  getStockOpname,
  updateStockOpname,
  submitStockOpname,
  removeItem,
  importCsv,
  exportCsvUrl,
} from '@/lib/laravel/stockOpname'
import { StockOpnameItem, StockOpnameSession } from '@/lib/types'
import { listProducts } from '@/lib/laravel/product'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Send,
  Download,
  Search,
  Package,
  FileText,
  Info,
  Save,
  Hash,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useDebounce } from '@uidotdev/usehooks'
import { useBranches } from '@/contexts/branch-context'
import Link from 'next/link'

export default function StockOpnameDetailPage() {
  const params = useParams()
  const id = Number(params?.id)
  const router = useRouter()
  const { selectedBranch } = useBranches()

  const [session, setSession] = useState<StockOpnameSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState(false)
  const [productQuery, setProductQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<{
    id: number
    name: string
    sku?: string
  } | null>(null)
  const [productResults, setProductResults] = useState<
    { id: number; name: string; sku?: string }[]
  >([])
  const [productOpen, setProductOpen] = useState(false)
  const [productSearching, setProductSearching] = useState(false)
  const [counted, setCounted] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [confirmDeleteItem, setConfirmDeleteItem] =
    useState<null | StockOpnameItem>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Use proper debouncing like inventory module
  const debouncedProductQuery = useDebounce(productQuery, 1000)

  const load = async () => {
    setLoading(true)
    try {
      setSession(await getStockOpname(id))
    } catch (e: any) {
      toast.error('Gagal memuat', { description: e.message })
    }
    setLoading(false)
  }
  useEffect(() => {
    if (id) load()
  }, [id])

  // Product search with proper debouncing like inventory module
  const searchProducts = useCallback(
    async (searchTerm: string) => {
      if (!selectedBranch || !searchTerm || searchTerm.length < 2) {
        setProductResults([])
        setProductSearching(false)
        return
      }

      setProductSearching(true)
      try {
        const result = await listProducts({
          branchId: selectedBranch.id,
          searchTerm: searchTerm,
          limit: 15,
          page: 1,
        })

        // Map to the expected format
        const products = result.data.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku || undefined,
        }))

        setProductResults(products)
      } catch (error) {
        console.error('Product search error:', error)
        setProductResults([])
      }
      setProductSearching(false)
    },
    [selectedBranch]
  )

  useEffect(() => {
    searchProducts(debouncedProductQuery)
  }, [debouncedProductQuery, searchProducts])

  // Reset search when closing popover
  useEffect(() => {
    if (!productOpen) {
      setProductQuery('')
      setProductResults([])
    }
  }, [productOpen])

  const handleAdd = async () => {
    if (!selectedProduct || counted === '') return
    setAdding(true)
    try {
      await addItem(id, {
        product_id: selectedProduct.id,
        counted_quantity: Number(counted),
        notes,
      })
      setSelectedProduct(null)
      setProductQuery('')
      setCounted('')
      setNotes('')
    } catch (e: any) {
      toast.error('Gagal tambah item', { description: e.message })
    }
    setAdding(false)
  }

  const handleSaveNotes = async () => {
    if (!session) return
    setSaving(true)
    try {
      await updateStockOpname(session.id, { notes: session.notes || '' })
      toast.success('Disimpan')
    } catch (e: any) {
      toast.error('Gagal simpan', { description: e.message })
    }
    setSaving(false)
  }

  const doSubmit = async () => {
    if (!session) return
    setActionLoading(true)
    try {
      await submitStockOpname(session.id)
      toast.success('Dikirim')
      router.push('/stock-opname')
    } catch (e: any) {
      toast.error('Gagal submit', { description: e.message })
    }
    setActionLoading(false)
    setConfirmSubmit(false)
  }

  const doDeleteItem = async () => {
    if (!session || !confirmDeleteItem) return
    setActionLoading(true)
    try {
      await removeItem(session.id, confirmDeleteItem.id)
      load()
    } catch (e: any) {
      toast.error('Gagal hapus item', { description: e.message })
    }
    setActionLoading(false)
    setConfirmDeleteItem(null)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!session) return
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await importCsv(session.id, file)
      toast.success('Import selesai')
      load()
    } catch (e: any) {
      toast.error('Gagal import', { description: e.message })
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (loading)
    return (
      <MainLayout>
        <div className='flex items-center justify-center py-12'>
          <div className='flex items-center gap-3 text-muted-foreground'>
            <Loader2 className='h-5 w-5 animate-spin' />
            <span className='text-sm'>Memuat data stock opname...</span>
          </div>
        </div>
      </MainLayout>
    )

  if (!session)
    return (
      <MainLayout>
        <div className='flex items-center justify-center py-12'>
          <div className='text-center'>
            <AlertCircle className='h-12 w-12 text-muted-foreground mx-auto mb-3' />
            <p className='text-sm text-muted-foreground'>
              Session tidak ditemukan.
            </p>
          </div>
        </div>
      </MainLayout>
    )

  const editable = session.status === 'DRAFT'
  const statusColor =
    session.status === 'DRAFT'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : session.status === 'SUBMIT'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-green-100 text-green-800 border-green-200'

  return (
    <MainLayout>
      <div className='space-y-6'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row items-start sm:items-center gap-4'>
          <div className='flex items-center gap-3'>
            <Button asChild size='sm' variant='outline' className='h-9'>
              <Link href='/stock-opname'>
                <ArrowLeft className='h-4 w-4' />
              </Link>
            </Button>
            <div>
              <div className='flex items-center gap-3'>
                <h1 className='text-xl font-semibold'>Stock Opname</h1>
                <Badge variant='outline' className={`text-xs ${statusColor}`}>
                  {session.status}
                </Badge>
              </div>
              <p className='text-sm text-muted-foreground mt-1'>
                <Hash className='h-3 w-3 inline mr-1' />
                {session.code}
              </p>
            </div>
          </div>

          <div className='flex gap-2 ml-auto'>
            <Button asChild size='sm' variant='outline' className='h-9'>
              <a href={exportCsvUrl(session.id)} target='_blank'>
                <Download className='h-4 w-4 mr-2' />
                Export
              </a>
            </Button>
            {editable && (
              <Button
                size='sm'
                className='h-9'
                onClick={() => setConfirmSubmit(true)}
                disabled={!session.items || session.items.length === 0}
              >
                <Send className='h-4 w-4 mr-2' />
                Submit
              </Button>
            )}
          </div>
        </div>

        {/* Status Info Alert */}
        <Alert
          variant='default'
          className='bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700/50 dark:text-blue-300'
        >
          <Info className='h-4 w-4 !text-blue-600 dark:!text-blue-400' />
          <AlertDescription className='text-xs'>
            {editable
              ? 'Session dalam status DRAFT. Anda dapat menambah, mengedit, atau menghapus item.'
              : `Session dalam status ${session.status}. Data tidak dapat diubah.`}
          </AlertDescription>
        </Alert>

        {/* Notes Section */}
        <Card>
          <CardHeader className='py-4'>
            <div className='flex items-center gap-2'>
              <FileText className='h-4 w-4 text-muted-foreground' />
              <CardTitle className='text-base'>Catatan</CardTitle>
            </div>
            <CardDescription className='text-xs'>
              Catatan internal untuk sesi stock opname ini.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <Textarea
              value={session.notes || ''}
              onChange={(e) =>
                setSession({ ...session, notes: e.target.value })
              }
              disabled={!editable}
              placeholder='Tambahkan catatan untuk sesi ini...'
              className='text-sm min-h-[80px] resize-none'
            />
            {editable && (
              <Button
                size='sm'
                variant='outline'
                className='h-8'
                disabled={saving}
                onClick={handleSaveNotes}
              >
                <Save className='h-3 w-3 mr-2' />
                {saving ? 'Menyimpan...' : 'Simpan Catatan'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Items Section */}
        <Card>
          <CardHeader className='py-4'>
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
              <div className='flex items-center gap-2'>
                <Package className='h-4 w-4 text-muted-foreground' />
                <div>
                  <CardTitle className='text-base'>Item Stock Opname</CardTitle>
                  <CardDescription className='text-xs'>
                    {session.items?.length || 0} item dalam daftar stock opname
                  </CardDescription>
                </div>
              </div>

              {editable && (
                <div className='flex flex-wrap gap-2 items-end'>
                  {/* Product Search */}
                  <div className='flex items-center gap-2'>
                    <Popover open={productOpen} onOpenChange={setProductOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-9 w-64 justify-start text-xs'
                          onClick={() => setProductOpen(true)}
                        >
                          <Search className='h-3 w-3 mr-2 text-muted-foreground' />
                          {selectedProduct
                            ? selectedProduct.name
                            : productQuery
                            ? productQuery
                            : 'Cari produk...'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className='p-0 w-80' align='start'>
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder='Ketik nama atau SKU produk...'
                            value={productQuery}
                            onValueChange={setProductQuery}
                            className='text-xs'
                          />
                          <CommandEmpty className='text-xs py-6 text-center text-muted-foreground'>
                            <Package className='h-8 w-8 mx-auto mb-2 text-muted-foreground/50' />
                            {debouncedProductQuery.length < 2
                              ? 'Ketik minimal 2 karakter untuk mencari produk'
                              : productSearching
                              ? 'Mencari produk...'
                              : 'Tidak ada produk yang ditemukan'}
                          </CommandEmpty>
                          <CommandGroup className='max-h-60 overflow-auto'>
                            {productSearching &&
                              debouncedProductQuery.length >= 2 && (
                                <div className='flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground'>
                                  <Loader2 className='h-3 w-3 animate-spin' />
                                  Mencari produk...
                                </div>
                              )}
                            {productResults.map((p) => (
                              <CommandItem
                                key={p.id}
                                value={`${p.id}-${p.name}`}
                                onSelect={() => {
                                  setSelectedProduct(p)
                                  setProductOpen(false)
                                }}
                                className='text-xs flex items-center justify-between'
                              >
                                <div className='truncate'>
                                  <span className='font-medium'>{p.name}</span>
                                  {p.sku && (
                                    <span className='block text-[10px] text-muted-foreground'>
                                      SKU: {p.sku}
                                    </span>
                                  )}
                                </div>
                                <Package className='h-3 w-3 text-muted-foreground/50' />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* Quantity Input */}
                    <Input
                      placeholder='Qty'
                      type='number'
                      value={counted}
                      onChange={(e) =>
                        setCounted(
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                      className='h-9 w-20 text-xs'
                      min={0}
                    />

                    {/* Notes Input */}
                    <Input
                      placeholder='Catatan'
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className='h-9 w-32 text-xs'
                    />

                    {/* Add Button */}
                    <Button
                      size='sm'
                      className='h-9'
                      onClick={handleAdd}
                      disabled={adding || !selectedProduct || counted === ''}
                    >
                      {adding ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <Plus className='h-4 w-4' />
                      )}
                    </Button>
                  </div>

                  {/* Import CSV */}
                  <div className='flex gap-2'>
                    <input
                      ref={fileInputRef}
                      type='file'
                      accept='.csv'
                      onChange={handleImport}
                      className='hidden'
                    />
                    <Button
                      size='sm'
                      variant='outline'
                      className='h-9'
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className='h-4 w-4 mr-2' />
                      Import CSV
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className='p-0'>
            {session.items && session.items.length === 0 ? (
              <div className='py-12 text-center'>
                <Package className='h-12 w-12 text-muted-foreground/50 mx-auto mb-3' />
                <p className='text-sm text-muted-foreground mb-1'>
                  Belum ada item
                </p>
                <p className='text-xs text-muted-foreground'>
                  {editable
                    ? 'Gunakan pencarian di atas untuk menambah produk'
                    : 'Tidak ada item dalam stock opname ini'}
                </p>
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead className='bg-muted/50 border-b'>
                    <tr className='text-left'>
                      <th className='px-4 py-3 font-medium text-xs text-muted-foreground'>
                        <div className='flex items-center gap-1'>
                          <Package className='h-3 w-3' />
                          Produk
                        </div>
                      </th>
                      <th className='px-4 py-3 font-medium text-xs text-muted-foreground text-right'>
                        <div className='flex items-center gap-1 justify-end'>
                          <Hash className='h-3 w-3' />
                          Sistem
                        </div>
                      </th>
                      <th className='px-4 py-3 font-medium text-xs text-muted-foreground text-right'>
                        <div className='flex items-center gap-1 justify-end'>
                          <CheckCircle className='h-3 w-3' />
                          Counted
                        </div>
                      </th>
                      <th className='px-4 py-3 font-medium text-xs text-muted-foreground text-right'>
                        <div className='flex items-center gap-1 justify-end'>
                          <TrendingUp className='h-3 w-3' />
                          Selisih
                        </div>
                      </th>
                      <th className='px-4 py-3 font-medium text-xs text-muted-foreground'>
                        <div className='flex items-center gap-1'>
                          <FileText className='h-3 w-3' />
                          Catatan
                        </div>
                      </th>
                      {editable && (
                        <th className='px-4 py-3 font-medium text-xs text-muted-foreground text-center'>
                          Aksi
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {session.items?.map((item, index) => {
                      const difference =
                        item.counted_quantity - item.system_quantity
                      const diffColor =
                        difference > 0
                          ? 'text-green-600'
                          : difference < 0
                          ? 'text-red-600'
                          : 'text-muted-foreground'
                      const diffIcon =
                        difference > 0 ? (
                          <TrendingUp className='h-3 w-3' />
                        ) : difference < 0 ? (
                          <TrendingDown className='h-3 w-3' />
                        ) : (
                          <Minus className='h-3 w-3' />
                        )

                      return (
                        <tr
                          key={item.id}
                          className={`border-b hover:bg-muted/30 ${
                            index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                          }`}
                        >
                          <td className='px-4 py-3'>
                            <div className='flex items-center gap-2'>
                              <Package className='h-4 w-4 text-muted-foreground/50' />
                              <div>
                                <p className='text-sm font-medium'>
                                  {item.product_name}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className='px-4 py-3 text-right'>
                            <span className='text-sm font-mono'>
                              {item.system_quantity}
                            </span>
                          </td>
                          <td className='px-4 py-3 text-right'>
                            <span className='text-sm font-mono font-medium'>
                              {item.counted_quantity}
                            </span>
                          </td>
                          <td className='px-4 py-3 text-right'>
                            <div
                              className={`flex items-center gap-1 justify-end ${diffColor}`}
                            >
                              {diffIcon}
                              <span className='text-sm font-mono font-medium'>
                                {difference > 0 ? '+' : ''}
                                {difference}
                              </span>
                            </div>
                          </td>
                          <td className='px-4 py-3'>
                            <span className='text-xs text-muted-foreground'>
                              {item.notes || '-'}
                            </span>
                          </td>
                          {editable && (
                            <td className='px-4 py-3 text-center'>
                              <Button
                                size='icon'
                                variant='ghost'
                                className='h-8 w-8 text-muted-foreground hover:text-destructive'
                                onClick={() => setConfirmDeleteItem(item)}
                              >
                                <Trash2 className='h-4 w-4' />
                              </Button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        title='Kirim Opname?'
        description='Setelah dikirim status menjadi SUBMIT dan tidak bisa diedit.'
        confirmText='Kirim'
        loading={actionLoading}
        onConfirm={doSubmit}
      />
      <ConfirmDialog
        open={!!confirmDeleteItem}
        onOpenChange={(v) => !v && setConfirmDeleteItem(null)}
        title='Hapus Item?'
        description={`Item akan dihapus dari sesi (${
          confirmDeleteItem?.product_name || ''
        }).`}
        confirmText='Hapus'
        variant='destructive'
        loading={actionLoading}
        onConfirm={doDeleteItem}
      />
    </MainLayout>
  )
}
