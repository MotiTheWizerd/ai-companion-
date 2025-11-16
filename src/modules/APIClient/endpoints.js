/**
 * API Endpoints - Backward Compatibility Wrapper
 *
 * This file maintains backward compatibility with the original endpoints.js
 * It re-exports from the new modular structure in ./endpoints/
 *
 * @deprecated Direct import from this file is deprecated
 * @see ./endpoints/index.js for the new modular API
 */

// Re-export everything from the new modular structure
export {
  ENDPOINTS,
  buildEndpointPath,
  RequestBuilder,
  ResponseValidator,
} from './endpoints/index.js';

/**
 * Migration Guide:
 *
 * OLD (deprecated):
 * import { ENDPOINTS, RequestBuilder } from './endpoints.js'
 *
 * NEW (recommended):
 * import { ENDPOINTS, RequestBuilder } from './endpoints/index.js'
 *
 * OR use specific factories:
 * import { ConversationRequestFactory } from './endpoints/RequestFactory.js'
 * import { UrlBuilder } from './endpoints/UrlBuilder.js'
 */
