
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc, getDocs, updateDoc, query, where, deleteDoc, limit, orderBy } from "firebase/firestore";
import { db } from "./config";

export interface Customer {
  id: string;
  branchId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  qrCodeId?: string; 
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CustomerInput = Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>;

export async function addCustomer(customerData: CustomerInput): Promise<Customer | { error: string }> {
  if (!customerData.branchId) return { error: "ID Cabang diperlukan." };
  if (!customerData.name.trim()) return { error: "Nama pelanggan tidak boleh kosong." };

  try {
    const now = serverTimestamp() as Timestamp;
    const customerRef = doc(collection(db, "customers")); 
    const qrCodeId = customerData.qrCodeId || customerRef.id; 

    const dataToSave = {
      ...customerData,
      qrCodeId,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(customerRef, dataToSave);
    const clientTimestamp = Timestamp.now();
    return { id: customerRef.id, ...dataToSave, createdAt: clientTimestamp, updatedAt: clientTimestamp };
  } catch (error: any) {
    console.error("Error adding customer:", error);
    return { error: error.message || "Gagal menambah pelanggan." };
  }
}

export async function getCustomers(branchId: string): Promise<Customer[]> {
  if (!branchId) return [];
  try {
    const q = query(collection(db, "customers"), where("branchId", "==", branchId), orderBy("name"));
    const querySnapshot = await getDocs(q);
    const customers: Customer[] = [];
    querySnapshot.forEach((docSnap) => {
      customers.push({ id: docSnap.id, ...docSnap.data() } as Customer);
    });
    return customers;
  } catch (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
}

export async function getCustomerByQrCodeId(branchId: string, qrCodeId: string): Promise<Customer | null> {
  if (!branchId || !qrCodeId) return null;
  try {
    const q = query(
      collection(db, "customers"),
      where("branchId", "==", branchId),
      where("qrCodeId", "==", qrCodeId),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Customer;
    }
    return null;
  } catch (error) {
    console.error("Error fetching customer by QR code ID:", error);
    return null;
  }
}


export async function updateCustomer(customerId: string, updates: Partial<CustomerInput>): Promise<void | { error: string }> {
  if (!customerId) return { error: "ID Pelanggan tidak valid." };
  try {
    const customerRef = doc(db, "customers", customerId);
    await updateDoc(customerRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error("Error updating customer:", error);
    return { error: error.message || "Gagal memperbarui pelanggan." };
  }
}

export async function deleteCustomer(customerId: string): Promise<void | { error: string }> {
  if (!customerId) return { error: "ID Pelanggan tidak valid." };
  try {
    // Add check if customer is associated with any transactions in future
    await deleteDoc(doc(db, "customers", customerId));
  } catch (error: any) {
    console.error("Error deleting customer:", error);
    return { error: error.message || "Gagal menghapus pelanggan." };
  }
}

    