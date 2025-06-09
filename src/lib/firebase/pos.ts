
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc, getDocs, updateDoc, query, where, deleteDoc, writeBatch, orderBy, limit, arrayUnion } from "firebase/firestore";
import { db } from "./config";
import type { InventoryItem } from "./inventory";
import type { Branch } from "@/contexts/branch-context";
import { getBranchById } from "./branches";
import type { QueryOptions } from "./types";


export type ShiftPaymentMethod = 'cash' | 'card' | 'transfer'; // For shift reporting
export type PaymentTerms = 'cash' | 'card' | 'transfer' | 'credit'; // For transaction recording
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'returned';


export interface PosShift {
  id: string;
  userId: string;
  branchId: string;
  startTime: Timestamp;
  initialCash: number;
  status: 'active' | 'ended';
  endTime?: Timestamp;
  expectedCashAtEnd?: number;
  actualCashAtEnd?: number;
  cashDifference?: number;
  totalSalesByPaymentMethod?: Record<ShiftPaymentMethod, number>;
}

export async function startNewShift(userId: string, branchId: string, initialCash: number): Promise<PosShift | { error: string }> {
  if (!userId || !branchId) return { error: "User ID dan Branch ID diperlukan." };
  if (initialCash < 0) return { error: "Modal awal tidak boleh negatif." };
  try {
    const shiftData: Omit<PosShift, 'id'> = {
      userId,
      branchId,
      startTime: serverTimestamp() as Timestamp,
      initialCash,
      status: 'active',
      totalSalesByPaymentMethod: { cash: 0, card: 0, transfer: 0},
    };
    const shiftRef = await addDoc(collection(db, "posShifts"), shiftData);
    return { id: shiftRef.id, ...shiftData, startTime: Timestamp.now() };
  } catch (error: any) {
    console.error("Error starting new shift:", error);
    return { error: error.message || "Gagal memulai shift baru." };
  }
}

export async function getActiveShift(userId: string, branchId: string): Promise<PosShift | null> {
  if (!userId || !branchId) return null;
  try {
    const q = query(
      collection(db, "posShifts"),
      where("userId", "==", userId),
      where("branchId", "==", branchId),
      where("status", "==", "active"),
      orderBy("startTime", "desc"),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docData = querySnapshot.docs[0].data();
      return { id: querySnapshot.docs[0].id, ...docData } as PosShift;
    }
    return null;
  } catch (error: any) {
    console.error("Error fetching active shift:", error);
    return null;
  }
}

export async function endShift(
  shiftId: string,
  actualCashAtEnd: number,
  expectedCashAtEnd: number,
  cashDifference: number,
  totalSalesByPaymentMethod: Record<ShiftPaymentMethod, number>
): Promise<void | { error: string }> {
  if (!shiftId) return { error: "Shift ID tidak valid." };
  try {
    const shiftRef = doc(db, "posShifts", shiftId);
    await updateDoc(shiftRef, {
      status: 'ended',
      endTime: serverTimestamp(),
      actualCashAtEnd,
      expectedCashAtEnd,
      cashDifference,
      totalSalesByPaymentMethod,
    });
  } catch (error: any) {
    console.error("Error ending shift:", error);
    return { error: error.message || "Gagal mengakhiri shift." };
  }
}

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  costPrice: number;
  total: number;
}

export interface TransactionPayment {
  paymentDate: Timestamp;
  amountPaid: number;
  paymentMethod: 'cash' | 'transfer' | 'card' | 'other';
  notes?: string;
  recordedByUserId: string;
}

export interface PosTransaction {
  id: string;
  shiftId: string;
  branchId: string;
  userId: string;
  timestamp: Timestamp;
  items: TransactionItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  totalCost: number;
  paymentTerms: PaymentTerms;
  customerId?: string;
  customerName?: string;
  creditDueDate?: Timestamp;
  isCreditSale?: boolean;
  outstandingAmount?: number;
  paymentStatus?: PaymentStatus;
  paymentsMade?: TransactionPayment[];
  amountPaid: number;
  changeGiven: number;
  invoiceNumber: string;
  status: 'completed' | 'returned';
  returnedAt?: Timestamp;
  returnReason?: string;
  returnedByUserId?: string;
  bankName?: string;
  bankTransactionRef?: string;
}

