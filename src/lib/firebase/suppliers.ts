
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc, getDocs, updateDoc, query, where, deleteDoc, limit, orderBy } from "firebase/firestore";
import { db } from "./config";

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  branchId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type SupplierInput = Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>;

export async function addSupplier(supplierData: SupplierInput): Promise<Supplier | { error: string }> {
  if (!supplierData.name.trim()) return { error: "Nama pemasok tidak boleh kosong." };
  if (!supplierData.branchId) return { error: "ID Cabang diperlukan untuk pemasok." };
  try {
    const now = serverTimestamp() as Timestamp;
    const supplierRef = await addDoc(collection(db, "suppliers"), {
      ...supplierData,
      createdAt: now,
      updatedAt: now,
    });
    const clientTimestamp = Timestamp.now();
    return { id: supplierRef.id, ...supplierData, createdAt: clientTimestamp, updatedAt: clientTimestamp };
  } catch (error: any) {
    console.error("Error adding supplier:", error);
    return { error: error.message || "Gagal menambah pemasok." };
  }
}

export async function getSuppliers(branchId: string): Promise<Supplier[]> {
  if (!branchId) return [];
  try {
    const q = query(collection(db, "suppliers"), where("branchId", "==", branchId), orderBy("name"));
    const querySnapshot = await getDocs(q);
    const suppliers: Supplier[] = [];
    querySnapshot.forEach((docSnap) => {
      suppliers.push({ id: docSnap.id, ...docSnap.data() } as Supplier);
    });
    return suppliers;
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return [];
  }
}

export async function updateSupplier(supplierId: string, updates: Partial<SupplierInput>): Promise<void | { error: string }> {
  if (!supplierId) return { error: "ID Pemasok tidak valid." };
  try {
    const supplierRef = doc(db, "suppliers", supplierId);
    await updateDoc(supplierRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error("Error updating supplier:", error);
    return { error: error.message || "Gagal memperbarui pemasok." };
  }
}

export async function deleteSupplier(supplierId: string): Promise<void | { error: string }> {
  if (!supplierId) return { error: "ID Pemasok tidak valid." };
  try {
    const poQuery = query(collection(db, "purchaseOrders"), where("supplierId", "==", supplierId), limit(1));
    const poSnapshot = await getDocs(poQuery);
    if (!poSnapshot.empty) {
      return { error: "Pemasok ini masih terkait dengan Pesanan Pembelian. Hapus atau ubah PO terlebih dahulu." };
    }
    await deleteDoc(doc(db, "suppliers", supplierId));
  } catch (error: any) {
    console.error("Error deleting supplier:", error);
    return { error: error.message || "Gagal menghapus pemasok." };
  }
}

    