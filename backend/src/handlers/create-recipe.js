/**
 * POST /recipes Handler
 * Creates a new recipe (authenticated endpoint)
 * Supports both text content (JSON) and file upload (multipart/form-data)
 */

import { requireAuth } from '../lib/auth.js';
import { putRecipe } from '../lib/s3-client.js';
import { generateRecipeId } from '../lib/id-generator.js';
import { extractTitle, isValidCookFile } from '../lib/recipe-parser.js';
import { validateCreateRequest, validateFileExtension, validateContentSize } from '../utils/validation.js';
import { success, badRequest, unauthorized, payloadTooLarge, tooManyRequests, internalServerError, logError, StatusCodes } from '../utils/errors.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const busboy = require('busboy');

/**
 * Parses multipart/form-data request body
 * @param {Object} event - API Gateway event
 * @returns {Promise<Object>} Parsed form data with file and fields
 */
async function parseMultipartFormData(event) {
  return new Promise((resolve, reject) => {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';

    if (!contentType.includes('multipart/form-data')) {
      reject(new Error('Content-Type must be multipart/form-data'));
      return;
    }

    const bb = busboy({ headers: event.headers });
    const result = {
      file: null,
      filename: null,
      fields: {},
    };

    bb.on('file', (name, file, info) => {
      const { filename, encoding, mimeType } = info;
      result.filename = filename;

      const chunks = [];
      file.on('data', (chunk) => {
        chunks.push(chunk);
      });

      file.on('end', () => {
        result.file = Buffer.concat(chunks).toString('utf8');
      });
    });

    bb.on('field', (name, value) => {
      result.fields[name] = value;
    });

    bb.on('finish', () => {
      resolve(result);
    });

    bb.on('error', (error) => {
      reject(error);
    });

    // Parse the body
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body || '', 'utf8');

    bb.write(body);
    bb.end();
  });
}

/**
 * Lambda handler for POST /recipes
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

    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    let recipeId;
    let title;
    let content;

    // Handle multipart/form-data (file upload)
    if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await parseMultipartFormData(event);

        if (!formData.file) {
          return badRequest('File is required for multipart/form-data requests');
        }

        // Validate file extension
        if (!formData.filename) {
          return badRequest('Filename is required');
        }

        const fileValidation = validateFileExtension(formData.filename);
        if (!fileValidation.valid) {
          return badRequest(fileValidation.error);
        }

        // Validate content size
        const sizeValidation = validateContentSize(formData.file);
        if (!sizeValidation.valid) {
          return payloadTooLarge(sizeValidation.error);
        }

        content = formData.file;

        // Extract title from frontmatter or filename
        recipeId = generateRecipeId();
        title = extractTitle(content, formData.filename, recipeId);
      } catch (parseError) {
        logError(parseError, { handler: 'create-recipe', userId: user.sub });
        return badRequest('Failed to parse multipart/form-data');
      }
    } else {
      // Handle JSON (text content)
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (parseError) {
        return badRequest('Invalid JSON in request body');
      }

      // Validate request
      const validation = validateCreateRequest(body);
      if (!validation.valid) {
        return badRequest(validation.error);
      }

      title = body.title;
      content = body.content;
    }

    // Generate recipe ID
    if (!recipeId) {
      recipeId = generateRecipeId();
    }

    // Store recipe in S3
    const now = new Date().toISOString();
    await putRecipe(recipeId, content, {
      title,
      createdAt: now,
      lastModified: now,
    });

    return success({
      id: recipeId,
      message: 'Recipe created successfully',
    }, StatusCodes.CREATED);
  } catch (error) {
    logError(error, { handler: 'create-recipe', userId: event.requestContext?.authorizer?.sub });

    // Check for rate limiting
    if (error.statusCode === 429 || error.$metadata?.httpStatusCode === 429) {
      return tooManyRequests('Rate limit exceeded');
    }

    return internalServerError('Failed to create recipe');
  }
}
