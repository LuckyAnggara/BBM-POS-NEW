
"use server";

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
  type DocumentReference, // Added DocumentReference
} from "firebase/firestore";
import { db } from "./config";

export type StockMutationType =
  | "INITIAL_STOCK" // Stok awal saat produk dibuat atau sistem diinisiasi
  | "SALE" // Penjualan produk
  | "PURCHASE_RECEIPT" // Penerimaan barang dari Purchase Order
  | "SALE_RETURN" // Retur dari pelanggan
  | "PURCHASE_RETURN" // Retur ke supplier (Belum diimplementasikan)
  | "ADJUSTMENT_IN" // Penyesuaian stok masuk (misal, stock opname, barang ditemukan)
  | "ADJUSTMENT_OUT" // Penyesuaian stok keluar (misal, barang rusak, hilang)
  | "TRANSACTION_DELETED_SALE_RESTOCK"; // Stok dikembalikan karena penjualan dihapus

export interface StockMutation {
  id: string;
  branchId: string;
  productId: string;
  productName: string; // Denormalized
  sku?: string; // Denormalized
  mutationTime: Timestamp; // Kapan mutasi ini efektif terjadi
  type: StockMutationType;
  quantityChange: number; // Positif untuk masuk, negatif untuk keluar
  stockBeforeMutation: number;
  stockAfterMutation: number;
  referenceId?: string; // ID dokumen terkait (invoice penjualan, PO, ID penyesuaian)
  notes?: string;
  userId?: string; // Siapa yang melakukan aksi yang menyebabkan mutasi
  userName?: string; // Nama pengguna
  createdAt: Timestamp; // Kapan record mutasi ini dibuat di sistem
}

export type StockMutationInput = Omit<
  StockMutation,
  "id" | "createdAt" | "stockBeforeMutation" | "stockAfterMutation"
> & {
    currentProductStock: number; // Stok produk saat ini (sebelum mutasi ini) untuk menghitung stockBefore/After
};


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
      mutationTime: mutationData.mutationTime || clientNow, // Default to now if not specified
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
      createdAt: clientNow, // Return client-side timestamp for immediate use
    };
  } catch (error: any) {
    console.error("Error adding stock mutation:", error);
    return { error: error.message || "Failed to add stock mutation." };
  }
}

// PENTING: Fungsi ini TIDAK mengupdate stok di inventoryItems dan TIDAK melakukan transaction.set().
// Ia hanya MENYIAPKAN data dan referensi untuk mutasi.
// Pemanggilan transaction.set() harus dilakukan oleh fungsi pemanggil di dalam callback runTransaction.
export function prepareStockMutationData( // Renamed and modified
  mutationInput: Omit<StockMutationInput, 'currentProductStock'>,
  currentProductStock: number // Stok produk yang dibaca DI DALAM transaksi sebelum update
): { mutationRef: DocumentReference; mutationToSave: Omit<StockMutation, "id"> } {
  const mutationRef = doc(collection(db, "stockMutations"));
  const now = serverTimestamp() as Timestamp; // Untuk createdAt
  const clientNow = Timestamp.now(); // Untuk mutationTime jika tidak disediakan

  const stockBefore = currentProductStock;
  const stockAfter = currentProductStock + mutationInput.quantityChange;

  const mutationToSave: Omit<StockMutation, "id"> = {
    branchId: mutationInput.branchId,
    productId: mutationInput.productId,
    productName: mutationInput.productName,
    sku: mutationInput.sku || undefined,
    mutationTime: mutationInput.mutationTime || clientNow,
    type: mutationInput.type,
    quantityChange: mutationInput.quantityChange,
    stockBeforeMutation: stockBefore,
    stockAfterMutation: stockAfter,
    referenceId: mutationInput.referenceId,
    notes: mutationInput.notes,
    userId: mutationInput.userId,
    userName: mutationInput.userName,
    createdAt: now,
  };
  return { mutationRef, mutationToSave };
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
        // If initial stock is found and it's before or on specificDate,
        // and no other mutations were found by the first query,
        // this implies the stock was its initial value.
        // However, the first query should catch this if the mutationTime is <= specificDate.
        // If the first query is empty, it means no mutation *at or before* specificDate.
        // This can happen if INITIAL_STOCK is the ONLY mutation and it's *after* specificDate.
        // Or if there are no mutations at all.
        // Thus, if the first query is empty, the stock at `specificDate` is 0 (or whatever value it was before any recorded mutations).
    }

    return 0; // Default to 0 if no mutations found on or before the specific date
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
): Promise<StockMutation[]> {
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
    const mutations: StockMutation[] = [];
    querySnapshot.forEach((docSnap) => {
      mutations.push({ id: docSnap.id, ...docSnap.data() } as StockMutation);
    });
    return mutations;
  } catch (error) {
    console.error("Error fetching mutations for product in range:", error);
    return [];
  }
}

    