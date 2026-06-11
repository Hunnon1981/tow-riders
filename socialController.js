// ================================================
// SOCIAL MEDIA CONTROLLER
// Handles social media automation requests
// ================================================

const MetaGraphAPI = require('../services/metaGraphAPI');

// In-memory draft storage (replace with database in production)
const drafts = new Map();

// ================================================
// CONFIGURATION CHECK
// ================================================

/**
 * GET /api/social/config
 * Check social automation configuration status
 */
exports.getConfiguration = async (req, res) => {
  try {
    const metaAPI = new MetaGraphAPI();
    const configCheck = metaAPI.checkConfiguration();

    res.json({
      success: true,
      ...configCheck,
      message: configCheck.enabled 
        ? 'Social automation is properly configured and enabled'
        : 'Social automation is disabled or not fully configured'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check configuration',
      error: error.message
    });
  }
};

// ================================================
// ACCOUNT INFO
// ================================================

/**
 * GET /api/social/accounts/facebook
 * Get Facebook Page information
 */
exports.getFacebookPageInfo = async (req, res) => {
  try {
    const metaAPI = new MetaGraphAPI();
    const pageInfo = await metaAPI.getFacebookPageInfo();

    res.json({
      success: true,
      ...pageInfo
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to fetch Facebook page info',
      error: error.message
    });
  }
};

/**
 * GET /api/social/accounts/instagram
 * Get Instagram Business Account information
 */
exports.getInstagramAccountInfo = async (req, res) => {
  try {
    const metaAPI = new MetaGraphAPI();
    const accountInfo = await metaAPI.getInstagramAccountInfo();

    res.json({
      success: true,
      ...accountInfo
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to fetch Instagram account info',
      error: error.message
    });
  }
};

// ================================================
// DRAFT MODE (Safe Testing)
// ================================================

/**
 * POST /api/social/test-draft
 * Create a draft post without publishing
 * Body: { platform, message, imageUrl, link, caption }
 */
exports.createTestDraft = async (req, res) => {
  try {
    const { platform, message, imageUrl, link, caption } = req.body;

    if (!platform || !['facebook', 'instagram', 'both'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform. Must be "facebook", "instagram", or "both"'
      });
    }

    const metaAPI = new MetaGraphAPI();
    const draft = await metaAPI.createDraft(platform, {
      message,
      imageUrl,
      link,
      caption: caption || message
    });

    // Store draft in memory
    drafts.set(draft.id, draft);

    res.json({
      success: true,
      message: 'Draft created successfully (not published)',
      draft,
      note: 'This post was NOT published. It is only a draft for testing.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create draft',
      error: error.message
    });
  }
};

/**
 * GET /api/social/drafts
 * List all drafts
 */
exports.listDrafts = async (req, res) => {
  try {
    const allDrafts = Array.from(drafts.values());
    
    res.json({
      success: true,
      count: allDrafts.length,
      drafts: allDrafts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to list drafts',
      error: error.message
    });
  }
};

/**
 * GET /api/social/drafts/:draftId
 * Get specific draft
 */
exports.getDraft = async (req, res) => {
  try {
    const { draftId } = req.params;
    const draft = drafts.get(draftId);

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'Draft not found'
      });
    }

    res.json({
      success: true,
      draft
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get draft',
      error: error.message
    });
  }
};

/**
 * DELETE /api/social/drafts/:draftId
 * Delete a draft
 */
exports.deleteDraft = async (req, res) => {
  try {
    const { draftId } = req.params;
    
    if (!drafts.has(draftId)) {
      return res.status(404).json({
        success: false,
        message: 'Draft not found'
      });
    }

    drafts.delete(draftId);

    res.json({
      success: true,
      message: 'Draft deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete draft',
      error: error.message
    });
  }
};

// ================================================
// TEST POSTING (Only if enabled)
// ================================================

/**
 * POST /api/social/test-post
 * Test posting to Facebook/Instagram (LIVE if enabled)
 * ⚠️ Only posts if SOCIAL_AUTOMATION_ENABLED=true
 * Body: { platform, message, imageUrl, link, caption }
 */
