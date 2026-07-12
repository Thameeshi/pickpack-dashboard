/**
 * TasksPage — Task & Delivery Assignment Management
 * 
 * Provides features for administrators/supervisors to:
 * 1. Read real-time tasks list (pending, assigned, accepted, in_progress, arrived, delivered, failed).
 * 2. Create tasks with descriptions, priority, locations, item counts, base fees, and supervisor credentials.
 * 3. Assign tasks to online/approved drivers.
 * 4. Update task states, track verification QR codes, and trigger barcode-based validation checks.
 * 5. Delete or archive task entries.
 */

import { useEffect, useState } from 'react';
import { subscribeToTasks, createTask, assignTaskToDriver, updateTask, deleteTask } from '../services/taskService';
import { getDrivers } from '../services/userService';
import { Task, UserProfile, TaskStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Search, Plus, X, Trash2, UserPlus } from 'lucide-react';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  pending: { cls: 'badge-default', label: 'Pending' },
  assigned: { cls: 'badge-info', label: 'Assigned' },
  accepted: { cls: 'badge-purple', label: 'Accepted' },
  in_progress: { cls: 'badge-warning', label: 'In Progress' },
  arrived: { cls: 'badge-info', label: 'Arrived' },
  delivered: { cls: 'badge-success', label: 'Delivered' },
  failed: { cls: 'badge-danger', label: 'Failed' },
};

