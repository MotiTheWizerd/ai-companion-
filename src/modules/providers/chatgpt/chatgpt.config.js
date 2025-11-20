/**
 * ChatGPT provider configuration
 */
export const CHATGPT_CONFIG = {
  name: 'ChatGPT',
  domain: 'chatgpt.com',
  projectId: '11', // Default project ID for ChatGPT
  endpoints: {
    conversation: '/conversation',
  },
  streamFormat: 'sse',
  manifestPermissions: ['https://chatgpt.com/*'],
};
