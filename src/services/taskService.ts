import { collection, getDocs, getDoc, doc, updateDoc, setDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { InvoiceRecord, Task, TaskStatus, TaskPriority } from '../types';

const DEFAULT_BASE_FEE = 1000;
const DEFAULT_TAX_RATE = 0;

function buildTaskInvoice(task: Task, driverId: string, driverName: string, supervisorId: string, supervisorName?: string): Omit<InvoiceRecord, 'id'> {
  const priorityMultiplier = task.priority === 'HIGH' ? 1.5 : task.priority === 'MEDIUM' ? 1.2 : 1;
  const quantity = 1;
  const unitPrice = Math.round(DEFAULT_BASE_FEE * priorityMultiplier + (task.itemCount || 0) * 100);
  const amount = quantity * unitPrice;
  const subtotal = amount;
  const taxAmount = Math.round(subtotal * DEFAULT_TAX_RATE);
  const total = subtotal + taxAmount;

  return {
    taskId: task.id || '',
    tripId: task.tripId,
    driverId,
    driverName,
    supervisorId,
    supervisorName: supervisorName || task.supervisorName || '',
    recipientName: task.recipientName,
    recipientPhone: task.recipientPhone,
    routeLabel: `${task.pickupLocation} → ${task.deliveryLocation}`,
    items: [
      {
        description: `Delivery fee for ${task.recipientName}`,
        quantity,
        unitPrice,
        amount,
      },
    ],
    subtotal,
    taxRate: DEFAULT_TAX_RATE,
    taxAmount,
    total,
    status: 'draft',
    dueAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
    generatedBy: supervisorId,
    generatedByRole: 'supervisor',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

async function createInvoiceForTask(task: Task, driverId: string, driverName: string, supervisorId: string, supervisorName?: string): Promise<string | null> {
  if (!task.id) return null;

  const invoiceRef = doc(db, 'invoices', task.id);
  const invoice = buildTaskInvoice(task, driverId, driverName, supervisorId, supervisorName);
  const invoiceSnap = await getDoc(invoiceRef);
  if (invoiceSnap.exists()) {
    await updateDoc(invoiceRef, { ...invoice, updatedAt: Date.now() });
    await updateDoc(doc(db, 'tasks', task.id), { invoiceId: invoiceRef.id, updatedAt: Date.now() });
    return invoiceRef.id;
  }

  await setDoc(invoiceRef, invoice);
  await updateDoc(doc(db, 'tasks', task.id), { invoiceId: invoiceRef.id, updatedAt: Date.now() });
  return invoiceRef.id;
}

export async function getAllTasks(): Promise<Task[]> {
  const snap = await getDocs(collection(db, 'tasks'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Task))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getTasksBySupervisor(supervisorId: string): Promise<Task[]> {
  const q = query(collection(db, 'tasks'), where('supervisorId', '==', supervisorId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Task))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function subscribeToTasks(callback: (tasks: Task[]) => void): () => void {
  return onSnapshot(collection(db, 'tasks'), (snap) => {
    const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(tasks);
  });
}

export async function createTask(payload: {
  pickupLocation: string;
  deliveryLocation: string;
  recipientName: string;
  recipientPhone: string;
  description?: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  supervisorId: string;
  supervisorName?: string;
  priority: TaskPriority;
}): Promise<string> {
  const taskData: Omit<Task, 'id'> = {
    ...payload,
    status: payload.assignedDriverId ? 'assigned' : 'pending',
    driverAccepted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const docRef = await addDoc(collection(db, 'tasks'), taskData);

  if (payload.assignedDriverId) {
    try {
      const createdTask: Task = { ...taskData, id: docRef.id } as Task;
      await createInvoiceForTask(
        createdTask,
        payload.assignedDriverId,
        payload.assignedDriverName || '',
        payload.supervisorId,
        payload.supervisorName,
      );
    } catch (error) {
      console.log('Failed to create invoice for assigned task:', error);
    }
  }

  return docRef.id;
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), { ...updates, updatedAt: Date.now() });
}

export async function assignTaskToDriver(
  taskId: string, driverId: string, driverName: string
): Promise<void> {
  const taskSnap = await getDoc(doc(db, 'tasks', taskId));
  const task = taskSnap.exists() ? ({ id: taskSnap.id, ...taskSnap.data() } as Task) : null;
  await updateDoc(doc(db, 'tasks', taskId), {
    assignedDriverId: driverId,
    assignedDriverName: driverName,
    status: 'assigned' as TaskStatus,
    driverAccepted: false,
    updatedAt: Date.now(),
  });

  if (task) {
    try {
      await createInvoiceForTask(task, driverId, driverName, task.supervisorId, task.supervisorName);
    } catch (error) {
      console.log('Failed to create task invoice:', error);
    }
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  await deleteDoc(doc(db, 'tasks', taskId));
}
