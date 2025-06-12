
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc, getDocs, updateDoc, query, where, deleteDoc, limit, orderBy, startAfter, endBefore, type DocumentSnapshot, type DocumentData, limitToLast } from "firebase/firestore";
import { db } from "./config";

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

export async function addInventoryItem(itemData: InventoryItemInput, categoryName: string): Promise<InventoryItem | { error: string }> {
  if (!itemData.name.trim()) return { error: "Nama produk tidak boleh kosong." };
  if (!itemData.branchId) return { error: "ID Cabang diperlukan." };
  if (!itemData.categoryId) return { error: "Kategori produk diperlukan." };
  if (itemData.quantity < 0) return { error: "Stok tidak boleh negatif."};
  if (itemData.price < 0) return { error: "Harga jual tidak boleh negatif."};
  if (itemData.costPrice < 0) return { error: "Harga pokok tidak boleh negatif."};

  try {
    const now = serverTimestamp() as Timestamp;
    
    let skuToSave = itemData.sku?.trim();
    if (!skuToSave) {
      // Generate a more unique SKU using part of a new Firestore ID
      const tempDocRef = doc(collection(db, "inventoryItems")); // Generate a new ID without writing
      skuToSave = `AUTOSKU-${tempDocRef.id.substring(0, 8).toUpperCase()}`;
    }

    const itemRef = await addDoc(collection(db, "inventoryItems"), {
      ...itemData,
      sku: skuToSave,
      costPrice: itemData.costPrice || 0,
      categoryName,
      createdAt: now,
      updatedAt: now,
    });
    const clientTimestamp = Timestamp.now();
    return {
      id: itemRef.id,
      ...itemData,
      sku: skuToSave,
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

export async function getInventoryItems(
  branchId: string,
  options: {
    limit?: number;
    searchTerm?: string; // Search term is for client-side filtering on the current page for now
    startAfterDoc?: DocumentSnapshot<DocumentData> | null;
    endBeforeDoc?: DocumentSnapshot<DocumentData> | null;
  } = {}
): Promise<{ items: InventoryItem[]; lastDoc?: DocumentSnapshot<DocumentData>; firstDoc?: DocumentSnapshot<DocumentData>; hasMore: boolean }> {
  if (!branchId) return { items: [], hasMore: false };
  try {
    let qConstraints: any[] = [where("branchId", "==", branchId)];
    
    // Always order by name for consistent pagination. 
    // Search term is applied client-side on the fetched page of items.
    qConstraints.push(orderBy("name")); 

    if (options.startAfterDoc) {
      qConstraints.push(startAfter(options.startAfterDoc));
    }
    if (options.endBeforeDoc) {
      // For endBefore, we need to reverse the orderBy and use limitToLast
      qConstraints = qConstraints.filter(c => c.type !== 'orderBy'); // Remove existing orderBy
      qConstraints.push(orderBy("name", "desc")); // Order desc for endBefore
      if (options.limit && options.limit > 0) {
        qConstraints.push(limitToLast(options.limit + 1)); // Fetch one extra
      }
    } else {
      if (options.limit && options.limit > 0) {
        qConstraints.push(limit(options.limit + 1)); // Fetch one extra
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
            items.shift(); // Remove the extra item used for 'hasPrevious' check
        } else {
            items.pop(); // Remove the extra item used for 'hasNext' check
        }
    }
    
    if (options.endBeforeDoc) {
        items.reverse(); // Reverse back to ascending order
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
  try {
    const itemRef = doc(db, "inventoryItems", itemId);
    const payload: any = { ...updates, updatedAt: serverTimestamp() };
    if (updates.costPrice === undefined || updates.costPrice === null || isNaN(Number(updates.costPrice))) {
      // No change or invalid cost price
    } else {
      payload.costPrice = Number(updates.costPrice);
    }
    if (updates.sku === undefined && 'sku' in updates) { 
      // SKU is explicitly being set to undefined (should not happen with current form), or was not part of updates
    } else if (updates.sku === "") {
      // If SKU is explicitly set to an empty string, allow it (or generate one if this flow changes)
      payload.sku = ""; 
    } else if (updates.sku) {
      payload.sku = updates.sku.trim();
    }
    // If SKU is not in updates, it remains unchanged. If it was empty and needs auto-generation on update, add logic here.

    if (newCategoryName && updates.categoryId) { // If categoryId changes, update categoryName
      payload.categoryName = newCategoryName;
    } else if (updates.categoryId && !newCategoryName) { // If categoryId changes but no newCategoryName provided (e.g. direct update)
        // Fetch category name based on new categoryId
        const catDoc = await getDoc(doc(db, "inventoryCategories", updates.categoryId));
        if (catDoc.exists()) {
            payload.categoryName = catDoc.data().name;
        } else {
            console.warn("Category for updated item not found, categoryName might be stale or incorrect.");
            // Optionally set categoryName to a default or null if category is invalid
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

    