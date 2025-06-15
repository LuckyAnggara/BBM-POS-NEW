
'use server';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc, getDocs, updateDoc, query, where, deleteDoc, writeBatch, orderBy, limit, arrayUnion, runTransaction } from "firebase/firestore";
import { db } from "./config";
import type { InventoryItem } from "./inventory";
import type { Branch } from "@/contexts/branch-context";
import { getBranchById } from "./branches";
import type { QueryOptions } from "./types";
import { prepareStockMutationData, type StockMutationInput } from "./stockMutations";

export type ShiftPaymentMethod = 'cash' | 'card' | 'transfer';
export type PaymentTerms = 'cash' | 'card' | 'transfer' | 'credit';
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

// Client-side version of PosShift with string dates
export interface ClientPosShift {
  id: string;
  userId: string;
  branchId: string;
  startTime: string; // ISO string
  initialCash: number;
  status: 'active' | 'ended';
  endTime?: string; // ISO string
  expectedCashAtEnd?: number;
  actualCashAtEnd?: number;
  cashDifference?: number;
  totalSalesByPaymentMethod?: Record<ShiftPaymentMethod, number>;
}

export async function startNewShift(userId: string, branchId: string, initialCash: number): Promise<ClientPosShift | { error: string }> {
  if (!userId || !branchId) return { error: "User ID dan Branch ID diperlukan." };
  if (initialCash < 0) return { error: "Modal awal tidak boleh negatif." };
  try {
    const serverNow = serverTimestamp() as Timestamp;
    const clientNow = Timestamp.now().toDate().toISOString();

    const shiftData: Omit<PosShift, 'id'> = {
      userId,
      branchId,
      startTime: serverNow,
      initialCash,
      status: 'active',
      totalSalesByPaymentMethod: { cash: 0, card: 0, transfer: 0},
    };
    const shiftRef = await addDoc(collection(db, "posShifts"), shiftData);
    return {
      id: shiftRef.id,
      userId,
      branchId,
      startTime: clientNow, // Return ISO string
      initialCash,
      status: 'active',
      totalSalesByPaymentMethod: { cash: 0, card: 0, transfer: 0},
    };
  } catch (error: any) {
    console.error("Error starting new shift:", error);
    return { error: error.message || "Gagal memulai shift baru." };
  }
}

export async function getActiveShift(userId: string, branchId: string): Promise<ClientPosShift | null> {
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
      const docData = querySnapshot.docs[0].data() as PosShift;
      return {
        id: querySnapshot.docs[0].id,
        ...docData,
        startTime: docData.startTime.toDate().toISOString(),
        endTime: docData.endTime?.toDate().toISOString(),
      } as ClientPosShift;
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
  originalPrice?: number;
  discountAmount?: number;
}

export interface TransactionPayment {
  paymentDate: Timestamp;
  notes?: string;
  recordedByUserId: string;
  amountPaid: number;
  paymentMethod: 'cash' | 'transfer' | 'card' | 'other';
}

export interface ClientTransactionPayment extends Omit<TransactionPayment, 'paymentDate'> {
  paymentDate: string; // ISO string
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
  shippingCost?: number;
  voucherCode?: string | null;
  voucherDiscountAmount?: number;
  totalDiscountAmount?: number;
  totalAmount: number;
  totalCost: number;
  paymentTerms: PaymentTerms;
  customerId?: string;
  customerName?: string | null;
  creditDueDate?: Timestamp | null;
  isCreditSale?: boolean;
  outstandingAmount?: number;
  paymentStatus?: PaymentStatus;
  paymentsMade?: TransactionPayment[];
  amountPaid: number;
  changeGiven: number;
  invoiceNumber: string;
  status: 'completed' | 'returned';
  returnedAt?: Timestamp;
  returnReason?: string | null;
  returnedByUserId?: string;
  bankName?: string | null;
  bankTransactionRef?: string | null;
}

