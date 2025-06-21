// src/lib/appwrite/notifications.ts

import {
  databases,
  ID,
  Query,
  DATABASE_ID,
  NOTIFICATIONS_COLLECTION_ID,
  NOTIFICATION_READS_COLLECTION_ID,
  NOTIFICATION_DISMISSALS_COLLECTION_ID,
} from './config'

// --- Definisi Tipe Data ---

// Konten notifikasi
export interface Notification {
  id: string // dari $id
  title: string
  message: string
  target: 'all' | 'staff' | 'owner' // Contoh penargetan
  createdBy: string // admin user ID
  createdAt: string // dari $createdAt
}

// Status notifikasi per pengguna
export interface UserNotificationStatus {
  id: string // dari $id
  userId: string
  notificationId: string
  status: 'delivered' | 'read'
  readAt?: string // ISO String
}

// Tipe gabungan untuk ditampilkan di UI
export interface UserNotification extends Notification {
  status: 'delivered' | 'read'
  statusId?: string // ID dari dokumen status
}

// --- Fungsi untuk Admin ---

export async function sendNotification(
  notification: Omit<Notification, 'id' | 'createdAt'>
): Promise<Notification | { error: string }> {
  try {
    const document = await databases.createDocument(
      DATABASE_ID,
      NOTIFICATIONS_COLLECTION_ID,
      ID.unique(),
      notification
    )
    return document as unknown as Notification
  } catch (error: any) {
    console.error('Error sending notification:', error)
    return { error: error.message || 'Gagal mengirim notifikasi.' }
  }
}

// --- Fungsi untuk Pengguna ---

// Mengambil notifikasi untuk pengguna tertentu dan menggabungkannya dengan status
export async function getNotificationsForUser(
  userId: string
): Promise<UserNotification[]> {
  if (!userId) return []
  try {
    // 1. Ambil semua notifikasi global (misal, 50 terakhir)
    const notificationsResponse = await databases.listDocuments(
      DATABASE_ID,
      NOTIFICATIONS_COLLECTION_ID,
      [Query.orderDesc('$createdAt'), Query.limit(50)]
    )
    const allNotifications =
      notificationsResponse.documents as unknown as Notification[]

    // 2. Ambil semua status notifikasi untuk pengguna ini
    const notificationIds = allNotifications.map((n) => n.id)
    const statusResponse = await databases.listDocuments(
      DATABASE_ID,
      NOTIFICATIONS_COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.equal('notificationId', notificationIds),
      ]
    )

    // Buat peta untuk pencarian status yang mudah
    const statusMap = new Map<string, UserNotificationStatus>()
    for (const doc of statusResponse.documents) {
      const status = doc as unknown as UserNotificationStatus
      statusMap.set(status.notificationId, status)
    }

    // 3. Gabungkan notifikasi dengan statusnya
    const userNotifications: UserNotification[] = allNotifications.map(
      (notification) => {
        const status = statusMap.get(notification.id)
        return {
          ...notification,
          status: status ? status.status : 'delivered', // Anggap 'delivered' jika belum ada status
          statusId: status ? status.id : undefined,
        }
      }
    )

    // // (Opsional) Buat dokumen status untuk notifikasi baru yang belum ada statusnya
    // const newNotifications = userNotifications.filter((n) => !n.statusId)
    // for (const n of newNotifications) {
    //   await databases.createDocument(
    //     DATABASE_ID,
    //     NOTIFICATION_READS_COLLECTION_ID,
    //     ID.unique(),
    //     {
    //       userId,
    //       notificationId: n.id,
    //       status: 'delivered',
    //     }
    //   )
    // }

    return userNotifications
  } catch (error: any) {
    console.error('Error fetching user notifications:', error)
    return []
  }
}

// Menandai notifikasi sebagai telah dibaca
export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
  statusId?: string
): Promise<void | { error: string }> {
  try {
    if (statusId) {
      // Jika status sudah ada, update saja
      await databases.updateDocument(
        DATABASE_ID,
        NOTIFICATION_READS_COLLECTION_ID,
        statusId,
        {
          status: 'read',
          readAt: new Date().toISOString(),
        }
      )
    } else {
      // Jika belum ada (kasus langka), buat baru dengan status 'read'
      await databases.createDocument(
        DATABASE_ID,
        NOTIFICATION_READS_COLLECTION_ID,
        ID.unique(),
        {
          userId,
          notificationId,
          status: 'read',
          readAt: new Date().toISOString(),
        }
      )
    }
  } catch (error: any) {
    console.error('Error marking notification as read:', error)
    return { error: 'Gagal menandai notifikasi.' }
  }
}
