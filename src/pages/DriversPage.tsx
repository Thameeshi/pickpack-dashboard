/**
 * DriversPage — Driver Roster & Approvals Management
 * 
 * Manages the driver workforce:
 * 1. Driver Approvals: Evaluates newly registered drivers, approving or suspending their accounts.
 * 2. Status Tracking: Integrates driver online/offline markers and links with real-time locations.
 * 3. Detail Modals: Displays detailed stats (odometer history, assigned vehicle number, active trips, performance ratings, and reviews).
 * 4. Notifications: Automatically generates notifications for drivers upon account approval or suspension.
 */

import { useEffect, useState } from 'react';
import { getDrivers, updateUserStatus, subscribeToDriverLocations, deleteDriver } from '../services/userService';
import { createNotification } from '../services/notificationService';
import { getTripsByDriver } from '../services/tripService';
import { subscribeToDriverReviews } from '../services/settingsService';
import { UserProfile, Driver, TripSession, DriverReview } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Search, CheckCircle, XCircle, Eye, X, Star, Trash2 } from 'lucide-react';

export default function DriversPage() {
  const { profile } = useAuth();
  const [drivers, setDrivers] = useState<UserProfile[]>([]);
  const [liveDrivers, setLiveDrivers] = useState<Driver[]>([]);
  const [reviews, setReviews] = useState<DriverReview[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [driverToDelete, setDriverToDelete] = useState<UserProfile | null>(null);
  const [trips, setTrips] = useState<TripSession[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const d = await getDrivers();
    setDrivers(d);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const unsubLive = subscribeToDriverLocations(setLiveDrivers);
    const unsubReviews = subscribeToDriverReviews(setReviews);
    return () => {
      unsubLive();
      unsubReviews();
    };
  }, []);

  useEffect(() => {
    if (selected) {
      getTripsByDriver(selected.uid).then(setTrips);
    }
  }, [selected?.uid]);

  const filtered = drivers.filter(d => {
    if (filter !== 'all' && d.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (d.name?.toLowerCase().includes(s) || d.email?.toLowerCase().includes(s) || d.vehiclePlate?.toLowerCase().includes(s) || d.phone?.includes(s));
    }
    return true;
  });

  const liveMap = new Map(liveDrivers.map(d => [d.uid, d]));

  const handleStatusChange = async (d: UserProfile, status: 'approved' | 'suspended' | 'rejected') => {
    await updateUserStatus(d.uid, status, profile?.uid);
    
    // Notify the supervisor who added the driver when they are approved
    if (status === 'approved' && d.supervisorId) {
      await createNotification({
        recipientId: d.supervisorId,
        title: 'Driver Approved',
        body: `The driver account for ${d.name || d.displayName} has been approved by the super admin.`,
        type: 'approval',
        read: false,
        createdAt: Date.now(),
        data: {
          driverId: d.uid,
          driverName: d.name || d.displayName || 'Driver'
        }
      });
    }

    refresh();
    if (selected?.uid === d.uid) setSelected(prev => prev ? { ...prev, status } : null);
  };

  // Helper to calculate rating for a driver
  const getDriverRatingStats = (driverId: string) => {
    const driverReviews = reviews.filter(r => r.driverId === driverId);
    if (driverReviews.length === 0) return { avg: '—', count: 0 };
    const avg = (driverReviews.reduce((sum, r) => sum + r.rating, 0) / driverReviews.length).toFixed(1);
    return { avg, count: driverReviews.length };
  };

  const selectedReviews = selected ? reviews.filter(r => r.driverId === selected.uid) : [];
  const selectedStats = selected ? getDriverRatingStats(selected.uid) : { avg: '—', count: 0 };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Drivers</h2>
          <p>{drivers.length} total drivers • {liveDrivers.length} online now</p>
        </div>
      </div>
      <div className="page-content">
        <div className="filters-row">
          <div className="search-box">
            <Search size={16} />
            <input placeholder="Search drivers..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {['all', 'approved', 'pending', 'suspended', 'rejected'].map(f => (
            <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && <> ({drivers.filter(d => d.status === f).length})</>}
            </button>
          ))}
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Contact</th>
                <th>Vehicle</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Live</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const live = liveMap.get(d.uid);
                const { avg, count } = getDriverRatingStats(d.uid);
                return (
                  <tr key={d.uid}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: live ? 'var(--success)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'white', flexShrink: 0 }}>
                          {d.name?.[0]?.toUpperCase() || 'D'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{d.name || d.displayName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{d.phone || '—'}</td>
                    <td>{d.vehiclePlate || '—'} {d.vehicleType ? `• ${d.vehicleType}` : ''}</td>
                    <td>
                      {count > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 13 }}>
                          <Star size={14} fill="#ffb100" color="#ffb100" />
                          <span>{avg}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>({count})</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td><StatusBadge status={d.status} /></td>
                    <td>{live ? <span className="badge badge-success">Online</span> : <span className="badge badge-default">Offline</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(d)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, width: 68 }}><Eye size={14} /> View</button>
                        
                        <div style={{ display: 'flex', gap: 6, width: 95, flexShrink: 0 }}>
                          {d.status === 'pending' && (
                            <>
                              <button className="btn btn-success btn-sm" onClick={() => handleStatusChange(d, 'approved')}><CheckCircle size={14} /></button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleStatusChange(d, 'rejected')}><XCircle size={14} /></button>
                            </>
                          )}
                          {d.status === 'approved' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange(d, 'suspended')}>Suspend</button>
                          )}
                          {d.status === 'suspended' && (
                            <button className="btn btn-success btn-sm" onClick={() => handleStatusChange(d, 'approved')}>Reactivate</button>
                          )}
                        </div>

                        {profile?.role === 'superadmin' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setDriverToDelete(d)}><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No drivers found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="modal-overlay" onClick={() => setSelected(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
              <div className="modal-header">
                <h3>Driver Details</h3>
                <button className="btn-ghost btn-icon" onClick={() => setSelected(null)}><X size={18} /></button>
              </div>
              <div className="modal-body">
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, color: 'white', margin: '0 auto 10px' }}>
                    {selected.name?.[0]?.toUpperCase() || 'D'}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{selected.name}</div>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="driver-detail-card">
                  <div className="detail-field"><label>Email</label><p>{selected.email}</p></div>
                  <div className="detail-field"><label>Phone</label><p>{selected.phone || '—'}</p></div>
                  <div className="detail-field"><label>Vehicle Plate</label><p>{selected.vehiclePlate || '—'}</p></div>
                  <div className="detail-field"><label>Vehicle Type</label><p>{selected.vehicleType || '—'}</p></div>
                  <div className="detail-field"><label>Vehicle Model</label><p>{selected.vehicleModel || '—'}</p></div>
                  <div className="detail-field"><label>License</label><p>{selected.licenseNumber || '—'}</p></div>
                  <div className="detail-field"><label>Joined</label><p>{selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : '—'}</p></div>
                  <div className="detail-field"><label>Total Trips</label><p>{trips.length}</p></div>
                  <div className="detail-field">
                    <label>Rating</label>
                    <p style={{ display: 'flex', alignItems: 'center', gap: 4, margin: 0, fontWeight: 600 }}>
                      <Star size={14} fill={selectedStats.count > 0 ? '#ffb100' : 'none'} color={selectedStats.count > 0 ? '#ffb100' : 'var(--text-muted)'} />
                      {selectedStats.avg} ({selectedStats.count} reviews)
                    </p>
                  </div>
                </div>
                
                {selectedReviews.length > 0 && (
                  <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 15 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Driver Reviews & Comments</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                      {selectedReviews.map(r => (
                        <div key={r.id} style={{ background: '#f9f9f9', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.reviewerName}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div style={{ display: 'flex', color: '#ffb100', marginBottom: 6 }}>
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} size={12} fill={s <= r.rating ? '#ffb100' : 'none'} color="#ffb100" />
                            ))}
                          </div>
                          <p style={{ fontSize: 12, margin: 0, fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.4 }}>"{r.comment}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {trips.length > 0 && (
                  <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 15 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Recent Trips</h4>
                    {trips.slice(0, 5).map(t => (
                      <div key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span>{new Date(t.startTime).toLocaleDateString()}</span>
                        <span>{t.totalDistance?.toFixed(1) || '?'} km</span>
                        <span className={`badge ${t.status === 'completed' ? 'badge-success' : t.status === 'active' ? 'badge-warning' : 'badge-default'}`}>{t.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {driverToDelete && (
          <div className="modal-overlay" onClick={() => setDriverToDelete(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, padding: '24px' }}>
              <div className="modal-header" style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700' }}>Delete Driver</h3>
                <button className="btn-ghost btn-icon" onClick={() => setDriverToDelete(null)}><X size={20} /></button>
              </div>
              <div className="modal-body" style={{ padding: '8px 0 24px 0' }}>
                <p style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '10px', lineHeight: '1.5' }}>
                  Are you sure you want to delete the driver account for <strong>{driverToDelete.name || driverToDelete.displayName}</strong>?
                </p>
                <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  This action cannot be undone. This driver's profile and active location tracking will be permanently removed.
                </p>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setDriverToDelete(null)} style={{ padding: '10px 20px', fontSize: '14.5px' }}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={async () => {
                    if (driverToDelete) {
                      await deleteDriver(driverToDelete.uid);
                      setDriverToDelete(null);
                      refresh();
                    }
                  }} 
                  style={{ backgroundColor: '#EF4444', borderColor: '#EF4444', color: 'white', padding: '10px 20px', fontSize: '14.5px' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { approved: 'badge-success', pending: 'badge-warning', suspended: 'badge-default', rejected: 'badge-danger' };
  return <span className={`badge ${map[status] || 'badge-default'}`}>{status}</span>;
}
