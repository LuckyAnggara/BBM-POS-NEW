
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc, getDocs, updateDoc, query, where, deleteDoc, writeBatch, orderBy, limit, FieldPath, OrderByDirection, startAfter, documentId } from "firebase/firestore";
import { db } from "./config";
import type { UserData } from "@/contexts/auth-context";
import type { Branch } from "@/contexts/branch-context";

// --- User Management ---
export async function createUserDocument(uid: string, data: Partial<UserData>): Promise<void> {
  const userRef = doc(db, "users", uid);
  const userData: Omit<UserData, 'uid'> & { createdAt: Timestamp } = {
    name: data.name || "Pengguna Baru",
    email: data.email || "",
    avatarUrl: data.avatarUrl || null,
    branchId: data.branchId === undefined ? null : data.branchId,
    role: data.role || "cashier",
    createdAt: serverTimestamp() as Timestamp,
  };
  await setDoc(userRef, userData, { merge: true });
}

export async function getUserDocument(uid: string): Promise<UserData | null> {
  if (!uid) return null;
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    return {
      uid,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatarUrl,
      branchId: data.branchId,
      role: data.role,
      createdAt: data.createdAt,
    } as UserData;
  } else {
    return null;
  }
}

export async function getAllUsers(): Promise<UserData[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    const users: UserData[] = [];
    querySnapshot.forEach((doc) => {
      users.push({ uid: doc.id, ...doc.data() } as UserData);
    });
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export async function updateUserBranch(userId: string, branchId: string | null): Promise<void | { error: string }> {
  if (!userId) return { error: "User ID tidak valid." };
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      branchId: branchId,
    });
  } catch (error: any) {
    console.error("Error updating user branch:", error);
    return { error: error.message || "Gagal memperbarui cabang pengguna." };
  }
}

export async function updateUserRole(userId: string, role: string): Promise<void | { error: string }> {
  if (!userId) return { error: "User ID tidak valid." };
  if (!role) return { error: "Peran tidak valid." };
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      role: role,
    });
  } catch (error: any) {
    console.error("Error updating user role:", error);
    return { error: error.message || "Gagal memperbarui peran pengguna." };
  }
}

// --- Branch Management ---
export interface BranchInput extends Omit<Branch, 'id'> {}

interface FirebaseBranchData extends Omit<Branch, 'id'> {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export async function createBranch(branchData: BranchInput): Promise<Branch | { error: string }> {
  if (!branchData.name?.trim()) {
    return { error: "Nama cabang tidak boleh kosong." };
  }
  try {
    const dataToSave: Omit<FirebaseBranchData, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: Timestamp } = {
      name: branchData.name.trim(),
      invoiceName: branchData.invoiceName?.trim() || branchData.name.trim(),
      currency: branchData.currency?.trim() || "IDR",
      taxRate: branchData.taxRate === undefined || branchData.taxRate === null || isNaN(Number(branchData.taxRate)) ? 0 : Number(branchData.taxRate),
      address: branchData.address?.trim() || "",
      phoneNumber: branchData.phoneNumber?.trim() || "",
      createdAt: serverTimestamp() as Timestamp,
    };
    const branchRef = await addDoc(collection(db, "branches"), dataToSave);
    return {
        id: branchRef.id,
        name: dataToSave.name,
        invoiceName: dataToSave.invoiceName,
        currency: dataToSave.currency,
        taxRate: dataToSave.taxRate,
        address: dataToSave.address,
        phoneNumber: dataToSave.phoneNumber
    };
  } catch (error: any) {
    console.error("Error creating branch:", error);
    return { error: error.message || "Gagal membuat cabang." };
  }
}

