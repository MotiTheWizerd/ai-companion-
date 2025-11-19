import { APIPromise } from './promiseWrapper.js';
import { RequestBuilder } from '../endpoints/index.js';

/**
 * Search memory
 * @param {Object} data - Search parameters
 * @returns {Promise} - Resolves with search results
 */
export async function searchMemory(data) {
    const request = RequestBuilder.searchMemory(data);
    return APIPromise.makeRequest(request);
}
