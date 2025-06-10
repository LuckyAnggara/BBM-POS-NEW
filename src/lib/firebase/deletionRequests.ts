
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
} from 'firebase/firestore';
import { db } from './config';

export interface TransactionDeletionRequest {
  id: string; // Firestore document ID
  transactionId: string;
  transactionInvoiceNumber: string;
  transactionDate: Timestamp;
  transactionTotalAmount: number;
  branchId: string;
  requestedByUserId: string;
  requestedByUserName: string;
  requestTimestamp: Timestamp;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  // Admin action fields - to be used later
  actionTakenByUserId?: string;
  actionTakenByUserName?: string;
  actionTimestamp?: Timestamp;
  rejectionAdminReason?: string;
}

export type TransactionDeletionRequestInput = Omit<
  TransactionDeletionRequest,
  'id' | 'requestTimestamp' | 'status' | 'actionTakenByUserId' | 'actionTakenByUserName' | 'actionTimestamp' | 'rejectionAdminReason'
>;

export async function createDeletionRequest(
  data: TransactionDeletionRequestInput
): Promise<TransactionDeletionRequest | { error: string }> {
  if (!data.transactionId) return { error: 'ID Transaksi diperlukan.' };
  if (!data.branchId) return { error: 'ID Cabang diperlukan.' };
  if (!data.requestedByUserId) return { error: 'ID Pengguna pemohon diperlukan.' };
  if (!data.reason.trim()) return { error: 'Alasan permintaan harus diisi.' };

  try {
    const now = serverTimestamp() as Timestamp;
    const requestData = {
      ...data,
      status: 'pending' as const,
      requestTimestamp: now,
    };
    const docRef = await addDoc(collection(db, 'transactionDeletionRequests'), requestData);
    const clientTimestamp = Timestamp.now();
    return { 
      id: docRef.id, 
      ...requestData, 
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
      where('branchId', '==', branchId),
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

// Functions for approve/reject will be added later
// export async function approveDeletionRequest(...)
// export async function rejectDeletionRequest(...)
