/**
 * GET /recipes/{id} Handler
 * Retrieves a single recipe by ID (public endpoint, no authentication required)
 */

import { getRecipe } from '../lib/s3-client.js';
import { validateRecipeId, sanitizeRecipeId } from '../utils/validation.js';
import { success, badRequest, notFound, internalServerError, serviceUnavailable, tooManyRequests, logError } from '../utils/errors.js';

/**
 * Lambda handler for GET /recipes/{id}
 * @param {Object} event - API Gateway event
 * @returns {Object} API Gateway response
 */
export async function handler(event) {
  try {
    // Check for rate limiting
    if (event.requestContext?.status === 429) {
      return tooManyRequests('Rate limit exceeded');
    }

    // Extract recipe ID from path parameters
    const recipeId = sanitizeRecipeId(event.pathParameters?.recipeId);

    // Validate recipe ID format
    const validation = validateRecipeId(recipeId);
    if (!validation.valid) {
      return badRequest(validation.error);
    }

    // Get recipe from S3
    const content = await getRecipe(recipeId);

    // Return as text/plain (Cooklang format)
    return success(content);
  } catch (error) {
    logError(error, { handler: 'get-recipe', recipeId: event.pathParameters?.recipeId });

    // Check for rate limiting
    if (error.statusCode === 429 || error.$metadata?.httpStatusCode === 429) {
      return tooManyRequests('Rate limit exceeded');
    }

    // Handle specific errors
    if (error.message === 'Recipe not found') {
      return notFound('Recipe not found');
    }

    if (error.name === 'NoSuchBucket' || error.$metadata?.httpStatusCode === 404) {
      return serviceUnavailable('S3 bucket not found');
    }

    if (error.$metadata?.httpStatusCode === 503 || error.code === 'ECONNREFUSED') {
      return serviceUnavailable('S3 service temporarily unavailable');
    }

    return internalServerError('Failed to retrieve recipe');
  }
}
