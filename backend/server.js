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

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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

// API: Admin review (retrieve all bookings)
app.get('/api/admin/bookings', (req, res) => {
  const bookings = readBookings();
  // Sort bookings by date and time (most recent session first or chronologically)
  const sortedBookings = [...bookings].sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
  res.json(sortedBookings);
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
