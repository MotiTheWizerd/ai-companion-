/**
 * Claude provider configuration
 */
export const CLAUDE_CONFIG = {
  name: 'Claude',
  domain: 'claude.ai',
  // Note: projectId is now retrieved dynamically from storage via getProjectId() method
  endpoints: {
    conversation: '/api/organizations',
  },
  streamFormat: 'sse',
  manifestPermissions: ['https://claude.ai/*'],
};
