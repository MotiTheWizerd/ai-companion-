/**
 * Qwen Provider
 *
 * Main provider class for Qwen chat integration
 * Orchestrates URL matching and stream parsing
 */

import { BaseProvider } from "../base/BaseProvider.js";
import { QwenStreamParser } from "./QwenStreamParser.js";
import { QwenURLMatcher } from "./QwenURLMatcher.js";
import { QWEN_CONFIG } from "./qwen.config.js";
import { API_CONFIG } from "../../../content/core/constants.js";
import {
  getProjectIdFromStorage,
  getMemoryFetchEnabled,
} from "../../../content/modules/utils/storageUtils.js";

export class QwenProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.streamParser = new QwenStreamParser();
    this.urlMatcher = new QwenURLMatcher(config);
    this.providerConfig = QWEN_CONFIG;
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getName() {
    return "qwen";
  }

  /**
   * Get URL matcher instance
   * @returns {QwenURLMatcher}
   */
  getURLMatcher() {
    return this.urlMatcher;
  }

  /**
   * Get stream parser instance
   * @returns {QwenStreamParser}
   */
  getStreamParser() {
    return this.streamParser;
  }

  /**
   * Handle/Modify request body before sending
   * @param {Object} body - Parsed request body
   * @param {Object} context - Request context (conversationId, etc.)
   * @returns {Object} Modified request body
   */
  async handleRequest(body, context = {}) {
    console.log("[QwenProvider] handleRequest called", body);
    try {
      const sessionId = context?.conversationId || null;

      // Check if memory fetch is enabled
      const memoryFetchEnabled = await getMemoryFetchEnabled();
      console.log("[QwenProvider] Memory fetch enabled:", memoryFetchEnabled);

      if (!memoryFetchEnabled) {
        console.log(
          "[QwenProvider] Memory fetch disabled, skipping memory injection",
        );
        return body;
      }

      // Check for Qwen's message structure (adjust based on actual Qwen API structure)
      // Qwen typically uses messages array similar to OpenAI format
      const lastMessage = body?.messages?.[body.messages.length - 1];
      if (lastMessage?.content) {
        const currentText = lastMessage.content;
        console.log("[QwenProvider] Current text:", currentText);

        // Only modify if we have actual text
        if (typeof currentText === "string" && currentText.trim().length > 0) {
          try {
            console.log(
              "[QwenProvider] Requesting memory search via background...",
            );
            console.log(
              "[QwenProvider] Project ID: (Waiting for Loader injection)",
            );

            // Send API request through background script (bypasses CSP)
            const searchResults = await this.sendBackgroundRequest({
              method: "POST",
              endpoint: "/conversations/fetch-memory",
              data: {
                query: currentText,
                user_id: API_CONFIG.USER_ID,
                project_id: null, // Enforce loader injection
                session_id: sessionId,
                limit: 5,
                min_similarity: 0.5,
              },
            });

            console.log(
              "[QwenProvider] Search results:",
              searchResults.synthesized_memory,
            );

            if (
              searchResults.synthesized_memory &&
              searchResults.synthesized_memory.length > 0
            ) {
              // Format the results into a string
              const memoryContent = searchResults.synthesized_memory;
              // Construct the memory block
              const memoryBlock =
                "[semantix-memory-block]\n" +
                memoryContent +
                "\n" +
                "[semantix-end-memory-block]\n\n";

              console.log("[QwenProvider] Memory block:", memoryBlock);

              // Prepend memory block to the user's prompt
              lastMessage.content = memoryBlock + currentText;
              console.log(
                "[QwenProvider] Modified prompt:",
                lastMessage.content,
              );
            } else {
              console.log("[QwenProvider] No search results found");
            }
          } catch (apiError) {
            console.warn(
              "[QwenProvider] Failed to fetch memory context:",
              apiError,
            );
            // Fallback to no memory injection on error
          }
        }
      }
    } catch (error) {
      console.warn("[QwenProvider] Failed to modify request:", error);
    }
    console.log("[QwenProvider] Returning body:", body);
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
        if (!event.data || event.data.source !== "chatgpt-extension-response")
          return;
        if (event.data.type !== "API_REQUEST") return;

        // Remove listener
        window.removeEventListener("message", responseHandler);

        if (event.data.success) {
          resolve(event.data.data);
        } else {
          reject(new Error(event.data.error || "API request failed"));
        }
      };

      window.addEventListener("message", responseHandler);

      // Send request to background via loader
      window.postMessage(
        {
          source: "chatgpt-extension",
          type: "API_REQUEST",
          request: request,
          requestId: requestId,
        },
        "*",
      );

      // Timeout after 30 seconds
      setTimeout(() => {
        window.removeEventListener("message", responseHandler);
        reject(new Error("Memory search timeout"));
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
      const lastMessage = body?.messages?.[body.messages.length - 1];
      return lastMessage?.content || null;
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
