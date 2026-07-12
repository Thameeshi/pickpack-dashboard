import { doc, getDoc, setDoc, onSnapshot, collection, getDocs, deleteDoc, addDoc, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SupervisorModulesSettings, DEFAULT_SUPERVISOR_MODULES, DriverReview, UserProfile } from '../types';

// Get Supervisor Modules Settings
export async function getSupervisorModulesSettings(supervisorId?: string): Promise<SupervisorModulesSettings> {
  try {
    if (!supervisorId) return DEFAULT_SUPERVISOR_MODULES;
    const ref = doc(db, 'supervisor_permissions', supervisorId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { ...DEFAULT_SUPERVISOR_MODULES, ...snap.data() } as SupervisorModulesSettings;
    }
    return DEFAULT_SUPERVISOR_MODULES;
  } catch (error) {
    console.error('Error fetching settings:', error);
    return DEFAULT_SUPERVISOR_MODULES;
  }
}

// Save Supervisor Modules Settings
export async function saveSupervisorModulesSettings(supervisorId: string, settings: SupervisorModulesSettings): Promise<void> {
  const ref = doc(db, 'supervisor_permissions', supervisorId);
  await setDoc(ref, settings);
}

// Real-time Supervisor Modules Settings subscription
export function subscribeToSupervisorModulesSettings(callback: (settings: SupervisorModulesSettings) => void, supervisorId?: string): () => void {
  if (!supervisorId) {
    callback(DEFAULT_SUPERVISOR_MODULES);
    return () => {};
  }
  const ref = doc(db, 'supervisor_permissions', supervisorId);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback({ ...DEFAULT_SUPERVISOR_MODULES, ...snap.data() } as SupervisorModulesSettings);
    } else {
      callback(DEFAULT_SUPERVISOR_MODULES);
    }
  });
}

// Get Reviews
export async function getDriverReviews(driverId?: string): Promise<DriverReview[]> {
  try {
    const q = collection(db, 'reviews');
    if (driverId) {
      const qry = query(q, where('driverId', '==', driverId));
      const snap = await getDocs(qry);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as DriverReview));
    } else {
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as DriverReview));
    }
  } catch (error) {
    console.error('Error fetching driver reviews:', error);
    return [];
  }
}

// Subscribe to reviews in real-time
export function subscribeToDriverReviews(callback: (reviews: DriverReview[]) => void, driverId?: string): () => void {
  const colRef = collection(db, 'reviews');
  const q = driverId ? query(colRef, where('driverId', '==', driverId)) : colRef;
  return onSnapshot(q, (snap) => {
    const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() } as DriverReview));
    callback(reviews);
  });
}

// Delete review
export async function deleteReview(reviewId: string): Promise<void> {
  await deleteDoc(doc(db, 'reviews', reviewId));
}

// Add Review
export async function addReview(review: Omit<DriverReview, 'id'>): Promise<void> {
  await addDoc(collection(db, 'reviews'), review);
}

// Seed mock reviews for drivers
export async function seedMockReviews(drivers: UserProfile[]): Promise<number> {
  if (!drivers || drivers.length === 0) return 0;
  
  const batch = writeBatch(db);
  const reviewsCol = collection(db, 'reviews');

  const comments = [
    { rating: 5, comment: 'Excellent and safe driver! Delivered the goods exactly on time.' },
    { rating: 5, comment: 'Super friendly and handled the fragile package with great care.' },
    { rating: 4, comment: 'Great service. Arrived slightly late due to traffic, but communicated well.' },
    { rating: 5, comment: 'Very professional, helped load the packages. Highly recommended!' },
    { rating: 3, comment: 'Delivery was fine, but did not read the delivery instructions.' },
    { rating: 2, comment: 'Delivered to the wrong doorstep initially, but resolved quickly after calling.' },
    { rating: 4, comment: 'Quick delivery and responsive on mobile.' },
    { rating: 5, comment: 'Extremely polite driver. Outstanding service!' }
  ];

  const reviewers = ['Alice Johnson', 'Michael Brown', 'Sophia Davis', 'David Wilson', 'Emma Martinez', 'James Taylor'];

  let count = 0;
  for (const driver of drivers) {
    // Generate 2-4 reviews per driver
    const numReviews = Math.floor(Math.random() * 3) + 2; 
    for (let i = 0; i < numReviews; i++) {
      const randomReview = comments[Math.floor(Math.random() * comments.length)];
      const randomReviewer = reviewers[Math.floor(Math.random() * reviewers.length)];
      
      const newDocRef = doc(reviewsCol);
      batch.set(newDocRef, {
        driverId: driver.uid,
        driverName: driver.name || driver.displayName || 'Driver',
        rating: randomReview.rating,
        comment: randomReview.comment,
        reviewerName: randomReviewer,
        createdAt: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000) // random time in last 30 days
      });
      count++;
    }
  }

  await batch.commit();
  return count;
}
