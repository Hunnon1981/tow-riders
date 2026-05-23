const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (optional - remove in production)
  console.log('🗑️  Clearing existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.partner.deleteMany();
  await prisma.serviceArea.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.user.deleteMany();

  // Seed Users
  console.log('👤 Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@expresstow.com',
      password: hashedPassword,
      name: 'Super Administrator',
      phone: '+1-650-274-6703',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@expresstow.com',
      password: hashedPassword,
      name: 'Admin User',
      phone: '+1-650-274-6704',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const dispatcher = await prisma.user.create({
    data: {
      email: 'dispatcher@expresstow.com',
      password: hashedPassword,
      name: 'Dispatch Manager',
      phone: '+1-650-274-6705',
      role: 'DISPATCHER',
      status: 'ACTIVE',
    },
  });

  console.log(`✅ Created ${3} users`);

  // Seed Customers
  console.log('👥 Creating customers...');
  const customers = await prisma.customer.createMany({
    data: [
      {
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '+1-916-555-0101',
        address: '123 Main St',
        city: 'Sacramento',
        state: 'CA',
        zipCode: '95814',
        isVIP: true,
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah.j@example.com',
        phone: '+1-916-555-0102',
        address: '456 Oak Ave',
        city: 'Sacramento',
        state: 'CA',
        zipCode: '95815',
      },
      {
        name: 'Michael Brown',
        email: 'mbrown@example.com',
        phone: '+1-916-555-0103',
        address: '789 Pine Rd',
        city: 'Roseville',
        state: 'CA',
        zipCode: '95678',
      },
    ],
  });

  console.log(`✅ Created customers`);

  // Seed Drivers
  console.log('🚗 Creating drivers...');
  const driver1 = await prisma.driver.create({
    data: {
      name: 'Michael Anderson',
      email: 'manderson@expresstow.com',
      phone: '+1-916-555-1001',
      licenseNumber: 'CA-DL-123456',
      licenseState: 'CA',
      licenseExpiry: new Date('2025-12-31'),
      address: '100 Driver Lane',
      city: 'Sacramento',
      state: 'CA',
      zipCode: '95814',
      status: 'ON_DUTY',
      isAvailable: true,
      rating: 4.8,
      totalJobs: 150,
    },
  });

  const driver2 = await prisma.driver.create({
    data: {
      name: 'James Wilson',
      email: 'jwilson@expresstow.com',
      phone: '+1-916-555-1002',
      licenseNumber: 'CA-DL-789012',
      licenseState: 'CA',
      licenseExpiry: new Date('2026-06-30'),
      address: '200 Towing Blvd',
      city: 'Sacramento',
      state: 'CA',
      zipCode: '95815',
      status: 'ON_DUTY',
      isAvailable: true,
      rating: 4.9,
      totalJobs: 220,
    },
  });

  console.log(`✅ Created ${2} drivers`);

  // Seed Vehicles
  console.log('🚛 Creating vehicles...');
  await prisma.vehicle.createMany({
    data: [
      {
        year: '2022',
        make: 'Ford',
        model: 'F-550 Flatbed',
        vin: '1FDUF5GT0NEA12345',
        plate: 'TOW-001',
        color: 'White',
        category: 'FLATBED',
        capacity: 12000,
        driverId: driver1.id,
        status: 'ACTIVE',
        mileage: 45000,
      },
      {
        year: '2023',
        make: 'Chevrolet',
        model: 'Silverado 4500 Wheel Lift',
        vin: '1GB6G5BG5P1234567',
        plate: 'TOW-002',
        color: 'Blue',
        category: 'WHEEL_LIFT',
        capacity: 10000,
        driverId: driver2.id,
        status: 'ACTIVE',
        mileage: 28000,
      },
    ],
  });

  console.log(`✅ Created vehicles`);

  // Seed Partners
  console.log('🤝 Creating partners...');
  await prisma.partner.createMany({
    data: [
      {
        companyName: 'AAA Roadside Assistance',
        contactName: 'David Miller',
        email: 'dmiller@aaa.com',
        phone: '+1-916-555-2001',
        businessType: 'Roadside Assistance',
        address: '500 Insurance Way',
        city: 'Sacramento',
        state: 'CA',
        zipCode: '95814',
        status: 'ACTIVE',
        commissionRate: 15.0,
        rating: 4.7,
        totalJobs: 85,
      },
      {
        companyName: 'Quick Tow Network',
        contactName: 'Lisa Chen',
        email: 'lchen@quicktow.com',
        phone: '+1-916-555-2002',
        businessType: 'Towing Network',
        address: '600 Partner Plaza',
        city: 'Roseville',
        state: 'CA',
        zipCode: '95678',
        status: 'PENDING',
      },
    ],
  });

  console.log(`✅ Created partners`);

  // Seed Service Areas
  console.log('📍 Creating service areas...');
  await prisma.serviceArea.createMany({
    data: [
      {
        name: 'Downtown Sacramento',
        description: 'Central Sacramento business district',
        city: 'Sacramento',
        state: 'CA',
        zipCodes: ['95814', '95815', '95816', '95817'],
        centerLat: 38.5816,
        centerLng: -121.4944,
        radius: 5.0,
        isActive: true,
        priceMultiplier: 1.0,
      },
      {
        name: 'Roseville Area',
        description: 'Roseville and surrounding suburbs',
        city: 'Roseville',
        state: 'CA',
        zipCodes: ['95661', '95678', '95747'],
        centerLat: 38.7521,
        centerLng: -121.2880,
        radius: 10.0,
        isActive: true,
        priceMultiplier: 1.1,
      },
      {
        name: 'Folsom Area',
        description: 'Folsom and El Dorado Hills',
        city: 'Folsom',
        state: 'CA',
        zipCodes: ['95630', '95762'],
        centerLat: 38.6780,
        centerLng: -121.1760,
        radius: 8.0,
        isActive: true,
        priceMultiplier: 1.15,
      },
    ],
  });

  console.log(`✅ Created service areas`);

  // Seed Pricing Rules
  console.log('💰 Creating pricing rules...');
  await prisma.pricingRule.createMany({
    data: [
      {
        name: 'Base Fee',
        description: 'Standard base fee for all towing services',
        type: 'BASE_FEE',
        config: { amount: 100.00 },
        isActive: true,
        priority: 100,
      },
      {
        name: 'Per Mile Rate',
        description: 'Cost per mile for towing distance',
        type: 'PER_MILE',
        config: { rate: 5.50 },
        isActive: true,
        priority: 90,
      },
      {
        name: 'Late Night Surcharge',
        description: 'Additional fee for services between 12 AM - 6 AM',
        type: 'TIME_SURCHARGE',
        config: { 
          amount: 60.00,
          timeRange: { start: '00:00', end: '06:00' }
        },
        conditions: { 
          timeOfDay: 'late_night'
        },
        isActive: true,
        priority: 80,
      },
      {
        name: 'Weekend Surcharge',
        description: 'Additional fee for weekend services',
        type: 'TIME_SURCHARGE',
        config: { amount: 25.00 },
        conditions: { 
          daysOfWeek: [0, 6] // Sunday, Saturday
        },
        isActive: true,
        priority: 70,
      },
      {
        name: 'Heavy Duty Vehicle',
        description: 'Additional fee for heavy duty vehicles',
        type: 'VEHICLE_SURCHARGE',
        config: { amount: 50.00 },
        conditions: { 
          vehicleType: 'HEAVY_DUTY'
        },
        isActive: true,
        priority: 60,
      },
    ],
  });

  console.log(`✅ Created pricing rules`);

  // Seed Settings
  console.log('⚙️  Creating settings...');
  await prisma.setting.createMany({
    data: [
      {
        key: 'company_name',
        value: 'EXPRESS TOW',
        type: 'STRING',
        category: 'company',
        label: 'Company Name',
        description: 'Business name displayed throughout the platform',
        isPublic: true,
      },
      {
        key: 'company_phone',
        value: '(650) 274-6703',
        type: 'STRING',
        category: 'company',
        label: 'Company Phone',
        description: 'Main business phone number',
        isPublic: true,
      },
      {
        key: 'company_email',
        value: 'info@expresstow.com',
        type: 'STRING',
        category: 'company',
        label: 'Company Email',
        description: 'Main business email address',
        isPublic: true,
      },
      {
        key: 'minimum_service_fee',
        value: '75.00',
        type: 'NUMBER',
        category: 'pricing',
        label: 'Minimum Service Fee',
        description: 'Minimum charge for any towing service',
        isPublic: false,
      },
      {
        key: 'max_tow_distance',
        value: '50',
        type: 'NUMBER',
        category: 'service',
        label: 'Maximum Tow Distance',
        description: 'Maximum distance for a single tow (in miles)',
        isPublic: false,
      },
      {
        key: 'enable_sms_notifications',
        value: 'true',
        type: 'BOOLEAN',
        category: 'notifications',
        label: 'Enable SMS Notifications',
        description: 'Send SMS notifications to customers',
        isPublic: false,
      },
      {
        key: 'enable_email_notifications',
        value: 'true',
        type: 'BOOLEAN',
        category: 'notifications',
        label: 'Enable Email Notifications',
        description: 'Send email notifications to customers',
        isPublic: false,
      },
      {
        key: 'business_hours',
        value: JSON.stringify({
          monday: { open: '00:00', close: '23:59', is24Hours: true },
          tuesday: { open: '00:00', close: '23:59', is24Hours: true },
          wednesday: { open: '00:00', close: '23:59', is24Hours: true },
          thursday: { open: '00:00', close: '23:59', is24Hours: true },
          friday: { open: '00:00', close: '23:59', is24Hours: true },
          saturday: { open: '00:00', close: '23:59', is24Hours: true },
          sunday: { open: '00:00', close: '23:59', is24Hours: true },
        }),
        type: 'JSON',
        category: 'company',
        label: 'Business Hours',
        description: '24/7 towing service availability',
        isPublic: true,
      },
    ],
  });

  console.log(`✅ Created settings`);

  // Get the created customer IDs
  const allCustomers = await prisma.customer.findMany();
  
  // Seed Sample Bookings
  console.log('📋 Creating sample bookings...');
  
  const booking1 = await prisma.booking.create({
    data: {
      bookingNumber: 'TOW-2024-000001',
      customerId: allCustomers[0].id,
      customerName: allCustomers[0].name,
      customerPhone: allCustomers[0].phone,
      customerEmail: allCustomers[0].email,
      pickupAddress: '123 Main St, Sacramento, CA 95814',
      pickupLat: 38.5816,
      pickupLng: -121.4944,
      pickupCity: 'Sacramento',
      pickupState: 'CA',
      pickupZipCode: '95814',
      dropoffAddress: '456 Oak Ave, Sacramento, CA 95815',
      dropoffLat: 38.5897,
      dropoffLng: -121.4874,
      dropoffCity: 'Sacramento',
      dropoffState: 'CA',
      dropoffZipCode: '95815',
      serviceType: 'EMERGENCY_TOW',
      vehicleType: 'SEDAN',
      condition: 'NON_DRIVABLE_MINOR',
      vehicleYear: '2018',
      vehicleMake: 'Honda',
      vehicleModel: 'Accord',
      vehicleColor: 'Silver',
      distance: 5.2,
      estimatedTime: 25,
      baseFee: 100.00,
      distanceFee: 28.60,
      vehicleFee: 0.00,
      timeFee: 0.00,
      emergencyFee: 30.00,
      recoveryFee: 50.00,
      difficultyFee: 0.00,
      totalPrice: 208.60,
      status: 'PENDING',
      driverId: driver1.id,
      assignedAt: new Date(),
      assignedBy: dispatcher.id,
    },
  });

  await prisma.booking.create({
    data: {
      bookingNumber: 'TOW-2024-000002',
      customerId: allCustomers[1].id,
      customerName: allCustomers[1].name,
      customerPhone: allCustomers[1].phone,
      customerEmail: allCustomers[1].email,
      pickupAddress: '789 Pine Rd, Roseville, CA 95678',
      pickupLat: 38.7521,
      pickupLng: -121.2880,
      dropoffAddress: '100 Service Way, Roseville, CA 95678',
      dropoffLat: 38.7542,
      dropoffLng: -121.2795,
      serviceType: 'SCHEDULED_TOW',
      vehicleType: 'SUV',
      condition: 'DRIVABLE',
      vehicleYear: '2020',
      vehicleMake: 'Toyota',
      vehicleModel: 'RAV4',
      vehicleColor: 'Blue',
      distance: 3.8,
      estimatedTime: 20,
      baseFee: 100.00,
      distanceFee: 20.90,
      vehicleFee: 25.00,
      timeFee: 0.00,
      emergencyFee: 0.00,
      recoveryFee: 0.00,
      difficultyFee: 0.00,
      totalPrice: 145.90,
      status: 'COMPLETED',
      driverId: driver2.id,
      assignedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      assignedBy: dispatcher.id,
      completedAt: new Date(),
    },
  });

  console.log(`✅ Created sample bookings`);

  // Create a sample notification
  console.log('🔔 Creating sample notifications...');
  await prisma.notification.createMany({
    data: [
      {
        userId: dispatcher.id,
        title: 'New Booking Request',
        message: 'Emergency tow request from John Smith in Sacramento',
        type: 'BOOKING',
        priority: 'HIGH',
        relatedId: booking1.id,
        relatedType: 'booking',
        actionUrl: `/admin/bookings.html?id=${booking1.id}`,
        actionLabel: 'View Booking',
      },
      {
        userId: admin.id,
        title: 'New Partner Application',
        message: 'Quick Tow Network has submitted a partnership application',
        type: 'PARTNER',
        priority: 'NORMAL',
        actionUrl: '/admin/partners.html',
        actionLabel: 'Review Application',
      },
    ],
  });

  console.log(`✅ Created notifications`);

  console.log('✨ Database seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   Users: 3 (Super Admin, Admin, Dispatcher)`);
  console.log(`   Customers: 3`);
  console.log(`   Drivers: 2`);
  console.log(`   Vehicles: 2`);
  console.log(`   Partners: 2`);
  console.log(`   Service Areas: 3`);
  console.log(`   Pricing Rules: 5`);
  console.log(`   Settings: 8`);
  console.log(`   Bookings: 2`);
  console.log(`   Notifications: 2`);
  console.log('\n🔐 Default Login Credentials:');
  console.log(`   Super Admin: superadmin@expresstow.com / password123`);
  console.log(`   Admin: admin@expresstow.com / password123`);
  console.log(`   Dispatcher: dispatcher@expresstow.com / password123`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
