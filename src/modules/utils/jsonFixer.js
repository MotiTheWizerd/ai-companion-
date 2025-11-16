/**
 * JSON Validator and Fixer Utility
 * Attempts to fix invalid JSON incrementally with validation after each fix
 */

/**
 * Validate if a string is valid JSON
 * @param {string} jsonString - JSON string to validate
 * @returns {Object} { valid: boolean, error: string|null, parsed: any|null }
 */
function validateJSON(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    return { valid: true, error: null, parsed };
  } catch (error) {
    return { valid: false, error: error.message, parsed: null };
  }
}

/**
 * Fix 1: Remove control characters (invisible characters that break JSON)
 * @param {string} text - Text to clean
 * @returns {string} - Cleaned text
 */
function removeControlCharacters(text) {
  // Remove characters in ranges: 0x00-0x1F (control chars) and 0x7F-0x9F (delete + extended control)
  return text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
}

/**
 * Fix 2: Close truncated strings
 * Attempts to close unclosed quotes and brackets
 * @param {string} jsonString - Potentially truncated JSON
 * @returns {string} - JSON with closed structures
 */
function closeTruncatedStructures(jsonString) {
  let fixed = jsonString.trim();

  // Count opening and closing characters
  const openBraces = (fixed.match(/\{/g) || []).length;
  const closeBraces = (fixed.match(/\}/g) || []).length;
  const openBrackets = (fixed.match(/\[/g) || []).length;
  const closeBrackets = (fixed.match(/\]/g) || []).length;

  // Check if we're inside a string (odd number of unescaped quotes)
  const quotes = fixed.match(/(?<!\\)"/g) || [];
  const insideString = quotes.length % 2 !== 0;

  if (insideString) {
    // Close the string
    fixed += '"';
  }

  // Close any open arrays
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    fixed += ']';
  }

  // Close any open objects
  for (let i = 0; i < openBraces - closeBraces; i++) {
    fixed += '}';
  }

  return fixed;
}

/**
 * Fix 3: Remove trailing commas
 * JSON doesn't allow trailing commas
 * @param {string} jsonString - JSON with possible trailing commas
 * @returns {string} - JSON without trailing commas
 */
function removeTrailingCommas(jsonString) {
  // Remove commas before closing brackets/braces
  return jsonString
    .replace(/,(\s*[}\]])/g, '$1')  // Remove comma before } or ]
    .replace(/,(\s*)$/g, '$1');      // Remove trailing comma at end
}

/**
 * Fix 4: Escape unescaped quotes in strings
 * @param {string} jsonString - JSON with possible unescaped quotes
 * @returns {string} - JSON with properly escaped quotes
 */
function fixUnescapedQuotes(jsonString) {
  // This is complex - for now, just ensure emojis don't break things
  // More sophisticated fixes can be added if needed
  return jsonString;
}

/**
 * Fix 5: Handle truncated text fields
 * For conversation objects, ensure text fields are properly terminated
 * @param {Object} obj - Parsed object (may be partial)
 * @returns {Object} - Fixed object
 */
function fixTruncatedTextFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  // If it's an array, fix each item
  if (Array.isArray(obj)) {
    return obj.map(fixTruncatedTextFields);
  }

  // If it's a conversation object with messages
  if (obj.conversation && Array.isArray(obj.conversation)) {
    obj.conversation = obj.conversation.map(message => {
      if (message.text && typeof message.text === 'string') {
        // Ensure text doesn't end mid-word or with broken markdown
        let text = message.text.trim();

        // If text ends with incomplete markdown or special char, clean it
        if (text.endsWith('*') || text.endsWith('_') || text.endsWith('`')) {
          // Remove incomplete formatting
          text = text.replace(/[*_`]+$/, '').trim();
        }

        message.text = text;
      }
      return message;
    });
  }

  return obj;
}

/**
 * Main function: Fix invalid JSON with incremental validation
 * Tries each fix one at a time and validates after each attempt
 * @param {string} jsonString - Potentially invalid JSON string
 * @returns {Object} { success: boolean, data: any|null, appliedFixes: string[], error: string|null }
 */
export function fixAndValidateJSON(jsonString) {
  const appliedFixes = [];
  let currentJSON = jsonString;

  console.log('[JSONFixer] Starting validation and repair...');

  // Initial validation
  let validation = validateJSON(currentJSON);
  if (validation.valid) {
    console.log('[JSONFixer] ✓ JSON is valid - no fixes needed');
    return {
      success: true,
      data: validation.parsed,
      appliedFixes: [],
      error: null
    };
  }

  console.log('[JSONFixer] ✗ JSON is invalid:', validation.error);

  // Fix 1: Remove control characters
  console.log('[JSONFixer] Attempting Fix 1: Remove control characters');
  currentJSON = removeControlCharacters(currentJSON);
  appliedFixes.push('removeControlCharacters');

  validation = validateJSON(currentJSON);
  if (validation.valid) {
    console.log('[JSONFixer] ✓ Fixed with: Remove control characters');
    return {
      success: true,
      data: validation.parsed,
      appliedFixes,
      error: null
    };
  }

  // Fix 2: Close truncated structures
  console.log('[JSONFixer] Attempting Fix 2: Close truncated structures');
  currentJSON = closeTruncatedStructures(currentJSON);
  appliedFixes.push('closeTruncatedStructures');

  validation = validateJSON(currentJSON);
  if (validation.valid) {
    console.log('[JSONFixer] ✓ Fixed with: Close truncated structures');

    // Apply Fix 5 to the parsed object
    const fixedData = fixTruncatedTextFields(validation.parsed);
    appliedFixes.push('fixTruncatedTextFields');

    return {
      success: true,
      data: fixedData,
      appliedFixes,
      error: null
    };
  }

  // Fix 3: Remove trailing commas
  console.log('[JSONFixer] Attempting Fix 3: Remove trailing commas');
  currentJSON = removeTrailingCommas(currentJSON);
  appliedFixes.push('removeTrailingCommas');

  validation = validateJSON(currentJSON);
  if (validation.valid) {
    console.log('[JSONFixer] ✓ Fixed with: Remove trailing commas');

    const fixedData = fixTruncatedTextFields(validation.parsed);
    appliedFixes.push('fixTruncatedTextFields');

    return {
      success: true,
      data: fixedData,
      appliedFixes,
      error: null
    };
  }

  // All fixes failed
  console.error('[JSONFixer] ✗ All fixes failed. Final error:', validation.error);
  console.error('[JSONFixer] Last 200 chars:', currentJSON.slice(-200));

  return {
    success: false,
    data: null,
    appliedFixes,
    error: `Unable to fix JSON: ${validation.error}`
  };
}

/**
 * Safe JSON stringify for conversation data
 * Ensures the data can be properly serialized
 * @param {Object} data - Data to stringify
 * @returns {string} - Valid JSON string
 */
export function safeStringify(data) {
  try {
    // First pass: normal stringify
    const jsonString = JSON.stringify(data);

    // Validate it can be parsed
    const result = fixAndValidateJSON(jsonString);

    if (result.success) {
      return JSON.stringify(result.data);
    }

    throw new Error('Failed to create valid JSON');
  } catch (error) {
    console.error('[JSONFixer] safeStringify failed:', error);

    // Fallback: try to create a minimal valid object
    return JSON.stringify({
      error: 'Serialization failed',
      originalError: error.message,
      data: null
    });
  }
}