export async function recordTransaction(
  transactionInput: Omit<PosTransaction, 'id' | 'invoiceNumber' | 'timestamp' | 'status' | 'returnedAt' | 'returnReason' | 'returnedByUserId' | 'paymentsMade'>
): Promise<PosTransaction | { error: string }> {
  if (!transactionInput.shiftId || !transactionInput.branchId || !transactionInput.userId) {
    return { error: "Shift ID, Branch ID, dan User ID diperlukan untuk transaksi." };
  }
  if (transactionInput.items.length === 0) return { error: "Transaksi tidak memiliki item." };

  const batch = writeBatch(db);

  try {
    const transactionRef = doc(collection(db, "posTransactions"));
    const invoiceNumber = `INV-${transactionRef.id.substring(0, 8).toUpperCase()}`;

    const dataToSave: Omit<PosTransaction, 'id'> = {
      shiftId: transactionInput.shiftId,
      branchId: transactionInput.branchId,
      userId: transactionInput.userId,
      items: transactionInput.items,
      subtotal: transactionInput.subtotal,
      taxAmount: transactionInput.taxAmount,
      totalAmount: transactionInput.totalAmount,
      totalCost: transactionInput.totalCost,
      paymentTerms: transactionInput.paymentTerms,
      amountPaid: transactionInput.amountPaid,
      changeGiven: transactionInput.changeGiven,
      invoiceNumber,
      status: 'completed',
      paymentsMade: [],
      timestamp: serverTimestamp() as Timestamp,
    };

    if (transactionInput.customerId) dataToSave.customerId = transactionInput.customerId;
    if (transactionInput.customerName) dataToSave.customerName = transactionInput.customerName;
    if (transactionInput.creditDueDate) dataToSave.creditDueDate = transactionInput.creditDueDate;
    if (transactionInput.isCreditSale !== undefined) {
        dataToSave.isCreditSale = transactionInput.isCreditSale;
        if (transactionInput.isCreditSale) {
            dataToSave.paymentStatus = 'unpaid';
            dataToSave.outstandingAmount = transactionInput.totalAmount;
            dataToSave.paymentsMade = [];
        } else {
            dataToSave.paymentStatus = 'paid';
            dataToSave.outstandingAmount = 0;
        }
    } else {
        dataToSave.paymentStatus = 'paid'; // Default to paid if not credit sale
        dataToSave.outstandingAmount = 0;
    }


    if (transactionInput.bankName && transactionInput.bankName.trim() !== "") dataToSave.bankName = transactionInput.bankName;
    if (transactionInput.bankTransactionRef && transactionInput.bankTransactionRef.trim() !== "") dataToSave.bankTransactionRef = transactionInput.bankTransactionRef;


    batch.set(transactionRef, dataToSave);

    for (const item of transactionInput.items) {
      const productRef = doc(db, "inventoryItems", item.productId);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        const currentStock = productSnap.data().quantity as number;
        const newStock = currentStock - item.quantity;
        batch.update(productRef, { quantity: newStock < 0 ? 0 : newStock, updatedAt: serverTimestamp() });
      } else {
        console.warn(`Product with ID ${item.productId} not found in inventory. Stock not updated.`);
      }
    }

    await batch.commit();
    return { id: transactionRef.id, ...dataToSave, timestamp: Timestamp.now() };
  } catch (error: any) {
    console.error("Error recording transaction:", error);
    return { error: error.message || "Gagal merekam transaksi." };
  }
}


