
'use server';

import {
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from './config';
import { getBranchById } from './branches';
import { deleteTransaction as apiDeleteTransaction } from './pos'; // Renamed to avoid conflict if any

export interface TransactionDeletionRequest {
  id: string; // Firestore document ID
  transactionId: string;
  transactionInvoiceNumber: string;
  transactionDate: Timestamp; // This remains Timestamp as it's what's stored/retrieved
  transactionTotalAmount: number;
  branchId: string;
  requestedByUserId: string;
  requestedByUserName: string;
  requestTimestamp: Timestamp;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  actionTakenByUserId?: string;
  actionTakenByUserName?: string;
  actionTimestamp?: Timestamp;
  rejectionAdminReason?: string;
}

// Input type from client: transactionDate is now Date
export type TransactionDeletionRequestInput = Omit<
  TransactionDeletionRequest,
  'id' | 'requestTimestamp' | 'status' | 'actionTakenByUserId' | 'actionTakenByUserName' | 'actionTimestamp' | 'rejectionAdminReason' | 'transactionDate'
> & {
  transactionDate: Date; // Changed from Timestamp to Date for client-side input
};

export async function createDeletionRequest(
  data: TransactionDeletionRequestInput
): Promise<TransactionDeletionRequest | { error: string }> {
  if (!data.transactionId) return { error: 'ID Transaksi diperlukan.' };
  if (!data.branchId) return { error: 'ID Cabang diperlukan.' };
  if (!data.requestedByUserId) return { error: 'ID Pengguna pemohon diperlukan.' };
  if (!data.reason.trim()) return { error: 'Alasan permintaan harus diisi.' };

  try {
    const now = serverTimestamp() as Timestamp;
    const requestDataForFirestore = {
      ...data,
      transactionDate: Timestamp.fromDate(data.transactionDate), // Convert Date to Timestamp
      status: 'pending' as const,
      requestTimestamp: now,
    };
    const docRef = await addDoc(collection(db, 'transactionDeletionRequests'), requestDataForFirestore);
    const clientTimestamp = Timestamp.now(); // For optimistic update if needed immediately on client
    return {
      id: docRef.id,
      ...requestDataForFirestore, // this now has transactionDate as Timestamp
      requestTimestamp: clientTimestamp
    };
  } catch (error: any) {
    console.error('Error creating deletion request:', error);
    return { error: error.message || 'Gagal membuat permintaan penghapusan.' };
  }
}

export async function getPendingDeletionRequestsByBranch(branchId: string): Promise<TransactionDeletionRequest[]> {
  if (!branchId) return [];
  try {
    const q = query(
      collection(db, 'transactionDeletionRequests'),
      where('status', '==', 'pending'),
      orderBy('requestTimestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const requests: TransactionDeletionRequest[] = [];
    querySnapshot.forEach((docSnap) => {
      requests.push({ id: docSnap.id, ...docSnap.data() } as TransactionDeletionRequest);
    });
    return requests;
  } catch (error) {
    console.error('Error fetching pending deletion requests:', error);
    return [];
  }
}

export async function approveDeletionRequest(
  requestId: string,
  adminUserId: string,
  adminUserName: string,
  branchDeletionPasswordAttempt: string
): Promise<{ success?: boolean; error?: string }> {
  if (!requestId) return { error: "ID Permintaan tidak valid." };
  if (!adminUserId || !adminUserName) return { error: "Detail admin tidak lengkap." };
  if (!branchDeletionPasswordAttempt) return { error: "Password hapus cabang diperlukan."};

  const requestRef = doc(db, 'transactionDeletionRequests', requestId);
  try {
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) {
      return { error: "Permintaan penghapusan tidak ditemukan." };
    }
    const requestData = requestSnap.data() as TransactionDeletionRequest;

    if (requestData.status !== 'pending') {
      return { error: `Permintaan ini sudah ${requestData.status === 'approved' ? 'disetujui' : 'ditolak'}.` };
    }

    const deleteResult = await apiDeleteTransaction(
      requestData.transactionId,
      requestData.branchId,
      branchDeletionPasswordAttempt
    );

    if (deleteResult.success) {
      await updateDoc(requestRef, {
        status: 'approved',
        actionTakenByUserId: adminUserId,
        actionTakenByUserName: adminUserName,
        actionTimestamp: serverTimestamp(),
      });
      return { success: true };
    } else {
      return { error: deleteResult.error || "Gagal menghapus transaksi terkait." };
    }
  } catch (error: any) {
    console.error('Error approving deletion request:', error);
    return { error: error.message || 'Gagal menyetujui permintaan penghapusan.' };
  }
}

export async function rejectDeletionRequest(
  requestId: string,
  adminUserId: string,
  adminUserName: string,
  adminRejectionReason?: string
): Promise<{ success?: boolean; error?: string }> {
  if (!requestId) return { error: "ID Permintaan tidak valid." };
  if (!adminUserId || !adminUserName) return { error: "Detail admin tidak lengkap." };

  const requestRef = doc(db, 'transactionDeletionRequests', requestId);
  try {
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) {
      return { error: "Permintaan penghapusan tidak ditemukan." };
    }
     const requestData = requestSnap.data() as TransactionDeletionRequest;
    if (requestData.status !== 'pending') {
      return { error: `Permintaan ini sudah ${requestData.status === 'approved' ? 'disetujui' : 'ditolak'}.` };
    }

    await updateDoc(requestRef, {
      status: 'rejected',
      actionTakenByUserId: adminUserId,
      actionTakenByUserName: adminUserName,
      actionTimestamp: serverTimestamp(),
      rejectionAdminReason: adminRejectionReason || "",
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting deletion request:', error);
    return { error: error.message || 'Gagal menolak permintaan penghapusan.' };
  }
}
