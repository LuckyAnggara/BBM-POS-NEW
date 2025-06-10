
"use client";

import React, { useState, useEffect, useCallback } from "react";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getNotifications, type AppNotification } from "@/lib/firebase/notifications";
import { format } from "date-fns";
import { id as localeID } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BellRing, Info } from "lucide-react";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserNotifications = useCallback(async () => {
    setLoading(true);
    // Untuk saat ini, semua pengguna mendapatkan notifikasi global
    const fetchedNotifications = await getNotifications({ limitResults: 50 }); // Batasi jumlah notifikasi awal
    setNotifications(fetchedNotifications);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUserNotifications();
  }, [fetchUserNotifications]);

  const formatDate = (timestamp: Date | undefined) => {
    if (!timestamp) return "N/A";
    return format(timestamp, "eeee, dd MMMM yyyy - HH:mm", { locale: localeID });
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <BellRing className="h-7 w-7 text-primary"/>
            <h1 className="text-xl md:text-2xl font-semibold font-headline">
              Notifikasi & Pengumuman
            </h1>
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
            <ScrollArea className="h-[calc(100vh-12rem)] pr-3"> {/* Adjust height as needed */}
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <Card key={notif.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-sm font-semibold leading-tight">{notif.title}</CardTitle>
                        <Badge variant="outline" className="text-xs shrink-0">{notif.category}</Badge>
                      </div>
                      <CardDescription className="text-xs pt-0.5">
                        Dikirim oleh: {notif.createdByName} pada {formatDate(notif.createdAt?.toDate())}
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