export async function processFullTransactionReturn(transactionId: string, reason: string, returnedByUserId: string): Promise<void | { error: string }> {
  if (!transactionId) return { error: "ID Transaksi tidak valid." };
  if (!reason.trim()) return { error: "Alasan retur harus diisi." };
  if (!returnedByUserId) return { error: "ID Pengguna yang memproses retur diperlukan." };

  const transactionRef = doc(db, "posTransactions", transactionId);
  const batch = writeBatch(db);

  try {
    const transactionSnap = await getDoc(transactionRef);
    if (!transactionSnap.exists()) {
      return { error: "Transaksi tidak ditemukan." };
    }

    const transactionData = transactionSnap.data() as PosTransaction;
    if (transactionData.status === 'returned') {
      return { error: "Transaksi ini sudah pernah diretur." };
    }

    batch.update(transactionRef, {
      status: 'returned',
      returnReason: reason,
      returnedAt: serverTimestamp(),
      returnedByUserId: returnedByUserId,
      outstandingAmount: 0,
      paymentStatus: 'returned',
    });

    for (const item of transactionData.items) {
      const productRef = doc(db, "inventoryItems", item.productId);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        const currentStock = productSnap.data().quantity as number;
        const newStock = currentStock + item.quantity;
        batch.update(productRef, { quantity: newStock, updatedAt: serverTimestamp() });
      } else {
        console.warn(`Product with ID ${item.productId} not found while processing return. Stock not restored.`);
      }
    }

    await batch.commit();
  } catch (error: any) {
    console.error("Error processing transaction return:", error);
    return { error: error.message || "Gagal memproses retur transaksi." };
  }
}

export async function deleteTransaction(transactionId: string, branchId: string, passwordAttempt: string): Promise<{ success?: boolean; error?: string }> {
  if (!transactionId) return { error: "ID Transaksi tidak valid." };
  if (!branchId) return { error: "ID Cabang tidak valid." };
  if (!passwordAttempt) return { error: "Password hapus diperlukan." };

  const batch = writeBatch(db);
  try {
    const branchDoc = await getBranchById(branchId);
    if (!branchDoc) {
      return { error: "Data cabang tidak ditemukan." };
    }
    if (!branchDoc.transactionDeletionPassword) {
      return { error: "Password hapus belum diatur untuk cabang ini. Silakan atur di Pengaturan Admin." };
    }
    if (branchDoc.transactionDeletionPassword !== passwordAttempt) {
      return { error: "Password hapus transaksi salah." };
    }

    const transactionRef = doc(db, "posTransactions", transactionId);
    const transactionSnap = await getDoc(transactionRef);
    if (!transactionSnap.exists()) {
      return { error: "Transaksi tidak ditemukan." };
    }
    const transactionData = transactionSnap.data() as PosTransaction;

    if (transactionData.status !== 'returned') {
      for (const item of transactionData.items) {
        const productRef = doc(db, "inventoryItems", item.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const currentStock = productSnap.data().quantity as number;
          const newStock = currentStock + item.quantity;
          batch.update(productRef, { quantity: newStock, updatedAt: serverTimestamp() });
        } else {
          console.warn(`Product with ID ${item.productId} not found while deleting transaction. Stock not restored.`);
        }
      }
    }

    batch.delete(transactionRef);

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting transaction:", error);
    return { error: error.message || "Gagal menghapus transaksi." };
  }
}


export async function getTransactionById(transactionId: string): Promise<PosTransaction | null> {
    if (!transactionId) return null;
    try {
        const transactionRef = doc(db, "posTransactions", transactionId);
        const docSnap = await getDoc(transactionRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
            } as PosTransaction;
        }
        return null;
    } catch (error) {
        console.error("Error fetching transaction by ID:", error);
        return null;
    }
}

