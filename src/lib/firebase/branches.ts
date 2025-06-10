
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc, getDocs, updateDoc, query, where, deleteDoc, limit, orderBy } from "firebase/firestore";
import { db } from "./config";
import type { Branch, ReportPeriodPreset } from "@/contexts/branch-context"; // Ensure ReportPeriodPreset is imported

export interface BranchInput extends Omit<Branch, 'id'> {}

interface FirebaseBranchData extends Omit<Branch, 'id' | 'defaultReportPeriod'> {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  defaultReportPeriod?: ReportPeriodPreset;
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
      transactionDeletionPassword: branchData.transactionDeletionPassword || "",
      defaultReportPeriod: branchData.defaultReportPeriod || "thisMonth", // Add default
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
        phoneNumber: dataToSave.phoneNumber,
        transactionDeletionPassword: dataToSave.transactionDeletionPassword,
        defaultReportPeriod: dataToSave.defaultReportPeriod
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
  if (updates.transactionDeletionPassword !== undefined) dataToUpdate.transactionDeletionPassword = updates.transactionDeletionPassword;
  if (updates.defaultReportPeriod) dataToUpdate.defaultReportPeriod = updates.defaultReportPeriod;


  if (Object.keys(dataToUpdate).length === 0 && 
      !updates.hasOwnProperty('invoiceName') && 
      !updates.hasOwnProperty('address') && 
      !updates.hasOwnProperty('phoneNumber') && 
      !updates.hasOwnProperty('currency') && 
      !updates.hasOwnProperty('taxRate') && 
      !updates.hasOwnProperty('transactionDeletionPassword') &&
      !updates.hasOwnProperty('defaultReportPeriod')) {
     return; // No actual data fields to update, only possibly updatedAt if we proceeded.
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

    const bankAccountsQuery = query(collection(db, "bankAccounts"), where("branchId", "==", branchId), limit(1));
    const bankAccountsSnapshot = await getDocs(bankAccountsQuery);
    if (!bankAccountsSnapshot.empty) {
      return { error: `Masih ada data rekening bank yang terhubung ke cabang ini.` };
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
        transactionDeletionPassword: data.transactionDeletionPassword || "",
        defaultReportPeriod: data.defaultReportPeriod || "thisMonth"
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
        transactionDeletionPassword: data.transactionDeletionPassword || "",
        defaultReportPeriod: data.defaultReportPeriod || "thisMonth"
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching branch by ID:", error);
    return null;
  }
}