export interface ClientPosTransaction extends Omit<PosTransaction, 'timestamp' | 'creditDueDate' | 'returnedAt' | 'paymentsMade'> {
  timestamp: string; // ISO string
  creditDueDate?: string | null; // ISO string
  returnedAt?: string; // ISO string
  paymentsMade?: ClientTransactionPayment[];
}


const mapPosTransactionToClient = (docSnap: firebase.firestore.DocumentSnapshot): ClientPosTransaction => {
    const data = docSnap.data() as PosTransaction; // Assume data fetched is of PosTransaction type
    return {
      id: docSnap.id,
      shiftId: data.shiftId,
      branchId: data.branchId,
      userId: data.userId,
      timestamp: data.timestamp.toDate().toISOString(),
      items: data.items,
      subtotal: data.subtotal,
      taxAmount: data.taxAmount,
      shippingCost: data.shippingCost,
      voucherCode: data.voucherCode,
      voucherDiscountAmount: data.voucherDiscountAmount,
      totalDiscountAmount: data.totalDiscountAmount,
      totalAmount: data.totalAmount,
      totalCost: data.totalCost,
      paymentTerms: data.paymentTerms,
      customerId: data.customerId,
      customerName: data.customerName,
      creditDueDate: data.creditDueDate?.toDate().toISOString() || null,
      isCreditSale: data.isCreditSale,
      outstandingAmount: data.outstandingAmount,
      paymentStatus: data.paymentStatus,
      paymentsMade: data.paymentsMade?.map(pmt => ({
        ...pmt,
        paymentDate: pmt.paymentDate.toDate().toISOString(),
      })),
      amountPaid: data.amountPaid,
      changeGiven: data.changeGiven,
      invoiceNumber: data.invoiceNumber,
      status: data.status,
      returnedAt: data.returnedAt?.toDate().toISOString(),
      returnReason: data.returnReason,
      returnedByUserId: data.returnedByUserId,
      bankName: data.bankName,
      bankTransactionRef: data.bankTransactionRef,
    };
};


