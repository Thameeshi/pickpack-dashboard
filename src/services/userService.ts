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

    // Try Cloud Function first (if deployed)
    try {
      const functionUrl = import.meta.env.VITE_FIREBASE_FUNCTION_URL || 
        `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net`;
      
      const response = await fetch(
        `${functionUrl}/updateUserPassword`,
        {
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
        }
      );

      if (response.ok) {
        await response.json();
        
        // Log the password update in Firestore
        await updateDoc(doc(db, 'users', userId), {
          passwordUpdatedAt: new Date().toISOString(),
          passwordUpdatedBy: currentUser.uid,
          temporaryPassword: false
        });

        return {
          success: true,
          message: `Password has been updated for ${userEmail}`
        };
      }
    } catch {
      console.log('Cloud Function not available, using fallback method...');
    }

    // Fallback: Store temporary password for user to set on next login
    await updateDoc(doc(db, 'users', userId), {
      temporaryPassword: true,
      tempPasswordSetAt: new Date().toISOString(),
      passwordUpdatedBy: currentUser.uid,
      passwordUpdatedAt: new Date().toISOString(),
      // Note: Don't store actual password in Firestore for security
      passwordResetRequired: true
    });

    return {
      success: true,
      message: `Password reset initiated for ${userEmail}. User will need to complete password change on next login.`
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
  phone: string
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
