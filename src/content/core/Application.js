/**
 * Main Application orchestrator
 * Coordinates all modules and manages application lifecycle
 */
import { eventBus } from './eventBus.js';
import { Logger } from '../modules/utils/logger.js';
import { NetworkInterceptor } from '../../modules/NetworkInterceptor/index.js';
import { ConversationManager } from '../../modules/ConversationManager/index.js';
import { MessageManager } from '../../modules/MessageManager/index.js';
import { StorageManager } from '../../modules/StorageManager/index.js';
import { exposeAPI } from '../modules/publicAPI.js';
import { HANDLER_REGISTRY } from '../modules/eventHandlers/registry.js';
import { ProviderRegistry } from '../../modules/providers/ProviderRegistry.js';
import { ChatGPTProvider } from '../../modules/providers/chatgpt/ChatGPTProvider.js';
import { ClaudeProvider } from '../../modules/providers/claude/ClaudeProvider.js';
import { QwenProvider } from '../../modules/providers/qwen/QwenProvider.js';

/**
 * Application class
 * Central orchestrator for the AI Conversation Bridge Extension
 */
export class Application {
  constructor() {
    // Initialize provider registry first
    this.initializeProviders();

    // Initialize core modules
    this.interceptor = new NetworkInterceptor();
    this.conversationManager = new ConversationManager();
    this.messageManager = new MessageManager();
    this.storageManager = new StorageManager();

    // Note: APIClient moved to background service worker
    // Content scripts cannot make direct API calls due to CSP restrictions
    // Communication happens via chrome.runtime.sendMessage()

    // Create managers object for dependency injection
    this.managers = {
      conversationManager: this.conversationManager,
      messageManager: this.messageManager,
      storageManager: this.storageManager,
    };
  }

  /**
   * Initialize provider registry and register all providers
   */
  initializeProviders() {
    const registry = ProviderRegistry.getInstance();

    // Register ChatGPT provider
    registry.register(new ChatGPTProvider());

    // Register Claude provider
    registry.register(new ClaudeProvider());

    // Register Qwen provider
    registry.register(new QwenProvider());

    // Future: Register other providers
    // registry.register(new GeminiProvider());

    // Detect active provider
    const activeProvider = registry.detectActiveProvider();
    if (activeProvider) {
      Logger.extension(`Active AI provider: ${activeProvider.getName()}`);
    } else {
      Logger.extension('No AI provider detected for current page');
    }
  }

  /**
   * Initialize the application
   * Sets up interceptors, event listeners, and public API
   */
  init() {
    Logger.extension('Initializing...');

    // Initialize network interception
    this.interceptor.init();

    // Subscribe to events using registry pattern
    this.setupEventListeners();

    // Expose public API
    exposeAPI(this.conversationManager, this.storageManager);

    Logger.extension('Ready - API requests handled by background service worker');
  }

  /**
   * Setup all event listeners using Handler Registry
   * Automatically registers all handlers from HANDLER_REGISTRY
   */
  setupEventListeners() {
    Object.entries(HANDLER_REGISTRY).forEach(([event, handler]) => {
      eventBus.on(event, (data) => {
        handler(data, this.managers);
      });
    });

    Logger.extension(`Registered ${Object.keys(HANDLER_REGISTRY).length} event handlers`);
  }

  /**
   * Cleanup and destroy the application
   * Removes event listeners and cleans up resources
   */
  destroy() {
    Logger.extension('Shutting down...');
    // Future: Add cleanup logic if needed
  }
}
