
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc, getDocs, updateDoc, query, where, deleteDoc, limit, orderBy, startAfter, endBefore, type DocumentSnapshot, type DocumentData, limitToLast } from "firebase/firestore";
import { db } from "./config";
import { addStockMutation, type StockMutationInput } from "./stockMutations"; // Added import

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
  } catch (error: any) {
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

function generateSkuForProduct(productName: string, branchId?: string): string {
  const namePart = productName.substring(0, 3).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase(); // 5 char random
  const timestampPart = Timestamp.now().toMillis().toString().slice(-4); // last 4 digits of millis
  return `SKU-${namePart}${randomPart}${timestampPart}`;
}

export async function addInventoryItem(
  itemData: InventoryItemInput, 
  categoryName: string,
  userId?: string, // Optional: for stock mutation logging
  userName?: string // Optional: for stock mutation logging
): Promise<InventoryItem | { error: string }> {
  if (!itemData.name.trim()) return { error: "Nama produk tidak boleh kosong." };
  if (!itemData.branchId) return { error: "ID Cabang diperlukan." };
  if (!itemData.categoryId) return { error: "Kategori produk diperlukan." };
  if (itemData.quantity < 0) return { error: "Stok tidak boleh negatif."};
  if (itemData.price < 0) return { error: "Harga jual tidak boleh negatif."};
  if (itemData.costPrice < 0) return { error: "Harga pokok tidak boleh negatif."};

  try {
    const now = serverTimestamp() as Timestamp;
    const clientTimestamp = Timestamp.now();
    
    let skuToSave = itemData.sku?.trim();
    if (!skuToSave) {
      const tempDocRef = doc(collection(db, "inventoryItems")); 
      skuToSave = `AUTOSKU-${tempDocRef.id.substring(0, 8).toUpperCase()}`;
    }

    const itemRef = doc(collection(db, "inventoryItems")); // Generate ID beforehand
    const itemToSave = {
      ...itemData,
      id: itemRef.id, // Use the generated ID
      sku: skuToSave,
      costPrice: itemData.costPrice || 0,
      categoryName,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(itemRef, itemToSave); // Use setDoc with the pre-generated ref

    const savedItem: InventoryItem = {
      id: itemRef.id,
      ...itemData,
      sku: skuToSave,
      costPrice: itemData.costPrice || 0,
      categoryName,
      createdAt: clientTimestamp,
      updatedAt: clientTimestamp
    };

    if (itemData.quantity > 0) {
      const mutationInput: StockMutationInput = {
        branchId: itemData.branchId,
        productId: savedItem.id,
        productName: savedItem.name,
        sku: savedItem.sku,
        mutationTime: clientTimestamp, // Use the same clientTimestamp as item creation
        type: "INITIAL_STOCK",
        quantityChange: itemData.quantity,
        currentProductStock: 0, // Initial stock always starts from 0 for this item
        notes: `Stok awal produk baru: ${savedItem.name}`,
        userId: userId,
        userName: userName,
      };
      const mutationResult = await addStockMutation(mutationInput);
      if ("error" in mutationResult) {
        console.warn(`Inventory item ${savedItem.name} added, but failed to log initial stock mutation: ${mutationResult.error}`);
        // Decide if this should be a hard error or just a warning
      }
    }
    return savedItem;

  } catch (error: any) {
    console.error("Error adding inventory item:", error);
    return { error: error.message || "Gagal menambah produk." };
  }
}

export async function getInventoryItems(
  branchId: string,
  options: {
    limit?: number;
    searchTerm?: string; 
    startAfterDoc?: DocumentSnapshot<DocumentData> | null;
    endBeforeDoc?: DocumentSnapshot<DocumentData> | null;
  } = {}
): Promise<{ items: InventoryItem[]; lastDoc?: DocumentSnapshot<DocumentData>; firstDoc?: DocumentSnapshot<DocumentData>; hasMore: boolean }> {
  if (!branchId) return { items: [], hasMore: false };
  try {
    let qConstraints: any[] = [where("branchId", "==", branchId)];
    
    qConstraints.push(orderBy("name")); 

    if (options.startAfterDoc) {
      qConstraints.push(startAfter(options.startAfterDoc));
    }
    if (options.endBeforeDoc) {
      qConstraints = qConstraints.filter(c => c.type !== 'orderBy'); 
      qConstraints.push(orderBy("name", "desc")); 
      if (options.limit && options.limit > 0) {
        qConstraints.push(limitToLast(options.limit + 1)); 
      }
    } else {
      if (options.limit && options.limit > 0) {
        qConstraints.push(limit(options.limit + 1)); 
      }
    }


    const q = query(collection(db, "inventoryItems"), ...qConstraints);
    const querySnapshot = await getDocs(q);
    
    let items: InventoryItem[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({ id: docSnap.id, ...data, costPrice: data.costPrice || 0 } as InventoryItem);
    });

    let hasMore = false;
    if (options.limit && items.length > options.limit) {
        hasMore = true;
        if (options.endBeforeDoc) {
            items.shift(); 
        } else {
            items.pop(); 
        }
    }
    
    if (options.endBeforeDoc) {
        items.reverse(); 
    }
    
    const firstDoc = items.length > 0 ? querySnapshot.docs.find(d => d.id === items[0].id) : undefined;
    const lastDoc = items.length > 0 ? querySnapshot.docs.find(d => d.id === items[items.length -1].id) : undefined;

    return { items, firstDoc, lastDoc, hasMore };

  } catch (error: any) {
    console.error("Error fetching inventory items:", error);
    return { items: [], hasMore: false };
  }
}

export async function updateInventoryItem(itemId: string, updates: Partial<Omit<InventoryItem, 'id' | 'branchId' | 'createdAt'>>, newCategoryName?: string): Promise<void | { error: string }> {
  if (!itemId) return { error: "ID Produk tidak valid." };
  // Note: Stock quantity updates should ideally go through a dedicated stock adjustment function
  // that also logs a stock mutation. This function should primarily be for metadata updates.
  // If 'quantity' is in updates, it's a direct override and needs careful handling or disallowing.
  if (updates.quantity !== undefined) {
      return { error: "Pembaruan stok langsung tidak diizinkan melalui fungsi ini. Gunakan fungsi penyesuaian stok."}
  }
  try {
    const itemRef = doc(db, "inventoryItems", itemId);
    const payload: any = { ...updates, updatedAt: serverTimestamp() };
    if (updates.costPrice === undefined || updates.costPrice === null || isNaN(Number(updates.costPrice))) {
    } else {
      payload.costPrice = Number(updates.costPrice);
    }
    if (updates.sku === undefined && 'sku' in updates) { 
    } else if (updates.sku === "") {
      payload.sku = ""; 
    } else if (updates.sku) {
      payload.sku = updates.sku.trim();
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
  // Add check: disallow deletion if there are stock mutations referencing this item?
  // Or mark as "deleted" instead of actual deletion for audit trail.
  // For now, direct deletion.
  try {
    await deleteDoc(doc(db, "inventoryItems", itemId));
  } catch (error: any) {
    console.error("Error deleting inventory item:", error);
    return { error: error.message || "Gagal menghapus produk." };
  }
}

    