export async function recordTransaction(
  transactionInput: Omit<PosTransaction, 'id' | 'invoiceNumber' | 'timestamp' | 'status' | 'returnedAt' | 'returnReason' | 'returnedByUserId' | 'paymentsMade'>,
  userName?: string
): Promise<ClientPosTransaction | { error: string }> {
  if (!transactionInput.shiftId || !transactionInput.branchId || !transactionInput.userId) {
    return { error: "Shift ID, Branch ID, dan User ID diperlukan untuk transaksi." };
  }
  if (transactionInput.items.length === 0) return { error: "Transaksi tidak memiliki item." };

  const transactionRef = doc(collection(db, "posTransactions"));
  const invoiceNumber = `INV-${transactionRef.id.substring(0, 8).toUpperCase()}`;
  const transactionTimestamp = Timestamp.now(); // Firestore Timestamp for saving

  try {
    await runTransaction(db, async (firestoreTransaction) => {
      const productReadPromises = transactionInput.items.map(item => {
        const productRef = doc(db, "inventoryItems", item.productId);
        return firestoreTransaction.get(productRef);
      });
      const productSnapshots = await Promise.all(productReadPromises);

      const productCurrentStates = new Map<string, { data: InventoryItem, currentStock: number }>();
      for (let i = 0; i < productSnapshots.length; i++) {
        const productSnap = productSnapshots[i];
        const item = transactionInput.items[i];
        if (productSnap.exists()) {
          const productData = productSnap.data() as InventoryItem;
          if (productData.quantity < item.quantity) {
            throw new Error(`Stok tidak cukup untuk produk ${productData.name}. Stok tersedia: ${productData.quantity}, diminta: ${item.quantity}.`);
          }
          productCurrentStates.set(item.productId, { data: productData, currentStock: productData.quantity });
        } else {
          throw new Error(`Produk dengan ID ${item.productId} (${item.productName}) tidak ditemukan di inventaris.`);
        }
      }

      const dataToSave: Omit<PosTransaction, 'id'> = {
        shiftId: transactionInput.shiftId,
        branchId: transactionInput.branchId,
        userId: transactionInput.userId,
        items: transactionInput.items,
        subtotal: transactionInput.subtotal,
        taxAmount: transactionInput.taxAmount,
        shippingCost: transactionInput.shippingCost || 0,
        voucherCode: transactionInput.voucherCode || null,
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
        timestamp: serverTimestamp() as Timestamp, // Use serverTimestamp for consistency
        customerId: transactionInput.customerId || undefined, // Ensure undefined if null/empty
        customerName: transactionInput.customerName?.trim() ? transactionInput.customerName.trim() : undefined,
        creditDueDate: transactionInput.creditDueDate || null,
        isCreditSale: transactionInput.isCreditSale ?? false,
        outstandingAmount: transactionInput.outstandingAmount ?? (transactionInput.isCreditSale ? transactionInput.totalAmount : 0),
        paymentStatus: transactionInput.paymentStatus ?? (transactionInput.isCreditSale ? 'unpaid' : 'paid'),
        bankName: transactionInput.bankName?.trim() ? transactionInput.bankName.trim() : null,
        bankTransactionRef: transactionInput.bankTransactionRef?.trim() ? transactionInput.bankTransactionRef.trim() : null,
      };
      firestoreTransaction.set(transactionRef, dataToSave);

      for (const item of transactionInput.items) {
        const productRef = doc(db, "inventoryItems", item.productId);
        const productState = productCurrentStates.get(item.productId);

        if (productState) {
          const currentStock = productState.currentStock;
          const newStock = currentStock - item.quantity;
          firestoreTransaction.update(productRef, { quantity: newStock, updatedAt: serverTimestamp() });

          const mutationInputForPrepare: Omit<StockMutationInput, 'currentProductStock'> = {
            branchId: transactionInput.branchId,
            productId: item.productId,
            productName: productState.data.name,
            sku: productState.data.sku,
            mutationTime: transactionTimestamp, // Use the client-generated Timestamp here
            type: "SALE",
            quantityChange: -item.quantity,
            referenceId: transactionRef.id,
            notes: `Penjualan Inv: ${invoiceNumber}`,
            userId: transactionInput.userId,
            userName: userName,
          };
          const mutationToSave = await prepareStockMutationData(mutationInputForPrepare, currentStock);
          const stockMutationRef = doc(collection(db, "stockMutations"));
          firestoreTransaction.set(stockMutationRef, mutationToSave);
        }
      }
    });

    const savedDoc = await getDoc(transactionRef);
    if (savedDoc.exists()) {
      return mapPosTransactionToClient(savedDoc);
    } else {
      return { error: "Gagal mengambil transaksi yang baru direkam setelah penyimpanan." };
    }
  } catch (error: any) {
    console.error("Error recording transaction:", error);
    return { error: error.message || "Gagal merekam transaksi." };
  }
}


