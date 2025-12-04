import { BaseProvider } from "../base/BaseProvider.js";
import { ClaudeStreamParser } from "./ClaudeStreamParser.js";
import { ClaudeURLMatcher } from "./ClaudeURLMatcher.js";
import { CLAUDE_CONFIG } from "./claude.config.js";
import { API_CONFIG } from "../../../content/core/constants.js";
import {
  getProjectIdFromStorage,
  getMemoryFetchEnabled,
} from "../../../content/modules/utils/storageUtils.js";

/**
 * Claude provider implementation
 */
export class ClaudeProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.streamParser = new ClaudeStreamParser();
    this.urlMatcher = new ClaudeURLMatcher(config);
    this.providerConfig = CLAUDE_CONFIG;
  }

  getName() {
    return "claude";
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
    console.log("[ClaudeProvider] handleRequest called", body);
    try {
      const sessionId = context?.conversationId || null;

      // Check if memory fetch is enabled
      const memoryFetchEnabled = await getMemoryFetchEnabled();
      console.log("[ClaudeProvider] Memory fetch enabled:", memoryFetchEnabled);

      if (!memoryFetchEnabled) {
        console.log(
          "[ClaudeProvider] Memory fetch disabled, skipping memory injection",
        );
        return body;
      }

      // Check for Claude's prompt field
      if (body?.prompt) {
        const currentText = body.prompt;
        console.log("[ClaudeProvider] Current prompt:", currentText);

        // Only modify if we have actual text
        if (typeof currentText === "string" && currentText.trim().length > 0) {
          try {
            console.log(
              "[ClaudeProvider] Requesting memory search via background...",
            );
            console.log(
              "[ClaudeProvider] Project ID: (Waiting for Loader injection)",
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
              "[ClaudeProvider] Search results:",
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

              console.log("[ClaudeProvider] Memory block:", memoryBlock);

              // Prepend memory block to the user's prompt
              body.prompt = memoryBlock + currentText;
              console.log("[ClaudeProvider] Modified prompt:", body.prompt);
            } else {
              console.log("[ClaudeProvider] No search results found");
            }
          } catch (apiError) {
            console.warn(
              "[ClaudeProvider] Failed to fetch memory context:",
              apiError,
            );
            // Fallback to no memory injection on error
          }
        }
      }
    } catch (error) {
      console.warn("[ClaudeProvider] Failed to modify request:", error);
    }
    console.log("[ClaudeProvider] Returning body:", body);
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
      return body?.prompt || null;
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
