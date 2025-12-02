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
import { ToolbarController, WidgetController } from '../../modules/UIControls/index.js';
import { ChatImportManager } from '../../modules/ChatImportManager/ChatImportManager.js';

import { APIClient } from '../../modules/APIClient/index.js';
import { API_CONFIG } from './constants.js';
import { UniversalChatHistory, EventIntegration } from '../../modules/UniversalChatHistory/index.js';

export class Application {
  constructor() {
    // Initialize core modules
    this.interceptor = new NetworkInterceptor();
    this.conversationManager = new ConversationManager();
    this.messageManager = new MessageManager();
    this.storageManager = new StorageManager();

    // Initialize provider registry and set active provider
    this.initializeProviders();

    // Initialize Universal Chat History module
    this.chatHistoryManager = new UniversalChatHistory();
    this.eventIntegration = new EventIntegration(this.chatHistoryManager, eventBus);

    // Initialize UI Controllers
    this.toolbarController = new ToolbarController(this.conversationManager, this.chatHistoryManager);
    this.widgetController = new WidgetController(this.conversationManager);

    // Initialize API Client for making backend requests
    this.apiClient = new APIClient({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      retryAttempts: API_CONFIG.RETRY_ATTEMPTS,
      retryDelay: API_CONFIG.RETRY_DELAY,
      maxConcurrent: API_CONFIG.MAX_CONCURRENT,
    });

    // Create managers object for dependency injection
    this.managers = {
      conversationManager: this.conversationManager,
      messageManager: this.messageManager,
      storageManager: this.storageManager,
      chatHistoryManager: this.chatHistoryManager, // Add to managers for event handlers
    };

    // Initialize Chat Import manager (after managers created)
    this.chatImportManager = new ChatImportManager({ managers: this.managers });
    this.managers.chatImportManager = this.chatImportManager;
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

    // Detect active provider
    const activeProvider = registry.detectActiveProvider();
    if (activeProvider) {
      Logger.extension(`Active AI provider: ${activeProvider.getName()}`);
      this.conversationManager.setProvider(activeProvider.getName());
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

    // Initialize API Client
    this.apiClient.init();

    // Initialize network interception
    this.interceptor.init();

    // Initialize UI Controllers
    this.toolbarController.init();
    this.widgetController.init();

    // Initialize Universal Chat History monitoring
    this.chatHistoryManager.setupResumeChatObserver();

    // Subscribe to events using registry pattern
    this.setupEventListeners();

    // Expose public API
    exposeAPI(this.conversationManager, this.storageManager);

    Logger.extension('Ready');
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
