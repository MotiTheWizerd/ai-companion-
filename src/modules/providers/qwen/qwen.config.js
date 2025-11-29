/**
 * Qwen Provider Configuration
 *
 * Configuration constants for the Qwen chat provider
 */

export const QWEN_CONFIG = {
  name: 'Qwen',
  domain: 'chat.qwen.ai',
  projectId: 'f06fd626-4c31-45f9-b264-4ac88e4b7aae', // Default project ID for Qwen
  endpoints: {
    conversation: '/c/',
  },
  streamFormat: 'sse', // Server-Sent Events
  manifestPermissions: ['https://chat.qwen.ai/*'],
};