export async function processFullTransactionReturn(
  transactionId: string,
  reason: string,
  returnedByUserId: string,
  returnedByUserName?: string
): Promise<void | { error: string }> {
  if (!transactionId) return { error: "ID Transaksi tidak valid." };
  if (!reason.trim()) return { error: "Alasan retur harus diisi." };
  if (!returnedByUserId) return { error: "ID Pengguna yang memproses retur diperlukan." };

  const transactionRef = doc(db, "posTransactions", transactionId);
  const returnTimestamp = Timestamp.now();

  try {
    await runTransaction(db, async (firestoreTransaction) => {
      const transactionSnap = await firestoreTransaction.get(transactionRef);
      if (!transactionSnap.exists()) {
        throw new Error("Transaksi tidak ditemukan.");
      }
      const transactionData = transactionSnap.data() as PosTransaction;
      if (transactionData.status === 'returned') {
        throw new Error("Transaksi ini sudah pernah diretur.");
      }

      const productReadPromises = transactionData.items.map(item => {
        const productRef = doc(db, "inventoryItems", item.productId);
        return firestoreTransaction.get(productRef);
      });
      const productSnapshots = await Promise.all(productReadPromises);

      const productCurrentStates = new Map<string, { data: InventoryItem, currentStock: number }>();
      for (let i = 0; i < productSnapshots.length; i++) {
        const productSnap = productSnapshots[i];
        const item = transactionData.items[i];
        if (productSnap.exists()) {
          const productData = productSnap.data() as InventoryItem;
          productCurrentStates.set(item.productId, { data: productData, currentStock: productData.quantity });
        } else {
          console.warn(`Produk dengan ID ${item.productId} (${item.productName}) tidak ditemukan saat proses retur. Stok tidak akan dikembalikan untuk item ini.`);
        }
      }

      firestoreTransaction.update(transactionRef, {
        status: 'returned',
        returnReason: reason,
        returnedAt: serverTimestamp(), // Use serverTimestamp for actual update
        returnedByUserId: returnedByUserId,
        outstandingAmount: 0,
        paymentStatus: 'returned',
      });

      for (const item of transactionData.items) {
        const productRef = doc(db, "inventoryItems", item.productId);
        const productState = productCurrentStates.get(item.productId);

        if (productState) {
          const currentStock = productState.currentStock;
          const newStock = currentStock + item.quantity;
          firestoreTransaction.update(productRef, { quantity: newStock, updatedAt: serverTimestamp() });

          const mutationInputForPrepare: Omit<StockMutationInput, 'currentProductStock'> = {
            branchId: transactionData.branchId,
            productId: item.productId,
            productName: productState.data.name,
            sku: productState.data.sku,
            mutationTime: returnTimestamp, // Use client-generated Timestamp
            type: "SALE_RETURN",
            quantityChange: item.quantity,
            referenceId: transactionData.id,
            notes: `Retur Inv: ${transactionData.invoiceNumber}. Alasan: ${reason}`,
            userId: returnedByUserId,
            userName: returnedByUserName,
          };
          const mutationToSave = await prepareStockMutationData(mutationInputForPrepare, currentStock);
          const stockMutationRef = doc(collection(db, "stockMutations"));
          firestoreTransaction.set(stockMutationRef, mutationToSave);
        }
      }
    });
  } catch (error: any) {
    console.error("Error processing transaction return:", error);
    return { error: error.message || "Gagal memproses retur transaksi." };
  }
}

