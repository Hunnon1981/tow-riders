// ====================
// AI SERVICE - OpenAI GPT Integration
// ====================
// Purpose: Generate intelligent responses to customer messages
// Sacramento-specific: Detects Sacramento mentions and validates service area
// Status: INACTIVE until Phase 3 webhook endpoints are deployed
// ====================

const OpenAI = require('openai');

class AIService {
  constructor() {
    // Initialize OpenAI client
    this.apiKey = process.env.OPENAI_API_KEY;
    this.enabled = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0;
    
    if (this.enabled) {
      this.client = new OpenAI({
        apiKey: this.apiKey
      });
      console.log('✅ AI Service initialized (OpenAI GPT-3.5 Turbo)');
    } else {
      console.log('⚠️  AI Service disabled - OPENAI_API_KEY not configured');
    }

    // Sacramento service area configuration
    this.serviceArea = {
      city: 'Sacramento',
      state: 'California',
      zipCodes: this.getSacramentoZipCodes(),
      keywords: [
        'sacramento',
        'sac',
        'downtown sacramento',
        'midtown',
        'east sacramento',
        'west sacramento',
        'north sacramento',
        'south sacramento',
        'land park',
        'curtis park',
        'oak park',
        'natomas',
        'arden',
        'carmichael',
        'fair oaks',
        'citrus heights',
        'rancho cordova',
        'elk grove'
      ],
      highways: [
        'highway 50',
        'hwy 50',
        'us 50',
        'i-5',
        'i-80',
        'business 80',
        'highway 99',
        'hwy 99'
      ]
    };

    // System prompt for AI responses
    this.systemPrompt = `You are a professional tow truck dispatcher for Tow Riders, a towing company serving the Sacramento, California area.

Your role:
- Respond professionally and empathetically to customers who need roadside assistance
- Extract key information: location, vehicle details, problem type
- Determine if the customer is in the Sacramento service area
- Provide helpful information and next steps

Service Area: Sacramento and surrounding areas (Carmichael, Fair Oaks, Citrus Heights, Rancho Cordova, Elk Grove, West Sacramento, Natomas)

Response Guidelines:
1. Be warm, professional, and reassuring
2. Keep responses concise (2-3 sentences max)
3. Ask ONE clarifying question at a time
4. If location is mentioned, confirm if it's in Sacramento area
5. If outside service area, politely explain we serve Sacramento only
6. For emergencies, prioritize safety and ask for exact location
7. For quotes, ask for pickup location and destination
8. Always end with a question or clear next step

Available Services:
- 24/7 Emergency Roadside Assistance
- Vehicle Towing (light-duty and medium-duty)
- Jump Starts
- Lockout Service
- Tire Changes
- Fuel Delivery
- Winch-Out Service

DO NOT:
- Make up prices (say "I can provide a quote" instead)
- Promise specific arrival times (say "We'll get there as quickly as possible")
- Give legal or mechanical advice
- Accept payment via social media (say "We'll handle payment details when our driver arrives")`;
  }

  /**
   * Get list of Sacramento area ZIP codes
   * @returns {Array<string>} ZIP codes in service area
   */
  getSacramentoZipCodes() {
    return [
      // Downtown/Midtown Sacramento
      '95814', '95816', '95817', '95818', '95819', '95820',
      // East/North Sacramento
      '95821', '95822', '95823', '95824', '95825', '95826', '95828', '95829',
      '95830', '95831', '95832', '95833', '95834', '95835', '95838',
      // Surrounding areas
      '95841', '95842', '95843', // Natomas/North Highlands
      '95864', '95865', '95866', // Carmichael/Arden
      '95608', '95609', // Carmichael
      '95610', '95628', // Citrus Heights
      '95621', '95662', // Citrus Heights/Orangevale
      '95630', '95661', // Folsom/Orangevale
      '95624', '95641', '95655', '95670', // Rancho Cordova
      '95757', '95758', '95759', // Elk Grove
      '95605', '95691', // West Sacramento
      '95650', '95660' // Fair Oaks/Orangevale
    ];
  }

  /**
   * Detect if message mentions Sacramento or service area
   * @param {string} messageText - Message from customer
   * @returns {Object} Detection result with confidence
   */
  detectSacramentoMention(messageText) {
    if (!messageText) {
      return { detected: false, confidence: 0, matches: [] };
    }

    const lowerText = messageText.toLowerCase();
    const matches = [];

    // Check city/area keywords
    for (const keyword of this.serviceArea.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matches.push({ type: 'city', value: keyword });
      }
    }

    // Check highway mentions (strong indicator of Sacramento area)
    for (const highway of this.serviceArea.highways) {
      if (lowerText.includes(highway.toLowerCase())) {
        matches.push({ type: 'highway', value: highway });
      }
    }

    // Check ZIP codes
    for (const zip of this.serviceArea.zipCodes) {
      if (lowerText.includes(zip)) {
        matches.push({ type: 'zipcode', value: zip });
      }
    }

    // Calculate confidence
    const detected = matches.length > 0;
    let confidence = 0;
    if (matches.length > 0) {
      // ZIP code = 100% confidence
      if (matches.some(m => m.type === 'zipcode')) confidence = 1.0;
      // Highway + city = 90% confidence
      else if (matches.length >= 2) confidence = 0.9;
      // Single keyword = 70% confidence
      else confidence = 0.7;
    }

