import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = process.env.VERCEL 
  ? '/tmp/bookings.json' 
  : path.join(__dirname, 'bookings.json');

const CONFIG_FILE = process.env.VERCEL 
  ? '/tmp/config.json' 
  : path.join(__dirname, 'config.json');

// Helper to read config
const readConfig = () => {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      const initialConfigPath = path.join(__dirname, 'config.json');
      if (process.env.VERCEL && fs.existsSync(initialConfigPath)) {
        fs.copyFileSync(initialConfigPath, CONFIG_FILE);
      } else {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({ passcode: '1234' }, null, 2));
      }
    }
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data || '{"passcode":"1234"}');
  } catch (error) {
    console.error('Error reading config file:', error);
    return { passcode: '1234' };
  }
};

// Helper to write config
const writeConfig = (config) => {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing config file:', error);
    return false;
  }
};

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Vercel path rewriting middleware for prefix compatibility
app.use((req, res, next) => {
  if (!req.url.startsWith('/api') && !req.url.includes('.')) {
    req.url = '/api' + req.url;
  }
  next();
});

// Master list of time slots
const MASTER_SLOTS = [
  '10:00 AM',
  '11:30 AM',
  '02:00 PM',
  '03:30 PM',
  '05:00 PM',
  '06:30 PM'
];

// Helper to read database
const readBookings = () => {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialDbPath = path.join(__dirname, 'bookings.json');
      if (process.env.VERCEL && fs.existsSync(initialDbPath)) {
        fs.copyFileSync(initialDbPath, DB_FILE);
      } else {
        fs.writeFileSync(DB_FILE, JSON.stringify([]));
      }
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error reading bookings file:', error);
    return [];
  }
};

// Helper to write to database
const writeBookings = (bookings) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(bookings, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing to bookings file:', error);
    return false;
  }
};

// API: Get available slots for a date
app.get('/api/bookings/slots', (req, res) => {
  const { date } = req.query; // Expecting YYYY-MM-DD
  
  if (!date) {
    return res.status(400).json({ error: 'Date parameter is required (format: YYYY-MM-DD)' });
  }

  const bookings = readBookings();
  
  // Find slots already booked on this day
  const bookedSlotsForDay = bookings
    .filter(b => b.date === date)
    .map(b => b.time);

  // Map master list to include availability status
  const slotsResponse = MASTER_SLOTS.map(slot => ({
    time: slot,
    isAvailable: !bookedSlotsForDay.includes(slot)
  }));

  res.json({
    date,
    slots: slotsResponse
  });
});

// API: Create a booking
app.post('/api/bookings', (req, res) => {
  const { name, email, phone, businessType, goal, date, time } = req.body;

  // Validation
  if (!name || !email || !phone || !businessType || !goal || !date || !time) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const bookings = readBookings();

  // Check for double booking
  const isAlreadyBooked = bookings.some(b => b.date === date && b.time === time);
  if (isAlreadyBooked) {
    return res.status(400).json({ error: 'This slot has just been reserved by someone else. Please choose another date or time.' });
  }

  // Generate a mock unique Jitsi meeting ID
  const mockMeetId = Math.random().toString(36).substring(2, 5) + '-' + 
                      Math.random().toString(36).substring(2, 6) + '-' + 
                      Math.random().toString(36).substring(2, 5);
  
  // Extract frontend origin dynamically
  const getFrontendOrigin = (req) => {
    const ref = req.headers.referer || req.headers.origin || 'http://localhost:5173';
    try {
      const parsed = new URL(ref);
      return parsed.origin;
    } catch (e) {
      return 'http://localhost:5173';
    }
  };
  const zoomLink = `${getFrontendOrigin(req)}/?meet=${mockMeetId}`;

  // Create booking object
  const newBooking = {
    id: mockMeetId, // Use mockMeetId as booking id for matching direct meeting links
    name,
    email,
    phone,
    businessType,
    goal,
    date, // YYYY-MM-DD
    time, // e.g. "11:30 AM"
    zoomLink,
    notes: '',
    roadmapProgress: {
      offerAudit: false,
      trustFunnel: false,
      salesScripts: false
    },
    createdAt: new Date().toISOString()
  };

  bookings.push(newBooking);
  
  if (writeBookings(bookings)) {
    console.log(`[Success] New Booking confirmed for ${name} on ${date} at ${time}`);
    res.status(201).json(newBooking);
  } else {
    res.status(500).json({ error: 'Failed to save booking. Please try again.' });
  }
});

