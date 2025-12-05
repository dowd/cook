/**
 * GET /recipes Handler
 * Lists all recipes with metadata (public endpoint, no authentication required)
 */

import { listRecipes } from '../lib/s3-client.js';
import { success, internalServerError, serviceUnavailable, tooManyRequests, logError, StatusCodes } from '../utils/errors.js';

/**
 * Lambda handler for GET /recipes
 * @param {Object} event - API Gateway event
 * @returns {Object} API Gateway response
 */
export async function handler(event) {
  try {
    // Check for rate limiting (API Gateway handles this, but we can check status)
    if (event.requestContext?.status === 429) {
      return tooManyRequests('Rate limit exceeded');
    }

    const recipes = await listRecipes();

    return success(recipes);
  } catch (error) {
    logError(error, { handler: 'get-recipes', path: event.path });

    // Check for rate limiting
    if (error.statusCode === 429 || error.$metadata?.httpStatusCode === 429) {
      return tooManyRequests('Rate limit exceeded');
    }

    // Check if S3 error
    if (error.name === 'NoSuchBucket' || error.$metadata?.httpStatusCode === 404) {
      return serviceUnavailable('S3 bucket not found');
    }

    if (error.$metadata?.httpStatusCode === 503 || error.code === 'ECONNREFUSED') {
      return serviceUnavailable('S3 service temporarily unavailable');
    }

    return internalServerError('Failed to retrieve recipes');
  }
}
