/**
 * Qwen Provider Configuration
 *
 * Configuration constants for the Qwen chat provider
 */

export const QWEN_CONFIG = {
  name: 'Qwen',
  domain: 'chat.qwen.ai',
  projectId: '11', // Default project ID for Qwen
  endpoints: {
    conversation: '/c/',
  },
  streamFormat: 'sse', // Server-Sent Events
  manifestPermissions: ['https://chat.qwen.ai/*'],
};
