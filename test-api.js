// Test script for Tow Riders Backend API

const API_BASE_URL = 'http://localhost:5000';

console.log('🧪 Testing Tow Riders Backend API...\n');

// Test 1: Health Check
async function testHealthCheck() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    console.log('✅ Health Check:', data.status);
    console.log('   Message:', data.message);
  } catch (error) {
    console.log('❌ Health Check Failed:', error.message);
  }
}

// Test 2: Create Booking
async function testCreateBooking() {
  try {
    const bookingData = {
      customerName: 'Test Customer',
      phone: '916-555-0123',
      email: 'test@example.com',
      service: 'Emergency Tow',
      pickupAddress: 'Sacramento, CA',
      dropoffAddress: 'Elk Grove, CA',
      vehicleMake: 'Toyota',
      vehicleModel: 'Camry',
      vehicleYear: '2020'
    };

    const response = await fetch(`${API_BASE_URL}/api/booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData)
    });

    const data = await response.json();
    console.log('\n✅ Booking Created:', data.success);
    console.log('   Booking ID:', data.bookingId);
    console.log('   Message:', data.message);
  } catch (error) {
    console.log('❌ Booking Creation Failed:', error.message);
  }
}

// Run tests
(async () => {
  console.log('Starting tests...\n');
  await testHealthCheck();
  await testCreateBooking();
  console.log('\n✅ All tests completed!\n');
})();
