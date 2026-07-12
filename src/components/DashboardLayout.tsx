import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { subscribeToNotifications } from '../services/notificationService';
import { subscribeToSupervisorModulesSettings } from '../services/settingsService';
import { AppNotification, SupervisorModulesSettings, DEFAULT_SUPERVISOR_MODULES } from '../types';
import { LayoutDashboard, Truck, ClipboardList, Navigation, Fuel, Users, Bell, LogOut, Menu, X, MapPin, PenTool, Settings, Key, FileText, Star, ChevronDown } from 'lucide-react';

export default function DashboardLayout() {
  const { profile, logout } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supervisorSettings, setSupervisorSettings] = useState<SupervisorModulesSettings>(DEFAULT_SUPERVISOR_MODULES);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!profile?.uid) return;
    return subscribeToNotifications(profile.uid, setNotifications);
  }, [profile?.uid]);

  useEffect(() => {
    // Listen for supervisor visibility settings in real-time
    if (profile?.role === 'supervisor' && profile?.uid) {
      return subscribeToSupervisorModulesSettings(setSupervisorSettings, profile.uid);
    } else {
      setSupervisorSettings(DEFAULT_SUPERVISOR_MODULES);
    }
  }, [profile?.uid, profile?.role]);

  const isSuperAdmin = profile?.role === 'superadmin';
  const isSupervisor = profile?.role === 'supervisor';

  // Helper to determine if a nav link should be visible to the supervisor
  const isVisible = (key: keyof SupervisorModulesSettings) => {
    if (isSuperAdmin) return true; // Super Admin always sees everything
    if (isSupervisor) return supervisorSettings[key] !== false; // Active by default
    return false;
  };

  // Check if at least one of the main items is visible
  const hasVisibleMain = 
    isVisible('overview') || 
    isVisible('drivers') || 
    isVisible('tasks') || 
    isVisible('trips') || 
    isVisible('fuel') || 
    isVisible('repairs') || 
    isVisible('liveMap') || 
    isVisible('reports');

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">P</div>
          <h1>PickPack</h1>
          <button className="btn-ghost btn-icon" onClick={() => setSidebarOpen(false)} style={{ marginLeft: 'auto', display: sidebarOpen ? 'block' : 'none' }}>
            <X size={18} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {hasVisibleMain && <div className="nav-section-label">Main</div>}
          
          {isVisible('overview') && (
            <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <LayoutDashboard size={20} /> Overview
            </NavLink>
          )}
          
          {isVisible('drivers') && (
            <NavLink to="/drivers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <Truck size={20} /> Drivers
            </NavLink>
          )}
          
          {isVisible('tasks') && (
            <NavLink to="/tasks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <ClipboardList size={20} /> Tasks
            </NavLink>
          )}
          
          {isVisible('trips') && (
            <NavLink to="/trips" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <Navigation size={20} /> Trips
            </NavLink>
          )}
          
          {isVisible('fuel') && (
            <NavLink to="/fuel" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <Fuel size={20} /> Fuel Expenses
            </NavLink>
          )}
          
          {isVisible('repairs') && (
            <NavLink to="/repairs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <PenTool size={20} /> Vehicle Repairs
            </NavLink>
          )}
          
          {isVisible('liveMap') && (
            <NavLink to="/live-map" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <MapPin size={20} /> Live Map
            </NavLink>
          )}
          
          {isVisible('reports') && (
            <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <FileText size={20} /> Reports
            </NavLink>
          )}
          
          {isVisible('notifications') && (
            <>
              <div className="nav-section-label">Management</div>
              <NavLink to="/notifications" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <Bell size={20} /> Notifications
                {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
              </NavLink>
            </>
          )}
          
          {isSupervisor && (
            <NavLink to="/driver-reviews" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <Star size={20} /> Driver Reviews
            </NavLink>
          )}
          
          {isSuperAdmin && (
            <>
              <div className="nav-section-label">Management Settings</div>
              <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <Users size={20} /> User Management
              </NavLink>
              <NavLink to="/locations" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <MapPin size={20} /> Locations
              </NavLink>
              <NavLink to="/password-reset" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <Key size={20} /> Password Reset
              </NavLink>
              <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <Settings size={20} /> System Settings
              </NavLink>
            </>
          )}
        </nav>
      </aside>
      <main className="main-content">
        <button className="btn-ghost btn-icon" onClick={() => setSidebarOpen(true)} style={{ position: 'fixed', top: 16, left: 16, zIndex: 99, display: 'none' }} id="mobile-menu-btn">
          <Menu size={22} />
        </button>

        {/* Global User Profile Dropdown Component */}
        <div style={{ position: 'fixed', top: 18, right: 32, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                padding: '6px 14px',
                borderRadius: '20px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              className="profile-top-btn"
            >
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--accent)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700
              }}>
                {profile?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <span style={{ textTransform: 'capitalize' }}>{profile?.name || 'User'}</span>
              <ChevronDown size={14} style={{ transform: profileMenuOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
            </button>

            {profileMenuOpen && (
              <>
                <div 
                  onClick={() => setProfileMenuOpen(false)} 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                />
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '220px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '16px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}>
                  <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{profile?.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'lowercase', marginTop: '2px' }}>{profile?.email}</div>
                    <div style={{
                      display: 'inline-block',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: 'var(--accent)',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      marginTop: '6px',
                      textTransform: 'uppercase'
                    }}>
                      {profile?.role}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <NavLink 
                      to="/settings" 
                      onClick={() => setProfileMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        fontSize: '13px'
                      }}
                      className="dropdown-item"
                    >
                      <Settings size={14} /> System Settings
                    </NavLink>
                    <NavLink 
                      to="/password-reset" 
                      onClick={() => setProfileMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        fontSize: '13px'
                      }}
                      className="dropdown-item"
                    >
                      <Key size={14} /> Reset Password
                    </NavLink>
                  </div>

                  <button 
                    onClick={() => {
                      setProfileMenuOpen(false);
                      logout();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '8px 10px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#EF4444',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  >
                    <LogOut size={14} /> Log Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <Outlet />
      </main>
    </div>
  );
}