export async function updateBranch(branchId: string, updates: Partial<BranchInput>): Promise<void | { error: string }> {
  if (!branchId) return { error: "ID Cabang tidak valid." };

  const dataToUpdate: Partial<Omit<FirebaseBranchData, 'id' | 'createdAt'>> & {updatedAt: Timestamp} = {} as any;
  if (updates.name?.trim()) dataToUpdate.name = updates.name.trim();
  if (updates.invoiceName !== undefined) dataToUpdate.invoiceName = updates.invoiceName.trim() || updates.name?.trim() || "";
  if (updates.currency?.trim()) dataToUpdate.currency = updates.currency.trim();
  if (updates.taxRate !== undefined && updates.taxRate !== null && !isNaN(Number(updates.taxRate))) dataToUpdate.taxRate = Number(updates.taxRate);
  if (updates.address !== undefined) dataToUpdate.address = updates.address.trim();
  if (updates.phoneNumber !== undefined) dataToUpdate.phoneNumber = updates.phoneNumber.trim();

  if (Object.keys(dataToUpdate).length === 0 && !(updates.hasOwnProperty('invoiceName') || updates.hasOwnProperty('address') || updates.hasOwnProperty('phoneNumber') || updates.hasOwnProperty('currency') || updates.hasOwnProperty('taxRate'))) {
     return;
  }

  dataToUpdate.updatedAt = serverTimestamp() as Timestamp;

  try {
    const branchRef = doc(db, "branches", branchId);
    await updateDoc(branchRef, dataToUpdate);
  } catch (error: any) {
    console.error("Error updating branch:", error);
    return { error: error.message || "Gagal memperbarui cabang." };
  }
}

export async function deleteBranch(branchId: string): Promise<void | { error: string }> {
  if (!branchId) return { error: "ID Cabang tidak valid." };
  try {
    const usersQuery = query(collection(db, "users"), where("branchId", "==", branchId), limit(1));
    const usersSnapshot = await getDocs(usersQuery);
    if (!usersSnapshot.empty) {
      return { error: `Masih ada pengguna yang terhubung ke cabang ini. Hapus atau pindahkan pengguna terlebih dahulu.` };
    }

    const itemsQuery = query(collection(db, "inventoryItems"), where("branchId", "==", branchId), limit(1));
    const itemsSnapshot = await getDocs(itemsQuery);
    if (!itemsSnapshot.empty) {
      return { error: `Masih ada produk inventaris yang terhubung ke cabang ini. Hapus atau pindahkan produk terlebih dahulu.` };
    }
    
    const shiftsQuery = query(collection(db, "posShifts"), where("branchId", "==", branchId), limit(1));
    const shiftsSnapshot = await getDocs(shiftsQuery);
    if (!shiftsSnapshot.empty) {
      return { error: `Masih ada data shift POS yang terhubung ke cabang ini.` };
    }
    
    const transactionsQuery = query(collection(db, "posTransactions"), where("branchId", "==", branchId), limit(1));
    const transactionsSnapshot = await getDocs(transactionsQuery);
    if (!transactionsSnapshot.empty) {
      return { error: `Masih ada data transaksi POS yang terhubung ke cabang ini.` };
    }

    const branchRef = doc(db, "branches", branchId);
    await deleteDoc(branchRef);
  } catch (error: any) {
    console.error("Error deleting branch:", error);
    return { error: error.message || "Gagal menghapus cabang." };
  }
}

export async function getBranches(): Promise<Branch[]> {
  try {
    const q = query(collection(db, "branches"), orderBy("name"));
    const querySnapshot = await getDocs(q);
    const branches: Branch[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as FirebaseBranchData;
      branches.push({
        id: docSnap.id,
        name: data.name,
        invoiceName: data.invoiceName || data.name,
        currency: data.currency || "IDR",
        taxRate: data.taxRate === undefined ? 0 : data.taxRate,
        address: data.address || "",
        phoneNumber: data.phoneNumber || "",
      });
    });
    return branches;
  } catch (error) {
    console.error("Error fetching branches:", error);
    return [];
  }
}

