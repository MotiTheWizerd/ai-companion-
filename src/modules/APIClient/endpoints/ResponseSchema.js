/**
 * ResponseSchema Module
 * Response validation with detailed schemas
 */

/**
 * Schema validator class
 * Provides type-safe validation with detailed error messages
 */
export class SchemaValidator {
  /**
   * Validate value against schema
   * @param {*} value - Value to validate
   * @param {Object} schema - Validation schema
   * @returns {Object} - { valid: boolean, errors: string[] }
   */
  static validate(value, schema) {
    const errors = [];

    // Type check
    if (schema.type && typeof value !== schema.type) {
      errors.push(`Expected type ${schema.type}, got ${typeof value}`);
      return { valid: false, errors };
    }

    // Required fields
    if (schema.required && Array.isArray(schema.required)) {
      schema.required.forEach(field => {
        if (!(field in value)) {
          errors.push(`Missing required field: ${field}`);
        }
      });
    }

    // Properties validation
    if (schema.properties && typeof value === 'object') {
      Object.entries(schema.properties).forEach(([key, propSchema]) => {
        if (key in value) {
          const result = this.validate(value[key], propSchema);
          if (!result.valid) {
            errors.push(...result.errors.map(e => `${key}: ${e}`));
          }
        }
      });
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(value) && schema.items) {
      value.forEach((item, index) => {
        const result = this.validate(item, schema.items);
        if (!result.valid) {
          errors.push(...result.errors.map(e => `[${index}]: ${e}`));
        }
      });
    }

    // Custom validator
    if (schema.validator && typeof schema.validator === 'function') {
      const customResult = schema.validator(value);
      if (customResult !== true) {
        errors.push(typeof customResult === 'string' ? customResult : 'Custom validation failed');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Response schemas for different resource types
 */
export const RESPONSE_SCHEMAS = {
  CONVERSATION: {
    type: 'object',
    required: ['conversationId', 'messages'],
    properties: {
      conversationId: { type: 'string' },
      title: { type: 'string' },
      messages: {
        type: 'array',
        items: {
          type: 'object',
          required: ['messageId', 'role', 'content'],
          properties: {
            messageId: { type: 'string' },
            role: { type: 'string' },
            content: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
      metadata: { type: 'object' },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
    },
  },

  MESSAGE: {
    type: 'object',
    required: ['messageId', 'role', 'content'],
    properties: {
      messageId: { type: 'string' },
      role: { type: 'string' },
      content: { type: 'string' },
      conversationId: { type: 'string' },
      timestamp: { type: 'string' },
      metadata: { type: 'object' },
    },
  },

  SYNC_RESPONSE: {
    type: 'object',
    required: ['status', 'syncedAt'],
    properties: {
      status: { type: 'string' },
      syncedAt: { type: 'string' },
      conversationId: { type: 'string' },
      messagesCount: { type: 'number' },
      errors: { type: 'array' },
    },
  },

  ANALYTICS_RESPONSE: {
    type: 'object',
    required: ['eventId', 'timestamp'],
    properties: {
      eventId: { type: 'string' },
      timestamp: { type: 'string' },
      status: { type: 'string' },
    },
  },

  HEALTH_RESPONSE: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string' },
      timestamp: { type: 'string' },
      version: { type: 'string' },
      uptime: { type: 'number' },
    },
  },

  LIST_RESPONSE: {
    type: 'object',
    required: ['items', 'pagination'],
    properties: {
      items: { type: 'array' },
      pagination: {
        type: 'object',
        required: ['page', 'limit', 'total'],
        properties: {
          page: { type: 'number' },
          limit: { type: 'number' },
          total: { type: 'number' },
          hasNext: { type: 'boolean' },
          hasPrevious: { type: 'boolean' },
        },
      },
    },
  },
};

/**
 * ResponseValidator class
 * High-level validators for different response types
 */
export class ResponseValidator {
  /**
   * Validate conversation response
   * @param {*} response - Response to validate
   * @returns {boolean}
   */
  static isValidConversation(response) {
    const result = SchemaValidator.validate(response, RESPONSE_SCHEMAS.CONVERSATION);
    return result.valid;
  }

  /**
   * Validate message response
   * @param {*} response - Response to validate
   * @returns {boolean}
   */
  static isValidMessage(response) {
    const result = SchemaValidator.validate(response, RESPONSE_SCHEMAS.MESSAGE);
    return result.valid;
  }

  /**
   * Validate sync response
   * @param {*} response - Response to validate
   * @returns {boolean}
   */
  static isValidSyncResponse(response) {
    const result = SchemaValidator.validate(response, RESPONSE_SCHEMAS.SYNC_RESPONSE);
    return result.valid;
  }

  /**
   * Validate analytics response
   * @param {*} response - Response to validate
   * @returns {boolean}
   */
  static isValidAnalyticsResponse(response) {
    const result = SchemaValidator.validate(response, RESPONSE_SCHEMAS.ANALYTICS_RESPONSE);
    return result.valid;
  }

  /**
   * Validate health response
   * @param {*} response - Response to validate
   * @returns {boolean}
   */
  static isValidHealthResponse(response) {
    const result = SchemaValidator.validate(response, RESPONSE_SCHEMAS.HEALTH_RESPONSE);
    return result.valid;
  }

  /**
   * Validate list response
   * @param {*} response - Response to validate
   * @returns {boolean}
   */
  static isValidListResponse(response) {
    const result = SchemaValidator.validate(response, RESPONSE_SCHEMAS.LIST_RESPONSE);
    return result.valid;
  }

  /**
   * Validate with detailed errors
   * @param {*} response - Response to validate
   * @param {Object} schema - Schema to validate against
   * @returns {Object} - Validation result with errors
   */
  static validateWithErrors(response, schema) {
    return SchemaValidator.validate(response, schema);
  }
}
