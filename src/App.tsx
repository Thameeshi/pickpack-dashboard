/**
 * Web Dashboard Routing & Access Guards (App.tsx)
 * 
 * Defines routing paths and navigation layouts using React Router:
 * 1. ProtectedRoute: Enforces that only logged-in users with active profiles can view pages.
 * 2. SupervisorRouteGuard: Checks supervisor access configurations to selectively restrict
 *    modules (Overview, liveMap, repairs, trips) as toggled by the super administrator.
 * 3. AppRoutes: Maps sub-routes to pages (Overview, Drivers, Tasks, Live Map, Settings).
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import OverviewPage from './pages/OverviewPage';
import DriversPage from './pages/DriversPage';
import TasksPage from './pages/TasksPage';
import TripsPage from './pages/TripsPage';
import FuelPage from './pages/FuelPage';
import RepairPage from './pages/RepairPage';

import UsersPage from './pages/UsersPage';
import PasswordResetPage from './pages/PasswordResetPage';
import NotificationsPage from './pages/NotificationsPage';
import LiveMapPage from './pages/LiveMapPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import LocationsPage from './pages/LocationsPage';
import DriverReviewsPage from './pages/DriverReviewsPage';
import { subscribeToSupervisorModulesSettings } from './services/settingsService';
import { SupervisorModulesSettings } from './types';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!user || !profile) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function SupervisorRouteGuard({ children, moduleKey }: { children: React.ReactNode; moduleKey: keyof SupervisorModulesSettings }) {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<SupervisorModulesSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'supervisor' || !profile?.uid) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    return subscribeToSupervisorModulesSettings((s) => {
      setSettings(s);
      setLoading(false);
    }, profile.uid);
  }, [profile?.uid, profile?.role]);

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  // Access is allowed if user is Superadmin OR if the module is active in supervisor modules settings
  const isAllowed = profile?.role === 'superadmin' || !settings || settings[moduleKey] !== false;

  if (!isAllowed) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <h3>Access Denied</h3>
          <p>This module has been deactivated for supervisors by the super administrator.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<SupervisorRouteGuard moduleKey="overview"><OverviewPage /></SupervisorRouteGuard>} />
        <Route path="drivers" element={<SupervisorRouteGuard moduleKey="drivers"><DriversPage /></SupervisorRouteGuard>} />
        <Route path="tasks" element={<SupervisorRouteGuard moduleKey="tasks"><TasksPage /></SupervisorRouteGuard>} />
        <Route path="trips" element={<SupervisorRouteGuard moduleKey="trips"><TripsPage /></SupervisorRouteGuard>} />
        <Route path="fuel" element={<SupervisorRouteGuard moduleKey="fuel"><FuelPage /></SupervisorRouteGuard>} />
        <Route path="repairs" element={<SupervisorRouteGuard moduleKey="repairs"><RepairPage /></SupervisorRouteGuard>} />
        <Route path="live-map" element={<SupervisorRouteGuard moduleKey="liveMap"><LiveMapPage /></SupervisorRouteGuard>} />
        <Route path="reports" element={<SupervisorRouteGuard moduleKey="reports"><ReportsPage /></SupervisorRouteGuard>} />
        <Route path="notifications" element={<SupervisorRouteGuard moduleKey="notifications"><NotificationsPage /></SupervisorRouteGuard>} />
        <Route path="driver-reviews" element={<DriverReviewsPage />} />
        
        {/* Only super admins can access these */}
        <Route path="users" element={<UsersPage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="password-reset" element={<PasswordResetPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