export async function getTransactionsForUserByBranch(
    userId: string,
    branchId: string,
    options: QueryOptions = {}
): Promise<PosTransaction[]> {
    if (!userId || !branchId) return [];

    let constraints: any[] = [
        where("branchId", "==", branchId)
    ];
    
    // If current user is not admin, filter by their userId. Admin sees all for the branch.
    // This logic might need adjustment if admins should also be filtered by their own transactions
    // or if there's a specific "all users" view. For now, assuming non-admins only see their own.
    // const user = auth.currentUser; // This might be better obtained from AuthContext
    // if (user && (await getUserDocument(user.uid))?.role !== 'admin') {
    //   constraints.push(where("userId", "==", userId));
    // }
    // Temporarily removing role check here for simplicity in this function.
    // The page level should enforce if only user's transactions are shown or all (for admin).
    // For now, this function could be generic for a branch, and the page calls it with/without userId filter.
    // Let's assume SalesHistory page will always pass the current user's ID for non-admin roles.
    // constraints.push(where("userId", "==", userId));


    if (options.startDate && options.endDate) {
        const startTimestamp = Timestamp.fromDate(options.startDate);
        const endOfDayEndDate = new Date(options.endDate);
        endOfDayEndDate.setHours(23, 59, 59, 999);
        const endTimestamp = Timestamp.fromDate(endOfDayEndDate);
        constraints.push(where("timestamp", ">=", startTimestamp));
        constraints.push(where("timestamp", "<=", endTimestamp));
    }

    if (options.orderByField) {
        constraints.push(orderBy(options.orderByField, options.orderDirection || 'desc'));
    } else {
        constraints.push(orderBy("timestamp", options.orderDirection || "desc"));
    }

    if (options.limit && !(options.startDate && options.endDate)) {
        constraints.push(limit(options.limit));
    }

    try {
        const q = query(collection(db, "posTransactions"), ...constraints);
        const querySnapshot = await getDocs(q);
        const transactions: PosTransaction[] = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            transactions.push({
                id: docSnap.id,
                ...data,
            } as PosTransaction);
        });
        return transactions;
    } catch (error) {
        console.error("Error fetching transactions for user by branch:", error);
        return [];
    }
}


export async function getShiftsForUserByBranch(
    userId: string,
    branchId: string,
    options: QueryOptions = {}
): Promise<PosShift[]> {
    if (!userId || !branchId) return [];
    try {
        const constraints: any[] = [
            where("userId", "==", userId),
            where("branchId", "==", branchId)
        ];

        if (options.startDate && options.endDate) {
            const startOfDayStartDate = new Date(options.startDate);
            startOfDayStartDate.setHours(0, 0, 0, 0);
            const startTimestamp = Timestamp.fromDate(startOfDayStartDate);

            const endOfDayEndDate = new Date(options.endDate);
            endOfDayEndDate.setHours(23, 59, 59, 999);
            const endTimestamp = Timestamp.fromDate(endOfDayEndDate);
            
            constraints.push(where("startTime", ">=", startTimestamp));
            constraints.push(where("startTime", "<=", endTimestamp));
        }


        if (options.orderByField) {
            constraints.push(orderBy(options.orderByField, options.orderDirection || 'desc'));
        } else {
            constraints.push(orderBy("startTime", "desc")); // Default order
        }

        if (options.limit && !(options.startDate && options.endDate)) { // Apply limit only if not a specific date range
            constraints.push(limit(options.limit));
        }


        const q = query(collection(db, "posShifts"), ...constraints);
        const querySnapshot = await getDocs(q);
        const shifts: PosShift[] = [];
        querySnapshot.forEach((docSnap) => {
            shifts.push({ id: docSnap.id, ...docSnap.data() } as PosShift);
        });
        return shifts;
    } catch (error) {
        console.error("Error fetching shifts for user by branch:", error);
        return [];
    }
}

export async function getTransactionsForShift(shiftId: string): Promise<PosTransaction[]> {
  if (!shiftId) return [];
  try {
    const q = query(collection(db, "posTransactions"), where("shiftId", "==", shiftId), orderBy("timestamp", "asc"));
    const querySnapshot = await getDocs(q);
    const transactions: PosTransaction[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      transactions.push({
          id: docSnap.id,
          ...data,
       } as PosTransaction);
    });
    return transactions;
  } catch (error) {
    console.error("Error fetching transactions for shift:", error);
    return [];
  }
}

