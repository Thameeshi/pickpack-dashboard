import { collection, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RepairRequest, ExpenseStatus } from '../types';

export async function getAllRepairRequests(): Promise<RepairRequest[]> {
  const snap = await getDocs(collection(db, 'repairRequests'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as RepairRequest))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function subscribeToRepairRequests(callback: (repairs: RepairRequest[]) => void): () => void {
  return onSnapshot(collection(db, 'repairRequests'), (snap) => {
    const repairs = snap.docs.map(d => ({ id: d.id, ...d.data() } as RepairRequest))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(repairs);
  });
}

export async function updateRepairRequestStatus(
  requestId: string,
  status: ExpenseStatus,
  approvedBy?: string,
  rejectionReason?: string
): Promise<void> {
  const updates: Partial<RepairRequest> = {
    status,
    updatedAt: Date.now(),
  };
  if (approvedBy) {
    updates.approvedBy = approvedBy;
    updates.approvedAt = Date.now();
  }
  if (rejectionReason) updates.rejectionReason = rejectionReason;
  await updateDoc(doc(db, 'repairRequests', requestId), updates);
}
