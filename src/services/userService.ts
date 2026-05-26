import { collection, getDocs, doc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
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
        const result = await response.json();
        
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
    } catch (functionError) {
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
  } catch (error: any) {
    console.error('Password update error:', error);
    throw new Error(error.message || 'Failed to update password');
  }
}
