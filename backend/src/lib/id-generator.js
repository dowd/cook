/**
 * ID Generator Utility
 * Generates short alphanumeric IDs for recipes
 */

import { customAlphabet } from 'nanoid';

// Custom alphabet: lowercase letters and digits (36 characters)
const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
const length = 8;

// Create nanoid generator with custom alphabet
const generateId = customAlphabet(alphabet, length);

/**
 * Generates a unique recipe ID
 * @returns {string} 8-character alphanumeric ID (e.g., 'abc12345')
 */
export function generateRecipeId() {
  return generateId();
}

/**
 * Validates a recipe ID format
 * @param {string} id - Recipe ID to validate
 * @returns {boolean} True if valid format
 */
export function isValidRecipeId(id) {
  if (typeof id !== 'string') {
    return false;
  }

  // Must be exactly 8 characters, alphanumeric lowercase
  const pattern = /^[a-z0-9]{8}$/;
  return pattern.test(id);
}
