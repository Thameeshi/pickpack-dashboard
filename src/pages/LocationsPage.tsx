import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToLocations,
  addLocation,
  updateLocation,
  deleteLocation,
  LocationRecord,
  LocationType,
} from '../services/locationService';
import { MapPin, Plus, Search, Pencil, Trash2, Warehouse, Store, X } from 'lucide-react';

export default function LocationsPage() {
  const { profile } = useAuth();
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [activeTab, setActiveTab] = useState<LocationType>('warehouse');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formContact, setFormContact] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToLocations(setLocations);
    return () => unsub();
  }, []);

  const filtered = locations
    .filter(l => l.type === activeTab)
    .filter(l =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.address || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.contact || '').toLowerCase().includes(search.toLowerCase())
    );

  const openAddForm = () => {
    setEditingId(null);
    setFormName('');
    setFormAddress('');
    setFormContact('');
    setShowForm(true);
  };

  const openEditForm = (loc: LocationRecord) => {
    setEditingId(loc.id);
    setFormName(loc.name);
    setFormAddress(loc.address || '');
    setFormContact(loc.contact || '');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormName('');
    setFormAddress('');
    setFormContact('');
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateLocation(editingId, { name: formName.trim(), address: formAddress.trim(), contact: formContact.trim() });
      } else {
        await addLocation({
          name: formName.trim(),
          type: activeTab,
          address: formAddress.trim(),
          contact: formContact.trim(),
          createdBy: profile?.uid || '',
        });
      }
      closeForm();
    } catch (err) {
      console.error('Save location error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLocation(id);
    } catch (err) {
      console.error('Delete location error:', err);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const warehouseCount = locations.filter(l => l.type === 'warehouse').length;
  const supermarketCount = locations.filter(l => l.type === 'supermarket').length;

  if (profile?.role !== 'superadmin') {
    return (
      <>
        <div className="page-header">
          <div className="page-header-left">
            <h2>Locations</h2>
          </div>
        </div>
        <div className="page-content">
          <div className="empty-state">
            <div className="empty-state-icon">🔒</div>
            <h3>Access Denied</h3>
            <p>Only super admins can manage locations.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Locations</h2>
          <p>{warehouseCount} warehouses · {supermarketCount} supermarkets</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openAddForm}>
            <Plus size={18} /> Add {activeTab === 'warehouse' ? 'Warehouse' : 'Supermarket'}
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Tabs & Search */}
        <div className="filters-row" style={{ marginBottom: '20px' }}>
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'warehouse' ? 'warehouses' : 'supermarkets'}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            className={`filter-chip ${activeTab === 'warehouse' ? 'active' : ''}`}
            onClick={() => { setActiveTab('warehouse'); setSearch(''); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Warehouse size={16} /> Warehouses ({warehouseCount})
          </button>
          <button
            className={`filter-chip ${activeTab === 'supermarket' ? 'active' : ''}`}
            onClick={() => { setActiveTab('supermarket'); setSearch(''); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Store size={16} /> Supermarkets ({supermarketCount})
          </button>
        </div>

        {/* Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>NAME</th>
                <th>ADDRESS</th>
                <th>CONTACT</th>
                <th>ADDED</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    {search
                      ? `No ${activeTab === 'warehouse' ? 'warehouses' : 'supermarkets'} matching "${search}"`
                      : `No ${activeTab === 'warehouse' ? 'warehouses' : 'supermarkets'} added yet. Click "Add" to get started.`}
                  </td>
                </tr>
              ) : (
                filtered.map(loc => (
                  <tr key={loc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={16} style={{ color: activeTab === 'warehouse' ? 'var(--primary)' : 'var(--success)', flexShrink: 0 }} />
                        <strong>{loc.name}</strong>
                      </div>
                    </td>
                    <td style={{ color: loc.address ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {loc.address || '—'}
                    </td>
                    <td style={{ color: loc.contact ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {loc.contact || '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      {new Date(loc.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <button className="btn-ghost btn-icon" onClick={() => openEditForm(loc)} title="Edit">
                          <Pencil size={16} />
                        </button>
                        {deleteConfirmId === loc.id ? (
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: 'var(--danger)' }}>Delete?</span>
                            <button
                              className="btn-ghost btn-icon"
                              onClick={() => handleDelete(loc.id)}
                              style={{ color: 'var(--danger)' }}
                              title="Confirm delete"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button className="btn-ghost btn-icon" onClick={() => setDeleteConfirmId(null)} title="Cancel">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn-ghost btn-icon"
                            onClick={() => setDeleteConfirmId(loc.id)}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit' : 'Add'} {activeTab === 'warehouse' ? 'Warehouse' : 'Supermarket'}</h3>
              <button className="btn-ghost btn-icon" onClick={closeForm}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Location Name *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={activeTab === 'warehouse' ? 'e.g. Central Warehouse, Port Road' : 'e.g. SaveMart Supermarket, Downtown'}
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Address (optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Full street address..."
                  value={formAddress}
                  onChange={e => setFormAddress(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Contact Number (optional)
                </label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. +94 7X XXX XXXX"
                  value={formContact}
                  onChange={e => setFormContact(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeForm}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !formName.trim()}>
                {saving ? 'Saving...' : (editingId ? 'Save Changes' : 'Add Location')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-content {
          background: white;
          border-radius: 12px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
        }
        .modal-header h3 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .modal-body {
          padding: 24px;
        }
        .modal-footer {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          padding: 16px 24px;
          border-top: 1px solid var(--border);
        }
        .form-input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .form-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(128, 0, 0, 0.08);
        }
      `}</style>
    </>
  );
}
