import React, { useState, useEffect } from 'react';
import { Check, Lock, Mail, Clock, ArrowRight, Shield, Video, HelpCircle, Phone, Award, CheckCircle, GraduationCap, Briefcase,MapPin } from 'lucide-react';
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

      {/* About Us Section */}
      <section id="about" className="about-us-section">
        <div className="container">
          <div className="about-us-grid">
            <section className="company-info-section">
              <div className="premium-badge">
                <span className="badge-pulse"></span> About Jai Ghurudeva Academy
              </div>
              <h2 className="company-title">
                Empowering Careers with <span className="text-glow">Jai Ghurudeva Academy</span>
              </h2>
              <p className="company-description">
                Started in 2018, Jai Ghurudeva Academy was founded with a singular vision: to bridge the gap between traditional education and the rapidly evolving demands of the digital economy.
              </p>
              <p className="company-description" style={{ marginTop: '-1.5rem' }}>
                We recognized early on that tools change, but fundamental marketing psychology and strategic thinking remain constant. Today, we infuse every lesson with AI to make our students 10x more productive.
              </p>
              
              <blockquote className="about-quote">
                "We don't just teach tools; we cultivate the mindset of a digital artisan."
              </blockquote>

              <div className="about-trust-card glass-card">
                <div className="trust-card-header">
                  <Award className="trust-icon" size={20} color="var(--color-blue-brand)" />
                  <h4>Jai Ghurudeva Academy</h4>
                </div>
                <p className="trust-card-text">
                  Digital Guru is owned and operated by Jai Ghurudeva Academy. We partner with top brands and marketing heads to ensure our curriculum meets the highest quality standards globally.
                </p>
                <div className="trust-badge">
                  <CheckCircle className="badge-icon" size={16} />
                  <span>Registered Educational Trust</span>
                </div>
              </div>
            </section>

            <section className="pedagogy-section">
              <h3 className="pedagogy-title">Foundations of Our Pedagogy</h3>
              
              <div className="feature-bullets">
                <div className="feature-bullet-item">
                  <div className="bullet-icon-check pedagogy-icon-wrapper">
                    <Award size={16} strokeWidth={2.5} />
                  </div>
                  <div className="pedagogy-text-content">
                    <span className="pedagogy-item-title">Excellence</span>
                    <p className="pedagogy-item-desc">We uphold the highest standards of academic rigor, ensuring every lesson is both relevant and masterly.</p>
                  </div>
                </div>
                <div className="feature-bullet-item">
                  <div className="bullet-icon-check pedagogy-icon-wrapper">
                    <GraduationCap size={16} strokeWidth={2.5} />
                  </div>
                  <div className="pedagogy-text-content">
                    <span className="pedagogy-item-title">Student First</span>
                    <p className="pedagogy-item-desc">Our mentors prioritize individual growth, adapting their methods to each student's unique learning curve.</p>
                  </div>
                </div>
                <div className="feature-bullet-item">
                  <div className="bullet-icon-check pedagogy-icon-wrapper">
                    <Briefcase size={16} strokeWidth={2.5} />
                  </div>
                  <div className="pedagogy-text-content">
                    <span className="pedagogy-item-title">Real-World Focus</span>
                    <p className="pedagogy-item-desc">Education that translates directly into professional impact, driven by live briefs, case studies, and real projects.</p>
                  </div>
                </div>
              </div>

              <div className="about-metrics-grid">
                <div className="metric-box">
                  <span className="metric-number">5,000+</span>
                  <span className="metric-label">Students Placed Globally</span>
                </div>
                <div className="metric-box">
                  <span className="metric-number">100%</span>
                  <span className="metric-label">AI-Infused Curriculum</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      {/* Hero / Join Call Portal Section */}
      <main id="join-session" className="portal-hero" style={{ paddingTop: '6rem', paddingBottom: '7.5rem' }}>
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

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <a href="#" className="footer-logo">
                <img src="/Logo1.png" alt="Logo" />
              </a>
              <p className="footer-desc">
                Architecting custom customer acquisition engines and scaling operations for high-ticket service brands.
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
              <div className="footer-contact-item" style={{ marginBottom: '0.75rem' }}>
                <Phone size={16} style={{ color: 'var(--color-yellow-accent)', flexShrink: 0 }} />
                <a href="tel:+918825948859">+91 8825948859</a>
              </div>
              <div className="footer-contact-item">
                <Mail size={16} style={{ color: 'var(--color-yellow-accent)', flexShrink: 0 }} />
                <a href="mailto:info@digitalghuru.in">info@digitalghuru.com</a>
              </div>
              <div className="footer-contact-item">
  <MapPin
    size={16}
    style={{ color: 'var(--color-yellow-accent)', flexShrink: 0 }}
  />
  <a
    href="https://maps.google.com/?q=Chennai"
    target="_blank"
    rel="noopener noreferrer"
  >
    Chennai, hyderabad
  </a>
</div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2026. All Rights Reserved. Designed for professional results.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
