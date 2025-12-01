/**
 * ChatGPT provider configuration
 */
export const CHATGPT_CONFIG = {
  name: 'ChatGPT',
  domain: 'chatgpt.com',
  // Note: projectId is now retrieved dynamically from storage via getProjectId() method
  endpoints: {
    conversation: '/conversation',
  },
  streamFormat: 'sse',
  manifestPermissions: ['https://chatgpt.com/*'],
};
