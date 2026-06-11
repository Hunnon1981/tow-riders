// ================================================
// TOW RIDERS BACKEND API
// Complete Backend with Stripe, Email, Google Maps
// ================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');
const axios = require('axios');

// Initialize
const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

// Configuration
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8000';
const BUSINESS_EMAIL = process.env.BUSINESS_EMAIL || 'services@towriders.com';
const BUSINESS_PHONE = process.env.BUSINESS_PHONE_DISPLAY || '+1 925-546-9711';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// ================================================
// MIDDLEWARE
// ================================================

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Stripe webhook (raw body)
app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message);
    return res.sendStatus(400);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('✅ Payment successful:', session);
      
      // Send confirmation email
      await sendPaymentConfirmationEmail(session);
      break;
    
    case 'payment_intent.payment_failed':
      const paymentIntent = event.data.object;
      console.log('❌ Payment failed:', paymentIntent);
      break;
    
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});

// Parse JSON (for all other routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ================================================
// HELPER FUNCTIONS
// ================================================

// Calculate distance using Google Maps Distance Matrix API
async function calculateDistance(origin, destination) {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('⚠️ Google Maps API key not configured');
    return null;
  }

  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: origin,
        destinations: destination,
        units: 'imperial',
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status === 'OK' && response.data.rows[0].elements[0].status === 'OK') {
      const distanceText = response.data.rows[0].elements[0].distance.text;
      const distanceValue = response.data.rows[0].elements[0].distance.value; // in meters
      const distanceMiles = (distanceValue * 0.000621371).toFixed(1); // convert to miles
      
      return {
        miles: parseFloat(distanceMiles),
        text: distanceText,
        duration: response.data.rows[0].elements[0].duration.text
      };
    }
    return null;
  } catch (error) {
    console.error('❌ Distance calculation error:', error.message);
    return null;
  }
}

// Calculate pricing
function calculatePricing(service, distance, options = {}) {
  const SERVICE_PRICING = {
    'towing_drivable': { base: 100, perMile: 5.5 },
    'towing_nondrivable': { base: 125, perMile: 6.0 },
    'jump_start': { base: 85, perMile: 0 },
    'tire_change': { base: 95, perMile: 0 },
    'lockout': { base: 95, perMile: 0 },
    'fuel_delivery': { base: 110, perMile: 0 }
  };

  const TIME_FEE = {
    'day': 0,
    'night': 40
  };

  const LEVEL_FEE = {
    'standard': 0,
    'priority': 30,
    'rush': 60
  };

  const pricing = SERVICE_PRICING[service] || SERVICE_PRICING['towing_drivable'];
  const distanceNum = parseFloat(distance) || 0;
  
  const baseFee = pricing.base;
  const distanceFee = distanceNum * pricing.perMile;
  const timeFee = TIME_FEE[options.timeOfDay] || 0;
  const levelFee = LEVEL_FEE[options.serviceLevel] || 0;
  
  const total = baseFee + distanceFee + timeFee + levelFee;
  
  return {
    base: baseFee,
    distance: distanceFee,
    time: timeFee,
    level: levelFee,
    total: Math.round(total)
  };
}

