/**
 * Error Handling Utilities
 * Standardized error responses for API Gateway
 */

/**
 * Creates a standardized error response for API Gateway
 * @param {number} statusCode - HTTP status code
 * @param {string} error - Error code/type
 * @param {string} message - Human-readable error message
 * @returns {Object} API Gateway response object
 */
export function createErrorResponse(statusCode, error, message) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    },
    body: JSON.stringify({
      error,
      message,
    }),
  };
}

/**
 * HTTP status code mappings
 */
export const StatusCodes = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Error type mappings
 */
export const ErrorTypes = {
  VALIDATION_ERROR: 'ValidationError',
  UNAUTHORIZED: 'Unauthorized',
  NOT_FOUND: 'NotFound',
  PAYLOAD_TOO_LARGE: 'PayloadTooLarge',
  TOO_MANY_REQUESTS: 'TooManyRequests',
  INTERNAL_SERVER_ERROR: 'InternalServerError',
  SERVICE_UNAVAILABLE: 'ServiceUnavailable',
};

/**
 * Creates a 400 Bad Request response
 */
export function badRequest(message = 'Bad request') {
  return createErrorResponse(StatusCodes.BAD_REQUEST, ErrorTypes.VALIDATION_ERROR, message);
}

/**
 * Creates a 401 Unauthorized response
 */
export function unauthorized(message = 'Unauthorized') {
  return createErrorResponse(StatusCodes.UNAUTHORIZED, ErrorTypes.UNAUTHORIZED, message);
}

/**
 * Creates a 404 Not Found response
 */
export function notFound(message = 'Resource not found') {
  return createErrorResponse(StatusCodes.NOT_FOUND, ErrorTypes.NOT_FOUND, message);
}

/**
 * Creates a 413 Payload Too Large response
 */
export function payloadTooLarge(message = 'Payload too large') {
  return createErrorResponse(StatusCodes.PAYLOAD_TOO_LARGE, ErrorTypes.PAYLOAD_TOO_LARGE, message);
}

/**
 * Creates a 429 Too Many Requests response
 */
export function tooManyRequests(message = 'Rate limit exceeded', retryAfter = 60) {
  return {
    statusCode: StatusCodes.TOO_MANY_REQUESTS,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
      'Retry-After': retryAfter.toString(),
    },
    body: JSON.stringify({
      error: ErrorTypes.TOO_MANY_REQUESTS,
      message,
    }),
  };
}

/**
 * Creates a 500 Internal Server Error response
 */
export function internalServerError(message = 'Internal server error') {
  return createErrorResponse(StatusCodes.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR, message);
}

/**
 * Creates a 503 Service Unavailable response
 */
export function serviceUnavailable(message = 'Service temporarily unavailable') {
  return createErrorResponse(StatusCodes.SERVICE_UNAVAILABLE, ErrorTypes.SERVICE_UNAVAILABLE, message);
}

/**
 * Creates a success response
 */
export function success(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': typeof data === 'string' ? 'text/plain' : 'application/json',
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    },
    body: typeof data === 'string' ? data : JSON.stringify(data),
  };
}

/**
 * Logs error to CloudWatch (errors only per FR-020)
 * @param {Error} error - Error object
 * @param {Object} context - Additional context (recipeId, userId, etc.)
 */
export function logError(error, context = {}) {
  const errorLog = {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context,
  };

  console.error(JSON.stringify(errorLog));
}
