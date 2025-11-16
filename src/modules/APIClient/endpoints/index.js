/**
 * Endpoints Module - Public API
 * Exports all endpoint-related functionality
 */

// Export endpoint registry
export {
  ENDPOINTS,
  getAllEndpoints,
  findEndpoint,
  getResourceEndpoints,
} from './EndpointRegistry.js';

// Export URL building utilities
export { UrlBuilder } from './UrlBuilder.js';

// Export request factories
export {
  ConversationRequestFactory,
  MessageRequestFactory,
  SyncRequestFactory,
  AnalyticsRequestFactory,
  HealthRequestFactory,
  RequestBuilder,
} from './RequestFactory.js';

// Export response validation
export {
  ResponseValidator,
  SchemaValidator,
  RESPONSE_SCHEMAS,
} from './ResponseSchema.js';

/**
 * Convenience function to build endpoint path
 * @deprecated Use UrlBuilder.buildPath instead
 */
export function buildEndpointPath(path, params = {}) {
  return UrlBuilder.buildPath(path, params);
}
