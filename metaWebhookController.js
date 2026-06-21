// ====================
// META WEBHOOK CONTROLLER
// ====================
// Purpose: Handle incoming Facebook Messenger and Instagram DM webhooks
// Phase 3: Webhook Handling
// Status: SAFE - Will log and test only until OPENAI_API_KEY is configured
// ====================

const crypto = require('crypto');
const aiService = require('./aiService');
const conversationService = require('./conversationService');
const MetaGraphAPI = require('./metaGraphAPI');

// Initialize Meta API client
const metaAPI = new MetaGraphAPI();

// ====================
// WEBHOOK VERIFICATION (GET)
// ====================
// Meta will call this endpoint to verify webhook ownership
// Must respond with challenge parameter

/**
 * Verify webhook endpoint (GET request from Meta)
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
function verifyWebhook(req, res) {
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

  if (!VERIFY_TOKEN) {
    console.error('❌ META_VERIFY_TOKEN not configured');
    return res.status(500).send('Webhook verification token not configured');
  }

  // Parse params from the query string
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Respond with 200 OK and challenge token from the request
      console.log('✅ Webhook verified successfully');
      return res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      console.error('❌ Webhook verification failed - token mismatch');
      return res.sendStatus(403);
    }
  }

  console.error('❌ Webhook verification failed - missing parameters');
  return res.sendStatus(400);
}

// ====================
// WEBHOOK MESSAGE HANDLER (POST)
// ====================
// Receives incoming messages from Facebook Messenger and Instagram DMs

/**
 * Handle incoming webhook events (POST request from Meta)
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
async function handleWebhook(req, res) {
  try {
    // Get the body of the webhook event
    const body = req.body;

    // Check if this is an event from a page subscription
    if (body.object === 'page') {
      // Respond quickly to Meta (must respond within 20 seconds)
      res.status(200).send('EVENT_RECEIVED');

      // Process each entry in the webhook event
      for (const entry of body.entry) {
        // Get the webhook event
        const webhookEvent = entry.messaging ? entry.messaging[0] : null;

        if (!webhookEvent) {
          console.log('⚠️  No messaging event found in entry');
          continue;
        }

        // Get the sender PSID (Page-Scoped ID)
        const senderId = webhookEvent.sender.id;
        const pageId = webhookEvent.recipient.id;

        // Determine platform (Facebook Messenger or Instagram)
        const platform = determinePlatform(pageId);

        console.log(`📨 Incoming message from ${platform} user: ${senderId}`);

        // Handle different webhook event types
        if (webhookEvent.message) {
          await handleMessage(senderId, webhookEvent.message, platform);
        } else if (webhookEvent.postback) {
          await handlePostback(senderId, webhookEvent.postback, platform);
        } else {
          console.log('⚠️  Unhandled webhook event type');
        }
      }
    } else {
      // Not a page event, return 404
      console.log('⚠️  Webhook event is not from a page');
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('❌ Error handling webhook:', error);
    res.sendStatus(500);
  }
}

/**
 * Determine platform based on page ID
 * @param {string} pageId - Page/Account ID
 * @returns {string} Platform ('facebook' or 'instagram')
 */
function determinePlatform(pageId) {
  const facebookPageId = process.env.FACEBOOK_PAGE_ID;
  const instagramAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (pageId === facebookPageId) {
    return 'facebook';
  } else if (pageId === instagramAccountId) {
    return 'instagram';
  }

  // Default to facebook if can't determine
  console.log(`⚠️  Unknown page ID: ${pageId}, defaulting to facebook`);
  return 'facebook';
}

/**
 * Handle incoming message
 * @param {string} senderId - Sender ID (PSID or IGID)
 * @param {object} message - Message object from webhook
 * @param {string} platform - Platform ('facebook' or 'instagram')
 */
