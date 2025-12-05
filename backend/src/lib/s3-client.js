/**
 * S3 Client Utility
 * Wrapper for S3 operations with versioning support
 */

import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectTaggingCommand, PutObjectTaggingCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

if (!BUCKET_NAME) {
  throw new Error('S3_BUCKET_NAME environment variable is required');
}

/**
 * Gets a recipe file from S3
 * @param {string} recipeId - Recipe ID (8-character alphanumeric)
 * @returns {Promise<string>} Recipe content as string
 */
export async function getRecipe(recipeId) {
  const key = `${recipeId}.cook`;

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    const content = await response.Body.transformToString();
    return content;
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      throw new Error('Recipe not found');
    }
    throw error;
  }
}

/**
 * Lists all recipes from S3
 * @returns {Promise<Array>} Array of recipe summaries with metadata
 */
export async function listRecipes() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: '',
    });

    const response = await s3Client.send(command);

    if (!response.Contents || response.Contents.length === 0) {
      return [];
    }

    // Filter to only .cook files and extract metadata
    const recipes = [];

    for (const object of response.Contents) {
      if (object.Key && object.Key.endsWith('.cook')) {
        // Extract recipe ID from key (remove .cook extension)
        const recipeId = object.Key.replace(/\.cook$/, '');

        // Get object tags for metadata
        try {
          const tagCommand = new GetObjectTaggingCommand({
            Bucket: BUCKET_NAME,
            Key: object.Key,
          });
          const tagResponse = await s3Client.send(tagCommand);

          // Convert tags array to object
          const tags = {};
          if (tagResponse.TagSet) {
            tagResponse.TagSet.forEach(tag => {
              tags[tag.Key] = tag.Value;
            });
          }

          recipes.push({
            id: recipeId,
            title: tags.title || recipeId,
            lastModified: tags.lastModified || object.LastModified?.toISOString() || new Date().toISOString(),
          });
        } catch (tagError) {
          // If tags don't exist, use basic info
          recipes.push({
            id: recipeId,
            title: recipeId,
            lastModified: object.LastModified?.toISOString() || new Date().toISOString(),
          });
        }
      }
    }

    return recipes;
  } catch (error) {
    throw error;
  }
}

/**
 * Stores a recipe file in S3
 * @param {string} recipeId - Recipe ID (8-character alphanumeric)
 * @param {string} content - Recipe content (Cooklang format)
 * @param {Object} metadata - Metadata object with title, createdAt, lastModified
 * @returns {Promise<string>} S3 version ID
 */
export async function putRecipe(recipeId, content, metadata = {}) {
  const key = `${recipeId}.cook`;

  try {
    // Put object
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: content,
      ContentType: 'text/plain',
    });

    const putResponse = await s3Client.send(putCommand);

    // Set object tags for metadata
    const tags = [
      { Key: 'recipeId', Value: recipeId },
      { Key: 'title', Value: metadata.title || recipeId },
      { Key: 'createdAt', Value: metadata.createdAt || new Date().toISOString() },
      { Key: 'lastModified', Value: metadata.lastModified || new Date().toISOString() },
    ];

    const tagCommand = new PutObjectTaggingCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Tagging: {
        TagSet: tags,
      },
    });

    await s3Client.send(tagCommand);

    return putResponse.VersionId;
  } catch (error) {
    throw error;
  }
}

/**
 * Updates a recipe file in S3 (creates new version)
 * @param {string} recipeId - Recipe ID (8-character alphanumeric)
 * @param {string} content - Updated recipe content
 * @param {Object} metadata - Updated metadata
 * @returns {Promise<string>} S3 version ID
 */
export async function updateRecipe(recipeId, content, metadata = {}) {
  const key = `${recipeId}.cook`;

  try {
    // Get existing tags to preserve createdAt
    let existingTags = {};
    try {
      const getTagCommand = new GetObjectTaggingCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      const tagResponse = await s3Client.send(getTagCommand);
      if (tagResponse.TagSet) {
        tagResponse.TagSet.forEach(tag => {
          existingTags[tag.Key] = tag.Value;
        });
      }
    } catch (error) {
      // If tags don't exist, use defaults
    }

    // Put object (creates new version automatically with versioning enabled)
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: content,
      ContentType: 'text/plain',
    });

    const putResponse = await s3Client.send(putCommand);

    // Update object tags
    const tags = [
      { Key: 'recipeId', Value: recipeId },
      { Key: 'title', Value: metadata.title || existingTags.title || recipeId },
      { Key: 'createdAt', Value: metadata.createdAt || existingTags.createdAt || new Date().toISOString() },
      { Key: 'lastModified', Value: metadata.lastModified || new Date().toISOString() },
    ];

    const tagCommand = new PutObjectTaggingCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Tagging: {
        TagSet: tags,
      },
    });

    await s3Client.send(tagCommand);

    return putResponse.VersionId;
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      throw new Error('Recipe not found');
    }
    throw error;
  }
}

/**
 * Deletes a recipe file from S3
 * @param {string} recipeId - Recipe ID (8-character alphanumeric)
 */
export async function deleteRecipe(recipeId) {
  const key = `${recipeId}.cook`;

  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      throw new Error('Recipe not found');
    }
    throw error;
  }
}
