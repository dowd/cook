/**
 * Lambda handler for DELETE /recipes/{id}
 * Deletes a recipe from the system
 * Requires authentication
 */

import { initializeS3, deleteRecipe, recipeExists } from '../lib/s3-client.js';
import { initializeAuth, validateAuthHeader } from '../lib/auth.js';
import { validateRecipeId } from '../utils/validation.js';
import { Errors, logError } from '../utils/errors.js';

let s3Initialized = false;
let authInitialized = false;

/**
 * Initialize S3 and Auth clients if not already initialized
 */
function ensureInitialized() {
  if (!s3Initialized) {
    const bucketName = process.env.S3_BUCKET_NAME;
    const region = process.env.AWS_REGION || 'us-east-1';
    if (!bucketName) {
      throw new Error('S3_BUCKET_NAME environment variable is not set');
    }
    initializeS3(bucketName, region);
    s3Initialized = true;
  }

  if (!authInitialized) {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const region = process.env.COGNITO_REGION || process.env.AWS_REGION || 'us-east-1';
    if (!userPoolId) {
      throw new Error('COGNITO_USER_POOL_ID environment variable is not set');
    }
    initializeAuth(userPoolId, region);
    authInitialized = true;
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

    // Validate authentication
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    try {
      await validateAuthHeader(authHeader);
    } catch (authError) {
      return Errors.Unauthorized(authError.message);
    }

    const recipeId = event.pathParameters?.recipeId;

    // Validate recipe ID format
    const idError = validateRecipeId(recipeId);
    if (idError) {
      return Errors.ValidationError(idError);
    }

    // Check if recipe exists
    const exists = await recipeExists(recipeId);
    if (!exists) {
      return Errors.NotFound();
    }

    // Delete recipe from S3
    await deleteRecipe(recipeId);

    // Return 200 OK with message (per spec, can also return 204)
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: recipeId,
        message: 'Recipe deleted successfully',
      }),
    };
  } catch (error) {
    logError(error, { 
      requestId: event.requestContext?.requestId,
      recipeId: event.pathParameters?.recipeId,
      operation: 'delete-recipe' 
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