export async function getTransactionsByDateRangeAndBranch(
  branchId: string,
  startDate: Date,
  endDate: Date
): Promise<PosTransaction[]> {
  if (!branchId || !startDate || !endDate) return [];
  try {
    const startTimestamp = Timestamp.fromDate(startDate);
    const endOfDayEndDate = new Date(endDate);
    endOfDayEndDate.setHours(23, 59, 59, 999);
    const endTimestamp = Timestamp.fromDate(endOfDayEndDate);

    const q = query(
      collection(db, "posTransactions"),
      where("branchId", "==", branchId),
      where("timestamp", ">=", startTimestamp),
      where("timestamp", "<=", endTimestamp),
      orderBy("timestamp", "asc")
    );
    const querySnapshot = await getDocs(q);
    const transactions: PosTransaction[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      transactions.push({
          id: docSnap.id,
          ...data,
       } as PosTransaction);
    });
    return transactions;
  } catch (error) {
    console.error("Error fetching transactions by date range and branch:", error);
    return [];
  }
}


export async function getOutstandingCreditSalesByBranch(
  branchId: string,
  options: QueryOptions = {}
): Promise<PosTransaction[]> {
  if (!branchId) return [];

  const constraints: any[] = [
    where("branchId", "==", branchId),
    where("isCreditSale", "==", true),
    where("paymentStatus", "in", ["unpaid", "partially_paid"]), // Only get sales that are not fully paid or returned
  ];

  if (options.orderByField) {
    constraints.push(orderBy(options.orderByField, options.orderDirection || 'desc'));
  } else {
    constraints.push(orderBy("timestamp", "desc"));
  }

  if (options.limit) {
    constraints.push(limit(options.limit));
  }

  try {
    const q = query(collection(db, "posTransactions"), ...constraints);
    const querySnapshot = await getDocs(q);
    const transactions: PosTransaction[] = [];
    querySnapshot.forEach((docSnap) => {
      transactions.push({ id: docSnap.id, ...docSnap.data() } as PosTransaction);
    });
    return transactions;
  } catch (error) {
    console.error("Error fetching outstanding credit sales:", error);
    return [];
  }
}

export async function recordPaymentForCreditSale(
  transactionId: string,
  paymentDetails: Omit<TransactionPayment, 'paymentDate'> & { paymentDate: Date, recordedByUserId: string }
): Promise<void | { error: string }> {
  if (!transactionId) return { error: "ID Transaksi tidak valid." };
  if (!paymentDetails.amountPaid || paymentDetails.amountPaid <= 0) {
    return { error: "Jumlah pembayaran tidak valid." };
  }

  const transactionRef = doc(db, "posTransactions", transactionId);

  try {
    const transactionSnap = await getDoc(transactionRef);
    if (!transactionSnap.exists()) {
      return { error: "Transaksi penjualan kredit tidak ditemukan." };
    }
    const transactionData = transactionSnap.data() as PosTransaction;

    if (transactionData.paymentStatus === 'paid' || transactionData.paymentStatus === 'returned') {
        return { error: `Transaksi ini sudah ${transactionData.paymentStatus === 'paid' ? 'lunas' : 'diretur'}.`};
    }

    const newOutstandingAmount = (transactionData.outstandingAmount || 0) - paymentDetails.amountPaid;
    let newPaymentStatus: PaymentStatus = transactionData.paymentStatus || 'unpaid';

    if (newOutstandingAmount <= 0) {
      newPaymentStatus = 'paid';
    } else {
      newPaymentStatus = 'partially_paid';
    }

    const paymentRecord: TransactionPayment = {
      ...paymentDetails,
      paymentDate: Timestamp.fromDate(paymentDetails.paymentDate),
    };

    await updateDoc(transactionRef, {
      outstandingAmount: newOutstandingAmount < 0 ? 0 : newOutstandingAmount,
      paymentStatus: newPaymentStatus,
      paymentsMade: arrayUnion(paymentRecord),
      updatedAt: serverTimestamp(),
    });

  } catch (error: any) {
    console.error("Error recording payment for credit sale:", error);
    return { error: error.message || "Gagal merekam pembayaran." };
  }
}
