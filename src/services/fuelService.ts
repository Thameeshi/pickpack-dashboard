import { collection, getDocs, doc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FuelExpense, ExpenseStatus } from '../types';

export async function getAllFuelExpenses(): Promise<FuelExpense[]> {
  const snap = await getDocs(collection(db, 'fuelExpenses'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FuelExpense))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function subscribeToFuelExpenses(callback: (expenses: FuelExpense[]) => void): () => void {
  return onSnapshot(collection(db, 'fuelExpenses'), (snap) => {
    const expenses = snap.docs.map(d => ({ id: d.id, ...d.data() } as FuelExpense))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(expenses);
  });
}

export async function updateFuelExpenseStatus(
  expenseId: string, status: ExpenseStatus, approvedBy?: string
): Promise<void> {
  const updates: Partial<FuelExpense> = { status };
  if (status === 'approved') {
    updates.paymentStatus = 'unpaid'; // Set default payment status when approved
  }
  if (approvedBy) updates.approvedBy = approvedBy;
  await updateDoc(doc(db, 'fuelExpenses', expenseId), updates);
}

export async function updateFuelExpensePaymentStatus(
  expenseId: string, paymentStatus: 'unpaid' | 'transferred', paidBy?: string
): Promise<void> {
  const updates: Partial<FuelExpense> = { paymentStatus };
  if (paidBy) {
    updates.paidBy = paidBy;
    updates.paidAt = Date.now();
  }
  await updateDoc(doc(db, 'fuelExpenses', expenseId), updates);
}
