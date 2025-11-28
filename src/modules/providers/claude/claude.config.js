/**
 * Claude provider configuration
 */
export const CLAUDE_CONFIG = {
  name: 'Claude',
  domain: 'claude.ai',
  projectId: '12', // Separate project ID for Claude (GPT uses '11')
  endpoints: {
    conversation: '/api/organizations',
  },
  streamFormat: 'sse',
  manifestPermissions: ['https://claude.ai/*'],
};
