
import {
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  writeBatch,
  getDoc,
} from "firebase/firestore";
import { db } from "./config";

export const NOTIFICATION_CATEGORIES = [
  "Pembaruan Sistem",
  "Himbauan Keamanan",
  "Informasi Umum",
  "Promosi",
  "Pengumuman Penting",
  "Perbaikan & Pemeliharaan",
] as const;
export type NotificationCategory = typeof NOTIFICATION_CATEGORIES[number];

export interface AppNotificationInput {
  title: string;
  message: string;
  category: NotificationCategory;
  createdByUid: string;
  createdByName: string; // Nama admin yang mengirim
  isGlobal: boolean; // Untuk saat ini selalu true
  linkUrl?: string; // URL opsional
  targetBranchId?: string | null; // Untuk masa depan jika ingin target per cabang
}

export interface AppNotification extends AppNotificationInput {
  id: string;
  createdAt: Timestamp;
  isRead?: boolean; // Akan di-populate di client-side
}

// Interface untuk status baca pengguna
export interface UserNotificationReadStatus {
  readAt: Timestamp;
}


export async function sendNotification(
  notificationData: AppNotificationInput
): Promise<AppNotification | { error: string }> {
  if (!notificationData.title.trim())
    return { error: "Judul notifikasi tidak boleh kosong." };
  if (!notificationData.message.trim())
    return { error: "Pesan notifikasi tidak boleh kosong." };
  if (!notificationData.category)
    return { error: "Kategori notifikasi harus dipilih." };
  if (!notificationData.createdByUid || !notificationData.createdByName)
    return { error: "Informasi pengirim tidak lengkap." };
  if (notificationData.linkUrl && !notificationData.linkUrl.startsWith('http')) {
    return { error: "URL Link tidak valid. Harus dimulai dengan http atau https." };
  }

  try {
    const now = serverTimestamp() as Timestamp;
    const dataToSave = {
      ...notificationData,
      linkUrl: notificationData.linkUrl || null, // Simpan null jika kosong
      isGlobal: true,
      targetBranchId: null,
      createdAt: now,
    };
    const notificationRef = await addDoc(
      collection(db, "notifications"),
      dataToSave
    );
    const clientTimestamp = Timestamp.now();
    return {
      id: notificationRef.id,
      ...dataToSave,
      createdAt: clientTimestamp,
    };
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return { error: error.message || "Gagal mengirim notifikasi." };
  }
}

export async function getNotifications(options?: {
  limitResults?: number;
  userId?: string; // Untuk mengambil status 'isRead'
}): Promise<AppNotification[]> {
  try {
    const qConstraints: any[] = [orderBy("createdAt", "desc")];

    if (options?.limitResults) {
      qConstraints.push(limit(options.limitResults));
    }

    const q = query(collection(db, "notifications"), ...qConstraints);
    const querySnapshot = await getDocs(q);
    const notifications: AppNotification[] = [];

    let userReadStatuses: Record<string, boolean> = {};
    if (options?.userId) {
      const userReadStatusCollectionRef = collection(db, `userNotificationStatus/${options.userId}/notificationsRead`);
      const userReadStatusSnapshot = await getDocs(userReadStatusCollectionRef);
      userReadStatusSnapshot.forEach(docSnap => {
        userReadStatuses[docSnap.id] = true;
      });
    }

    querySnapshot.forEach((docSnap) => {
      notifications.push({
        id: docSnap.id,
        ...docSnap.data(),
        isRead: options?.userId ? !!userReadStatuses[docSnap.id] : undefined,
      } as AppNotification);
    });
    return notifications;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}


export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void | { error: string }> {
  if (!userId || !notificationId) return { error: "User ID dan Notification ID diperlukan." };
  try {
    const readStatusRef = doc(db, `userNotificationStatus/${userId}/notificationsRead`, notificationId);
    await setDoc(readStatusRef, { readAt: serverTimestamp() });
  } catch (error: any) {
    console.error("Error marking notification as read:", error);
    return { error: error.message || "Gagal menandai notifikasi sebagai sudah dibaca." };
  }
}

export async function markAllNotificationsAsRead(userId: string, notificationIds: string[]): Promise<void | { error: string }> {
  if (!userId || !notificationIds || notificationIds.length === 0) {
    return { error: "User ID dan daftar ID notifikasi diperlukan." };
  }
  const batch = writeBatch(db);
  try {
    notificationIds.forEach(notificationId => {
      const readStatusRef = doc(db, `userNotificationStatus/${userId}/notificationsRead`, notificationId);
      batch.set(readStatusRef, { readAt: serverTimestamp() });
    });
    await batch.commit();
  } catch (error: any) {
    console.error("Error marking all notifications as read:", error);
    return { error: error.message || "Gagal menandai semua notifikasi sebagai sudah dibaca." };
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    // 1. Get all global notifications
    const allNotificationsQuery = query(collection(db, "notifications"), where("isGlobal", "==", true));
    const allNotificationsSnapshot = await getDocs(allNotificationsQuery);
    const totalGlobalNotifications = allNotificationsSnapshot.size;

    if (totalGlobalNotifications === 0) return 0;

    // 2. Get all read notifications for the user
    const userReadStatusCollectionRef = collection(db, `userNotificationStatus/${userId}/notificationsRead`);
    // We can potentially optimize this by only fetching IDs if that's supported, but for now getDocs is fine.
    const userReadStatusSnapshot = await getDocs(userReadStatusCollectionRef);
    const totalReadByUser = userReadStatusSnapshot.size;
    
    // 3. Calculate unread count. This assumes all notifications are global for now.
    // A more complex scenario would involve checking if each specific notification ID
    // exists in the user's read statuses.
    // For now, a simple count difference might be sufficient if all notifications are global.
    // However, to be accurate, we should count notifications that are NOT in the user's read list.

    const allNotificationIds = allNotificationsSnapshot.docs.map(doc => doc.id);
    const readNotificationIds = new Set(userReadStatusSnapshot.docs.map(doc => doc.id));
    
    let unreadCount = 0;
    for (const notificationId of allNotificationIds) {
      if (!readNotificationIds.has(notificationId)) {
        unreadCount++;
      }
    }
    return unreadCount;

  } catch (error) {
    console.error("Error fetching unread notification count:", error);
    return 0; 
  }
}
