'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  HelpCircle,
  MessageSquare,
  Plus,
  Search,
  Ticket,
  User,
  CheckCircle,
  XCircle,
  Filter
} from 'lucide-react'
import { toast } from 'sonner'
import { SupportTicket, SupportTicketStatus } from '@/lib/types'
import Link from 'next/link'

export default function SupportCenter() {
  const { currentUser, isTenantAdmin, isSuperAdmin } = useAuth()
  const router = useRouter()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  
  // New ticket form
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    category: 'general'
  })

  // Ticket response
  const [response, setResponse] = useState('')
  const [isResponding, setIsResponding] = useState(false)

  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
  ]

  const statuses = [
    { value: 'open', label: 'Open', color: 'bg-blue-100 text-blue-800' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-purple-100 text-purple-800' },
    { value: 'resolved', label: 'Resolved', color: 'bg-green-100 text-green-800' },
    { value: 'closed', label: 'Closed', color: 'bg-gray-100 text-gray-800' }
  ]

  const categories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'billing', label: 'Billing Question' },
    { value: 'feature_request', label: 'Feature Request' },
    { value: 'bug_report', label: 'Bug Report' },
    { value: 'account', label: 'Account Management' }
  ]

  useEffect(() => {
    if (currentUser) {
      fetchTickets()
    }
  }, [currentUser])

  const fetchTickets = async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/support/tickets', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTickets(data)
      } else {
        toast.error('Failed to load support tickets')
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
      toast.error('Failed to load support tickets')
    } finally {
      setIsLoading(false)
    }
  }

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsCreating(true)
      
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(newTicket)
      })
      
      if (response.ok) {
        toast.success('Support ticket created successfully!')
        setNewTicket({
          subject: '',
          description: '',
          priority: 'medium',
          category: 'general'
        })
        fetchTickets() // Refresh tickets
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to create ticket')
      }
    } catch (error) {
      console.error('Failed to create ticket:', error)
      toast.error('Failed to create ticket')
    } finally {
      setIsCreating(false)
    }
  }

  const updateTicketStatus = async (ticketId: number, status: string) => {
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ status })
      })
      
      if (response.ok) {
        toast.success('Ticket status updated')
        fetchTickets() // Refresh tickets
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status: status as SupportTicketStatus })
        }
      } else {
        toast.error('Failed to update ticket status')
      }
    } catch (error) {
      console.error('Failed to update ticket status:', error)
      toast.error('Failed to update ticket status')
    }
  }

  const addResponse = async (ticketId: number) => {
    if (!response.trim()) return
    
    try {
      setIsResponding(true)
      
      const apiResponse = await fetch(`/api/support/tickets/${ticketId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ response: response.trim() })
      })
      
      if (apiResponse.ok) {
        toast.success('Response added successfully')
        setResponse('')
        fetchTickets() // Refresh tickets
      } else {
        toast.error('Failed to add response')
      }
    } catch (error) {
      console.error('Failed to add response:', error)
      toast.error('Failed to add response')
    } finally {
      setIsResponding(false)
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = priorities.find(p => p.value === priority)
    return (
      <Badge className={priorityConfig?.color}>
        {priorityConfig?.label}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = statuses.find(s => s.value === status)
    return (
      <Badge className={statusConfig?.color}>
        {statusConfig?.label}
      </Badge>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className='h-4 w-4 text-blue-500' />
      case 'in_progress':
        return <Clock className='h-4 w-4 text-purple-500' />
      case 'resolved':
        return <CheckCircle className='h-4 w-4 text-green-500' />
      case 'closed':
        return <XCircle className='h-4 w-4 text-gray-500' />
      default:
        return <HelpCircle className='h-4 w-4' />
    }
  }

  if (!currentUser) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <AlertCircle className='h-12 w-12 text-red-500 mx-auto mb-4' />
          <h1 className='text-xl font-semibold mb-2'>Access Denied</h1>
          <p className='text-muted-foreground'>Please log in to access support</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-background p-6'>
      <div className='max-w-7xl mx-auto space-y-6'>
        {/* Header */}
        <div className='flex items-center gap-4 mb-6'>
          <Button asChild variant='outline' size='sm'>
            <Link href='/dashboard'>
              <ArrowLeft className='h-4 w-4 mr-2' />
              Back to Dashboard
            </Link>
          </Button>
          
          <div className='flex-1'>
            <h1 className='text-3xl font-bold'>Support Center</h1>
            <p className='text-muted-foreground'>
              Get help and manage your support tickets
            </p>
          </div>

          {/* Create Ticket Button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className='h-4 w-4 mr-2' />
                New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className='max-w-2xl'>
              <DialogHeader>
                <DialogTitle>Create Support Ticket</DialogTitle>
                <DialogDescription>
                  Tell us about the issue you're experiencing and we'll help you resolve it.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={createTicket} className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='subject'>Subject</Label>
                  <Input
                    id='subject'
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                    placeholder='Brief description of your issue'
                    required
                  />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='category'>Category</Label>
                    <Select
                      value={newTicket.category}
                      onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='priority'>Priority</Label>
                    <Select
                      value={newTicket.priority}
                      onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map(priority => (
                          <SelectItem key={priority.value} value={priority.value}>
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='description'>Description</Label>
                  <Textarea
                    id='description'
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    placeholder='Please provide detailed information about your issue'
                    rows={6}
                    required
                  />
                </div>

                <DialogFooter>
                  <Button type='submit' disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create Ticket'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Filter className='h-5 w-5' />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex flex-col md:flex-row gap-4'>
              <div className='flex-1'>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                  <Input
                    placeholder='Search tickets...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='pl-10'
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className='w-full md:w-48'>
                  <SelectValue placeholder='Filter by status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Statuses</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className='w-full md:w-48'>
                  <SelectValue placeholder='Filter by priority' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Priorities</SelectItem>
                  {priorities.map(priority => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tickets */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Ticket className='h-5 w-5' />
              Your Support Tickets ({filteredTickets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='text-center py-8'>
                <HelpCircle className='h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse' />
                <p className='text-muted-foreground'>Loading tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className='text-center py-8'>
                <MessageSquare className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
                <h3 className='text-lg font-semibold mb-2'>No tickets found</h3>
                <p className='text-muted-foreground mb-4'>
                  {tickets.length === 0 
                    ? "You haven't created any support tickets yet."
                    : "No tickets match your current filters."
                  }
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className='font-mono text-sm'>
                        #{ticket.id}
                      </TableCell>
                      <TableCell>
                        <div className='max-w-xs truncate font-medium'>
                          {ticket.subject}
                        </div>
                      </TableCell>
                      <TableCell className='capitalize'>
                        {ticket.category?.replace('_', ' ')}
                      </TableCell>
                      <TableCell>
                        {getPriorityBadge(ticket.priority)}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          {getStatusIcon(ticket.status)}
                          {getStatusBadge(ticket.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(ticket.created_at)}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant='outline' 
                              size='sm'
                              onClick={() => setSelectedTicket(ticket)}
                            >
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className='max-w-4xl max-h-[80vh] overflow-y-auto'>
                            <DialogHeader>
                              <DialogTitle className='flex items-center gap-2'>
                                <Ticket className='h-5 w-5' />
                                Ticket #{ticket.id}
                              </DialogTitle>
                              <DialogDescription>
                                {ticket.subject}
                              </DialogDescription>
                            </DialogHeader>

                            <div className='space-y-6'>
                              {/* Ticket Details */}
                              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                                <div>
                                  <Label className='text-sm font-medium'>Status</Label>
                                  <div className='mt-1'>
                                    {getStatusBadge(ticket.status)}
                                  </div>
                                </div>
                                <div>
                                  <Label className='text-sm font-medium'>Priority</Label>
                                  <div className='mt-1'>
                                    {getPriorityBadge(ticket.priority)}
                                  </div>
                                </div>
                                <div>
                                  <Label className='text-sm font-medium'>Category</Label>
                                  <div className='mt-1 capitalize'>
                                    {ticket.category?.replace('_', ' ')}
                                  </div>
                                </div>
                                <div>
                                  <Label className='text-sm font-medium'>Created</Label>
                                  <div className='mt-1 text-sm'>
                                    {formatDate(ticket.created_at)}
                                  </div>
                                </div>
                              </div>

                              {/* Description */}
                              <div>
                                <Label className='text-sm font-medium'>Description</Label>
                                <div className='mt-2 p-4 bg-muted/50 rounded-lg'>
                                  <p className='whitespace-pre-wrap text-sm'>
                                    {ticket.description}
                                  </p>
                                </div>
                              </div>

                              {/* Responses */}
                              {ticket.responses && ticket.responses.length > 0 && (
                                <div>
                                  <Label className='text-sm font-medium'>Responses</Label>
                                  <div className='mt-2 space-y-3'>
                                    {ticket.responses.map((resp, index) => (
                                      <div key={index} className='border-l-4 border-primary pl-4'>
                                        <div className='flex items-center gap-2 mb-1'>
                                          <User className='h-4 w-4' />
                                          <span className='font-medium text-sm'>
                                            {resp.user_name || 'Support Team'}
                                          </span>
                                          <span className='text-xs text-muted-foreground'>
                                            {formatDate(resp.created_at)}
                                          </span>
                                        </div>
                                        <p className='text-sm whitespace-pre-wrap'>
                                          {resp.response}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Add Response (if admin or ticket status allows) */}
                              {(isSuperAdmin() || (isTenantAdmin() && ticket.status !== 'closed')) && (
                                <div>
                                  <Label className='text-sm font-medium'>Add Response</Label>
                                  <div className='mt-2 space-y-3'>
                                    <Textarea
                                      value={response}
                                      onChange={(e) => setResponse(e.target.value)}
                                      placeholder='Type your response...'
                                      rows={4}
                                    />
                                    <Button 
                                      onClick={() => addResponse(ticket.id)}
                                      disabled={isResponding || !response.trim()}
                                      size='sm'
                                    >
                                      {isResponding ? 'Adding...' : 'Add Response'}
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Status Actions (if admin) */}
                              {isSuperAdmin() && (
                                <div>
                                  <Label className='text-sm font-medium'>Change Status</Label>
                                  <div className='mt-2 flex gap-2'>
                                    {statuses.map(status => (
                                      <Button
                                        key={status.value}
                                        variant={ticket.status === status.value ? 'default' : 'outline'}
                                        size='sm'
                                        onClick={() => updateTicketStatus(ticket.id, status.value)}
                                        disabled={ticket.status === status.value}
                                      >
                                        {status.label}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}