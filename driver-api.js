// ================================================
// DRIVER API - Job Management & Earnings Tracking
// ================================================

const crypto = require('crypto');

class DriverAPI {
  constructor() {
    this.drivers = new Map(); // In-memory driver sessions
    this.jobs = new Map(); // In-memory jobs
    this.jobCounter = 0;
    this.driverPortalPin = process.env.DRIVER_PORTAL_PIN || '1234';
    this.driverPayoutPercent = parseFloat(process.env.DRIVER_PAYOUT_PERCENT || '75');
  }

  // ================================================
  // UTILITIES
  // ================================================

  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  parseJobMetadata(session) {
    // Extract job data from Stripe checkout session metadata
    const metadata = session.metadata || {};
    const amountTotal = session.amount_total || 0; // in cents
    
    return {
      bookingId: metadata.bookingId || `BK-${Date.now()}`,
      customerName: metadata.customerName || 'Unknown Customer',
      customerPhone: metadata.phone || '',
      customerEmail: metadata.email || '',
      service: metadata.service || 'towing',
      pickup: metadata.pickup || 'Not specified',
      dropoff: metadata.dropoff || 'Pickup location',
      vehicleInfo: metadata.vehicleInfo || 'Unknown vehicle',
      amountCents: amountTotal,
      amountDollars: parseFloat((amountTotal / 100).toFixed(2)),
      notes: metadata.notes || ''
    };
  }

  // ================================================
  // AUTHENTICATION
  // ================================================

  loginDriver(pin, phoneOrId) {
    if (pin !== this.driverPortalPin) {
      return { success: false, error: 'Invalid PIN' };
    }

    const driverId = phoneOrId || `driver_${Date.now()}`;
    const token = this.generateToken();
    
    this.drivers.set(token, {
      driverId,
      phoneOrId,
      token,
      isOnline: false,
      loginTime: new Date(),
      totalEarnings: 0,
      completedJobs: 0,
      acceptedJobs: []
    });

    console.log(`✅ Driver authenticated: ${driverId}`);
    
    return {
      success: true,
      token,
      driverId,
      message: 'Logged in successfully'
    };
  }

  validateToken(token) {
    if (!token || !this.drivers.has(token)) {
      return { valid: false, error: 'Invalid or expired token' };
    }
    return { valid: true, driver: this.drivers.get(token) };
  }

  // ================================================
  // AVAILABILITY
  // ================================================

  setOnline(token) {
    const validation = this.validateToken(token);
    if (!validation.valid) return { success: false, error: validation.error };

    const driver = validation.driver;
    driver.isOnline = true;
    driver.lastOnlineTime = new Date();
    
    console.log(`🟢 Driver online: ${driver.driverId}`);
    return { success: true, message: 'You are now online' };
  }

  setOffline(token) {
    const validation = this.validateToken(token);
    if (!validation.valid) return { success: false, error: validation.error };

    const driver = validation.driver;
    driver.isOnline = false;
    driver.lastOfflineTime = new Date();
    
    console.log(`🔴 Driver offline: ${driver.driverId}`);
    return { success: true, message: 'You are now offline' };
  }

  // ================================================
  // JOB CREATION (from Stripe checkout)
  // ================================================

