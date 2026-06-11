// ================================================
// SOCIAL MEDIA ROUTES
// API endpoints for social automation
// ================================================

const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');

// ================================================
// CONFIGURATION & STATUS
// ================================================

/**
 * GET /api/social/config
 * Check social automation configuration and status
 */
router.get('/config', socialController.getConfiguration);

// ================================================
// ACCOUNT INFORMATION
// ================================================

/**
 * GET /api/social/accounts/facebook
 * Get Facebook Page information (for testing connection)
 */
router.get('/accounts/facebook', socialController.getFacebookPageInfo);

/**
 * GET /api/social/accounts/instagram
 * Get Instagram Business Account information (for testing connection)
 */
router.get('/accounts/instagram', socialController.getInstagramAccountInfo);

// ================================================
// DRAFT MODE (Safe Testing)
// ================================================

/**
 * POST /api/social/test-draft
 * Create a draft post without publishing
 * Body: { platform, message, imageUrl, link, caption }
 */
router.post('/test-draft', socialController.createTestDraft);

/**
 * GET /api/social/drafts
 * List all drafts
 */
router.get('/drafts', socialController.listDrafts);

/**
 * GET /api/social/drafts/:draftId
 * Get specific draft by ID
 */
router.get('/drafts/:draftId', socialController.getDraft);

/**
 * DELETE /api/social/drafts/:draftId
 * Delete a draft
 */
router.delete('/drafts/:draftId', socialController.deleteDraft);

// ================================================
// VALIDATION (No Publishing)
// ================================================

/**
 * POST /api/social/validate
 * Validate post content without publishing
 * Body: { platform, message, imageUrl, link, caption }
 */
router.post('/validate', socialController.validatePost);

// ================================================
// LIVE POSTING (Only if enabled)
// ================================================

/**
 * POST /api/social/test-post
 * Test posting to Facebook/Instagram (LIVE if enabled)
 * ⚠️ Only posts if SOCIAL_AUTOMATION_ENABLED=true
 * Body: { platform, message, imageUrl, link, caption }
 */
router.post('/test-post', socialController.testPost);

/**
 * POST /api/social/publish/:draftId
 * Publish a draft post (LIVE if enabled)
 * ⚠️ Only posts if SOCIAL_AUTOMATION_ENABLED=true
 */
router.post('/publish/:draftId', socialController.publishDraft);

// ================================================
// SCHEDULING (Future Enhancement)
// ================================================

/**
 * POST /api/social/schedule
 * Schedule a post for future publishing
 * Body: { platform, message, imageUrl, link, caption, scheduledTime }
 */
router.post('/schedule', socialController.schedulePost);

module.exports = router;