exports.testPost = async (req, res) => {
  try {
    const { platform, message, imageUrl, link, caption } = req.body;

    if (!platform || !['facebook', 'instagram', 'both'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform. Must be "facebook", "instagram", or "both"'
      });
    }

    const metaAPI = new MetaGraphAPI();
    const configCheck = metaAPI.checkConfiguration();

    // Safety check
    if (!configCheck.enabled) {
      return res.status(403).json({
        success: false,
        message: 'Social automation is disabled',
        errors: configCheck.errors,
        config: configCheck.config,
        note: 'To enable, set SOCIAL_AUTOMATION_ENABLED=true and configure all required credentials'
      });
    }

    const results = {
      facebook: null,
      instagram: null,
      errors: []
    };

    // Post to Facebook
    if (platform === 'facebook' || platform === 'both') {
      try {
        results.facebook = await metaAPI.postToFacebook(message, imageUrl, link);
      } catch (error) {
        results.errors.push({ platform: 'facebook', error: error.message });
      }
    }

    // Post to Instagram
    if (platform === 'instagram' || platform === 'both') {
      try {
        if (!imageUrl) {
          throw new Error('Instagram requires an image URL');
        }
        results.instagram = await metaAPI.postToInstagram(imageUrl, caption || message);
      } catch (error) {
        results.errors.push({ platform: 'instagram', error: error.message });
      }
    }

    const success = results.errors.length === 0;

    res.status(success ? 200 : 207).json({
      success,
      message: success ? 'Post published successfully' : 'Post published with some errors',
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to test post',
      error: error.message
    });
  }
};

// ================================================
// PUBLISH DRAFT (when ready)
// ================================================

/**
 * POST /api/social/publish/:draftId
 * Publish a draft post (LIVE if enabled)
 * ⚠️ Only posts if SOCIAL_AUTOMATION_ENABLED=true
 */
exports.publishDraft = async (req, res) => {
  try {
    const { draftId } = req.params;
    const draft = drafts.get(draftId);

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'Draft not found'
      });
    }

    const metaAPI = new MetaGraphAPI();
    const configCheck = metaAPI.checkConfiguration();

    // Safety check
    if (!configCheck.enabled) {
      return res.status(403).json({
        success: false,
        message: 'Social automation is disabled',
        errors: configCheck.errors,
        config: configCheck.config,
        draftId: draft.id,
        note: 'To enable, set SOCIAL_AUTOMATION_ENABLED=true and configure all required credentials'
      });
    }

    const results = await metaAPI.publishDraft(draft);

    // Mark draft as published if successful
    if (results.success) {
      draft.status = 'published';
      draft.published = true;
      draft.publishedAt = new Date().toISOString();
      draft.results = results;
      drafts.set(draftId, draft);
    }

    res.json({
      success: results.success,
      message: results.success ? 'Draft published successfully' : 'Draft publishing failed',
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to publish draft',
      error: error.message
    });
  }
};

// ================================================
// VALIDATION (No publishing)
// ================================================

/**
 * POST /api/social/validate
 * Validate post content without publishing
 * Body: { platform, message, imageUrl, link, caption }
 */
exports.validatePost = async (req, res) => {
  try {
    const { platform, message, imageUrl, link, caption } = req.body;

    if (!platform || !['facebook', 'instagram', 'both'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform. Must be "facebook", "instagram", or "both"'
      });
    }

    const metaAPI = new MetaGraphAPI();
    const postData = {
      message,
      imageUrl,
      link,
      caption: caption || message
    };

    const validation = {
      facebook: null,
      instagram: null
    };

    if (platform === 'facebook' || platform === 'both') {
      validation.facebook = await metaAPI.validatePost('facebook', postData);
    }

    if (platform === 'instagram' || platform === 'both') {
      validation.instagram = await metaAPI.validatePost('instagram', postData);
    }

    res.json({
      success: true,
      message: 'Post validated (not published)',
      validation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to validate post',
      error: error.message
    });
  }
};

// ================================================
// SCHEDULED POSTING (Future Enhancement)
// ================================================

/**
 * POST /api/social/schedule
 * Schedule a post for future publishing
 * Body: { platform, message, imageUrl, link, caption, scheduledTime }
 */
exports.schedulePost = async (req, res) => {
  try {
    const { platform, message, imageUrl, link, caption, scheduledTime } = req.body;

    if (!platform || !['facebook', 'instagram', 'both'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform. Must be "facebook", "instagram", or "both"'
      });
    }

    if (!scheduledTime) {
      return res.status(400).json({
        success: false,
        message: 'scheduledTime is required (ISO 8601 format)'
      });
    }

    // Create draft with scheduling info
    const metaAPI = new MetaGraphAPI();
    const draft = await metaAPI.createDraft(platform, {
      message,
      imageUrl,
      link,
      caption: caption || message
    });

    draft.scheduledTime = scheduledTime;
    draft.status = 'scheduled';
    drafts.set(draft.id, draft);

    res.json({
      success: true,
      message: 'Post scheduled successfully (draft created, not yet published)',
      draft,
      note: 'Scheduled posting requires cron job implementation. Currently saved as draft.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to schedule post',
      error: error.message
    });
  }
};
