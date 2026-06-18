 import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic,
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  Layout, 
  CheckSquare, 
  FileText, 
  Info, 
  UserPlus, 
  PhoneOff, 
  Clock, 
  Check, 
  Download, 
  Save, 
  Users 
} from 'lucide-react';
import './MeetingRoom.css';

const apiBaseUrl = window.location.origin.includes('localhost:5173')
  ? 'http://localhost:5000/api'
  : '/api';

function LobbyWaitingScreen({ message, details, showBackHome, onLeave }) {
  return (
    <div className="meet-lobby" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="lobby-card glass-card" style={{ maxWidth: '480px', textAlign: 'center', padding: '3rem' }}>
        <div className="pulsing-wave-avatar" style={{ margin: '0 auto 2rem' }}>
          <span></span>
          <span></span>
          <span></span>
          <div className="avatar-letter" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/Logo1.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
        <h2 className="lobby-title" style={{ fontSize: '1.75rem', marginBottom: '1rem', textAlign: 'center' }}>{message}</h2>
        <p className="lobby-subtitle" style={{ fontSize: '1.05rem', color: 'var(--text-light-muted)', marginBottom: '2rem', textAlign: 'center' }}>{details}</p>
        
        {showBackHome ? (
          <button onClick={() => onLeave(false)} className="btn btn-primary btn-full-width">
            Return to Website
          </button>
        ) : (
          <div className="audio-visualizer-bar active" style={{ margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
      </div>
    </div>
  );
}

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
  
  // Lobby guest & Host heartbeat states
  const [approvalState, setApprovalState] = useState('idle'); // 'idle' | 'checking_host' | 'waiting_host' | 'waiting_approval' | 'approved' | 'declined'
  const [guestId] = useState(() => 'gst-' + Math.random().toString(36).substring(2, 12));
  const [waitingGuests, setWaitingGuests] = useState([]);
  const [prevWaitingCount, setPrevWaitingCount] = useState(0);

  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  // Helper: Format Timer
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

  // Helper: Load Jitsi API script
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

  // Helper: Cleanup Jitsi instance & leave
  const handleLeave = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    onLeave(isHost);
  }, [isHost, onLeave]);

  // Helper: Join meeting room
  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter your name.');
      return;
    }

    if (isHost) {
      try {
        const res = await fetch(`${apiBaseUrl}/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passcode })
        });
        if (!res.ok) {
          const errData = await res.json();
          setPasscodeError(errData.error || 'Invalid passcode. Access Denied.');
          return;
        }
      } catch (err) {
        console.error(err);
        setPasscodeError('Error verifying passcode.');
        return;
      }

      setPasscodeError('');
      setInLobby(false);

      // Initialize Jitsi Call as Host
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
            displayName: `Advisor (Host)`,
            avatarURL: window.location.origin + '/Logo1.png'
          },
          configOverwrite: {
            startWithAudioMuted: !micActive,
            startWithVideoMuted: !cameraActive,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            toolbarButtons: []
          }
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);
        jitsiApiRef.current = api;

        api.addEventListener('videoConferenceLeft', () => {
          handleLeave();
        });
      }, 200);
    } else {
      // Guest checks host presence
      setApprovalState('checking_host');
    }
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
        name: bookingData ? bookingData.name : (isHost ? 'Advisor' : name)
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

  // Host heartbeat and waiting list polling
  useEffect(() => {
    if (inLobby || !isHost) return;

    // Heartbeat every 4 seconds
    const heartbeatInterval = setInterval(async () => {
      try {
        await fetch(`${apiBaseUrl}/bookings/${meetId}/host-heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        console.error('Host heartbeat failed:', err);
      }
    }, 4000);

    // Initial heartbeat
    fetch(`${apiBaseUrl}/bookings/${meetId}/host-heartbeat`, { method: 'POST' });

    // Poll waiting list status every 3 seconds
    const pollGuestsInterval = setInterval(async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/bookings/${meetId}/status`);
        if (res.ok) {
          const status = await res.json();
          setWaitingGuests(status.waitingGuests || []);
        }
      } catch (err) {
        console.error('Failed to fetch waiting guests:', err);
      }
    }, 3000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(pollGuestsInterval);
    };
  }, [inLobby, isHost, meetId]);

  // Auto-switch to Lobby tab for Host when someone knocks
  useEffect(() => {
    if (!isHost) return;
    const waitingCount = waitingGuests.filter(g => g.status === 'waiting').length;
    if (waitingCount > prevWaitingCount) {
      Promise.resolve().then(() => {
        setActiveTab('lobby');
      });
    }
    Promise.resolve().then(() => {
      setPrevWaitingCount(waitingCount);
    });
  }, [waitingGuests, isHost, prevWaitingCount]);

  // Guest checking host presence and knock status
  useEffect(() => {
    if (isHost || approvalState === 'idle' || approvalState === 'approved') return;

    let presenceInterval;
    let knockInterval;

    if (approvalState === 'checking_host' || approvalState === 'waiting_host') {
      presenceInterval = setInterval(async () => {
        try {
          const res = await fetch(`${apiBaseUrl}/bookings/${meetId}/status`);
          if (res.ok) {
            const data = await res.json();
            if (data.hostPresent) {
              clearInterval(presenceInterval);
              // Host is present, send knock request
              setApprovalState('waiting_approval');
              await fetch(`${apiBaseUrl}/bookings/${meetId}/knock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guestId, name })
              });
            } else {
              setApprovalState('waiting_host');
            }
          }
        } catch (err) {
          console.error('Failed to check host presence:', err);
        }
      }, 3000);
    }

    if (approvalState === 'waiting_approval') {
      knockInterval = setInterval(async () => {
        try {
          const res = await fetch(`${apiBaseUrl}/bookings/${meetId}/knock-status?guestId=${guestId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'approved') {
              clearInterval(knockInterval);
              setApprovalState('approved');
              setInLobby(false);
              
              // Load Jitsi Call
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
                    displayName: name,
                    avatarURL: window.location.origin + '/Logo1.png'
                  },
                  configOverwrite: {
                    startWithAudioMuted: !micActive,
                    startWithVideoMuted: !cameraActive,
                    prejoinPageEnabled: false,
                    disableDeepLinking: true,
                    toolbarButtons: []
                  }
                };
                const api = new window.JitsiMeetExternalAPI(domain, options);
                jitsiApiRef.current = api;
                api.addEventListener('videoConferenceLeft', () => handleLeave());
              }, 200);

            } else if (data.status === 'declined') {
              clearInterval(knockInterval);
              setApprovalState('declined');
            }
          }
        } catch (err) {
          console.error('Failed to check knock status:', err);
        }
      }, 3000);
    }

    return () => {
      if (presenceInterval) clearInterval(presenceInterval);
      if (knockInterval) clearInterval(knockInterval);
    };
  }, [approvalState, isHost, meetId, name, guestId, micActive, cameraActive, handleLeave]);


  // Guest Knock Lobby Screens
  if (!isHost && approvalState === 'checking_host') {
    return <LobbyWaitingScreen message="Connecting to Workspace..." details="Checking advisor status and verifying the meeting room..." onLeave={handleLeave} />;
  }

  if (!isHost && approvalState === 'waiting_host') {
    return <LobbyWaitingScreen message="Waiting for Host..." details="This meeting link is only active when the Host is present. Please wait." onLeave={handleLeave} />;
  }

  if (!isHost && approvalState === 'waiting_approval') {
    return <LobbyWaitingScreen message="Requesting Entry..." details="Waiting for the host to admit you to the secure session room..." onLeave={handleLeave} />;
  }

  if (!isHost && approvalState === 'declined') {
    return <LobbyWaitingScreen message="Access Denied" details="The Advisor has declined your request to join this session." showBackHome onLeave={handleLeave} />;
  }

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
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-light-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={16} />
              <span>Time: {formatTimer(secondsElapsed)}</span>
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
                      <div className="avatar-letter" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src="/Logo1.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    </div>
                    <span className="preview-feed-label">Camera is On</span>
                  </div>
                ) : (
                  <div className="preview-feed-off">
                    <div className="camera-off-icon">
                      <VideoOff size={32} color="var(--color-orange-brand)" />
                    </div>
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
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}
                >
                  {micActive ? <Mic size={16} /> : <MicOff size={16} />}
                  <span>{micActive ? 'Mic On' : 'Muted'}</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setCameraActive(p => !p)} 
                  className={`btn-lobby-control ${cameraActive ? 'active' : 'muted'}`}
                  title={cameraActive ? "Turn Camera Off" : "Turn Camera On"}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}
                >
                  {cameraActive ? <Video size={16} /> : <VideoOff size={16} />}
                  <span>{cameraActive ? 'Camera On' : 'Video Off'}</span>
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
                    onClick={() => { setIsHost(true); setName('Advisor'); }}
                    className={`role-btn ${isHost ? 'active' : ''}`}
                  >
                    Join as Advisor (Host)
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

                <button type="submit" className="btn btn-primary btn-full-width" style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>Join Live Video Call</span>
                  <Check size={18} />
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
                  {micActive ? <Mic size={20} /> : <MicOff size={20} />}
                </button>
                <button 
                  onClick={handleToggleCamera} 
                  className={`btn-meet-action ${cameraActive ? 'active' : 'muted'}`} 
                  title={cameraActive ? "Turn Off Camera" : "Turn On Camera"}
                >
                  {cameraActive ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
                <button 
                  onClick={handleToggleScreen} 
                  className={`btn-meet-action ${screenActive ? 'active-yellow' : ''}`} 
                  title={screenActive ? "Stop Sharing Screen" : "Share Screen"}
                >
                  <Monitor size={20} />
                </button>
                <button 
                  onClick={handleToggleSidebar} 
                  className={`btn-meet-action ${sidebarOpen ? 'active' : ''}`} 
                  title={sidebarOpen ? "Hide Strategy Workspace" : "Show Strategy Workspace"}
                >
                  <Layout size={20} />
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/?meet=${meetId}`);
                    alert('Client Invite Link Copied!');
                  }}
                  className="btn-meet-action" 
                  title="Copy Client Invite Link"
                >
                  <UserPlus size={20} />
                </button>
                <button 
                  onClick={handleLeave} 
                  className="btn-meet-action hangup" 
                  title="Leave Call"
                >
                  <PhoneOff size={20} style={{ transform: 'scaleX(-1)' }} />
                </button>
              </div>
              
              <div className="video-timer-group">
                <Clock size={14} className="icon-inline" style={{ marginRight: '0.3rem' }} />
                <span>{formatTimer(secondsElapsed)}</span>
              </div>
            </div>
          </section>

          {/* Right Panel: Interactive Consultation Workspace */}
          {sidebarOpen && (
            <aside className="workspace-sidebar">
              <div className="sidebar-tabs">
                {isHost && (
                  <button 
                    onClick={() => setActiveTab('lobby')}
                    className={`tab-btn ${activeTab === 'lobby' ? 'active' : ''}`}
                    style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Users size={16} />
                    <span>Lobby</span>
                    {waitingGuests.filter(g => g.status === 'waiting').length > 0 && (
                      <span className="badge-notification">
                        {waitingGuests.filter(g => g.status === 'waiting').length}
                      </span>
                    )}
                  </button>
                )}
                <button 
                  onClick={() => setActiveTab('roadmap')}
                  className={`tab-btn ${activeTab === 'roadmap' ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <CheckSquare size={16} />
                  <span>Roadmap</span>
                </button>
                <button 
                  onClick={() => setActiveTab('notes')}
                  className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <FileText size={16} />
                  <span>Notes</span>
                </button>
                <button 
                  onClick={() => setActiveTab('info')}
                  className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Info size={16} />
                  <span>Info</span>
                </button>
              </div>

              <div className="sidebar-content">
                
                {/* Tab: Lobby waiting guests list (Host only) */}
                {activeTab === 'lobby' && isHost && (
                  <div className="lobby-requests-container">
                    <h4 style={{ color: '#fff', fontSize: '0.85rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Lobby Waiting Room
                    </h4>
                    {waitingGuests.filter(g => g.status === 'waiting').length === 0 ? (
                      <p style={{ color: 'var(--text-light-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
                        No guests waiting to join.
                      </p>
                    ) : (
                      <div className="waiting-guests-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {waitingGuests.filter(g => g.status === 'waiting').map(guest => (
                          <div key={guest.id} className="guest-request-card" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--border-radius-sm)', padding: '1rem' }}>
                            <p style={{ fontWeight: 600, color: '#fff', marginBottom: '0.75rem' }}>{guest.name}</p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                onClick={async () => {
                                  await fetch(`${apiBaseUrl}/bookings/${meetId}/approve-guest`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ guestId: guest.id, action: 'approve' })
                                  });
                                  setWaitingGuests(prev => prev.map(g => g.id === guest.id ? { ...g, status: 'approved' } : g));
                                }}
                                className="btn btn-primary" 
                                style={{ flex: 1, padding: '0.5rem 0', fontSize: '0.8rem' }}
                              >
                                Admit
                              </button>
                              <button 
                                onClick={async () => {
                                  await fetch(`${apiBaseUrl}/bookings/${meetId}/approve-guest`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ guestId: guest.id, action: 'decline' })
                                  });
                                  setWaitingGuests(prev => prev.map(g => g.id === guest.id ? { ...g, status: 'declined' } : g));
                                }}
                                className="btn btn-secondary" 
                                style={{ flex: 1, padding: '0.5rem 0', fontSize: '0.8rem', color: 'var(--color-orange-brand)', borderColor: 'var(--color-orange-brand)' }}
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

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
                        <div className="roadmap-checkbox">
                          {roadmapProgress.offerAudit ? <Check size={12} strokeWidth={3} /> : null}
                        </div>
                        <div className="roadmap-text">
                          <h4>1. Offer & Authority Packaging</h4>
                          <p>Analyze margin structures, build high-ticket tiers, and formulate authority positioning statements.</p>
                        </div>
                      </div>

                      <div 
                        onClick={() => toggleRoadmapItem('trustFunnel')}
                        className={`roadmap-item ${roadmapProgress.trustFunnel ? 'completed' : ''}`}
                      >
                        <div className="roadmap-checkbox">
                          {roadmapProgress.trustFunnel ? <Check size={12} strokeWidth={3} /> : null}
                        </div>
                        <div className="roadmap-text">
                          <h4>2. Client Acquisition Trust Funnel</h4>
                          <p>Audit organic authority posts, client messaging sequences, and landing page conversions.</p>
                        </div>
                      </div>

                      <div 
                        onClick={() => toggleRoadmapItem('salesScripts')}
                        className={`roadmap-item ${roadmapProgress.salesScripts ? 'completed' : ''}`}
                      >
                        <div className="roadmap-checkbox">
                          {roadmapProgress.salesScripts ? <Check size={12} strokeWidth={3} /> : null}
                        </div>
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
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      >
                        <Save size={16} />
                        <span>{savingNotes ? 'Saving Notes...' : 'Save Notes to Database'}</span>
                      </button>
                      <button 
                        onClick={handleDownloadNotes}
                        className="btn btn-secondary btn-full-width"
                        style={{ border: '1.5px dashed rgba(255,255,255,0.15)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      >
                        <Download size={16} />
                        <span>Download Notes (.txt)</span>
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
