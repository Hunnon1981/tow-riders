// ====================
// META WEBHOOK ROUTES
// ====================
// Purpose: Route definitions for Facebook Messenger and Instagram DM webhooks
// Phase 3: Webhook Handling
// Status: SAFE - Test mode until OPENAI_API_KEY configured
// ====================

const express = require('express');
const router = express.Router();
const metaWebhookController = require('./metaWebhookController');

// ====================
// WEBHOOK VERIFICATION (GET)
// ====================
// Meta calls this endpoint to verify webhook ownership
// URL: GET /api/meta/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE

router.get('/', metaWebhookController.verifyWebhook);

// ====================
// WEBHOOK EVENTS (POST)
// ====================
// Meta sends incoming messages to this endpoint
// URL: POST /api/meta/webhook
// Body: JSON webhook event (message, postback, etc.)

router.post('/', metaWebhookController.handleWebhook);

// ====================
// WEBHOOK STATUS (GET)
// ====================
// Check webhook configuration and status
// URL: GET /api/meta/webhook/status
// Returns: JSON with webhook status, AI service status, configuration

router.get('/status', metaWebhookController.getWebhookStatus);

// Export router
module.exports = router;
