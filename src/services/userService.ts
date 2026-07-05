/**
 * userService — Dashboard User Profile Management Services
 * 
 * Provides database utilities for user management, including:
 * 1. Fetching user lists and driver profiles from Firestore.
 * 2. Approving/rejecting/suspending accounts (role-based controls).
 * 3. Connecting to the Node.js Express server to perform direct password updates.
 * 4. Provisioning new supervisor accounts using secondary Firebase auth configurations.
 */

import { collection, getDocs, doc, updateDoc, query, where, onSnapshot, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { UserProfile, AccountStatus, Driver } from '../types';


export async function getAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
}

export async function getDrivers(): Promise<UserProfile[]> {
  const q = query(collection(db, 'users'), where('role', '==', 'driver'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
}

export async function updateUserStatus(uid: string, status: AccountStatus, approvedBy?: string): Promise<void> {
  const updates: Partial<UserProfile> = { status };
  if (status === 'approved' && approvedBy) {
    updates.approvedBy = approvedBy;
    updates.approvedAt = new Date().toISOString();
  }
  await updateDoc(doc(db, 'users', uid), updates);
}

export async function updateUserRole(uid: string, role: UserProfile['role']): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { role });
}

// Real-time driver locations
export function subscribeToDriverLocations(callback: (drivers: Driver[]) => void): () => void {
  return onSnapshot(collection(db, 'drivers'), (snap) => {
    const drivers = snap.docs.map(d => ({ uid: d.id, ...d.data() } as Driver));
    callback(drivers);
  });
}

// Password reset functions
export async function updateUserPasswordDirectly(userId: string, userEmail: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  try {
    // Get current user's auth token
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const token = await currentUser.getIdToken();

    // Update password via Cloud Function (required)
    const functionUrl =
      import.meta.env.VITE_FIREBASE_FUNCTION_URL ||
      `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net`;

    const response = await fetch(`${functionUrl}/updateUserPassword`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        uid: userId,
        email: userEmail,
        newPassword: newPassword,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg =
        (payload && (payload.error || payload.message)) ||
        `Password update failed (HTTP ${response.status})`;
      throw new Error(msg);
    }

    // Log the password update in Firestore (dashboard indicators)
    await updateDoc(doc(db, 'users', userId), {
      passwordUpdatedAt: new Date().toISOString(),
      passwordUpdatedBy: currentUser.uid,
      temporaryPassword: false,
      passwordResetRequired: false,
      tempPasswordSetAt: null,
    });

    return {
      success: true,
      message: `Password has been updated for ${userEmail}`,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update password';
    console.error('Password update error:', error);
    const err = new Error(errorMessage);
    if (error instanceof Error) (err as Error & { cause?: Error }).cause = error;
    throw err;
  }
}

// Create a new supervisor
export async function createSupervisor(
  email: string,
  password: string,
  name: string,
  phone: string,
  assignedLocationId?: string,
  assignedLocationName?: string,
  assignedLocationType?: string
): Promise<UserProfile> {
  try {
    // Get Firebase config from environment
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    // Create a secondary app to avoid signing out the current admin
    const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp_" + Date.now());
    const secondaryAuth = getAuth(secondaryApp);
    
    // Create user in Firebase Auth
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const user = cred.user;

    // Create user profile in Firestore
    const profile: UserProfile = {
      uid: user.uid,
      email,
      name,
      displayName: name,
      phone,
      role: 'supervisor',
      status: 'approved', // Admin-created supervisors are auto-approved
      language: 'en',
      createdAt: new Date().toISOString(),
      approvedBy: auth.currentUser?.uid,
      approvedAt: new Date().toISOString(),
      assignedLocationId,
      assignedLocationName,
      assignedLocationType,
    };

    // Use the primary db with admin auth
    await setDoc(doc(db, 'users', user.uid), profile);
    
    // Clean up secondary auth and app
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
    
    return profile;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create supervisor';
    console.error('Create supervisor error:', error);
    const err = new Error(errorMessage);
    if (error instanceof Error) (err as Error & { cause?: Error }).cause = error;
    throw err;
  }
}

export async function getSupervisors(): Promise<UserProfile[]> {
  const q = query(collection(db, 'users'), where('role', '==', 'supervisor'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
}

