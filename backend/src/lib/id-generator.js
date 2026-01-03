/**
 * ID generator utilities
 * Generates unique 8-character alphanumeric IDs for recipes
 */

import { customAlphabet } from 'nanoid';
import { idExists } from './s3-client.js';

// Custom alphabet: lowercase letters and digits only
const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
const generateId = customAlphabet(alphabet, 8);

/**
 * Generate a unique recipe ID
 * Checks S3 to ensure uniqueness before returning
 * @param {number} maxAttempts - Maximum number of attempts to generate unique ID (default: 10)
 * @returns {Promise<string>} Unique 8-character alphanumeric ID
 */
export async function generateUniqueId(maxAttempts = 10) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const id = generateId();
    
    // Check if ID already exists in S3
    const exists = await idExists(id);
    if (!exists) {
      return id;
    }
  }

  // If we've exhausted attempts, throw error
  throw new Error(`Failed to generate unique ID after ${maxAttempts} attempts`);
}

/**
 * Generate a recipe ID without uniqueness check
 * Use this only when you know the ID will be unique (e.g., testing)
 * @returns {string} 8-character alphanumeric ID
 */
export function generateIdSync() {
  return generateId();
}

