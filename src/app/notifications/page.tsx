
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
  type AppNotification 
} from "@/lib/firebase/notifications";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";
import { id as localeID } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BellRing, Info, CheckCheck, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function NotificationsPage() {
  const { currentUser, userData } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleMarkAsRead = async (notificationId: string) => {
    if (!currentUser?.uid || !notificationId) return;
    
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && notification.isRead) return; // Already read

    await markNotificationAsRead(currentUser.uid, notificationId);
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
    // No toast needed for individual read marking, maybe for "mark all"
  };

  const handleMarkAllRead = async () => {
    if (!currentUser?.uid || notifications.length === 0) return;
    const unreadNotificationIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadNotificationIds.length === 0) {
      toast({ title: "Tidak Ada Notifikasi Baru", description: "Semua notifikasi sudah terbaca."});
      return;
    }

    setLoading(true); // Indicate processing
    await markAllNotificationsAsRead(currentUser.uid, unreadNotificationIds);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setLoading(false);
    toast({ title: "Notifikasi Ditandai", description: "Semua notifikasi telah ditandai sebagai sudah dibaca."});
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
                      "shadow-sm hover:shadow-md transition-shadow cursor-pointer",
                      !notif.isRead && "bg-primary/5 dark:bg-primary/10 border-primary/30"
                    )}
                    onClick={() => {
                      handleMarkAsRead(notif.id);
                      if (notif.linkUrl) {
                        window.open(notif.linkUrl, "_blank", "noopener,noreferrer");
                      }
                    }}
                  >
                    <CardHeader className="pb-2 pt-3 px-4">
                      <div className="flex justify-between items-start gap-2">
                        {notif.linkUrl ? (
                          <Link 
                            href={notif.linkUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-sm font-semibold leading-tight hover:underline hover:text-primary group"
                            onClick={(e) => e.stopPropagation()} // Prevent card click if link is clicked
                          >
                            {notif.title}
                            <ExternalLink className="inline-block h-3.5 w-3.5 ml-1.5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </Link>
                        ) : (
                          <CardTitle className="text-sm font-semibold leading-tight">{notif.title}</CardTitle>
                        )}
                        <Badge variant={notif.isRead ? "secondary" : "default"} className="text-xs shrink-0">
                          {notif.isRead ? "Dibaca" : "Baru"}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs pt-0.5">
                        Oleh: {notif.createdByName} ({notif.category}) <br/> {formatDate(notif.createdAt?.toDate())}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <p className="text-xs text-foreground/90 whitespace-pre-wrap">{notif.message}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
