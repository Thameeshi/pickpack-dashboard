import { useState } from 'react';
import { X, AlertCircle, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { updateUserPasswordDirectly } from '../services/userService';

interface PasswordResetModalProps {
  isOpen: boolean;
  userName: string;
  userEmail: string;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PasswordResetModal({
  isOpen,
  userName,
  userEmail,
  userId,
  onClose,
  onSuccess,
}: PasswordResetModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validatePassword = () => {
    if (!newPassword || !confirmPassword) {
      setError('Both password fields are required');
      return false;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleReset = async () => {
    setError(null);
    if (!validatePassword()) return;

    setLoading(true);
    try {
      await updateUserPasswordDirectly(userId, userEmail, newPassword);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setNewPassword('');
        setConfirmPassword('');
        setSuccess(false);
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
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
    }} onClick={onClose}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Lock size={20} />
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
              Set New Password
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#6B7280',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#E5E7EB'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <CheckCircle size={32} style={{ color: '#059669' }} />
              </div>
              <h3 style={{
                marginBottom: 12,
                color: '#111827',
                fontSize: 18,
                fontWeight: 700
              }}>
                Password Updated Successfully!
              </h3>
              <p style={{
                color: '#4B5563',
                marginBottom: 12,
                fontSize: 14,
                lineHeight: 1.5
              }}>
                The password for <strong>{userName}</strong> has been updated.
              </p>
              <p style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                padding: '10px 16px',
                borderRadius: 8,
                color: '#075985',
                fontSize: 13,
                marginBottom: 0
              }}>
                ℹ️ The user can now log in with the new password.
              </p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <p style={{
                  color: '#4B5563',
                  marginBottom: 16,
                  fontSize: 14,
                  fontWeight: 500
                }}>
                  You are setting a new password for:
                </p>

                {/* User Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)',
                  border: '2px solid #BFDBFE',
                  padding: 16,
                  borderRadius: 10,
                  marginBottom: 20
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: 16
                    }}>
                      {userName?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p style={{
                        color: '#111827',
                        fontWeight: 600,
                        margin: 0,
                        fontSize: 14
                      }}>
                        {userName}
                      </p>
                      <p style={{
                        color: '#6B7280',
                        fontSize: 12,
                        margin: 0,
                        marginTop: 2
                      }}>
                        {userEmail}
                      </p>
                    </div>
                  </div>
                </div>

                {/* New Password Field */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#111827',
                    marginBottom: 8
                  }}>
                    New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setError(null);
                      }}
                      placeholder="Enter new password (min 6 characters)"
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 12px',
                        fontSize: 14,
                        border: error && !newPassword ? '1px solid #DC2626' : '1px solid #D1D5DB',
                        borderRadius: 8,
                        boxSizing: 'border-box',
                        transition: 'border-color 0.2s',
                        fontFamily: 'inherit'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#3B82F6';
                        e.target.style.outline = 'none';
                        e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#D1D5DB';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6B7280',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 4
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#111827',
                    marginBottom: 8
                  }}>
                    Confirm Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError(null);
                      }}
                      placeholder="Confirm password"
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 12px',
                        fontSize: 14,
                        border: error && newPassword !== confirmPassword ? '1px solid #DC2626' : '1px solid #D1D5DB',
                        borderRadius: 8,
                        boxSizing: 'border-box',
                        transition: 'border-color 0.2s',
                        fontFamily: 'inherit'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#3B82F6';
                        e.target.style.outline = 'none';
                        e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#D1D5DB';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6B7280',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 4
                      }}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div style={{
                    background: '#FEE2E2',
                    border: '1px solid #FECACA',
                    borderRadius: 8,
                    padding: 12,
                    display: 'flex',
                    gap: 10,
                    marginBottom: 16
                  }}>
                    <AlertCircle size={18} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
                    <p style={{
                      color: '#7F1D1D',
                      fontSize: 13,
                      margin: 0,
                      lineHeight: 1.5
                    }}>
                      {error}
                    </p>
                  </div>
                )}

                {/* Password Requirements */}
                <div style={{
                  background: '#FFFBEB',
                  border: '1px solid #FEF08A',
                  borderRadius: 8,
                  padding: 12
                }}>
                  <p style={{
                    color: '#92400E',
                    fontSize: 12,
                    margin: 0,
                    lineHeight: 1.5,
                    fontWeight: 500
                  }}>
                    ✓ Minimum 6 characters <br/>
                    ✓ Passwords must match
                  </p>
                </div>
              </div>
            </>
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
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 600,
                border: '1px solid #D1D5DB',
                background: '#FFFFFF',
                color: '#374151',
                borderRadius: 6,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: loading ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFFFFF';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              disabled={loading || !newPassword || !confirmPassword}
              style={{
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                background: loading || !newPassword || !confirmPassword ? '#9CA3AF' : 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
                color: '#FFFFFF',
                borderRadius: 6,
                cursor: loading || !newPassword || !confirmPassword ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: loading || !newPassword || !confirmPassword ? 0.8 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading && newPassword && confirmPassword) {
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(59, 130, 246, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
