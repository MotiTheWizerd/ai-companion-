import { BaseRequestFactory } from './BaseRequestFactory.js';
import { ENDPOINTS } from '../EndpointRegistry.js';



/**
 * MemoryRequestFactory class
 * Handles memory-related request building
 */
export class MemoryRequestFactory extends BaseRequestFactory {
    /**
   * Search memory context
   * @param {Object} data - Search parameters (query, user_id, project_id, etc.)
   * @returns {Object} - Request object
   */
    static search(data = {}) {
        return this.buildRequest(ENDPOINTS.MEMORY.SEARCH, {
            data: this.addTimestamp(data),
        });
    }
}
