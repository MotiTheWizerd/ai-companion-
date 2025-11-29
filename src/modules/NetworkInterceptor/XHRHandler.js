/**
 * XHRHandler
 * Intercepts XMLHttpRequest to capture conversation data
 */
import { EVENTS } from '../../content/core/constants.js';
import { eventBus } from '../../content/core/eventBus.js';

export class XHRHandler {
    constructor() {
        this.originalOpen = XMLHttpRequest.prototype.open;
        this.originalSend = XMLHttpRequest.prototype.send;
    }

    /**
     * Initialize XHR interception
     */
    intercept() {
        const self = this;

        XMLHttpRequest.prototype.open = function (method, url, ...args) {
            this._url = url;
            this._method = method;
            return self.originalOpen.apply(this, [method, url, ...args]);
        };

        XMLHttpRequest.prototype.send = function (body) {
            const xhr = this;

            // Add event listener to capture response
            this.addEventListener('load', function () {
                self.handleResponse(xhr);
            });

            return self.originalSend.apply(this, [body]);
        };

        console.log('[XHRHandler] Interception enabled');
    }

    /**
     * Handle XHR response
     */
    handleResponse(xhr) {
        const url = xhr._url;

        // Debug log
        if (typeof url === 'string' && (url.includes('chatgpt.com') || url.includes('backend-api'))) {
            console.log(`[XHRHandler] DEBUG: Saw request to: ${url}`);
        }

        // Check for ChatGPT conversation retrieval
        const isChatGPTConversationRetrieval = typeof url === 'string' &&
            (url.includes('chatgpt.com/backend-api/conversation/') || url.includes('/backend-api/conversation/')) &&
            !url.includes('/completion') &&
            !url.includes('/stream');

        if (isChatGPTConversationRetrieval) {
            try {
                const data = JSON.parse(xhr.responseText);
                console.log('[XHRHandler] Intercepted ChatGPT conversation data:', data);

                eventBus.emit(EVENTS.CHATGPT_API_RESPONSE, {
                    responseData: data,
                    apiUrl: url,
                    timestamp: new Date().toISOString()
                });

                console.log('[XHRHandler] Emitted CHATGPT_API_RESPONSE event');
            } catch (e) {
                console.warn('[XHRHandler] Failed to parse ChatGPT response:', e);
            }
        }
    }

    /**
     * Restore original XHR
     */
    restore() {
        XMLHttpRequest.prototype.open = this.originalOpen;
        XMLHttpRequest.prototype.send = this.originalSend;
    }
}
