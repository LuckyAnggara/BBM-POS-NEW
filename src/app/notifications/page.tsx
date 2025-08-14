'use client'

import React, { useState, useEffect, useCallback } from 'react'
import MainLayout from '@/components/layout/main-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
  type NotificationItem,
} from '@/lib/laravel/notifications'
import { useAuth } from '@/contexts/auth-context'
import { format, parseISO } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { BellRing, Info, CheckCheck, ExternalLink, Trash2 } from 'lucide-react' // Ditambahkan Trash2
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export default function NotificationsPage() {
  const authCtx = useAuth()
  // Backward compatibility if refreshAuthContextState not provided
  // @ts-ignore
  const refreshAuthContextState: (() => Promise<void>) | undefined = (
    authCtx as any
  ).refreshAuthContextState
  const { currentUser, userData } = authCtx
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notificationToDelete, setNotificationToDelete] =
    useState<NotificationItem | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const fetchUserNotifications = useCallback(async () => {
    if (!currentUser) {
      setLoading(false)
      return
    }
    setLoading(true)
    const fetched = await fetchNotifications({ limit: 50 })
    setNotifications(fetched.data)
    setLoading(false)
  }, [currentUser])

  useEffect(() => {
    fetchUserNotifications()
  }, [fetchUserNotifications])

  const handleMarkAsRead = async (
    notificationId: number,
    linkUrl?: string | null
  ) => {
    if (!currentUser || !notificationId) return
    const notification = notifications.find((n) => n.id === notificationId)
    if (notification && notification.is_read && !linkUrl) return
    await markNotificationRead(notificationId)
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n
      )
    )
    if (refreshAuthContextState) await refreshAuthContextState()
    if (linkUrl) window.open(linkUrl, '_blank', 'noopener,noreferrer')
  }

  const handleMarkAllRead = async () => {
    if (!currentUser || notifications.length === 0) return
    const hasUnread = notifications.some((n) => !n.is_read)
    if (!hasUnread) {
      toast({
        title: 'Tidak Ada Notifikasi Baru',
        description: 'Semua notifikasi sudah terbaca.',
      })
      return
    }

    setLoading(true)
    await markAllNotificationsRead()
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        is_read: true,
        read_at: n.read_at || new Date().toISOString(),
      }))
    )
    setLoading(false)
    if (refreshAuthContextState) await refreshAuthContextState()
    toast({
      title: 'Notifikasi Ditandai',
      description: 'Semua notifikasi telah ditandai sebagai sudah dibaca.',
    })
  }

  const handleOpenDeleteConfirm = (notification: NotificationItem) => {
    setNotificationToDelete(notification)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDismiss = async () => {
    if (!currentUser || !notificationToDelete) return

    await dismissNotification(notificationToDelete.id)
    // Optimistically update UI
    setNotifications((prev) =>
      prev.filter((n) => n.id !== notificationToDelete.id)
    )
    if (refreshAuthContextState) await refreshAuthContextState()
    toast({
      title: 'Notifikasi Dihapus',
      description: `Notifikasi "${notificationToDelete.title}" telah dihapus dari tampilan Anda.`,
    })
    setShowDeleteConfirm(false)
    setNotificationToDelete(null)
  }

  const formatDateIntl = (isoString?: string | null) => {
    if (!isoString) return 'N/A'
    const date = parseISO(isoString)
    return format(date, 'eeee, dd MMMM yyyy - HH:mm', { locale: localeID })
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className='space-y-6'>
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
            <div className='flex items-center gap-3'>
              <BellRing className='h-7 w-7 text-primary' />
              <h1 className='text-xl md:text-2xl font-semibold font-headline'>
                Notifikasi & Pengumuman
              </h1>
            </div>
            {notifications.some((n) => !n.is_read) && !loading && (
              <Button
                onClick={handleMarkAllRead}
                size='sm'
                variant='outline'
                className='text-xs h-8'
              >
                <CheckCheck className='mr-1.5 h-4 w-4' /> Tandai Semua Telah
                Dibaca
              </Button>
            )}
          </div>

          {loading ? (
            <div className='space-y-4'>
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className='pb-3'>
                    <Skeleton className='h-5 w-3/4' />
                    <Skeleton className='h-3 w-1/2 mt-1' />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className='h-4 w-full' />
                    <Skeleton className='h-4 w-5/6 mt-1.5' />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className='p-10 text-center'>
                <Info className='mx-auto h-12 w-12 text-muted-foreground mb-3' />
                <p className='text-base font-medium text-foreground'>
                  Tidak Ada Notifikasi Baru
                </p>
                <p className='text-sm text-muted-foreground mt-1'>
                  Saat ini belum ada pengumuman atau notifikasi untuk Anda.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className='h-[calc(100vh-14rem)] pr-3'>
              <div className='space-y-3'>
                {notifications.map((notif) => (
                  <Card
                    key={notif.id}
                    className={cn(
                      'shadow-sm hover:shadow-md transition-shadow',
                      !notif.is_read &&
                        'bg-primary/5 dark:bg-primary/10 border-primary/30'
                    )}
                  >
                    <CardHeader className='pb-2 pt-3 px-4'>
                      <div className='flex justify-between items-start gap-2'>
                        {notif.link_url ? (
                          <Link
                            href={notif.link_url}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-sm font-semibold leading-tight hover:underline hover:text-primary group cursor-pointer'
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkAsRead(notif.id, notif.link_url)
                            }}
                          >
                            {notif.title}
                            <ExternalLink className='inline-block h-3.5 w-3.5 ml-1.5 text-muted-foreground group-hover:text-primary transition-colors' />
                          </Link>
                        ) : (
                          <CardTitle
                            className='text-sm font-semibold leading-tight cursor-pointer hover:text-primary'
                            onClick={() => handleMarkAsRead(notif.id)}
                          >
                            {notif.title}
                          </CardTitle>
                        )}
                        <div className='flex items-center gap-1'>
                          <Badge
                            variant={notif.is_read ? 'secondary' : 'default'}
                            className='text-xs shrink-0'
                          >
                            {notif.is_read ? 'Dibaca' : 'Baru'}
                          </Badge>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-6 w-6 text-muted-foreground hover:text-destructive'
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenDeleteConfirm(notif)
                            }}
                            aria-label='Hapus notifikasi'
                          >
                            <Trash2 className='h-3.5 w-3.5' />
                          </Button>
                        </div>
                      </div>
                      <CardDescription
                        className='text-xs pt-0.5 cursor-pointer'
                        onClick={() => handleMarkAsRead(notif.id)}
                      >
                        Oleh: {notif.created_by_name || 'System'} (
                        {notif.category}) <br />{' '}
                        {formatDateIntl(notif.created_at)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent
                      className='px-4 pb-3 cursor-pointer'
                      onClick={() => handleMarkAsRead(notif.id, notif.link_url)}
                    >
                      <p className='text-xs text-foreground/90 whitespace-pre-wrap'>
                        {notif.message}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        <AlertDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Hapus Notifikasi</AlertDialogTitle>
              <AlertDialogDescription className='text-xs'>
                Apakah Anda yakin ingin menghapus notifikasi "
                {notificationToDelete?.title}" dari tampilan Anda? Tindakan ini
                tidak dapat dibatalkan dari sisi Anda.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                className='text-xs h-8'
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setNotificationToDelete(null)
                }}
              >
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                className='text-xs h-8 bg-destructive hover:bg-destructive/90'
                onClick={handleConfirmDismiss}
              >
                Ya, Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MainLayout>
    </ProtectedRoute>
  )
}