// Send booking confirmation email
async function sendBookingEmail(bookingData) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ Resend API key not configured - skipping email');
    return { success: false, message: 'Email service not configured' };
  }

  try {
    console.log('📧 Attempting to send booking email...');
    console.log('From: Tow Riders <onboarding@resend.dev>');
    console.log('To:', BUSINESS_EMAIL);
    
    // Email to business
    const businessEmail = await resend.emails.send({
      from: 'Tow Riders <onboarding@resend.dev>',
      to: [BUSINESS_EMAIL],
      subject: `New Booking: ${bookingData.service} - ${bookingData.customerName}`,
      html: `
        <h2>New Booking Received</h2>
        <p><strong>Booking ID:</strong> ${bookingData.bookingId}</p>
        <p><strong>Service:</strong> ${bookingData.service}</p>
        <p><strong>Customer:</strong> ${bookingData.customerName}</p>
        <p><strong>Phone:</strong> ${bookingData.phone}</p>
        <p><strong>Email:</strong> ${bookingData.email || 'Not provided'}</p>
        <p><strong>Pickup:</strong> ${bookingData.pickupAddress}</p>
        <p><strong>Dropoff:</strong> ${bookingData.dropoffAddress || 'Same as pickup'}</p>
        <p><strong>Vehicle:</strong> ${bookingData.vehicleYear || ''} ${bookingData.vehicleMake || ''} ${bookingData.vehicleModel || ''}</p>
        <p><strong>Distance:</strong> ${bookingData.distance || 'N/A'} miles</p>
        <p><strong>Total Price:</strong> $${bookingData.totalPrice}</p>
        <p><strong>Payment Method:</strong> ${bookingData.paymentMethod}</p>
        <p><strong>Notes:</strong> ${bookingData.notes || 'None'}</p>
        <hr>
        <p><small>Received: ${new Date().toLocaleString()}</small></p>
      `
    });

    console.log('✅ Business email sent successfully!');
    console.log('Email ID:', businessEmail.data?.id);
    console.log('Full response:', JSON.stringify(businessEmail, null, 2));

    // Email to customer (if provided)
    if (bookingData.email) {
      console.log('📧 Sending customer confirmation to:', bookingData.email);
      const customerEmail = await resend.emails.send({
        from: 'Tow Riders <onboarding@resend.dev>',
        to: [bookingData.email],
        subject: `Booking Confirmation - ${bookingData.bookingId}`,
        html: `
          <h2>Booking Confirmed!</h2>
          <p>Thank you for choosing Tow Riders, ${bookingData.customerName}!</p>
          <p><strong>Booking ID:</strong> ${bookingData.bookingId}</p>
          <p><strong>Service:</strong> ${bookingData.service}</p>
          <p><strong>Pickup Location:</strong> ${bookingData.pickupAddress}</p>
          <p><strong>Total:</strong> $${bookingData.totalPrice}</p>
          <hr>
          <p>Our dispatch team will contact you shortly.</p>
          <p><strong>Need immediate help?</strong> Call us at ${BUSINESS_PHONE}</p>
          <hr>
          <p><small>Tow Riders - 24/7 Emergency Towing Service</small></p>
        `
      });

      console.log('✅ Customer email sent successfully!');
      console.log('Email ID:', customerEmail.data?.id);
    }

    return { success: true, message: 'Emails sent successfully' };
  } catch (error) {
    console.error('❌ Booking email error (DETAILED):', {
      message: error.message,
      statusCode: error.statusCode,
      name: error.name,
      response: error.response?.data,
      stack: error.stack?.split('\n')[0]
    });
    
    // Log Resend-specific errors
    if (error.response?.data) {
      console.error('🔍 Resend Error Details:', JSON.stringify(error.response.data, null, 2));
    }
    
    return { success: false, message: error.message, errorDetails: error.response?.data };
  }
}

// Send contact form email
async function sendContactEmail(contactData) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ Resend API key not configured - skipping email');
    return { success: false, message: 'Email service not configured' };
  }

  try {
    console.log('📧 Attempting to send contact form email...');
    console.log('From: Tow Riders <onboarding@resend.dev>');
    console.log('To:', BUSINESS_EMAIL);
    
    const email = await resend.emails.send({
      from: 'Tow Riders <onboarding@resend.dev>',
      to: [BUSINESS_EMAIL],
      replyTo: contactData.email,
      subject: `Contact Form: ${contactData.name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${contactData.name}</p>
        <p><strong>Email:</strong> ${contactData.email}</p>
        <p><strong>Phone:</strong> ${contactData.phone || 'Not provided'}</p>
        <p><strong>Message:</strong></p>
        <p>${contactData.message}</p>
        <hr>
        <p><small>Received: ${new Date().toLocaleString()}</small></p>
      `
    });

    console.log('✅ Contact email sent successfully!');
    console.log('Email ID:', email.data?.id);
    console.log('Full response:', JSON.stringify(email, null, 2));
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('❌ Contact email error (DETAILED):', {
      message: error.message,
      statusCode: error.statusCode,
      name: error.name,
      response: error.response?.data,
      stack: error.stack?.split('\n')[0]
    });
    
    if (error.response?.data) {
      console.error('🔍 Resend Error Details:', JSON.stringify(error.response.data, null, 2));
    }
    
    return { success: false, message: error.message, errorDetails: error.response?.data };
  }
}

