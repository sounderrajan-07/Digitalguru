import React, { useState, useEffect } from 'react';
import { Check, Lock, Mail, Clock, ArrowRight, Shield, Video, HelpCircle } from 'lucide-react';
import MeetingRoom from './components/MeetingRoom';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [scrolled, setScrolled] = useState(false);
  const [menuActive, setMenuActive] = useState(false);
  const [currentMeetId, setCurrentMeetId] = useState(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [inputMeetId, setInputMeetId] = useState('');

  // Sticky Navbar Scroll Listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setMenuActive(!menuActive);
  };

  const closeMobileMenu = () => {
    setMenuActive(false);
  };

  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const meet = params.get('meet');
      const admin = params.get('admin');

      setCurrentMeetId(meet);
      setIsAdminView(admin === 'true');
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const navigateToHome = () => {
    window.history.pushState({}, '', window.location.origin + window.location.pathname);
    setCurrentMeetId(null);
    setIsAdminView(false);
  };

  const navigateToAdmin = () => {
    window.history.pushState({}, '', '?admin=true');
    setCurrentMeetId(null);
    setIsAdminView(true);
  };

  const navigateToMeet = (meetId) => {
    window.history.pushState({}, '', `?meet=${meetId}`);
    setCurrentMeetId(meetId);
    setIsAdminView(false);
  };

  const extractMeetId = (input) => {
    if (!input) return '';
    try {
      if (input.includes('?')) {
        const params = new URLSearchParams(input.split('?')[1]);
        return params.get('meet') || input;
      }
      if (input.includes('/')) {
        const parts = input.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart.includes('?')) {
          return extractMeetId(lastPart);
        }
        return lastPart;
      }
    } catch (e) {
      // Ignore error
    }
    return input.trim();
  };

  const handleJoinSession = (e) => {
    e.preventDefault();
    const meetId = extractMeetId(inputMeetId);
    if (meetId) {
      navigateToMeet(meetId);
    } else {
      alert('Please enter a valid Meeting Link or Code.');
    }
  };

  if (currentMeetId) {
    return (
      <MeetingRoom 
        meetId={currentMeetId} 
        onLeave={(wasHost) => {
          if (wasHost) {
            navigateToAdmin();
          } else {
            navigateToHome();
          }
        }} 
      />
    );
  }

  if (isAdminView) {
    return <AdminDashboard onStartMeeting={navigateToMeet} onBackToHome={navigateToHome} />;
  }

  return (
    <>
      {/* Sticky Navbar */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <a href="#" className="nav-logo" onClick={closeMobileMenu}>
            <img src="/Logo1.png" alt="Logo" />
          </a>
          <ul className={`nav-menu ${menuActive ? 'active' : ''}`}>
            <li><a href="#about" className="nav-link" onClick={closeMobileMenu}>About Us</a></li>
            <li><a href="#join-session" className="nav-link" onClick={closeMobileMenu}>Join Session</a></li>
            <li><a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); navigateToAdmin(); closeMobileMenu(); }}>Host Console</a></li>
          </ul>
          <div className="nav-actions">
            <a href="#join-session" className="btn btn-primary nav-btn-join">Join Live Meeting</a>
          </div>
          <button className={`menu-toggle ${menuActive ? 'active' : ''}`} onClick={toggleMobileMenu} aria-label="Toggle Navigation Menu">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Hero / Join Call Portal Section */}
      <main id="join-session" className="portal-hero">
        <div className="container">
          <div className="portal-join-layout">
            <section className="join-session-container">
              <div className="join-card glass-card floating-effect">
                <div className="join-card-header">
                  <div className="video-icon-wrapper">
                    <Video size={24} color="var(--color-blue-brand)" />
                  </div>
                  <h3>Join Your Session</h3>
                </div>
                
                <p className="join-card-hint">
                  Enter the unique Meeting Code or click the link shared by your advisor to enter the secure room.
                </p>

                <form onSubmit={handleJoinSession} className="join-form">
                  <div className="form-group">
                    <label htmlFor="meet-code-input">Meeting Link or Code *</label>
                    <input
                      type="text"
                      id="meet-code-input"
                      value={inputMeetId}
                      onChange={(e) => setInputMeetId(e.target.value)}
                      className="form-input portal-input"
                      placeholder="e.g. inst-xxxx-xxxx or full URL"
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-full-width">
                    Join Secure Session
                    <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
                  </button>
                </form>

                <div className="join-security-notice">
                  <Shield size={14} style={{ color: 'var(--color-blue-brand)' }} />
                  <span>End-to-end encrypted video workspace</span>
                </div>
              </div>
              <div className="portal-visual-glow"></div>
            </section>
          </div>
        </div>
      </main>

      {/* About Us Section */}
      <section id="about" className="about-us-section">
        <div className="container">
          <div className="about-us-grid">
            <section className="company-info-section">
              <div className="premium-badge">
                <span className="badge-pulse"></span> Virtual Advisory Workspace
              </div>
              <h2 className="company-title">
                Strategic Consulting & <span className="text-glow">Growth Advising</span>
              </h2>
              <p className="company-description">
                We partner with high-growth businesses and premium service providers to engineer client acquisition infrastructure, optimize service delivery, and streamline operations. 
              </p>
              
              <div className="feature-bullets">
                <div className="feature-bullet-item">
                  <div className="bullet-icon-check">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <span><strong>Expert Consultation:</strong> 1-on-1 private deep dives with certified advisors.</span>
                </div>
                <div className="feature-bullet-item">
                  <div className="bullet-icon-check">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <span><strong>Live Workspace:</strong> High-performance virtual meeting environment with interactive roadmap tracking.</span>
                </div>
                <div className="feature-bullet-item">
                  <div className="bullet-icon-check">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <span><strong>Tailored Strategy:</strong> Custom growth blueprints designed around your specific bottlenecks.</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <a href="#" className="footer-logo">
                <img src="/Logo1.png" alt="Logo" />
              </a>
              <p className="footer-desc">
                Engineering premium client acquisition frameworks and scaling operations for B2B brands.
              </p>
            </div>
            
            <div>
              <h4 className="footer-links-title">Quick Links</h4>
              <ul className="footer-links">
                <li><a href="#about" className="footer-link">About Us</a></li>
                <li><a href="#join-session" className="footer-link">Join Session</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateToAdmin(); }} className="footer-link">Host Console</a></li>
              </ul>
            </div>

            <div>
              <h4 className="footer-links-title">Get In Touch</h4>
              <div className="footer-contact-item">
                <Mail size={16} style={{ color: 'var(--color-yellow-accent)' }} />
                <span>support@digitalguru.academy</span>
              </div>
              <div className="footer-contact-item">
                <Clock size={16} style={{ color: 'var(--color-yellow-accent)' }} />
                <span>Mon - Sat: 10:00 AM - 7:00 PM IST</span>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2026. All Rights Reserved. Designed for professional results.</p>
            <div className="footer-socials">
              <a href="#" className="social-icon" aria-label="Facebook">FB</a>
              <a href="#" className="social-icon" aria-label="Twitter">TW</a>
              <a href="#" className="social-icon" aria-label="LinkedIn">LI</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
