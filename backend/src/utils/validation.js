/**
 * Input validation utilities
 * Validates recipe IDs, content size, titles, and file extensions
 */

/**
 * Recipe ID format: exactly 8 lowercase alphanumeric characters
 */
const RECIPE_ID_PATTERN = /^[a-z0-9]{8}$/;

/**
 * Maximum content size: 1MB (1,048,576 bytes)
 */
const MAX_CONTENT_SIZE = 1048576;

/**
 * Maximum title length: 200 characters
 */
const MAX_TITLE_LENGTH = 200;

/**
 * Valid file extension for recipes
 */
const VALID_FILE_EXTENSION = '.cook';

/**
 * Validate recipe ID format
 * @param {string} id - Recipe ID to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidRecipeId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return RECIPE_ID_PATTERN.test(id);
}

/**
 * Validate content size
 * @param {string|Buffer} content - Content to validate
 * @returns {boolean} True if within size limit, false otherwise
 */
export function isValidContentSize(content) {
  if (!content) {
    return false;
  }
  const size = typeof content === 'string' ? Buffer.byteLength(content, 'utf8') : content.length;
  return size > 0 && size <= MAX_CONTENT_SIZE;
}

/**
 * Validate title
 * @param {string} title - Title to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidTitle(title) {
  if (!title || typeof title !== 'string') {
    return false;
  }
  return title.trim().length > 0 && title.length <= MAX_TITLE_LENGTH;
}

/**
 * Validate file extension
 * @param {string} filename - Filename to validate
 * @returns {boolean} True if has valid extension, false otherwise
 */
export function isValidFileExtension(filename) {
  if (!filename || typeof filename !== 'string') {
    return false;
  }
  return filename.toLowerCase().endsWith(VALID_FILE_EXTENSION);
}

/**
 * Get content size in bytes
 * @param {string|Buffer} content - Content to measure
 * @returns {number} Size in bytes
 */
export function getContentSize(content) {
  if (!content) {
    return 0;
  }
  return typeof content === 'string' ? Buffer.byteLength(content, 'utf8') : content.length;
}

/**
 * Validate recipe ID and return error message if invalid
 * @param {string} id - Recipe ID to validate
 * @returns {string|null} Error message or null if valid
 */
export function validateRecipeId(id) {
  if (!id) {
    return 'Recipe ID is required';
  }
  if (typeof id !== 'string') {
    return 'Recipe ID must be a string';
  }
  if (!isValidRecipeId(id)) {
    return 'Recipe ID must be exactly 8 lowercase alphanumeric characters';
  }
  return null;
}

/**
 * Validate content and return error message if invalid
 * @param {string|Buffer} content - Content to validate
 * @returns {string|null} Error message or null if valid
 */
export function validateContent(content) {
  if (!content) {
    return 'Content is required';
  }
  if (!isValidContentSize(content)) {
    const size = getContentSize(content);
    if (size === 0) {
      return 'Content cannot be empty';
    }
    return `Content size (${size} bytes) exceeds maximum of ${MAX_CONTENT_SIZE} bytes (1MB)`;
  }
  return null;
}

/**
 * Validate title and return error message if invalid
 * @param {string} title - Title to validate
 * @returns {string|null} Error message or null if valid
 */
export function validateTitle(title) {
  if (!title) {
    return 'Title is required';
  }
  if (typeof title !== 'string') {
    return 'Title must be a string';
  }
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return 'Title cannot be empty';
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    return `Title exceeds maximum length of ${MAX_TITLE_LENGTH} characters`;
  }
  return null;
}

/**
 * Validate filename and return error message if invalid
 * @param {string} filename - Filename to validate
 * @returns {string|null} Error message or null if valid
 */
export function validateFilename(filename) {
  if (!filename) {
    return 'Filename is required';
  }
  if (typeof filename !== 'string') {
    return 'Filename must be a string';
  }
  if (!isValidFileExtension(filename)) {
    return `File must have ${VALID_FILE_EXTENSION} extension`;
  }
  return null;
}

export const ValidationConstants = {
  MAX_CONTENT_SIZE,
  MAX_TITLE_LENGTH,
  RECIPE_ID_PATTERN,
  VALID_FILE_EXTENSION,
};

