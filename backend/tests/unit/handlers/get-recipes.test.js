// Jest globals are available without import in test files
import { handler } from '../../../src/handlers/get-recipes.js';
import * as s3Client from '../../../src/lib/s3-client.js';

jest.mock('../../../src/lib/s3-client.js', () => ({
  initializeS3: jest.fn(),
  listRecipes: jest.fn(),
}));

describe('get-recipes handler', () => {
  const mockEvent = {
    requestContext: {
      requestId: 'test-request-id',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.S3_BUCKET_NAME = 'test-bucket';
    process.env.AWS_REGION = 'us-east-1';
  });

  it('should return list of recipes', async () => {
    const mockRecipes = [
      { id: 'abc12345', title: 'Recipe 1', lastModified: '2025-01-27T10:00:00Z' },
      { id: 'xyz98765', title: 'Recipe 2', lastModified: '2025-01-27T11:00:00Z' },
    ];

    s3Client.listRecipes.mockResolvedValue(mockRecipes);

    const response = await handler(mockEvent);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(mockRecipes);
    expect(s3Client.initializeS3).toHaveBeenCalledWith('test-bucket', 'us-east-1');
    expect(s3Client.listRecipes).toHaveBeenCalled();
  });

  it('should return empty array when no recipes exist', async () => {
    s3Client.listRecipes.mockResolvedValue([]);

    const response = await handler(mockEvent);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual([]);
  });

  it('should handle S3 errors', async () => {
    const error = new Error('S3 error');
    error.name = 'NoSuchBucket';
    s3Client.listRecipes.mockRejectedValue(error);

    const response = await handler(mockEvent);

    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('ServiceUnavailable');
  });

  it('should handle internal server errors', async () => {
    s3Client.listRecipes.mockRejectedValue(new Error('Unexpected error'));

    const response = await handler(mockEvent);

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('InternalServerError');
  });
});