// Send payment confirmation email
async function sendPaymentConfirmationEmail(session) {
  if (!process.env.RESEND_API_KEY) return;

  try {
    console.log('📧 Attempting to send payment confirmation email...');
    console.log('From: Tow Riders <onboarding@resend.dev>');
    console.log('To:', BUSINESS_EMAIL);
    
    const metadata = session.metadata;
    const result = await resend.emails.send({
      from: 'Tow Riders <onboarding@resend.dev>',
      to: [BUSINESS_EMAIL],
      subject: `Payment Received: ${metadata.bookingId}`,
      html: `
        <h2>Payment Confirmed</h2>
        <p><strong>Booking ID:</strong> ${metadata.bookingId}</p>
        <p><strong>Customer:</strong> ${metadata.customerName}</p>
        <p><strong>Amount:</strong> $${(session.amount_total / 100).toFixed(2)}</p>
        <p><strong>Service:</strong> ${metadata.service}</p>
        <p><strong>Phone:</strong> ${metadata.phone}</p>
        <p><strong>Pickup:</strong> ${metadata.pickup}</p>
        <hr>
        <p>Payment processed successfully via Stripe.</p>
      `
    });
    
    console.log('✅ Payment confirmation email sent successfully!');
    console.log('Email ID:', result.data?.id);
    console.log('Full response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Payment email error (DETAILED):', {
      message: error.message,
      statusCode: error.statusCode,
      response: error.response?.data
    });
    
    if (error.response?.data) {
      console.error('🔍 Resend Error Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Send quote request email
async function sendQuoteEmail(quoteData) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ Resend API key not configured - skipping email');
    return { success: false, message: 'Email service not configured' };
  }

  try {
    console.log('📧 Attempting to send quote request email...');
    console.log('From: Tow Riders <onboarding@resend.dev>');
    console.log('To:', BUSINESS_EMAIL);
    
    const email = await resend.emails.send({
      from: 'Tow Riders <onboarding@resend.dev>',
      to: [BUSINESS_EMAIL],
      subject: `Quote Request: ${quoteData.service || 'Service'} - ${quoteData.customerName}`,
      html: `
        <h2>New Quote Request</h2>
        <p><strong>Quote ID:</strong> ${quoteData.quoteId || 'N/A'}</p>
        <p><strong>Customer:</strong> ${quoteData.customerName}</p>
        <p><strong>Phone:</strong> ${quoteData.phone}</p>
        <p><strong>Email:</strong> ${quoteData.email || 'Not provided'}</p>
        <p><strong>Service:</strong> ${quoteData.service || quoteData.serviceName || 'Not specified'}</p>
        <p><strong>Pickup:</strong> ${quoteData.pickup || quoteData.pickupAddress || 'Not provided'}</p>
        <p><strong>Dropoff:</strong> ${quoteData.dropoff || quoteData.dropoffAddress || 'Same as pickup'}</p>
        <p><strong>Distance:</strong> ${quoteData.distance || 'N/A'} miles</p>
        <p><strong>Estimated Price:</strong> $${quoteData.totalPrice || quoteData.pricing?.total || 'TBD'}</p>
        <hr>
        <p><small>Received: ${new Date().toLocaleString()}</small></p>
      `
    });

    console.log('✅ Quote email sent successfully!');
    console.log('Email ID:', email.data?.id);
    console.log('Full response:', JSON.stringify(email, null, 2));
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('❌ Quote email error (DETAILED):', {
      message: error.message,
      statusCode: error.statusCode,
      name: error.name,
      response: error.response?.data,
      stack: error.stack?.split('\n')[0]
    });
    
    if (error.response?.data) {
      console.error('🔍 Resend Error Details:', JSON.stringify(error.response.data, null, 2));
    }
    
    return { success: false, message: error.message, errorDetails: error.response?.data };
  }
}

// ================================================
// ROUTES
// ================================================

app.get('/', (req, res) => {
  res.send('Tow Riders Backend is LIVE');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Tow Riders Backend API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not configured',
    resend: process.env.RESEND_API_KEY ? 'configured' : 'not configured',
    googleMaps: GOOGLE_MAPS_API_KEY ? 'configured' : 'not configured'
  });
});

