import React, { useState, useEffect } from 'react';

export default function BookingWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessType: '',
    goal: ''
  });

  const apiBaseUrl = window.location.origin.includes('localhost:5173')
    ? 'http://localhost:5000/api'
    : '/api';

  // Format Date helper (returns YYYY-MM-DD)
  const formatDateString = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch slots whenever selectedDate changes
  useEffect(() => {
    if (!selectedDate) return;

    const fetchAvailableSlots = async () => {
      setLoadingSlots(true);
      try {
        const dateStr = formatDateString(selectedDate);
        const res = await fetch(`${apiBaseUrl}/bookings/slots?date=${dateStr}`);
        if (!res.ok) throw new Error('Failed to fetch slots');
        const data = await res.json();
        setSlots(data.slots || []);
      } catch (err) {
        console.error('Error loading slots:', err);
        // Fallback slots if server is temporarily unreachable
        setSlots([
          { time: '10:00 AM', isAvailable: true },
          { time: '11:30 AM', isAvailable: false },
          { time: '02:00 PM', isAvailable: true },
          { time: '03:30 PM', isAvailable: true },
          { time: '05:00 PM', isAvailable: true },
          { time: '06:30 PM', isAvailable: false }
        ]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchAvailableSlots();
  }, [selectedDate]);

  // Calendar render helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Generate Calendar Days array
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calendarDays = [];
  
  // Empty slots
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push({ type: 'empty', val: i });
  }

  // Days of the month
  for (let day = 1; day <= totalDays; day++) {
    const dateToCheck = new Date(year, month, day);
    const diffTime = dateToCheck - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isSunday = dateToCheck.getDay() === 0;
    const isPast = dateToCheck < today;
    
    let state = 'available';
    if (isPast || isSunday || diffDays > 30) {
      state = 'disabled';
    }

    calendarDays.push({
      type: 'day',
      val: day,
      date: dateToCheck,
      state
    });
  }

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    // Map IDs to formData keys
    const key = id.replace('client-', '');
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.businessType || !formData.goal) {
      alert('Please fill out all fields.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        date: formatDateString(selectedDate),
        time: selectedTime
      };

      const res = await fetch(`${apiBaseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to complete booking');
      }

      const data = await res.json();
      setConfirmedBooking(data);
      setStep(3);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formattedSelectedDate = selectedDate
    ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div className="booking-wrapper">
      {/* Left Info Panel */}
      <div className="booking-info-panel">
        <div>
          <h2 className="booking-info-title">Secure Your Private Strategy Call</h2>
          <p style={{ color: 'var(--text-light-muted)', marginBottom: '2rem' }}>
            Select an available day and time on the calendar to reserve your 1-on-1 coaching session with Sir.
          </p>
          
          <div className="booking-info-bullets">
            <div className="booking-info-bullet">
              <span className="booking-bullet-circle">✓</span>
              <div className="booking-bullet-text">
                <h4>100% Focused on You</h4>
                <p>A private Zoom call focused strictly on your business model, pricing, and funnels.</p>
              </div>
            </div>
            <div className="booking-info-bullet">
              <span className="booking-bullet-circle">✓</span>
              <div className="booking-bullet-text">
                <h4>Immediate Action Plan</h4>
                <p>Walk away with concrete changes to apply right away, not fluff or generic theories.</p>
              </div>
            </div>
            <div className="booking-info-bullet">
              <span className="booking-bullet-circle">✓</span>
              <div className="booking-bullet-text">
                <h4>No Obligations</h4>
                <p>This session is designed to add extreme value first. No pressure, just actionable guidance.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="booking-satisfaction">
          <div className="booking-satisfaction-stars">★ ★ ★ ★ ★</div>
          <p className="booking-satisfaction-text">
            "Sir's session was the single most valuable 45 minutes of my year. We simplified my entire offer and booked three new clients in 10 days."
          </p>
          <p className="booking-satisfaction-text" style={{ marginTop: '0.5rem', fontWeight: 700, color: '#fff' }}>
            - Rajesh K., Digital Agency Founder
          </p>
        </div>
      </div>

      {/* Right Widget Panel */}
      <div className="booking-widget-panel">
        
        {/* Step 1: Calendar & Time Slots */}
        {step === 1 && (
          <div className="widget-step">
            <h3 className="widget-title">1. Choose Date & Time</h3>
            
            <div className="calendar-container">
              <div className="calendar-header">
                <button 
                  onClick={handlePrevMonth} 
                  className="calendar-nav-btn" 
                  aria-label="Previous Month"
                  style={{ visibility: year <= today.getFullYear() && month <= today.getMonth() ? 'hidden' : 'visible' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <div className="calendar-month-year">{monthNames[month]} {year}</div>
                <button onClick={handleNextMonth} className="calendar-nav-btn" aria-label="Next Month">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              </div>
              <div className="calendar-weekdays">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
              </div>
              <div className="calendar-days">
                {calendarDays.map((item, index) => {
                  if (item.type === 'empty') {
                    return <div key={`empty-${index}`} className="calendar-day empty"></div>;
                  }
                  
                  const isSelected = selectedDate && 
                                    selectedDate.getDate() === item.val && 
                                    selectedDate.getMonth() === month && 
                                    selectedDate.getFullYear() === year;
                  
                  return (
                    <button
                      key={`day-${item.val}`}
                      disabled={item.state === 'disabled'}
                      onClick={() => handleDateClick(item.date)}
                      className={`calendar-day ${item.state} ${isSelected ? 'selected' : ''}`}
                    >
                      {item.val}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div className="time-slots-wrapper">
                <h4 className="time-slots-title">Select Available Time Slot (IST)</h4>
                {loadingSlots ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>Loading slots...</div>
                ) : (
                  <div className="time-slots-grid">
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        disabled={!slot.isAvailable}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`time-slot-btn ${selectedTime === slot.time ? 'selected' : ''} ${!slot.isAvailable ? 'disabled' : ''}`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="widget-buttons">
              <button 
                onClick={() => setStep(2)}
                className="btn btn-primary" 
                style={{ width: '100%' }} 
                disabled={!selectedDate || !selectedTime}
              >
                Next: Enter Contact Info
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Contact Form */}
        {step === 2 && (
          <div className="widget-step">
            <h3 className="widget-title">2. Application Details</h3>
            
            <div className="selected-time-summary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span><strong>Selected Session:</strong> {formattedSelectedDate} at {selectedTime} (IST)</span>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="client-name">Your Full Name *</label>
                <input 
                  type="text" 
                  id="client-name" 
                  className="form-input" 
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your name" 
                  required 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="client-email">Email Address *</label>
                <input 
                  type="email" 
                  id="client-email" 
                  className="form-input" 
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="name@company.com" 
                  required 
                />
              </div>

              <div className="form-group">
                <label htmlFor="client-phone">Phone Number (WhatsApp preferred) *</label>
                <input 
                  type="tel" 
                  id="client-phone" 
                  className="form-input" 
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="e.g. +91 98765 43210" 
                  required 
                />
              </div>

              <div className="form-group">
                <label htmlFor="client-businessType">What is your primary business type? *</label>
                <select 
                  id="client-businessType" 
                  className="form-select" 
                  value={formData.businessType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="" disabled>Select business type</option>
                  <option value="agency">Marketing / Creative Agency</option>
                  <option value="coaching">Coaching / Consulting</option>
                  <option value="freelance">Freelance Service Provider</option>
                  <option value="ecom">E-commerce / Retail</option>
                  <option value="other">Other B2B / B2C Business</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="client-goal">What is your #1 scaling obstacle? *</label>
                <textarea 
                  id="client-goal" 
                  className="form-input" 
                  rows="3" 
                  value={formData.goal}
                  onChange={handleInputChange}
                  placeholder="e.g. Can't find qualified high-ticket leads consistently" 
                  required 
                  style={{ resize: 'none' }}
                ></textarea>
              </div>

              <div className="widget-buttons">
                <button 
                  type="button" 
                  onClick={() => setStep(1)} 
                  className="btn btn-secondary" 
                  style={{ padding: '1rem 1.5rem' }}
                >
                  Back
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  disabled={submitting}
                >
                  {submitting ? 'Booking...' : 'Confirm Call Booking'}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Success Confirmation */}
        {step === 3 && confirmedBooking && (
          <div className="widget-step">
            <div className="booking-success-box">
              <div className="success-check-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h3>Booking Confirmed!</h3>
              <p>Your strategic 1-on-1 session has been reserved. A Zoom calendar invite has been sent to your email.</p>
              
              <div className="success-details-list">
                <div className="success-detail-item">
                  <span className="success-label">Attendee:</span>
                  <span className="success-val">{confirmedBooking.name}</span>
                </div>
                <div className="success-detail-item">
                  <span className="success-label">Email:</span>
                  <span className="success-val">{confirmedBooking.email}</span>
                </div>
                <div className="success-detail-item">
                  <span className="success-label">Phone:</span>
                  <span className="success-val">{confirmedBooking.phone}</span>
                </div>
                <div className="success-detail-item">
                  <span className="success-label">Session:</span>
                  <span className="success-val">{formattedSelectedDate}</span>
                </div>
                <div className="success-detail-item">
                  <span className="success-label">Time:</span>
                  <span className="success-val">{confirmedBooking.time} (IST)</span>
                </div>
                <div className="success-detail-item">
                  <span className="success-label">Video Call:</span>
                  <a href={confirmedBooking.zoomLink} target="_blank" rel="noopener noreferrer" className="success-val" style={{ color: 'var(--color-blue-brand)', textDecoration: 'underline' }}>
                    Join Meeting Link
                  </a>
                </div>
                <div className="success-detail-item">
                  <span className="success-label">Host:</span>
                  <span className="success-val" style={{ color: 'var(--color-orange-brand)' }}>Sir</span>
                </div>
              </div>

              <div className="highlight-yellow" style={{ padding: '1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.9rem', fontWeight: 600, color: '#7f5f00', textAlign: 'center', maxWidth: '400px' }}>
                💡 Please check your email inbox for meeting links, calendar coordinates, and pre-call homework.
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
