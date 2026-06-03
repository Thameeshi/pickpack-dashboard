import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Settings, Users, Shield, Star, Trash2, Database, Search, HelpCircle, CheckCircle } from 'lucide-react';
import { UserProfile, Task, DriverReview, SupervisorModulesSettings } from '../types';
import { getDrivers, getSupervisors } from '../services/userService';
import {
  getSupervisorModulesSettings,
  saveSupervisorModulesSettings,
  subscribeToDriverReviews,
  deleteReview,
  seedMockReviews
} from '../services/settingsService';

interface SystemStats {
  totalUsers: number;
  totalDrivers: number;
  totalSupervisors: number;
  totalSuperAdmins: number;
  pendingDrivers: number;
  suspendedUsers: number;
  totalTasks: number;
  completedTasks: number;
  totalNotifications: number;
}

type TabType = 'overview' | 'permissions' | 'reviews';

export default function SettingsPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Overview Tab States
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Permissions Tab States
  const [permissions, setPermissions] = useState<SupervisorModulesSettings | null>(null);
  const [supervisors, setSupervisors] = useState<UserProfile[]>([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [permSuccess, setPermSuccess] = useState(false);

  // Reviews Tab States
  const [reviews, setReviews] = useState<DriverReview[]>([]);
  const [drivers, setDrivers] = useState<UserProfile[]>([]);
  const [reviewsSearch, setReviewsSearch] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === 'superadmin') {
      loadStats();
      loadSupervisors();
      loadDrivers();
      
      // Subscribe to reviews in real-time
      const unsub = subscribeToDriverReviews((newReviews) => {
        setReviews(newReviews.sort((a, b) => b.createdAt - a.createdAt));
      });
      return unsub;
    }
  }, [profile]);

  useEffect(() => {
    if (selectedSupervisorId) {
      loadPermissions(selectedSupervisorId);
    } else {
      setPermissions(null);
    }
  }, [selectedSupervisorId]);

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const usersSnap = await getDocs(collection(db, 'users'));
      const tasksSnap = await getDocs(collection(db, 'tasks'));
      const notificationsSnap = await getDocs(collection(db, 'notifications'));

      const users = usersSnap.docs.map(d => d.data() as UserProfile);
      const tasks = tasksSnap.docs.map(d => d.data() as Task);

      const statsObj: SystemStats = {
        totalUsers: users.length,
        totalDrivers: users.filter(u => u.role === 'driver').length,
        totalSupervisors: users.filter(u => u.role === 'supervisor').length,
        totalSuperAdmins: users.filter(u => u.role === 'superadmin').length,
        pendingDrivers: users.filter(u => u.role === 'driver' && u.status === 'pending').length,
        suspendedUsers: users.filter(u => u.status === 'suspended').length,
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'delivered').length,
        totalNotifications: notificationsSnap.size,
      };

      setStats(statsObj);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadSupervisors = async () => {
    try {
      const list = await getSupervisors();
      setSupervisors(list);
      if (list.length > 0) {
        setSelectedSupervisorId(list[0].uid);
      }
    } catch (error) {
      console.error('Error loading supervisors:', error);
    }
  };

  const loadPermissions = async (supervisorId: string) => {
    const settings = await getSupervisorModulesSettings(supervisorId);
    setPermissions(settings);
  };

  const loadDrivers = async () => {
    const d = await getDrivers();
    setDrivers(d);
  };

  const handlePermissionToggle = async (key: keyof SupervisorModulesSettings) => {
    if (!permissions || !selectedSupervisorId) return;
    const updated = {
      ...permissions,
      [key]: !permissions[key]
    };
    setPermissions(updated);
    setSavingPermissions(true);
    try {
      await saveSupervisorModulesSettings(selectedSupervisorId, updated);
      setPermSuccess(true);
      setTimeout(() => setPermSuccess(false), 2000);
    } catch (e) {
      console.error('Failed to save settings:', e);
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (confirm('Are you sure you want to delete this driver review? This action cannot be undone.')) {
      try {
        await deleteReview(id);
      } catch (e) {
        console.error('Failed to delete review:', e);
      }
    }
  };

  const handleSeedReviews = async () => {
    if (drivers.length === 0) {
      alert('No drivers found in the system to seed reviews for.');
      return;
    }
    setSeeding(true);
    setSeedSuccess(null);
    try {
      const count = await seedMockReviews(drivers);
      setSeedSuccess(`Successfully seeded ${count} reviews!`);
      setTimeout(() => setSeedSuccess(null), 4000);
    } catch (e) {
      console.error('Failed seeding reviews:', e);
      alert('Error seeding reviews.');
    } finally {
      setSeeding(false);
    }
  };

  const handleClearAllReviews = async () => {
    if (reviews.length === 0) {
      alert('No reviews found to clear.');
      return;
    }
    if (!confirm(`Are you sure you want to delete ALL ${reviews.length} reviews from the database? This action cannot be undone.`)) {
      return;
    }
    setClearing(true);
    try {
      let count = 0;
      for (const review of reviews) {
        if (review.id) {
          await deleteReview(review.id);
          count++;
        }
      }
      setSeedSuccess(`Successfully cleared ${count} reviews!`);
      setTimeout(() => setSeedSuccess(null), 4000);
    } catch (e) {
      console.error('Failed clearing reviews:', e);
      alert('Error clearing reviews.');
    } finally {
      setClearing(false);
    }
  };

  if (profile?.role !== 'superadmin') {
    return (
      <>
        <div className="page-header">
          <div className="page-header-left">
            <h2>System Settings</h2>
          </div>
        </div>
        <div className="page-content">
          <div className="empty-state">
            <div className="empty-state-icon">🔒</div>
            <h3>Access Denied</h3>
            <p>Only super admins can access system settings.</p>
          </div>
        </div>
      </>
    );
  }

  // Calculate review statistics
  const totalRatingVal = reviews.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = reviews.length > 0 ? (totalRatingVal / reviews.length).toFixed(1) : '0.0';
  
  const filteredReviews = reviews.filter(r => {
    if (!reviewsSearch) return true;
    const s = reviewsSearch.toLowerCase();
    return (
      r.driverName.toLowerCase().includes(s) ||
      r.reviewerName.toLowerCase().includes(s) ||
      r.comment.toLowerCase().includes(s)
    );
  });

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>System Settings</h2>
          <p>System overview, Supervisor module visibilities, and Driver ratings & reviews</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '24px', paddingBottom: '2px' }}>
        <button 
          className={`filter-chip ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
          style={{ padding: '8px 16px', borderRadius: '6px', fontSize: 13, border: 'none', cursor: 'pointer' }}
        >
          System Overview
        </button>
        <button 
          className={`filter-chip ${activeTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('permissions')}
          style={{ padding: '8px 16px', borderRadius: '6px', fontSize: 13, border: 'none', cursor: 'pointer' }}
        >
          Supervisor Permissions
        </button>
        <button 
          className={`filter-chip ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
          style={{ padding: '8px 16px', borderRadius: '6px', fontSize: 13, border: 'none', cursor: 'pointer' }}
        >
          Driver Ratings & Reviews ({reviews.length})
        </button>
      </div>

      <div className="page-content" style={{ marginTop: 0 }}>
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {statsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="spinner" />
                <p>Loading system statistics...</p>
              </div>
            ) : stats ? (
              <>
                <div style={{ marginBottom: '40px' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>System Statistics</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div className="stat-card">
                      <div className="stat-label">Total Users</div>
                      <div className="stat-value">{stats.totalUsers}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Drivers</div>
                      <div className="stat-value">{stats.totalDrivers}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Supervisors</div>
                      <div className="stat-value">{stats.totalSupervisors}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Super Admins</div>
                      <div className="stat-value">{stats.totalSuperAdmins}</div>
                    </div>
                    <div className="stat-card alert">
                      <div className="stat-label">Pending Drivers</div>
                      <div className="stat-value">{stats.pendingDrivers}</div>
                    </div>
                    <div className="stat-card alert">
                      <div className="stat-label">Suspended Users</div>
                      <div className="stat-value">{stats.suspendedUsers}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Total Tasks</div>
                      <div className="stat-value">{stats.totalTasks}</div>
                    </div>
                    <div className="stat-card success">
                      <div className="stat-label">Completed Tasks</div>
                      <div className="stat-value">{stats.completedTasks}</div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '40px' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>System Information</h3>
                  <div className="info-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                      <span className="info-label">Environment</span>
                      <span className="info-value">{import.meta.env.MODE}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                      <span className="info-label">Your Role</span>
                      <span className="info-value" style={{ fontWeight: 600, color: 'var(--secondary)' }}>{profile?.role.toUpperCase()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px' }}>
                      <span className="info-label">Last Refreshed</span>
                      <span className="info-value">{new Date().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </>
        )}

        {/* SUPERVISOR PERMISSIONS TAB */}
        {activeTab === 'permissions' && (
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={18} style={{ color: 'var(--primary)' }} /> Supervisor Module Permissions
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: '4px' }}>
                  Select a supervisor first to manage their specific operational visibility and access rules.
                </p>
              </div>
              {permSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: 13, background: 'var(--success)10', padding: '6px 12px', borderRadius: '6px' }}>
                  <CheckCircle size={14} /> Saved and Synced!
                </div>
              )}
            </div>

            {/* Supervisor Selector Dropdown */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '16px', 
              background: '#f9f9f9', 
              borderRadius: '8px', 
              border: '1px solid var(--border)', 
              marginBottom: '24px' 
            }}>
              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>Select Supervisor:</span>
              {supervisors.length > 0 ? (
                <select
                  className="form-select"
                  value={selectedSupervisorId}
                  onChange={e => setSelectedSupervisorId(e.target.value)}
                  style={{ width: '280px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                >
                  <option value="">-- Choose Supervisor --</option>
                  {supervisors.map(s => (
                    <option key={s.uid} value={s.uid}>{s.name || s.displayName}</option>
                  ))}
                </select>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No supervisors found in the system.</span>
              )}
            </div>

            {!selectedSupervisorId ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: '#fafafa', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                <Shield size={32} style={{ marginBottom: '8px', color: 'var(--text-muted)' }} />
                <p style={{ fontSize: '13px' }}>Please select a supervisor from the dropdown above to edit module access permissions.</p>
              </div>
            ) : permissions ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '16px' }}>
                <div className="perm-section">
                  <h4 className="perm-section-title">Main Section Modules</h4>
                  
                  <div className="perm-toggle-row">
                    <div className="perm-info">
                      <span className="perm-name">Overview</span>
                      <span className="perm-desc">General operational stats, counts, and recent actions lists.</span>
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={permissions.overview} onChange={() => handlePermissionToggle('overview')} />
                      <span className="slider round"></span>
                    </label>
                  </div>

                  <div className="perm-toggle-row">
                    <div className="perm-info">
                      <span className="perm-name">Drivers</span>
                      <span className="perm-desc">List registered drivers, review their applications, view detail logs.</span>
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={permissions.drivers} onChange={() => handlePermissionToggle('drivers')} />
                      <span className="slider round"></span>
                    </label>
                  </div>

                  <div className="perm-toggle-row">
                    <div className="perm-info">
                      <span className="perm-name">Tasks</span>
                      <span className="perm-desc">Create delivery tasks, assign them to drivers, monitor progress.</span>
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={permissions.tasks} onChange={() => handlePermissionToggle('tasks')} />
                      <span className="slider round"></span>
                    </label>
                  </div>

                  <div className="perm-toggle-row">
                    <div className="perm-info">
                      <span className="perm-name">Trips</span>
                      <span className="perm-desc">View driver trip sessions, odometer readings, and route summary.</span>
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={permissions.trips} onChange={() => handlePermissionToggle('trips')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>

                <div className="perm-section">
                  <h4 className="perm-section-title">Operations & Management</h4>

                  <div className="perm-toggle-row">
                    <div className="perm-info">
                      <span className="perm-name">Fuel Expenses</span>
                      <span className="perm-desc">View, approve, or reject fuel receipts submitted by drivers.</span>
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={permissions.fuel} onChange={() => handlePermissionToggle('fuel')} />
                      <span className="slider round"></span>
                    </label>
                  </div>

                  <div className="perm-toggle-row">
                    <div className="perm-info">
                      <span className="perm-name">Vehicle Repairs</span>
                      <span className="perm-desc">Monitor breakdowns and repair requests logged by drivers.</span>
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={permissions.repairs} onChange={() => handlePermissionToggle('repairs')} />
                      <span className="slider round"></span>
                    </label>
                  </div>

                  <div className="perm-toggle-row">
                    <div className="perm-info">
                      <span className="perm-name">Live Map</span>
                      <span className="perm-desc">Real-time driver location pinpoints and status update tracking.</span>
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={permissions.liveMap} onChange={() => handlePermissionToggle('liveMap')} />
                      <span className="slider round"></span>
                    </label>
                  </div>

                  <div className="perm-toggle-row">
                    <div className="perm-info">
                      <span className="perm-name">Reports</span>
                      <span className="perm-desc">Generate operational reports, invoices, and analytics charts.</span>
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={permissions.reports} onChange={() => handlePermissionToggle('reports')} />
                      <span className="slider round"></span>
                    </label>
                  </div>

                  <div className="perm-toggle-row">
                    <div className="perm-info">
                      <span className="perm-name">Notifications</span>
                      <span className="perm-desc">Supervisors receive real-time push-style dashboard notices.</span>
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={permissions.notifications} onChange={() => handlePermissionToggle('notifications')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}>Loading permissions settings...</div>
            )}
          </div>
        )}

        {/* DRIVER RATINGS & REVIEWS TAB */}
        {activeTab === 'reviews' && (
          <div>
            {/* Stats Dashboard */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginBottom: '6px' }}>Average Rating</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: 44, fontWeight: 800, color: 'var(--text-primary)' }}>{averageRating}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', color: '#ffb100' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star 
                          key={s} 
                          size={16} 
                          fill={s <= Math.round(Number(averageRating)) ? '#ffb100' : 'none'} 
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: '2px' }}>out of 5.0 stars</span>
                  </div>
                </div>
              </div>

              <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginBottom: '6px' }}>Total Reviews Logged</span>
                <span style={{ fontSize: 44, fontWeight: 800, color: 'var(--primary)' }}>{reviews.length}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>submitted by clients/recipients</span>
              </div>

              <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginBottom: '12px' }}>Testing Utilities</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={handleSeedReviews} 
                    disabled={seeding || clearing}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 12, justifyContent: 'center' }}
                  >
                    <Database size={14} /> 
                    {seeding ? 'Seeding...' : 'Seed Sample Reviews'}
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={handleClearAllReviews} 
                    disabled={seeding || clearing || reviews.length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 12, justifyContent: 'center', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 12px', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} /> 
                    {clearing ? 'Clearing...' : 'Clear All Reviews'}
                  </button>
                </div>
                {seedSuccess && (
                  <span style={{ fontSize: 11, color: 'var(--success)', marginTop: '6px', fontWeight: 600 }}>{seedSuccess}</span>
                )}
              </div>
            </div>

            {/* Filter and Reviews List */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Driver Feedbacks & Ratings</h3>
                <div className="search-box" style={{ width: '280px', margin: 0 }}>
                  <Search size={16} />
                  <input 
                    placeholder="Search by driver, reviewer, comment..." 
                    value={reviewsSearch} 
                    onChange={e => setReviewsSearch(e.target.value)} 
                  />
                </div>
              </div>

              {filteredReviews.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                  {filteredReviews.map(r => (
                    <div key={r.id} className="review-card">
                      <div className="review-header">
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{r.driverName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rated by: {r.reviewerName}</div>
                        </div>
                        <button 
                          className="btn-delete"
                          onClick={() => r.id && handleDeleteReview(r.id)} 
                          title="Delete review"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="review-rating-row">
                        <div style={{ display: 'flex', color: '#ffb100' }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star 
                              key={s} 
                              size={14} 
                              fill={s <= r.rating ? '#ffb100' : 'none'} 
                            />
                          ))}
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="review-comment">"{r.comment}"</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <HelpCircle size={32} style={{ marginBottom: '8px', color: 'var(--text-muted)' }} />
                  <p>No reviews found matching the search criteria.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .stat-card {
          background: white;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }
        .stat-card.alert {
          border-color: var(--warning);
          background: var(--warning)08;
        }
        .stat-card.success {
          border-color: var(--success);
          background: var(--success)08;
        }
        .stat-label {
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .info-card {
          background: white;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 20px;
        }
        .info-label {
          color: var(--text-muted);
          font-size: 13px;
        }
        .info-value {
          color: var(--text-primary);
          font-size: 13px;
        }
        .perm-section {
          background: #fdfdfd;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
        }
        .perm-section-title {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted);
          letter-spacing: 0.5px;
          margin-bottom: 16px;
          border-bottom: 2px solid var(--primary);
          padding-bottom: 4px;
          display: inline-block;
        }
        .perm-toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .perm-toggle-row:last-child {
          border-bottom: none;
        }
        .perm-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-right: 16px;
        }
        .perm-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .perm-desc {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .review-card {
          background: #fafafa;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          transition: all 0.2s ease;
        }
        .review-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          background: white;
          border-color: var(--primary);
        }
        .review-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        .btn-delete {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .btn-delete:hover {
          color: var(--danger);
          background: #fee2e2;
        }
        .review-rating-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .review-comment {
          font-size: 12px;
          color: var(--text-primary);
          font-style: italic;
          line-height: 1.5;
        }
        /* Switch Styles */
        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          flex-shrink: 0;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          -webkit-transition: .2s;
          transition: .2s;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          -webkit-transition: .2s;
          transition: .2s;
        }
        input:checked + .slider {
          background-color: var(--primary);
        }
        input:focus + .slider {
          box-shadow: 0 0 1px var(--primary);
        }
        input:checked + .slider:before {
          -webkit-transform: translateX(20px);
          -ms-transform: translateX(20px);
          transform: translateX(20px);
        }
        .slider.round {
          border-radius: 24px;
        }
        .slider.round:before {
          border-radius: 50%;
        }
      `}</style>
    </>
  );
}
