import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, CalendarDays, UserRound, Filter, Sparkles } from 'lucide-react';
import { getAllTasks } from '../services/taskService';
import { getAllUsers } from '../services/userService';
import { getAllTrips } from '../services/tripService';
import { Task, UserProfile, TripSession } from '../types';
import { useAuth } from '../contexts/AuthContext';

type ReportRange = 'weekly' | 'monthly';

type DriverReportRow = {
  driverId: string;
  driverName: string;
  assigned: number;
  delivered: number;
  failed: number;
  inProgress: number;
  onTime: number;
  completionRate: number;
  onTimeRate: number;
};

type DeliveryDetailRow = {
  id: string;
  driverName: string;
  supervisorName: string;
  recipientName: string;
  recipientPhone: string;
  pickupLocation: string;
  deliveryLocation: string;
  distance: string;
  timeSpent: string;
  status: string;
  createdAt: string;
  assignedAt: string;
  completedAt: string;
};

type GeneratedReport = {
  rows: DriverReportRow[];
  details: DeliveryDetailRow[];
  totals: { totalAssigned: number; totalDelivered: number; avgCompletion: number };
  generatedAt: number;
};

const ON_TIME_WINDOW_MS = 6 * 60 * 60 * 1000;

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const getRealDistance = (task: Task, tripsList: TripSession[]): string => {
  if (task.tripId) {
    const trip = tripsList.find(tr => tr.id === task.tripId);
    if (trip && trip.totalDistance != null && trip.totalDistance > 0) {
      return `${trip.totalDistance.toFixed(1)} km`;
    }
  }
  if (
    task.pickupLatitude != null &&
    task.pickupLongitude != null &&
    task.deliveryLatitude != null &&
    task.deliveryLongitude != null
  ) {
    const d = haversineDistance(
      task.pickupLatitude,
      task.pickupLongitude,
      task.deliveryLatitude,
      task.deliveryLongitude
    );
    if (d > 0) {
      return `${d.toFixed(1)} km`;
    }
  }
  return '—';
};

const getRealDuration = (task: Task): string => {
  if (task.status !== 'delivered') return '—';
  const startedAt = task.acceptedAt || task.assignedAt || task.createdAt;
  const finishedAt = task.completedAt || task.updatedAt;
  if (!startedAt || !finishedAt) return '—';
  const diffMs = finishedAt - startedAt;
  if (diffMs <= 0) return '—';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) {
    return `${diffMins} mins`;
  }
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
};

