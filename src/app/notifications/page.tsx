
"use client";

import React, { useState, useEffect, useCallback } from "react";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  markNotificationAsDismissed, // Ditambahkan
  type AppNotification 
} from "@/lib/firebase/notifications";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";
import { id as localeID } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BellRing, Info, CheckCheck, ExternalLink, Trash2 } from "lucide-react"; // Ditambahkan Trash2
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
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
} from "@/components/ui/alert-dialog";

export default function NotificationsPage() {
  const { currentUser, userData, refreshAuthContextState } = useAuth(); // refreshAuthContextState ditambahkan
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationToDelete, setNotificationToDelete] = useState<AppNotification | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchUserNotifications = useCallback(async () => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const fetchedNotifications = await getNotifications({ 
      limitResults: 50, 
      userId: currentUser.uid 
    });
    setNotifications(fetchedNotifications);
    setLoading(false);
  }, [currentUser?.uid]);

  useEffect(() => {
    fetchUserNotifications();
  }, [fetchUserNotifications]);

  const handleMarkAsRead = async (notificationId: string, linkUrl?: string | null) => {
    if (!currentUser?.uid || !notificationId) return;
    
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && notification.isRead && !linkUrl) return; 

    await markNotificationAsRead(currentUser.uid, notificationId);
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
    await refreshAuthContextState(); // Refresh unread count in sidebar
    
    if (linkUrl) {
      window.open(linkUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser?.uid || notifications.length === 0) return;
    const unreadNotificationIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadNotificationIds.length === 0) {
      toast({ title: "Tidak Ada Notifikasi Baru", description: "Semua notifikasi sudah terbaca."});
      return;
    }

    setLoading(true); 
    await markAllNotificationsAsRead(currentUser.uid, unreadNotificationIds);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setLoading(false);
    await refreshAuthContextState(); // Refresh unread count
    toast({ title: "Notifikasi Ditandai", description: "Semua notifikasi telah ditandai sebagai sudah dibaca."});
  };

  const handleOpenDeleteConfirm = (notification: AppNotification) => {
    setNotificationToDelete(notification);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDismiss = async () => {
    if (!currentUser?.uid || !notificationToDelete) return;
    
    await markNotificationAsDismissed(currentUser.uid, notificationToDelete.id);
    // Optimistically update UI
    setNotifications(prev => prev.filter(n => n.id !== notificationToDelete.id));
    await refreshAuthContextState(); // Refresh unread count
    toast({ title: "Notifikasi Dihapus", description: `Notifikasi "${notificationToDelete.title}" telah dihapus dari tampilan Anda.`});
    setShowDeleteConfirm(false);
    setNotificationToDelete(null);
  };

  const formatDate = (timestamp: Date | undefined) => {
    if (!timestamp) return "N/A";
    return format(timestamp, "eeee, dd MMMM yyyy - HH:mm", { locale: localeID });
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <BellRing className="h-7 w-7 text-primary"/>
              <h1 className="text-xl md:text-2xl font-semibold font-headline">
                Notifikasi & Pengumuman
              </h1>
            </div>
            {notifications.some(n => !n.isRead) && !loading && (
              <Button onClick={handleMarkAllRead} size="sm" variant="outline" className="text-xs h-8">
                <CheckCheck className="mr-1.5 h-4 w-4"/> Tandai Semua Telah Dibaca
              </Button>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2 mt-1" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6 mt-1.5" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center">
                <Info className="mx-auto h-12 w-12 text-muted-foreground mb-3"/>
                <p className="text-base font-medium text-foreground">Tidak Ada Notifikasi Baru</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Saat ini belum ada pengumuman atau notifikasi untuk Anda.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-14rem)] pr-3"> 
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <Card 
                    key={notif.id} 
                    className={cn(
                      "shadow-sm hover:shadow-md transition-shadow",
                      !notif.isRead && "bg-primary/5 dark:bg-primary/10 border-primary/30"
                    )}
                  >
                    <CardHeader className="pb-2 pt-3 px-4">
                      <div className="flex justify-between items-start gap-2">
                        {notif.linkUrl ? (
                          <Link 
                            href={notif.linkUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-sm font-semibold leading-tight hover:underline hover:text-primary group cursor-pointer"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleMarkAsRead(notif.id, notif.linkUrl);
                            }} 
                          >
                            {notif.title}
                            <ExternalLink className="inline-block h-3.5 w-3.5 ml-1.5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </Link>
                        ) : (
                          <CardTitle 
                            className="text-sm font-semibold leading-tight cursor-pointer hover:text-primary"
                            onClick={() => handleMarkAsRead(notif.id)}
                          >
                            {notif.title}
                          </CardTitle>
                        )}
                        <div className="flex items-center gap-1">
                          <Badge variant={notif.isRead ? "secondary" : "default"} className="text-xs shrink-0">
                            {notif.isRead ? "Dibaca" : "Baru"}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteConfirm(notif);
                            }}
                            aria-label="Hapus notifikasi"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription 
                        className="text-xs pt-0.5 cursor-pointer"
                        onClick={() => handleMarkAsRead(notif.id)}
                      >
                        Oleh: {notif.createdByName} ({notif.category}) <br/> {formatDate(notif.createdAt?.toDate())}
                      </CardDescription>
                    </CardHeader>
                    <CardContent 
                      className="px-4 pb-3 cursor-pointer"
                      onClick={() => handleMarkAsRead(notif.id, notif.linkUrl)}
                    >
                      <p className="text-xs text-foreground/90 whitespace-pre-wrap">{notif.message}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Hapus Notifikasi</AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                Apakah Anda yakin ingin menghapus notifikasi "{notificationToDelete?.title}" dari tampilan Anda? 
                Tindakan ini tidak dapat dibatalkan dari sisi Anda.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="text-xs h-8" onClick={() => {setShowDeleteConfirm(false); setNotificationToDelete(null);}}>Batal</AlertDialogCancel>
              <AlertDialogAction
                className="text-xs h-8 bg-destructive hover:bg-destructive/90"
                onClick={handleConfirmDismiss}
              >
                Ya, Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