export async function getBranchById(branchId: string): Promise<Branch | null> {
  if (!branchId) return null;
  try {
    const branchRef = doc(db, "branches", branchId);
    const docSnap = await getDoc(branchRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as FirebaseBranchData;
      return {
        id: docSnap.id,
        name: data.name,
        invoiceName: data.invoiceName || data.name,
        currency: data.currency || "IDR",
        taxRate: data.taxRate === undefined ? 0 : data.taxRate,
        address: data.address || "",
        phoneNumber: data.phoneNumber || "",
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching branch by ID:", error);
    return null;
  }
}


// --- Inventory Item Types ---
export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  categoryId: string;
  categoryName?: string;
  branchId: string;
  quantity: number;
  price: number;
  costPrice: number;
  imageUrl?: string;
  imageHint?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
export type InventoryItemInput = Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'categoryName'>;

// --- Inventory Category Types ---
export interface InventoryCategory {
  id: string;
  name: string;
  branchId: string;
  createdAt: Timestamp;
}
export type InventoryCategoryInput = Omit<InventoryCategory, 'id' | 'createdAt'>;

export async function addInventoryCategory(categoryData: InventoryCategoryInput): Promise<InventoryCategory | { error: string }> {
  if (!categoryData.name.trim()) return { error: "Nama kategori tidak boleh kosong." };
  if (!categoryData.branchId) return { error: "ID Cabang diperlukan untuk kategori." };
  try {
    const categoryRef = await addDoc(collection(db, "inventoryCategories"), {
      ...categoryData,
      createdAt: serverTimestamp(),
    });
    const createdAt = Timestamp.now();
    return { id: categoryRef.id, ...categoryData, createdAt };
  } catch (error: any) {
    console.error("Error adding inventory category:", error);
    return { error: error.message || "Gagal menambah kategori." };
  }
}

export async function getInventoryCategories(branchId: string): Promise<InventoryCategory[]> {
  if (!branchId) return [];
  try {
    const q = query(collection(db, "inventoryCategories"), where("branchId", "==", branchId), orderBy("name"));
    const querySnapshot = await getDocs(q);
    const categories: InventoryCategory[] = [];
    querySnapshot.forEach((docSnap) => {
      categories.push({ id: docSnap.id, ...docSnap.data() } as InventoryCategory);
    });
    return categories;
  } catch (error) {
    console.error("Error fetching inventory categories:", error);
    return [];
  }
}

export async function deleteInventoryCategory(categoryId: string): Promise<void | { error: string }> {
  if (!categoryId) return { error: "ID Kategori tidak valid." };
  try {
    const itemsQuery = query(collection(db, "inventoryItems"), where("categoryId", "==", categoryId), limit(1));
    const itemsSnapshot = await getDocs(itemsQuery);
    if (!itemsSnapshot.empty) {
      return { error: `Kategori ini masih digunakan oleh ${itemsSnapshot.size > 0 ? 'setidaknya satu' : ''} produk. Hapus atau ubah produk tersebut terlebih dahulu.` };
    }
    await deleteDoc(doc(db, "inventoryCategories", categoryId));
  } catch (error: any) {
    console.error("Error deleting inventory category:", error);
    return { error: error.message || "Gagal menghapus kategori." };
  }
}

export async function addInventoryItem(itemData: InventoryItemInput, categoryName: string): Promise<InventoryItem | { error: string }> {
  if (!itemData.name.trim()) return { error: "Nama produk tidak boleh kosong." };
  if (!itemData.branchId) return { error: "ID Cabang diperlukan." };
  if (!itemData.categoryId) return { error: "Kategori produk diperlukan." };
  if (itemData.quantity < 0) return { error: "Stok tidak boleh negatif."};
  if (itemData.price < 0) return { error: "Harga jual tidak boleh negatif."};
  if (itemData.costPrice < 0) return { error: "Harga pokok tidak boleh negatif."};

  try {
    const now = serverTimestamp() as Timestamp;
    const itemRef = await addDoc(collection(db, "inventoryItems"), {
      ...itemData,
      costPrice: itemData.costPrice || 0,
      categoryName,
      createdAt: now,
      updatedAt: now,
    });
    const clientTimestamp = Timestamp.now();
    return {
      id: itemRef.id,
      ...itemData,
      costPrice: itemData.costPrice || 0,
      categoryName,
      createdAt: clientTimestamp,
      updatedAt: clientTimestamp
    };
  } catch (error: any) {
    console.error("Error adding inventory item:", error);
    return { error: error.message || "Gagal menambah produk." };
  }
}

export async function getInventoryItems(branchId: string): Promise<InventoryItem[]> {
  if (!branchId) return [];
  try {
    const q = query(collection(db, "inventoryItems"), where("branchId", "==", branchId), orderBy("name"));
    const querySnapshot = await getDocs(q);
    const items: InventoryItem[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({ id: docSnap.id, ...data, costPrice: data.costPrice || 0 } as InventoryItem);
    });
    return items;
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    return [];
  }
}

export async function updateInventoryItem(itemId: string, updates: Partial<Omit<InventoryItem, 'id' | 'branchId' | 'createdAt'>>, newCategoryName?: string): Promise<void | { error: string }> {
  if (!itemId) return { error: "ID Produk tidak valid." };
  try {
    const itemRef = doc(db, "inventoryItems", itemId);
    const payload: any = { ...updates, updatedAt: serverTimestamp() };
    if (updates.costPrice === undefined || updates.costPrice === null || isNaN(Number(updates.costPrice))) {
      // No change or invalid cost price
    } else {
      payload.costPrice = Number(updates.costPrice);
    }

    if (newCategoryName && updates.categoryId) {
      payload.categoryName = newCategoryName;
    } else if (updates.categoryId && !newCategoryName) {
        const catDoc = await getDoc(doc(db, "inventoryCategories", updates.categoryId));
        if (catDoc.exists()) {
            payload.categoryName = catDoc.data().name;
        } else {
            console.warn("Category for updated item not found, categoryName might be stale or incorrect.");
        }
    }
    await updateDoc(itemRef, payload);
  } catch (error: any) {
    console.error("Error updating inventory item:", error);
    return { error: error.message || "Gagal memperbarui produk." };
  }
}

export async function deleteInventoryItem(itemId: string): Promise<void | { error: string }> {
  if (!itemId) return { error: "ID Produk tidak valid." };
  try {
    await deleteDoc(doc(db, "inventoryItems", itemId));
  } catch (error: any) {
    console.error("Error deleting inventory item:", error);
    return { error: error.message || "Gagal menghapus produk." };
  }
}

// --- POS Shift Management ---
export type PaymentMethod = 'cash' | 'card' | 'transfer';

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
  totalSalesByPaymentMethod?: Record<PaymentMethod, number>;
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
  } catch (error) {
    console.error("Error fetching active shift:", error);
    return null;
  }
}

