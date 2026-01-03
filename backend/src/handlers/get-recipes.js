/**
 * Lambda handler for GET /recipes
 * Returns a list of all recipes with basic metadata (ID and title)
 * Public endpoint - no authentication required
 */

import { initializeS3, listRecipes } from '../lib/s3-client.js';
import { Errors, logError } from '../utils/errors.js';

let initialized = false;

/**
 * Initialize S3 client if not already initialized
 */
function ensureInitialized() {
  if (!initialized) {
    const bucketName = process.env.S3_BUCKET_NAME;
    const region = process.env.AWS_REGION || 'us-east-1';
    if (!bucketName) {
      throw new Error('S3_BUCKET_NAME environment variable is not set');
    }
    initializeS3(bucketName, region);
    initialized = true;
  }
}

/**
 * Lambda handler
 * @param {Object} event - API Gateway event
 * @returns {Promise<Object>} API Gateway response
 */
export async function handler(event) {
  try {
    ensureInitialized();

    const recipes = await listRecipes();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(recipes),
    };
  } catch (error) {
    logError(error, { 
      requestId: event.requestContext?.requestId,
      operation: 'get-recipes' 
    });

    // Check if it's an S3 error
    if (error.name === 'NoSuchBucket' || error.$metadata?.httpStatusCode === 404) {
      return Errors.ServiceUnavailable('S3 bucket not found');
    }

    // Check for service unavailable errors
    if (error.$metadata?.httpStatusCode === 503 || error.message?.includes('unavailable')) {
      return Errors.ServiceUnavailable();
    }

    return Errors.InternalServerError();
  }
}

