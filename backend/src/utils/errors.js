/**
 * Error response utilities
 * Provides standardized error response format and HTTP status code mapping
 */

/**
 * Create a standardized error response
 * @param {string} error - Error code/type
 * @param {string} message - Human-readable error message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Error response object
 */
export function createErrorResponse(error, message, statusCode = 500) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      error,
      message,
    }),
  };
}

/**
 * Log error (errors only, per spec requirement)
 * @param {Error} error - Error object
 * @param {Object} context - Additional context (e.g., request ID, user ID)
 */
export function logError(error, context = {}) {
  const errorInfo = {
    error: error.message,
    stack: error.stack,
    ...context,
  };
  console.error(JSON.stringify(errorInfo));
}

/**
 * Map error types to HTTP status codes
 */
export const ErrorCodes = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Common error responses
 */
export const Errors = {
  ValidationError: (message) =>
    createErrorResponse('ValidationError', message, ErrorCodes.BAD_REQUEST),
  Unauthorized: (message = 'Missing or invalid authentication token') =>
    createErrorResponse('Unauthorized', message, ErrorCodes.UNAUTHORIZED),
  NotFound: (message = 'Recipe not found') =>
    createErrorResponse('NotFound', message, ErrorCodes.NOT_FOUND),
  PayloadTooLarge: (message = 'Recipe content exceeds maximum size of 1MB') =>
    createErrorResponse('PayloadTooLarge', message, ErrorCodes.PAYLOAD_TOO_LARGE),
  TooManyRequests: (message = 'Rate limit exceeded. Please try again later.', retryAfter = 60) =>
    ({
      statusCode: ErrorCodes.TOO_MANY_REQUESTS,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
      },
      body: JSON.stringify({
        error: 'TooManyRequests',
        message,
      }),
    }),
  InternalServerError: (message = 'An unexpected error occurred') =>
    createErrorResponse('InternalServerError', message, ErrorCodes.INTERNAL_SERVER_ERROR),
  ServiceUnavailable: (message = 'Service temporarily unavailable. Please try again later.') =>
    createErrorResponse('ServiceUnavailable', message, ErrorCodes.SERVICE_UNAVAILABLE),
};

