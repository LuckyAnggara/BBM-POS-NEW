
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged as onFirebaseAuthStateChanged,
  type User as FirebaseUser,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth } from "./config";
import { createUserDocument, getUserDocument, updateUserAccountDetails } from "./users";
import type { UserData } from "@/contexts/auth-context";

export async function registerWithEmailAndPassword(name: string, email: string, password: string): Promise<{ user: FirebaseUser; userData: UserData | null } | { error: string; errorCode?: string }> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: name });

    const additionalData: Partial<UserData> = {
      name: user.displayName || name,
      email: user.email || email,
      avatarUrl: user.photoURL || null,
      role: "cashier", 
      branchId: null,
      localPrinterUrl: null, // Initialize
    };
    await createUserDocument(user.uid, additionalData);
    const userData = await getUserDocument(user.uid);

    return { user, userData };
  } catch (error: any) {
    console.error("Registration error:", error);
    return { error: error.message, errorCode: error.code };
  }
}

export async function signInWithEmail(email: string, password: string): Promise<{ user: FirebaseUser; userData: UserData | null } | { error: string; errorCode?: string }> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const userData = await getUserDocument(user.uid);
    return { user, userData };
  } catch (error: any) {
    console.error("Login error:", error);
    return { error: error.message, errorCode: error.code };
  }
}

export async function signOutUser(): Promise<void | { error: string }> {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error("Sign out error:", error);
    return { error: error.message };
  }
}

export function onAuthStateChanged(callback: (user: FirebaseUser | null, userData: UserData | null) => void) {
  return onFirebaseAuthStateChanged(auth, async (user) => {
    if (user) {
      await user.reload().catch(err => console.warn("Error reloading user in onAuthStateChanged:", err)); 
      const freshUser = auth.currentUser; 
      const userData = freshUser ? await getUserDocument(freshUser.uid) : null;
      callback(freshUser, userData);
    } else {
      callback(null, null);
    }
  });
}

export async function updateUserProfileData(updates: { name?: string; avatarUrl?: string; localPrinterUrl?: string | null; }): Promise<{ success?: boolean; error?: string }> {
  const user = auth.currentUser;
  if (!user) {
    return { error: "Pengguna tidak ditemukan. Silakan login kembali." };
  }

  const profileUpdates: { displayName?: string; photoURL?: string | null } = {};
  if (updates.name !== undefined && updates.name !== user.displayName) {
    profileUpdates.displayName = updates.name;
  }
  if (updates.avatarUrl !== undefined && updates.avatarUrl !== user.photoURL) {
    profileUpdates.photoURL = updates.avatarUrl === "" ? null : updates.avatarUrl;
  }

  try {
    if (Object.keys(profileUpdates).length > 0) {
      await updateProfile(user, profileUpdates);
    }

    // Prepare updates for Firestore document
    const firestoreUpdates: { name?: string; avatarUrl?: string; localPrinterUrl?: string | null } = {};
    if (updates.name !== undefined) firestoreUpdates.name = updates.name;
    if (updates.avatarUrl !== undefined) firestoreUpdates.avatarUrl = updates.avatarUrl;
    if (updates.localPrinterUrl !== undefined) firestoreUpdates.localPrinterUrl = updates.localPrinterUrl;
    
    if (Object.keys(firestoreUpdates).length > 0) {
        const firestoreResult = await updateUserAccountDetails(user.uid, firestoreUpdates);
        if (firestoreResult && firestoreResult.error) {
            console.warn("Firebase Auth profile updated, but Firestore update failed:", firestoreResult.error);
            // Optionally, you could try to revert Auth profile update or just notify the user
        }
    }
    await user.reload(); 

    return { success: true };
  } catch (error: any) {
    console.error("Error updating user profile:", error);
    return { error: error.message || "Gagal memperbarui profil." };
  }
}

export async function changeUserPassword(currentPasswordVal: string, newPasswordVal: string): Promise<{ success?: boolean; error?: string; errorCode?: string }> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    return { error: "Pengguna tidak ditemukan atau email tidak tersedia. Silakan login kembali." };
  }

  const credential = EmailAuthProvider.credential(user.email, currentPasswordVal);

  try {
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPasswordVal);
    return { success: true };
  } catch (error: any) {
    console.error("Error changing password:", error);
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' || error.code === 'auth/user-mismatch') {
        return { error: "Password saat ini salah.", errorCode: error.code };
    }
     if (error.code === 'auth/weak-password') {
        return { error: "Password baru terlalu lemah. Minimal 6 karakter.", errorCode: error.code };
    }
    return { error: error.message || "Gagal mengganti password.", errorCode: error.code };
  }
}
