import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Settings, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { UserProfile, Task, AppNotification } from '../types';

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

export default function SettingsPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'superadmin') {
      loadStats();
    }
  }, [profile]);

  const loadStats = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const tasksSnap = await getDocs(collection(db, 'tasks'));
      const notificationsSnap = await getDocs(collection(db, 'notifications'));

      const users = usersSnap.docs.map(d => d.data() as UserProfile);
      const tasks = tasksSnap.docs.map(d => d.data() as Task);

      const stats: SystemStats = {
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

      setStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
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

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>System Settings</h2>
          <p>System overview and administration controls</p>
        </div>
      </div>
      <div className="page-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner" />
            <p>Loading system statistics...</p>
          </div>
        ) : stats ? (
          <>
            {/* System Statistics */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: 18, fontWeight: 600 }}>System Overview</h3>
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

            {/* System Information */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: 18, fontWeight: 600 }}>System Information</h3>
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

            {/* Admin Guide */}
            <div>
              <h3 style={{ marginBottom: '16px', fontSize: 18, fontWeight: 600 }}>Super Admin Guide</h3>
              <div className="guide-card">
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ marginBottom: '8px', fontWeight: 600 }}>👥 User Management</h4>
                  <p>Go to <strong>User Management</strong> to:</p>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    <li>View all users and their roles</li>
                    <li>Promote supervisors to super admins</li>
                    <li>Approve pending driver registrations</li>
                    <li>Suspend or reactivate user accounts</li>
                    <li>Search and filter users</li>
                  </ul>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ marginBottom: '8px', fontWeight: 600 }}>📊 Analytics & Monitoring</h4>
                  <p>Use the <strong>Overview</strong> page to:</p>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    <li>Monitor system performance</li>
                    <li>View recent tasks and trips</li>
                    <li>Track driver activity</li>
                    <li>Check fuel expenses</li>
                  </ul>
                </div>
                <div>
                  <h4 style={{ marginBottom: '8px', fontWeight: 600 }}>🔔 Notifications</h4>
                  <p>System generates notifications for:</p>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    <li>Driver registration requests</li>
                    <li>Task assignments and completions</li>
                    <li>Fuel expense approvals</li>
                    <li>Vehicle repair reports</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        ) : null}
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
          background: var(--warning) + '08';
        }
        .stat-card.success {
          border-color: var(--success);
          background: var(--success) + '08';
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
        .guide-card {
          background: white;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 20px;
        }
        .guide-card h4 {
          color: var(--text-primary);
          font-size: 14px;
        }
        .guide-card p {
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.5;
        }
        .guide-card ul {
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.6;
        }
        .guide-card li {
          margin-bottom: 4px;
        }
      `}</style>
    </>
  );
}
