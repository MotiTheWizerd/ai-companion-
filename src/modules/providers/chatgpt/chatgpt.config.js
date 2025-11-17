/**
 * ChatGPT provider configuration
 */
export const CHATGPT_CONFIG = {
  name: 'ChatGPT',
  domain: 'chatgpt.com',
  endpoints: {
    conversation: '/conversation',
  },
  streamFormat: 'sse',
  manifestPermissions: ['https://chatgpt.com/*'],
};
