
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged as onFirebaseAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "./config";
import { createUserDocument, getUserDocument } from "./firestore";
import type { UserData } from "@/contexts/auth-context";

export async function registerWithEmailAndPassword(name: string, email: string, password: string): Promise<{ user: FirebaseUser; userData: UserData | null } | { error: string }> {
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
    };
    await createUserDocument(user.uid, additionalData);
    const userData = await getUserDocument(user.uid);

    return { user, userData };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function signInWithEmail(email: string, password: string): Promise<{ user: FirebaseUser; userData: UserData | null } | { error: string }> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const userData = await getUserDocument(user.uid);
    return { user, userData };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function signOutUser(): Promise<void | { error: string }> {
  try {
    await signOut(auth);
  } catch (error: any) {
    return { error: error.message };
  }
}

export function onAuthStateChanged(callback: (user: FirebaseUser | null, userData: UserData | null) => void) {
  return onFirebaseAuthStateChanged(auth, async (user) => {
    if (user) {
      const userData = await getUserDocument(user.uid);
      callback(user, userData);
    } else {
      callback(null, null);
    }
  });
}
