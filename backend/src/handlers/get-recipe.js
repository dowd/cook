/**
 * Lambda handler for GET /recipes/{id}
 * Returns the full Cooklang content of a specific recipe
 * Public endpoint - no authentication required
 */

import { initializeS3, getRecipe } from '../lib/s3-client.js';
import { validateRecipeId } from '../utils/validation.js';
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

    const recipeId = event.pathParameters?.recipeId;

    // Validate recipe ID format
    const idError = validateRecipeId(recipeId);
    if (idError) {
      return Errors.ValidationError(idError);
    }

    const content = await getRecipe(recipeId);

    if (content === null) {
      return Errors.NotFound();
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
      body: content,
    };
  } catch (error) {
    logError(error, { 
      requestId: event.requestContext?.requestId,
      recipeId: event.pathParameters?.recipeId,
      operation: 'get-recipe' 
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

