import { BaseRequestFactory } from './BaseRequestFactory.js';
import { ENDPOINTS } from '../EndpointRegistry.js';

/**
 * ProjectRequestFactory class
 * Handles project-related request building
 */
export class ProjectRequestFactory extends BaseRequestFactory {
    /**
     * Get projects by user ID
     * @param {string} userId - The user ID
     * @returns {Object} - Request object
     */
    static getByUser(userId) {
        if (!userId) {
            throw new Error('UserId is required for fetching projects');
        }

        return this.buildRequest(ENDPOINTS.PROJECTS.GET_BY_USER, {
            pathParams: { userId },
        });
    }
}