export async function endShift(
  shiftId: string,
  actualCashAtEnd: number,
  expectedCashAtEnd: number,
  cashDifference: number,
  totalSalesByPaymentMethod: Record<PaymentMethod, number>
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

// --- POS Transaction Management ---
export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  costPrice: number;
  total: number;
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
  paymentMethod: PaymentMethod;
  amountPaid: number; 
  changeGiven: number;
  customerName?: string; 
  invoiceNumber: string;
  status: 'completed' | 'returned'; // Added status for returns
  returnedAt?: Timestamp;
  returnReason?: string;
  returnedByUserId?: string;
}

export async function recordTransaction(transactionData: Omit<PosTransaction, 'id' | 'invoiceNumber' | 'timestamp' | 'status' | 'returnedAt' | 'returnReason' | 'returnedByUserId'>): Promise<PosTransaction | { error: string }> {
  if (!transactionData.shiftId || !transactionData.branchId || !transactionData.userId) {
    return { error: "Shift ID, Branch ID, dan User ID diperlukan untuk transaksi." };
  }
  if (transactionData.items.length === 0) return { error: "Transaksi tidak memiliki item." };

  const batch = writeBatch(db);

  try {
    const transactionRef = doc(collection(db, "posTransactions"));
    const invoiceNumber = `INV-${transactionRef.id.substring(0, 8).toUpperCase()}`;
    
    const dataToSave: Omit<PosTransaction, 'id'> = {
      shiftId: transactionData.shiftId,
      branchId: transactionData.branchId,
      userId: transactionData.userId,
      items: transactionData.items,
      subtotal: transactionData.subtotal,
      taxAmount: transactionData.taxAmount,
      totalAmount: transactionData.totalAmount,
      totalCost: transactionData.totalCost,
      paymentMethod: transactionData.paymentMethod,
      amountPaid: transactionData.amountPaid,
      changeGiven: transactionData.changeGiven,
      customerName: transactionData.customerName || "", 
      invoiceNumber,
      status: 'completed', // Default status
      timestamp: serverTimestamp() as Timestamp,
    };
    batch.set(transactionRef, dataToSave);

    for (const item of transactionData.items) {
      const productRef = doc(db, "inventoryItems", item.productId);
      const productSnap = await getDoc(productRef); // Must be awaited to get actual data
      if (productSnap.exists()) {
        const currentStock = productSnap.data().quantity as number;
        const newStock = currentStock - item.quantity;
        batch.update(productRef, { quantity: newStock < 0 ? 0 : newStock, updatedAt: serverTimestamp() });
      } else {
        console.warn(`Product with ID ${item.productId} not found in inventory. Stock not updated.`);
        // Potentially throw an error here or handle it more gracefully
        // return { error: `Produk dengan ID ${item.productId} tidak ditemukan di inventaris.` };
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

    // Update transaction status
    batch.update(transactionRef, {
      status: 'returned',
      returnReason: reason,
      returnedAt: serverTimestamp(),
      returnedByUserId: returnedByUserId,
    });

    // Restore stock for each item
    for (const item of transactionData.items) {
      const productRef = doc(db, "inventoryItems", item.productId);
      const productSnap = await getDoc(productRef); // Important to get latest stock before update
      if (productSnap.exists()) {
        const currentStock = productSnap.data().quantity as number;
        const newStock = currentStock + item.quantity;
        batch.update(productRef, { quantity: newStock, updatedAt: serverTimestamp() });
      } else {
        // This case should ideally not happen if data integrity is maintained
        // Or, it implies the product was deleted after the transaction.
        // Log a warning or handle as per business rules (e.g., create a placeholder adjustment)
        console.warn(`Product with ID ${item.productId} not found while processing return. Stock not restored.`);
      }
    }

    await batch.commit();
  } catch (error: any) {
    console.error("Error processing transaction return:", error);
    return { error: error.message || "Gagal memproses retur transaksi." };
  }
}


export async function getTransactionById(transactionId: string): Promise<PosTransaction | null> {
    if (!transactionId) return null;
    try {
        const transactionRef = doc(db, "posTransactions", transactionId);
        const docSnap = await getDoc(transactionRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as PosTransaction;
        }
        return null;
    } catch (error) {
        console.error("Error fetching transaction by ID:", error);
        return null;
    }
}

interface QueryOptions {
    limit?: number;
    orderByField?: string | FieldPath;
    orderDirection?: OrderByDirection;
    // lastVisible?: DocumentSnapshot; 
}

export async function getTransactionsForUserByBranch(
    userId: string,
    branchId: string,
    options: QueryOptions = {}
): Promise<PosTransaction[]> {
    if (!userId || !branchId) return [];
    try {
        const constraints: any[] = [
            where("userId", "==", userId),
            where("branchId", "==", branchId)
        ];
        if (options.orderByField) {
            constraints.push(orderBy(options.orderByField, options.orderDirection || 'desc'));
        } else {
            constraints.push(orderBy("timestamp", "desc")); 
        }
        if (options.limit) {
            constraints.push(limit(options.limit));
        }
        
        const q = query(collection(db, "posTransactions"), ...constraints);
        const querySnapshot = await getDocs(q);
        const transactions: PosTransaction[] = [];
        querySnapshot.forEach((docSnap) => {
            transactions.push({ id: docSnap.id, ...docSnap.data() } as PosTransaction);
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
        if (options.orderByField) {
            constraints.push(orderBy(options.orderByField, options.orderDirection || 'desc'));
        } else {
            constraints.push(orderBy("startTime", "desc")); 
        }
        if (options.limit) {
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
      transactions.push({ id: docSnap.id, ...docSnap.data() } as PosTransaction);
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
      transactions.push({ id: docSnap.id, ...docSnap.data() } as PosTransaction);
    });
    return transactions;
  } catch (error) {
    console.error("Error fetching transactions by date range and branch:", error);
    return [];
  }
}

// --- Expense Management ---
export interface Expense {
  id: string;
  branchId: string;
  userId: string; // User who recorded the expense
  date: Timestamp;
  category: string;
  amount: number;
  description: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ExpenseInput = Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>;

export const EXPENSE_CATEGORIES = ["Sewa", "Gaji", "Utilitas", "Perlengkapan", "Pemasaran", "Transportasi", "Perbaikan", "Lain-lain"] as const;
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];


export async function addExpense(expenseData: ExpenseInput, userId: string): Promise<Expense | { error: string }> {
  if (!expenseData.branchId) return { error: "ID Cabang diperlukan." };
  if (!userId) return { error: "ID Pengguna diperlukan." };
  if (!expenseData.date) return { error: "Tanggal pengeluaran diperlukan." };
  if (!expenseData.category.trim()) return { error: "Kategori pengeluaran tidak boleh kosong." };
  if (isNaN(expenseData.amount) || expenseData.amount <= 0) return { error: "Jumlah pengeluaran tidak valid." };

  try {
    const now = serverTimestamp() as Timestamp;
    const dataToSave = {
      ...expenseData,
      userId,
      createdAt: now,
      updatedAt: now,
    };
    const expenseRef = await addDoc(collection(db, "expenses"), dataToSave);
    const clientTimestamp = Timestamp.now(); 
    return { 
        id: expenseRef.id, 
        ...dataToSave, 
        date: expenseData.date, // Use the provided date
        createdAt: clientTimestamp, 
        updatedAt: clientTimestamp 
    };
  } catch (error: any) {
    console.error("Error adding expense:", error);
    return { error: error.message || "Gagal menambah pengeluaran." };
  }
}

export async function getExpenses(
  branchId: string, 
  filters?: { categories?: string[], startDate?: Date, endDate?: Date }
): Promise<Expense[]> {
  if (!branchId) return [];
  try {
    let qConstraints: any[] = [where("branchId", "==", branchId)];

    if (filters?.categories && filters.categories.length > 0) {
      qConstraints.push(where("category", "in", filters.categories));
    }
    
    if (filters?.startDate && filters?.endDate) {
      const startTimestamp = Timestamp.fromDate(filters.startDate);
      const endOfDayEndDate = new Date(filters.endDate);
      endOfDayEndDate.setHours(23, 59, 59, 999); // Ensure end of day for endDate
      const endTimestamp = Timestamp.fromDate(endOfDayEndDate);

      qConstraints.push(where("date", ">=", startTimestamp));
      qConstraints.push(where("date", "<=", endTimestamp));
    }
    
    // Default order by date descending if no specific order is needed for reports
    qConstraints.push(orderBy("date", "desc")); 
    
    const q = query(collection(db, "expenses"), ...qConstraints);
    
    const querySnapshot = await getDocs(q);
    const expenses: Expense[] = [];
    querySnapshot.forEach((docSnap) => {
      expenses.push({ id: docSnap.id, ...docSnap.data() } as Expense);
    });
    return expenses;
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }
}

export async function updateExpense(expenseId: string, updates: Partial<ExpenseInput>): Promise<void | { error: string }> {
  if (!expenseId) return { error: "ID Pengeluaran tidak valid." };
  try {
    const expenseRef = doc(db, "expenses", expenseId);
    await updateDoc(expenseRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error("Error updating expense:", error);
    return { error: error.message || "Gagal memperbarui pengeluaran." };
  }
}

export async function deleteExpense(expenseId: string): Promise<void | { error: string }> {
  if (!expenseId) return { error: "ID Pengeluaran tidak valid." };
  try {
    await deleteDoc(doc(db, "expenses", expenseId));
  } catch (error: any) {
    console.error("Error deleting expense:", error);
    return { error: error.message || "Gagal menghapus pengeluaran." };
  }
}
