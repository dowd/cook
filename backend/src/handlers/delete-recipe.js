/**
 * DELETE /recipes/{id} Handler
 * Deletes a recipe (authenticated endpoint)
 */

import { requireAuth } from '../lib/auth.js';
import { deleteRecipe } from '../lib/s3-client.js';
import { validateRecipeId, sanitizeRecipeId } from '../utils/validation.js';
import { success, badRequest, unauthorized, notFound, tooManyRequests, internalServerError, logError, StatusCodes } from '../utils/errors.js';

/**
 * Lambda handler for DELETE /recipes/{id}
 * @param {Object} event - API Gateway event
 * @returns {Object} API Gateway response
 */
export async function handler(event) {
  try {
    // Check for rate limiting
    if (event.requestContext?.status === 429) {
      return tooManyRequests('Rate limit exceeded');
    }

    // Authenticate user
    let user;
    try {
      user = await requireAuth(event);
    } catch (authError) {
      return unauthorized(authError.message || 'Authentication required');
    }

    // Extract and validate recipe ID
    const recipeId = sanitizeRecipeId(event.pathParameters?.recipeId);
    const idValidation = validateRecipeId(recipeId);
    if (!idValidation.valid) {
      return badRequest(idValidation.error);
    }

    // Delete recipe from S3
    await deleteRecipe(recipeId);

    return success({
      id: recipeId,
      message: 'Recipe deleted successfully',
    }, StatusCodes.NO_CONTENT);
  } catch (error) {
    logError(error, {
      handler: 'delete-recipe',
      recipeId: event.pathParameters?.recipeId,
      userId: event.requestContext?.authorizer?.sub,
    });

    // Check for rate limiting
    if (error.statusCode === 429 || error.$metadata?.httpStatusCode === 429) {
      return tooManyRequests('Rate limit exceeded');
    }

    // Handle specific errors
    if (error.message === 'Recipe not found') {
      return notFound('Recipe not found');
    }

    return internalServerError('Failed to delete recipe');
  }
}
