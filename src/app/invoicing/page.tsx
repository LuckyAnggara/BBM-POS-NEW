'use client'

import React, { useState, useEffect, useCallback } from 'react'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/auth-context'
import { useBranches } from '@/contexts/branch-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PlusCircle,
  Search,
  Eye,
  FileText,
  Download,
  Edit,
  Calendar,
  DollarSign,
  Users,
  Package,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { toast } from 'sonner'

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Invoice types
export type InvoiceStatus = 'draft' | 'unpaid' | 'partial' | 'paid' | 'overdue'

export interface Invoice {
  id: number
  invoice_number: string
  customer_id: number
  customer_name: string
  sales_agent_id?: number
  sales_agent_name?: string
  subtotal: number
  tax_amount: number
  total_amount: number
  amount_paid: number
  outstanding_amount: number
  status: InvoiceStatus
  due_date: string
  created_at: string
  updated_at: string
  items?: InvoiceItem[]
}

export interface InvoiceItem {
  id: number
  invoice_id: number
  product_id: number
  product_name: string
  quantity: number
  price: number
  total: number
}

const getStatusColor = (status: InvoiceStatus) => {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800'
    case 'unpaid':
      return 'bg-yellow-100 text-yellow-800'
    case 'partial':
      return 'bg-blue-100 text-blue-800'
    case 'paid':
      return 'bg-green-100 text-green-800'
    case 'overdue':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getStatusLabel = (status: InvoiceStatus) => {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'unpaid':
      return 'Belum Dibayar'
    case 'partial':
      return 'Dibayar Sebagian'
    case 'paid':
      return 'Lunas'
    case 'overdue':
      return 'Jatuh Tempo'
    default:
      return status
  }
}

export default function InvoicingPage() {
  const { currentUser } = useAuth()
  const { selectedBranch } = useBranches()
  
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Mock data for now - will be replaced with actual API calls
  const mockInvoices: Invoice[] = [
    {
      id: 1,
      invoice_number: 'INV-2024-001',
      customer_id: 1,
      customer_name: 'PT. Contoh Indonesia',
      sales_agent_id: 1,
      sales_agent_name: 'John Doe',
      subtotal: 1000000,
      tax_amount: 110000,
      total_amount: 1110000,
      amount_paid: 0,
      outstanding_amount: 1110000,
      status: 'unpaid',
      due_date: '2024-02-15',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 2,
      invoice_number: 'INV-2024-002',
      customer_id: 2,
      customer_name: 'CV. Maju Jaya',
      sales_agent_id: 2,
      sales_agent_name: 'Jane Smith',
      subtotal: 750000,
      tax_amount: 82500,
      total_amount: 832500,
      amount_paid: 400000,
      outstanding_amount: 432500,
      status: 'partial',
      due_date: '2024-02-20',
      created_at: '2024-01-20T14:30:00Z',
      updated_at: '2024-01-25T09:15:00Z',
    },
  ]

  useEffect(() => {
    loadInvoices()
  }, [selectedBranch])

  const loadInvoices = useCallback(async () => {
    if (!selectedBranch) return

    setLoading(true)
    try {
      // TODO: Replace with actual API call
      // const response = await listInvoices({ branchId: selectedBranch.id })
      // setInvoices(response)
      
      // Using mock data for now
      setTimeout(() => {
        setInvoices(mockInvoices)
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Error loading invoices:', error)
      toast.error('Gagal memuat data invoice')
      setLoading(false)
    }
  }, [selectedBranch])

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.sales_agent_name && invoice.sales_agent_name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const handleCreateInvoice = () => {
    // TODO: Navigate to invoice creation page
    toast.info('Fitur buat invoice sedang dalam pengembangan')
  }

  const handleViewInvoice = (invoiceId: number) => {
    // TODO: Navigate to invoice detail page
    toast.info(`Melihat invoice ID: ${invoiceId}`)
  }

  const handleEditInvoice = (invoiceId: number) => {
    // TODO: Navigate to invoice edit page
    toast.info(`Edit invoice ID: ${invoiceId}`)
  }

  const handleDownloadPDF = (invoiceId: number) => {
    // TODO: Implement PDF download
    toast.info(`Download PDF invoice ID: ${invoiceId}`)
  }

  // Calculate summary stats
  const totalInvoices = filteredInvoices.length
  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0)
  const totalOutstanding = filteredInvoices.reduce((sum, inv) => sum + inv.outstanding_amount, 0)
  const paidInvoices = filteredInvoices.filter(inv => inv.status === 'paid').length

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Invoicing</h1>
              <p className="text-muted-foreground">
                Kelola invoice dan transaksi kredit
              </p>
            </div>
            <Button onClick={handleCreateInvoice} size="lg">
              <PlusCircle className="mr-2 h-4 w-4" />
              Buat Invoice Baru
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoice</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalInvoices}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Nilai</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Piutang</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lunas</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{paidInvoices}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Cari Invoice</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Cari nomor invoice, customer, atau sales agent..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="unpaid">Belum Dibayar</SelectItem>
                      <SelectItem value="partial">Dibayar Sebagian</SelectItem>
                      <SelectItem value="paid">Lunas</SelectItem>
                      <SelectItem value="overdue">Jatuh Tempo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Table */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex space-x-4">
                      <div className="skeleton h-4 w-[250px]"></div>
                      <div className="skeleton h-4 w-[200px]"></div>
                      <div className="skeleton h-4 w-[150px]"></div>
                      <div className="skeleton h-4 w-[100px]"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Sales Agent</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Piutang</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Jatuh Tempo</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="text-muted-foreground">
                            {searchTerm || statusFilter !== 'all' 
                              ? 'Tidak ada invoice yang sesuai filter'
                              : 'Belum ada invoice'
                            }
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {invoice.invoice_number}
                          </TableCell>
                          <TableCell>{invoice.customer_name}</TableCell>
                          <TableCell>{invoice.sales_agent_name || '-'}</TableCell>
                          <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                          <TableCell>{formatCurrency(invoice.outstanding_amount)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(invoice.status)}>
                              {getStatusLabel(invoice.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(invoice.due_date), 'dd MMM yyyy', { locale: id })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewInvoice(invoice.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditInvoice(invoice.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadPDF(invoice.id)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}