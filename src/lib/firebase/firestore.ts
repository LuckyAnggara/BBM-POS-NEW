
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc, getDocs, updateDoc, query, where, deleteDoc } from "firebase/firestore";
import { db } from "./config";
import type { UserData } from "@/contexts/auth-context";
import type { Branch } from "@/contexts/branch-context";

export async function createUserDocument(uid: string, data: Partial<UserData>): Promise<void> {
  const userRef = doc(db, "users", uid);
  const userData: Omit<UserData, 'uid'> & { createdAt: Timestamp } = {
    name: data.name || "Pengguna Baru",
    email: data.email || "",
    avatarUrl: data.avatarUrl || null,
    branchId: data.branchId === undefined ? null : data.branchId,
    role: data.role || "cashier",
    createdAt: serverTimestamp() as Timestamp, // Will be converted by server
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
      createdAt: data.createdAt, // Timestamp object
    } as UserData;
  } else {
    return null;
  }
}

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
    const branchRef = doc(db, "branches", branchId);
    await deleteDoc(branchRef);
  } catch (error: any) {
    console.error("Error deleting branch:", error);
    // Consider implications: users assigned to this branch might need handling.
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
    // Sort branches by name for consistent display
    branches.sort((a, b) => a.name.localeCompare(b.name));
    return branches;
  } catch (error) {
    console.error("Error fetching branches:", error);
    return [];
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
