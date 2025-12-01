import { BaseProvider } from '../base/BaseProvider.js';
import { ChatGPTStreamParser } from './ChatGPTStreamParser.js';
import { ChatGPTURLMatcher } from './ChatGPTURLMatcher.js';
import { CHATGPT_CONFIG } from './chatgpt.config.js';
import { API_CONFIG } from '../../../content/core/constants.js';
import { getProjectIdFromStorage } from '../../../content/modules/utils/storageUtils.js';

/**
 * ChatGPT provider implementation
 */
export class ChatGPTProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.streamParser = new ChatGPTStreamParser();
    this.urlMatcher = new ChatGPTURLMatcher(config);
    this.providerConfig = CHATGPT_CONFIG;
  }

  getName() {
    return 'chatgpt';
  }

  getStreamParser() {
    return this.streamParser;
  }

  getURLMatcher() {
    return this.urlMatcher;
  }

  /**
   * Handle/Modify request body before sending
   * @param {Object} body - Parsed request body
   * @returns {Object} Modified request body
   */
  async handleRequest(body, context = {}) {
    console.log('[ChatGPTProvider] handleRequest called', body);
    try {
      const sessionId = context?.conversationId || null;

      // Check for standard message structure
      if (body?.messages?.[0]?.content?.parts?.[0]) {
        const currentText = body.messages[0].content.parts[0];
        console.log('[ChatGPTProvider] Current text:', currentText);

        // Only modify if we have actual text
        if (typeof currentText === 'string' && currentText.trim().length > 0) {
          // POC: Inject a word to the socket
          const injectedText = currentText + "\n\n[SOCKET_INJECTION_POC: Hello from the socket!]";
          body.messages[0].content.parts[0] = injectedText;

          console.log('[ChatGPTProvider] INJECTED POC TO SOCKET. New text:', injectedText);
        }
      }
    } catch (error) {
      console.warn('[ChatGPTProvider] Failed to modify request:', error);
    }
    console.log('[ChatGPTProvider] Returning body:', body);
    return body;
  }

  /**
   * Send API request through background script
   * @param {Object} request - Request configuration
   * @returns {Promise} - Resolves with API response
   */
  sendBackgroundRequest(request) {
    return new Promise((resolve, reject) => {
      // Create unique ID for this request
      const requestId = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Listen for response
      const responseHandler = (event) => {
        if (event.source !== window) return;
        if (!event.data || event.data.source !== 'chatgpt-extension-response') return;
        if (event.data.type !== 'API_REQUEST') return;

        // Remove listener
        window.removeEventListener('message', responseHandler);

        if (event.data.success) {
          resolve(event.data.data);
        } else {
          reject(new Error(event.data.error || 'API request failed'));
        }
      };

      window.addEventListener('message', responseHandler);

      // Send request to background via loader
      window.postMessage({
        source: 'chatgpt-extension',
        type: 'API_REQUEST',
        request: request,
        requestId: requestId
      }, '*');

      // Timeout after 30 seconds
      setTimeout(() => {
        window.removeEventListener('message', responseHandler);
        reject(new Error('Memory search timeout'));
      }, 60000);
    });
  }

  /**
   * Extract user prompt from request body
   * @param {Object} body - Parsed request body
   * @returns {string|null} User prompt or null
   */
  extractPrompt(body) {
    try {
      return body?.messages?.[0]?.content?.parts?.[0] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get project ID dynamically from storage
   * @returns {Promise<string|null>} Project ID or null if not available
   */
  async getProjectId() {
    return await getProjectIdFromStorage();
  }
}