async function handleMessage(senderId, message, platform) {
  try {
    // Extract message text
    const messageText = message.text;

    // Ignore empty messages or messages without text (e.g., stickers, attachments)
    if (!messageText || messageText.trim().length === 0) {
      console.log('⚠️  Message has no text, skipping');
      return;
    }

    console.log(`💬 Message text: "${messageText}"`);

    // Mark message as read for better UX
    try {
      await metaAPI.markMessageAsRead(senderId, platform);
    } catch (error) {
      console.error('⚠️  Failed to mark as read:', error.message);
      // Non-critical, continue processing
    }

    // Send typing indicator while processing
    try {
      await metaAPI.sendTypingIndicator(senderId);
    } catch (error) {
      console.error('⚠️  Failed to send typing indicator:', error.message);
      // Non-critical, continue processing
    }

    // Get or create conversation
    const conversation = conversationService.getConversation(senderId, platform, {
      name: 'Customer' // Can be enhanced with profile API call if needed
    });

    // Add customer message to conversation
    conversationService.addMessage(senderId, platform, {
      role: 'customer',
      content: messageText,
      messageId: message.mid,
      timestamp: new Date()
    });

    // Get conversation history for AI context
    const conversationHistory = conversationService.getConversationHistory(senderId, platform, 5);

    // Check if AI service is enabled
    if (!aiService.isEnabled()) {
      console.log('⚠️  AI Service not enabled (OPENAI_API_KEY not configured)');
      console.log('📝 Test Mode: Message received and logged successfully');
      console.log('📝 To enable AI replies, configure OPENAI_API_KEY in Railway');
      
      // In test mode, don't send any reply
      // Just log the message for testing webhook connectivity
      return;
    }

    // Generate AI response
    console.log('🤖 Generating AI response...');
    const aiResponse = await aiService.generateResponse(messageText, {
      previousMessages: conversationHistory
    });

    if (!aiResponse.success) {
      console.error('❌ AI response generation failed:', aiResponse.error);
      console.log('📝 Test Mode: Using fallback response');
      
      // Use fallback response
      const fallbackText = aiResponse.responseText || 
        "Thanks for contacting Tow Riders! We're experiencing technical difficulties. Please call us at (925) 546-9711 for immediate assistance.";
      
      // Send fallback response
      await sendReply(senderId, fallbackText, platform);
      
      // Add to conversation
      conversationService.addMessage(senderId, platform, {
        role: 'assistant',
        content: fallbackText,
        timestamp: new Date()
      });
      
      return;
    }

    // Extract metadata from AI response
    const { responseText, metadata } = aiResponse;

    console.log(`🤖 AI Response: "${responseText}"`);
    console.log(`📊 Intent: ${metadata.intent}, Sacramento: ${metadata.sacramentoDetection.detected}`);

    // Update conversation metadata
    conversationService.updateMetadata(senderId, platform, {
      intent: metadata.intent,
      sacramentoDetected: metadata.sacramentoDetection.detected,
      sacramentoConfidence: metadata.sacramentoDetection.confidence
    });

    // Send AI response back to user
    await sendReply(senderId, responseText, platform);

    // Add AI response to conversation
    conversationService.addMessage(senderId, platform, {
      role: 'assistant',
      content: responseText,
      timestamp: new Date()
    });

    console.log('✅ Message processed successfully');

  } catch (error) {
    console.error('❌ Error processing message:', error);
    
    // Send error message to user (only if AI is enabled)
    if (aiService.isEnabled()) {
      try {
        const errorMessage = "I apologize, but I'm having trouble processing your message right now. Please call us directly at (925) 546-9711 for immediate assistance.";
        await sendReply(senderId, errorMessage, platform);
      } catch (sendError) {
        console.error('❌ Failed to send error message:', sendError);
      }
    }
  }
}

/**
 * Handle postback (button clicks, quick replies)
 * @param {string} senderId - Sender ID
 * @param {object} postback - Postback object from webhook
 * @param {string} platform - Platform
 */
async function handlePostback(senderId, postback, platform) {
  try {
    console.log(`📲 Postback received: ${postback.payload}`);

    // Handle different postback payloads
    const payload = postback.payload;

    // Example postback handling (can be expanded later)
    let responseText = '';

    switch (payload) {
      case 'GET_STARTED':
        responseText = "Welcome to Tow Riders! We provide 24/7 roadside assistance in the Sacramento area. How can I help you today?";
        break;
      case 'REQUEST_QUOTE':
        responseText = "I'd be happy to provide a quote! Please share your pickup location and destination.";
        break;
      case 'EMERGENCY_HELP':
        responseText = "I understand this is urgent. Please share your exact location (address or nearest cross streets) and describe the situation.";
        break;
      default:
        responseText = "Thanks for your message! How can I help you today?";
    }

    // Send response
    await sendReply(senderId, responseText, platform);

    // Add to conversation
    conversationService.addMessage(senderId, platform, {
      role: 'assistant',
      content: responseText,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Error handling postback:', error);
  }
}

/**
 * Send reply to user
 * @param {string} recipientId - Recipient ID (PSID or IGID)
 * @param {string} messageText - Message to send
 * @param {string} platform - Platform ('facebook' or 'instagram')
 */
async function sendReply(recipientId, messageText, platform) {
  try {
    if (platform === 'facebook') {
      await metaAPI.sendFacebookMessage(recipientId, messageText);
    } else if (platform === 'instagram') {
      await metaAPI.sendInstagramMessage(recipientId, messageText);
    } else {
      throw new Error(`Unknown platform: ${platform}`);
    }

    console.log(`✅ Reply sent to ${platform} user ${recipientId}`);
  } catch (error) {
    console.error(`❌ Failed to send reply to ${platform} user:`, error.message);
    throw error;
  }
}

/**
 * Verify webhook signature (optional but recommended for production)
 * @param {Request} req - Express request
 * @param {string} appSecret - Meta app secret
 * @returns {boolean} Is signature valid
 */
function verifySignature(req, appSecret) {
  if (!appSecret) {
    console.warn('⚠️  META_APP_SECRET not configured, skipping signature verification');
    return true; // Allow in development if secret not configured
  }

  const signature = req.headers['x-hub-signature-256'];
  
  if (!signature) {
    console.error('❌ No signature header found');
    return false;
  }

  // Calculate expected signature
  const expectedSignature = 'sha256=' + 
    crypto.createHmac('sha256', appSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

  // Compare signatures
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    console.error('❌ Signature verification failed');
  }

  return isValid;
}

/**
 * Get webhook status and configuration
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
function getWebhookStatus(req, res) {
  const status = {
    webhook: 'active',
    verifyTokenConfigured: !!process.env.META_VERIFY_TOKEN,
    aiServiceEnabled: aiService.isEnabled(),
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    metaCredentialsConfigured: {
      accessToken: !!process.env.META_PAGE_ACCESS_TOKEN,
      facebookPageId: !!process.env.FACEBOOK_PAGE_ID,
      instagramAccountId: !!process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
    },
    conversationStats: conversationService.getStats(),
    testMode: !aiService.isEnabled(),
    message: aiService.isEnabled() 
      ? 'Webhook active - AI responses enabled'
      : 'Webhook active - Test mode (configure OPENAI_API_KEY to enable AI responses)'
  };

  res.json(status);
}

// Export controller functions
module.exports = {
  verifyWebhook,
  handleWebhook,
  getWebhookStatus
};
