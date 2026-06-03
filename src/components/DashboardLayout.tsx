import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { subscribeToNotifications } from '../services/notificationService';
import { subscribeToSupervisorModulesSettings } from '../services/settingsService';
import { AppNotification, SupervisorModulesSettings, DEFAULT_SUPERVISOR_MODULES } from '../types';
import { LayoutDashboard, Truck, ClipboardList, Navigation, Fuel, Users, Bell, LogOut, Menu, X, MapPin, PenTool, Settings, Key, FileText, Star } from 'lucide-react';

export default function DashboardLayout() {
  const { profile, logout } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supervisorSettings, setSupervisorSettings] = useState<SupervisorModulesSettings>(DEFAULT_SUPERVISOR_MODULES);
  
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
        <div className="sidebar-footer">
          <div className="sidebar-avatar">{profile?.name?.[0]?.toUpperCase() || 'U'}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{profile?.name || 'User'}</div>
            <div className="sidebar-user-role">{profile?.role}</div>
          </div>
          <button className="btn-ghost btn-icon" onClick={logout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <main className="main-content">
        <button className="btn-ghost btn-icon" onClick={() => setSidebarOpen(true)} style={{ position: 'fixed', top: 16, left: 16, zIndex: 99, display: 'none' }} id="mobile-menu-btn">
          <Menu size={22} />
        </button>
        <Outlet />
      </main>
    </div>
  );
}
