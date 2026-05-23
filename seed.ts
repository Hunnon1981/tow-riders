/**
 * Database Seed Script
 * Creates initial data for development and testing
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default admin user
  const adminPassword = await bcrypt.hash('ChangeThis123!', 10);
  
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@expresstow.com' },
    update: {},
    create: {
      email: 'admin@expresstow.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'admin'
    }
  });

  console.log('✅ Created admin user:', admin.email);

  // Create default pricing configuration
  const pricingConfig = await prisma.pricingConfig.upsert({
    where: { id: '1' },
    update: {},
    create: {
      id: '1',
      baseFee: 100.00,
      perMileRate: 5.50,
      minimumServiceFee: 75.00,
      lateNightSurcharge: 60.00,
      nightSurcharge: 40.00,
      rushHourSurcharge: 35.00,
      weekendSurcharge: 25.00,
      holidaySurcharge: 75.00,
      emergencySurcharge: 30.00,
      vehicleSurcharges: {
        sedan: 0,
        suv: 25,
        truck: 50,
        motorcycle: -20
      },
      recoverySurcharges: {
        drivable: 0,
        minor: 50,
        moderate: 100,
        major: 200
      },
      difficultySurcharges: {
        easy: { min: 0, max: 25 },
        medium: { min: 25, max: 75 },
        hard: { min: 75, max: 150 }
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  console.log('✅ Created pricing configuration');

  // Create sample bookings (optional for testing)
  const sampleBookings = [
    {
      bookingNumber: 'TOW-SAMPLE-001',
      customerName: 'John Doe',
      customerPhone: '+15551234567',
      customerEmail: 'john@example.com',
      pickupAddress: '123 Main St, Sacramento, CA',
      pickupLat: 38.5816,
      pickupLng: -121.4944,
      dropoffAddress: '456 Oak Ave, Sacramento, CA',
      dropoffLat: 38.6000,
      dropoffLng: -121.5000,
      vehicleType: 'sedan',
      condition: 'drivable',
      isEmergency: false,
      distanceMiles: 5.2,
      calculatedPrice: 128.60,
      status: 'completed',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      bookingNumber: 'TOW-SAMPLE-002',
      customerName: 'Jane Smith',
      customerPhone: '+15559876543',
      customerEmail: 'jane@example.com',
      pickupAddress: '789 Elm St, Sacramento, CA',
      pickupLat: 38.5700,
      pickupLng: -121.4800,
      dropoffAddress: '321 Pine St, Sacramento, CA',
      dropoffLat: 38.5900,
      dropoffLng: -121.5100,
      vehicleType: 'suv',
      condition: 'moderate',
      isEmergency: true,
      wheelsRoll: 'no',
      steeringWorks: 'yes',
      stuckLocation: 'parking',
      transmissionType: 'automatic',
      accessibility: 'medium',
      distanceMiles: 8.5,
      calculatedPrice: 285.75,
      difficultyScore: 45,
      difficultyLevel: 'medium',
      difficultyFee: 53.57,
      estimatedLoadingMinutes: 18,
      status: 'pending',
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
    }
  ];

  for (const booking of sampleBookings) {
    await prisma.booking.upsert({
      where: { bookingNumber: booking.bookingNumber },
      update: {},
      create: booking as any
    });
    console.log(`✅ Created sample booking: ${booking.bookingNumber}`);
  }

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