export async function deleteTransaction(
    transactionId: string,
    branchId: string,
    passwordAttempt: string,
    deletedByUserId?: string,
    deletedByUserName?: string
): Promise<{ success?: boolean; error?: string }> {
  if (!transactionId) return { error: "ID Transaksi tidak valid." };
  if (!branchId) return { error: "ID Cabang tidak valid." };
  if (!passwordAttempt) return { error: "Password hapus diperlukan." };

  const transactionRef = doc(db, "posTransactions", transactionId);
  const deletionTimestamp = Timestamp.now();

  try {
    await runTransaction(db, async (firestoreTransaction) => {
      const branchDocRef = doc(db, "branches", branchId);
      const [transactionSnap, branchSnap] = await Promise.all([
        firestoreTransaction.get(transactionRef),
        firestoreTransaction.get(branchDocRef)
      ]);

      if (!branchSnap.exists()) {
        throw new Error("Data cabang tidak ditemukan.");
      }
      const branchData = branchSnap.data() as Branch;
      if (!branchData.transactionDeletionPassword) {
        throw new Error("Password hapus belum diatur untuk cabang ini. Silakan atur di Pengaturan Admin.");
      }
      if (branchData.transactionDeletionPassword !== passwordAttempt) {
        throw new Error("Password hapus transaksi salah.");
      }

      if (!transactionSnap.exists()) {
        throw new Error("Transaksi tidak ditemukan.");
      }
      const transactionData = transactionSnap.data() as PosTransaction;

      const productCurrentStates = new Map<string, { data: InventoryItem, currentStock: number }>();
      if (transactionData.status === 'completed') {
        const productReadPromises = transactionData.items.map(item => {
          const productRef = doc(db, "inventoryItems", item.productId);
          return firestoreTransaction.get(productRef);
        });
        const productSnapshots = await Promise.all(productReadPromises);

        for (let i = 0; i < productSnapshots.length; i++) {
          const productSnap = productSnapshots[i];
          const item = transactionData.items[i];
          if (productSnap.exists()) {
            const productData = productSnap.data() as InventoryItem;
            productCurrentStates.set(item.productId, { data: productData, currentStock: productData.quantity });
          } else {
            console.warn(`Produk dengan ID ${item.productId} (${item.productName}) tidak ditemukan saat proses hapus transaksi. Stok tidak akan dikembalikan untuk item ini.`);
          }
        }
      }

      if (transactionData.status === 'completed') {
        for (const item of transactionData.items) {
          const productRef = doc(db, "inventoryItems", item.productId);
          const productState = productCurrentStates.get(item.productId);

          if (productState) {
            const currentStock = productState.currentStock;
            const newStock = currentStock + item.quantity;
            firestoreTransaction.update(productRef, { quantity: newStock, updatedAt: serverTimestamp() });

            const mutationInputForPrepare: Omit<StockMutationInput, 'currentProductStock'> = {
              branchId: transactionData.branchId,
              productId: item.productId,
              productName: productState.data.name,
              sku: productState.data.sku,
              mutationTime: deletionTimestamp, // Use client-generated Timestamp
              type: "TRANSACTION_DELETED_SALE_RESTOCK",
              quantityChange: item.quantity,
              referenceId: transactionData.id,
              notes: `Hapus Inv: ${transactionData.invoiceNumber}`,
              userId: deletedByUserId,
              userName: deletedByUserName,
            };
            const mutationToSave = await prepareStockMutationData(mutationInputForPrepare, currentStock);
            const stockMutationRef = doc(collection(db, "stockMutations"));
            firestoreTransaction.set(stockMutationRef, mutationToSave);
          }
        }
      }
      firestoreTransaction.delete(transactionRef);
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting transaction:", error);
    return { error: error.message || "Gagal menghapus transaksi." };
  }
}


export async function getTransactionById(transactionId: string): Promise<ClientPosTransaction | null> {
    if (!transactionId) return null;
    try {
        const transactionRef = doc(db, "posTransactions", transactionId);
        const docSnap = await getDoc(transactionRef);
        if (docSnap.exists()) {
            return mapPosTransactionToClient(docSnap);
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
): Promise<ClientPosTransaction[]> {
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
        return querySnapshot.docs.map(mapPosTransactionToClient);
    } catch (error) {
        console.error("Error fetching transactions for user by branch:", error);
        return [];
    }
}


export async function getShiftsForUserByBranch(
    userId: string,
    branchId: string,
    options: QueryOptions = {}
): Promise<ClientPosShift[]> {
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
        const shifts: ClientPosShift[] = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data() as PosShift;
            shifts.push({
                 id: docSnap.id,
                ...data,
                startTime: data.startTime.toDate().toISOString(),
                endTime: data.endTime?.toDate().toISOString(),
            } as ClientPosShift);
        });
        return shifts;
    } catch (error) {
        console.error("Error fetching shifts for user by branch:", error);
        return [];
    }
}

export async function getTransactionsForShift(shiftId: string): Promise<ClientPosTransaction[]> {
  if (!shiftId) return [];
  try {
    const q = query(collection(db, "posTransactions"), where("shiftId", "==", shiftId), orderBy("timestamp", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapPosTransactionToClient);
  } catch (error: any) {
    console.error("Error fetching transactions for shift:", error);
    return [];
  }
}

export async function getTransactionsByDateRangeAndBranch(
  branchId: string,
  startDate: Date,
  endDate: Date
): Promise<ClientPosTransaction[]> {
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
    return querySnapshot.docs.map(mapPosTransactionToClient);
  } catch (error) {
    console.error("Error fetching transactions by date range and branch:", error);
    return [];
  }
}


export async function getOutstandingCreditSalesByBranch(
  branchId: string,
  options: QueryOptions = {}
): Promise<ClientPosTransaction[]> {
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
    return querySnapshot.docs.map(mapPosTransactionToClient);
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

    