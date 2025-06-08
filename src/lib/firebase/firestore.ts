
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc, getDocs, updateDoc, query, where, deleteDoc, writeBatch } from "firebase/firestore";
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
export async function createBranch(name: string): Promise<Branch | { error: string }> {
  if (!name.trim()) {
    return { error: "Nama cabang tidak boleh kosong." };
  }
  try {
    const branchRef = await addDoc(collection(db, "branches"), {
      name: name.trim(),
      createdAt: serverTimestamp(),
    });
    return { id: branchRef.id, name: name.trim() };
  } catch (error: any) {
    console.error("Error creating branch:", error);
    return { error: error.message || "Gagal membuat cabang." };
  }
}

export async function updateBranch(branchId: string, newName: string): Promise<void | { error: string }> {
  if (!branchId) return { error: "ID Cabang tidak valid." };
  if (!newName.trim()) return { error: "Nama cabang baru tidak boleh kosong." };
  try {
    const branchRef = doc(db, "branches", branchId);
    await updateDoc(branchRef, {
      name: newName.trim(),
    });
  } catch (error: any) {
    console.error("Error updating branch:", error);
    return { error: error.message || "Gagal memperbarui cabang." };
  }
}

export async function deleteBranch(branchId: string): Promise<void | { error: string }> {
  if (!branchId) return { error: "ID Cabang tidak valid." };
  try {
    // TODO: Consider what happens to users and other data (e.g., inventory) linked to this branch.
    // For now, just deleting the branch. This might orphan some data or require cleanup.
    // A more robust solution might involve a transaction or cloud function to handle related data.
    const branchRef = doc(db, "branches", branchId);
    await deleteDoc(branchRef);
  } catch (error: any) {
    console.error("Error deleting branch:", error);
    return { error: error.message || "Gagal menghapus cabang." };
  }
}

export async function getBranches(): Promise<Branch[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "branches"));
    const branches: Branch[] = [];
    querySnapshot.forEach((doc) => {
      branches.push({ id: doc.id, ...doc.data() } as Branch);
    });
    branches.sort((a, b) => a.name.localeCompare(b.name));
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
  categoryName?: string; // Denormalized for easier display
  branchId: string;
  quantity: number;
  price: number;
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


// --- Inventory Category Management ---
export async function addInventoryCategory(categoryData: InventoryCategoryInput): Promise<InventoryCategory | { error: string }> {
  if (!categoryData.name.trim()) return { error: "Nama kategori tidak boleh kosong." };
  if (!categoryData.branchId) return { error: "ID Cabang diperlukan untuk kategori." };
  try {
    const categoryRef = await addDoc(collection(db, "inventoryCategories"), {
      ...categoryData,
      createdAt: serverTimestamp(),
    });
    return { id: categoryRef.id, ...categoryData, createdAt: Timestamp.now() }; // Approximate createdAt for return
  } catch (error: any) {
    console.error("Error adding inventory category:", error);
    return { error: error.message || "Gagal menambah kategori." };
  }
}

export async function getInventoryCategories(branchId: string): Promise<InventoryCategory[]> {
  if (!branchId) return [];
  try {
    const q = query(collection(db, "inventoryCategories"), where("branchId", "==", branchId));
    const querySnapshot = await getDocs(q);
    const categories: InventoryCategory[] = [];
    querySnapshot.forEach((doc) => {
      categories.push({ id: doc.id, ...doc.data() } as InventoryCategory);
    });
    categories.sort((a,b) => a.name.localeCompare(b.name));
    return categories;
  } catch (error) {
    console.error("Error fetching inventory categories:", error);
    return [];
  }
}

export async function deleteInventoryCategory(categoryId: string): Promise<void | { error: string }> {
  if (!categoryId) return { error: "ID Kategori tidak valid." };
  try {
    // Check if any inventory items are using this category
    const itemsQuery = query(collection(db, "inventoryItems"), where("categoryId", "==", categoryId));
    const itemsSnapshot = await getDocs(itemsQuery);
    if (!itemsSnapshot.empty) {
      return { error: `Kategori ini masih digunakan oleh ${itemsSnapshot.size} produk. Hapus atau ubah produk tersebut terlebih dahulu.` };
    }
    await deleteDoc(doc(db, "inventoryCategories", categoryId));
  } catch (error: any) {
    console.error("Error deleting inventory category:", error);
    return { error: error.message || "Gagal menghapus kategori." };
  }
}


// --- Inventory Item Management ---
export async function addInventoryItem(itemData: InventoryItemInput, categoryName: string): Promise<InventoryItem | { error: string }> {
  if (!itemData.name.trim()) return { error: "Nama produk tidak boleh kosong." };
  if (!itemData.branchId) return { error: "ID Cabang diperlukan." };
  if (!itemData.categoryId) return { error: "Kategori produk diperlukan." };
  if (itemData.quantity < 0) return { error: "Jumlah tidak boleh negatif."};
  if (itemData.price < 0) return { error: "Harga tidak boleh negatif."};

  try {
    const itemRef = await addDoc(collection(db, "inventoryItems"), {
      ...itemData,
      categoryName, // Denormalized
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { 
      id: itemRef.id, 
      ...itemData, 
      categoryName,
      createdAt: Timestamp.now(), // Approximate for return
      updatedAt: Timestamp.now()  // Approximate for return
    };
  } catch (error: any) {
    console.error("Error adding inventory item:", error);
    return { error: error.message || "Gagal menambah produk." };
  }
}

export async function getInventoryItems(branchId: string): Promise<InventoryItem[]> {
  if (!branchId) return [];
  try {
    const q = query(collection(db, "inventoryItems"), where("branchId", "==", branchId));
    const querySnapshot = await getDocs(q);
    const items: InventoryItem[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as InventoryItem);
    });
    items.sort((a,b) => a.name.localeCompare(b.name));
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
    if (newCategoryName && updates.categoryId) { // if categoryId is being updated, also update categoryName
      payload.categoryName = newCategoryName;
    } else if (updates.categoryId && !newCategoryName) {
        // Fetch the category name if only categoryId is provided without newCategoryName
        const catDoc = await getDoc(doc(db, "inventoryCategories", updates.categoryId));
        if (catDoc.exists()) {
            payload.categoryName = catDoc.data().name;
        } else {
            // Handle case where category might not exist, though ideally UI prevents this
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

    