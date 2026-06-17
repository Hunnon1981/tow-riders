// ================================================
// META GRAPH API SERVICE
// Facebook & Instagram Posting Integration
// ================================================
// Status: INACTIVE by default
// Controlled by: SOCIAL_AUTOMATION_ENABLED environment variable
// ================================================

const axios = require('axios');

class MetaGraphAPI {
  constructor() {
    this.accessToken = process.env.META_PAGE_ACCESS_TOKEN;
    this.facebookPageId = process.env.FACEBOOK_PAGE_ID;
    this.instagramAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    this.baseURL = 'https://graph.facebook.com/v19.0';
    this.enabled = process.env.SOCIAL_AUTOMATION_ENABLED === 'true';
  }

  // ================================================
  // SAFETY CHECK
  // ================================================
  
  /**
   * Check if social automation is properly configured and enabled
   * @returns {object} - { enabled: boolean, errors: array }
   */
  checkConfiguration() {
    const errors = [];

    if (!this.enabled) {
      errors.push('SOCIAL_AUTOMATION_ENABLED is not set to "true"');
    }

    if (!this.accessToken) {
      errors.push('META_PAGE_ACCESS_TOKEN is not configured');
    }

    if (!this.facebookPageId) {
      errors.push('FACEBOOK_PAGE_ID is not configured');
    }

    if (!this.instagramAccountId) {
      errors.push('INSTAGRAM_BUSINESS_ACCOUNT_ID is not configured');
    }

    return {
      enabled: errors.length === 0,
      errors,
      config: {
        automationEnabled: this.enabled,
        hasAccessToken: !!this.accessToken,
        hasFacebookPageId: !!this.facebookPageId,
        hasInstagramAccountId: !!this.instagramAccountId
      }
    };
  }

  // ================================================
  // FACEBOOK PAGE POSTING
  // ================================================

