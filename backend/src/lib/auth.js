/**
 * JWT Authentication Utility
 * Validates AWS Cognito JWT tokens for Lambda functions
 */

import jwt from 'jsonwebtoken';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const https = require('https');
const jwksClient = require('jwks-rsa');

// Cache for JWKS clients (one per user pool)
const jwksClients = new Map();

/**
 * Gets or creates a JWKS client for a user pool
 */
function getJWKSClient(userPoolId, region) {
  const key = `${region}:${userPoolId}`;

  if (!jwksClients.has(key)) {
    const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
    const client = jwksClient({
      jwksUri: `${issuer}/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 60 * 60 * 1000, // 1 hour
      rateLimit: true,
      jwksRequestsPerMinute: 5,
    });
    jwksClients.set(key, client);
  }

  return jwksClients.get(key);
}

/**
 * Gets the signing key from JWKS for a given token
 */
function getKey(header, callback, jwksClient) {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

/**
 * Validates a Cognito JWT token
 * @param {string} token - JWT token string
 * @param {string} userPoolId - Cognito User Pool ID
 * @param {string} appClientId - Cognito App Client ID
 * @param {string} region - AWS region (default: us-east-1)
 * @returns {Promise<Object>} Decoded token payload
 * @throws {Error} If token is invalid
 */
export async function validateToken(token, userPoolId, appClientId, region = 'us-east-1') {
  if (!token) {
    throw new Error('Token is required');
  }

  // Decode token header to get kid
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header || !decoded.header.kid) {
    throw new Error('Invalid token format');
  }

  // Get JWKS client
  const client = getJWKSClient(userPoolId, region);
  const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

  // Get signing key and verify token
  return new Promise((resolve, reject) => {
    getKey(decoded.header, (err, key) => {
      if (err) {
        return reject(new Error(`Failed to get signing key: ${err.message}`));
      }

      try {
        const payload = jwt.verify(token, key, {
          algorithms: ['RS256'],
          issuer,
          audience: appClientId,
        });
        resolve(payload);
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          reject(new Error('Token has expired'));
        } else if (error.name === 'JsonWebTokenError') {
          reject(new Error('Invalid token signature'));
        } else {
          reject(new Error(`Token validation failed: ${error.message}`));
        }
      }
    }, client);
  });
}

/**
 * Extracts JWT token from Authorization header
 * @param {Object} event - API Gateway event
 * @returns {string|null} Token string or null if not found
 */
export function extractToken(event) {
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (!authHeader) {
    return null;
  }

  // Handle "Bearer <token>" format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Middleware function to validate authentication for write operations
 * @param {Object} event - API Gateway event
 * @returns {Object} Decoded token payload
 * @throws {Error} If authentication fails
 */
export async function requireAuth(event) {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const appClientId = process.env.COGNITO_APP_CLIENT_ID;
  const region = process.env.AWS_REGION || 'us-east-1';

  if (!userPoolId || !appClientId) {
    throw new Error('Cognito configuration missing');
  }

  const token = extractToken(event);
  if (!token) {
    throw new Error('Authorization token required');
  }

  return await validateToken(token, userPoolId, appClientId, region);
}
