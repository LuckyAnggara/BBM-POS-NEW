
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
} from "firebase/firestore";
import { db } from "./config";
import type { UserData } from "@/contexts/auth-context"; // Untuk createdBy

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
  targetBranchId?: string | null; // Untuk masa depan jika ingin target per cabang
}

export interface AppNotification extends AppNotificationInput {
  id: string;
  createdAt: Timestamp;
  isRead?: boolean; // Untuk pengembangan fitur "tandai sudah dibaca" di masa depan
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

  try {
    const now = serverTimestamp() as Timestamp;
    const dataToSave = {
      ...notificationData,
      isGlobal: true, // Selalu global untuk saat ini
      targetBranchId: null, // Selalu null untuk saat ini
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
  startAfterDocId?: string; // Untuk pagination masa depan
}): Promise<AppNotification[]> {
  try {
    const qConstraints: any[] = [orderBy("createdAt", "desc")];

    if (options?.limitResults) {
      qConstraints.push(limit(options.limitResults));
    }
    //  Implement startAfter for pagination if needed later

    const q = query(collection(db, "notifications"), ...qConstraints);
    const querySnapshot = await getDocs(q);
    const notifications: AppNotification[] = [];
    querySnapshot.forEach((docSnap) => {
      notifications.push({
        id: docSnap.id,
        ...docSnap.data(),
      } as AppNotification);
    });
    return notifications;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

// Fungsi untuk menandai notifikasi sebagai sudah dibaca (untuk pengembangan masa depan)
// export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void | { error: string }> {
//   // Ini memerlukan struktur data yang berbeda, misal subkoleksi 'readBy' di setiap notifikasi
//   // atau daftar notifikasi yang sudah dibaca per pengguna.
//   // Untuk saat ini, fungsi ini hanya sebagai placeholder.
//   console.log(`User ${userId} marked notification ${notificationId} as read (placeholder).`);
//   return;
// }
