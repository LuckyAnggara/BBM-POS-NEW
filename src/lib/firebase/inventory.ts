
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
      const tempDocRef = doc(collection(db, "inventoryItems")); 
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
    searchTerm?: string;
    startAfterDoc?: DocumentSnapshot<DocumentData> | null;
    endBeforeDoc?: DocumentSnapshot<DocumentData> | null;
  } = {}
): Promise<{ items: InventoryItem[]; lastDoc?: DocumentSnapshot<DocumentData>; firstDoc?: DocumentSnapshot<DocumentData>; hasMore: boolean }> {
  if (!branchId) return { items: [], hasMore: false };
  try {
    let qConstraints: any[] = [where("branchId", "==", branchId)];
    
    // Note: Firestore does not support combining inequality filters on different fields (e.g., name search)
    // with range cursors (startAfter/endBefore) effectively unless the orderBy field is the same.
    // For robust search with pagination, consider a dedicated search service (e.g., Algolia, Elasticsearch)
    // or a simpler approach for Firestore:
    // 1. If searchTerm is present, perform a separate query (potentially without pagination or with simpler pagination).
    // 2. If no searchTerm, use orderBy name with cursors.

    // Simple name-based search (case-insensitive, prefix only for Firestore direct query)
    // This basic search won't work well with non-prefix searches or SKU searches without composite indexes.
    if (options.searchTerm) {
       const searchTermLower = options.searchTerm.toLowerCase();
       const searchTermUpper = options.searchTerm.toUpperCase(); // For SKU which might be uppercase
      // This is a simplified search. For robust search, use a dedicated search solution or more complex queries.
      // Here, we'll filter client-side if a searchTerm is provided with pagination, which is not ideal for large datasets.
      // For now, if searchTerm is provided, pagination might not be perfectly accurate across the *entire* dataset,
      // but rather paginates through *all* items and then filters.
      // A better approach for search + pagination is to filter *then* paginate, but Firestore makes this hard.
    }

    qConstraints.push(orderBy("name")); // Always order by name for consistent pagination

    if (options.startAfterDoc) {
      qConstraints.push(startAfter(options.startAfterDoc));
    }
    if (options.endBeforeDoc) {
      qConstraints.push(endBefore(options.endBeforeDoc));
       qConstraints = qConstraints.filter(c => c.type !== 'orderBy'); // Remove existing orderBy
       qConstraints.push(orderBy("name", "desc")); // Order desc for endBefore with limitToLast
    }


    if (options.limit && options.limit > 0) {
      if (options.endBeforeDoc) {
        qConstraints.push(limitToLast(options.limit + 1)); // Fetch one extra to check if there's a previous page
      } else {
        qConstraints.push(limit(options.limit + 1)); // Fetch one extra to check if there's a next page
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
    
    // Client-side filtering if searchTerm is present (suboptimal for large datasets with pagination)
    if (options.searchTerm) {
        const searchTermLower = options.searchTerm.toLowerCase();
        items = items.filter(item => 
            item.name.toLowerCase().includes(searchTermLower) ||
            (item.sku && item.sku.toLowerCase().includes(searchTermLower))
        );
    }


    const firstDoc = querySnapshot.docs[0];
    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - (hasMore && !options.endBeforeDoc ? 2 : 1 )]; // Adjust if extra item was fetched
    
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
  try {
    await deleteDoc(doc(db, "inventoryItems", itemId));
  } catch (error: any) {
    console.error("Error deleting inventory item:", error);
    return { error: error.message || "Gagal menghapus produk." };
  }
}

    
