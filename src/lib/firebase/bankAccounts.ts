
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc, getDocs, updateDoc, query, where, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "./config";

export interface BankAccount {
  id: string;
  branchId?: string | null; 
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
export type BankAccountInput = Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'>;

export async function addBankAccount(data: BankAccountInput): Promise<BankAccount | { error: string }> {
  if (!data.bankName.trim()) return { error: "Nama bank tidak boleh kosong." };
  if (!data.accountNumber.trim()) return { error: "Nomor rekening tidak boleh kosong." };
  if (!data.accountHolderName.trim()) return { error: "Nama pemilik rekening tidak boleh kosong." };
  try {
    const now = serverTimestamp() as Timestamp;
    const docRef = await addDoc(collection(db, "bankAccounts"), {
      ...data,
      branchId: data.branchId || null, 
      isActive: data.isActive === undefined ? true : data.isActive,
      createdAt: now,
      updatedAt: now,
    });
    const clientTimestamp = Timestamp.now();
    return { id: docRef.id, ...data, branchId: data.branchId || null, isActive: data.isActive === undefined ? true : data.isActive, createdAt: clientTimestamp, updatedAt: clientTimestamp };
  } catch (error: any) {
    console.error("Error adding bank account:", error);
    return { error: error.message || "Gagal menambah rekening bank." };
  }
}

export async function getBankAccounts(filters?: { branchId?: string, isActive?: boolean }): Promise<BankAccount[]> {
  try {
    let qConstraints: any[] = [];
    if (filters?.branchId) {
        const branchSpecificQuery = query(
            collection(db, "bankAccounts"), 
            where("branchId", "==", filters.branchId), 
            ...(filters.isActive !== undefined ? [where("isActive", "==", filters.isActive)] : []),
            orderBy("bankName")
        );
        const globalAccountsQuery = query(
            collection(db, "bankAccounts"), 
            where("branchId", "==", null), 
            ...(filters.isActive !== undefined ? [where("isActive", "==", filters.isActive)] : []),
            orderBy("bankName")
        );
        
        const [branchSnapshot, globalSnapshot] = await Promise.all([
            getDocs(branchSpecificQuery),
            getDocs(globalAccountsQuery)
        ]);

        const accounts: BankAccount[] = [];
        const accountIds = new Set<string>();

        branchSnapshot.forEach((docSnap) => {
            if(!accountIds.has(docSnap.id)){
                accounts.push({ id: docSnap.id, ...docSnap.data() } as BankAccount);
                accountIds.add(docSnap.id);
            }
        });
        globalSnapshot.forEach((docSnap) => {
            if(!accountIds.has(docSnap.id)){ 
                accounts.push({ id: docSnap.id, ...docSnap.data() } as BankAccount);
                accountIds.add(docSnap.id);
            }
        });
        accounts.sort((a, b) => a.bankName.localeCompare(b.bankName));
        return accounts;

    } else {
        if (filters?.isActive !== undefined) {
            qConstraints.push(where("isActive", "==", filters.isActive));
        }
        qConstraints.push(orderBy("bankName"));
        const q = query(collection(db, "bankAccounts"), ...qConstraints);
        const querySnapshot = await getDocs(q);
        const accounts: BankAccount[] = [];
        querySnapshot.forEach((docSnap) => {
          accounts.push({ id: docSnap.id, ...docSnap.data() } as BankAccount);
        });
        return accounts;
    }

  } catch (error) {
    console.error("Error fetching bank accounts:", error);
    return [];
  }
}

export async function updateBankAccount(accountId: string, updates: Partial<BankAccountInput>): Promise<void | { error: string }> {
  if (!accountId) return { error: "ID Rekening Bank tidak valid." };
  try {
    const accountRef = doc(db, "bankAccounts", accountId);
    await updateDoc(accountRef, {
      ...updates,
      branchId: updates.branchId === undefined ? null : updates.branchId, 
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error("Error updating bank account:", error);
    return { error: error.message || "Gagal memperbarui rekening bank." };
  }
}

export async function deleteBankAccount(accountId: string): Promise<void | { error: string }> {
  if (!accountId) return { error: "ID Rekening Bank tidak valid." };
  try {
    await deleteDoc(doc(db, "bankAccounts", accountId));
  } catch (error: any) {
    console.error("Error deleting bank account:", error);
    return { error: error.message || "Gagal menghapus rekening bank." };
  }
}

    