// ================================================
// DISTANCE CALCULATION API
// ================================================

app.post('/api/calculate-distance', async (req, res) => {
  try {
    const { origin, destination } = req.body;
    
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination are required'
      });
    }

    const distance = await calculateDistance(origin, destination);
    
    if (distance) {
      res.json({
        success: true,
        distance: distance
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Could not calculate distance'
      });
    }
  } catch (error) {
    console.error('❌ Distance API error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ================================================
// PRICING CALCULATION API
// ================================================

app.post('/api/calculate-pricing', async (req, res) => {
  try {
    const { service, distance, options } = req.body;
    
    if (!service) {
      return res.status(400).json({
        success: false,
        message: 'Service type is required'
      });
    }

    const pricing = calculatePricing(service, distance, options);
    
    res.json({
      success: true,
      pricing: pricing
    });
  } catch (error) {
    console.error('❌ Pricing API error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ================================================
// BOOKING API
// ================================================

app.post('/api/booking', async (req, res) => {
  try {
    const bookingData = req.body;
    
    // Validate
    if (!bookingData.customerName || !bookingData.phone) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and phone are required'
      });
    }
    
    // Generate booking ID
    const bookingId = `BK-${Date.now()}`;
    bookingData.bookingId = bookingId;
    
    console.log('📦 NEW BOOKING RECEIVED:', bookingId);
    console.log(JSON.stringify(bookingData, null, 2));
    
    // Send email notification
    const emailResult = await sendBookingEmail(bookingData);
    
    res.status(200).json({
      success: true,
      message: 'Booking received successfully',
      data: bookingData,
      bookingId: bookingId,
      emailSent: emailResult.success,
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

// ================================================
// CONTACT FORM API
// ================================================

app.post('/api/contact', async (req, res) => {
  try {
    const contactData = req.body;
    
    // Validate
    if (!contactData.name || !contactData.email || !contactData.message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required'
      });
    }
    
    console.log('📧 CONTACT FORM RECEIVED');
    console.log(JSON.stringify(contactData, null, 2));
    
    // Send email
    const emailResult = await sendContactEmail(contactData);
    
    res.json({
      success: true,
      message: 'Contact form received successfully',
      data: contactData,
      emailSent: emailResult.success
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
// QUOTE REQUEST API
// ================================================

app.post('/api/quote', async (req, res) => {
  try {
    const quoteData = req.body;
    
    // Validate
    if (!quoteData.customerName || !quoteData.phone) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and phone are required'
      });
    }
    
    // Generate quote ID
    const quoteId = `QT-${Date.now()}`;
    quoteData.quoteId = quoteId;
    
    console.log('💰 QUOTE REQUEST RECEIVED:', quoteId);
    console.log(JSON.stringify(quoteData, null, 2));
    
    // Send email notification (if sendQuoteEmail exists)
    let emailResult = { success: false, message: 'Email function not available' };
    if (typeof sendQuoteEmail === 'function') {
      emailResult = await sendQuoteEmail(quoteData);
    } else {
      console.warn('⚠️ sendQuoteEmail function not found');
    }
    
    res.json({
      success: true,
      message: 'Quote request received successfully',
      data: quoteData,
      quoteId: quoteId,
      emailSent: emailResult.success
    });
    
  } catch (error) {
    console.error('❌ ERROR processing quote:', error);
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

app.post('/api/partner', async (req, res) => {
  try {
    const partnerData = req.body;
    
    console.log('🤝 PARTNER APPLICATION RECEIVED');
    console.log(JSON.stringify(partnerData, null, 2));
    
    // Send email (if configured)
    if (process.env.RESEND_API_KEY) {
      console.log('📧 Attempting to send partner application email...');
      console.log('From: Tow Riders <onboarding@resend.dev>');
      console.log('To:', BUSINESS_EMAIL);
      
      const result = await resend.emails.send({
        from: 'Tow Riders <onboarding@resend.dev>',
        to: [BUSINESS_EMAIL],
        subject: `Partner Application: ${partnerData.companyName || partnerData.name}`,
        html: `
          <h2>New Partner Application</h2>
          <p><strong>Company/Name:</strong> ${partnerData.companyName || partnerData.name}</p>
          <p><strong>Email:</strong> ${partnerData.email}</p>
          <p><strong>Phone:</strong> ${partnerData.phone}</p>
          <p><strong>Details:</strong></p>
          <pre>${JSON.stringify(partnerData, null, 2)}</pre>
        `
      });
      
      console.log('✅ Partner email sent successfully!');
      console.log('Email ID:', result.data?.id);
    }
    
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
// EMAIL TEST ENDPOINT (for debugging)
// ================================================

app.get('/api/test-email', async (req, res) => {
  try {
    console.log('🧪 EMAIL TEST STARTED');
    console.log('🔑 RESEND_API_KEY configured:', !!process.env.RESEND_API_KEY);
    console.log('📧 BUSINESS_EMAIL:', BUSINESS_EMAIL);
    if (process.env.RESEND_API_KEY) {
      console.log('🔑 API Key format:', process.env.RESEND_API_KEY.substring(0, 5) + '...');
    }
    
    if (!process.env.RESEND_API_KEY) {
      return res.json({
        success: false,
        message: 'RESEND_API_KEY not configured',
        config: {
          apiKeyConfigured: false,
          businessEmail: BUSINESS_EMAIL
        }
      });
    }
    
    console.log('📤 Attempting test email send...');
    
    const result = await resend.emails.send({
      from: 'Tow Riders <onboarding@resend.dev>', // Use Resend test domain
      to: ['services@towriders.com'],
      subject: 'Test Email from Tow Riders Backend',
      html: `
        <h2>🧪 Test Email</h2>
        <p>This is a test email from your Tow Riders backend.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Environment:</strong> ${NODE_ENV}</p>
        <p>If you receive this, Resend is working correctly!</p>
      `
    });
    
    console.log('✅ Test email sent successfully:', result);
    
    res.json({
      success: true,
      message: 'Test email sent successfully',
      emailId: result.data?.id,
      config: {
        apiKeyConfigured: true,
        businessEmail: BUSINESS_EMAIL,
        resendResponse: result
      }
    });
    
  } catch (error) {
    console.error('❌ Test email failed (DETAILED):', {
      message: error.message,
      statusCode: error.statusCode,
      name: error.name,
      response: error.response?.data,
      stack: error.stack?.split('\n')[0]
    });
    
    if (error.response?.data) {
      console.error('🔍 Resend Error Details:', JSON.stringify(error.response.data, null, 2));
    }
    
    res.status(500).json({
      success: false,
      message: 'Test email failed',
      error: error.message,
      details: error.response?.data,
      config: {
        apiKeyConfigured: !!process.env.RESEND_API_KEY,
        businessEmail: BUSINESS_EMAIL
      }
    });
  }
});

// ================================================
// STRIPE CHECKOUT API
// ================================================

app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    const { bookingData } = req.body;
    
    if (!bookingData || !bookingData.pricing || !bookingData.pricing.total) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking data'
      });
    }

    const amountInCents = Math.round(bookingData.pricing.total * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: bookingData.serviceName || 'Towing Service',
            description: `From: ${bookingData.pickup || 'N/A'}\nTo: ${bookingData.dropoff || bookingData.pickup || 'N/A'}\nVehicle: ${bookingData.vehicleYear || ''} ${bookingData.vehicleMake || ''} ${bookingData.vehicleModel || ''}`.trim(),
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${FRONTEND_URL}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/payment-cancel.html`,
      customer_email: bookingData.email || undefined,
      metadata: {
        bookingId: `BK-${Date.now()}`,
        customerName: bookingData.customerName || '',
        phone: bookingData.phone || '',
        service: bookingData.serviceName || '',
        pickup: bookingData.pickup ? bookingData.pickup.substring(0, 500) : '',
        dropoff: bookingData.dropoff ? bookingData.dropoff.substring(0, 500) : '',
        vehicleInfo: `${bookingData.vehicleYear || ''} ${bookingData.vehicleMake || ''} ${bookingData.vehicleModel || ''}`.trim().substring(0, 500),
        distance: bookingData.distance || '',
        totalPrice: bookingData.pricing.total.toString()
      },
    });

    console.log('💳 Stripe Checkout Session Created:', session.id);

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('❌ ERROR creating Stripe checkout session:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create checkout session'
    });
  }
});

app.get('/api/stripe/session/:sessionId', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    
    res.json({
      success: true,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        customer_email: session.customer_email,
        amount_total: session.amount_total,
        metadata: session.metadata
      }
    });
  } catch (error) {
    console.error('❌ ERROR retrieving session:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ================================================
// SOCIAL MEDIA AUTOMATION ROUTES
// ================================================
// ⚠️ Social media automation is DISABLED by default
// Set SOCIAL_AUTOMATION_ENABLED=true in environment to enable
// See /social-test.html for testing interface

// Check if social routes file exists
try {
  const socialRoutes = require('./src/routes/social');
  app.use('/api/social', socialRoutes);
  console.log('✅ Social media automation routes loaded (DISABLED by default)');
} catch (error) {
  console.log('ℹ️  Social media routes not found - skipping');
}

// ================================================
// ERROR HANDLING
// ================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.url
  });
});

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
  console.log(`✅ Stripe: ${process.env.STRIPE_SECRET_KEY ? 'CONFIGURED ✓' : 'NOT CONFIGURED ✗'}`);
  console.log(`✅ Resend: ${process.env.RESEND_API_KEY ? 'CONFIGURED ✓' : 'NOT CONFIGURED ✗'}`);
  console.log(`✅ Google Maps: ${GOOGLE_MAPS_API_KEY ? 'CONFIGURED ✓' : 'NOT CONFIGURED ✗'}`);
  console.log(`✅ Social Automation: ${process.env.SOCIAL_AUTOMATION_ENABLED === 'true' ? 'ENABLED ⚡' : 'DISABLED (Safe) 🛡️'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 Available endpoints:');
  console.log('   GET  /health');
  console.log('   POST /api/calculate-distance');
  console.log('   POST /api/calculate-pricing');
  console.log('   POST /api/booking');
  console.log('   POST /api/contact');
  console.log('   POST /api/partner');
  console.log('   POST /api/stripe/create-checkout-session');
  console.log('   GET  /api/stripe/session/:sessionId');
  console.log('   POST /api/stripe/webhook');
  console.log('\n⏳ Waiting for requests...\n');
});

process.on('SIGTERM', () => {
  console.log('\n👋 SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT signal received: closing HTTP server');
  process.exit(0);
});