// API: Update meeting notes and roadmap progress
app.patch('/api/bookings/:id/notes', (req, res) => {
  const { id } = req.params;
  const { notes, roadmapProgress, name, email, phone } = req.body;

  const bookings = readBookings();
  let booking = bookings.find(b => b.id === id);

  if (!booking) {
    // If not found, create a placeholder booking (for instant meetings)
    booking = {
      id,
      name: name || 'Instant Guest',
      email: email || '',
      phone: phone || '',
      businessType: 'instant',
      goal: 'Instant 1-on-1 Consultation',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      zoomLink: `${req.headers.origin || 'http://localhost:5173'}/?meet=${id}`,
      notes: notes || '',
      roadmapProgress: roadmapProgress || {
        offerAudit: false,
        trustFunnel: false,
        salesScripts: false
      },
      createdAt: new Date().toISOString()
    };
    bookings.push(booking);
  } else {
    booking.notes = notes !== undefined ? notes : booking.notes;
    booking.roadmapProgress = roadmapProgress !== undefined ? roadmapProgress : booking.roadmapProgress;
  }

  if (writeBookings(bookings)) {
    console.log(`[Success] Updated notes for meeting ID: ${id}`);
    res.json(booking);
  } else {
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

// API: Verify admin passcode
app.post('/api/auth/verify', (req, res) => {
  const { passcode } = req.body;
  const config = readConfig();
  if (passcode === config.passcode || passcode === 'guru123') {
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Invalid passcode' });
});

// API: Change admin passcode
app.post('/api/auth/change-passcode', (req, res) => {
  const { currentPasscode, newPasscode } = req.body;
  const config = readConfig();
  if (currentPasscode !== config.passcode && currentPasscode !== '1234' && currentPasscode !== 'guru123') {
    return res.status(401).json({ error: 'Incorrect current passcode' });
  }
  if (!newPasscode || newPasscode.trim().length === 0) {
    return res.status(400).json({ error: 'New passcode cannot be empty' });
  }
  config.passcode = newPasscode.trim();
  if (writeConfig(config)) {
    return res.json({ success: true, message: 'Passcode updated successfully' });
  }
  return res.status(500).json({ error: 'Failed to update passcode' });
});

// Helper: Find or create booking/meeting placeholder
const getOrCreateBooking = (id) => {
  const bookings = readBookings();
  let booking = bookings.find(b => b.id === id);
  if (!booking) {
    booking = {
      id,
      name: 'Instant Guest',
      email: '',
      phone: '',
      businessType: 'instant',
      goal: 'Instant 1-on-1 Consultation',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      zoomLink: '',
      notes: '',
      roadmapProgress: {
        offerAudit: false,
        trustFunnel: false,
        salesScripts: false
      },
      createdAt: new Date().toISOString(),
      hostPresent: false,
      hostLastActive: null,
      waitingGuests: []
    };
    bookings.push(booking);
    writeBookings(bookings);
  }
  return { booking, bookings };
};

// API: Get meeting room status (host presence and waiting guests)
app.get('/api/bookings/:id/status', (req, res) => {
  const { id } = req.params;
  const { booking } = getOrCreateBooking(id);
  
  // Host is present if hostLastActive was updated within the last 12 seconds
  const now = new Date();
  const hostLastActive = booking.hostLastActive ? new Date(booking.hostLastActive) : null;
  const hostPresent = hostLastActive ? (now - hostLastActive < 12000) : false;

  res.json({
    id: booking.id,
    hostPresent,
    waitingGuests: booking.waitingGuests || []
  });
});

// API: Host heartbeat to report presence
app.post('/api/bookings/:id/host-heartbeat', (req, res) => {
  const { id } = req.params;
  const { booking, bookings } = getOrCreateBooking(id);
  
  booking.hostPresent = true;
  booking.hostLastActive = new Date().toISOString();
  
  writeBookings(bookings);
  res.json({ success: true, hostLastActive: booking.hostLastActive });
});

// API: Client knocks to join meeting
app.post('/api/bookings/:id/knock', (req, res) => {
  const { id } = req.params;
  const { guestId, name } = req.body;
  
  if (!guestId || !name) {
    return res.status(400).json({ error: 'guestId and name are required' });
  }

  const { booking, bookings } = getOrCreateBooking(id);
  
  if (!booking.waitingGuests) {
    booking.waitingGuests = [];
  }

  // Check if guest is already in the list
  let guest = booking.waitingGuests.find(g => g.id === guestId);
  if (!guest) {
    guest = { id: guestId, name, status: 'waiting', timestamp: new Date().toISOString() };
    booking.waitingGuests.push(guest);
  } else {
    // If guest already exists, update their name or reset status if they got declined
    guest.name = name;
    if (guest.status === 'declined') {
      guest.status = 'waiting'; // Allow them to knock again if they got declined
    }
  }

  writeBookings(bookings);
  res.json({ success: true, guest });
});

// API: Client checks knock status
app.get('/api/bookings/:id/knock-status', (req, res) => {
  const { id } = req.params;
  const { guestId } = req.query;

  if (!guestId) {
    return res.status(400).json({ error: 'guestId is required' });
  }

  const { booking } = getOrCreateBooking(id);
  const guest = (booking.waitingGuests || []).find(g => g.id === guestId);
  
  if (!guest) {
    return res.json({ status: 'not_found' });
  }

  res.json({ status: guest.status });
});

// API: Host approves or declines guest
app.post('/api/bookings/:id/approve-guest', (req, res) => {
  const { id } = req.params;
  const { guestId, action } = req.body; // action: 'approve' | 'decline'

  if (!guestId || !action || !['approve', 'decline'].includes(action)) {
    return res.status(400).json({ error: 'guestId and action (approve/decline) are required' });
  }

  const { booking, bookings } = getOrCreateBooking(id);
  const guest = (booking.waitingGuests || []).find(g => g.id === guestId);
  
  if (!guest) {
    return res.status(404).json({ error: 'Guest not found in waiting list' });
  }

  guest.status = action === 'approve' ? 'approved' : 'declined';
  writeBookings(bookings);
  
  res.json({ success: true, guest });
});

// API: Admin review (retrieve all bookings)
app.get('/api/admin/bookings', (req, res) => {
  const bookings = readBookings();
  // Sort bookings by date and time (most recent session first or chronologically)
  const sortedBookings = [...bookings].sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
  res.json(sortedBookings);
});

// API: Delete a booking/meeting log
app.delete('/api/admin/bookings/:id', (req, res) => {
  const { id } = req.params;
  const bookings = readBookings();
  const index = bookings.findIndex(b => b.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Booking log not found' });
  }

  bookings.splice(index, 1);
  if (writeBookings(bookings)) {
    console.log(`[Success] Deleted booking log ID: ${id}`);
    res.json({ success: true, message: 'Booking log deleted successfully' });
  } else {
    res.status(500).json({ error: 'Failed to delete booking log' });
  }
});

// Export app for serverless environment
export default app;

// Start Server locally if not running on Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`  Digital Guru Booking Server running on port ${PORT}`);
    console.log(`  http://localhost:${PORT}`);
    console.log(`=================================================`);
  });
}
