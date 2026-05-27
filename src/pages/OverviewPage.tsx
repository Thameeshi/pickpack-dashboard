import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToTasks } from '../services/taskService';
import { subscribeToTrips } from '../services/tripService';
import { subscribeToFuelExpenses } from '../services/fuelService';
import { subscribeToRepairRequests } from '../services/repairService';
import { getDrivers } from '../services/userService';
import { Task, TripSession, FuelExpense, UserProfile, RepairRequest, TASK_STATUS_LABELS } from '../types';

function timeAgo(ts: number): string {
  const diff = Date.now() - (ts || 0);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const NOW = Date.now();

function StatusBadge({ status }: { status: string }) {
  const map: { [k: string]: { cls: string; label: string } } = {
    pending: { cls: 'badge-default', label: 'Pending' },
    assigned: { cls: 'badge-info', label: 'Assigned' },
    accepted: { cls: 'badge-purple', label: 'Accepted' },
    in_progress: { cls: 'badge-warning', label: 'In Progress' },
    arrived: { cls: 'badge-info', label: 'Arrived' },
    delivered: { cls: 'badge-success', label: 'Delivered' },
    failed: { cls: 'badge-danger', label: 'Failed' },
  };
  const m = map[status] || { cls: 'badge-default', label: status };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

function MetricBox({
  label,
  value,
  tone,
  caption,
}: {
  label: string;
  value: string | number;
  tone: 'primary' | 'success' | 'info' | 'warning' | 'danger';
  caption?: string;
}) {
  const toneStyles: Record<string, { background: string; color: string }> = {
    primary: { background: 'rgba(59, 130, 246, 0.10)', color: 'var(--primary)' },
    success: { background: 'rgba(16, 185, 129, 0.10)', color: 'var(--success)' },
    info: { background: 'rgba(6, 182, 212, 0.10)', color: 'var(--info, #06b6d4)' },
    warning: { background: 'rgba(245, 158, 11, 0.10)', color: 'var(--warning, #f59e0b)' },
    danger: { background: 'rgba(239, 68, 68, 0.10)', color: 'var(--danger)' },
  };
  const toneStyle = toneStyles[tone];

  return (
    <div style={{ padding: 12, borderRadius: 12, background: toneStyle.background, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: toneStyle.color }}>{value}</div>
      {caption && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{caption}</div>}
    </div>
  );
}

const DAY_START = (() => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
})();

const ON_TIME_WINDOW_MS = 6 * 60 * 60 * 1000;

const ROUTE_STATUS_ORDER: Task['status'][] = ['pending', 'assigned', 'accepted', 'in_progress', 'arrived', 'delivered', 'failed'];

interface DriverSummary {
  id: string;
  name: string;
  assigned: number;
  completed: number;
  onTime: number;
}

export default function OverviewPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [trips, setTrips] = useState<TripSession[]>([]);
  const [fuel, setFuel] = useState<FuelExpense[]>([]);
  const [drivers, setDrivers] = useState<UserProfile[]>([]);
  const [repairs, setRepairs] = useState<RepairRequest[]>([]);

  useEffect(() => {
    const unsub1 = subscribeToTasks(setTasks);
    const unsub2 = subscribeToTrips(setTrips);
    const unsub3 = subscribeToFuelExpenses(setFuel);
    const unsub4 = subscribeToRepairRequests(setRepairs);
    getDrivers().then(setDrivers).catch((e) => console.warn('getDrivers failed', e));
    return () => { try { unsub1(); unsub2(); unsub3(); unsub4(); } catch (e) { console.warn(e); } };
  }, []);

  const activeTrips = trips.filter((t: TripSession) => t?.status === 'active');
  const activeTasks = tasks.filter((t: Task) => !['delivered', 'failed'].includes(t?.status));
  const deliveredToday = tasks.filter((t: Task) => t?.status === 'delivered' && t?.completedAt && t.completedAt > NOW - 86400000);
  const pendingFuel = fuel.filter((f: FuelExpense) => f?.status === 'pending');
  const pendingRepairs = repairs.filter((repair) => repair.status === 'pending');
  const totalFuelCost = fuel.reduce((s: number, f: FuelExpense) => s + (f?.totalCost || 0), 0);
  const approvedDrivers = drivers.filter((d: UserProfile) => d?.status === 'approved');
  const pendingDrivers = drivers.filter((d: UserProfile) => d?.status === 'pending');
  const recentTasks = tasks.slice(0, 8);
  const todaysScheduledDeliveries = tasks.filter((task) => (task.createdAt || 0) >= DAY_START && !['delivered', 'failed'].includes(task.status));
  const routeStatusCounts = ROUTE_STATUS_ORDER.map((status) => ({
    status,
    label: TASK_STATUS_LABELS[status],
    count: tasks.filter((task) => task.status === status).length,
  }));
  const completedTasks = tasks.filter((task) => task.status === 'delivered');
  const onTimeCompleted = completedTasks.filter((task) => {
    const startedAt = task.assignedAt || task.createdAt;
    const finishedAt = task.completedAt || task.updatedAt;
    return finishedAt - startedAt <= ON_TIME_WINDOW_MS;
  }).length;
  const completionRate = tasks.length ? completedTasks.length / tasks.length : 0;
  const onTimeRate = completedTasks.length ? onTimeCompleted / completedTasks.length : 0;
  const openIssues = tasks.filter((task) => task.status === 'failed').length + pendingRepairs.length;
  const completedTrips = trips.filter((trip) => trip.status === 'completed');
  const fuelEfficiencyPerRoute = completedTrips.length
    ? completedTrips.reduce((sum, trip) => sum + (trip.totalFuelLitres || 0), 0) / completedTrips.length
    : 0;
  const driverSummaries = Object.values(tasks.reduce((acc, task) => {
    const key = task.assignedDriverId || task.assignedDriverName || 'unassigned';
    if (!acc[key]) {
      acc[key] = {
        id: key,
        name: task.assignedDriverName || 'Unassigned',
        assigned: 0,
        completed: 0,
        onTime: 0,
      };
    }
    acc[key].assigned += 1;
    if (task.status === 'delivered') {
      acc[key].completed += 1;
      const startedAt = task.assignedAt || task.createdAt;
      const finishedAt = task.completedAt || task.updatedAt;
      if (finishedAt - startedAt <= ON_TIME_WINDOW_MS) acc[key].onTime += 1;
    }
    return acc;
  }, {} as Record<string, DriverSummary>)).sort((a, b) => b.assigned - a.assigned);

  return (
    <div className="overview-page">
      <div className="page-header">
        <div className="page-header-left">
          <h2>Dashboard Overview</h2>
          <p>Welcome back, {profile?.name || 'Supervisor'}</p>
        </div>
        <div className="page-header-actions">
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="page-content">
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📦</div>
                <div className="stat-value">{activeTasks.length}</div>
                <div className="stat-label">Active Tasks</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-value">{deliveredToday.length}</div>
                <div className="stat-label">Delivered Today</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🚚</div>
                <div className="stat-value">{activeTrips.length}</div>
                <div className="stat-label">Active Trips</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👤</div>
                <div className="stat-value">{approvedDrivers.length}</div>
                <div className="stat-label">Active Drivers</div>
                {pendingDrivers.length > 0 && <div className="stat-change negative">+{pendingDrivers.length} pending</div>}
              </div>
              <div className="stat-card">
                <div className="stat-icon">⛽</div>
                <div className="stat-value">{pendingFuel.length}</div>
                <div className="stat-label">Pending Fuel Claims</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div className="stat-value">LKR {totalFuelCost.toLocaleString()}</div>
                <div className="stat-label">Total Fuel Spend</div>
              </div>
            </div>

            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-header">
                <span className="card-title">Daily Operations Dashboard</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Supervisor + Super Admin view</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 14, background: 'rgba(16, 185, 129, 0.04)' }}>
                  <div className="card-title" style={{ marginBottom: 10 }}>Today&apos;s scheduled deliveries</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                    <strong style={{ fontSize: 26 }}>{todaysScheduledDeliveries.length}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{deliveredToday.length} delivered today</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {todaysScheduledDeliveries.slice(0, 4).map((task) => (
                      <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.recipientName}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.pickupLocation} → {task.deliveryLocation}</div>
                        </div>
                        <span className={`badge ${task.status === 'delivered' ? 'badge-success' : task.status === 'failed' ? 'badge-danger' : 'badge-info'}`}>{TASK_STATUS_LABELS[task.status]}</span>
                      </div>
                    ))}
                    {todaysScheduledDeliveries.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No deliveries scheduled today.</div>}
                  </div>
                </div>

                <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 14, background: 'rgba(59, 130, 246, 0.04)' }}>
                  <div className="card-title" style={{ marginBottom: 10 }}>Route status overview</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {routeStatusCounts.map((item) => {
                      const width = tasks.length ? (item.count / tasks.length) * 100 : 0;
                      return (
                        <div key={item.status}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span>{item.label}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{item.count}</span>
                          </div>
                          <div style={{ height: 8, background: 'var(--bg-muted)', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ width: `${width}%`, height: '100%', background: item.status === 'failed' ? 'var(--danger)' : item.status === 'delivered' ? 'var(--success)' : 'var(--primary)' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 14, background: 'rgba(245, 158, 11, 0.05)' }}>
                  <div className="card-title" style={{ marginBottom: 10 }}>Issues / incidents</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                    <MetricBox label="Open issues" value={openIssues} tone="danger" />
                    <MetricBox label="Failed deliveries" value={tasks.filter((task) => task.status === 'failed').length} tone="danger" />
                    <MetricBox label="Pending repairs" value={pendingRepairs.length} tone="warning" />
                    <MetricBox label="Fuel claims" value={pendingFuel.length} tone="info" />
                  </div>
                </div>

                <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 14, background: 'rgba(16, 185, 129, 0.04)' }}>
                  <div className="card-title" style={{ marginBottom: 10 }}>Driver performance</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {driverSummaries.slice(0, 5).map((driver) => {
                      const completionPct = driver.assigned ? (driver.completed / driver.assigned) * 100 : 0;
                      const onTimePct = driver.completed ? (driver.onTime / driver.completed) * 100 : 0;
                      return (
                        <div key={driver.id} style={{ paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <strong style={{ fontSize: 13 }}>{driver.name}</strong>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{driver.completed}/{driver.assigned}</span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                            <span>On-time {Math.round(onTimePct)}%</span>
                            <span>Completed {Math.round(completionPct)}%</span>
                          </div>
                        </div>
                      );
                    })}
                    {driverSummaries.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No driver workload data yet.</div>}
                  </div>
                </div>

                <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 14, background: 'rgba(168, 85, 247, 0.04)' }}>
                  <div className="card-title" style={{ marginBottom: 10 }}>Order allocation</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {driverSummaries.slice(0, 5).map((driver) => {
                      const maxLoad = Math.max(1, driverSummaries[0]?.assigned || 1);
                      return (
                        <div key={driver.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span>{driver.name}</span>
                            <span>{driver.assigned} orders</span>
                          </div>
                          <div style={{ height: 8, background: 'var(--bg-muted)', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ width: `${(driver.assigned / maxLoad) * 100}%`, height: '100%', background: 'var(--secondary)' }} />
                          </div>
                        </div>
                      );
                    })}
                    {driverSummaries.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No allocated orders yet.</div>}
                  </div>
                </div>

                <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 14, background: 'rgba(14, 165, 233, 0.04)' }}>
                  <div className="card-title" style={{ marginBottom: 10 }}>Performance metrics</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                    <MetricBox label="Delivery completion rate" value={`${Math.round(completionRate * 100)}%`} tone="success" />
                    <MetricBox label="On-time delivery" value={`${Math.round(onTimeRate * 100)}%`} tone="primary" />
                    <MetricBox label="Customer satisfaction" value="N/A" tone="info" caption="feedback not tracked yet" />
                    <MetricBox label="Fuel efficiency / route" value={completedTrips.length ? `${fuelEfficiencyPerRoute.toFixed(1)}L` : '—'} tone="warning" caption={completedTrips.length ? 'per completed route' : 'no completed routes yet'} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Recent Tasks</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tasks.length} total</span>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Recipient</th>
                        <th>Route</th>
                        <th>Status</th>
                        <th>Driver</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTasks.map(t => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{t.recipientName}</td>
                          <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.pickupLocation?.substring(0, 15)}.. → {t.deliveryLocation?.substring(0, 15)}..
                          </td>
                          <td><StatusBadge status={t.status} /></td>
                          <td>{t.assignedDriverName || '—'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{timeAgo(t.createdAt)}</td>
                        </tr>
                      ))}
                      {recentTasks.length === 0 && (
                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No tasks yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 14 }}>Active Trips</div>
                  {activeTrips.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No active trips right now</p>
                  ) : (
                    activeTrips.map((t: TripSession) => (
                      <div key={t.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                            {t.driverName?.[0]?.toUpperCase() || 'D'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700 }}>{t.driverName}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.startLocation || '—'} → {t.middleLocations && t.middleLocations.length ? t.middleLocations[t.middleLocations.length - 1] : '—'}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Started {timeAgo(t.startTime)}</div>
                          <a href="/trips" style={{ marginTop: 6, display: 'inline-block', color: 'var(--primary)', fontWeight: 600 }}>View</a>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="card">
                  <div className="card-title" style={{ marginBottom: 14 }}>Pending Fuel Claims</div>
                  {pendingFuel.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No pending claims</p>
                  ) : (
                    pendingFuel.slice(0, 5).map((f: FuelExpense) => (
                      <div key={f.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{f.driverName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>LKR {f.totalCost?.toFixed(0)} • {f.litres}L</div>
                        </div>
                        <span className="badge badge-warning">Pending</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
