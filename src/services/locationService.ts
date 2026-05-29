import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type LocationType = 'warehouse' | 'supermarket';

export interface LocationRecord {
  id: string;
  name: string;
  type: LocationType;
  address?: string;
  contact?: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

const COLLECTION = 'locations';

export async function getAllLocations(): Promise<LocationRecord[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as LocationRecord))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getLocationsByType(type: LocationType): Promise<LocationRecord[]> {
  const q = query(collection(db, COLLECTION), where('type', '==', type));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as LocationRecord))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function subscribeToLocations(callback: (locations: LocationRecord[]) => void): () => void {
  return onSnapshot(collection(db, COLLECTION), (snap) => {
    const locations = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as LocationRecord))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(locations);
  });
}

export async function addLocation(payload: {
  name: string;
  type: LocationType;
  address?: string;
  contact?: string;
  createdBy: string;
}): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...payload,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return docRef.id;
}

export async function updateLocation(id: string, updates: Partial<Omit<LocationRecord, 'id'>>): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...updates,
    updatedAt: Date.now(),
  });
}

export async function deleteLocation(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
