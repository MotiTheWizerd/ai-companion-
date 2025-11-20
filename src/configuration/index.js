/**
 * Configuration Module
 * Loads and exports user and API configuration from JSON files
 */

import userSettings from './userSettings.json';
import apiConfig from './apiConfig.json';

/**
 * User configuration
 */
export const USER_CONFIG = {
    USER_ID: userSettings.userId,
    // PROJECT_ID removed - now provider-specific (see provider configs)
};

/**
 * API configuration
 */
export const API_CONFIG = {
    BASE_URL: apiConfig.baseUrl,
    TIMEOUT: apiConfig.timeout,
    RETRY_ATTEMPTS: apiConfig.retryAttempts,
    RETRY_DELAY: apiConfig.retryDelay,
    MAX_CONCURRENT: apiConfig.maxConcurrent,
};
