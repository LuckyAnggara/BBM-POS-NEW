
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
  isRead?: boolean;
  isDismissed?: boolean; // Ditambahkan untuk status dismiss
}

// Interface untuk status baca pengguna
export interface UserNotificationReadStatus {
  readAt: Timestamp;
}

// Interface untuk status dismiss pengguna
export interface UserNotificationDismissedStatus {
  dismissedAt: Timestamp;
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
  userId?: string; // Untuk mengambil status 'isRead' dan 'isDismissed'
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
    let userDismissedStatuses: Record<string, boolean> = {};

    if (options?.userId) {
      const userReadStatusCollectionRef = collection(db, `userNotificationStatus/${options.userId}/notificationsRead`);
      const userReadStatusSnapshot = await getDocs(userReadStatusCollectionRef);
      userReadStatusSnapshot.forEach(docSnap => {
        userReadStatuses[docSnap.id] = true;
      });

      const userDismissedStatusCollectionRef = collection(db, `userNotificationStatus/${options.userId}/notificationsDismissed`);
      const userDismissedStatusSnapshot = await getDocs(userDismissedStatusCollectionRef);
      userDismissedStatusSnapshot.forEach(docSnap => {
        userDismissedStatuses[docSnap.id] = true;
      });
    }

    querySnapshot.forEach((docSnap) => {
      const isDismissed = options?.userId ? !!userDismissedStatuses[docSnap.id] : false;
      if (!isDismissed) { // Hanya tambahkan jika belum di-dismiss
        notifications.push({
          id: docSnap.id,
          ...docSnap.data(),
          isRead: options?.userId ? !!userReadStatuses[docSnap.id] : undefined,
          isDismissed: isDismissed,
        } as AppNotification);
      }
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

export async function markNotificationAsDismissed(userId: string, notificationId: string): Promise<void | { error: string }> {
  if (!userId || !notificationId) return { error: "User ID dan Notification ID diperlukan." };
  try {
    const dismissedStatusRef = doc(db, `userNotificationStatus/${userId}/notificationsDismissed`, notificationId);
    await setDoc(dismissedStatusRef, { dismissedAt: serverTimestamp() });
    // Juga tandai sebagai dibaca saat di-dismiss
    await markNotificationAsRead(userId, notificationId);
  } catch (error: any) {
    console.error("Error marking notification as dismissed:", error);
    return { error: error.message || "Gagal menandai notifikasi sebagai dihapus." };
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    const allNotificationsQuery = query(collection(db, "notifications"), where("isGlobal", "==", true));
    const allNotificationsSnapshot = await getDocs(allNotificationsQuery);
    const allNotificationIds = allNotificationsSnapshot.docs.map(doc => doc.id);

    if (allNotificationIds.length === 0) return 0;

    const userReadStatusCollectionRef = collection(db, `userNotificationStatus/${userId}/notificationsRead`);
    const userReadStatusSnapshot = await getDocs(userReadStatusCollectionRef);
    const readNotificationIds = new Set(userReadStatusSnapshot.docs.map(doc => doc.id));

    const userDismissedStatusCollectionRef = collection(db, `userNotificationStatus/${userId}/notificationsDismissed`);
    const userDismissedStatusSnapshot = await getDocs(userDismissedStatusCollectionRef);
    const dismissedNotificationIds = new Set(userDismissedStatusSnapshot.docs.map(doc => doc.id));
    
    let unreadCount = 0;
    for (const notificationId of allNotificationIds) {
      if (!readNotificationIds.has(notificationId) && !dismissedNotificationIds.has(notificationId)) {
        unreadCount++;
      }
    }
    return unreadCount;

  } catch (error) {
    console.error("Error fetching unread notification count:", error);
    return 0; 
  }
}
