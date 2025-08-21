'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/auth-context'
import { useBranches } from '@/contexts/branch-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  CalendarIcon,
  Plus,
  Trash2,
  Search,
  Check,
  ChevronsUpDown,
  Save,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { toast } from 'sonner'
import Link from 'next/link'

// Import types and services
import type {
  CreateInvoicePayload,
  InvoiceItemInput,
  Customer,
  Product,
  User,
} from '@/lib/types'
import {
  createInvoice,
  generateInvoiceNumber,
} from '@/lib/laravel/invoiceService'
import { listCustomers } from '@/lib/laravel/customers'
import { listProducts } from '@/lib/laravel/product'
import { listUsers } from '@/lib/laravel/users'

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

interface InvoiceItemRow extends InvoiceItemInput {
  id: string // Temporary ID for form management
  product_name?: string
  product?: Product
}

export default function NewInvoicePage() {
  const router = useRouter()
  const { currentUser } = useAuth()
  const { selectedBranch } = useBranches()

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [customerId, setCustomerId] = useState<number | undefined>()
  const [salesAgentId, setSalesAgentId] = useState<number | undefined>()
  const [dueDate, setDueDate] = useState<Date>()
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<InvoiceItemRow[]>([])
  const [shippingCost, setShippingCost] = useState(0)
  const [taxRate, setTaxRate] = useState(11) // Default 11% PPN

  // Data state
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [salesAgents, setSalesAgents] = useState<User[]>([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [openCustomerCombobox, setOpenCustomerCombobox] = useState(false)
  const [openSalesCombobox, setOpenSalesCombobox] = useState(false)
  const [openProductCombobox, setOpenProductCombobox] = useState<string | null>(null)
  const [searchCustomer, setSearchCustomer] = useState('')
  const [searchSales, setSearchSales] = useState('')
  const [searchProduct, setSearchProduct] = useState('')

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!selectedBranch) return

      setLoadingData(true)
      try {
        const [customersData, productsData, salesAgentsData, newInvoiceNumber] = 
          await Promise.all([
            listCustomers({ branchId: selectedBranch.id }),
            listProducts({ branchId: selectedBranch.id }),
            listUsers({ branch_id: selectedBranch.id }),
            generateInvoiceNumber(selectedBranch.id),
          ])

        setCustomers(customersData.data || customersData)
        setProducts(productsData.data || productsData)
        setSalesAgents(salesAgentsData) // listUsers returns User[] directly
        setInvoiceNumber(newInvoiceNumber)

        // Add initial empty item
        addItem()
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Gagal memuat data')
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
  }, [selectedBranch])

  // Item management
  const addItem = () => {
    const newItem: InvoiceItemRow = {
      id: `item-${Date.now()}-${Math.random()}`,
      product_id: 0,
      quantity: 1,
      price: 0,
    }
    setItems([...items, newItem])
  }

  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId))
  }

  const updateItem = (itemId: string, field: keyof InvoiceItemRow, value: any) => {
    setItems(items.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    ))
  }

  const selectProduct = (itemId: string, product: Product) => {
    updateItem(itemId, 'product_id', product.id)
    updateItem(itemId, 'product_name', product.name)
    updateItem(itemId, 'price', product.price)
    updateItem(itemId, 'product', product)
  }

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
  const taxAmount = (subtotal * taxRate) / 100
  const totalAmount = subtotal + taxAmount + shippingCost

  // Form validation
  const isFormValid = () => {
    return (
      invoiceNumber &&
      customerId &&
      dueDate &&
      items.length > 0 &&
      items.every(item => item.product_id > 0 && item.quantity > 0 && item.price > 0)
    )
  }

  // Form submission
  const handleSubmit = async () => {
    if (!selectedBranch) {
      toast.error('Cabang belum dipilih')
      return
    }

    if (!isFormValid()) {
      toast.error('Harap lengkapi semua field yang diperlukan')
      return
    }

    setLoading(true)
    try {
      const payload: CreateInvoicePayload = {
        customer_id: customerId!,
        sales_agent_id: salesAgentId,
        due_date: format(dueDate!, 'yyyy-MM-dd'),
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        })),
        notes: notes || undefined,
        shipping_cost: shippingCost > 0 ? shippingCost : undefined,
        tax_amount: taxAmount,
      }

      const result = await createInvoice(payload)
      toast.success('Invoice berhasil dibuat')
      router.push(`/invoicing`)
    } catch (error) {
      console.error('Error creating invoice:', error)
      toast.error('Gagal membuat invoice')
    } finally {
      setLoading(false)
    }
  }

  const selectedCustomer = customers.find(c => c.id === customerId)
  const selectedSalesAgent = salesAgents.find(s => s.id === salesAgentId)

  if (loadingData) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Memuat data...</p>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/invoicing">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Kembali
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Buat Invoice Baru</h1>
                <p className="text-muted-foreground">
                  Buat invoice untuk transaksi kredit
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => router.push('/invoicing')}>
                Batal
              </Button>
              <Button onClick={handleSubmit} disabled={!isFormValid() || loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Simpan Invoice
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Informasi Invoice
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="invoice_number">Nomor Invoice</Label>
                      <Input
                        id="invoice_number"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="Auto-generated"
                      />
                    </div>
                    <div>
                      <Label htmlFor="due_date">Tanggal Jatuh Tempo</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dueDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dueDate ? format(dueDate, "dd MMM yyyy", { locale: id }) : "Pilih tanggal"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={dueDate}
                            onSelect={setDueDate}
                            initialFocus
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customer">Customer *</Label>
                      <Popover open={openCustomerCombobox} onOpenChange={setOpenCustomerCombobox}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCustomerCombobox}
                            className="w-full justify-between"
                          >
                            {selectedCustomer ? selectedCustomer.name : "Pilih customer..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput
                              placeholder="Cari customer..."
                              value={searchCustomer}
                              onValueChange={setSearchCustomer}
                            />
                            <CommandEmpty>Customer tidak ditemukan.</CommandEmpty>
                            <CommandList>
                              <CommandGroup>
                                {customers
                                  .filter(customer =>
                                    customer.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
                                    customer.email?.toLowerCase().includes(searchCustomer.toLowerCase())
                                  )
                                  .map((customer) => (
                                    <CommandItem
                                      key={customer.id}
                                      value={customer.name}
                                      onSelect={() => {
                                        setCustomerId(customer.id)
                                        setOpenCustomerCombobox(false)
                                        setSearchCustomer('')
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          customerId === customer.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div>
                                        <div className="font-medium">{customer.name}</div>
                                        {customer.email && (
                                          <div className="text-sm text-muted-foreground">{customer.email}</div>
                                        )}
                                      </div>
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label htmlFor="sales_agent">Sales Agent (Opsional)</Label>
                      <Popover open={openSalesCombobox} onOpenChange={setOpenSalesCombobox}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openSalesCombobox}
                            className="w-full justify-between"
                          >
                            {selectedSalesAgent ? selectedSalesAgent.name : "Pilih sales agent..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput
                              placeholder="Cari sales agent..."
                              value={searchSales}
                              onValueChange={setSearchSales}
                            />
                            <CommandEmpty>Sales agent tidak ditemukan.</CommandEmpty>
                            <CommandList>
                              <CommandGroup>
                                {salesAgents
                                  .filter(agent =>
                                    agent.name.toLowerCase().includes(searchSales.toLowerCase()) ||
                                    agent.email.toLowerCase().includes(searchSales.toLowerCase())
                                  )
                                  .map((agent) => (
                                    <CommandItem
                                      key={agent.id}
                                      value={agent.name}
                                      onSelect={() => {
                                        setSalesAgentId(agent.id)
                                        setOpenSalesCombobox(false)
                                        setSearchSales('')
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          salesAgentId === agent.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div>
                                        <div className="font-medium">{agent.name}</div>
                                        <div className="text-sm text-muted-foreground">{agent.email}</div>
                                      </div>
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Catatan</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Catatan tambahan untuk invoice ini..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Items */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Item Invoice</CardTitle>
                    <Button onClick={addItem} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produk</TableHead>
                        <TableHead className="w-24">Qty</TableHead>
                        <TableHead className="w-32">Harga</TableHead>
                        <TableHead className="w-32">Total</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const product = products.find(p => p.id === item.product_id)
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Popover 
                                open={openProductCombobox === item.id} 
                                onOpenChange={(open) => setOpenProductCombobox(open ? item.id : null)}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between"
                                  >
                                    {product ? product.name : "Pilih produk..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0">
                                  <Command>
                                    <CommandInput
                                      placeholder="Cari produk..."
                                      value={searchProduct}
                                      onValueChange={setSearchProduct}
                                    />
                                    <CommandEmpty>Produk tidak ditemukan.</CommandEmpty>
                                    <CommandList>
                                      <CommandGroup>
                                        {products
                                          .filter(product =>
                                            product.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
                                            product.sku?.toLowerCase().includes(searchProduct.toLowerCase())
                                          )
                                          .map((product) => (
                                            <CommandItem
                                              key={product.id}
                                              value={product.name}
                                              onSelect={() => {
                                                selectProduct(item.id, product)
                                                setOpenProductCombobox(null)
                                                setSearchProduct('')
                                              }}
                                            >
                                              <div>
                                                <div className="font-medium">{product.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                  {product.sku} • {formatCurrency(product.price)}
                                                </div>
                                              </div>
                                            </CommandItem>
                                          ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-full"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                value={item.price}
                                onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                className="w-full"
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(item.quantity * item.price)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.id)}
                                disabled={items.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ringkasan Invoice</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="shipping_cost">Biaya Pengiriman:</Label>
                      <Input
                        id="shipping_cost"
                        type="number"
                        min="0"
                        value={shippingCost}
                        onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tax_rate">Pajak (%):</Label>
                      <Input
                        id="tax_rate"
                        type="number"
                        min="0"
                        max="100"
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="flex justify-between">
                      <span>Pajak ({taxRate}%):</span>
                      <span>{formatCurrency(taxAmount)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Biaya Pengiriman:</span>
                      <span>{formatCurrency(shippingCost)}</span>
                    </div>

                    <div className="border-t pt-2">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>{formatCurrency(totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Info */}
              {selectedCustomer && (
                <Card>
                  <CardHeader>
                    <CardTitle>Informasi Customer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Nama: </span>
                        {selectedCustomer.name}
                      </div>
                      {selectedCustomer.email && (
                        <div>
                          <span className="font-medium">Email: </span>
                          {selectedCustomer.email}
                        </div>
                      )}
                      {selectedCustomer.phone && (
                        <div>
                          <span className="font-medium">Telepon: </span>
                          {selectedCustomer.phone}
                        </div>
                      )}
                      {selectedCustomer.address && (
                        <div>
                          <span className="font-medium">Alamat: </span>
                          {selectedCustomer.address}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}