  /**
   * Post to Facebook Page (LIVE)
   * ⚠️ Only posts if SOCIAL_AUTOMATION_ENABLED=true
   * @param {string} message - Post caption/text
   * @param {string} imageUrl - (Optional) Image URL to post
   * @param {string} link - (Optional) Link to share
   * @returns {object} - Meta API response
   */
  async postToFacebook(message, imageUrl = null, link = null) {
    const configCheck = this.checkConfiguration();
    
    if (!configCheck.enabled) {
      throw new Error(`Social automation is disabled. Errors: ${configCheck.errors.join(', ')}`);
    }

    const url = `${this.baseURL}/${this.facebookPageId}/feed`;
    const postData = {
      message,
      access_token: this.accessToken
    };

    if (imageUrl) {
      // If posting with image, use /photos endpoint instead
      return this.postFacebookPhoto(message, imageUrl);
    }

    if (link) {
      postData.link = link;
    }

    try {
      const response = await axios.post(url, postData);
      
      console.log('✅ Facebook post published:', response.data.id);
      
      return {
        success: true,
        platform: 'facebook',
        postId: response.data.id,
        message: 'Post published to Facebook successfully'
      };
    } catch (error) {
      console.error('❌ Facebook posting error:', error.response?.data || error.message);
      throw new Error(`Facebook posting failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Post photo to Facebook Page (LIVE)
   * @param {string} caption - Photo caption
   * @param {string} imageUrl - Image URL (must be publicly accessible)
   * @returns {object} - Meta API response
   */
  async postFacebookPhoto(caption, imageUrl) {
    const configCheck = this.checkConfiguration();
    
    if (!configCheck.enabled) {
      throw new Error(`Social automation is disabled. Errors: ${configCheck.errors.join(', ')}`);
    }

    const url = `${this.baseURL}/${this.facebookPageId}/photos`;
    
    try {
      const response = await axios.post(url, {
        url: imageUrl,
        caption,
        access_token: this.accessToken
      });

      console.log('✅ Facebook photo published:', response.data.id);

      return {
        success: true,
        platform: 'facebook',
        postId: response.data.id,
        postUrl: `https://www.facebook.com/${response.data.id}`,
        message: 'Photo published to Facebook successfully'
      };
    } catch (error) {
      console.error('❌ Facebook photo posting error:', error.response?.data || error.message);
      throw new Error(`Facebook photo posting failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // ================================================
  // INSTAGRAM BUSINESS POSTING
  // ================================================

  /**
   * Post to Instagram Business Account (LIVE)
   * ⚠️ Instagram requires 2-step process: create container → publish
   * ⚠️ Only posts if SOCIAL_AUTOMATION_ENABLED=true
   * @param {string} imageUrl - Image URL (must be publicly accessible)
   * @param {string} caption - Post caption (max 2200 chars)
   * @returns {object} - Meta API response
   */
  async postToInstagram(imageUrl, caption) {
    const configCheck = this.checkConfiguration();
    
    if (!configCheck.enabled) {
      throw new Error(`Social automation is disabled. Errors: ${configCheck.errors.join(', ')}`);
    }

    try {
      // Step 1: Create media container
      const containerId = await this.createInstagramContainer(imageUrl, caption);
      
      // Step 2: Publish the container
      const publishResult = await this.publishInstagramContainer(containerId);

      console.log('✅ Instagram post published:', publishResult.id);

      return {
        success: true,
        platform: 'instagram',
        postId: publishResult.id,
        message: 'Post published to Instagram successfully'
      };
    } catch (error) {
      console.error('❌ Instagram posting error:', error.response?.data || error.message);
      throw new Error(`Instagram posting failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Step 1: Create Instagram media container
   * @private
   */
  async createInstagramContainer(imageUrl, caption) {
    const url = `${this.baseURL}/${this.instagramAccountId}/media`;
    
    const response = await axios.post(url, {
      image_url: imageUrl,
      caption,
      access_token: this.accessToken
    });

    return response.data.id;
  }

  /**
   * Step 2: Publish Instagram media container
   * @private
   */
  async publishInstagramContainer(containerId) {
    const url = `${this.baseURL}/${this.instagramAccountId}/media_publish`;
    
    const response = await axios.post(url, {
      creation_id: containerId,
      access_token: this.accessToken
    });

    return response.data;
  }

  // ================================================
  // DRAFT MODE - VALIDATION ONLY
  // ================================================

  /**
   * Validate post without publishing (DRAFT MODE)
   * Tests configuration and simulates posting
   * @param {string} platform - 'facebook' or 'instagram'
   * @param {object} postData - Post content
   * @returns {object} - Validation result
   */
  async validatePost(platform, postData) {
    const configCheck = this.checkConfiguration();
    
    const validation = {
      platform,
      postData,
      configCheck,
      validation: {
        messageLength: postData.message?.length || postData.caption?.length || 0,
        hasImage: !!postData.imageUrl,
        hasLink: !!postData.link,
        warnings: [],
        errors: []
      },
      wouldPublish: false
    };

    // Check message length
    if (platform === 'facebook') {
      if (validation.validation.messageLength > 63206) {
        validation.validation.errors.push('Facebook message exceeds 63,206 character limit');
      }
      if (validation.validation.messageLength === 0 && !postData.imageUrl && !postData.link) {
        validation.validation.errors.push('Facebook post needs message, image, or link');
      }
    }

    if (platform === 'instagram') {
      if (!postData.imageUrl) {
        validation.validation.errors.push('Instagram post requires an image');
      }
      if (validation.validation.messageLength > 2200) {
        validation.validation.errors.push('Instagram caption exceeds 2,200 character limit');
      }
    }

    // Check if would publish
    validation.wouldPublish = configCheck.enabled && validation.validation.errors.length === 0;

    return validation;
  }

  /**
   * Create draft post (logging only, no publishing)
   * @param {string} platform - 'facebook', 'instagram', or 'both'
   * @param {object} postData - Post content
   * @returns {object} - Draft details
   */
  async createDraft(platform, postData) {
    const timestamp = new Date().toISOString();
    const draft = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      platform,
      postData,
      createdAt: timestamp,
      status: 'draft',
      published: false
    };

    // Validate each platform
    if (platform === 'facebook' || platform === 'both') {
      draft.facebookValidation = await this.validatePost('facebook', postData);
    }

    if (platform === 'instagram' || platform === 'both') {
      draft.instagramValidation = await this.validatePost('instagram', postData);
    }

    console.log('📝 Draft created:', draft.id);
    
    return draft;
  }

  // ================================================
  // PUBLISH DRAFT (when ready)
  // ================================================

  /**
   * Publish a draft post (LIVE)
   * ⚠️ Only publishes if SOCIAL_AUTOMATION_ENABLED=true
   * @param {object} draft - Draft object from createDraft()
   * @returns {object} - Publishing results
   */
  async publishDraft(draft) {
    const configCheck = this.checkConfiguration();
    
    if (!configCheck.enabled) {
      return {
        success: false,
        message: 'Social automation is disabled',
        errors: configCheck.errors,
        draftId: draft.id
      };
    }

    const results = {
      draftId: draft.id,
      platform: draft.platform,
      facebook: null,
      instagram: null,
      errors: []
    };

    try {
      // Publish to Facebook
      if (draft.platform === 'facebook' || draft.platform === 'both') {
        try {
          results.facebook = await this.postToFacebook(
            draft.postData.message,
            draft.postData.imageUrl,
            draft.postData.link
          );
        } catch (error) {
          results.errors.push(`Facebook: ${error.message}`);
        }
      }

      // Publish to Instagram
      if (draft.platform === 'instagram' || draft.platform === 'both') {
        try {
          if (!draft.postData.imageUrl) {
            throw new Error('Instagram requires an image');
          }
          results.instagram = await this.postToInstagram(
            draft.postData.imageUrl,
            draft.postData.caption || draft.postData.message
          );
        } catch (error) {
          results.errors.push(`Instagram: ${error.message}`);
        }
      }

      results.success = results.errors.length === 0;
      return results;

    } catch (error) {
      results.success = false;
      results.errors.push(error.message);
      return results;
    }
  }

  // ================================================
  // ACCOUNT INFO (for testing)
  // ================================================

  /**
   * Get Facebook Page info (for verification)
   */
  async getFacebookPageInfo() {
    const configCheck = this.checkConfiguration();
    
    if (!this.accessToken || !this.facebookPageId) {
      throw new Error('Facebook credentials not configured');
    }

    const url = `${this.baseURL}/${this.facebookPageId}`;
    
    try {
      const response = await axios.get(url, {
        params: {
          fields: 'id,name,username,followers_count,fan_count',
          access_token: this.accessToken
        }
      });

      return {
        success: true,
        page: response.data,
        automationEnabled: this.enabled
      };
    } catch (error) {
      throw new Error(`Failed to fetch Facebook page info: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get Instagram Business Account info (for verification)
   */
  async getInstagramAccountInfo() {
    if (!this.accessToken || !this.instagramAccountId) {
      throw new Error('Instagram credentials not configured');
    }

    const url = `${this.baseURL}/${this.instagramAccountId}`;
    
    try {
      const response = await axios.get(url, {
        params: {
          fields: 'id,username,name,followers_count,media_count',
          access_token: this.accessToken
        }
      });

      return {
        success: true,
        account: response.data,
        automationEnabled: this.enabled
      };
    } catch (error) {
      throw new Error(`Failed to fetch Instagram account info: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

module.exports = MetaGraphAPI;
