import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getDrivers } from '../services/userService';
import { subscribeToDriverReviews, addReview } from '../services/settingsService';
import { UserProfile, DriverReview } from '../types';
import { Search, Star, MessageSquare, X, Edit3, CheckCircle } from 'lucide-react';

export default function DriverReviewsPage() {
  const { profile } = useAuth();
  const [drivers, setDrivers] = useState<UserProfile[]>([]);
  const [reviews, setReviews] = useState<DriverReview[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Review Form States
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  useEffect(() => {
    loadDrivers();
    const unsub = subscribeToDriverReviews(setReviews);
    return unsub;
  }, []);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const list = await getDrivers();
      setDrivers(list.filter(d => d.status === 'approved'));
    } catch (e) {
      console.error('Error loading drivers:', e);
    } finally {
      setLoading(false);
    }
  };

  const getDriverStats = (driverId: string) => {
    const driverReviews = reviews.filter(r => r.driverId === driverId);
    if (driverReviews.length === 0) return { avg: '—', count: 0 };
    const avg = (driverReviews.reduce((sum, r) => sum + r.rating, 0) / driverReviews.length).toFixed(1);
    return { avg, count: driverReviews.length };
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver || !profile) return;
    if (!comment.trim()) {
      alert('Please enter a comment.');
      return;
    }

    setSubmitting(true);
    try {
      await addReview({
        driverId: selectedDriver.uid,
        driverName: selectedDriver.name || selectedDriver.displayName || 'Driver',
        rating,
        comment: comment.trim(),
        reviewerName: profile.name || profile.displayName || 'Supervisor',
        createdAt: Date.now()
      });

      setSuccessMsg(`Review submitted successfully for ${selectedDriver.name || selectedDriver.displayName}!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      
      // Reset form
      setRating(5);
      setComment('');
      setSelectedDriver(null);
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('Error submitting review.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = drivers.filter(d => {
    if (search) {
      const s = search.toLowerCase();
      return (
        (d.name?.toLowerCase().includes(s) || 
         d.email?.toLowerCase().includes(s) || 
         d.vehiclePlate?.toLowerCase().includes(s))
      );
    }
    return true;
  });

  // Get reviews written by this supervisor
  const myReviews = reviews.filter(r => r.reviewerName === (profile?.name || profile?.displayName || 'Supervisor'));

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Driver Ratings & Reviews</h2>
          <p>Assess driver performance, leave feedback, and view overall ratings</p>
        </div>
      </div>

      <div className="page-content">
        {successMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', background: 'var(--success)10', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--success)30', marginBottom: '20px', fontSize: '13px', fontWeight: 600 }}>
            <CheckCircle size={16} /> {successMsg}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Drivers List Card */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Approved Drivers</h3>
              <div className="search-box" style={{ width: '260px', margin: 0 }}>
                <Search size={16} />
                <input placeholder="Search drivers..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="spinner" />
                <p>Loading drivers...</p>
              </div>
            ) : filtered.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Driver</th>
                      <th>Vehicle</th>
                      <th>Avg Rating</th>
                      <th>Total Reviews</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(d => {
                      const { avg, count } = getDriverStats(d.uid);
                      return (
                        <tr key={d.uid}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary)20', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                                {d.name?.[0]?.toUpperCase() || 'D'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{d.name || d.displayName}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize: '13px' }}>{d.vehiclePlate || '—'} {d.vehicleType ? `(${d.vehicleType})` : ''}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 13 }}>
                              <Star size={14} fill={count > 0 ? '#ffb100' : 'none'} color={count > 0 ? '#ffb100' : 'var(--text-muted)'} />
                              <span>{avg}</span>
                            </div>
                          </td>
                          <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{count} reviews</td>
                          <td>
                            <button 
                              className="btn btn-primary btn-sm" 
                              onClick={() => setSelectedDriver(d)}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Edit3 size={12} /> Rate
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No drivers found.</div>
            )}
          </div>

          {/* Supervisor's Feedback History Card */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={16} style={{ color: 'var(--secondary)' }} /> Your Feedback History
            </h3>
            
            {myReviews.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
                {myReviews.slice(0, 10).map(r => (
                  <div key={r.id} style={{ background: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', fontWeight: 600 }}>
                      <span style={{ color: 'var(--text-primary)' }}>{r.driverName}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', color: '#ffb100', marginBottom: '6px' }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={12} fill={s <= r.rating ? '#ffb100' : 'none'} color="#ffb100" />
                      ))}
                    </div>
                    <p style={{ fontSize: '12px', margin: 0, fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      "{r.comment}"
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                You haven't submitted any reviews yet. Click 'Rate' next to a driver to submit your first evaluation.
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Write Review Modal */}
      {selectedDriver && (
        <div className="modal-overlay" onClick={() => setSelectedDriver(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3>Evaluate Driver Performance</h3>
              <button className="btn-ghost btn-icon" onClick={() => setSelectedDriver(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleReviewSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Please rate and comment on driver <strong>{selectedDriver.name || selectedDriver.displayName}</strong>.
                </p>

                {/* Star Selector */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Select Rating *</label>
                  <div style={{ display: 'flex', gap: '8px', color: '#ffb100' }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                      >
                        <Star 
                          size={28} 
                          fill={(hoverRating !== null ? s <= hoverRating : s <= rating) ? '#ffb100' : 'none'} 
                          color="#ffb100" 
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment Text Area */}
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label className="form-label">Review & Comments *</label>
                  <textarea 
                    className="form-textarea" 
                    required 
                    placeholder="Enter details on delivery safety, timeliness, communication, and overall professionalism..." 
                    value={comment} 
                    onChange={e => setComment(e.target.value)}
                    style={{ height: '120px' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedDriver(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
