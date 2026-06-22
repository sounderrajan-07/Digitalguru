import { useState, useEffect, useCallback } from 'react';
import { Calendar, BookOpen, Users, Zap, RefreshCw, ArrowLeft, Lock, Trash2 } from 'lucide-react';
import './AdminDashboard.css';

const apiBaseUrl = window.location.origin.includes('localhost:5173')
  ? 'http://localhost:5000/api'
  : '/api';

export default function AdminDashboard({ onStartMeeting, onBackToHome }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState('');
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [instantGuestName, setInstantGuestName] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [generatedMeetId, setGeneratedMeetId] = useState('');
  const [expandedNotesId, setExpandedNotesId] = useState(null);

  // Passcode change states
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [passcodeSuccess, setPasscodeSuccess] = useState('');
  const [passcodeErr, setPasscodeErr] = useState('');
  const [updatingPasscode, setUpdatingPasscode] = useState(false);

  // Verify PIN
  const handlePinSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiBaseUrl}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: pinCode })
      });
      if (res.ok) {
        setIsAuthenticated(true);
        setPinError('');
      } else {
        const errData = await res.json();
        setPinError(errData.error || 'Invalid Passcode. Access Denied.');
      }
    } catch (err) {
      console.error(err);
      setPinError('Server error verifying passcode.');
    }
  };

  // Change Passcode
  const handleChangePasscode = async (e) => {
    e.preventDefault();
    setUpdatingPasscode(true);
    setPasscodeSuccess('');
    setPasscodeErr('');
    try {
      const res = await fetch(`${apiBaseUrl}/auth/change-passcode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPasscode, newPasscode })
      });
      if (res.ok) {
        setPasscodeSuccess('Passcode updated successfully!');
        setCurrentPasscode('');
        setNewPasscode('');
      } else {
        const errData = await res.json();
        setPasscodeErr(errData.error || 'Failed to update passcode.');
      }
    } catch (err) {
      console.error(err);
      setPasscodeErr('Server connection error.');
    } finally {
      setUpdatingPasscode(false);
    }
  };

  // Fetch all bookings from admin endpoint
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/admin/bookings`);
      if (!res.ok) throw new Error('Failed to fetch bookings');
      const data = await res.json();
      setBookings(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    Promise.resolve().then(() => {
      fetchBookings();
    });

    // Poll logs every 10 seconds silently
    const interval = setInterval(() => {
      const fetchBookingsSilent = async () => {
        try {
          const res = await fetch(`${apiBaseUrl}/admin/bookings`);
          if (res.ok) {
            const data = await res.json();
            setBookings(data || []);
          }
        } catch (err) {
          console.error('Silent fetch failed:', err);
        }
      };
      fetchBookingsSilent();
    }, 10000);

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchBookings]);

  // Generate an instant meeting room ID and URL
  const handleGenerateInstantMeet = (e) => {
    e.preventDefault();
    const mockMeetId = 'inst-' + Math.random().toString(36).substring(2, 6) + '-' + 
                        Math.random().toString(36).substring(2, 6);
    
    const meetUrl = `${window.location.origin}/?meet=${mockMeetId}`;
    setGeneratedMeetId(mockMeetId);
    setGeneratedLink(meetUrl);
  };

  // Launch instant meeting as host
  const handleLaunchInstantMeet = () => {
    if (generatedMeetId) {
      onStartMeeting(generatedMeetId);
    }
  };

  // Delete a booking log
  const handleDeleteBooking = async (id) => {
    if (!window.confirm('Are you sure you want to delete this meeting log? This action cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch(`${apiBaseUrl}/admin/bookings/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setBookings(prev => prev.filter(b => b.id !== id));
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to delete meeting log.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to the server to delete.');
    }
  };

  // Helper stats
  const totalBookings = bookings.length;
  const instantMeets = bookings.filter(b => b.businessType === 'instant').length;
  const scheduledMeets = bookings.filter(b => b.businessType !== 'instant').length;
  const completedSessions = bookings.filter(b => b.notes && b.notes.trim().length > 0).length;

  // Render Lock Screen if not authorized
  if (!isAuthenticated) {
    return (
      <div className="admin-lock-screen">
        <div className="lock-card glass-card">
          <div className="lock-logo-container">
            <img src="/Logo1.webp" alt="Logo" className="lock-logo" />
            <div className="lock-badge">Secure Console</div>
          </div>
          <h2 className="lobby-title" style={{ marginTop: '1rem', textAlign: 'center' }}>Host Verification</h2>
          <p className="lobby-subtitle" style={{ marginBottom: '2rem', textAlign: 'center' }}>This section is protected for Host's meeting management console.</p>
          
          <form onSubmit={handlePinSubmit}>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label htmlFor="admin-pin">Enter your Passcode *</label>
              <input
                type="password"
                id="admin-pin"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="form-input lobby-input-dark"
                placeholder="Enter passcode"
                required
                autoFocus
              />
              {pinError && <p style={{ color: 'var(--color-orange-brand)', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 600 }}>{pinError}</p>}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={onBackToHome} className="btn btn-secondary" style={{ flex: 1, padding: '1rem 0' }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '1rem 0' }}>
                Verify Access
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        
        {/* Dashboard Header */}
        <header className="admin-header">
          <div className="admin-title-group">
            <h1>Host's Meeting Dashboard</h1>
            <p>Host instant 1-on-1 strategy sessions or view scheduled consultations.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={fetchBookings} className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>
            <button onClick={onBackToHome} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowLeft size={16} />
              <span>Back to Website</span>
            </button>
          </div>
        </header>

        {/* Analytics Statistics */}
        <section className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">
              <Calendar size={24} color="var(--color-blue-brand)" />
            </div>
            <div className="metric-info">
              <h3>{totalBookings}</h3>
              <p>Total Consultations</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">
              <BookOpen size={24} color="var(--color-blue-brand)" />
            </div>
            <div className="metric-info">
              <h3>{completedSessions}</h3>
              <p>Notes Completed</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">
              <Users size={24} color="var(--color-blue-brand)" />
            </div>
            <div className="metric-info">
              <h3>{scheduledMeets}</h3>
              <p>Website Bookings</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">
              <Zap size={24} color="var(--color-blue-brand)" />
            </div>
            <div className="metric-info">
              <h3>{instantMeets}</h3>
              <p>Instant Launches</p>
            </div>
          </div>
        </section>

        {/* Dashboard Main Grid */}
        <div className="dashboard-grid">
          
          {/* Left Column: Generate Instant Meet & Security Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <aside className="admin-card">
              <h2 className="admin-card-title">Host Instant Session</h2>
              <p style={{ color: 'var(--text-light-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Create a custom meeting room on the spot to invite standard leads, students, or guest partners immediately.
              </p>
              
              <form onSubmit={handleGenerateInstantMeet} className="instant-meet-form">
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="guest-name">Guest's Full Name (Optional)</label>
                  <input
                    type="text"
                    id="guest-name"
                    value={instantGuestName}
                    onChange={(e) => setInstantGuestName(e.target.value)}
                    className="form-input lobby-input-dark"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>
                
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Create Meeting Room
                </button>
              </form>

              {generatedLink && (
                <div className="generated-link-box">
                  <div className="generated-link-header">Invitation Link Generated</div>
                  <div className="link-input-group">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="admin-input-dark"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedLink);
                        alert('Invitation link copied!');
                      }}
                      className="copy-btn-mini"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="link-actions-group">
                    <button
                      onClick={handleLaunchInstantMeet}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem' }}
                    >
                      Start Call as Host
                    </button>
                    <a
                      href={`https://api.whatsapp.com/send?text=Hi! Please click this link to join our 1-on-1 strategy meeting: ${generatedLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', color: '#25D366', borderColor: '#25D366', textAlign: 'center' }}
                    >
                      Share WhatsApp
                    </a>
                  </div>
                </div>
              )}
            </aside>

            <aside className="admin-card">
              <h2 className="admin-card-title">Security Settings</h2>
              <p style={{ color: 'var(--text-light-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Change the host console passcode. Make sure to keep this code secure.
              </p>
              
              <form onSubmit={handleChangePasscode} className="instant-meet-form">
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="curr-pass">Current Passcode *</label>
                  <input
                    type="password"
                    id="curr-pass"
                    value={currentPasscode}
                    onChange={(e) => setCurrentPasscode(e.target.value)}
                    className="form-input lobby-input-dark"
                    placeholder="Enter current PIN"
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="new-pass">New Passcode *</label>
                  <input
                    type="password"
                    id="new-pass"
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value)}
                    className="form-input lobby-input-dark"
                    placeholder="Enter new PIN"
                    required
                  />
                </div>
                 {passcodeSuccess && <p style={{ color: 'var(--color-blue-brand)', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}>{passcodeSuccess}</p>}
                 {passcodeErr && <p style={{ color: 'var(--color-orange-brand)', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}>{passcodeErr}</p>}
                
                <button type="submit" disabled={updatingPasscode} className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Lock size={16} />
                  <span>{updatingPasscode ? 'Saving...' : 'Update Passcode'}</span>
                </button>
              </form>
            </aside>
          </div>

          {/* Right Column: Bookings Console */}
          <main className="admin-card">
            <h2 className="admin-card-title">Meeting & Consultation Logs</h2>
            
            {loading ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light-muted)' }}>Loading bookings...</p>
            ) : bookings.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light-muted)' }}>No bookings found in the database.</p>
            ) : (
              <div className="bookings-list">
                {bookings.map((booking) => {
                  const hasNotes = booking.notes && booking.notes.trim().length > 0;
                  const isExpanded = expandedNotesId === booking.id;
                  
                  // Calculate roadmap percentage
                  const roadmapProgress = booking.roadmapProgress || {};
                  const completedSteps = Object.values(roadmapProgress).filter(Boolean).length;
                  const progressPct = Math.round((completedSteps / 3) * 100);

                  return (
                    <div key={booking.id} className={`booking-item-card type-${booking.businessType}`}>
                      
                      {/* Booking Item Header */}
                      <header className="booking-item-header">
                        <div className="client-profile">
                          <h3>{booking.name}</h3>
                          <div className="client-meta">
                            <span className={`business-tag business-tag-${booking.businessType}`}>{booking.businessType}</span>
                            <span>{booking.phone}</span>
                            <span>|</span>
                            <span>{booking.email}</span>
                          </div>
                        </div>
                        <div className="booking-schedule">
                          <div className="schedule-date">{booking.date}</div>
                          <div className="schedule-time">{booking.time}</div>
                        </div>
                      </header>

                      {/* Details & Obstacles */}
                      <div className="booking-details-body">
                        <div className="obstacle-box">
                          <strong>Scaling Bottleneck:</strong>
                          {booking.goal}
                        </div>

                        {/* Roadmap Progress Bar */}
                        {booking.businessType !== 'instant' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="progress-bar-bg" style={{ flex: 1, height: '6px' }}>
                              <div className="progress-bar-fill" style={{ width: `${progressPct}%`, height: '100%' }}></div>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light-muted)' }}>
                              Roadmap: {progressPct}%
                            </span>
                          </div>
                        )}

                        {/* Inline Notes Box (if notes exist) */}
                        {hasNotes && isExpanded && (
                          <div className="inline-notes-viewer">
                            <header>
                              <span>CONSULTATION NOTES RECORDED</span>
                              <button 
                                onClick={() => setExpandedNotesId(null)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--color-orange-brand)', cursor: 'pointer', fontWeight: 'bold' }}
                              >
                                Hide Notes
                              </button>
                            </header>
                            <div className="inline-notes-content">{booking.notes}</div>
                          </div>
                        )}

                        {/* Booking Item Footer Actions */}
                        <div className="booking-actions">
                          <button
                            onClick={() => handleDeleteBooking(booking.id)}
                            className="btn btn-danger action-btn-sm"
                            style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                          {hasNotes && !isExpanded && (
                            <button
                              onClick={() => setExpandedNotesId(booking.id)}
                              className="btn btn-secondary action-btn-sm"
                              style={{ color: 'var(--color-orange-brand)', borderColor: 'var(--color-orange-brand)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              <BookOpen size={14} />
                              <span>View Saved Notes</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/?meet=${booking.id}`);
                              alert('Client invite link copied!');
                            }}
                            className="btn btn-secondary action-btn-sm"
                          >
                            Copy Client Link
                          </button>
                          <button
                            onClick={() => onStartMeeting(booking.id)}
                            className="btn btn-primary action-btn-sm"
                          >
                            Start Strategic Call
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </main>
          
        </div>
      </div>
    </div>
  );
}