  createJobFromCheckout(session) {
    try {
      const jobData = this.parseJobMetadata(session);
      const jobId = `JOB-${++this.jobCounter}`;
      
      const job = {
        jobId,
        ...jobData,
        status: 'available', // Status: available -> accepted -> en_route -> arrived -> loaded -> in_transit -> completed
        createdAt: new Date(),
        updatedAt: new Date(),
        assignedDriver: null,
        statusHistory: [
          { status: 'available', timestamp: new Date(), note: 'Job created from Stripe checkout' }
        ],
        estimatedPayout: parseFloat((jobData.amountDollars * this.driverPayoutPercent / 100).toFixed(2))
      };

      this.jobs.set(jobId, job);
      console.log(`📦 Job created from checkout: ${jobId}, Payout: $${job.estimatedPayout}`);
      
      return { success: true, jobId, job };
    } catch (error) {
      console.error('❌ Error creating job from checkout:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ================================================
  // JOB QUERIES
  // ================================================

  getAvailableJobs(token) {
    const validation = this.validateToken(token);
    if (!validation.valid) return { success: false, error: validation.error };

    const availableJobs = Array.from(this.jobs.values()).filter(job => job.status === 'available');
    return { success: true, jobs: availableJobs };
  }

  getMyJobs(token) {
    const validation = this.validateToken(token);
    if (!validation.valid) return { success: false, error: validation.error };

    const driver = validation.driver;
    const myJobs = Array.from(this.jobs.values()).filter(
      job => job.assignedDriver === driver.driverId && 
             ['accepted', 'en_route', 'arrived', 'loaded', 'in_transit'].includes(job.status)
    );
    return { success: true, jobs: myJobs };
  }

  getCompletedJobs(token) {
    const validation = this.validateToken(token);
    if (!validation.valid) return { success: false, error: validation.error };

    const driver = validation.driver;
    const completedJobs = Array.from(this.jobs.values()).filter(
      job => job.assignedDriver === driver.driverId && job.status === 'completed'
    );
    return { success: true, jobs: completedJobs };
  }

  // ================================================
  // JOB ACTIONS
  // ================================================

  acceptJob(token, jobId) {
    const validation = this.validateToken(token);
    if (!validation.valid) return { success: false, error: validation.error };

    const job = this.jobs.get(jobId);
    if (!job) return { success: false, error: 'Job not found' };
    if (job.status !== 'available') return { success: false, error: `Job is ${job.status}, cannot accept` };

    const driver = validation.driver;
    job.status = 'accepted';
    job.assignedDriver = driver.driverId;
    job.updatedAt = new Date();
    job.statusHistory.push({ status: 'accepted', timestamp: new Date(), driver: driver.driverId });

    driver.acceptedJobs.push(jobId);
    console.log(`✅ Job accepted: ${jobId} by ${driver.driverId}`);
    
    return { success: true, message: 'Job accepted', job };
  }

  declineJob(token, jobId) {
    const validation = this.validateToken(token);
    if (!validation.valid) return { success: false, error: validation.error };

    const job = this.jobs.get(jobId);
    if (!job) return { success: false, error: 'Job not found' };
    
    console.log(`❌ Job declined: ${jobId}`);
    return { success: true, message: 'Job declined' };
  }

  // ================================================
  // STATUS TRANSITIONS
  // ================================================

  updateJobStatus(token, jobId, newStatus) {
    const validation = this.validateToken(token);
    if (!validation.valid) return { success: false, error: validation.error };

    const job = this.jobs.get(jobId);
    if (!job) return { success: false, error: 'Job not found' };
    if (job.assignedDriver !== validation.driver.driverId) {
      return { success: false, error: 'You are not assigned to this job' };
    }

    const validStatuses = ['accepted', 'en_route', 'arrived', 'loaded', 'in_transit', 'completed'];
    if (!validStatuses.includes(newStatus)) {
      return { success: false, error: 'Invalid status' };
    }

    const oldStatus = job.status;
    job.status = newStatus;
    job.updatedAt = new Date();
    job.statusHistory.push({ status: newStatus, timestamp: new Date(), driver: validation.driver.driverId });

    console.log(`📍 Job status: ${jobId} ${oldStatus} → ${newStatus}`);

    // Mark as completed and add earnings
    if (newStatus === 'completed') {
      validation.driver.completedJobs++;
      validation.driver.totalEarnings += job.estimatedPayout;
      console.log(`💰 Earnings added: $${job.estimatedPayout}, Total: $${validation.driver.totalEarnings}`);
    }

    return { success: true, message: `Status updated to ${newStatus}`, job };
  }

  // ================================================
  // DRIVER STATS & EARNINGS
  // ================================================

  getDriverStats(token) {
    const validation = this.validateToken(token);
    if (!validation.valid) return { success: false, error: validation.error };

    const driver = validation.driver;
    return {
      success: true,
      stats: {
        driverId: driver.driverId,
        isOnline: driver.isOnline,
        completedJobs: driver.completedJobs,
        totalEarnings: parseFloat(driver.totalEarnings.toFixed(2)),
        estimatedPayout: parseFloat((driver.totalEarnings * this.driverPayoutPercent / 100).toFixed(2)),
        payoutPercent: this.driverPayoutPercent,
        loginTime: driver.loginTime,
        lastOnlineTime: driver.lastOnlineTime || null,
        lastOfflineTime: driver.lastOfflineTime || null
      }
    };
  }

  // ================================================
  // EXPRESS ROUTE REGISTRATION
  // ================================================

  register(app) {
    // Driver Login
    app.post('/api/driver/login', (req, res) => {
      try {
        const { pin, phoneOrId } = req.body;
        if (!pin) return res.status(400).json({ success: false, error: 'PIN required' });

        const result = this.loginDriver(pin, phoneOrId);
        res.json(result);
      } catch (error) {
        console.error('❌ Login error:', error.message);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Set Online
    app.post('/api/driver/online', (req, res) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ success: false, error: 'Token required' });

        const result = this.setOnline(token);
        res.json(result);
      } catch (error) {
        console.error('❌ Online error:', error.message);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Set Offline
    app.post('/api/driver/offline', (req, res) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ success: false, error: 'Token required' });

        const result = this.setOffline(token);
        res.json(result);
      } catch (error) {
        console.error('❌ Offline error:', error.message);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Get Available Jobs
    app.get('/api/driver/jobs/available', (req, res) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ success: false, error: 'Token required' });

        const result = this.getAvailableJobs(token);
        res.json(result);
      } catch (error) {
        console.error('❌ Available jobs error:', error.message);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Get My Jobs
    app.get('/api/driver/jobs/mine', (req, res) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ success: false, error: 'Token required' });

        const result = this.getMyJobs(token);
        res.json(result);
      } catch (error) {
        console.error('❌ My jobs error:', error.message);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Get Completed Jobs
    app.get('/api/driver/jobs/completed', (req, res) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ success: false, error: 'Token required' });

        const result = this.getCompletedJobs(token);
        res.json(result);
      } catch (error) {
        console.error('❌ Completed jobs error:', error.message);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Accept Job
    app.post('/api/driver/jobs/:jobId/accept', (req, res) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ success: false, error: 'Token required' });

        const { jobId } = req.params;
        const result = this.acceptJob(token, jobId);
        res.json(result);
      } catch (error) {
        console.error('❌ Accept job error:', error.message);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Decline Job
    app.post('/api/driver/jobs/:jobId/decline', (req, res) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ success: false, error: 'Token required' });

        const { jobId } = req.params;
        const result = this.declineJob(token, jobId);
        res.json(result);
      } catch (error) {
        console.error('❌ Decline job error:', error.message);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Update Job Status
    app.post('/api/driver/jobs/:jobId/status', (req, res) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ success: false, error: 'Token required' });

        const { jobId } = req.params;
        const { status } = req.body;
        if (!status) return res.status(400).json({ success: false, error: 'Status required' });

        const result = this.updateJobStatus(token, jobId, status);
        res.json(result);
      } catch (error) {
        console.error('❌ Update status error:', error.message);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Get Driver Stats
    app.get('/api/driver/stats', (req, res) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ success: false, error: 'Token required' });

        const result = this.getDriverStats(token);
        res.json(result);
      } catch (error) {
        console.error('❌ Stats error:', error.message);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    console.log('✅ Driver API routes registered');
  }
}

// Export singleton instance
module.exports = new DriverAPI();

