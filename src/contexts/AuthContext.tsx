/**
 * AuthContext — Web Dashboard Authentication State Provider
 * 
 * This context wraps the entire React app. It:
 * 1. Establishes the real-time listener for current login state.
 * 2. Fetches the Firestore profile and checks the role.
 * 3. Enforces that only 'supervisor' or 'superadmin' users can access the dashboard.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Set up Firebase Auth state observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          // Fetch the user's role profile doc from Firestore
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (snap.exists()) {
            const p = snap.data() as UserProfile;
            // Guard: Only allow users with administrative privileges (supervisors/superadmins)
            if (p.role === 'supervisor' || p.role === 'superadmin') {
              setProfile(p);
            } else {
              // Sign out immediately if role is driver or other non-admin
              setProfile(null);
              await signOut(auth);
            }
          } else {
            setProfile(null);
          }
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Dashboard Sign In logic
  const login = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, 'users', cred.user.uid));
    if (snap.exists()) {
      const p = snap.data() as UserProfile;
      // Guard: Drivers are blocked from logging into the management dashboard
      if (p.role !== 'supervisor' && p.role !== 'superadmin') {
        await signOut(auth);
        throw new Error('Access denied. Only supervisors and admins can access this dashboard.');
      }
      setProfile(p);
    } else {
      await signOut(auth);
      throw new Error('User profile not found.');
    }
  };

  // Dashboard Sign Out logic
  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

