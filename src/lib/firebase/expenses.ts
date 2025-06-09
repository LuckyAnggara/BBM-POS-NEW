
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc, getDocs, updateDoc, query, where, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "./config";

export interface Expense {
  id: string;
  branchId: string;
  userId: string; 
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
        date: expenseData.date, 
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
      endOfDayEndDate.setHours(23, 59, 59, 999); 
      const endTimestamp = Timestamp.fromDate(endOfDayEndDate);

      qConstraints.push(where("date", ">=", startTimestamp));
      qConstraints.push(where("date", "<=", endTimestamp));
    }
    
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

    