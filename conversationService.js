// ====================
// CONVERSATION SERVICE - Message Context Tracking
// ====================
// Purpose: Track multi-turn conversations with customers
// Storage: In-memory Map (upgradeable to database later)
// Auto-cleanup: Conversations expire after 30 minutes of inactivity
// Status: INACTIVE until Phase 3 webhook endpoints are deployed
// ====================

class ConversationService {
  constructor() {
    // In-memory storage for conversations
    // Key: userId_platform (e.g., "123456_facebook" or "789012_instagram")
    // Value: Conversation object
    this.conversations = new Map();

    // Configuration
    this.config = {
      maxMessagesPerConversation: 20, // Keep last 20 messages
      conversationTimeoutMinutes: 30, // Expire after 30 minutes inactive
      cleanupIntervalMinutes: 5 // Run cleanup every 5 minutes
    };

    // Start automatic cleanup
    this.startCleanupTimer();

    console.log('✅ Conversation Service initialized (in-memory storage)');
  }

  /**
   * Get conversation key for storage
   * @param {string} userId - User ID (PSID for Facebook, IGID for Instagram)
   * @param {string} platform - Platform ('facebook' or 'instagram')
   * @returns {string} Conversation key
   */
  getConversationKey(userId, platform) {
    return `${userId}_${platform.toLowerCase()}`;
  }

