
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
  transactionDate: string; // Changed from Timestamp
  transactionTotalAmount: number;
  branchId: string;
  requestedByUserId: string;
  requestedByUserName: string;
  requestTimestamp: string; // Changed from Timestamp
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  actionTakenByUserId?: string;
  actionTakenByUserName?: string;
  actionTimestamp?: string; // Changed from Timestamp
  rejectionAdminReason?: string;
}

// Input type from client: transactionDate is Date
export type TransactionDeletionRequestInput = Omit<
  TransactionDeletionRequest,
  'id' | 'requestTimestamp' | 'status' | 'actionTakenByUserId' | 'actionTakenByUserName' | 'actionTimestamp' | 'rejectionAdminReason' | 'transactionDate' | 'requestTimestamp'
> & {
  transactionDate: Date; // Input from client is Date
};

export async function createDeletionRequest(
  data: TransactionDeletionRequestInput
): Promise<TransactionDeletionRequest | { error: string }> {
  if (!data.transactionId) return { error: 'ID Transaksi diperlukan.' };
  if (!data.branchId) return { error: 'ID Cabang diperlukan.' };
  if (!data.requestedByUserId) return { error: 'ID Pengguna pemohon diperlukan.' };
  if (!data.reason.trim()) return { error: 'Alasan permintaan harus diisi.' };

  try {
    const nowServer = serverTimestamp() as Timestamp;
    const nowClient = Timestamp.now(); // For immediate return if needed

    const requestDataForFirestore = {
      ...data,
      transactionDate: Timestamp.fromDate(data.transactionDate), // Convert Date to Timestamp for Firestore
      status: 'pending' as const,
      requestTimestamp: nowServer,
    };
    const docRef = await addDoc(collection(db, 'transactionDeletionRequests'), requestDataForFirestore);
    
    // Prepare the object to return, converting Timestamps to strings for client compatibility
    return {
      id: docRef.id,
      transactionId: data.transactionId,
      transactionInvoiceNumber: data.transactionInvoiceNumber,
      transactionDate: data.transactionDate.toISOString(), // Convert original Date input to ISO string
      transactionTotalAmount: data.transactionTotalAmount,
      branchId: data.branchId,
      requestedByUserId: data.requestedByUserId,
      requestedByUserName: data.requestedByUserName,
      requestTimestamp: nowClient.toDate().toISOString(), // Convert client-side Timestamp to ISO string
      reason: data.reason,
      status: 'pending' as const,
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
      where('branchId', '==', branchId),
      // where('status', '==', 'pending'), // Temporarily remove to see all for debugging
      orderBy('requestTimestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const requests: TransactionDeletionRequest[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      requests.push({ 
        id: docSnap.id,
        transactionId: data.transactionId,
        transactionInvoiceNumber: data.transactionInvoiceNumber,
        transactionDate: (data.transactionDate as Timestamp).toDate().toISOString(),
        transactionTotalAmount: data.transactionTotalAmount,
        branchId: data.branchId,
        requestedByUserId: data.requestedByUserId,
        requestedByUserName: data.requestedByUserName,
        requestTimestamp: (data.requestTimestamp as Timestamp).toDate().toISOString(),
        reason: data.reason,
        status: data.status,
        actionTakenByUserId: data.actionTakenByUserId,
        actionTakenByUserName: data.actionTakenByUserName,
        actionTimestamp: data.actionTimestamp ? (data.actionTimestamp as Timestamp).toDate().toISOString() : undefined,
        rejectionAdminReason: data.rejectionAdminReason,
      } as TransactionDeletionRequest);
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
    const requestData = requestSnap.data() as Omit<TransactionDeletionRequest, 'transactionDate' | 'requestTimestamp' | 'actionTimestamp'> & {
        transactionDate: Timestamp; requestTimestamp: Timestamp; actionTimestamp?: Timestamp; // Firestore types
    };


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
     const requestData = requestSnap.data() as TransactionDeletionRequest; // Assuming it's already converted type by now for this check
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
