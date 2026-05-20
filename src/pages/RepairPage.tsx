import { useEffect, useState } from 'react';
import { subscribeToRepairRequests, updateRepairRequestStatus } from '../services/repairService';
import { RepairRequest, REPAIR_TYPE_LABELS } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Search, CheckCircle, XCircle, ExternalLink, PenTool } from 'lucide-react';

export default function RepairPage() {
  const { profile } = useAuth();
  const [repairs, setRepairs] = useState<RepairRequest[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  
  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { return subscribeToRepairRequests(setRepairs); }, []);

  const filtered = repairs.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search) return r.driverName?.toLowerCase().includes(search.toLowerCase()) || 
                       r.description?.toLowerCase().includes(search.toLowerCase()) ||
                       REPAIR_TYPE_LABELS[r.repairType]?.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const totalEstCost = repairs.reduce((s, r) => s + (r.estimatedCost || 0), 0);
  const totalActualCost = repairs.reduce((s, r) => s + (r.actualCost || 0), 0);
  const pendingCount = repairs.filter(r => r.status === 'pending').length;
  const approvedCount = repairs.filter(r => r.status === 'approved').length;

  const handleApprove = async (id: string) => { 
    if (window.confirm('Are you sure you want to approve this repair request?')) {
      await updateRepairRequestStatus(id, 'approved', profile?.uid); 
    }
  };

  const handleRejectClick = (id: string) => {
    setRejectId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectId) return;
    await updateRepairRequestStatus(rejectId, 'rejected', profile?.uid, rejectReason.trim() || undefined);
    setRejectModalOpen(false);
    setRejectId(null);
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Vehicle Repairs</h2>
          <p>{repairs.length} total repair requests</p>
        </div>
      </div>
      <div className="page-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🔧</div>
            <div className="stat-value">{repairs.length}</div>
            <div className="stat-label">Total Requests</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-value">LKR {(totalActualCost || totalEstCost).toLocaleString()}</div>
            <div className="stat-label">Total Est. Cost</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-value">{pendingCount}</div>
            <div className="stat-label">Pending Approval</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{approvedCount}</div>
            <div className="stat-label">Approved</div>
          </div>
        </div>
        
        <div className="filters-row">
          <div className="search-box">
            <Search size={16} />
            <input placeholder="Search driver, issue..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Date</th>
                <th>Issue Type</th>
                <th>Description</th>
                <th>Est. Cost</th>
                <th>Photos</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.driverName}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <PenTool size={12} /> {REPAIR_TYPE_LABELS[r.repairType]}
                    </span>
                  </td>
                  <td style={{ maxWidth: 250, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.description}>
                    {r.description}
                  </td>
                  <td style={{ fontWeight: 600 }}>{r.estimatedCost ? `LKR ${r.estimatedCost.toLocaleString()}` : '—'}</td>
                  <td>
                    {r.photoUrls && r.photoUrls.length > 0 ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        {r.photoUrls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" title="View photo">
                            <img src={url} alt="Repair" style={{ width: 30, height: 30, borderRadius: 4, objectFit: 'cover', border: '1px solid #eee' }} />
                          </a>
                        ))}
                      </div>
                    ) : 'No photos'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span className={`badge ${r.status === 'approved' ? 'badge-success' : r.status === 'pending' ? 'badge-warning' : 'badge-danger'}`} style={{ alignSelf: 'flex-start' }}>
                        {r.status}
                      </span>
                      {r.rejectionReason && (
                        <span style={{ fontSize: 11, color: 'var(--danger)', maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.rejectionReason}>
                          Reason: {r.rejectionReason}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {r.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-success btn-sm" onClick={() => handleApprove(r.id!)}>
                          <CheckCircle size={13} /> Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleRejectClick(r.id!)}>
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No repair requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ backgroundColor: 'white', padding: 24, borderRadius: 12, width: '100%', maxWidth: 400 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Reject Repair Request</h3>
            <div className="form-group">
              <label>Reason for rejection (optional)</label>
              <textarea 
                className="form-control" 
                rows={3} 
                value={rejectReason} 
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                style={{ width: '100%', marginTop: 8 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setRejectModalOpen(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmReject}>Reject Request</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