  /**
   * Get existing conversation or create new one
   * @param {string} userId - User ID
   * @param {string} platform - Platform
   * @param {Object} userData - User data (name, etc.)
   * @returns {Object} Conversation object
   */
  getConversation(userId, platform, userData = {}) {
    const key = this.getConversationKey(userId, platform);
    
    // Check if conversation exists
    if (this.conversations.has(key)) {
      const conversation = this.conversations.get(key);
      
      // Update last activity
      conversation.lastActivity = new Date();
      
      return conversation;
    }

    // Create new conversation
    const newConversation = {
      userId: userId,
      platform: platform,
      userName: userData.name || 'Customer',
      messages: [],
      metadata: {
        intent: null,
        sacramentoDetected: false,
        sacramentoConfidence: 0,
        leadCaptured: false,
        contactInfo: {},
        location: null
      },
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.conversations.set(key, newConversation);
    
    console.log(`💬 New conversation started: ${platform} user ${userId}`);
    
    return newConversation;
  }

  /**
   * Add message to conversation
   * @param {string} userId - User ID
   * @param {string} platform - Platform
   * @param {Object} message - Message object
   * @returns {Object} Updated conversation
   */
  addMessage(userId, platform, message) {
    const conversation = this.getConversation(userId, platform, {
      name: message.senderName || 'Customer'
    });

    // Add message to history
    const messageEntry = {
      role: message.role || 'customer', // 'customer' or 'assistant'
      content: message.content || message.text || '',
      timestamp: message.timestamp || new Date(),
      messageId: message.messageId || null
    };

    conversation.messages.push(messageEntry);

    // Keep only last N messages to prevent memory bloat
    if (conversation.messages.length > this.config.maxMessagesPerConversation) {
      conversation.messages = conversation.messages.slice(-this.config.maxMessagesPerConversation);
    }

    // Update metadata if provided
    if (message.intent) {
      conversation.metadata.intent = message.intent;
    }
    if (message.sacramentoDetected !== undefined) {
      conversation.metadata.sacramentoDetected = message.sacramentoDetected;
    }
    if (message.sacramentoConfidence !== undefined) {
      conversation.metadata.sacramentoConfidence = message.sacramentoConfidence;
    }

    // Update last activity
    conversation.lastActivity = new Date();

    console.log(`💬 Message added to conversation: ${platform} user ${userId} (${conversation.messages.length} total)`);

    return conversation;
  }

  /**
   * Update conversation metadata
   * @param {string} userId - User ID
   * @param {string} platform - Platform
   * @param {Object} metadata - Metadata updates
   * @returns {Object} Updated conversation
   */
  updateMetadata(userId, platform, metadata) {
    const conversation = this.getConversation(userId, platform);

    // Merge metadata
    conversation.metadata = {
      ...conversation.metadata,
      ...metadata
    };

    // Update last activity
    conversation.lastActivity = new Date();

    console.log(`📝 Conversation metadata updated: ${platform} user ${userId}`);

    return conversation;
  }

  /**
   * Mark lead as captured
   * @param {string} userId - User ID
   * @param {string} platform - Platform
   * @param {Object} contactInfo - Contact information (phone, email)
   * @returns {Object} Updated conversation
   */
  markLeadCaptured(userId, platform, contactInfo) {
    const conversation = this.getConversation(userId, platform);

    conversation.metadata.leadCaptured = true;
    conversation.metadata.contactInfo = {
      ...conversation.metadata.contactInfo,
      ...contactInfo
    };

    console.log(`📋 Lead captured: ${platform} user ${userId}`, contactInfo);

    return conversation;
  }

  /**
   * Get conversation history for AI context
   * @param {string} userId - User ID
   * @param {string} platform - Platform
   * @param {number} limit - Max messages to return (default: 5)
   * @returns {Array<Object>} Previous messages
   */
  getConversationHistory(userId, platform, limit = 5) {
    const key = this.getConversationKey(userId, platform);
    
    if (!this.conversations.has(key)) {
      return [];
    }

    const conversation = this.conversations.get(key);
    
    // Return last N messages
    return conversation.messages.slice(-limit);
  }

  /**
   * Delete conversation
   * @param {string} userId - User ID
   * @param {string} platform - Platform
   * @returns {boolean} Success
   */
  deleteConversation(userId, platform) {
    const key = this.getConversationKey(userId, platform);
    
    if (this.conversations.has(key)) {
      this.conversations.delete(key);
      console.log(`🗑️  Conversation deleted: ${platform} user ${userId}`);
      return true;
    }
    
    return false;
  }

  /**
   * Check if conversation is expired
   * @param {Object} conversation - Conversation object
   * @returns {boolean} Is expired
   */
  isExpired(conversation) {
    const now = new Date();
    const lastActivity = new Date(conversation.lastActivity);
    const minutesSinceActivity = (now - lastActivity) / 1000 / 60;
    
    return minutesSinceActivity > this.config.conversationTimeoutMinutes;
  }

  /**
   * Clean up expired conversations
   * @returns {number} Number of conversations deleted
   */
  cleanupExpiredConversations() {
    let deletedCount = 0;
    
    for (const [key, conversation] of this.conversations.entries()) {
      if (this.isExpired(conversation)) {
        this.conversations.delete(key);
        deletedCount++;
        console.log(`🧹 Expired conversation cleaned: ${conversation.platform} user ${conversation.userId}`);
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🧹 Cleanup complete: ${deletedCount} expired conversations removed`);
    }
    
    return deletedCount;
  }

  /**
   * Start automatic cleanup timer
   */
  startCleanupTimer() {
    const intervalMs = this.config.cleanupIntervalMinutes * 60 * 1000;
    
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredConversations();
    }, intervalMs);

    console.log(`⏰ Automatic cleanup scheduled every ${this.config.cleanupIntervalMinutes} minutes`);
  }

  /**
   * Stop automatic cleanup timer
   */
  stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      console.log('⏰ Automatic cleanup stopped');
    }
  }

  /**
   * Get all active conversations
   * @returns {Array<Object>} Active conversations
   */
  getAllConversations() {
    const conversations = [];
    
    for (const [key, conversation] of this.conversations.entries()) {
      if (!this.isExpired(conversation)) {
        conversations.push({
          key: key,
          userId: conversation.userId,
          platform: conversation.platform,
          userName: conversation.userName,
          messageCount: conversation.messages.length,
          metadata: conversation.metadata,
          createdAt: conversation.createdAt,
          lastActivity: conversation.lastActivity
        });
      }
    }
    
    return conversations;
  }

  /**
   * Get conversation statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const total = this.conversations.size;
    let active = 0;
    let expired = 0;
    let withLeads = 0;
    let sacramentoConversations = 0;

    for (const conversation of this.conversations.values()) {
      if (this.isExpired(conversation)) {
        expired++;
      } else {
        active++;
      }

      if (conversation.metadata.leadCaptured) {
        withLeads++;
      }

      if (conversation.metadata.sacramentoDetected) {
        sacramentoConversations++;
      }
    }

    return {
      total: total,
      active: active,
      expired: expired,
      withLeads: withLeads,
      sacramentoConversations: sacramentoConversations,
      timeoutMinutes: this.config.conversationTimeoutMinutes
    };
  }

  /**
   * Export conversation for analysis (optional)
   * @param {string} userId - User ID
   * @param {string} platform - Platform
   * @returns {Object} Conversation data
   */
  exportConversation(userId, platform) {
    const key = this.getConversationKey(userId, platform);
    
    if (!this.conversations.has(key)) {
      return null;
    }

    const conversation = this.conversations.get(key);
    
    return {
      userId: conversation.userId,
      platform: conversation.platform,
      userName: conversation.userName,
      messages: conversation.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      })),
      metadata: conversation.metadata,
      createdAt: conversation.createdAt,
      lastActivity: conversation.lastActivity,
      duration: {
        minutes: Math.floor((conversation.lastActivity - conversation.createdAt) / 1000 / 60),
        messageCount: conversation.messages.length
      }
    };
  }
}

// Export singleton instance
module.exports = new ConversationService();
