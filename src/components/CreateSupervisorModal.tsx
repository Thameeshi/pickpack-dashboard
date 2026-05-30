import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Eye, EyeOff, Plus } from 'lucide-react';
import { createSupervisor } from '../services/userService';
import { subscribeToLocations, LocationRecord } from '../services/locationService';

interface CreateSupervisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateSupervisorModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateSupervisorModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Assigned location states
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [assignedType, setAssignedType] = useState<'warehouse' | 'supermarket' | ''>('');
  const [assignedLocId, setAssignedLocId] = useState('');

  useEffect(() => {
    if (isOpen) {
      const unsub = subscribeToLocations(setLocations);
      return () => unsub();
    }
  }, [isOpen]);

  const validateForm = () => {
    if (!email || !password || !confirmPassword || !name || !phone) {
      setError('All fields are required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (phone.length < 10) {
      setError('Please enter a valid phone number');
      return false;
    }
    // If a type is selected, location is required
    if (assignedType && !assignedLocId) {
      setError(`Please select a ${assignedType}`);
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    setError(null);
    if (!validateForm()) return;

    setLoading(true);
    try {
      const selectedLoc = locations.find(l => l.id === assignedLocId);
      await createSupervisor(
        email,
        password,
        name,
        phone,
        assignedLocId || undefined,
        selectedLoc?.name || undefined,
        assignedType || undefined
      );
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setName('');
        setPhone('');
        setAssignedType('');
        setAssignedLocId('');
        setSuccess(false);
      }, 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create supervisor';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setPhone('');
    setAssignedType('');
    setAssignedLocId('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20
    }} onClick={handleReset}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        maxWidth: 500,
        width: '100%',
        overflow: 'hidden',
        animation: 'slideUp 0.3s ease-out'
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#F9FAFB'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 20
            }}>
              <Plus size={20} />
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
              Create New Supervisor
            </h3>
          </div>
          <button
            onClick={handleReset}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {success && (
            <div style={{
              background: '#ECFDF5',
              border: '1px solid #86EFAC',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: '#166534'
            }}>
              <CheckCircle size={20} style={{ color: '#16A34A', flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                Supervisor created successfully!
              </span>
            </div>
          )}

          {error && (
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: '#991B1B'
            }}>
              <AlertCircle size={20} style={{ color: '#DC2626', flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{error}</span>
            </div>
          )}

          {!success && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Name */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 8
                }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter supervisor name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: 6,
                    fontSize: 14,
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                  disabled={loading}
                />
              </div>

              {/* Email */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 8
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="supervisor@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: 6,
                    fontSize: 14,
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                  disabled={loading}
                />
              </div>

              {/* Phone */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 8
                }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+1234567890"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: 6,
                    fontSize: 14,
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                  disabled={loading}
                />
              </div>

              {/* Assigned Location */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 8
                }}>
                  Assign Location (optional)
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (assignedType === 'warehouse') {
                        setAssignedType('');
                        setAssignedLocId('');
                      } else {
                        setAssignedType('warehouse');
                        setAssignedLocId('');
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #E5E7EB',
                      backgroundColor: assignedType === 'warehouse' ? 'var(--primary)' : 'white',
                      color: assignedType === 'warehouse' ? 'white' : 'var(--text-primary)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    disabled={loading}
                  >
                    Warehouse
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (assignedType === 'supermarket') {
                        setAssignedType('');
                        setAssignedLocId('');
                      } else {
                        setAssignedType('supermarket');
                        setAssignedLocId('');
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #E5E7EB',
                      backgroundColor: assignedType === 'supermarket' ? 'var(--primary)' : 'white',
                      color: assignedType === 'supermarket' ? 'white' : 'var(--text-primary)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    disabled={loading}
                  >
                    Supermarket
                  </button>
                </div>

                {assignedType && (
                  <select
                    value={assignedLocId}
                    onChange={e => setAssignedLocId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #E5E7EB',
                      borderRadius: 6,
                      fontSize: 14,
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      background: 'white',
                      color: 'var(--text-primary)'
                    }}
                    disabled={loading}
                  >
                    <option value="">-- Select {assignedType === 'warehouse' ? 'Warehouse' : 'Supermarket'} --</option>
                    {locations
                      .filter(l => l.type === assignedType)
                      .map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name} {l.address ? `(${l.address})` : ''}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* Password */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 8
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password (min. 6 characters)"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      paddingRight: 40,
                      border: '1px solid #E5E7EB',
                      borderRadius: 6,
                      fontSize: 14,
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 8
                }}>
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      paddingRight: 40,
                      border: '1px solid #E5E7EB',
                      borderRadius: 6,
                      fontSize: 14,
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #E5E7EB',
            background: '#F9FAFB',
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={handleReset}
              style={{
                padding: '10px 20px',
                border: '1px solid #E5E7EB',
                borderRadius: 6,
                background: 'white',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: 6,
                background: 'var(--primary)',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s'
              }}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Supervisor'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
