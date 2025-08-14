'use client'

import React, { useState, useEffect, useCallback } from 'react'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/auth-context'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchSentNotifications,
  type NotificationItem,
} from '@/lib/laravel/notifications'
import { format } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'

export default function NotificationHistoryPage() {
  const { userData } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotificationHistory = useCallback(async () => {
    setLoading(true)
    // Fetch all notifications, admin might want to see everything sent
    const fetched = await fetchSentNotifications({ limit: 100 })
    setNotifications(fetched?.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (userData?.role === 'admin') {
      fetchNotificationHistory()
    }
  }, [fetchNotificationHistory, userData])

  const formatDateIntl = (iso: string | undefined) => {
    if (!iso) return 'N/A'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return 'N/A'
    return format(d, 'dd MMM yyyy, HH:mm', { locale: localeID })
  }

  if (userData?.role !== 'admin') {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className='p-4 text-center text-destructive'>
            Hanya admin yang dapat mengakses halaman ini.
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-6'>
          <h1 className='text-xl md:text-2xl font-semibold font-headline'>
            Riwayat Notifikasi Terkirim
          </h1>

          <Card>
            <CardHeader>
              <CardTitle className='text-base font-semibold'>
                Daftar Notifikasi
              </CardTitle>
              <CardDescription className='text-xs'>
                Menampilkan semua notifikasi yang telah dikirim oleh
                administrator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className='space-y-2'>
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className='h-10 w-full' />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <p className='text-sm text-muted-foreground text-center py-6'>
                  Belum ada notifikasi yang dikirim.
                </p>
              ) : (
                <div className='border rounded-md overflow-x-auto'>
                  <Table>
                    <TableCaption className='text-xs'>
                      Riwayat notifikasi.
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='text-xs'>Judul</TableHead>
                        <TableHead className='text-xs hidden sm:table-cell'>
                          Kategori
                        </TableHead>
                        <TableHead className='text-xs'>Tanggal Kirim</TableHead>
                        <TableHead className='text-xs hidden md:table-cell'>
                          Pengirim
                        </TableHead>
                        <TableHead className='text-xs hidden lg:table-cell'>
                          Pesan Singkat
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notifications.map((notif) => (
                        <TableRow key={notif.id}>
                          <TableCell className='py-2 text-xs font-medium'>
                            {notif.title}
                          </TableCell>
                          <TableCell className='py-2 text-xs hidden sm:table-cell'>
                            <Badge variant='secondary' className='text-xs'>
                              {notif.category}
                            </Badge>
                          </TableCell>
                          <TableCell className='py-2 text-xs'>
                            {formatDateIntl(notif.created_at)}
                          </TableCell>
                          <TableCell className='py-2 text-xs hidden md:table-cell'>
                            {notif.created_by_name}
                          </TableCell>
                          <TableCell
                            className='py-2 text-xs hidden lg:table-cell max-w-xs truncate'
                            title={notif.message}
                          >
                            {notif.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
