/**
 * Lambda handler for PUT /recipes/{id}
 * Updates an existing recipe with new Cooklang content
 * Requires authentication
 */

import { initializeS3, putRecipe, recipeExists, getRecipeTags } from '../lib/s3-client.js';
import { initializeAuth, validateAuthHeader } from '../lib/auth.js';
import { validateRecipeId, validateContent, getContentSize } from '../utils/validation.js';
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

    // Parse request body
    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (parseError) {
      return Errors.ValidationError('Invalid JSON in request body');
    }

    if (!body.content) {
      return Errors.ValidationError('Content is required');
    }

    const content = body.content;

    // Validate content
    const contentError = validateContent(content);
    if (contentError) {
      return Errors.ValidationError(contentError);
    }

    // Check content size
    const size = getContentSize(content);
    if (size > 1048576) {
      return Errors.PayloadTooLarge();
    }

    // Check if recipe exists
    const exists = await recipeExists(recipeId);
    if (!exists) {
      return Errors.NotFound();
    }

    // Get existing tags to preserve createdAt and title
    const existingTags = await getRecipeTags(recipeId);
    if (!existingTags) {
      return Errors.NotFound();
    }

    // Update recipe in S3, preserving existing metadata
    const now = new Date().toISOString();
    await putRecipe(recipeId, content, {
      title: existingTags.title || recipeId,
      createdAt: existingTags.createdAt || now,
      lastModified: now,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: recipeId,
        message: 'Recipe updated successfully',
      }),
    };
  } catch (error) {
    logError(error, { 
      requestId: event.requestContext?.requestId,
      recipeId: event.pathParameters?.recipeId,
      operation: 'update-recipe' 
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

