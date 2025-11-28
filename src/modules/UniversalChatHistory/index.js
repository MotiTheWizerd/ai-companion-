/**
 * UniversalChatHistory Module
 * Provides a unified interface for capturing and managing chat history across different AI platforms
 */

export { ChatHistoryManager as UniversalChatHistory } from './ChatHistoryManager.js';
export { EventIntegration } from './eventIntegration.js';
export { StorageManager } from './storage.js';
export {
  ClaudeProviderInterface,
  ChatGPTProviderInterface,
  QwenProviderInterface
} from './interfaces.js';