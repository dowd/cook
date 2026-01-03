/**
 * S3 client wrapper
 * Provides simplified interface for S3 operations on recipe files
 */

import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, GetObjectTaggingCommand, PutObjectTaggingCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Errors, logError } from '../utils/errors.js';

let s3Client = null;
let bucketName = null;

/**
 * Initialize S3 client with bucket name
 * @param {string} bucket - S3 bucket name
 * @param {string} region - AWS region (optional)
 */
export function initializeS3(bucket, region = 'us-east-1') {
  bucketName = bucket;
  s3Client = new S3Client({ region });
}

/**
 * List all recipes in S3
 * @returns {Promise<Array>} Array of recipe objects with metadata
 */
export async function listRecipes() {
  if (!s3Client || !bucketName) {
    throw new Error('S3 not initialized. Call initializeS3() first.');
  }

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: '',
    });

    const response = await s3Client.send(command);
    const recipes = [];

    if (response.Contents) {
      // Filter for .cook files and extract IDs
      for (const object of response.Contents) {
        const key = object.Key;
        if (key.endsWith('.cook')) {
          const id = key.replace('.cook', '');
          
          // Get object tags for metadata
          try {
            const tagCommand = new GetObjectTaggingCommand({
              Bucket: bucketName,
              Key: key,
            });
            const tagResponse = await s3Client.send(tagCommand);
            
            const tags = {};
            if (tagResponse.TagSet) {
              for (const tag of tagResponse.TagSet) {
                tags[tag.Key] = tag.Value;
              }
            }

            recipes.push({
              id,
              title: tags.title || id,
              lastModified: tags.lastModified || object.LastModified?.toISOString() || new Date().toISOString(),
            });
          } catch (tagError) {
            // If tags don't exist, use object metadata
            logError(tagError, { key, operation: 'getObjectTagging' });
            recipes.push({
              id,
              title: id,
              lastModified: object.LastModified?.toISOString() || new Date().toISOString(),
            });
          }
        }
      }
    }

    return recipes;
  } catch (error) {
    logError(error, { operation: 'listRecipes' });
    throw error;
  }
}

/**
 * Get a recipe by ID
 * @param {string} id - Recipe ID
 * @returns {Promise<string>} Recipe content as string
 */
export async function getRecipe(id) {
  if (!s3Client || !bucketName) {
    throw new Error('S3 not initialized. Call initializeS3() first.');
  }

  const key = `${id}.cook`;

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await s3Client.send(command);
    
    // Convert stream to string
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    return buffer.toString('utf-8');
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return null; // Recipe not found
    }
    logError(error, { id, key, operation: 'getRecipe' });
    throw error;
  }
}

/**
 * Check if a recipe exists
 * @param {string} id - Recipe ID
 * @returns {Promise<boolean>} True if recipe exists, false otherwise
 */
export async function recipeExists(id) {
  if (!s3Client || !bucketName) {
    throw new Error('S3 not initialized. Call initializeS3() first.');
  }

  const key = `${id}.cook`;

  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    logError(error, { id, key, operation: 'recipeExists' });
    throw error;
  }
}

/**
 * Put a recipe in S3
 * @param {string} id - Recipe ID
 * @param {string} content - Recipe content
 * @param {Object} tags - Object tags (title, createdAt, lastModified, recipeId)
 * @returns {Promise<void>}
 */
export async function putRecipe(id, content, tags = {}) {
  if (!s3Client || !bucketName) {
    throw new Error('S3 not initialized. Call initializeS3() first.');
  }

  const key = `${id}.cook`;
  const now = new Date().toISOString();

  // Ensure required tags
  const allTags = {
    recipeId: id,
    createdAt: tags.createdAt || now,
    lastModified: tags.lastModified || now,
    title: tags.title || id,
    ...tags,
  };

  try {
    // Convert tags object to S3 TagSet format
    const tagSet = Object.entries(allTags).map(([Key, Value]) => ({
      Key,
      Value: String(Value),
    }));

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: content,
      ContentType: 'text/plain',
      Tagging: tagSet.map(t => `${t.Key}=${encodeURIComponent(t.Value)}`).join('&'),
    });

    await s3Client.send(command);

    // Also set tags using PutObjectTagging for better compatibility
    const tagCommand = new PutObjectTaggingCommand({
      Bucket: bucketName,
      Key: key,
      Tagging: {
        TagSet: tagSet,
      },
    });

    await s3Client.send(tagCommand);
  } catch (error) {
    logError(error, { id, key, operation: 'putRecipe' });
    throw error;
  }
}

/**
 * Delete a recipe from S3
 * @param {string} id - Recipe ID
 * @returns {Promise<void>}
 */
export async function deleteRecipe(id) {
  if (!s3Client || !bucketName) {
    throw new Error('S3 not initialized. Call initializeS3() first.');
  }

  const key = `${id}.cook`;

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    logError(error, { id, key, operation: 'deleteRecipe' });
    throw error;
  }
}

/**
 * Get existing tags for a recipe
 * @param {string} id - Recipe ID
 * @returns {Promise<Object>} Object with tag key-value pairs
 */
export async function getRecipeTags(id) {
  if (!s3Client || !bucketName) {
    throw new Error('S3 not initialized. Call initializeS3() first.');
  }

  const key = `${id}.cook`;

  try {
    const command = new GetObjectTaggingCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await s3Client.send(command);
    const tags = {};

    if (response.TagSet) {
      for (const tag of response.TagSet) {
        tags[tag.Key] = tag.Value;
      }
    }

    return tags;
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return null; // Recipe not found
    }
    logError(error, { id, key, operation: 'getRecipeTags' });
    throw error;
  }
}

/**
 * Check if an ID is already in use
 * @param {string} id - Recipe ID to check
 * @returns {Promise<boolean>} True if ID exists, false otherwise
 */
export async function idExists(id) {
  return recipeExists(id);
}

