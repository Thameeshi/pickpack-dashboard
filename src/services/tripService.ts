import { collection, getDocs, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TripSession } from '../types';

export async function getAllTrips(): Promise<TripSession[]> {
  const snap = await getDocs(collection(db, 'tripSessions'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TripSession))
    .sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
}

export async function getTripsByDriver(driverId: string): Promise<TripSession[]> {
  const q = query(collection(db, 'tripSessions'), where('driverId', '==', driverId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TripSession))
    .sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
}

export function subscribeToTrips(callback: (trips: TripSession[]) => void): () => void {
  return onSnapshot(collection(db, 'tripSessions'), (snap) => {
    const trips = snap.docs.map(d => ({ id: d.id, ...d.data() } as TripSession))
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
    callback(trips);
  });
}

export async function cancelTrip(tripId: string): Promise<void> {
  await updateDoc(doc(db, 'tripSessions', tripId), {
    status: 'cancelled',
    endTime: Date.now(),
  });
}

/**
 * Clean up all orphaned active trips — cancel duplicates, keeping only the newest per driver.
 */
export async function cleanupAllOrphanedTrips(): Promise<number> {
  const q = query(
    collection(db, 'tripSessions'),
    where('status', '==', 'active'),
  );
  const snap = await getDocs(q);

  // Group by driverId, keep only the newest one per driver
  const byDriver: Record<string, Array<{ id: string; startTime: number }>> = {};
  for (const d of snap.docs) {
    const data = d.data();
    const driverId = data.driverId || 'unknown';
    if (!byDriver[driverId]) byDriver[driverId] = [];
    byDriver[driverId].push({ id: d.id, startTime: data.startTime || 0 });
  }

  let totalCancelled = 0;
  for (const [, trips] of Object.entries(byDriver)) {
    if (trips.length <= 1) continue;
    // Sort by startTime descending, keep the newest
    trips.sort((a, b) => b.startTime - a.startTime);
    for (let i = 1; i < trips.length; i++) {
      try {
        await updateDoc(doc(db, 'tripSessions', trips[i].id), {
          status: 'cancelled',
          endTime: Date.now(),
        });
        totalCancelled++;
      } catch (err) {
        console.error('Failed to update duplicate active trip status:', err);
      }
    }
  }

  return totalCancelled;
}
