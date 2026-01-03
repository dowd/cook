/**
 * Lambda handler for POST /recipes
 * Creates a new recipe from either JSON content or file upload
 * Requires authentication
 */

import { initializeS3, putRecipe } from '../lib/s3-client.js';
import { initializeAuth, validateAuthHeader } from '../lib/auth.js';
import { generateUniqueId } from '../lib/id-generator.js';
import { extractTitle } from '../lib/recipe-parser.js';
import { validateContent, validateTitle, validateFilename, getContentSize } from '../utils/validation.js';
import { Errors, logError } from '../utils/errors.js';
import busboy from 'busboy';

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
 * Parse multipart form data for file upload
 * @param {string|Buffer} body - Request body
 * @param {string} contentType - Content-Type header
 * @param {boolean} isBase64Encoded - Whether body is base64 encoded
 * @returns {Promise<Object>} Parsed data with file content and filename
 */
function parseMultipartFormData(body, contentType, isBase64Encoded = false) {
  return new Promise((resolve, reject) => {
    const formData = {
      file: null,
      filename: null,
    };

    const parser = busboy({ headers: { 'content-type': contentType } });

    parser.on('file', (name, file, info) => {
      const { filename } = info;
      formData.filename = filename;
      const chunks = [];

      file.on('data', (chunk) => {
        chunks.push(chunk);
      });

      file.on('end', () => {
        formData.file = Buffer.concat(chunks).toString('utf-8');
      });
    });

    parser.on('finish', () => {
      resolve(formData);
    });

    parser.on('error', (error) => {
      reject(error);
    });

    // Handle base64 encoded body from API Gateway
    const bodyBuffer = Buffer.isBuffer(body) 
      ? body 
      : Buffer.from(body, isBase64Encoded ? 'base64' : 'utf-8');
    
    parser.write(bodyBuffer);
    parser.end();
  });
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

    let content = null;
    let title = null;
    let filename = null;

    const contentType = event.headers?.['Content-Type'] || event.headers?.['content-type'] || '';

    // Handle multipart file upload
    if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await parseMultipartFormData(
          event.body,
          contentType,
          event.isBase64Encoded || false
        );

        if (!formData.file) {
          return Errors.ValidationError('No file provided in multipart form data');
        }

        if (!formData.filename) {
          return Errors.ValidationError('Filename is required for file upload');
        }

        // Validate file extension
        const filenameError = validateFilename(formData.filename);
        if (filenameError) {
          return Errors.ValidationError(filenameError);
        }

        content = formData.file;
        filename = formData.filename;
      } catch (parseError) {
        logError(parseError, { operation: 'parseMultipartFormData' });
        return Errors.ValidationError('Failed to parse multipart form data');
      }
    } else {
      // Handle JSON request
      let body;
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (parseError) {
        return Errors.ValidationError('Invalid JSON in request body');
      }

      if (!body.title && !body.content) {
        return Errors.ValidationError('Either title and content (JSON) or file (multipart) is required');
      }

      if (body.title && body.content) {
        title = body.title;
        content = body.content;
      } else {
        return Errors.ValidationError('Both title and content are required for JSON requests');
      }
    }

    // Validate content
    const contentError = validateContent(content);
    if (contentError) {
      return Errors.ValidationError(contentError);
    }

    // Extract title if not provided
    if (!title) {
      title = extractTitle(content, filename);
    }

    // Validate title
    const titleError = validateTitle(title);
    if (titleError) {
      return Errors.ValidationError(titleError);
    }

    // Check content size
    const size = getContentSize(content);
    if (size > 1048576) {
      return Errors.PayloadTooLarge();
    }

    // Generate unique ID
    const id = await generateUniqueId();

    // Store in S3 with tags
    const now = new Date().toISOString();
    await putRecipe(id, content, {
      title,
      createdAt: now,
      lastModified: now,
    });

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id,
        message: 'Recipe created successfully',
      }),
    };
  } catch (error) {
    logError(error, { 
      requestId: event.requestContext?.requestId,
      operation: 'create-recipe' 
    });

    // Check for specific error types
    if (error.message?.includes('unique ID')) {
      return Errors.InternalServerError('Failed to generate unique recipe ID');
    }

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

