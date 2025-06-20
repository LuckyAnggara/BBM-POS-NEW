
'use server';

import {
  doc,
  serverTimestamp,
  Timestamp,
  collection,
  addDoc,
  writeBatch,
  getDoc,
  runTransaction,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  limitToLast,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "./config";

export type StockMutationType =
  | "INITIAL_STOCK"
  | "SALE"
  | "PURCHASE_RECEIPT"
  | "SALE_RETURN"
  | "PURCHASE_RETURN"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "TRANSACTION_DELETED_SALE_RESTOCK";

export interface StockMutation {
  id: string;
  branchId: string;
  productId: string;
  productName: string;
  sku?: string;
  mutationTime: Timestamp;
  type: StockMutationType;
  quantityChange: number;
  stockBeforeMutation: number;
  stockAfterMutation: number;
  referenceId?: string;
  notes?: string;
  userId?: string;
  userName?: string | null;
  createdAt: Timestamp;
}

export type StockMutationInput = Omit<
  StockMutation,
  "id" | "createdAt" | "stockBeforeMutation" | "stockAfterMutation"
> & {
    currentProductStock: number;
};

export interface ClientStockMutation extends Omit<StockMutation, 'mutationTime' | 'createdAt'> {
  mutationTime: string; // ISO string
  createdAt: string;    // ISO string
}


export async function addStockMutation(
  mutationData: StockMutationInput
): Promise<StockMutation | { error: string }> {
  if (!mutationData.branchId) return { error: "Branch ID is required for stock mutation." };
  if (!mutationData.productId) return { error: "Product ID is required for stock mutation." };
  if (isNaN(mutationData.quantityChange)) return { error: "Invalid quantity change." };
  if (isNaN(mutationData.currentProductStock)) return { error: "Current product stock is required and must be a number."};

  try {
    const now = serverTimestamp() as Timestamp;
    const clientNow = Timestamp.now();

    const stockBefore = mutationData.currentProductStock;
    const stockAfter = mutationData.currentProductStock + mutationData.quantityChange;

    const dataToSave: Omit<StockMutation, "id"> = {
      branchId: mutationData.branchId,
      productId: mutationData.productId,
      productName: mutationData.productName,
      sku: mutationData.sku || undefined,
      mutationTime: mutationData.mutationTime || clientNow,
      type: mutationData.type,
      quantityChange: mutationData.quantityChange,
      stockBeforeMutation: stockBefore,
      stockAfterMutation: stockAfter,
      referenceId: mutationData.referenceId,
      notes: mutationData.notes,
      userId: mutationData.userId,
      userName: mutationData.userName,
      createdAt: now,
    };

    const docRef = await addDoc(collection(db, "stockMutations"), dataToSave);

    return {
      id: docRef.id,
      ...dataToSave,
      mutationTime: mutationData.mutationTime || clientNow,
      createdAt: clientNow,
    };
  } catch (error: any) {
    console.error("Error adding stock mutation:", error);
    return { error: error.message || "Failed to add stock mutation." };
  }
}

// This function prepares the data for a stock mutation to be used within a Firestore transaction.
// It no longer creates the DocumentReference itself.
export async function prepareStockMutationData(
  mutationInput: Omit<StockMutationInput, 'currentProductStock'>,
  currentProductStock: number
): Promise<Omit<StockMutation, "id">> {
  const now = serverTimestamp() as Timestamp;
  const clientNow = Timestamp.now();

  const stockBefore = currentProductStock;
  const stockAfter = currentProductStock + mutationInput.quantityChange;

  const mutationToSave: Omit<StockMutation, "id"> = {
    branchId: mutationInput.branchId,
    productId: mutationInput.productId,
    productName: mutationInput.productName,
    mutationTime: mutationInput.mutationTime || clientNow,
    type: mutationInput.type,
    quantityChange: mutationInput.quantityChange,
    stockBeforeMutation: stockBefore,
    stockAfterMutation: stockAfter,
    referenceId: mutationInput.referenceId,
    notes: mutationInput.notes,
    userId: mutationInput.userId,
    createdAt: now,
  };
  return mutationToSave;
}


export async function checkIfInitialStockExists(productId: string, branchId: string): Promise<boolean> {
  if (!productId || !branchId) {
    console.error("Product ID and Branch ID are required to check for initial stock.");
    return false;
  }
  try {
    const q = query(
      collection(db, "stockMutations"),
      where("productId", "==", productId),
      where("branchId", "==", branchId),
      where("type", "==", "INITIAL_STOCK"),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking for initial stock mutation:", error);
    return false;
  }
}

export async function getStockLevelAtDate(productId: string, branchId: string, specificDate: Date): Promise<number> {
  if (!productId || !branchId) return 0;
  try {
    const dateTimestamp = Timestamp.fromDate(specificDate);
    const q = query(
      collection(db, "stockMutations"),
      where("branchId", "==", branchId),
      where("productId", "==", productId),
      where("mutationTime", "<=", dateTimestamp),
      orderBy("mutationTime", "desc"),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const lastMutation = querySnapshot.docs[0].data() as StockMutation;
      return lastMutation.stockAfterMutation;
    }

    const initialStockQuery = query(
        collection(db, "stockMutations"),
        where("branchId", "==", branchId),
        where("productId", "==", productId),
        where("type", "==", "INITIAL_STOCK"),
        orderBy("mutationTime", "desc"),
        limit(1)
    );
    const initialStockSnapshot = await getDocs(initialStockQuery);
    if (!initialStockSnapshot.empty) {
        const initialMutation = initialStockSnapshot.docs[0].data() as StockMutation;
        if (initialMutation.mutationTime.toDate() > specificDate) {
            return 0;
        }
    }

    return 0;
  } catch (error) {
    console.error("Error fetching stock level at date:", error);
    return 0;
  }
}

export async function getMutationsForProductInRange(
  productId: string,
  branchId: string,
  startDate: Date,
  endDate: Date,
  orderByTime: 'asc' | 'desc' = 'asc'
): Promise<ClientStockMutation[]> {
  if (!productId || !branchId || !startDate || !endDate) return [];
  try {
    const startTimestamp = Timestamp.fromDate(startDate);
    const endOfDayEndDate = new Date(endDate);
    endOfDayEndDate.setHours(23, 59, 59, 999);
    const endTimestamp = Timestamp.fromDate(endOfDayEndDate);

    const q = query(
      collection(db, "stockMutations"),
      where("branchId", "==", branchId),
      where("productId", "==", productId),
      where("mutationTime", ">=", startTimestamp),
      where("mutationTime", "<=", endTimestamp),
      orderBy("mutationTime", orderByTime)
    );
    const querySnapshot = await getDocs(q);
    const mutations: ClientStockMutation[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      mutations.push({
        id: docSnap.id,
        branchId: data.branchId,
        productId: data.productId,
        productName: data.productName,
        sku: data.sku,
        mutationTime: (data.mutationTime as Timestamp).toDate().toISOString(),
        type: data.type,
        quantityChange: data.quantityChange,
        stockBeforeMutation: data.stockBeforeMutation,
        stockAfterMutation: data.stockAfterMutation,
        referenceId: data.referenceId,
        notes: data.notes,
        userId: data.userId,
        userName: data.userName,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      } as ClientStockMutation);
    });
    return mutations;
  } catch (error) {
    console.error("Error fetching mutations for product in range:", error);
    return [];
  }
}