    return {
      detected,
      confidence,
      matches,
      isSacramentoArea: detected && confidence >= 0.7
    };
  }

  /**
   * Extract intent from customer message
   * @param {string} messageText - Message from customer
   * @returns {string} Intent type
   */
  extractIntent(messageText) {
    if (!messageText) return 'general';

    const lowerText = messageText.toLowerCase();

    // Emergency keywords (highest priority)
    const emergencyKeywords = [
      'emergency', 'urgent', 'stranded', 'stuck', 'accident', 'crash',
      'breakdown', 'broke down', 'won\'t start', 'dead battery', 'flat tire',
      'need help now', 'asap', 'right now'
    ];
    if (emergencyKeywords.some(kw => lowerText.includes(kw))) {
      return 'emergency';
    }

    // Quote/pricing keywords
    const quoteKeywords = [
      'quote', 'price', 'cost', 'how much', 'rate', 'fee', 'charge',
      'pricing', 'estimate'
    ];
    if (quoteKeywords.some(kw => lowerText.includes(kw))) {
      return 'quote';
    }

    // Booking/service request keywords
    const bookingKeywords = [
      'need tow', 'need a tow', 'tow truck', 'towing', 'pick up',
      'can you', 'schedule', 'book', 'service', 'jump start',
      'tire change', 'lockout', 'fuel delivery'
    ];
    if (bookingKeywords.some(kw => lowerText.includes(kw))) {
      return 'booking';
    }

    // General inquiry/help
    const helpKeywords = [
      'help', 'info', 'information', 'question', 'hours', 'open',
      'available', 'serve', 'service area'
    ];
    if (helpKeywords.some(kw => lowerText.includes(kw))) {
      return 'help';
    }

    return 'general';
  }

  /**
   * Generate AI response to customer message
   * @param {string} messageText - Message from customer
   * @param {Object} context - Conversation context
   * @returns {Promise<Object>} AI response with metadata
   */
  async generateResponse(messageText, context = {}) {
    if (!this.enabled) {
      return {
        success: false,
        error: 'AI Service is not enabled. Please configure OPENAI_API_KEY.',
        responseText: null
      };
    }

    try {
      // Detect Sacramento mention
      const sacramentoDetection = this.detectSacramentoMention(messageText);
      
      // Extract intent
      const intent = this.extractIntent(messageText);

      // Build conversation history for context
      const messages = [
        { role: 'system', content: this.systemPrompt }
      ];

      // Add conversation history if available
      if (context.previousMessages && context.previousMessages.length > 0) {
        // Add last 3 messages for context (to keep token usage low)
        const recentMessages = context.previousMessages.slice(-3);
        for (const msg of recentMessages) {
          messages.push({
            role: msg.role === 'customer' ? 'user' : 'assistant',
            content: msg.content
          });
        }
      }

      // Add current message
      messages.push({
        role: 'user',
        content: messageText
      });

      // Add context hint about Sacramento detection
      if (sacramentoDetection.detected) {
        messages.push({
          role: 'system',
          content: `[System Note: Customer mentioned ${sacramentoDetection.matches.map(m => m.value).join(', ')} - this is in our service area]`
        });
      }

      // Call OpenAI API
      const completion = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 150, // Keep responses concise
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      });

      const responseText = completion.choices[0].message.content.trim();

      // Log for monitoring
      console.log(`🤖 AI Response generated - Intent: ${intent}, Sacramento: ${sacramentoDetection.detected}`);

      return {
        success: true,
        responseText: responseText,
        metadata: {
          intent: intent,
          sacramentoDetection: sacramentoDetection,
          tokensUsed: completion.usage.total_tokens,
          model: completion.model,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ AI Service error:', error.message);
      
      // Fallback response if AI fails
      const fallbackResponse = this.getFallbackResponse(messageText);
      
      return {
        success: false,
        error: error.message,
        responseText: fallbackResponse,
        metadata: {
          fallback: true,
          intent: this.extractIntent(messageText),
          sacramentoDetection: this.detectSacramentoMention(messageText)
        }
      };
    }
  }

  /**
   * Get fallback response if AI service fails
   * @param {string} messageText - Original message
   * @returns {string} Fallback response
   */
  getFallbackResponse(messageText) {
    const intent = this.extractIntent(messageText);
    const sacramento = this.detectSacramentoMention(messageText);

    if (intent === 'emergency') {
      return "I understand you need urgent assistance. Please reply with your exact location (address or nearest cross streets) so we can dispatch a truck right away.";
    }

    if (intent === 'quote') {
      return "I'd be happy to provide a quote! Please share your pickup location and where you need to go.";
    }

    if (!sacramento.detected) {
      return "Thanks for reaching out! Could you please share your location? We serve the Sacramento area and I want to make sure we can help you.";
    }

    return "Thanks for contacting Tow Riders! How can I help you today? I can provide quotes, schedule service, or answer any questions about our roadside assistance.";
  }

  /**
   * Check if service is enabled and configured
   * @returns {boolean} Service status
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Get service configuration
   * @returns {Object} Service config
   */
  getConfig() {
    return {
      enabled: this.enabled,
      model: 'gpt-3.5-turbo',
      serviceArea: {
        city: this.serviceArea.city,
        state: this.serviceArea.state,
        zipCodeCount: this.serviceArea.zipCodes.length
      }
    };
  }
}

// Export singleton instance
module.exports = new AIService();
