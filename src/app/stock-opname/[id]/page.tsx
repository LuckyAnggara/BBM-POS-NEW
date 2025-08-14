'use client'
import React, { useEffect, useRef, useState } from 'react'
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
} from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import Link from 'next/link'

export default function StockOpnameDetailPage() {
  const params = useParams()
  const id = Number(params?.id)
  const router = useRouter()
  const [session, setSession] = useState<StockOpnameSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState(false)
  const [productQuery, setProductQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<{
    id: number
    name: string
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

  // naive debounce for product search
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!productQuery || productQuery.length < 2) {
        setProductResults([])
        return
      }
      setProductSearching(true)
      try {
        // assume existing endpoint /api/products?search= query (adjust if different)
        const res = await fetch(
          `/api/products?search=${encodeURIComponent(productQuery)}`
        )
        if (res.ok) {
          const data = await res.json()
          // normalize minimal shape
          const items = (data.data || data || [])
            .slice(0, 15)
            .map((p: any) => ({
              id: p.id,
              name: p.name || p.product_name || p.title || `#${p.id}`,
              sku: p.sku,
            }))
          setProductResults(items)
        } else {
          setProductResults([])
        }
      } catch {
        setProductResults([])
      }
      setProductSearching(false)
    }, 400)
    return () => clearTimeout(t)
  }, [productQuery])

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
      load()
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
        <div className='p-6'>
          <Loader2 className='h-6 w-6 animate-spin' />
        </div>
      </MainLayout>
    )
  if (!session)
    return (
      <MainLayout>
        <div className='p-6 text-sm'>Session tidak ditemukan.</div>
      </MainLayout>
    )

  const editable = session.status === 'DRAFT'

  return (
    <MainLayout>
      <div className='space-y-4'>
        <div className='flex items-center gap-3'>
          <Button asChild size='sm' variant='outline'>
            <Link href='/stock-opname'>
              <ArrowLeft className='h-4 w-4' />
            </Link>
          </Button>
          <h1 className='text-lg font-semibold'>Stock Opname {session.code}</h1>
          <span className='text-xs px-2 py-0.5 rounded bg-muted'>
            {session.status}
          </span>
          <div className='ml-auto flex gap-2'>
            <Button asChild size='sm' variant='outline'>
              <a href={exportCsvUrl(session.id)} target='_blank'>
                <Download className='h-4 w-4' />
              </a>
            </Button>
            {editable && (
              <Button
                size='sm'
                variant='default'
                onClick={() => setConfirmSubmit(true)}
              >
                <Send className='h-4 w-4 mr-1' />
                Submit
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className='py-3'>
            <CardTitle className='text-sm'>Catatan</CardTitle>
            <CardDescription className='text-xs'>
              Catatan internal untuk sesi ini.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-2'>
            <Textarea
              value={session.notes || ''}
              onChange={(e) =>
                setSession({ ...session, notes: e.target.value })
              }
              disabled={!editable}
              className='text-sm min-h-[80px]'
            />
            {editable && (
              <Button
                size='sm'
                className='h-8'
                disabled={saving}
                onClick={handleSaveNotes}
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='py-3 flex flex-row items-center justify-between'>
            <div>
              <CardTitle className='text-sm'>Items</CardTitle>
              <CardDescription className='text-xs'>
                Daftar produk dalam opname.
              </CardDescription>
            </div>
            {editable && (
              <div className='flex gap-2 items-end'>
                <Popover open={productOpen} onOpenChange={setProductOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      size='sm'
                      className='h-8 w-48 justify-start text-xs overflow-hidden'
                      onClick={() => setProductOpen(true)}
                    >
                      {selectedProduct
                        ? selectedProduct.name
                        : productQuery
                        ? productQuery
                        : 'Cari produk...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='p-0 w-64' align='start'>
                    <Command>
                      <CommandInput
                        placeholder='Cari produk...'
                        value={productQuery}
                        onValueChange={setProductQuery}
                      />
                      <CommandEmpty className='text-xs py-4'>
                        Tidak ada hasil
                      </CommandEmpty>
                      <CommandGroup className='max-h-60 overflow-auto'>
                        {productSearching && (
                          <div className='px-3 py-2 text-[11px] text-muted-foreground'>
                            Mencari...
                          </div>
                        )}
                        {productResults.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={String(p.id)}
                            onSelect={() => {
                              setSelectedProduct(p)
                              setProductOpen(false)
                            }}
                            className='text-xs'
                          >
                            <span className='truncate'>{p.name}</span>
                            {p.sku && (
                              <span className='ml-auto text-[10px] text-muted-foreground'>
                                {p.sku}
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Input
                  placeholder='Qty'
                  type='number'
                  value={counted}
                  onChange={(e) =>
                    setCounted(
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                  className='h-8 w-20 text-xs'
                />
                <Input
                  placeholder='Notes'
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className='h-8 w-40 text-xs'
                />
                <Button
                  size='sm'
                  className='h-8'
                  onClick={handleAdd}
                  disabled={adding}
                >
                  <Plus className='h-4 w-4' />
                </Button>
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
                  className='h-8'
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className='h-4 w-4 mr-1' />
                  CSV
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <table className='w-full text-xs'>
                <thead className='bg-muted/50'>
                  <tr className='text-left'>
                    <th className='px-3 py-2 font-medium'>Produk</th>
                    <th className='px-3 py-2 font-medium'>System</th>
                    <th className='px-3 py-2 font-medium'>Counted</th>
                    <th className='px-3 py-2 font-medium'>Diff</th>
                    <th className='px-3 py-2 font-medium'>Notes</th>
                    {editable && (
                      <th className='px-3 py-2 font-medium'>Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {session.items && session.items.length === 0 && (
                    <tr>
                      <td
                        colSpan={editable ? 6 : 5}
                        className='px-3 py-6 text-center text-muted-foreground'
                      >
                        Belum ada item
                      </td>
                    </tr>
                  )}
                  {session.items?.map((item) => (
                    <tr key={item.id} className='border-t hover:bg-muted/30'>
                      <td className='px-3 py-1.5'>{item.product_name}</td>
                      <td className='px-3 py-1.5'>{item.system_quantity}</td>
                      <td className='px-3 py-1.5'>{item.counted_quantity}</td>
                      <td className='px-3 py-1.5'>{item.difference}</td>
                      <td className='px-3 py-1.5'>{item.notes}</td>
                      {editable && (
                        <td className='px-3 py-1.5'>
                          <Button
                            size='icon'
                            variant='ghost'
                            className='h-7 w-7'
                            onClick={() => setConfirmDeleteItem(item)}
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
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