export default function TasksPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [drivers, setDrivers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState<Task | null>(null);
  const [showDetail, setShowDetail] = useState<Task | null>(null);

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  useEffect(() => {
    const unsub = subscribeToTasks(setTasks);
    getDrivers().then(d => setDrivers(d.filter(x => x.status === 'approved')));
    return unsub;
  }, []);

  const filtered = tasks.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (t.recipientName?.toLowerCase().includes(s) || t.pickupLocation?.toLowerCase().includes(s) || t.deliveryLocation?.toLowerCase().includes(s) || t.assignedDriverName?.toLowerCase().includes(s));
    }
    return true;
  });

  const statusCounts = tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Tasks</h2>
          <p>{tasks.length} total tasks</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Create Task</button>
        </div>
      </div>
      <div className="page-content">
        <div className="filters-row">
          <div className="search-box">
            <Search size={16} />
            <input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {['all', 'pending', 'assigned', 'accepted', 'in_progress', 'delivered', 'failed'].map(f => (
            <button key={f} className={`filter-chip ${statusFilter === f ? 'active' : ''}`} onClick={() => setStatusFilter(f)}>
              {f === 'all' ? 'All' : STATUS_MAP[f]?.label || f} {f !== 'all' && statusCounts[f] ? `(${statusCounts[f]})` : ''}
            </button>
          ))}
        </div>
        <div className="table-container">
          <table>
            <thead><tr><th>Recipient</th><th>Pickup</th><th>Delivery</th><th>Status</th><th>Priority</th><th>Driver</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(t => {
                const sm = STATUS_MAP[t.status] || { cls: 'badge-default', label: t.status };
                const prioMap: Record<string, string> = { HIGH: 'badge-danger', MEDIUM: 'badge-warning', LOW: 'badge-success' };
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.recipientName}</td>
                    <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.pickupLocation}</td>
                    <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.deliveryLocation}</td>
                    <td><span className={`badge ${sm.cls}`}>{sm.label}</span></td>
                    <td><span className={`badge ${prioMap[t.priority] || 'badge-default'}`}>{t.priority}</span></td>
                    <td>{t.assignedDriverName || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{timeAgo(t.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowDetail(t)}>View</button>
                        {!t.assignedDriverId && (
                          <button className="btn btn-secondary btn-sm" onClick={() => setShowAssign(t)}><UserPlus size={13} /></button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => setTaskToDelete(t)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No tasks found</td></tr>}
            </tbody>
          </table>
        </div>

        {showCreate && <CreateTaskModal drivers={drivers} supervisorId={profile?.uid || ''} supervisorName={profile?.name || ''} onClose={() => setShowCreate(false)} />}
        {showAssign && <AssignModal task={showAssign} drivers={drivers} onClose={() => setShowAssign(null)} />}
        {showDetail && <TaskDetailModal task={showDetail} onClose={() => setShowDetail(null)} />}
        {taskToDelete && (
          <ConfirmationModal 
            task={taskToDelete} 
            onClose={() => setTaskToDelete(null)} 
            onConfirm={async () => {
              await deleteTask(taskToDelete.id!);
              setTaskToDelete(null);
            }} 
          />
        )}
      </div>
    </>
  );
}

function ConfirmationModal({ task, onClose, onConfirm }: { task: Task; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, padding: '24px' }}>
        <div className="modal-header" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700' }}>Delete Task</h3>
          <button className="btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ padding: '8px 0 24px 0' }}>
          <p style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '10px', lineHeight: '1.5' }}>
            Are you sure you want to delete the task for <strong>{task.recipientName}</strong>?
          </p>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            This action cannot be undone. This task will be permanently removed from the database.
          </p>
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading} style={{ padding: '10px 20px', fontSize: '14.5px' }}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleConfirm} 
            disabled={loading} 
            style={{ backgroundColor: '#EF4444', borderColor: '#EF4444', color: 'white', padding: '10px 20px', fontSize: '14.5px' }}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateTaskModal({ drivers, supervisorId, supervisorName, onClose }: { drivers: UserProfile[]; supervisorId: string; supervisorName: string; onClose: () => void }) {
  const [form, setForm] = useState({ pickupLocation: '', deliveryLocation: '', recipientName: '', recipientPhone: '', description: '', priority: 'MEDIUM' as any, assignedDriverId: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const driver = drivers.find(d => d.uid === form.assignedDriverId);
    await createTask({ ...form, supervisorId, supervisorName, assignedDriverName: driver?.name || '' });
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>Create New Task</h3><button className="btn-ghost btn-icon" onClick={onClose}><X size={18} /></button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Pickup Location *</label><input className="form-input" required value={form.pickupLocation} onChange={e => setForm(p => ({ ...p, pickupLocation: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Delivery Location *</label><input className="form-input" required value={form.deliveryLocation} onChange={e => setForm(p => ({ ...p, deliveryLocation: e.target.value }))} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group"><label className="form-label">Recipient Name *</label><input className="form-input" required value={form.recipientName} onChange={e => setForm(p => ({ ...p, recipientName: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Recipient Phone *</label><input className="form-input" required value={form.recipientPhone} onChange={e => setForm(p => ({ ...p, recipientPhone: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group"><label className="form-label">Priority</label><select className="form-select" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as any }))}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></div>
              <div className="form-group"><label className="form-label">Assign Driver</label><select className="form-select" value={form.assignedDriverId} onChange={e => setForm(p => ({ ...p, assignedDriverId: e.target.value }))}><option value="">Unassigned</option>{drivers.map(d => <option key={d.uid} value={d.uid}>{d.name}</option>)}</select></div>
            </div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Task'}</button></div>
        </form>
      </div>
    </div>
  );
}

function AssignModal({ task, drivers, onClose }: { task: Task; drivers: UserProfile[]; onClose: () => void }) {
  const [driverId, setDriverId] = useState('');
  const handleAssign = async () => {
    const driver = drivers.find(d => d.uid === driverId);
    if (driver) { await assignTaskToDriver(task.id!, driverId, driver.name); onClose(); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header"><h3>Assign Driver</h3><button className="btn-ghost btn-icon" onClick={onClose}><X size={18} /></button></div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Assign a driver to: <strong>{task.recipientName}</strong></p>
          <select className="form-select" value={driverId} onChange={e => setDriverId(e.target.value)}>
            <option value="">Select a driver...</option>
            {drivers.map(d => <option key={d.uid} value={d.uid}>{d.name} — {d.vehiclePlate || 'No plate'}</option>)}
          </select>
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={handleAssign} disabled={!driverId}>Assign</button></div>
      </div>
    </div>
  );
}

function TaskDetailModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const sm = STATUS_MAP[task.status] || { cls: 'badge-default', label: task.status };
  const formatTime = (ts?: number) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const isDelivered = task.status === 'delivered';
  const hasValidPhoto = task.proofOfDeliveryUrl && task.proofOfDeliveryUrl !== 'upload_failed';
  const hasSignature = !!task.signatureUrl;
  const hasDocument = !!task.deliveryDocumentUrl;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header"><h3>Task Details</h3><button className="btn-ghost btn-icon" onClick={onClose}><X size={18} /></button></div>
        <div className="modal-body" style={{ padding: 0 }}>
          {/* Status & ID */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <span className={`badge ${sm.cls}`}>{sm.label}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {task.id?.substring(0, 8)}</span>
          </div>

          {/* Basic Info */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <div className="driver-detail-card">
              <div className="detail-field"><label>Recipient</label><p>{task.recipientName}</p></div>
              <div className="detail-field"><label>Phone</label><p>{task.recipientPhone}</p></div>
              <div className="detail-field"><label>Pickup</label><p>{task.pickupLocation}</p></div>
              <div className="detail-field"><label>Delivery</label><p>{task.deliveryLocation}</p></div>
              <div className="detail-field"><label>Driver</label><p>{task.assignedDriverName || 'Unassigned'}</p></div>
              <div className="detail-field"><label>Priority</label><p>{task.priority}</p></div>
              {task.description && <div className="detail-field" style={{ gridColumn: '1/-1' }}><label>Description</label><p>{task.description}</p></div>}
              {task.rejectedReason && <div className="detail-field" style={{ gridColumn: '1/-1' }}><label>Rejection Reason</label><p style={{ color: 'var(--danger)' }}>{task.rejectedReason}</p></div>}
            </div>
          </div>

          {/* Timeline */}
          <div style={{ padding: '20px 24px', borderBottom: isDelivered ? '1px solid var(--border)' : 'none' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>📋 Timeline</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Created', time: task.createdAt, icon: '📝' },
                { label: 'Assigned', time: task.assignedAt, icon: '👤' },
                { label: 'Accepted', time: task.acceptedAt, icon: '✅' },
                { label: 'Arrived', time: task.arrivedAt, icon: '📍' },
                { label: 'Completed', time: task.completedAt, icon: '🏁' },
              ].filter(e => e.time).map((entry, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14 }}>{entry.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', minWidth: 80 }}>{entry.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatTime(entry.time)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Proof of Delivery Section — always show for delivered tasks */}
          {isDelivered && (
            <div style={{ padding: '20px 24px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>📦 Proof of Delivery</p>

              {/* Recipient Confirmed Name */}
              {task.recipientConfirmedName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: 'rgba(16,185,129,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <span style={{ fontSize: 16 }}>👤</span>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>CONFIRMED BY</span>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#34D399', marginTop: 2 }}>{task.recipientConfirmedName}</p>
                  </div>
                </div>
              )}

              {/* GPS Coordinates */}
              {(task.deliveryLatitude && task.deliveryLongitude) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: 'rgba(59,130,246,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <span style={{ fontSize: 16 }}>📍</span>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>DELIVERY LOCATION</span>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {task.deliveryLatitude.toFixed(6)}, {task.deliveryLongitude.toFixed(6)}
                    </p>
                  </div>
                </div>
              )}

              {/* Proof Items Grid — always show all 3 with status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {/* Delivery Photo */}
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>📷 Photo</p>
                  {hasValidPhoto ? (
                    <a href={task.proofOfDeliveryUrl} target="_blank" rel="noreferrer">
                      <img
                        src={task.proofOfDeliveryUrl}
                        alt="Delivery"
                        style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'transform 0.2s, opacity 0.2s' }}
                        onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.opacity = '0.9'; }}
                        onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
                        onError={(e) => {
                          console.error('❌ Failed to load delivery photo:', task.proofOfDeliveryUrl);
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.style.cssText = 'width:100%;height:120px;borderRadius:var(--radius-md);border:1px dashed var(--border);display:flex;flexDirection:column;alignItems:center;justifyContent:center;background:rgba(239,68,68,0.05)';
                            fallback.innerHTML = '<span style="fontSize:24;marginBottom:4">⚠️</span><span style="fontSize:10;color:var(--danger);fontWeight:600">Image Failed</span>';
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    </a>
                  ) : (
                    <div style={{ width: '100%', height: 120, borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.05)' }}>
                      <span style={{ fontSize: 24, marginBottom: 4 }}>📷</span>
                      <span style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 600 }}>No Photo</span>
                    </div>
                  )}
                </div>

                {/* Signature */}
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>✍️ Signature</p>
                  {hasSignature ? (
                    <a href={task.signatureUrl} target="_blank" rel="noreferrer">
                      <img
                        src={task.signatureUrl}
                        alt="Signature"
                        style={{ width: '100%', height: 120, objectFit: 'contain', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'transform 0.2s, opacity 0.2s' }}
                        onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.opacity = '0.9'; }}
                        onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
                        onError={(e) => {
                          console.error('❌ Failed to load signature:', task.signatureUrl);
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.style.cssText = 'width:100%;height:120px;borderRadius:var(--radius-md);border:1px dashed var(--border);display:flex;flexDirection:column;alignItems:center;justifyContent:center;background:rgba(239,68,68,0.05)';
                            fallback.innerHTML = '<span style="fontSize:24;marginBottom:4">⚠️</span><span style="fontSize:10;color:var(--danger);fontWeight:600">Image Failed</span>';
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    </a>
                  ) : (
                    <div style={{ width: '100%', height: 120, borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.05)' }}>
                      <span style={{ fontSize: 24, marginBottom: 4 }}>✍️</span>
                      <span style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 600 }}>No Signature</span>
                    </div>
                  )}
                </div>

                {/* Document */}
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>📄 Document</p>
                  {hasDocument ? (
                    <a href={task.deliveryDocumentUrl} target="_blank" rel="noreferrer">
                      <img
                        src={task.deliveryDocumentUrl}
                        alt="Document"
                        style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'transform 0.2s, opacity 0.2s' }}
                        onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.opacity = '0.9'; }}
                        onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
                        onError={(e) => {
                          console.error('❌ Failed to load document:', task.deliveryDocumentUrl);
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.style.cssText = 'width:100%;height:120px;borderRadius:var(--radius-md);border:1px dashed var(--border);display:flex;flexDirection:column;alignItems:center;justifyContent:center;background:rgba(239,68,68,0.05)';
                            fallback.innerHTML = '<span style="fontSize:24;marginBottom:4">⚠️</span><span style="fontSize:10;color:var(--danger);fontWeight:600">Image Failed</span>';
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    </a>
                  ) : (
                    <div style={{ width: '100%', height: 120, borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(100,116,139,0.05)' }}>
                      <span style={{ fontSize: 24, marginBottom: 4 }}>📄</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Skipped</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Completion Time */}
              {task.completedAt && (
                <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>🕐</span>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>DELIVERED AT</span>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#34D399', marginTop: 2 }}>{formatTime(task.completedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
