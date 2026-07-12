import { useEffect, useState } from 'react';
import { subscribeToTrips, cleanupAllOrphanedTrips, cancelTrip } from '../services/tripService';
import { TripSession } from '../types';
import { Search, Truck, CheckCircle, Navigation, Box, XCircle, AlertTriangle } from 'lucide-react';

function formatDate(ts: number) { return new Date(ts).toLocaleString(); }
function formatDuration(start: number, end?: number) {
  const diff = (end || Date.now()) - start;
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

export default function TripsPage() {
  const [trips, setTrips] = useState<TripSession[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => { return subscribeToTrips(setTrips); }, []);

  const filtered = trips.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (search) return t.driverName?.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const activeCount = trips.filter(t => t.status === 'active').length;
  const completedCount = trips.filter(t => t.status === 'completed').length;
  const totalDistance = trips.reduce((s, t) => s + (t.totalDistance || 0), 0);
  const totalDeliveries = trips.reduce((s, t) => s + (t.deliveriesCompleted || 0), 0);

  const handleCleanup = async () => {
    if (!confirm('This will cancel duplicate active trips, keeping only the newest per driver. Continue?')) return;
    setCleaning(true);
    try {
      const count = await cleanupAllOrphanedTrips();
      alert(`Cleaned up ${count} orphaned trip(s). The list will update automatically.`);
    } catch (e: any) {
      alert('Cleanup failed: ' + (e.message || e));
    } finally {
      setCleaning(false);
    }
  };

  const handleCancelTrip = async (tripId: string, driverName: string) => {
    if (!confirm(`Cancel active trip for ${driverName}?`)) return;
    try {
      await cancelTrip(tripId);
    } catch (e: any) {
      alert('Failed to cancel trip: ' + (e.message || e));
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h2>Trips</h2><p>{trips.length} total trips</p></div>
        {activeCount > 1 && (
          <button
            className="btn"
            onClick={handleCleanup}
            disabled={cleaning}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#EF4444', border: 'none', padding: '8px 16px', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: cleaning ? 0.6 : 1 }}
          >
            <AlertTriangle size={15} /> {cleaning ? 'Cleaning...' : `Clean Up Duplicates (${activeCount} active)`}
          </button>
        )}
      </div>
      <div className="page-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}><Truck size={22} /></div>
            <div className="stat-value">{activeCount}</div>
            <div className="stat-label">Active Now</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981' }}><CheckCircle size={22} /></div>
            <div className="stat-value">{completedCount}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}><Navigation size={22} /></div>
            <div className="stat-value">{totalDistance.toFixed(0)} km</div>
            <div className="stat-label">Total Distance</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}><Box size={22} /></div>
            <div className="stat-value">{totalDeliveries}</div>
            <div className="stat-label">Total Deliveries</div>
          </div>
        </div>
        <div className="filters-row">
          <div className="search-box"><Search size={16} /><input placeholder="Search by driver..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          {['all', 'active', 'completed', 'cancelled'].map(f => (
            <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="table-container">
          <table>
            <thead><tr><th>Driver</th><th>Status</th><th>Start</th><th>Duration</th><th>Distance</th><th>Deliveries</th><th>Fuel Cost</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.driverName}</td>
                  <td>
                    <span className={`badge ${t.status === 'active' ? 'badge-success' : t.status === 'completed' ? 'badge-info' : 'badge-danger'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(t.startTime)}</td>
                  <td>{formatDuration(t.startTime, t.endTime)}</td>
                  <td>{t.totalDistance ? `${t.totalDistance.toFixed(1)} km` : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10B981', fontWeight: 600 }}>
                        {t.deliveriesCompleted || 0} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>success</span>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: (t.deliveriesFailed || 0) > 0 ? '#EF4444' : 'var(--text-muted)', fontWeight: (t.deliveriesFailed || 0) > 0 ? 600 : 400 }}>
                        {t.deliveriesFailed || 0} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>failed</span>
                      </span>
                    </div>
                  </td>
                  <td>{t.totalFuelCost ? `LKR ${t.totalFuelCost.toFixed(0)}` : '—'}</td>
                  <td>
                    {t.status === 'active' ? (
                      <button
                        onClick={() => handleCancelTrip(t.id!, t.driverName)}
                        className="btn btn-danger btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.2)', borderStyle: 'solid', borderWidth: 1, borderRadius: 6, fontWeight: 600 }}
                      >
                        <XCircle size={13} /> Cancel
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No trips found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
