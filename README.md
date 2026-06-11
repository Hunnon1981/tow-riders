# Tow Riders - Production Backend

## Live Backend API

This folder contains the production-ready backend for Tow Riders deployed on Railway.

### Included Files:
- Express.js server
- Stripe payment integration
- Email automation (Resend)
- Social media automation (disabled by default)
- All required dependencies

### Deployment:
- Platform: Railway
- Auto-deploy: Enabled (push to main branch)
- Database: PostgreSQL (Railway)

### Structure:
```
backend/
├── server.js                           # Main Express server
├── package.json                        # Dependencies
├── .env.example                        # Environment variables template
├── .gitignore                          # Git ignore rules
├── src/
│   ├── services/
│   │   └── metaGraphAPI.js            # Social media integration
│   ├── controllers/
│   │   └── socialController.js        # Social media handlers
│   └── routes/
│       └── social.js                   # Social media routes
```

### Required Environment Variables (Railway):
```
# Server
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://towriders.com

# Business Info
BUSINESS_EMAIL=services@towriders.com
BUSINESS_PHONE=+19255469711

# Stripe Payments
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Email (Resend)
RESEND_API_KEY=re_xxxxx

# Social Media (Optional - Disabled by default)
SOCIAL_AUTOMATION_ENABLED=false
META_PAGE_ACCESS_TOKEN=
FACEBOOK_PAGE_ID=
INSTAGRAM_BUSINESS_ACCOUNT_ID=
```

### Notes:
- Do NOT upload .env file to GitHub (contains secrets)
- Use .env.example as template
- Add real values in Railway dashboard
- Social automation is disabled by default for safety
