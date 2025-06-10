
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
  price: number; // Price per unit after item discount
  costPrice: number;
  total: number; // quantity * price
  originalPrice?: number; // Price before item discount
  discountAmount?: number; // Amount of discount for this item
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
  subtotal: number; // Subtotal after item discounts but before overall voucher/shipping
  taxAmount: number;
  shippingCost?: number;
  voucherCode?: string | null; // Allow null
  voucherDiscountAmount?: number;
  totalDiscountAmount?: number; // Sum of all item discounts + voucher discount
  totalAmount: number; // Final amount after all discounts and shipping
  totalCost: number;
  paymentTerms: PaymentTerms;
  customerId?: string;
  customerName?: string | null; // Allow null
  creditDueDate?: Timestamp | null; // Allow null
  isCreditSale?: boolean;
  outstandingAmount?: number;
  paymentStatus?: PaymentStatus;
  paymentsMade?: TransactionPayment[];
  amountPaid: number;
  changeGiven: number;
  invoiceNumber: string;
  status: 'completed' | 'returned';
  returnedAt?: Timestamp;
  returnReason?: string | null; // Allow null
  returnedByUserId?: string;
  bankName?: string | null; // Allow null
  bankTransactionRef?: string | null; // Allow null
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
      shippingCost: transactionInput.shippingCost || 0,
      voucherCode: transactionInput.voucherCode || null, // Changed undefined to null
      voucherDiscountAmount: transactionInput.voucherDiscountAmount || 0,
      totalDiscountAmount: transactionInput.totalDiscountAmount || 0,
      totalAmount: transactionInput.totalAmount,
      totalCost: transactionInput.totalCost,
      paymentTerms: transactionInput.paymentTerms,
      amountPaid: transactionInput.amountPaid,
      changeGiven: transactionInput.changeGiven,
      invoiceNumber,
      status: 'completed',
      paymentsMade: [], 
      timestamp: serverTimestamp() as Timestamp,
      // Explicitly set optional fields to null if not provided or empty, or use their value
      customerId: transactionInput.customerId || null,
      customerName: transactionInput.customerName?.trim() ? transactionInput.customerName.trim() : null,
      creditDueDate: transactionInput.creditDueDate || null,
      isCreditSale: transactionInput.isCreditSale ?? false,
      outstandingAmount: transactionInput.outstandingAmount ?? (transactionInput.isCreditSale ? transactionInput.totalAmount : 0),
      paymentStatus: transactionInput.paymentStatus ?? (transactionInput.isCreditSale ? 'unpaid' : 'paid'),
      bankName: transactionInput.bankName?.trim() ? transactionInput.bankName.trim() : null,
      bankTransactionRef: transactionInput.bankTransactionRef?.trim() ? transactionInput.bankTransactionRef.trim() : null,
    };

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
    // Re-fetch the document to get server-generated timestamps and ensure all fields are correctly populated
    const savedDoc = await getDoc(transactionRef);
    if (savedDoc.exists()) {
        return { id: savedDoc.id, ...savedDoc.data() } as PosTransaction;
    } else {
        // This case should ideally not happen if batch.commit() was successful
        return { error: "Gagal mengambil transaksi yang baru direkam setelah penyimpanan."};
    }
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

    if (transactionData.status === 'completed') {
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
    where("paymentStatus", "in", ["unpaid", "partially_paid"]), 
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

    
