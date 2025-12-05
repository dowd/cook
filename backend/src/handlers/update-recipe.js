/**
 * PUT /recipes/{id} Handler
 * Updates an existing recipe (authenticated endpoint)
 */

import { requireAuth } from '../lib/auth.js';
import { updateRecipe } from '../lib/s3-client.js';
import { validateRecipeId, sanitizeRecipeId, validateUpdateRequest } from '../utils/validation.js';
import { success, badRequest, unauthorized, notFound, tooManyRequests, internalServerError, logError } from '../utils/errors.js';

/**
 * Lambda handler for PUT /recipes/{id}
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

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return badRequest('Invalid JSON in request body');
    }

    // Validate request
    const validation = validateUpdateRequest(body);
    if (!validation.valid) {
      return badRequest(validation.error);
    }

    // Extract title from content if present
    let title = null;
    const titleMatch = body.content.match(/^>>\s*title\s*:\s*(.+)$/im);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }

    // Update recipe in S3
    await updateRecipe(recipeId, body.content, {
      title,
      lastModified: new Date().toISOString(),
    });

    return success({
      id: recipeId,
      message: 'Recipe updated successfully',
    });
  } catch (error) {
    logError(error, {
      handler: 'update-recipe',
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

    return internalServerError('Failed to update recipe');
  }
}
