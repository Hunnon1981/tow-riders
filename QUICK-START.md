# 🚀 EXPRESS TOW BACKEND - QUICK START GUIDE

## ⚡ Fast Setup (5 Minutes)

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 14.0

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Setup Database
```bash
# Create PostgreSQL database
createdb express_tow_db

# Or using psql:
psql -U postgres
CREATE DATABASE express_tow_db;
\q
```

### Step 3: Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env and update these required fields:
# DATABASE_URL="postgresql://username:password@localhost:5432/express_tow_db"
# JWT_SECRET="your-strong-secret-key-at-least-32-characters-long"
# JWT_REFRESH_SECRET="another-strong-secret-key-different-from-above"
```

### Step 4: Run Database Migrations & Seed
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations (creates all tables)
npm run prisma:migrate

# Seed database with sample data
npm run prisma:seed
```

### Step 5: Start the Server
```bash
# Development mode (with hot-reload)
npm run dev

# Or production mode
npm start
```

**Server will be running at:** `http://localhost:5000`

---

## 🧪 Test the API

### 1. Health Check
```bash
curl http://localhost:5000/health
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@expresstow.com",
    "password": "password123"
  }'
```

Save the returned `token` for authenticated requests.

### 3. Get Dashboard Stats
```bash
curl http://localhost:5000/api/v1/reports/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Create a Booking
```bash
curl -X POST http://localhost:5000/api/v1/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "John Doe",
    "customerPhone": "+1-916-555-1234",
    "customerEmail": "john@example.com",
    "pickupAddress": "123 Main St, Sacramento, CA 95814",
    "dropoffAddress": "456 Oak Ave, Sacramento, CA 95815",
    "pickupLat": 38.5816,
    "pickupLng": -121.4944,
    "dropoffLat": 38.5897,
    "dropoffLng": -121.4874,
    "serviceType": "EMERGENCY_TOW",
    "vehicleType": "SEDAN",
    "distance": 5.2,
    "estimatedTime": 25,
    "baseFee": 100.00,
    "distanceFee": 28.60,
    "vehicleFee": 0.00,
    "timeFee": 0.00,
    "emergencyFee": 30.00,
    "recoveryFee": 0.00,
    "difficultyFee": 0.00,
    "totalPrice": 158.60
  }'
```

---

## 👥 Default Login Credentials

After running `npm run prisma:seed`, use these credentials:

### Super Admin
- Email: `superadmin@expresstow.com`
- Password: `password123`
- Role: SUPER_ADMIN

### Admin
- Email: `admin@expresstow.com`
- Password: `password123`
- Role: ADMIN

### Dispatcher
- Email: `dispatcher@expresstow.com`
- Password: `password123`
- Role: DISPATCHER

---

## 📊 Database Schema

The database includes these tables:
- `users` - System users with role-based access
- `customers` - Customer records
- `bookings` - Service bookings
- `drivers` - Driver profiles
- `vehicles` - Driver vehicles
- `partners` - Partner companies
- `service_areas` - Service coverage areas
- `pricing_rules` - Dynamic pricing configuration
- `payments` - Payment records
- `notifications` - User notifications
- `audit_logs` - System activity logs
- `settings` - System configuration
- `photos` - Booking photos

---

## 🔧 Useful Commands

```bash
# View database in browser
npm run prisma:studio

# Create new migration
npm run prisma:migrate

# Generate Prisma Client
npm run prisma:generate

# Run development server
npm run dev

# Run production server
npm start

# View database tables
psql -U postgres -d express_tow_db -c "\dt"
```

---

## 🌐 API Endpoints

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user

### Bookings
- `POST /bookings` - Create booking (public)
- `GET /bookings` - Get all bookings (auth required)
- `GET /bookings/:id` - Get booking by ID
- `PUT /bookings/:id` - Update booking
- `PATCH /bookings/:id/status` - Update status
- `POST /bookings/:id/assign` - Assign driver

### Customers
- `GET /customers` - Get all customers
- `GET /customers/:id` - Get customer by ID
- `POST /customers` - Create customer
- `PUT /customers/:id` - Update customer
- `DELETE /customers/:id` - Delete customer
- `GET /customers/:id/bookings` - Get customer bookings

### Reports
- `GET /reports/dashboard` - Get dashboard statistics

---

## 🔌 Integration with Frontend

### Update booking.html

Replace the form submission in `booking.js` with:

```javascript
// Submit booking to backend API
async function submitBooking(bookingData) {
  try {
    const response = await fetch('http://localhost:5000/api/v1/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData),
    });

    const result = await response.json();

    if (result.success) {
      // Redirect to confirmation page with booking number
      window.location.href = `booking-confirmation.html?id=${result.data.booking.id}&number=${result.data.booking.bookingNumber}`;
    } else {
      alert('Booking failed: ' + result.message);
    }
  } catch (error) {
    console.error('Error submitting booking:', error);
    alert('An error occurred. Please try again.');
  }
}
```

### Update admin pages

Replace `admin-data.js` imports with API calls:

```javascript
// Example: Fetch bookings for admin dashboard
async function loadBookings() {
  const token = localStorage.getItem('token'); // Store token after login

  const response = await fetch('http://localhost:5000/api/v1/bookings', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const result = await response.json();
  
  if (result.success) {
    displayBookings(result.data.bookings);
  }
}
```

---

## 🐛 Troubleshooting

### Database Connection Error
```
Error: P1001: Can't reach database server
```
**Solution**: Check PostgreSQL is running and DATABASE_URL in .env is correct.

### JWT Error
```
Error: JsonWebTokenError: invalid token
```
**Solution**: Make sure JWT_SECRET in .env matches what was used to generate the token.

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution**: Change PORT in .env or stop the process using port 5000:
```bash
# Find process
lsof -i :5000
# Kill process
kill -9 <PID>
```

### Prisma Migration Error
```
Error: P3018: Migration failed to apply
```
**Solution**: Reset database and re-run migrations:
```bash
npm run prisma:migrate -- --force
npm run prisma:seed
```

---

## 📝 Notes

- **IMPORTANT**: Change JWT secrets in production!
- **IMPORTANT**: Use strong passwords for database
- Default password for all seeded users is `password123`
- API uses JWT authentication with 24-hour token expiration
- Refresh tokens are valid for 7 days
- Rate limiting: 100 requests per 15 minutes per IP

---

## ✅ Verification Checklist

- [ ] PostgreSQL running
- [ ] Database created (express_tow_db)
- [ ] .env configured
- [ ] Dependencies installed
- [ ] Migrations run successfully
- [ ] Database seeded
- [ ] Server starts without errors
- [ ] Health check responds
- [ ] Can login with default credentials
- [ ] Can create a booking
- [ ] Can fetch dashboard stats

---

## 🎉 Next Steps

1. Test all API endpoints
2. Integrate with frontend (booking.html)
3. Update admin pages to use API
4. Configure email/SMS services (optional)
5. Setup payment gateway (optional)
6. Deploy to production

---

**Need help?** Check the full README.md for complete API documentation.
