
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc, getDocs, updateDoc, query, where, deleteDoc, writeBatch, orderBy, limit } from "firebase/firestore";
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
  if (updates.invoiceName !== undefined) dataToUpdate.invoiceName = updates.invoiceName.trim() || updates.name?.trim() || ""; // Use name if invoice name becomes empty
  if (updates.currency?.trim()) dataToUpdate.currency = updates.currency.trim();
  if (updates.taxRate !== undefined && updates.taxRate !== null && !isNaN(Number(updates.taxRate))) dataToUpdate.taxRate = Number(updates.taxRate);
  if (updates.address !== undefined) dataToUpdate.address = updates.address.trim();
  if (updates.phoneNumber !== undefined) dataToUpdate.phoneNumber = updates.phoneNumber.trim();

  if (Object.keys(dataToUpdate).length === 0) {
    // No actual data changed, so don't set updatedAt
     return; // Or return { message: "Tidak ada perubahan data." }
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
    const branchRef = doc(db, "branches", branchId);
    await deleteDoc(branchRef);
    // Consider what happens to users assigned to this branch
    // Potentially query users and set their branchId to null
  } catch (error: any) {
    console.error("Error deleting branch:", error);
    return { error: error.message || "Gagal menghapus cabang." };
  }
}

interface FirebaseBranchData extends Omit<Branch, 'id'> {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export async function getBranches(): Promise<Branch[]> {
  try {
    const q = query(collection(db, "branches"), orderBy("name"));
    const querySnapshot = await getDocs(q);
    const branches: Branch[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as FirebaseBranchData;
      branches.push({
        id: doc.id,
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
  costPrice: number; // Harga Pokok
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
    const createdAt = Timestamp.now(); // Approximate for return
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
    querySnapshot.forEach((doc) => {
      categories.push({ id: doc.id, ...doc.data() } as InventoryCategory);
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
  if (itemData.quantity < 0) return { error: "Jumlah tidak boleh negatif."};
  if (itemData.price < 0) return { error: "Harga tidak boleh negatif."};
  if (itemData.costPrice < 0) return { error: "Harga pokok tidak boleh negatif."};


  try {
    const now = serverTimestamp() as Timestamp;
    const itemRef = await addDoc(collection(db, "inventoryItems"), {
      ...itemData,
      costPrice: itemData.costPrice || 0, // Ensure costPrice is set
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
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      items.push({ id: doc.id, ...data, costPrice: data.costPrice || 0 } as InventoryItem); // Ensure costPrice defaults to 0 if not present
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
      // If costPrice is being explicitly set to undefined/null/NaN, ensure it defaults to 0 or handle as error
      // For now, let's assume it might be an optional update, so we don't force it to 0 unless it's part of the explicit update.
      // If it's in `updates` and invalid, it should be caught by form validation earlier.
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
  // transactions?: string[]; // Array of transaction IDs
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
      totalSalesByPaymentMethod: { cash: 0, card: 0, transfer: 0}, // Initialize
    };
    const shiftRef = await addDoc(collection(db, "posShifts"), shiftData);
    return { id: shiftRef.id, ...shiftData, startTime: Timestamp.now() }; // Return with client-side timestamp approximation
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
  price: number; // Price per unit at the time of sale
  costPrice: number; // Cost price per unit at the time of sale
  total: number;
}

export interface PosTransaction {
  id: string;
  shiftId: string;
  branchId: string;
  userId: string; // Cashier ID
  timestamp: Timestamp;
  items: TransactionItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  totalCost: number; // Total cost of goods sold for this transaction
  paymentMethod: PaymentMethod;
  amountPaid: number; // For cash, this might be > totalAmount
  changeGiven: number; // For cash
}

export async function recordTransaction(transactionData: Omit<PosTransaction, 'id'>): Promise<PosTransaction | { error: string }> {
  if (!transactionData.shiftId || !transactionData.branchId || !transactionData.userId) {
    return { error: "Shift ID, Branch ID, dan User ID diperlukan untuk transaksi." };
  }
  if (transactionData.items.length === 0) return { error: "Transaksi tidak memiliki item." };

  const batch = writeBatch(db);

  try {
    // 1. Create Transaction Document
    const transactionRef = doc(collection(db, "posTransactions"));
    const dataToSave = {
      ...transactionData,
      timestamp: serverTimestamp() as Timestamp,
    };
    batch.set(transactionRef, dataToSave);

    // 2. Update Inventory Stock
    for (const item of transactionData.items) {
      const productRef = doc(db, "inventoryItems", item.productId);
      const productSnap = await getDoc(productRef); // Get current stock
      if (productSnap.exists()) {
        const currentStock = productSnap.data().quantity as number;
        const newStock = currentStock - item.quantity;
        if (newStock < 0) {
          // This should ideally be prevented by UI or earlier checks
          console.warn(`Stock for product ${item.productName} (${item.productId}) would go negative. Transaction recorded, but stock not updated to negative.`);
          // Optionally, you could throw an error here to stop the transaction if strict stock control is needed
          // return { error: `Stok tidak cukup untuk produk ${item.productName}.`};
        }
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


export async function getTransactionsForShift(shiftId: string): Promise<PosTransaction[]> {
  if (!shiftId) return [];
  try {
    const q = query(collection(db, "posTransactions"), where("shiftId", "==", shiftId), orderBy("timestamp", "asc"));
    const querySnapshot = await getDocs(q);
    const transactions: PosTransaction[] = [];
    querySnapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() } as PosTransaction);
    });
    return transactions;
  } catch (error) {
    console.error("Error fetching transactions for shift:", error);
    return [];
  }
}
