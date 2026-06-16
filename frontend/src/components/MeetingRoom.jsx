import React, { useState, useEffect, useRef } from 'react';
import './MeetingRoom.css';

export default function MeetingRoom({ meetId, onLeave }) {
  const [inLobby, setInLobby] = useState(true);
  const [name, setName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [activeTab, setActiveTab] = useState('roadmap');
  
  const [bookingData, setBookingData] = useState(null);
  const [notes, setNotes] = useState('');
  const [roadmapProgress, setRoadmapProgress] = useState({
    offerAudit: false,
    trustFunnel: false,
    salesScripts: false
  });

  const [savingNotes, setSavingNotes] = useState(false);
  const [jitsiLoaded, setJitsiLoaded] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Redesign state hooks for mic, camera, screen-share, and sidebar
  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);
  const [screenActive, setScreenActive] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  const apiBaseUrl = window.location.origin.includes('localhost:5173')
    ? 'http://localhost:5000/api'
    : '/api';

  // Timer Effect
  useEffect(() => {
    if (inLobby) return;
    const interval = setInterval(() => {
      setSecondsElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [inLobby]);

  // Load meeting/booking data from server
  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/admin/bookings`);
        if (!res.ok) throw new Error('Failed to fetch bookings');
        const bookings = await res.json();
        const found = bookings.find(b => b.id === meetId);
        if (found) {
          setBookingData(found);
          setNotes(found.notes || '');
          if (found.roadmapProgress) {
            setRoadmapProgress(found.roadmapProgress);
          }
        }
      } catch (err) {
        console.error('Error loading booking data:', err);
      }
    };
    fetchBookingDetails();
  }, [meetId]);

  // Format Timer
  const formatTimer = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs > 0 ? String(hrs).padStart(2, '0') : null,
      String(mins).padStart(2, '0'),
      String(secs).padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  // Load Jitsi API script
  const loadJitsiScript = () => {
    return new Promise((resolve) => {
      if (window.JitsiMeetExternalAPI) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => resolve(true);
      document.body.appendChild(script);
    });
  };

  // Join meeting room
  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter your name.');
      return;
    }

    if (isHost && passcode !== '1234' && passcode.toLowerCase() !== 'guru123') {
      setPasscodeError('Invalid passcode. Use the host verification code.');
      return;
    }

    setPasscodeError('');
    setInLobby(false);

    // Initialize Jitsi Call
    await loadJitsiScript();
    setJitsiLoaded(true);

    setTimeout(() => {
      if (!jitsiContainerRef.current) return;
      
      const domain = 'meet.jit.si';
      const options = {
        roomName: `DigitalGuru-1on1-${meetId}`,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName: isHost ? `Sir (Host)` : name
        },
        configOverwrite: {
          startWithAudioMuted: !micActive,
          startWithVideoMuted: !cameraActive,
          prejoinPageEnabled: false, // Bypass Jitsi prejoin since we have custom lobby
          disableDeepLinking: true, // Avoid app redirect popups
          toolbarButtons: [] // Hides Jitsi's default bottom toolbar completely
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'info', 'chat',
            'recording', 'livestreaming', 'etherpad', 'sharedvideo', 'settings',
            'raisehand', 'videoquality', 'filmstrip', 'invite', 'feedback',
            'stats', 'shortcuts', 'tileview', 'select-background',
            'mute-everyone', 'mute-video-everyone'
          ]
        }
      };

      const api = new window.JitsiMeetExternalAPI(domain, options);
      jitsiApiRef.current = api;

      // Handle call hangup
      api.addEventListener('videoConferenceLeft', () => {
        handleLeave();
      });
    }, 200);
  };

  // Cleanup Jitsi instance
  const handleLeave = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    onLeave();
  };

  // State toggle helpers for live Jitsi call
  const handleToggleMic = () => {
    setMicActive(prev => {
      const next = !prev;
      if (jitsiApiRef.current) {
        jitsiApiRef.current.executeCommand('toggleAudio');
      }
      return next;
    });
  };

  const handleToggleCamera = () => {
    setCameraActive(prev => {
      const next = !prev;
      if (jitsiApiRef.current) {
        jitsiApiRef.current.executeCommand('toggleVideo');
      }
      return next;
    });
  };

  const handleToggleScreen = () => {
    setScreenActive(prev => {
      const next = !prev;
      if (jitsiApiRef.current) {
        jitsiApiRef.current.executeCommand('toggleShareScreen');
      }
      return next;
    });
  };

  const handleToggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  // Save notes and checklist status
  const handleSaveData = async (updatedNotes, updatedRoadmap) => {
    setSavingNotes(true);
    try {
      const payload = {
        notes: updatedNotes !== undefined ? updatedNotes : notes,
        roadmapProgress: updatedRoadmap !== undefined ? updatedRoadmap : roadmapProgress,
        name: bookingData ? bookingData.name : (isHost ? 'Sir' : name)
      };

      const res = await fetch(`${apiBaseUrl}/bookings/${meetId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save details');
      const data = await res.json();
      setBookingData(data);
      if (updatedNotes !== undefined) setNotes(data.notes || '');
      if (updatedRoadmap !== undefined) setRoadmapProgress(data.roadmapProgress || {});
    } catch (err) {
      console.error(err);
      alert('Could not save notes. Please try again.');
    } finally {
      setSavingNotes(false);
    }
  };

  // Toggle Roadmap checklist item
  const toggleRoadmapItem = (key) => {
    const newRoadmap = {
      ...roadmapProgress,
      [key]: !roadmapProgress[key]
    };
    setRoadmapProgress(newRoadmap);
    handleSaveData(undefined, newRoadmap);
  };

  // Calculate Roadmap Progress Percent
  const completedRoadmapCount = Object.values(roadmapProgress).filter(Boolean).length;
  const progressPercent = Math.round((completedRoadmapCount / 3) * 100);

  // Download notes as text file
  const handleDownloadNotes = () => {
    const element = document.createElement("a");
    const headerInfo = `Strategic Session Notes\n` + 
                       `==================================\n` + 
                       `Date: ${new Date().toLocaleDateString()}\n` + 
                       `Client: ${bookingData?.name || 'Guest'}\n` +
                       `Meeting ID: ${meetId}\n\n` + 
                       `ROADMAP STAGES COMPLETED:\n` +
                       `- Offer Packaging Audit: ${roadmapProgress.offerAudit ? 'COMPLETED' : 'PENDING'}\n` +
                       `- Client Acquisition Trust Funnel: ${roadmapProgress.trustFunnel ? 'COMPLETED' : 'PENDING'}\n` +
                       `- Sales Conversation Scripts: ${roadmapProgress.salesScripts ? 'COMPLETED' : 'PENDING'}\n\n` +
                       `MEETING NOTES:\n` + 
                       `${notes}`;

    const file = new Blob([headerInfo], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `Consultation_Notes_${bookingData?.name || 'Guest'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="meet-page">
      {/* Header */}
      <header className="meet-header">
        <div className="meet-logo">
          <img src="/Logo1.png" alt="Logo" />
          <span className="meet-logo-text">Session Workspace</span>
        </div>
        {!inLobby && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-light-muted)' }}>
              ⏱ Time: {formatTimer(secondsElapsed)}
            </span>
            <div className="meet-status-badge">
              <span className="status-dot"></span>
              Live: Secure 1-on-1 Call
            </div>
          </div>
        )}
      </header>

      {/* Lobby State */}
      {inLobby ? (
        <div className="meet-lobby">
          <div className="lobby-layout-grid">
            
            {/* Left: Camera Preview Simulator */}
            <div className="lobby-preview-box">
              <div className="preview-video-container">
                {cameraActive ? (
                  <div className="preview-feed-sim">
                    <div className="pulsing-wave-avatar">
                      <span></span>
                      <span></span>
                      <span></span>
                      <div className="avatar-letter">{isHost ? 'S' : (name ? name.charAt(0).toUpperCase() : 'G')}</div>
                    </div>
                    <span className="preview-feed-label">Camera is On</span>
                  </div>
                ) : (
                  <div className="preview-feed-off">
                    <div className="camera-off-icon">📷❌</div>
                    <span className="preview-feed-label">Camera is Off</span>
                  </div>
                )}
                
                {/* Audio Level Visualizer bar */}
                <div className={`audio-visualizer-bar ${micActive ? 'active' : ''}`}>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              
              <div className="preview-controls-row">
                <button 
                  type="button" 
                  onClick={() => setMicActive(p => !p)} 
                  className={`btn-lobby-control ${micActive ? 'active' : 'muted'}`}
                  title={micActive ? "Mute Microphone" : "Unmute Microphone"}
                >
                  {micActive ? '🎙️ Mic On' : '🎙️❌ Muted'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setCameraActive(p => !p)} 
                  className={`btn-lobby-control ${cameraActive ? 'active' : 'muted'}`}
                  title={cameraActive ? "Turn Camera Off" : "Turn Camera On"}
                >
                  {cameraActive ? '📷 Camera On' : '📷❌ Video Off'}
                </button>
              </div>
            </div>

            {/* Right: Check-in Form */}
            <div className="lobby-card glass-card">
              <h2 className="lobby-title">Session Lobby</h2>
              <p className="lobby-subtitle">Verify your details and configure audio/video before joining the live session.</p>
              
              <form onSubmit={handleJoin} className="lobby-form">
                <div className="lobby-role-select">
                  <button
                    type="button"
                    onClick={() => { setIsHost(false); setName(''); }}
                    className={`role-btn ${!isHost ? 'active' : ''}`}
                  >
                    Join as Client
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsHost(true); setName('Sir'); }}
                    className={`role-btn ${isHost ? 'active' : ''}`}
                  >
                    Join as Host (Sir)
                  </button>
                </div>

                <div className="form-group">
                  <label htmlFor="user-name">Your Display Name *</label>
                  <input
                    type="text"
                    id="user-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input lobby-input-dark"
                    placeholder="e.g. Rajesh Kumar"
                    required
                  />
                </div>

                {isHost && (
                  <div className="form-group">
                    <label htmlFor="host-passcode">Enter Host Passcode *</label>
                    <input
                      type="password"
                      id="host-passcode"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      className="form-input lobby-input-dark"
                      placeholder="Enter host PIN"
                      required
                    />
                    {passcodeError && <p style={{ color: '#ff4e26', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 600 }}>{passcodeError}</p>}
                  </div>
                )}

                <button type="submit" className="btn btn-primary btn-full-width" style={{ marginTop: '1.5rem' }}>
                  Join Live Video Call
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
              </form>
            </div>
            
          </div>
        </div>
      ) : (
        /* Joined Meet Room Workspace */
        <div className={`meet-container ${sidebarOpen ? 'sidebar-active' : 'sidebar-hidden'}`}>
          
          {/* Left Panel: Jitsi Video Frame & Action Controls */}
          <section className="video-section">
            <div className="iframe-container" id="jitsi-iframe-container" ref={jitsiContainerRef}>
              {!jitsiLoaded && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: 'var(--text-light-muted)' }}>
                  Loading video workspace...
                </div>
              )}
            </div>
            
            {/* Premium Floating Video Control Bar */}
            <div className="video-controls-bar">
              <div className="video-info-group">
                <span className="secure-dot"></span>
                <span className="client-display-name">Client: {bookingData?.name || 'Connecting...'}</span>
              </div>
              
              <div className="video-action-buttons">
                <button 
                  onClick={handleToggleMic} 
                  className={`btn-meet-action ${micActive ? 'active' : 'muted'}`} 
                  title={micActive ? "Mute Microphone" : "Unmute Microphone"}
                >
                  {micActive ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="1" y1="1" x2="23" y2="23"/>
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  )}
                </button>
                <button 
                  onClick={handleToggleCamera} 
                  className={`btn-meet-action ${cameraActive ? 'active' : 'muted'}`} 
                  title={cameraActive ? "Turn Off Camera" : "Turn On Camera"}
                >
                  {cameraActive ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7"/>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10l-2.66-1.9"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
                <button 
                  onClick={handleToggleScreen} 
                  className={`btn-meet-action ${screenActive ? 'active-yellow' : ''}`} 
                  title={screenActive ? "Stop Sharing Screen" : "Share Screen"}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                </button>
                <button 
                  onClick={handleToggleSidebar} 
                  className={`btn-meet-action ${sidebarOpen ? 'active' : ''}`} 
                  title={sidebarOpen ? "Hide Strategy Workspace" : "Show Strategy Workspace"}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                  </svg>
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/?meet=${meetId}`);
                    alert('Client Invite Link Copied!');
                  }}
                  className="btn-meet-action" 
                  title="Copy Client Invite Link"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                </button>
                <button 
                  onClick={handleLeave} 
                  className="btn-meet-action hangup" 
                  title="Leave Call"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(135deg)' }}>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </button>
              </div>
              
              <div className="video-timer-group">
                ⏱ {formatTimer(secondsElapsed)}
              </div>
            </div>
          </section>

          {/* Right Panel: Interactive Consultation Workspace */}
          {sidebarOpen && (
            <aside className="workspace-sidebar">
              <div className="sidebar-tabs">
                <button 
                  onClick={() => setActiveTab('roadmap')}
                  className={`tab-btn ${activeTab === 'roadmap' ? 'active' : ''}`}
                >
                  📋 Roadmap
                </button>
                <button 
                  onClick={() => setActiveTab('notes')}
                  className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
                >
                  📝 Notes
                </button>
                <button 
                  onClick={() => setActiveTab('info')}
                  className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                >
                  💬 Info
                </button>
              </div>

              <div className="sidebar-content">
                
                {/* Tab 1: Strategic Checklist */}
                {activeTab === 'roadmap' && (
                  <div className="roadmap-container">
                    <div className="progress-tracker">
                      <div className="progress-header">
                        <span>ROADMAP PROGRESS</span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                      </div>
                    </div>

                    <div className="roadmap-list">
                      <div 
                        onClick={() => toggleRoadmapItem('offerAudit')}
                        className={`roadmap-item ${roadmapProgress.offerAudit ? 'completed' : ''}`}
                      >
                        <div className="roadmap-checkbox">✓</div>
                        <div className="roadmap-text">
                          <h4>1. Offer & Authority Packaging</h4>
                          <p>Analyze margin structures, build high-ticket tiers, and formulate authority positioning statements.</p>
                        </div>
                      </div>

                      <div 
                        onClick={() => toggleRoadmapItem('trustFunnel')}
                        className={`roadmap-item ${roadmapProgress.trustFunnel ? 'completed' : ''}`}
                      >
                        <div className="roadmap-checkbox">✓</div>
                        <div className="roadmap-text">
                          <h4>2. Client Acquisition Trust Funnel</h4>
                          <p>Audit organic authority posts, client messaging sequences, and landing page conversions.</p>
                        </div>
                      </div>

                      <div 
                        onClick={() => toggleRoadmapItem('salesScripts')}
                        className={`roadmap-item ${roadmapProgress.salesScripts ? 'completed' : ''}`}
                      >
                        <div className="roadmap-checkbox">✓</div>
                        <div className="roadmap-text">
                          <h4>3. Conversational Sales Closing</h4>
                          <p>Review objections handling playbook, structure high-ticket sales script, and establish call rules.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Session Notes */}
                {activeTab === 'notes' && (
                  <div className="notes-container">
                    <h4 style={{ color: '#fff', fontSize: '0.85rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Consultation Workspace Draft
                    </h4>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Document client revenue details, bottlenecks, goals, and customized session takeaways here..."
                      className="notes-textarea"
                    ></textarea>

                    <div className="notes-actions">
                      <button 
                        onClick={() => handleSaveData(notes, undefined)}
                        disabled={savingNotes}
                        className="btn btn-primary btn-full-width"
                      >
                        {savingNotes ? 'Saving Notes...' : '💾 Save Notes to Database'}
                      </button>
                      <button 
                        onClick={handleDownloadNotes}
                        className="btn btn-secondary btn-full-width"
                        style={{ border: '1.5px dashed rgba(255,255,255,0.15)', color: '#fff' }}
                      >
                        📥 Download Notes (.txt)
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab 3: Meeting Info */}
                {activeTab === 'info' && (
                  <div className="info-container">
                    <div className="info-card">
                      <h4>Session Guest Profile</h4>
                      <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}><strong>Name:</strong> {bookingData?.name || 'N/A'}</p>
                      <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}><strong>Email:</strong> {bookingData?.email || 'N/A'}</p>
                      <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}><strong>Phone:</strong> {bookingData?.phone || 'N/A'}</p>
                      <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}><strong>Business Type:</strong> {bookingData?.businessType || 'N/A'}</p>
                      <p style={{ fontSize: '0.85rem', lineHeight: '1.4' }}><strong>Scaling Obstacle:</strong> {bookingData?.goal || 'N/A'}</p>
                    </div>

                    <div className="info-card">
                      <h4>Invitation Details</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-light-muted)', lineHeight: 1.4 }}>Share this workspace link with your client to join:</p>
                      <div className="info-link-wrapper">
                        <div className="info-input">
                          {`${window.location.origin}/?meet=${meetId}`}
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/?meet=${meetId}`);
                            alert('Meeting link copied to clipboard!');
                          }}
                          className="copy-btn-mini"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={handleLeave}
                      className="btn btn-secondary"
                      style={{ border: '2px solid var(--color-orange-brand)', color: 'var(--color-orange-brand)', marginTop: 'auto', padding: '0.75rem' }}
                    >
                      Exit Workspace
                    </button>
                  </div>
                )}

              </div>
            </aside>
          )}

        </div>
      )}
    </div>
  );
}
