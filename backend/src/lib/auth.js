/**
 * JWT authentication utilities
 * Validates AWS Cognito JWT tokens
 */

import { jwtVerify, createRemoteJWKSet } from 'jose';

let jwks = null;
let userPoolId = null;
let region = null;

/**
 * Initialize JWT verification with Cognito User Pool configuration
 * @param {string} poolId - Cognito User Pool ID
 * @param {string} awsRegion - AWS region
 */
export function initializeAuth(poolId, awsRegion) {
  userPoolId = poolId;
  region = awsRegion;
  const jwksUrl = `https://cognito-idp.${awsRegion}.amazonaws.com/${poolId}/.well-known/jwks.json`;
  jwks = createRemoteJWKSet(new URL(jwksUrl));
}

/**
 * Extract JWT token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} JWT token or null if invalid format
 */
export function extractToken(authHeader) {
  if (!authHeader) {
    return null;
  }
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  return parts[1];
}

/**
 * Validate JWT token
 * @param {string} token - JWT token to validate
 * @returns {Promise<Object>} Decoded token payload with user info
 * @throws {Error} If token is invalid or expired
 */
export async function validateToken(token) {
  if (!jwks || !userPoolId || !region) {
    throw new Error('Auth not initialized. Call initializeAuth() first.');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  try {
    const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      algorithms: ['RS256'],
    });

    // Verify token use is 'id' or 'access'
    if (payload.token_use !== 'id' && payload.token_use !== 'access') {
      throw new Error('Invalid token use');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      tokenUse: payload.token_use,
      exp: payload.exp,
      iss: payload.iss,
    };
  } catch (error) {
    if (error.code === 'ERR_JWT_EXPIRED') {
      throw new Error('Token has expired');
    }
    if (error.code === 'ERR_JWT_INVALID') {
      throw new Error('Invalid token signature');
    }
    throw new Error(`Token validation failed: ${error.message}`);
  }
}

/**
 * Validate JWT token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {Promise<Object>} Decoded token payload with user info
 * @throws {Error} If token is missing or invalid
 */
export async function validateAuthHeader(authHeader) {
  const token = extractToken(authHeader);
  if (!token) {
    throw new Error('Missing or invalid Authorization header. Expected: Bearer <token>');
  }
  return validateToken(token);
}

