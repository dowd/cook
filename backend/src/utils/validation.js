/**
 * Input Validation Utilities
 * Validates recipe IDs, content, and file uploads
 */

import { isValidRecipeId } from '../lib/id-generator.js';
import { isValidCookFile } from '../lib/recipe-parser.js';

// Maximum recipe content size: 1MB
const MAX_CONTENT_SIZE = 1024 * 1024; // 1,048,576 bytes

/**
 * Validates recipe ID format
 * @param {string} id - Recipe ID to validate
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateRecipeId(id) {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'Recipe ID is required' };
  }

  if (!isValidRecipeId(id)) {
    return { valid: false, error: 'Invalid recipe ID format. Must be 8-character alphanumeric (lowercase)' };
  }

  return { valid: true };
}

/**
 * Validates recipe content size
 * @param {string} content - Recipe content to validate
 * @returns {Object} { valid: boolean, error?: string, size?: number }
 */
export function validateContentSize(content) {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Recipe content is required' };
  }

  const size = Buffer.byteLength(content, 'utf8');

  if (size > MAX_CONTENT_SIZE) {
    return {
      valid: false,
      error: `Recipe content exceeds maximum size of ${MAX_CONTENT_SIZE} bytes (${size} bytes)`,
      size,
    };
  }

  return { valid: true, size };
}

/**
 * Validates file extension
 * @param {string} filename - Filename to validate
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateFileExtension(filename) {
  if (!filename || typeof filename !== 'string') {
    return { valid: false, error: 'Filename is required' };
  }

  if (!isValidCookFile(filename)) {
    return { valid: false, error: 'Invalid file extension. Only .cook files are allowed' };
  }

  return { valid: true };
}

/**
 * Validates create recipe request (text content)
 * @param {Object} body - Request body
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateCreateRequest(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    return { valid: false, error: 'Title is required' };
  }

  if (body.title.length > 200) {
    return { valid: false, error: 'Title exceeds maximum length of 200 characters' };
  }

  if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
    return { valid: false, error: 'Recipe content is required' };
  }

  const contentValidation = validateContentSize(body.content);
  if (!contentValidation.valid) {
    return contentValidation;
  }

  return { valid: true };
}

/**
 * Validates update recipe request
 * @param {Object} body - Request body
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateUpdateRequest(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
    return { valid: false, error: 'Recipe content is required' };
  }

  const contentValidation = validateContentSize(body.content);
  if (!contentValidation.valid) {
    return contentValidation;
  }

  return { valid: true };
}

/**
 * Sanitizes recipe ID from path parameter
 * @param {string} recipeId - Recipe ID from path
 * @returns {string} Sanitized recipe ID
 */
export function sanitizeRecipeId(recipeId) {
  if (!recipeId || typeof recipeId !== 'string') {
    return '';
  }

  // Remove any path traversal attempts and normalize
  return recipeId.trim().replace(/[^a-z0-9]/g, '');
}
