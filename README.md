# Tow Riders - Backend API

Simple Express.js backend for Tow Riders platform.

## Quick Start

```bash
# Install dependencies
npm install

# Start server
npm start
```

Server will run on: `http://localhost:5000`

## API Endpoints

### Health Check
```
GET /
GET /health
```

### Bookings
```
POST /api/booking
GET  /api/bookings
```

### Contact
```
POST /api/contact
```

### Partner
```
POST /api/partner
```

## Example Request

```bash
curl -X POST http://localhost:5000/api/booking \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "John Doe",
    "phone": "916-555-0123",
    "service": "Emergency Tow",
    "pickupAddress": "Sacramento, CA"
  }'
```

## Environment Variables

Create `.env` file:

```
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:8000
FRONTEND_URL=http://localhost:8000
```

## Deployment

### Railway

1. Connect this repo
2. Railway auto-detects Node.js
3. Set environment variables
4. Deploy

### Render

1. Create new Web Service
2. Connect repo
3. Build: `npm install`
4. Start: `npm start`

## Tech Stack

- Node.js
- Express.js
- CORS
- dotenv

## License

Proprietary - Tow Riders
