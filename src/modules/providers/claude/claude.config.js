/**
 * Claude provider configuration
 */
export const CLAUDE_CONFIG = {
  name: 'Claude',
  domain: 'claude.ai',
  projectId: '11', // Default project ID for Claude
  endpoints: {
    conversation: '/api/organizations',
  },
  streamFormat: 'sse',
  manifestPermissions: ['https://claude.ai/*'],
};