export default function ReportsPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [trips, setTrips] = useState<TripSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<ReportRange>('weekly');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('all');
  const [report, setReport] = useState<GeneratedReport | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [allTasks, allUsers, allTrips] = await Promise.all([
          getAllTasks(),
          getAllUsers(),
          getAllTrips(),
        ]);
        setTasks(allTasks);
        setUsers(allUsers);
        setTrips(allTrips);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const role = profile?.role;
  const uid = profile?.uid;

  const since = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfToday = today.getTime();
    return range === 'weekly' ? startOfToday - 7 * 24 * 60 * 60 * 1000 : startOfToday - 30 * 24 * 60 * 60 * 1000;
  }, [range]);

  const visibleTasks = useMemo(() => {
    return tasks.filter(t => {
      const okPeriod = (t.createdAt || 0) >= since;
      if (!okPeriod) return false;
      if (role === 'supervisor') return t.supervisorId === uid;
      return true;
    });
  }, [tasks, role, uid, since]);

  const driverOptions = useMemo(() => {
    const map = new Map<string, string>();
    visibleTasks.forEach(t => {
      const driverId = t.assignedDriverId || t.assignedDriverName || 'unassigned';
      const driverName = t.assignedDriverName || users.find(u => u.uid === t.assignedDriverId)?.name || 'Unassigned';
      map.set(driverId, driverName);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [visibleTasks, users]);

  const filteredTasks = useMemo(() => {
    if (selectedDriverId === 'all') return visibleTasks;
    return visibleTasks.filter(t => (t.assignedDriverId || t.assignedDriverName || 'unassigned') === selectedDriverId);
  }, [visibleTasks, selectedDriverId]);

  const buildReport = (reportTasks: Task[]): GeneratedReport => {
    const byDriver: Record<string, DriverReportRow> = {};
    reportTasks.forEach(task => {
      const driverId = task.assignedDriverId || task.assignedDriverName || 'unassigned';
      const driverName = task.assignedDriverName || users.find(u => u.uid === task.assignedDriverId)?.name || 'Unassigned';
      if (!byDriver[driverId]) {
        byDriver[driverId] = {
          driverId,
          driverName,
          assigned: 0,
          delivered: 0,
          failed: 0,
          inProgress: 0,
          onTime: 0,
          completionRate: 0,
          onTimeRate: 0,
        };
      }

      byDriver[driverId].assigned += 1;
      if (task.status === 'delivered') {
        byDriver[driverId].delivered += 1;
        const startedAt = task.assignedAt || task.createdAt;
        const finishedAt = task.completedAt || task.updatedAt;
        if ((finishedAt - startedAt) <= ON_TIME_WINDOW_MS) {
          byDriver[driverId].onTime += 1;
        }
      } else if (task.status === 'failed') {
        byDriver[driverId].failed += 1;
      } else if (['accepted', 'in_progress', 'arrived'].includes(task.status)) {
        byDriver[driverId].inProgress += 1;
      }
    });

    const rows = Object.values(byDriver)
      .map(r => ({
        ...r,
        completionRate: r.assigned ? (r.delivered / r.assigned) * 100 : 0,
        onTimeRate: r.delivered ? (r.onTime / r.delivered) * 100 : 0,
      }))
      .sort((a, b) => b.delivered - a.delivered || b.assigned - a.assigned);

    const totals = (() => {
      const totalAssigned = rows.reduce((s, r) => s + r.assigned, 0);
      const totalDelivered = rows.reduce((s, r) => s + r.delivered, 0);
      const avgCompletion = rows.length ? rows.reduce((s, r) => s + r.completionRate, 0) / rows.length : 0;
      return { totalAssigned, totalDelivered, avgCompletion };
    })();

    const details: DeliveryDetailRow[] = reportTasks.map(t => {
      const supervisorName = t.supervisorName || users.find(u => u.uid === t.supervisorId)?.name || 'N/A';
      return {
        id: t.id || '-',
        driverName: t.assignedDriverName || users.find(u => u.uid === t.assignedDriverId)?.name || 'Unassigned',
        supervisorName,
        recipientName: t.recipientName || 'N/A',
        recipientPhone: t.recipientPhone || 'N/A',
        pickupLocation: t.pickupLocation || 'N/A',
        deliveryLocation: t.deliveryLocation || 'N/A',
        distance: getRealDistance(t, trips),
        timeSpent: getRealDuration(t),
        status: t.status,
        createdAt: t.createdAt ? new Date(t.createdAt).toLocaleString() : 'N/A',
        assignedAt: t.assignedAt ? new Date(t.assignedAt).toLocaleString() : 'N/A',
        completedAt: t.completedAt ? new Date(t.completedAt).toLocaleString() : 'N/A',
      };
    });

    return { rows, details, totals, generatedAt: Date.now() };
  };

  const generateReport = () => {
    setReport(buildReport(filteredTasks));
  };

  useEffect(() => {
    if (!loading) {
      Promise.resolve().then(() => {
        setReport(buildReport(filteredTasks));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const rows = report?.rows || [];
  const details = report?.details || [];
  const totals = report?.totals || (() => {
    const totalAssigned = rows.reduce((s, r) => s + r.assigned, 0);
    const totalDelivered = rows.reduce((s, r) => s + r.delivered, 0);
    const avgCompletion = rows.length ? rows.reduce((s, r) => s + r.completionRate, 0) / rows.length : 0;
    return { totalAssigned, totalDelivered, avgCompletion };
  })();

  const downloadPdf = () => {
    const periodLabel = range === 'weekly' ? 'Weekly' : 'Monthly';
    const generatedAt = new Date(report?.generatedAt || Date.now()).toLocaleString();
    const summaryRows = rows
      .map(
        r =>
          `<tr>
            <td>${r.driverName}</td>
            <td>${r.assigned}</td>
            <td>${r.delivered}</td>
            <td>${r.failed}</td>
            <td>${r.inProgress}</td>
            <td>${r.completionRate.toFixed(1)}%</td>
            <td>${r.onTimeRate.toFixed(1)}%</td>
          </tr>`,
      )
      .join('');

    const detailsRows = details
      .map(
        d =>
          `<tr>
            <td>${d.driverName}</td>
            <td>${d.supervisorName}</td>
            <td>${d.recipientName}</td>
            <td>${d.recipientPhone}</td>
            <td>${d.pickupLocation}</td>
            <td>${d.deliveryLocation}</td>
            <td>${d.distance}</td>
            <td>${d.timeSpent}</td>
            <td>${d.status}</td>
            <td>${d.createdAt}</td>
            <td>${d.assignedAt}</td>
            <td>${d.completedAt}</td>
          </tr>`,
      )
      .join('');

    const selectedDriverName =
      selectedDriverId === 'all' ? 'All Drivers' : driverOptions.find(d => d.id === selectedDriverId)?.name || selectedDriverId;

    const html = `<!doctype html>
<html>
<head><meta charset="utf-8" />
<title>${periodLabel} Driver Performance Report</title>
<style>
body{font-family:Arial,sans-serif;padding:24px;color:#111}
h1{margin:0 0 6px}
p{margin:4px 0 18px;color:#555}
table{width:100%;border-collapse:collapse}
th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
th{background:#f5f5f5}
</style></head>
<body>
<h1>${periodLabel} Driver Performance Report</h1>
<p>Generated: ${generatedAt}</p>
<p>Driver Filter: ${selectedDriverName}</p>
<p>Total Assigned: ${totals.totalAssigned} | Delivered: ${totals.totalDelivered} | Avg Completion: ${totals.avgCompletion.toFixed(1)}%</p>
<h2>Summary</h2>
<table>
<thead><tr><th>Driver</th><th>Assigned</th><th>Delivered</th><th>Failed</th><th>In Progress</th><th>Completion</th><th>On-time</th></tr></thead>
<tbody>${summaryRows || '<tr><td colspan="7">No data</td></tr>'}</tbody>
</table>
<h2 style="margin-top:24px;">Delivery Details</h2>
<table>
<thead><tr><th>Driver</th><th>Supervisor</th><th>Recipient</th><th>Phone</th><th>Pickup</th><th>Delivery</th><th>Distance</th><th>Time Spent</th><th>Status</th><th>Created</th><th>Assigned</th><th>Completed</th></tr></thead>
<tbody>${detailsRows || '<tr><td colspan="12">No delivery detail rows</td></tr>'}</tbody>
</table>
</body></html>`;

    const printWindow = window.open('', '_blank', 'width=1024,height=768');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>
            <FileText size={26} style={{ marginRight: 10, verticalAlign: 'middle' }} />
            Driver Performance Reports
          </h2>
          <p>Weekly and monthly performance by driver with PDF export.</p>
        </div>
        <div className="page-header-actions">
          <button className={`btn ${range === 'weekly' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRange('weekly')}>
            <CalendarDays size={16} /> Weekly
          </button>
          <button className={`btn ${range === 'monthly' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRange('monthly')}>
            <CalendarDays size={16} /> Monthly
          </button>
          <button className="btn btn-primary" onClick={downloadPdf}>
            <Download size={16} /> Download PDF
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Filter size={16} /> Report Filters
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) auto', gap: 12, alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Select Driver</label>
              <select
                className="form-select"
                value={selectedDriverId}
                onChange={e => setSelectedDriverId(e.target.value)}
              >
                <option value="all">All Drivers</option>
                {driverOptions.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={generateReport}>
              <Sparkles size={16} /> Generate Report
            </button>
          </div>
        </div>

        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-value">{totals.totalAssigned}</div>
            <div className="stat-label">Assigned ({range})</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{totals.totalDelivered}</div>
            <div className="stat-label">Delivered ({range})</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-value">{totals.avgCompletion.toFixed(1)}%</div>
            <div className="stat-label">Avg completion rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><UserRound size={22} /></div>
            <div className="stat-value">{rows.length}</div>
            <div className="stat-label">Drivers in report</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">{range === 'weekly' ? 'Weekly' : 'Monthly'} Driver Breakdown</div>
          </div>
          {loading ? (
            <div className="loading-page" style={{ minHeight: 200 }}>
              <div className="spinner" />
            </div>
          ) : rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <h3>No data for this period</h3>
              <p>Try another period or assign more trips.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Assigned</th>
                    <th>Delivered</th>
                    <th>Failed</th>
                    <th>In Progress</th>
                    <th>Completion</th>
                    <th>On-time</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.driverId}>
                      <td>{r.driverName}</td>
                      <td>{r.assigned}</td>
                      <td>{r.delivered}</td>
                      <td>{r.failed}</td>
                      <td>{r.inProgress}</td>
                      <td>
                        <span className={`badge ${r.completionRate >= 70 ? 'badge-success' : r.completionRate >= 40 ? 'badge-warning' : 'badge-danger'}`}>
                          {r.completionRate.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${r.onTimeRate >= 80 ? 'badge-success' : r.onTimeRate >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                          {r.onTimeRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div className="card-title">Delivery Details (Full Report)</div>
          </div>
          {loading ? (
            <div className="loading-page" style={{ minHeight: 180 }}>
              <div className="spinner" />
            </div>
          ) : details.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🧾</div>
              <h3>No detailed deliveries</h3>
              <p>No records matched selected filters.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Supervisor</th>
                    <th>Recipient</th>
                    <th>Phone</th>
                    <th>Pickup Location</th>
                    <th>Delivery Location</th>
                    <th>Distance</th>
                    <th>Time Spent</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Assigned</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map(d => (
                    <tr key={d.id}>
                      <td>{d.driverName}</td>
                      <td>{d.supervisorName}</td>
                      <td>{d.recipientName}</td>
                      <td>{d.recipientPhone}</td>
                      <td>{d.pickupLocation}</td>
                      <td>{d.deliveryLocation}</td>
                      <td>{d.distance}</td>
                      <td>{d.timeSpent}</td>
                      <td>
                        <span className={`badge ${
                          d.status === 'delivered'
                            ? 'badge-success'
                            : d.status === 'failed'
                              ? 'badge-danger'
                              : d.status === 'assigned'
                                ? 'badge-warning'
                                : 'badge-info'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td>{d.createdAt}</td>
                      <td>{d.assignedAt}</td>
                      <td>{d.completedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

