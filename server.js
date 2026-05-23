// ================================================
// TOW RIDERS BACKEND API
// Simple Express Server
// ================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Initialize Express app
const app = express();

// Configuration
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ================================================
// MIDDLEWARE
// ================================================

// Enable CORS for all origins (adjust for production)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ================================================
// ROUTES
// ================================================

// Root endpoint - Health check
app.get('/', (req, res) => {
  res.send('Express Tow Backend is LIVE');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Tow Riders Backend API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV
  });
});

// ================================================
// BOOKING API
// ================================================

// POST /api/booking - Create new booking
app.post('/api/booking', (req, res) => {
  try {
    const bookingData = req.body;
    
    // Log booking data to console
    console.log('📦 NEW BOOKING RECEIVED:');
    console.log(JSON.stringify(bookingData, null, 2));
    
    // Validate basic required fields
    if (!bookingData.customerName || !bookingData.phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: customerName and phone are required',
        data: null
      });
    }
    
    // Send success response
    res.status(200).json({
      success: true,
      message: 'Booking received successfully',
      data: bookingData,
      bookingId: `BK-${Date.now()}`, // Generate simple booking ID
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ERROR processing booking:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/bookings - Get all bookings (placeholder for now)
app.get('/api/bookings', (req, res) => {
  res.json({
    success: true,
    message: 'Bookings endpoint - Database integration pending',
    data: [],
    count: 0
  });
});

// ================================================
// CONTACT API
// ================================================

// POST /api/contact - Handle contact form submissions
app.post('/api/contact', (req, res) => {
  try {
    const contactData = req.body;
    
    console.log('📧 CONTACT FORM RECEIVED:');
    console.log(JSON.stringify(contactData, null, 2));
    
    res.json({
      success: true,
      message: 'Contact form received successfully',
      data: contactData
    });
    
  } catch (error) {
    console.error('❌ ERROR processing contact form:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ================================================
// PARTNER API
// ================================================

// POST /api/partner - Handle partner applications
app.post('/api/partner', (req, res) => {
  try {
    const partnerData = req.body;
    
    console.log('🤝 PARTNER APPLICATION RECEIVED:');
    console.log(JSON.stringify(partnerData, null, 2));
    
    res.json({
      success: true,
      message: 'Partner application received successfully',
      data: partnerData,
      applicationId: `PA-${Date.now()}`
    });
    
  } catch (error) {
    console.error('❌ ERROR processing partner application:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ================================================
// ERROR HANDLING
// ================================================

// 404 handler - Route not found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.url
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ GLOBAL ERROR:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: NODE_ENV === 'development' ? error.message : 'An error occurred'
  });
});

// ================================================
// START SERVER
// ================================================

app.listen(PORT, () => {
  console.log('\n🚀 TOW RIDERS BACKEND API');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Server running on port: ${PORT}`);
  console.log(`✅ Environment: ${NODE_ENV}`);
  console.log(`✅ API URL: http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 Available endpoints:');
  console.log('   GET  /');
  console.log('   GET  /health');
  console.log('   POST /api/booking');
  console.log('   GET  /api/bookings');
  console.log('   POST /api/contact');
  console.log('   POST /api/partner');
  console.log('\n⏳ Waiting for requests...\n');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT signal received: closing HTTP server');
  process.exit(0);
});
