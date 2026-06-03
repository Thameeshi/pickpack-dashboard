import { useEffect, useState } from 'react';
import { getAllUsers } from '../services/userService';
import { UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Search, Key, Lock } from 'lucide-react';
import PasswordResetModal from '../components/PasswordResetModal';

export default function PasswordResetPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resetPasswordUser, setResetPasswordUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const u = await getAllUsers();
    setUsers(u);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  if (profile?.role !== 'superadmin') {
    return (
      <>
        <div className="page-header">
          <div className="page-header-left">
            <h2>Password Reset</h2>
          </div>
        </div>
        <div className="page-content">
          <div className="empty-state">
            <div className="empty-state-icon">🔒</div>
            <h3>Access Denied</h3>
            <p>Only super admins can reset user passwords.</p>
          </div>
        </div>
      </>
    );
  }

  const filtered = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>
            <Lock size={28} style={{ marginRight: 12, verticalAlign: 'middle' }} />
            Password Reset Management
          </h2>
          <p style={{ marginTop: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
            Send password reset emails to drivers, supervisors, and admins. Users will receive a secure link to reset their password.
          </p>
        </div>
      </div>

      <div className="page-content">
        {/* Search Bar */}
        <div style={{
          background: 'var(--surface-secondary)',
          padding: '16px 20px',
          borderRadius: 8,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            placeholder="Search users by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              fontSize: 14,
              outline: 'none',
              color: 'var(--text-primary)'
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: 18
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Filter by Role
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { value: 'all', label: 'All Users', icon: '👥' },
                { value: 'driver', label: 'Drivers', icon: '🚗' },
                { value: 'supervisor', label: 'Supervisors', icon: '👔' },
                { value: 'superadmin', label: 'Super Admins', icon: '👑' }
              ].map(f => (
                <button
                  key={f.value}
                  className={`filter-chip ${roleFilter === f.value ? 'active' : ''}`}
                  onClick={() => setRoleFilter(f.value)}
                  style={{
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: roleFilter === f.value ? 600 : 500,
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ marginRight: 6 }}>{f.icon}</span>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Filter by Status
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { value: 'all', label: 'All Status', color: '#6B7280' },
                { value: 'pending', label: 'Pending', color: '#F59E0B' },
                { value: 'approved', label: 'Approved', color: '#10B981' },
                { value: 'suspended', label: 'Suspended', color: '#8B5CF6' },
                { value: 'rejected', label: 'Rejected', color: '#DC2626' }
              ].map(s => (
                <button
                  key={s.value}
                  className={`filter-chip ${statusFilter === s.value ? 'active' : ''}`}
                  onClick={() => setStatusFilter(s.value)}
                  style={{
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: statusFilter === s.value ? 600 : 500,
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: s.color,
                    marginRight: 6
                  }} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div style={{
          padding: 12,
          background: 'var(--surface-secondary)',
          borderRadius: 6,
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            Found <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> user{filtered.length !== 1 ? 's' : ''}
            {search && ` matching "${search}"`}
          </span>
        </div>

        {/* Users Table */}
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-muted)'
          }}>
            <div className="spinner" style={{ marginBottom: 12 }} />
            <p>Loading users...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-muted)',
            background: 'var(--surface-secondary)',
            borderRadius: 8
          }}>
            <p style={{ fontSize: 14 }}>📭 No users found</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="table-container">
            <table style={{ width: '100%' }}>
              <thead>
                <tr style={{ background: 'var(--surface-secondary)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>User</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>Email</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>Role</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>Phone</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>Joined</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, idx) => (
                  <tr
                    key={u.uid}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                      transition: 'background 0.2s'
                    }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background:
                              u.role === 'superadmin'
                                ? 'var(--secondary)'
                                : u.role === 'supervisor'
                                ? 'var(--primary)'
                                : 'var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 13,
                            color: 'white',
                          }}
                        >
                          {u.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                          {u.name}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'white',
                          background:
                            u.role === 'superadmin'
                              ? 'var(--secondary)'
                              : u.role === 'supervisor'
                              ? 'var(--primary)'
                              : '#6B7280',
                          padding: '4px 10px',
                          borderRadius: 4,
                          textTransform: 'capitalize'
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: 4,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          background:
                            u.status === 'approved'
                              ? 'rgba(16, 185, 129, 0.1)'
                              : u.status === 'pending'
                              ? 'rgba(245, 158, 11, 0.1)'
                              : u.status === 'suspended'
                              ? 'rgba(139, 92, 246, 0.1)'
                              : 'rgba(220, 38, 38, 0.1)',
                          color:
                            u.status === 'approved'
                              ? '#059669'
                              : u.status === 'pending'
                              ? '#D97706'
                              : u.status === 'suspended'
                              ? '#7C3AED'
                              : '#DC2626'
                        }}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {u.phone || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setResetPasswordUser(u)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 16px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <Key size={14} />
                        Reset
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {resetPasswordUser && (
        <PasswordResetModal
          isOpen={!!resetPasswordUser}
          userName={resetPasswordUser.name}
          userEmail={resetPasswordUser.email}
          userId={resetPasswordUser.uid}
          onClose={() => setResetPasswordUser(null)}
          onSuccess={() => refresh()}
        />
      )}
    </>
  );
}
